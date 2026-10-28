import { getGovernancePolicy } from "../governance/policy";
import { CanonicalClaim, SimilarClaimRef } from "@/types/claim";
import { Investigation } from "@/types/investigation";
import { RiskFinding, RiskLevel } from "@/types/risk";
import { cosine, embedTexts, localEmbed, LOCAL_MODEL } from "../ai/embeddings";
import { scrubText } from "../pii/anonymize";
import { Benchmarks, computeBenchmarks } from "./benchmarks";
import { calculateCompositeRisk, DetectorContext, runDetectors } from "./detectors";
import { jaccard, shingles } from "./text";
import { searchViaPgvector } from "../db/vector-store";

/**
 * Pipeline analisis: embedding → pencarian kemiripan → detector → komposit → antrean investigasi.
 * Sinkron (`analyzeWithVectors`) agar bisa dipakai saat boot; versi async menambah embedding Vertex.
 */

export interface AnalyzableStore {
  claims: CanonicalClaim[];
  investigations: Investigation[];
  embeddings: Map<string, { model: string; vector: number[] }>;
  meta: { analyzed_at?: string; embedding_model?: string };
}

export interface AnalysisSummary {
  claims_analyzed: number;
  findings_total: number;
  flagged_claims: number;
  investigations_created: number;
  embedding_model: string;
  similarity_threshold: number;
  duration_ms: number;
  /** Backend pencarian kemiripan: "in-process" atau "pgvector". */
  vector_backend: string;
  vector_backend_note?: string;
}

export const SIMILARITY_FLOOR = 0.8;

/** Ambang tumpang tindih frasa agar kemiripan vektor dianggap klon (copy-paste), bukan template EMR yang kebetulan mirip. */
export const LEXICAL_THRESHOLD = Number(process.env.CLONE_LEXICAL_THRESHOLD) || 0.75;
/** Di atas ini, kemiripan semantik saja cukup (parafrase / klon dengan edit besar). */
export const SEMANTIC_ONLY_THRESHOLD = 0.985;

export function cloneThresholdFor(model: string): number {
  const env = Number(process.env.CLONE_SIM_THRESHOLD);
  if (Number.isFinite(env) && env > 0) return env;
  return model === LOCAL_MODEL ? 0.88 : 0.92;
}

export function narrativeText(claim: CanonicalClaim): string {
  const docs = claim.medical_evidence.filter((e) => e.document_type === "RINGKASAN_MEDIS" || e.document_type === "RESUME_PULANG" || e.document_type === "CATATAN_KONSULTASI");
  const text = docs.map((d) => d.content).join(" ");
  return scrubText(text || claim.diagnoses.map((d) => d.description).join(" "));
}

/** Ada narasi klinis sungguhan (bukan sekadar nama diagnosis atau rincian tagihan)? Tanpa narasi, kemiripan teks tidak bermakna. */
export function hasNarrative(claim: CanonicalClaim): boolean {
  return claim.medical_evidence.some(
    (e) => (e.document_type === "RINGKASAN_MEDIS" || e.document_type === "RESUME_PULANG" || e.document_type === "CATATAN_KONSULTASI") && (e.content || "").trim().length >= 40
  );
}

function primaryCode(c: CanonicalClaim): string {
  return (c.diagnoses.find((d) => d.is_primary) || c.diagnoses[0])?.code || "";
}

