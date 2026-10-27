import { CanonicalClaim, EvidenceItem, Procedure, SimilarClaimRef } from "@/types/claim";
import { RiskEvidenceRef, RiskFinding, RiskLevel, RiskType } from "@/types/risk";
import { Benchmarks } from "./benchmarks";
import { BUNDLE_COMPONENTS, procedureRef, referenceFor } from "./reference";
import { documentIndicatesMild, documentIndicatesSevere, procedureVerdict } from "./text";

/**
 * Mesin risiko berbasis registry: "detector baru = modul baru, bukan aplikasi baru".
 * Setiap detector bersifat deterministik; bukti selalu berasal dari dokumen pada klaim
 * (kutipan verbatim + evidence_id), dan confidence dihitung dari kekuatan sinyal.
 */

export interface DetectorContext {
  benchmarks: Benchmarks;
  /** Hasil pencarian kemiripan semantik (vektor) untuk klaim ini, sudah diurutkan. */
  similar: SimilarClaimRef[];
  cloneThreshold: number;
  lexicalThreshold: number;
  semanticOnlyThreshold: number;
  /** Klaim lain pada pasien (pseudonim) & faskes yang sama — untuk Repeat Billing / Readmission. */
  history?: CanonicalClaim[];
}

export interface RiskDetector {
  id: RiskType;
  label: string;
  version: string;
  run(claim: CanonicalClaim, ctx: DetectorContext): RiskFinding | null;
}

const rp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function verdictFor(score: number): RiskLevel {
  return score >= 90 ? "CRITICAL" : score >= 75 ? "HIGH" : score >= 50 ? "MEDIUM" : "LOW";
}

function primaryDiag(claim: CanonicalClaim) {
  return claim.diagnoses.find((d) => d.is_primary) || claim.diagnoses[0];
}

function cite(doc: EvidenceItem, statement: string, supports: boolean): RiskEvidenceRef {
  return {
    evidence_id: doc.evidence_id,
    document_type: doc.document_type,
    claim_statement: statement,
    supports_finding: supports,
    excerpt: doc.excerpt,
  };
}

const NARRATIVE_TYPES: EvidenceItem["document_type"][] = ["RINGKASAN_MEDIS", "RESUME_PULANG", "CATATAN_KONSULTASI"];

// ---------------------------------------------------------------------------
// 1. UPCODING – tingkat keparahan yang diklaim tidak didukung bukti klinis / peer
// ---------------------------------------------------------------------------
/** Ambang z (dalam simpangan robust skala-log peer) agar suatu rasio dianggap menyimpang, bukan variasi wajar. */
export const LOS_RATIO_MIN = 1.75;
export const LOS_Z_MIN = 2.0;
/** Selisih lama rawat minimum (hari) di atas median; pada median 1-2 hari, rasio 2x hanyalah satu hari tambahan. */
export const LOS_MIN_EXCESS_DAYS = 2;
export const AMOUNT_RATIO_MIN = 1.6;
export const LINE_RATIO_MIN = 1.8;
export const AMOUNT_Z_MIN = 2.5;

