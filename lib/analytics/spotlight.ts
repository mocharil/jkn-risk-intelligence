import type { CanonicalClaim } from "@/types/claim";
import type { RiskFinding } from "@/types/risk";

export interface Spotlight {
  claim_id: string;
  provider: { name: string; city: string };
  diagnosis: { code: string; description: string };
  los: number;
  score: number;
  amount: number;
  finding: { risk_type: string; title: string; summary: string };
  /** Baris tagihan terbesar (prosedur) bila ada. */
  billed: { description: string; code: string; cost: number } | null;
  /** Dokumen yang dikutip temuan utama. */
  evidence: { evidence_id: string; title: string; date: string; excerpt: string } | null;
  /** Tanya-jawab ringkas yang disusun dari temuan nyata (bukan teks tulisan tangan). */
  qa: { question: string; answer: Array<{ text: string; cite?: string }> };
}

const PREFER: Record<string, number> = { PHANTOM_BILLING: 3, CLONING: 2, UPCODING: 2, UNBUNDLING: 1, INFLATED_BILLS: 1, ABNORMAL_LOS: 1, REPEAT_BILLING: 1, READMISSION: 1 };

/** Satu klaim berisiko tertinggi yang temuannya punya kutipan dokumen; dipakai untuk contoh di landing. Deterministik, murni dari hasil analisis. */
export function pickSpotlight(claims: CanonicalClaim[]): Spotlight | null {
  let best: { c: CanonicalClaim; f: RiskFinding; rank: number } | null = null;
  for (const c of claims) {
    if (c.risk_score < 75) continue;
    for (const f of c.risk_findings) {
      const cited = f.evidence.find((e) => c.medical_evidence.some((m) => m.evidence_id === e.evidence_id));
      if (!cited) continue;
      const rank = c.risk_score * 10 + (PREFER[f.risk_type] ?? 0) * 3 + f.risk_score / 100 + c.risk_findings.length * 0.1;
      if (!best || rank > best.rank) best = { c, f, rank };
    }
  }
  if (!best) return null;
  const { c, f } = best;
  const doc = c.medical_evidence.find((m) => f.evidence.some((e) => e.evidence_id === m.evidence_id)) || null;
  const dx = c.diagnoses.find((d) => d.is_primary) || c.diagnoses[0];
  const proc = [...c.procedures].filter((p) => (p.cost ?? 0) > 0).sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0))[0];
  const answer: Array<{ text: string; cite?: string }> = [];
  const used = new Set<string>();
  for (const finding of [f, ...c.risk_findings.filter((x) => x !== f).sort((a, b) => b.risk_score - a.risk_score)]) {
    const ev = finding.evidence.find((e) => c.medical_evidence.some((m) => m.evidence_id === e.evidence_id) && !used.has(e.evidence_id));
    if (!ev) continue;
    used.add(ev.evidence_id);
    answer.push({ text: finding.summary, cite: ev.evidence_id });
    if (answer.length >= 2) break;
  }
  return {
    claim_id: c.claim_id,
    provider: { name: c.provider.name, city: c.provider.city },
    diagnosis: { code: dx.code, description: dx.description },
    los: c.service.length_of_stay,
    score: c.risk_score,
    amount: c.claim_amount,
    finding: { risk_type: f.risk_type, title: f.title, summary: f.summary },
    billed: proc ? { description: proc.description, code: proc.code, cost: proc.cost as number } : null,
    evidence: doc ? { evidence_id: doc.evidence_id, title: doc.title, date: doc.date, excerpt: doc.excerpt } : null,
    qa: { question: `Mengapa klaim ${c.claim_id} dianggap berisiko?`, answer },
  };
}