function buildSimilar(
  claim: CanonicalClaim,
  peers: CanonicalClaim[],
  vectors: Map<string, { model: string; vector: number[] }>,
  shingleCache: Map<string, Set<string>>,
  neighbors?: { other: CanonicalClaim; similarity: number }[]
): SimilarClaimRef[] {
  const mine = vectors.get(claim.claim_id);
  if (!mine) return [];
  const mineSh = shingleCache.get(claim.claim_id) as Set<string>;
  const out: SimilarClaimRef[] = [];

  // Sumber kandidat: tetangga dari pgvector (kemiripan dihitung database) atau pemindaian in-process.
  const candidates: { other: CanonicalClaim; sim: number }[] = [];
  if (neighbors) {
    for (const n of neighbors) candidates.push({ other: n.other, sim: n.similarity });
  } else {
    for (const other of peers) {
      const ov = vectors.get(other.claim_id);
      if (!ov || ov.model !== mine.model) continue; // vektor beda model tidak sebanding
      candidates.push({ other, sim: cosine(mine.vector, ov.vector) });
    }
  }

  for (const { other, sim } of candidates) {
    if (other.claim_id === claim.claim_id) continue;
    if (other.patient.patient_id === claim.patient.patient_id) continue;
    if (sim < SIMILARITY_FLOOR) continue;

    const overlap = jaccard(mineSh, shingleCache.get(other.claim_id) as Set<string>);
    const reasons = [`Kemiripan semantik narasi ${(sim * 100).toFixed(1)}% (embedding ${mine.model}).`, `Tumpang tindih frasa 3-kata ${(overlap * 100).toFixed(0)}%.`];
    if (other.service.doctor_id === claim.service.doctor_id) reasons.push(`DPJP yang sama (${claim.service.doctor_name}).`);
    reasons.push(other.provider.provider_id === claim.provider.provider_id ? "Faskes yang sama, pasien berbeda." : `Faskes berbeda (${other.provider.name}), pasien berbeda.`);

    out.push({
      claim_id: other.claim_id,
      provider_id: other.provider.provider_id,
      provider_name: other.provider.name,
      similarity_score: Number(sim.toFixed(4)),
      lexical_overlap: Number(overlap.toFixed(3)),
      claim_amount: other.claim_amount,
      diagnosis_code: primaryCode(other),
      similarity_reasons: reasons,
      risk_score: 0,
    });
  }
  return out.sort((a, b) => b.similarity_score - a.similarity_score).slice(0, 5);
}

function levelOf(score: number): RiskLevel {
  return score >= 90 ? "CRITICAL" : score >= 75 ? "HIGH" : score >= 50 ? "MEDIUM" : "LOW";
}