export const upcodingDetector: RiskDetector = {
  id: "UPCODING",
  label: "Upcoding",
  version: "2.0",
  run(claim, ctx) {
    const diag = primaryDiag(claim);
    if (!diag) return null;
    const bm = ctx.benchmarks.get(diag.code, claim.service.treatment_class, claim.provider.province_code);

    let score = 0;
    const reasons: string[] = [];
    const evidence: RiskEvidenceRef[] = [];
    const missing: string[] = [];
    let signals = 0;

    const sevGap = diag.severity - bm.expected_severity;
    if (sevGap <= 0) return null; // tanpa selisih severity tidak ada upcoding (harga ditangani detector Inflated Bills)

    score += sevGap >= 2 ? 55 : 35;
    signals++;
    reasons.push(`Severity Level ${diag.severity} ditagihkan, sedangkan benchmark ${bm.source === "peer" ? `peer (n=${bm.sample_size})` : "referensi"} untuk ${diag.code} adalah Level ${bm.expected_severity}.`);

    const ratio = claim.claim_amount / (bm.expected_tariff || 1);
    if (ratio > 1.4) {
      score += ratio > 2.5 ? 40 : ratio > 1.8 ? 25 : 12;
      signals++;
      reasons.push(`Nominal klaim ${rp(claim.claim_amount)} adalah ${(ratio * 100 - 100).toFixed(0)}% di atas median peer (${rp(bm.expected_tariff)}).`);
    }

    const narrative = claim.medical_evidence.filter((e) => NARRATIVE_TYPES.includes(e.document_type));
    const mildDocs = narrative.filter(documentIndicatesMild);
    const severeDocs = narrative.filter(documentIndicatesSevere);

    for (const d of mildDocs.slice(0, 2)) {
      evidence.push(cite(d, `Dokumen menggambarkan kondisi stabil/ringan tanpa indikasi berat, tidak sejalan dengan Severity Level ${diag.severity}.`, true));
    }
    if (mildDocs.length > 0) {
      score += 15;
      signals++;
    }
    for (const d of severeDocs.slice(0, 2)) {
      evidence.push(cite(d, `Dokumen memuat indikator klinis berat yang dapat membenarkan severity tinggi.`, false));
    }
    if (severeDocs.length > 0) {
      score -= 30;
      reasons.push("Terdapat dokumen yang memuat indikator klinis berat — penilaian diturunkan.");
    }
    if (narrative.length === 0) missing.push("Resume medis / ringkasan pulang untuk memverifikasi tingkat keparahan");

    const final = Math.min(Math.round(score), 98);
    if (final < 50) return null;

    return {
      risk_type: "UPCODING",
      rule_id: "UPC-SEV-PEER",
      risk_score: final,
      confidence: Number(clamp(0.55 + signals * 0.1 + (evidence.some((e) => e.supports_finding) ? 0.1 : 0), 0.5, 0.97).toFixed(2)),
      verdict: verdictFor(final),
      title: "Indikasi Upcoding & Inflasi Tingkat Keparahan",
      summary: reasons.join(" "),
      evidence,
      missing_evidence: missing,
      recommended_actions: [
        "Audit rekam medis lengkap untuk memverifikasi komplikasi/komorbid penyerta.",
        "Bandingkan diagnosis penunjang dengan catatan perkembangan harian (CPPT).",
        "Minta klarifikasi DPJP atas dasar penentuan severity level.",
      ],
      limitations: [bm.source === "peer" ? `Benchmark dari ${bm.sample_size} klaim peer pada dataset ini.` : "Benchmark referensi (sampel peer belum memadai)."],
      metrics: { peer_benchmark_median: bm.expected_tariff, actual_value: claim.claim_amount, variance_percentage: Number(((ratio - 1) * 100).toFixed(1)) },
    };
  },
};

// ---------------------------------------------------------------------------
// 2. CLONING – narasi hampir identik (kemiripan semantik via embedding vektor)
// ---------------------------------------------------------------------------
export const cloningDetector: RiskDetector = {
  id: "CLONING",
  label: "Claim Cloning",
  version: "2.0",
  run(claim, ctx) {
    const hero = ctx.similar.find(
      (s) => (s.similarity_score >= ctx.cloneThreshold && (s.lexical_overlap ?? 0) >= ctx.lexicalThreshold) || s.similarity_score >= ctx.semanticOnlyThreshold
    );
    if (!hero) return null;

    const sameDoctor = hero.similarity_reasons.some((r) => r.includes("DPJP yang sama"));
    const score = clamp(Math.round(hero.similarity_score * 100) + (sameDoctor ? 2 : 0), 50, 99);
    const mine = claim.medical_evidence.find((e) => NARRATIVE_TYPES.includes(e.document_type)) || claim.medical_evidence[0];
    const evidence: RiskEvidenceRef[] = [];
    if (mine) evidence.push(cite(mine, `Narasi ini memiliki kemiripan semantik ${(hero.similarity_score * 100).toFixed(1)}% dengan klaim ${hero.claim_id} pada pasien berbeda.`, true));
    evidence.push({
      evidence_id: `SIM-${hero.claim_id}`,
      document_type: "RINGKASAN_MEDIS",
      claim_statement: `Klaim pembanding ${hero.claim_id} (${hero.provider_name}).`,
      supports_finding: true,
      source_claim_id: hero.claim_id,
      excerpt: hero.similarity_reasons[0],
    });

    return {
      risk_type: "CLONING",
      rule_id: "CLN-VEC-COSINE",
      risk_score: score,
      confidence: Number(clamp(hero.similarity_score + (sameDoctor ? 0.02 : 0), 0.5, 0.99).toFixed(2)),
      verdict: verdictFor(score),
      title: "Duplikasi Narasi Medis & Pola Klaim Serupa (Cloning)",
      summary: `Kemiripan semantik ${(hero.similarity_score * 100).toFixed(1)}% dengan klaim ${hero.claim_id} dari ${hero.provider_name}. ${hero.similarity_reasons.join(" ")}`,
      evidence,
      missing_evidence: ["Verifikasi tanda tangan digital & timestamp pengisian CPPT"],
      recommended_actions: [
        "Periksa CPPT dari tanggal masuk hingga pulang pada kedua klaim.",
        "Uji keaslian format pengisian rekam medis digital antar pasien pada periode berdekatan.",
      ],
      limitations: ["Kemiripan dihitung dari embedding narasi (anonim); kemiripan tinggi tidak otomatis berarti kecurangan — perlu verifikasi manusia."],
    };
  },
};

