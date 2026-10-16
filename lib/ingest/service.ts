import fs from "fs";
import path from "path";
import { dataDir } from "../data/paths";
import { Dataset, FieldMapping } from "@/types/dataset";
import { Doctor } from "@/types/provider";
import { AI_NOTE_PLACEHOLDER } from "./constants";
import { getStore, persist, recordAudit, refreshAggregates, Actor } from "../data/store";
import { analyzeAll } from "../risk/engine";
import { MAX_UPLOAD_BYTES, parseUpload } from "./parse";
import { anonymizeUpload } from "./pii";
import { profileColumns } from "./profile";
import { suggestMappings } from "./mapper";
import { normalizeRows } from "./normalize";

/**
 * Orkestrasi ingest: upload -> anonimisasi -> profiling -> usulan mapping (Gemini/heuristik)
 * -> konfirmasi manusia -> normalisasi -> analisis risiko.
 * Baris yang disimpan di .data/uploads SUDAH dianonimkan; data mentah tidak pernah ditulis ke disk.
 */

const uploadDir = () => path.join(dataDir(), "uploads");
const memoryRows = new Map<string, Record<string, string>[]>();

function saveRows(id: string, rows: Record<string, string>[]) {
  memoryRows.set(id, rows);
  try {
    fs.mkdirSync(uploadDir(), { recursive: true });
    fs.writeFileSync(path.join(uploadDir(), `${id}.json`), JSON.stringify(rows));
  } catch {
    /* disk tidak dapat ditulis: hanya memori */
  }
}

function loadRows(id: string): Record<string, string>[] | null {
  const hit = memoryRows.get(id);
  if (hit) return hit;
  try {
    const rows = JSON.parse(fs.readFileSync(path.join(uploadDir(), `${id}.json`), "utf8"));
    memoryRows.set(id, rows);
    return rows;
  } catch {
    return null;
  }
}

export async function createDatasetFromUpload(buffer: Buffer, filename: string, actor: Actor): Promise<{ dataset: Dataset; note?: string; engine: string; truncated: boolean }> {
  if (buffer.length > MAX_UPLOAD_BYTES) throw new Error("Ukuran file melebihi batas 20 MB");
  const parsed = parseUpload(buffer, filename);
  const anon = anonymizeUpload(parsed.columns, parsed.rows);
  const columns = profileColumns(anon);
  const suggestion = await suggestMappings(columns);

  const store = getStore();
  const n = store.datasets.filter((d) => d.dataset_id !== "DS-SEED").length + 1;
  const id = `DS-${String(n).padStart(3, "0")}`;
  const now = new Date().toISOString();

  const dataset: Dataset = {
    dataset_id: id,
    name: filename,
    source_format: parsed.format,
    file_size_bytes: buffer.length,
    row_count: anon.rows.length,
    status: "MAPPING_REQUIRED",
    columns,
    mappings: suggestion.mappings,
    anonymization: anon.report,
    created_at: now,
    updated_at: now,
  };
  saveRows(id, anon.rows);
  store.datasets.unshift(dataset);

  recordAudit({
    claim_id: id,
    actor: actor.name,
    actor_role: actor.role,
    action: "DATASET_UPLOADED",
    previous_status: null,
    new_status: dataset.status,
    justification: `${filename}: ${anon.rows.length} baris. Anonimisasi saat input — pseudonim: [${anon.report.columns_pseudonymized.join(", ")}], inisial: [${anon.report.columns_initials.join(", ")}], dihapus: [${anon.report.columns_dropped.join(", ")}], disamarkan: [${anon.report.columns_scrubbed.join(", ")}]. Mapping oleh ${suggestion.engine}.`,
  });
  persist();
  return { dataset, note: suggestion.note || (suggestion.engine === "heuristic" ? AI_NOTE_PLACEHOLDER : undefined), engine: suggestion.engine, truncated: parsed.truncated };
}

export async function confirmMappingAndIngest(datasetId: string, mappings: FieldMapping[], actor: Actor): Promise<Dataset> {
  const store = getStore();
  const dataset = store.datasets.find((d) => d.dataset_id === datasetId);
  if (!dataset) throw new Error("Dataset tidak ditemukan");
  if (datasetId === "DS-SEED") throw new Error("Dataset sintetis bawaan tidak dapat dinormalisasi ulang");
  const rows = loadRows(datasetId);
  if (!rows) throw new Error("Baris dataset tidak tersedia (server restart?). Unggah ulang file.");

  dataset.status = "NORMALIZING";
  dataset.mappings = mappings.map((m) => ({ ...m, status: m.canonical_field ? ("CONFIRMED" as const) : ("UNMAPPED" as const), suggested_by: m.suggested_by ?? "manual" }));
  dataset.updated_at = new Date().toISOString();

  const result = normalizeRows(rows, dataset.mappings, {
    existingClaimIds: new Set(store.claims.map((c) => c.claim_id)),
    providers: new Map(store.providers.map((p) => [p.provider_id, p])),
    today: new Date().toISOString().slice(0, 10),
  });

  dataset.quality_summary = result.quality;
  dataset.rejected_rows = result.rejected.slice(0, 100);

  if (result.claims.length === 0) {
    dataset.status = "ERROR";
    dataset.error_message = result.rejected[0]?.reason || "Tidak ada baris valid";
    persist();
    return dataset;
  }

  // Provider & dokter baru
  for (const p of result.newProviders) store.providers.push(p);
  for (const c of result.claims) {
    const prov = store.providers.find((p) => p.provider_id === c.provider.provider_id);
    if (prov && !prov.doctors.some((d) => d.doctor_id === c.service.doctor_id)) {
      const doc: Doctor = { doctor_id: c.service.doctor_id, name: c.service.doctor_name, specialty: c.service.doctor_specialty, sip_number: "—", total_claims_handled: 0, high_risk_claims_count: 0, risk_score: 0, provider_id: prov.provider_id };
      prov.doctors.push(doc);
      store.doctors.push(doc);
    }
    store.claims.push(c);
    store.ingestedClaimIds.add(c.claim_id);
  }

  const summary = await analyzeAll(store);
  store.meta.last_analysis = summary;
  refreshAggregates(store);

  dataset.status = "READY";
  dataset.error_message = undefined;
  dataset.result = {
    claims_ingested: result.claims.length,
    findings_total: result.claims.reduce((a, c) => a + c.risk_findings.length, 0),
    flagged_claims: result.claims.filter((c) => c.risk_findings.length > 0).length,
    investigations_created: result.claims.filter((c) => c.investigation_id).length,
    embedding_model: summary.embedding_model,
  };
  dataset.updated_at = new Date().toISOString();

  recordAudit({
    claim_id: datasetId,
    actor: actor.name,
    actor_role: actor.role,
    action: "MAPPING_CONFIRMED_AND_NORMALIZED",
    previous_status: "MAPPING_REQUIRED",
    new_status: "READY",
    justification: `${result.claims.length} klaim valid, ${result.rejected.length} baris ditolak. Analisis: ${dataset.result.flagged_claims} klaim ditandai, ${dataset.result.investigations_created} kasus baru (embedding ${summary.embedding_model}).`,
  });
  persist();
  return dataset;
}
