import { CanonicalClaim } from "@/types/claim";
import { ALL_RISK_TYPES, RiskType } from "@/types/risk";
import { GroundTruth } from "../data/synthetic-seed";

export interface DetectorMetrics {
  risk_type: RiskType;
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  precision: number;
  recall: number;
  f1: number;
  positives: number;
}

export interface EvaluationReport {
  evaluated_claims: number;
  per_detector: DetectorMetrics[];
  macro: { precision: number; recall: number; f1: number };
  micro: { precision: number; recall: number; f1: number };
  /** Klaim berlabel anomali yang berhasil ditandai (skor ≥ 50) oleh setidaknya satu detector. */
  claim_level: { anomalous: number; flagged_anomalous: number; recall: number; normal: number; flagged_normal: number; false_positive_rate: number };
  evidence_completeness: { findings: number; with_valid_citation: number; pct: number; with_document_citation: number; document_pct: number };
  /** Pembanding naif: satu aturan ambang (tagihan > 1,5x median peer). */
  baseline: { name: string; precision: number; recall: number; f1: number; flagged: number };
  /** Selisih F1 tingkat-klaim Arsa vs baseline (poin persentase relatif). */
  uplift: { claim_f1_arsa: number; claim_f1_baseline: number; relative_pct: number };
}

const r3 = (n: number) => Number(n.toFixed(3));
const safe = (a: number, b: number) => (b === 0 ? 0 : a / b);

export function evaluate(claims: CanonicalClaim[], labels: GroundTruth): EvaluationReport {
  const evalClaims = claims.filter((c) => labels[c.claim_id] !== undefined);
  const per: DetectorMetrics[] = [];

  for (const t of ALL_RISK_TYPES) {
    let tp = 0, fp = 0, fn = 0, tn = 0;
    for (const c of evalClaims) {
      const truth = labels[c.claim_id].includes(t);
      const pred = c.risk_findings.some((f) => f.risk_type === t);
      if (truth && pred) tp++;
      else if (!truth && pred) fp++;
      else if (truth && !pred) fn++;
      else tn++;
    }
    const precision = safe(tp, tp + fp);
    const recall = safe(tp, tp + fn);
    per.push({ risk_type: t, tp, fp, fn, tn, precision: r3(precision), recall: r3(recall), f1: r3(safe(2 * precision * recall, precision + recall)), positives: tp + fn });
  }

  const macro = {
    precision: r3(per.reduce((a, m) => a + m.precision, 0) / per.length),
    recall: r3(per.reduce((a, m) => a + m.recall, 0) / per.length),
    f1: r3(per.reduce((a, m) => a + m.f1, 0) / per.length),
  };
  const TP = per.reduce((a, m) => a + m.tp, 0), FP = per.reduce((a, m) => a + m.fp, 0), FN = per.reduce((a, m) => a + m.fn, 0);
  const mp = safe(TP, TP + FP), mr = safe(TP, TP + FN);
  const micro = { precision: r3(mp), recall: r3(mr), f1: r3(safe(2 * mp * mr, mp + mr)) };

  const anomalous = evalClaims.filter((c) => labels[c.claim_id].length > 0);
  const normal = evalClaims.filter((c) => labels[c.claim_id].length === 0);
  const flaggedAnom = anomalous.filter((c) => c.risk_findings.length > 0).length;
  const flaggedNorm = normal.filter((c) => c.risk_findings.length > 0).length;

  let findings = 0, withCite = 0, withDocCite = 0;
  for (const c of claims) {
    const docs = new Map(c.medical_evidence.map((e) => [e.evidence_id, e]));
    for (const f of c.risk_findings) {
      findings++;
      if (f.evidence.some((e) => docs.has(e.evidence_id) || !!e.source_claim_id)) withCite++;
      // sitasi berbasis dokumen klinis (bukan sekadar rincian tagihan) atau klaim serupa
      if (f.evidence.some((e) => !!e.source_claim_id || (docs.has(e.evidence_id) && docs.get(e.evidence_id)!.document_type !== "BUKTI_BILLING"))) withDocCite++;
    }
  }

  // Baseline naif: tandai klaim bila tagihan > 1,5x median tarif peer (apa yang dilakukan screening ambang sederhana).
  const flaggedBase = (c: CanonicalClaim) => c.approved_tariff !== undefined && c.claim_amount > 1.5 * c.approved_tariff;
  const bTP = evalClaims.filter((c) => labels[c.claim_id].length > 0 && flaggedBase(c)).length;
  const bFP = evalClaims.filter((c) => labels[c.claim_id].length === 0 && flaggedBase(c)).length;
  const bFN = anomalous.length - bTP;
  const bp = safe(bTP, bTP + bFP), br = safe(bTP, bTP + bFN);
  const bf1 = safe(2 * bp * br, bp + br);
  const aTP = flaggedAnom, aFP = flaggedNorm, aFN = anomalous.length - flaggedAnom;
  const ap = safe(aTP, aTP + aFP), ar = safe(aTP, aTP + aFN);
  const af1 = safe(2 * ap * ar, ap + ar);

  return {
    evaluated_claims: evalClaims.length,
    per_detector: per,
    macro,
    micro,
    claim_level: {
      anomalous: anomalous.length,
      flagged_anomalous: flaggedAnom,
      recall: r3(safe(flaggedAnom, anomalous.length)),
      normal: normal.length,
      flagged_normal: flaggedNorm,
      false_positive_rate: r3(safe(flaggedNorm, normal.length)),
    },
    evidence_completeness: { findings, with_valid_citation: withCite, pct: r3(safe(withCite, findings) * 100), with_document_citation: withDocCite, document_pct: r3(safe(withDocCite, findings) * 100) },
    baseline: { name: "Ambang tunggal: tagihan > 1,5x median peer", precision: r3(bp), recall: r3(br), f1: r3(bf1), flagged: bTP + bFP },
    uplift: { claim_f1_arsa: r3(af1), claim_f1_baseline: r3(bf1), relative_pct: bf1 > 0 ? Number((((af1 - bf1) / bf1) * 100).toFixed(1)) : 0 },
  };
}