// ---------------------------------------------------------------------------
// 3. PHANTOM BILLING – tindakan besar ditagih tanpa jejak dokumen
// ---------------------------------------------------------------------------
export const phantomDetector: RiskDetector = {
  id: "PHANTOM_BILLING",
  label: "Phantom Billing",
  version: "2.0",
  run(claim) {
    // Tindakan besar (butuh laporan operasi/tindakan) atau tindakan tak dikenal bernilai besar.
    const candidates = claim.procedures.filter((p) => procedureRef(p.code)?.major || (!procedureRef(p.code) && (p.cost ?? 0) >= 3_000_000));
    if (candidates.length === 0) return null;

    const unsupported: Procedure[] = [];
    const evidence: RiskEvidenceRef[] = [];
    let contradicted = 0;

    for (const proc of candidates) {
      const v = procedureVerdict(claim.medical_evidence, proc);
      if (v.verdict === "CONTRADICTS" && v.doc) {
        unsupported.push(proc);
        contradicted++;
        evidence.push(cite(v.doc, `Dokumen menyatakan tindakan ${proc.description} (${proc.code}) tidak tercatat/tidak dilakukan.`, true));
      } else if (v.verdict === "NONE") {
        unsupported.push(proc);
        // Dokumen yang seharusnya memuat tindakan ini namun tidak menyebutnya = bukti ketiadaan.
        const shouldMention = claim.medical_evidence.find((e) => e.document_type === "CATATAN_TINDAKAN") || claim.medical_evidence.find((e) => e.document_type === "RINGKASAN_MEDIS");
        if (shouldMention) evidence.push(cite(shouldMention, `Dokumen ini tidak menyebut tindakan ${proc.description} (${proc.code}) sama sekali.`, true));
      }
    }
    if (unsupported.length === 0) return null;

    const score = Math.min(50 + unsupported.length * 20 + contradicted * 20, 97);
    const names = unsupported.map((p) => `${p.description} (${p.code})`).join(", ");
    return {
      risk_type: "PHANTOM_BILLING",
      rule_id: "PHM-PROC-DOC",
      risk_score: score,
      confidence: Number(clamp(0.62 + contradicted * 0.18 + (claim.medical_evidence.length > 0 ? 0.08 : 0), 0.5, 0.96).toFixed(2)),
      verdict: verdictFor(score),
      title: "Indikasi Phantom Billing / Tindakan Tanpa Bukti Layanan",
      summary: `${unsupported.length} tindakan besar ditagihkan (${names}) tanpa jejak pendukung pada berkas klaim${contradicted ? `; ${contradicted} di antaranya dibantah langsung oleh dokumen` : ""}.`,
      evidence,
      missing_evidence: unsupported.map((p) => `Laporan operasi/catatan tindakan & anestesi untuk ${p.description} (${p.code})`),
      recommended_actions: [
        "Minta rekam medis asli dan logbook kamar tindakan dari faskes.",
        "Konfirmasi kehadiran DPJP/tim pelaksana pada tanggal tindakan.",
        "Verifikasi pemakaian BHP pada sistem inventaris faskes.",
      ],
      limitations: ["Penilaian bergantung pada kelengkapan dokumen digital yang diunggah; dokumen fisik belum tentu tidak ada."],
    };
  },
};

