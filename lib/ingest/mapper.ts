import { z } from "zod";
import { ColumnProfile, FieldMapping } from "@/types/dataset";
import { generateJson, getAIStatus } from "../ai/llm";
import { CANONICAL_FIELDS, CANONICAL_IDS, normName } from "./canonical";

/**
 * Pemetaan kolom sumber -> skema kanonik.
 *  1. Heuristik deterministik (nama kolom + sinonim + pola nilai) selalu berjalan.
 *  2. LLM (bila tersedia) menyempurnakan: hanya menerima NAMA kolom + sampel yang SUDAH dianonimkan,
 *     keluarannya divalidasi (kolom harus ada, field kanonik harus valid) sebelum dipakai.
 *  3. Manusia tetap mengonfirmasi (human-in-the-loop) di UI.
 */

const ICD10 = /^[A-Z]\d{2}(\.?\d{1,2})?$/i;

function tokens(s: string): string[] {
  return normName(s).split("_").filter(Boolean);
}

function scoreName(column: string, fieldId: string): number {
  const f = CANONICAL_FIELDS.find((x) => x.id === fieldId)!;
  const n = normName(column);
  if (n === fieldId) return 0.99;
  if (f.synonyms.includes(n)) return 0.96;
  const ct = new Set(tokens(column));
  let best = 0;
  for (const syn of f.synonyms) {
    const st = tokens(syn);
    const inter = st.filter((t) => ct.has(t)).length;
    if (inter === 0) continue;
    const jac = inter / (st.length + ct.size - inter);
    const sub = n.includes(syn) || syn.includes(n) ? 0.12 : 0;
    best = Math.max(best, Math.min(0.88, 0.45 + jac * 0.45 + sub));
  }
  return best;
}

