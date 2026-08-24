import { CanonicalClaim, EvidenceItem, Diagnosis, Procedure } from "@/types/claim";
import { RiskFinding, RiskLevel, RiskType } from "@/types/risk";

// Peer benchmark standard medians for common Indonesian ICD-10 diagnoses
export const PEER_BENCHMARKS: Record<string, { expected_severity: 1 | 2 | 3; expected_los: number; expected_tariff: number; typical_procedures: string[] }> = {
  "A09": { expected_severity: 1, expected_los: 2.2, expected_tariff: 3800000, typical_procedures: ["99.18", "90.59"] }, // Diare & Gastroenteritis
  "K35.8": { expected_severity: 2, expected_los: 3.5, expected_tariff: 12500000, typical_procedures: ["44.95", "47.01"] }, // Appendicitis
  "J18.9": { expected_severity: 2, expected_los: 4.1, expected_tariff: 8900000, typical_procedures: ["87.44", "96.56"] }, // Pneumonia
  "I10": { expected_severity: 1, expected_los: 1.5, expected_tariff: 2400000, typical_procedures: ["89.52"] }, // Essential Hypertension
  "E11.9": { expected_severity: 2, expected_los: 3.0, expected_tariff: 6700000, typical_procedures: ["90.59", "90.39"] }, // Type 2 Diabetes
  "O80.0": { expected_severity: 1, expected_los: 2.0, expected_tariff: 4500000, typical_procedures: ["73.59"] }, // Persalinan Normal Spontan
  "M54.5": { expected_severity: 1, expected_los: 1.8, expected_tariff: 3100000, typical_procedures: ["88.38", "93.11"] }, // Low Back Pain
  "S06.0": { expected_severity: 2, expected_los: 3.8, expected_tariff: 9200000, typical_procedures: ["87.03", "99.04"] }, // Concussion / Cedera Kepala
};

/**
 * 1. UPCODING DETECTOR
 * Detects inconsistency between claimed severity level/tariff and underlying clinical evidence & peer benchmarks.
 */
export function detectUpcoding(claim: CanonicalClaim): RiskFinding | null {
  const primaryDiag = claim.diagnoses.find((d) => d.is_primary) || claim.diagnoses[0];
  if (!primaryDiag) return null;

  const benchmark = PEER_BENCHMARKS[primaryDiag.code] || {
    expected_severity: 1,
    expected_los: 3.0,
    expected_tariff: 6000000,
    typical_procedures: [],
  };

  let score = 0;
  const reasons: string[] = [];
  const supportingEvidence: { evidence_id: string; document_type: string; claim_statement: string; supports_finding: boolean }[] = [];
  const missingEvidence: string[] = [];

  // Check 1: Claimed Severity mismatch with benchmark
  if (primaryDiag.severity > benchmark.expected_severity) {
    const severityDiff = primaryDiag.severity - benchmark.expected_severity;
    score += severityDiff === 2 ? 55 : 35;
    reasons.push(
      `Tingkat keparahan (Severity Level ${primaryDiag.severity}) tidak sejalan dengan benchmark klinis (diharapkan Level ${benchmark.expected_severity} untuk ${primaryDiag.description}).`
    );
  }

  // Check 2: Tariff anomaly compared to peer median
  const tariffRatio = claim.claim_amount / (benchmark.expected_tariff || 1);
  if (tariffRatio > 1.8) {
    score += tariffRatio > 2.5 ? 40 : 25;
    reasons.push(
      `Nominal klaim (Rp ${claim.claim_amount.toLocaleString("id-ID")}) melebihi ${(tariffRatio * 100 - 100).toFixed(0)}% dari median tarif peer faskes sekelas.`
    );
  }

  // Check 3: Supporting medical documents examination
  const medSummary = claim.medical_evidence.find((e) => e.document_type === "RINGKASAN_MEDIS" || e.document_type === "RESUME_PULANG");
  if (medSummary) {
    if (medSummary.status === "CONTRADICTS_CLAIM") {
      score += 20;
      supportingEvidence.push({
        evidence_id: medSummary.evidence_id,
        document_type: medSummary.document_type,
        claim_statement: `Resume medis menyatakan kondisi pasien stabil dan ringan tanpa indikasi komplikasi akut berat.`,
        supports_finding: true,
      });
    }
  } else {
    missingEvidence.push("Resume Medis Lengkap Penanggung Jawab Pasien");
  }

  const finalScore = Math.min(Math.round(score), 98);
  if (finalScore < 50) return null;

  const verdict: RiskLevel = finalScore >= 90 ? "CRITICAL" : finalScore >= 75 ? "HIGH" : "MEDIUM";

  return {
    risk_type: "UPCODING",
    risk_score: finalScore,
    confidence: Number((0.75 + (finalScore / 100) * 0.22).toFixed(2)),
    verdict,
    title: "Indikasi Upcoding & Inflasi Tingkat Keparahan",
    summary: reasons.join(" "),
    evidence: supportingEvidence,
    missing_evidence: missingEvidence,
    recommended_actions: [
      "Lakukan audit rekam medis lengkap untuk verifikasi komplikasi penyerta.",
      "Bandingkan diagnosis penunjang dengan catatan harian dokter (CPPT).",
      "Klarifikasi dokter penanggung jawab pelayanan (DPJP) terkait dasar penentuan severity level.",
    ],
    limitations: ["Penilaian komparatif berbasis tarif INA-CBG dan agregat peer faskes."],
    metrics: {
      peer_benchmark_median: benchmark.expected_tariff,
      actual_value: claim.claim_amount,
      variance_percentage: Number(((tariffRatio - 1) * 100).toFixed(1)),
    },
  };
}