// ---------------------------------------------------------------------------
// 4. ABNORMAL LOS
// ---------------------------------------------------------------------------
export const abnormalLosDetector: RiskDetector = {
  id: "ABNORMAL_LOS",
  label: "Abnormal Length of Stay",
  version: "2.0",
  run(claim, ctx) {
    const diag = primaryDiag(claim);
    if (!diag) return null;
    // Bandingkan dengan peer sebucket (rawat jalan vs rawat inap) agar LOS rawat jalan tidak dibanding rawat inap.
    const bm = ctx.benchmarks.get(diag.code, claim.service.treatment_class, claim.provider.province_code);
    const los = claim.service.length_of_stay;
    const ratio = los / (bm.expected_los || 1);
    if (ratio < LOS_RATIO_MIN || los - bm.expected_los < LOS_MIN_EXCESS_DAYS) return null;
    // Selain rasio, harus keluar dari sebaran peer: pada data riil lama rawat menyebar lebar sehingga 1,75x median bisa wajar.
    if (bm.los_log_sigma !== undefined && Math.log(ratio) < LOS_Z_MIN * bm.los_log_sigma) return null;

    const variance = los - bm.expected_los;
    let score = Math.round(50 + Math.min(variance * 12, 45));
    const evidence: RiskEvidenceRef[] = [];
    const narrative = claim.medical_evidence.filter((e) => NARRATIVE_TYPES.includes(e.document_type));
    const mild = narrative.filter(documentIndicatesMild);
    const severe = narrative.filter(documentIndicatesSevere);

    mild.slice(0, 2).forEach((d) => evidence.push(cite(d, `Dokumen menggambarkan pasien stabil/membaik tanpa justifikasi perpanjangan rawat.`, true)));
    severe.slice(0, 2).forEach((d) => evidence.push(cite(d, `Dokumen memuat indikator klinis yang dapat membenarkan perpanjangan rawat.`, false)));
    if (severe.length > 0) score -= 55; // indikator klinis berat = perpanjangan rawat dapat dibenarkan
    score = Math.min(score, 95);
    if (score < 50) return null;

    return {
      risk_type: "ABNORMAL_LOS",
      rule_id: "LOS-PEER-RATIO",
      risk_score: score,
      confidence: Number(clamp(0.6 + Math.min(ratio - 1.75, 1.5) * 0.15 + (mild.length ? 0.08 : 0), 0.5, 0.95).toFixed(2)),
      verdict: verdictFor(score),
      title: "Lama Rawat Inap Tidak Normal (Abnormal Length of Stay)",
      summary: `Lama rawat ${los} hari, ${variance.toFixed(1)} hari di atas median ${bm.source === "peer" ? `peer (n=${bm.sample_size})` : "referensi"} ${bm.expected_los.toFixed(1)} hari untuk ${diag.code}.`,
      evidence,
      missing_evidence: narrative.length === 0 ? ["Catatan alasan medis perpanjangan rawat inap"] : [],
      recommended_actions: [
        "Review justifikasi medis DPJP atas keterlambatan pemulangan.",
        "Bandingkan tanda vital pada hari-hari perpanjangan rawat.",
      ],
      limitations: ["Dibandingkan terhadap median peer diagnosis yang sama; perbedaan case-mix tidak sepenuhnya terkoreksi."],
      metrics: { peer_benchmark_median: bm.expected_los, actual_value: los, variance_percentage: Number(((ratio - 1) * 100).toFixed(1)) },
    };
  },
};