function investigationIdFor(claimId: string): string {
  const digits = claimId.replace(/\D/g, "");
  if (!digits) {
    // ID klaim tanpa angka: pakai hash agar ID investigasi tidak bertabrakan (INV-2026-000000).
    let h = 0;
    for (const ch of claimId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return `INV-2026-${String(h % 1_000_000).padStart(6, "0")}`;
  }
  return `INV-2026-${digits.padStart(6, "0")}`;
}

function rationaleFor(claim: CanonicalClaim): string {
  const parts = claim.risk_findings.map((f) => f.title.replace(/^Indikasi\s+/i, "").replace(/\s*\(.*\)$/, ""));
  return `Terdeteksi ${claim.risk_findings.length} sinyal risiko (${parts.join("; ")}). Potensi selisih tarif Rp ${(claim.tariff_difference || 0).toLocaleString("id-ID")} terhadap median peer.`;
}

/** Tandai status dokumen berdasarkan bagaimana ia dipakai sebagai bukti oleh temuan. */
function annotateEvidence(claim: CanonicalClaim) {
  const verdict = new Map<string, boolean>();
  claim.risk_findings.forEach((f) => f.evidence.forEach((e) => verdict.set(e.evidence_id, (verdict.get(e.evidence_id) ?? false) || e.supports_finding)));
  const supportedBy = new Map<string, boolean>();
  claim.risk_findings.forEach((f) => f.evidence.forEach((e) => supportedBy.set(e.evidence_id, e.supports_finding)));

  claim.medical_evidence.forEach((doc) => {
    if (!supportedBy.has(doc.evidence_id)) {
      doc.status = doc.document_type === "HASIL_LABORATORIUM" ? "SUPPORTS_CLAIM" : claim.risk_findings.length === 0 ? "SUPPORTS_CLAIM" : "NEEDS_REVIEW";
    } else {
      doc.status = supportedBy.get(doc.evidence_id) ? "CONTRADICTS_CLAIM" : "SUPPORTS_CLAIM";
    }
  });
}

export function analyzeWithVectors(
  store: AnalyzableStore,
  vectors: Map<string, { model: string; vector: number[] }>,
  model: string,
  only?: Set<string>,
  external?: { neighbors: Map<string, { other_id: string; similarity: number }[]>; backend: string }
): AnalysisSummary {
  const t0 = Date.now();
  const benchmarks: Benchmarks = computeBenchmarks(store.claims);
  const threshold = cloneThresholdFor(model);

  const byDx = new Map<string, CanonicalClaim[]>();
  const shingleCache = new Map<string, Set<string>>();
  for (const c of store.claims) {
    const code = primaryCode(c);
    const arr = byDx.get(code) || [];
    arr.push(c);
    byDx.set(code, arr);
    shingleCache.set(c.claim_id, hasNarrative(c) ? shingles(narrativeText(c)) : new Set<string>());
  }

  const byId = new Map(store.claims.map((c) => [c.claim_id, c]));
  const narrated = new Set(store.claims.filter(hasNarrative).map((c) => c.claim_id));

  // Indeks terbalik frasa 3-kata yang LANGKA: kandidat klon lintas diagnosis tanpa pemindaian O(n^2).
  const shingleIndex = new Map<string, string[]>();
  shingleCache.forEach((set, id) => set.forEach((sh) => shingleIndex.set(sh, [...(shingleIndex.get(sh) || []), id])));
  const crossCandidates = (claim: CanonicalClaim): CanonicalClaim[] => {
    const tally = new Map<string, number>();
    shingleCache.get(claim.claim_id)?.forEach((sh) => {
      const ids = shingleIndex.get(sh);
      if (ids && ids.length > 1 && ids.length <= 40) ids.forEach((id) => id !== claim.claim_id && tally.set(id, (tally.get(id) || 0) + 1));
    });
    const out: CanonicalClaim[] = [];
    tally.forEach((n, id) => {
      const c = byId.get(id);
      if (c && n >= 6 && primaryCode(c) !== primaryCode(claim)) out.push(c);
    });
    return out;
  };
  // Riwayat per pasien (pseudonim) + faskes untuk Repeat Billing / Readmission.
  const byPatient = new Map<string, CanonicalClaim[]>();
  for (const c of store.claims) {
    if (!c.patient.patient_id || c.patient.patient_id === "—") continue;
    const k = `${c.patient.patient_id}|${c.provider.provider_id}`;
    const arr = byPatient.get(k) || [];
    arr.push(c);
    byPatient.set(k, arr);
  }
  let findingsTotal = 0;
  let flagged = 0;

  const targets = only ? store.claims.filter((c) => only.has(c.claim_id)) : store.claims;
  for (const claim of targets) {
    const bm = benchmarks.get(primaryCode(claim), claim.service.treatment_class, claim.provider.province_code);
    claim.approved_tariff = Math.round(bm.expected_tariff);
    claim.tariff_difference = Math.max(0, claim.claim_amount - claim.approved_tariff);

    const ext = external?.neighbors.get(claim.claim_id);
    // Klaim tanpa narasi klinis (mis. data mikro BPJS) tidak dicocokkan teksnya: tidak ada teks yang bisa dibandingkan.
    const similar = narrated.has(claim.claim_id)
      ? buildSimilar(
          claim,
          [...(byDx.get(primaryCode(claim)) || []), ...crossCandidates(claim)].filter((c) => narrated.has(c.claim_id)),
          vectors,
          shingleCache,
          external ? (ext || []).map((n) => ({ other: byId.get(n.other_id) as CanonicalClaim, similarity: n.similarity })).filter((n) => n.other && narrated.has(n.other.claim_id)) : undefined
        )
      : [];
    claim.similar_claims = similar;

    const ctx: DetectorContext = { benchmarks, similar, cloneThreshold: threshold, lexicalThreshold: LEXICAL_THRESHOLD, semanticOnlyThreshold: SEMANTIC_ONLY_THRESHOLD, history: byPatient.get(`${claim.patient.patient_id}|${claim.provider.provider_id}`) };
    const findings: RiskFinding[] = runDetectors(claim, ctx);
    claim.risk_findings = findings;
    const comp = calculateCompositeRisk(findings);
    claim.risk_score = comp.score;
    claim.risk_level = comp.level;
    claim.risk_signals = comp.signals;
    annotateEvidence(claim);
    findingsTotal += findings.length;
    if (findings.length) flagged++;
  }

  // Lengkapi risk_score pada klaim-klaim yang mirip (setelah seluruh klaim dinilai).
  for (const claim of store.claims) {
    claim.similar_claims.forEach((s) => (s.risk_score = byId.get(s.claim_id)?.risk_score ?? 0));
  }

  // Status & antrean investigasi.
  let created = 0;
  const existing = new Map(store.investigations.map((i) => [i.claim_id, i]));
  for (const claim of store.claims) {
    const userLocked = claim.status === "CONFIRMED_RISK" || claim.status === "FALSE_POSITIVE" || claim.status === "IN_INVESTIGATION";
    const needsCase = claim.risk_score >= getGovernancePolicy().queue_min_score;
    if (!userLocked) claim.status = needsCase ? "FLAGGED" : claim.risk_score >= 50 ? "PENDING_REVIEW" : "RESOLVED_VALID";

    const inv = existing.get(claim.claim_id);
    if (needsCase && !inv) {
      const id = investigationIdFor(claim.claim_id);
      claim.investigation_id = id;
      const created_at = claim.created_at;
      store.investigations.push({
        investigation_id: id,
        claim_id: claim.claim_id,
        claim,
        status: "NEW",
        priority: claim.risk_level,
        risk_score: claim.risk_score,
        potential_exposure: claim.tariff_difference || 0,
        assigned_to: { user_id: "UNASSIGNED", name: "Belum ditugaskan", avatar: "—", role: "—" },
        ai_priority_rationale: rationaleFor(claim),
        primary_risk_signals: claim.risk_signals,
        notes: [
          {
            note_id: `NOT-${id}-1`,
            author: "Arsa Risk Engine",
            role: "Sistem",
            content: `Kasus otomatis masuk antrean prioritas: skor ${claim.risk_score} (${claim.risk_level}). ${rationaleFor(claim)}`,
            created_at,
            type: "AI_ASSESSMENT",
          },
        ],
        created_at,
        updated_at: created_at,
      });
      created++;
    } else if (inv) {
      inv.claim = claim;
      claim.investigation_id = inv.investigation_id;
      inv.risk_score = claim.risk_score;
      inv.priority = claim.risk_level === "LOW" || claim.risk_level === "MEDIUM" ? inv.priority : claim.risk_level;
      inv.potential_exposure = claim.tariff_difference || 0;
      inv.primary_risk_signals = claim.risk_signals;
      inv.ai_priority_rationale = rationaleFor(claim);
    }
  }

  store.meta.analyzed_at = new Date().toISOString();
  store.meta.embedding_model = model;
  return {
    claims_analyzed: targets.length,
    findings_total: findingsTotal,
    flagged_claims: flagged,
    investigations_created: created,
    embedding_model: model,
    similarity_threshold: threshold,
    duration_ms: Date.now() - t0,
    vector_backend: external?.backend ?? "in-process",
  };
}

/** Analisis sinkron dengan embedding lokal (dipakai saat boot / test). */
export function analyzeLocal(store: AnalyzableStore): AnalysisSummary {
  const vectors = new Map<string, { model: string; vector: number[] }>();
  // Hanya klaim bernarasi yang diberi vektor: tanpa teks klinis tidak ada yang dapat dibandingkan.
  for (const c of store.claims) if (hasNarrative(c)) vectors.set(c.claim_id, { model: LOCAL_MODEL, vector: localEmbed(narrativeText(c)) });
  store.embeddings = vectors;
  return analyzeWithVectors(store, vectors, LOCAL_MODEL);
}

/** Analisis async: memakai embedding Vertex bila tersedia (fallback otomatis ke lokal). */
export async function analyzeAll(store: AnalyzableStore, opts: { forceLocal?: boolean; only?: Set<string> } = {}): Promise<AnalysisSummary> {
  // Embedding (dan panggilan ke penyedia) hanya untuk klaim yang punya narasi klinis sungguhan.
  const narrated = store.claims.filter(hasNarrative);
  const emb = await embedTexts(narrated.map(narrativeText), { forceLocal: opts.forceLocal });
  const vectors = new Map<string, { model: string; vector: number[] }>();
  narrated.forEach((c, i) => vectors.set(c.claim_id, { model: emb.model, vector: emb.vectors[i] }));
  store.embeddings = vectors;
  const rows = narrated.map((c) => ({ claim_id: c.claim_id, provider_id: c.provider.provider_id, primary_dx: primaryCode(c), vector: vectors.get(c.claim_id)!.vector }));
  const pg = await searchViaPgvector(rows, emb.model, SIMILARITY_FLOOR, 5);
  if (pg && pg.neighbors) {
    return analyzeWithVectors(store, vectors, emb.model, opts.only, { neighbors: pg.neighbors, backend: "pgvector" });
  }
  const summary = analyzeWithVectors(store, vectors, emb.model, opts.only);
  if (pg && !pg.neighbors) summary.vector_backend_note = `pgvector gagal, memakai pencarian in-process: ${pg.error}`;
  return summary;
}