function valueBoost(col: ColumnProfile, fieldId: string): number {
  const samples = col.sample_values;
  switch (fieldId) {
    case "primary_diagnosis":
      return samples.length && samples.filter((s) => ICD10.test((s.split(/[#;|,]/)[0] ?? "").trim())).length / samples.length > 0.7 ? 0.2 : 0;
    case "admission_date":
    case "discharge_date":
      return col.detected_type === "date" ? 0.1 : -0.4;
    case "claim_amount":
    case "approved_tariff":
    case "length_of_stay":
    case "patient_age":
      return col.detected_type === "number" ? 0.05 : -0.4;
    case "severity_level":
      if (col.detected_type === "number") return 0.05;
      return samples.length && samples.filter((s) => /^(1|2|3|i|ii|iii|ringan|sedang|berat|[a-z]-\d-\d{1,2}-(i|ii|iii|[123]))$/i.test(s.trim())).length / samples.length > 0.6 ? 0.15 : -0.2;
    case "clinical_narrative":
      return col.pii === "FREE_TEXT" ? 0.3 : 0;
    case "patient_id":
      return col.pii === "CARD" || col.pii === "PATIENT_ID" || col.pii === "NIK" ? 0.2 : 0;
    case "patient_name":
      return col.pii === "NAME" ? 0.3 : 0;
    default:
      return 0;
  }
}

/** Disambiguasi tanggal masuk vs keluar dari nama kolom. */
function dateHint(column: string, fieldId: string): number {
  const n = normName(column);
  if (fieldId === "admission_date" && /(masuk|admi|rawat_mulai|sep)/.test(n)) return 0.1;
  if (fieldId === "discharge_date" && /(keluar|pulang|discharge|selesai)/.test(n)) return 0.1;
  if (fieldId === "admission_date" && /(keluar|pulang|discharge)/.test(n)) return -0.5;
  if (fieldId === "discharge_date" && /(masuk|admi)/.test(n)) return -0.5;
  return 0;
}

export function heuristicMapping(columns: ColumnProfile[]): FieldMapping[] {
  const candidates: { col: string; field: string; score: number }[] = [];
  for (const col of columns) {
    for (const f of CANONICAL_FIELDS) {
      const s = scoreName(col.name, f.id) + valueBoost(col, f.id) + dateHint(col.name, f.id);
      if (s >= 0.5) candidates.push({ col: col.name, field: f.id, score: Math.min(0.99, s) });
    }
  }
  candidates.sort((a, b) => b.score - a.score);

  const usedCols = new Set<string>();
  const usedFields = new Set<string>();
  const out = new Map<string, FieldMapping>();
  for (const c of candidates) {
    if (usedCols.has(c.col) || usedFields.has(c.field)) continue;
    usedCols.add(c.col);
    usedFields.add(c.field);
    out.set(c.col, {
      source_field: c.col,
      canonical_field: c.field,
      confidence: Number(c.score.toFixed(2)),
      is_ai_suggested: false,
      suggested_by: "heuristic",
      reason: "Kecocokan nama kolom & pola nilai",
      status: "SUGGESTED",
    });
  }
  return columns.map(
    (col) =>
      out.get(col.name) || {
        source_field: col.name,
        canonical_field: "",
        confidence: 0,
        is_ai_suggested: false,
        suggested_by: "heuristic" as const,
        status: "UNMAPPED" as const,
      }
  );
}

const LlmSchema = z.object({
  mappings: z.array(
    z.object({
      source_field: z.string(),
      canonical_field: z.string().nullable(),
      confidence: z.number().min(0).max(1),
      reason: z.string().optional(),
    })
  ),
});

export interface MappingResult {
  mappings: FieldMapping[];
  engine: "llm+heuristic" | "heuristic";
  note?: string;
}

export async function suggestMappings(columns: ColumnProfile[]): Promise<MappingResult> {
  const heuristic = heuristicMapping(columns);
  const status = await getAIStatus();
  if (!status.available) {
    return { mappings: heuristic, engine: "heuristic", note: `LLM tidak tersedia (${status.reason || "tanpa kredensial"}); memakai pemetaan heuristik.` };
  }

  const canonicalList = CANONICAL_FIELDS.map((f) => `- ${f.id}: ${f.label} — ${f.description}${f.required ? " (WAJIB)" : ""}`).join("\n");
  const colList = columns
    .map((c) => `- "${c.name}" tipe=${c.detected_type}${c.pii ? ` [data pribadi, sudah dianonimkan: ${c.pii}]` : ""} sampel=${JSON.stringify(c.sample_values.slice(0, 3))}`)
    .join("\n");
  const heurList = heuristic.filter((h) => h.canonical_field).map((h) => `${h.source_field} -> ${h.canonical_field} (${h.confidence})`).join("; ");

  const prompt = `Anda memetakan kolom ekspor SIMRS/klaim JKN ke skema kanonik Arsa.
SKEMA KANONIK:
${canonicalList}

KOLOM SUMBER:
${colList}

USULAN HEURISTIK (boleh Anda koreksi): ${heurList || "-"}

Aturan:
- Setiap kolom sumber dipetakan ke TEPAT SATU field kanonik atau null bila tidak relevan.
- Satu field kanonik hanya boleh dipakai oleh satu kolom.
- Jangan mengarang kolom. Gunakan "source_field" persis seperti di atas.
- confidence 0..1 mencerminkan keyakinan Anda.

Kembalikan JSON: {"mappings":[{"source_field":"...","canonical_field":"claim_id|null","confidence":0.0,"reason":"singkat"}]}`;

  try {
    const res = await generateJson(prompt, LlmSchema, { system: "Anda adalah insinyur data kesehatan. Jawab hanya JSON valid.", temperature: 0 });
    const colNames = new Set(columns.map((c) => c.name));
    const merged = new Map<string, FieldMapping>(heuristic.map((h) => [h.source_field, h]));
    const claimedBy = new Map<string, { col: string; conf: number }>();
    heuristic.forEach((h) => h.canonical_field && claimedBy.set(h.canonical_field, { col: h.source_field, conf: h.confidence }));

    for (const m of res.mappings) {
      if (!colNames.has(m.source_field)) continue; // anti-halusinasi kolom
      const h = merged.get(m.source_field)!;
      if (!m.canonical_field) continue;
      if (!CANONICAL_IDS.has(m.canonical_field)) continue; // anti-halusinasi field
      const owner = claimedBy.get(m.canonical_field);
      if (owner && owner.col !== m.source_field && owner.conf >= m.confidence) continue; // sudah dimiliki yang lebih yakin
      if (h.canonical_field && h.canonical_field !== m.canonical_field && h.confidence >= 0.95 && m.confidence < 0.9) continue; // heuristik kuat menang

      if (owner && owner.col !== m.source_field) {
        const prev = merged.get(owner.col)!;
        merged.set(owner.col, { ...prev, canonical_field: "", confidence: 0, status: "UNMAPPED", reason: "Dialihkan ke kolom lain oleh AI" });
      }
      merged.set(m.source_field, {
        source_field: m.source_field,
        canonical_field: m.canonical_field,
        confidence: Number(Math.max(m.confidence, h.canonical_field === m.canonical_field ? h.confidence : 0).toFixed(2)),
        is_ai_suggested: true,
        suggested_by: "llm",
        reason: m.reason || `Usulan ${status.model}`,
        status: "SUGGESTED",
      });
      claimedBy.set(m.canonical_field, { col: m.source_field, conf: m.confidence });
    }
    return { mappings: columns.map((c) => merged.get(c.name)!), engine: "llm+heuristic" };
  } catch (e) {
    return { mappings: heuristic, engine: "heuristic", note: `LLM gagal (${e instanceof Error ? e.message.slice(0, 120) : "error"}); memakai pemetaan heuristik.` };
  }
}