// ---------------------------------------------------------------------------
// 5. UNBUNDLING – komponen paket ditagih terpisah
// ---------------------------------------------------------------------------
export const unbundlingDetector: RiskDetector = {
  id: "UNBUNDLING",
  label: "Unbundling",
  version: "1.0",
  run(claim, ctx) {
    const diag = primaryDiag(claim);
    if (!diag) return null;
    const bm = ctx.benchmarks.get(diag.code, claim.service.treatment_class, claim.provider.province_code);
    const ref = referenceFor(diag.code);

    const packaged = new Set<string>(ref.package_procedures);
    claim.procedures.forEach((p) => (BUNDLE_COMPONENTS[p.code] || []).forEach((c) => packaged.add(c)));

    const billedSeparately = claim.procedures.filter((p) => packaged.has(p.code) && (p.cost ?? 0) > 0);
    if (billedSeparately.length === 0) return null;

    const sum = billedSeparately.reduce((a, p) => a + (p.cost ?? 0), 0);
    const share = sum / (bm.expected_tariff || 1);
    if (billedSeparately.length < 2 && share < 0.08) return null;

    const score = clamp(Math.round(50 + billedSeparately.length * 10 + Math.min(share * 60, 30)), 50, 95);
    const evidence: RiskEvidenceRef[] = [];
    const bill = claim.medical_evidence.find((e) => e.document_type === "BUKTI_BILLING");
    if (bill) evidence.push(cite(bill, `Rincian tagihan memuat komponen yang seharusnya termasuk paket tarif.`, true));

    return {
      risk_type: "UNBUNDLING",
      rule_id: "UNB-PKG-COMPONENT",
      risk_score: score,
      confidence: Number(clamp(0.6 + billedSeparately.length * 0.07 + (share > 0.2 ? 0.1 : 0), 0.5, 0.94).toFixed(2)),
      verdict: verdictFor(score),
      title: "Indikasi Unbundling (Komponen Paket Ditagih Terpisah)",
      summary: `${billedSeparately.length} tindakan yang sudah termasuk paket tarif (${billedSeparately.map((p) => `${p.description} [${p.code}]`).join(", ")}) ditagih terpisah senilai ${rp(sum)} (${(share * 100).toFixed(0)}% dari tarif paket).`,
      evidence,
      missing_evidence: bill ? [] : ["Rincian tagihan per komponen (billing statement)"],
      recommended_actions: [
        "Bandingkan rincian tagihan dengan komponen paket INA-CBG untuk diagnosis ini.",
        "Minta klarifikasi dasar penagihan terpisah komponen paket.",
      ],
      limitations: ["Aturan paket bersifat acuan sintetis prototipe; perlu disesuaikan dengan regulasi tarif yang berlaku."],
      metrics: { peer_benchmark_median: bm.expected_tariff, actual_value: sum, variance_percentage: Number((share * 100).toFixed(1)) },
    };
  },
};

// ---------------------------------------------------------------------------
// 6. INFLATED BILLS – harga di atas acuan tanpa kenaikan severity / LOS
// ---------------------------------------------------------------------------
export const inflatedBillsDetector: RiskDetector = {
  id: "INFLATED_BILLS",
  label: "Inflated Bills",
  version: "1.0",
  run(claim, ctx) {
    const diag = primaryDiag(claim);
    if (!diag) return null;
    const bm = ctx.benchmarks.get(diag.code, claim.service.treatment_class, claim.provider.province_code);

    const lineHits = claim.procedures
      .map((p) => ({ p, ref: procedureRef(p.code) }))
      .filter((x) => x.ref && (x.p.cost ?? 0) > 0 && (x.p.cost as number) / x.ref.reference_price >= LINE_RATIO_MIN);

    // Bandingkan nilai dasar (di luar komponen yang ditagih terinci; itu ditangani Unbundling/Phantom).
    const itemized = claim.procedures.reduce((a, p) => a + (p.cost ?? 0), 0);
    const totalRatio = (claim.claim_amount - itemized) / (bm.expected_tariff || 1);
    const severityOk = diag.severity <= bm.expected_severity;
    const losRatio = claim.service.length_of_stay / (bm.expected_los || 1);
    const totalInflated = totalRatio >= AMOUNT_RATIO_MIN && severityOk && losRatio < LOS_RATIO_MIN && (bm.amount_log_sigma === undefined || Math.log(totalRatio) >= AMOUNT_Z_MIN * bm.amount_log_sigma);

    if (lineHits.length === 0 && !totalInflated) return null;

    let score = 0;
    const reasons: string[] = [];
    if (lineHits.length > 0) {
      const worst = Math.max(...lineHits.map((x) => (x.p.cost as number) / (x.ref as { reference_price: number }).reference_price));
      score += 45 + Math.min((worst - 1.8) * 15, 25);
      reasons.push(`${lineHits.length} komponen ditagih ≥1,8× harga acuan (${lineHits.map((x) => `${x.p.code}: ${rp(x.p.cost as number)} vs ${rp((x.ref as { reference_price: number }).reference_price)}`).join("; ")}).`);
    }
    if (totalInflated) {
      score += 40 + Math.min((totalRatio - 1.6) * 20, 20);
      reasons.push(`Total klaim ${rp(claim.claim_amount)} adalah ${totalRatio.toFixed(1)}× median peer (${rp(bm.expected_tariff)}) tanpa kenaikan severity maupun lama rawat.`);
    }
    score = clamp(Math.round(score), 50, 95);

    const bill = claim.medical_evidence.find((e) => e.document_type === "BUKTI_BILLING");
    const evidence: RiskEvidenceRef[] = bill ? [cite(bill, "Rincian tagihan menunjukkan nilai di atas harga acuan.", true)] : [];

    return {
      risk_type: "INFLATED_BILLS",
      rule_id: totalInflated ? "INF-TOTAL-PEER" : "INF-LINE-REF",
      risk_score: score,
      confidence: Number(clamp(0.58 + (lineHits.length ? 0.15 : 0) + (totalInflated ? 0.15 : 0), 0.5, 0.93).toFixed(2)),
      verdict: verdictFor(score),
      title: "Indikasi Inflated Bills (Penggelembungan Tagihan)",
      summary: reasons.join(" "),
      evidence,
      missing_evidence: bill ? [] : ["Rincian tagihan per komponen (billing statement)"],
      recommended_actions: ["Audit rincian tagihan terhadap tarif acuan.", "Bandingkan dengan klaim peer pada diagnosis yang sama di wilayah serupa."],
      limitations: ["Harga acuan adalah data sintetis prototipe."],
      metrics: { peer_benchmark_median: bm.expected_tariff, actual_value: claim.claim_amount, variance_percentage: Number(((totalRatio - 1) * 100).toFixed(1)) },
    };
  },
};