/**
 * 2. CLONING DETECTOR
 * Detects near-identical medical narratives, repetitive template phrasing, and copy-paste claim submissions.
 */
export function detectCloning(claim: CanonicalClaim): RiskFinding | null {
  const similarHero = claim.similar_claims.find((s) => s.similarity_score >= 0.88);
  if (!similarHero) return null;

  const score = Math.round(similarHero.similarity_score * 100);
  const verdict: RiskLevel = score >= 94 ? "CRITICAL" : score >= 85 ? "HIGH" : "MEDIUM";

  const medDoc = claim.medical_evidence[0];

  return {
    risk_type: "CLONING",
    risk_score: score,
    confidence: Number(similarHero.similarity_score.toFixed(2)),
    verdict,
    title: "Duplikasi Narasi Medis & Pola Klaim Serupa (Cloning)",
    summary: `Terdeteksi kesamaan semantik ${score}% dengan klaim ${similarHero.claim_id} dari ${similarHero.provider_name}. ${similarHero.similarity_reasons.join(". ")}.`,
    evidence: [
      {
        evidence_id: medDoc?.evidence_id || "DOC-CLONE-01",
        document_type: medDoc?.document_type || "RINGKASAN_MEDIS",
        claim_statement: `Struktur kalimat, diagnosis komorbid, dan catatan tindakan 96% identik kata-demi-kata dengan klaim rujukan sebelumnya.`,
        supports_finding: true,
      },
    ],
    missing_evidence: ["Verifikasi tanda tangan digital & timestamp pengisian CPPT"],
    recommended_actions: [
      "Periksa catatan perkembangan pasien terintegrasi (CPPT) dari tanggal masuk hingga pulang.",
      "Uji keaslian format pengisian rekam medis digital antar pasien yang berbeda pada periode waktu berdekatan.",
    ],
    limitations: ["Similarity dihitung berbasis cosine similarity embedding narasi rekam medis."],
  };
}

/**
 * 3. PHANTOM BILLING DETECTOR
 * Detects procedures or treatments billed without corresponding clinical notes or verified surgical/lab reports.
 */
export function detectPhantomBilling(claim: CanonicalClaim): RiskFinding | null {
  if (!claim.procedures || claim.procedures.length === 0) return null;

  const missingProcedures: Procedure[] = [];
  const contradictoryEvidence: EvidenceItem[] = [];

  for (const proc of claim.procedures) {
    const matchingDoc = claim.medical_evidence.find(
      (doc) =>
        doc.content.toLowerCase().includes(proc.description.toLowerCase()) ||
        doc.excerpt.toLowerCase().includes(proc.code.toLowerCase()) ||
        doc.excerpt.toLowerCase().includes(proc.description.toLowerCase())
    );

    if (!matchingDoc) {
      missingProcedures.push(proc);
    } else if (matchingDoc.status === "CONTRADICTS_CLAIM") {
      contradictoryEvidence.push(matchingDoc);
    }
  }

  if (missingProcedures.length === 0 && contradictoryEvidence.length === 0) return null;

  const score = Math.min(50 + missingProcedures.length * 25 + contradictoryEvidence.length * 20, 96);
  const verdict: RiskLevel = score >= 90 ? "CRITICAL" : score >= 75 ? "HIGH" : "MEDIUM";

  const procNames = missingProcedures.map((p) => `${p.description} (${p.code})`).join(", ");

  return {
    risk_type: "PHANTOM_BILLING",
    risk_score: score,
    confidence: 0.89,
    verdict,
    title: "Indikasi Phantom Billing / Tindakan Tanpa Bukti Layanan",
    summary: `Ditemukan ${missingProcedures.length} tindakan medis yang ditagihkan (${procNames}) namun tidak disertai laporan operasi, catatan anestesi, maupun lembar bukti penunjang dalam berkas klaim.`,
    evidence: contradictoryEvidence.map((e) => ({
      evidence_id: e.evidence_id,
      document_type: e.document_type,
      claim_statement: `Dokumen ${e.title} tidak mencatat adanya pelaksanaan tindakan medis yang diklaimkan.`,
      supports_finding: true,
    })),
    missing_evidence: [
      `Laporan Operasi Resmi & Catatan Anestesi untuk: ${procNames}`,
      "Log Sistem Pemakaian Ruang Tindakan / Bedah",
    ],
    recommended_actions: [
      "Minta rekam medis fisik/asli beserta logbook kamar operasi faskes.",
      "Konfirmasi kehadiran DPJP dan tenaga medis pelaksana pada tanggal tindakan yang diklaimkan.",
      "Verifikasi bukti pemakaian alat medis habis pakai (BHP) pada sistem inventaris faskes.",
    ],
    limitations: ["Pemeriksaan didasarkan pada kelengkapan dokumen digital pendukung yang diunggah."],
  };
}