// ---------------------------------------------------------------------------
// 7 & 8. REPEAT BILLING / READMISSION – riwayat pasien yang sama pada faskes yang sama
// ---------------------------------------------------------------------------
function dayDiff(a: string, b: string): number {
  return Math.round((new Date(`${a}T00:00:00Z`).getTime() - new Date(`${b}T00:00:00Z`).getTime()) / 86_400_000);
}

/** Klaim sebelumnya (admisi lebih awal) pada pasien+faskes+diagnosis yang sama, beserta jarak hari dari pulang ke admisi ini. */
function priorEpisodes(claim: CanonicalClaim, ctx: DetectorContext) {
  const dx = primaryDiag(claim)?.code;
  const adm = claim.service.admission_date;
  return (ctx.history ?? [])
    .filter((h) => h.claim_id !== claim.claim_id && primaryDiag(h)?.code === dx && (h.service.admission_date < adm || (h.service.admission_date === adm && h.claim_id < claim.claim_id)))
    .map((h) => ({ h, gap: dayDiff(adm, h.service.discharge_date) }))
    .sort((a, b) => a.gap - b.gap);
}

function priorEvidence(h: CanonicalClaim, text: string): RiskEvidenceRef {
  return {
    evidence_id: `HIST-${h.claim_id}`,
    document_type: "RINGKASAN_MEDIS",
    claim_statement: text,
    supports_finding: true,
    source_claim_id: h.claim_id,
    excerpt: `Rawat ${h.service.admission_date} s/d ${h.service.discharge_date} di ${h.provider.name}, tagihan ${rp(h.claim_amount)}.`,
  };
}

export const repeatBillingDetector: RiskDetector = {
  id: "REPEAT_BILLING",
  label: "Repeat Billing",
  version: "1.0",
  run(claim, ctx) {
    const dup = priorEpisodes(claim, ctx).find((e) => e.gap <= 1);
    if (!dup) return null;
    const sameAmount = Math.abs(claim.claim_amount - dup.h.claim_amount) / Math.max(dup.h.claim_amount, 1) <= 0.1;
    const overlap = dup.gap < 0;
    const score = clamp(62 + (sameAmount ? 18 : 0) + (overlap ? 10 : 0), 50, 95);
    return {
      risk_type: "REPEAT_BILLING",
      rule_id: "RPT-OVERLAP-EPISODE",
      risk_score: score,
      confidence: Number(clamp(0.6 + (sameAmount ? 0.18 : 0) + (overlap ? 0.12 : 0), 0.5, 0.94).toFixed(2)),
      verdict: verdictFor(score),
      title: "Indikasi Penagihan Ganda atas Episode Rawat yang Sama",
      summary: `Pasien yang sama (pseudonim) di faskes yang sama ditagih untuk diagnosis ${primaryDiag(claim)?.code} pada ${claim.service.admission_date}, ${overlap ? "saat episode sebelumnya masih berjalan" : "tepat setelah episode sebelumnya"} (${dup.h.claim_id}, pulang ${dup.h.service.discharge_date})${sameAmount ? `; nominal hampir sama (${rp(claim.claim_amount)} vs ${rp(dup.h.claim_amount)})` : ""}.`,
      evidence: [priorEvidence(dup.h, `Episode sebelumnya ${dup.h.claim_id} bersambung/tumpang tindih dengan klaim ini.`)],
      missing_evidence: ["Dokumen transfer ruang/perpanjangan rawat yang menjelaskan dua klaim terpisah"],
      recommended_actions: ["Periksa apakah kedua klaim adalah satu episode rawat yang ditagih dua kali.", "Bandingkan rincian tagihan dan tanggal masuk/keluar pada kedua klaim."],
      limitations: ["Pencocokan pasien memakai pseudonim HMAC; perbedaan ID peserta pada sumber data dapat menyembunyikan duplikasi."],
      metrics: { actual_value: claim.claim_amount, peer_benchmark_median: dup.h.claim_amount, variance_percentage: Number((((claim.claim_amount - dup.h.claim_amount) / Math.max(dup.h.claim_amount, 1)) * 100).toFixed(1)) },
    };
  },
};

export const readmissionDetector: RiskDetector = {
  id: "READMISSION",
  label: "Readmission Pattern",
  version: "1.0",
  run(claim, ctx) {
    const within = priorEpisodes(claim, ctx).filter((e) => e.gap >= 2 && e.gap <= 30);
    if (within.length === 0) return null;
    const minGap = within[0].gap;
    if (minGap > 14 && within.length < 2) return null; // satu rawat ulang jauh (15-30 hari) dianggap wajar
    const score = clamp(Math.round(52 + (30 - minGap) * 0.9 + (within.length - 1) * 10), 50, 90);
    return {
      risk_type: "READMISSION",
      rule_id: "RDM-30D-SAMEDX",
      risk_score: score,
      confidence: Number(clamp(0.55 + (30 - minGap) / 100 + (within.length - 1) * 0.08, 0.5, 0.9).toFixed(2)),
      verdict: verdictFor(score),
      title: "Pola Rawat Ulang Dini (Readmission ≤30 Hari, Diagnosis Sama)",
      summary: `Pasien yang sama masuk kembali ${minGap} hari setelah pulang dengan diagnosis ${primaryDiag(claim)?.code} yang sama${within.length > 1 ? `; ${within.length} episode dalam 30 hari` : ""}. Dapat mengindikasikan pemulangan terlalu dini atau pemecahan episode rawat.`,
      evidence: within.slice(0, 3).map((e) => priorEvidence(e.h, `Episode sebelumnya ${e.h.claim_id} berakhir ${e.gap} hari sebelum admisi ini.`)),
      missing_evidence: ["Catatan kondisi pulang & alasan klinis perawatan ulang"],
      recommended_actions: ["Tinjau kelayakan pemulangan pada episode sebelumnya.", "Periksa apakah perawatan ulang berkaitan dengan komplikasi yang sah atau pemecahan tagihan."],
      limitations: ["Rawat ulang dengan diagnosis sama bisa sah secara klinis (penyakit kronis, komplikasi); perlu verifikasi manusia."],
      metrics: { actual_value: minGap, peer_benchmark_median: 30 },
    };
  },
};

// ---------------------------------------------------------------------------
// Registry & komposit
// ---------------------------------------------------------------------------
export const DETECTOR_REGISTRY: RiskDetector[] = [
  upcodingDetector,
  cloningDetector,
  phantomDetector,
  abnormalLosDetector,
  unbundlingDetector,
  inflatedBillsDetector,
  repeatBillingDetector,
  readmissionDetector,
];

export function registerDetector(d: RiskDetector) {
  if (!DETECTOR_REGISTRY.some((x) => x.id === d.id)) DETECTOR_REGISTRY.push(d);
}

export function runDetectors(claim: CanonicalClaim, ctx: DetectorContext): RiskFinding[] {
  return DETECTOR_REGISTRY.map((d) => d.run(claim, ctx)).filter(Boolean) as RiskFinding[];
}

export function calculateCompositeRisk(findings: RiskFinding[]): { score: number; level: RiskLevel; signals: RiskType[] } {
  if (findings.length === 0) return { score: 12, level: "LOW", signals: [] };
  const maxScore = Math.max(...findings.map((f) => f.risk_score));
  const bonus = findings.length === 1 ? 0 : findings.length === 2 ? 6 : findings.length === 3 ? 10 : 14;
  const score = Math.min(maxScore + bonus, 99);
  return { score, level: verdictFor(score) === "LOW" ? "LOW" : verdictFor(score), signals: findings.map((f) => f.risk_type) };
}