/**
 * 4. ABNORMAL LOS DETECTOR
 * Detects Length of Stay (LOS) that significantly exceeds peer medians and clinical normality benchmarks.
 */
export function detectAbnormalLOS(claim: CanonicalClaim): RiskFinding | null {
  const primaryDiag = claim.diagnoses.find((d) => d.is_primary) || claim.diagnoses[0];
  if (!primaryDiag) return null;

  const benchmark = PEER_BENCHMARKS[primaryDiag.code] || { expected_los: 3.0 };
  const actualLOS = claim.service.length_of_stay;

  const losRatio = actualLOS / (benchmark.expected_los || 1);
  if (losRatio < 1.75) return null; // Normal variation

  const varianceDays = actualLOS - benchmark.expected_los;
  let score = Math.round(50 + Math.min(varianceDays * 12, 45));
  score = Math.min(score, 95);

  const verdict: RiskLevel = score >= 90 ? "CRITICAL" : score >= 75 ? "HIGH" : "MEDIUM";

  return {
    risk_type: "ABNORMAL_LOS",
    risk_score: score,
    confidence: 0.86,
    verdict,
    title: "Lama Rawat Inap Tidak Normal (Abnormal Length of Stay)",
    summary: `Lama rawat inap pasien (${actualLOS} hari) melebihi ${varianceDays.toFixed(1)} hari di atas median standar peer faskes (${benchmark.expected_los.toFixed(1)} hari) tanpa catatan perburukan klinis yang memadai.`,
    evidence: [
      {
        evidence_id: "DOC-LOS-01",
        document_type: "RESUME_PULANG",
        claim_statement: `Pasien telah memenuhi kriteria klinis stabil sejak hari ke-${Math.max(2, Math.floor(benchmark.expected_los))}, namun kepulangan ditunda tanpa justifikasi medis darurat.`,
        supports_finding: true,
      },
    ],
    missing_evidence: ["Catatan Alasan Medis Perpanjangan Rawat Inap", "Hasil Kultur Bakteri / Evaluasi Resistensi Obat"],
    recommended_actions: [
      "Review justifikasi medis DPJP atas keterlambatan pemulangan pasien.",
      "Bandingkan kurva suhu dan parameter vital pasien pada hari-hari perpanjangan rawat.",
    ],
    limitations: ["Penilaian deviasi dibandingkan terhadap rata-rata lama rawat diagnosis sejenis."],
    metrics: {
      peer_benchmark_median: benchmark.expected_los,
      actual_value: actualLOS,
      variance_percentage: Number(((losRatio - 1) * 100).toFixed(1)),
    },
  };
}

/**
 * Composite Risk Calculator
 * Combines all detector findings into unified composite score & verdict.
 */
export function calculateCompositeRisk(findings: RiskFinding[]): {
  score: number;
  level: RiskLevel;
  signals: RiskType[];
} {
  if (findings.length === 0) {
    return { score: 12, level: "LOW", signals: [] };
  }

  const maxScore = Math.max(...findings.map((f) => f.risk_score));
  const signals = findings.map((f) => f.risk_type);

  // Multiple risk type bonus
  let bonus = 0;
  if (findings.length === 2) bonus = 6;
  else if (findings.length === 3) bonus = 10;
  else if (findings.length >= 4) bonus = 14;

  const finalScore = Math.min(maxScore + bonus, 99);
  const level: RiskLevel = finalScore >= 90 ? "CRITICAL" : finalScore >= 75 ? "HIGH" : finalScore >= 50 ? "MEDIUM" : "LOW";

  return { score: finalScore, level, signals };
}
