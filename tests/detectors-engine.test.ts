import { describe, expect, it } from "vitest";
import { CanonicalClaim, EvidenceItem } from "@/types/claim";
import { classFactorOf, computeBenchmarks } from "@/lib/risk/benchmarks";
import { abnormalLosDetector, cloningDetector, DetectorContext, inflatedBillsDetector, phantomDetector, unbundlingDetector, upcodingDetector, DETECTOR_REGISTRY, registerDetector } from "@/lib/risk/detectors";
import { documentIndicatesMild, documentIndicatesSevere, procedureVerdict } from "@/lib/risk/text";
import { generateSyntheticDataset } from "@/lib/data/synthetic-seed";
import { analyzeLocal } from "@/lib/risk/engine";
import { evaluate } from "@/lib/eval/evaluate";
import { cosine, localEmbed } from "@/lib/ai/embeddings";
import { INDONESIA_PROVINCES } from "@/lib/data/indonesia-provinces";
import { provinceCostIndex } from "@/lib/data/bpjs-national";

// Provinsi dengan indeks biaya paling mendekati rerata nasional, agar uji unit tidak bergantung pada faktor provinsi.
const NEUTRAL_PROVINCE = INDONESIA_PROVINCES.map((p) => p.code).sort((a, b) => Math.abs(provinceCostIndex(a) - 1) - Math.abs(provinceCostIndex(b) - 1))[0];

function doc(over: Partial<EvidenceItem> & Pick<EvidenceItem, "evidence_id" | "document_type" | "content">): EvidenceItem {
  return { title: over.document_type, date: "2026-08-01", excerpt: over.content.slice(0, 80), status: "NEEDS_REVIEW", ...over };
}

function claim(over: Partial<CanonicalClaim> = {}): CanonicalClaim {
  return {
    claim_id: "CLM-T1",
    sep_number: "T1",
    patient: { patient_id: "PSN-1", name: "A. B.", age: 40, gender: "L", bpjs_card_number: "••••", province_code: NEUTRAL_PROVINCE },
    provider: { provider_id: "H1", name: "RS Uji", type: "RS_KELAS_B", province_code: NEUTRAL_PROVINCE, city: "Kota Uji" },
    service: { admission_date: "2026-08-01", discharge_date: "2026-08-03", submission_date: "2026-08-05", length_of_stay: 2, treatment_class: "KELAS_1", doctor_id: "D1", doctor_name: "dr. Uji", doctor_specialty: "-" },
    diagnoses: [{ code: "A09", description: "Gastroenteritis", is_primary: true, severity: 1 }],
    procedures: [],
    claim_amount: 3_800_000,
    medical_evidence: [],
    risk_score: 0,
    risk_level: "LOW",
    risk_signals: [],
    risk_findings: [],
    similar_claims: [],
    status: "PENDING_REVIEW",
    created_at: "2026-08-05T00:00:00Z",
    updated_at: "2026-08-05T00:00:00Z",
    ...over,
  };
}

const ctx = (similar: DetectorContext["similar"] = []): DetectorContext => ({ benchmarks: computeBenchmarks([]), similar, cloneThreshold: 0.88, lexicalThreshold: 0.75, semanticOnlyThreshold: 0.985 });

describe("analisis teks deterministik", () => {
  it("negasi: 'tanpa komplikasi' bukan indikator berat", () => {
    const d = doc({ evidence_id: "D", document_type: "RINGKASAN_MEDIS", content: "Pasien stabil membaik, tanpa komplikasi, tidak ada sepsis." });
    expect(documentIndicatesSevere(d)).toBe(false);
    expect(documentIndicatesMild(d)).toBe(true);
  });
  it("indikator berat terdeteksi", () => {
    expect(documentIndicatesSevere(doc({ evidence_id: "D", document_type: "RINGKASAN_MEDIS", content: "Terjadi sepsis dan syok, dirawat ICU." }))).toBe(true);
  });
  it("laporan operasi sah ('tidak ada penyulit') BUKAN bantahan tindakan (regresi bug)", () => {
    const op = doc({ evidence_id: "OP", document_type: "CATATAN_TINDAKAN", content: "Laporan operasi: tindakan Apendektomi laparoskopik (47.01) dilaksanakan oleh DPJP, tidak ada penyulit intraoperatif." });
    expect(procedureVerdict([op], { code: "47.01", description: "Apendektomi laparoskopik", date: "x" }).verdict).toBe("SUPPORTS");
  });
  it("bantahan eksplisit tindakan terdeteksi", () => {
    const d = doc({ evidence_id: "OR", document_type: "CATATAN_TINDAKAN", content: "Tidak ada catatan tindakan (44.95) pada registri kamar operasi." });
    expect(procedureVerdict([d], { code: "44.95", description: "Bedah digestif laparoskopik", date: "x" }).verdict).toBe("CONTRADICTS");
  });
  it("dokumen billing tidak dianggap bukti pelayanan", () => {
    const bill = doc({ evidence_id: "B", document_type: "BUKTI_BILLING", content: "Rincian: Prosedur bedah digestif laparoskopik [44.95]: Rp 12.500.000" });
    expect(procedureVerdict([bill], { code: "44.95", description: "Prosedur bedah digestif laparoskopik", date: "x" }).verdict).toBe("NONE");
  });
});

describe("detector", () => {
  it("Upcoding: severity 3 untuk A09 (acuan 1) dengan dokumen ringan -> temuan bersitasi dokumen", () => {
    const c = claim({
      diagnoses: [{ code: "A09", description: "Gastroenteritis", is_primary: true, severity: 3 }],
      claim_amount: 18_000_000,
      medical_evidence: [doc({ evidence_id: "D1", document_type: "RINGKASAN_MEDIS", content: "Pasien stabil, membaik hari ke-2, tanpa komplikasi." })],
    });
    const f = upcodingDetector.run(c, ctx())!;
    expect(f).not.toBeNull();
    expect(f.risk_score).toBeGreaterThanOrEqual(75);
    expect(f.evidence.map((e) => e.evidence_id)).toContain("D1");
    expect(f.evidence[0].excerpt).toBeTruthy(); // kutipan verbatim
  });

  it("Upcoding: severity tinggi yang dibenarkan dokumen berat tidak ditandai", () => {
    const c = claim({
      diagnoses: [{ code: "A09", description: "Gastroenteritis", is_primary: true, severity: 3 }],
      claim_amount: 4_500_000,
      medical_evidence: [doc({ evidence_id: "D1", document_type: "RINGKASAN_MEDIS", content: "Dehidrasi berat dengan syok hipovolemik, perawatan ICU." })],
    });
    expect(upcodingDetector.run(c, ctx())).toBeNull();
  });

  it("Upcoding: klaim wajar tidak ditandai", () => {
    expect(upcodingDetector.run(claim(), ctx())).toBeNull();
  });

  it("Phantom: tindakan bedah tanpa jejak dokumen ditandai; dengan laporan operasi tidak", () => {
    const procs = [{ code: "47.01", description: "Apendektomi laparoskopik", date: "2026-08-02", cost: 9_500_000 }];
    const bad = claim({ procedures: procs, medical_evidence: [doc({ evidence_id: "O1", document_type: "CATATAN_TINDAKAN", content: "Perintah DPJP: lanjutkan infus dan diet lunak." })] });
    expect(phantomDetector.run(bad, ctx())).not.toBeNull();
    const ok = claim({ procedures: procs, medical_evidence: [doc({ evidence_id: "O1", document_type: "CATATAN_TINDAKAN", content: "Laporan operasi: Apendektomi laparoskopik (47.01) dilaksanakan." })] });
    expect(phantomDetector.run(ok, ctx())).toBeNull();
  });

  it("Abnormal LOS: lama rawat 3x median ditandai, kecuali ada pembenaran klinis berat", () => {
    const long = claim({ service: { ...claim().service, length_of_stay: 7 }, medical_evidence: [doc({ evidence_id: "D", document_type: "RINGKASAN_MEDIS", content: "Pasien stabil membaik." })] });
    expect(abnormalLosDetector.run(long, ctx())).not.toBeNull();
    const justified = claim({ service: { ...claim().service, length_of_stay: 7 }, medical_evidence: [doc({ evidence_id: "D", document_type: "RINGKASAN_MEDIS", content: "Perburukan klinis dengan sepsis, ICU." })] });
    expect(abnormalLosDetector.run(justified, ctx())).toBeNull();
  });

  it("Unbundling: komponen paket ditagih terpisah", () => {
    const c = claim({ procedures: [{ code: "99.18", description: "Infus", date: "x", cost: 900_000 }, { code: "90.59", description: "Lab", date: "x", cost: 450_000 }] });
    expect(unbundlingDetector.run(c, ctx())).not.toBeNull();
    expect(unbundlingDetector.run(claim({ procedures: [{ code: "99.18", description: "Infus", date: "x" }] }), ctx())).toBeNull();
  });

  it("Inflated Bills: total 2x median tanpa kenaikan severity; komponen itemisasi tidak dihitung ganda", () => {
    const kelas2 = { ...claim().service, treatment_class: "KELAS_2" as const };
    expect(inflatedBillsDetector.run(claim({ claim_amount: 8_000_000, service: kelas2 }), ctx())).not.toBeNull();
    expect(inflatedBillsDetector.run(claim({ claim_amount: 3_800_000 + 12_500_000, procedures: [{ code: "44.95", description: "x", date: "x", cost: 12_500_000 }] }), ctx())).toBeNull();
  });

  it("benchmark tarif sadar kelas rawat: Rp8 jt wajar-tinggi untuk kelas 1 tetapi inflasi untuk kelas 3 (faktor biaya BPJS)", () => {
    const bm = computeBenchmarks([]);
    const k1 = bm.get("A09", "KELAS_1").expected_tariff;
    const k3 = bm.get("A09", "KELAS_3").expected_tariff;
    expect(k1).toBeGreaterThan(k3 * 1.4); // kelas 1 ~ Rp6,31 jt vs kelas 3 ~ Rp4,16 jt per admisi (rasio 1,52)
    expect(classFactorOf("KELAS_3")).toBeLessThan(1);
    expect(classFactorOf("KELAS_1")).toBeGreaterThan(1);
    expect(classFactorOf("RAWAT_JALAN")).toBe(1); // kelas tak dikenal tidak diubah
    const c8 = (cls: "KELAS_1" | "KELAS_3") => claim({ claim_amount: 8_000_000, service: { ...claim().service, treatment_class: cls } });
    expect(inflatedBillsDetector.run(c8("KELAS_3"), ctx())).not.toBeNull();
    expect(inflatedBillsDetector.run(c8("KELAS_1"), ctx())).toBeNull();
  });

  it("Cloning: butuh kemiripan semantik DAN tumpang tindih frasa (template kebetulan tidak ditandai)", () => {
    const sim = (score: number, lex: number) => [{ claim_id: "CLM-X", provider_id: "H", provider_name: "H", similarity_score: score, lexical_overlap: lex, claim_amount: 1, diagnosis_code: "A09", similarity_reasons: ["r"], risk_score: 0 }];
    const c = claim({ medical_evidence: [doc({ evidence_id: "D1", document_type: "RINGKASAN_MEDIS", content: "narasi" })] });
    expect(cloningDetector.run(c, ctx(sim(0.95, 0.85)))).not.toBeNull();
    expect(cloningDetector.run(c, ctx(sim(0.95, 0.5)))).toBeNull();
    expect(cloningDetector.run(c, ctx(sim(0.99, 0.2)))).not.toBeNull(); // parafrase semantik sangat tinggi
  });

  it("registry bersifat plug-in: detector baru dapat didaftarkan tanpa mengubah engine", () => {
    const before = DETECTOR_REGISTRY.length;
    registerDetector({ id: "UPCODING", label: "dup", version: "0", run: () => null }); // id sama tidak digandakan
    expect(DETECTOR_REGISTRY.length).toBe(before);
    expect(DETECTOR_REGISTRY.map((d) => d.id)).toEqual(expect.arrayContaining(["UPCODING", "CLONING", "PHANTOM_BILLING", "ABNORMAL_LOS", "UNBUNDLING", "INFLATED_BILLS"]));
  });
});

describe("embedding lokal", () => {
  it("narasi identik ~1, narasi berbeda jauh lebih rendah", () => {
    const a = localEmbed("Pasien datang dengan diare cair 4 kali, kondisi stabil, rehidrasi oral.");
    const b = localEmbed("Pasien datang dengan diare cair 4 kali, kondisi stabil, rehidrasi oral.");
    const c = localEmbed("Nyeri dada menjalar ke lengan kiri, EKG elevasi ST, dirujuk kateterisasi.");
    expect(cosine(a, b)).toBeGreaterThan(0.999);
    expect(cosine(a, c)).toBeLessThan(0.4);
    expect(a).toHaveLength(768);
  });
});

describe("pipeline end-to-end pada data sintetis berlabel (regresi kualitas)", () => {
  const ds = generateSyntheticDataset();
  const store = { claims: ds.claims, investigations: [], embeddings: new Map(), meta: {} } as never;
  analyzeLocal(store);
  const report = evaluate(ds.claims, ds.labels);

  it("34 provinsi memiliki faskes", () => {
    expect(new Set(ds.providers.map((p) => p.province_code)).size).toBe(34);
  });
  it("klaim berskor tertinggi berisiko tinggi dan setiap temuannya menunjuk dokumen yang ada", () => {
    const top = [...ds.claims].sort((a, b) => b.risk_score - a.risk_score)[0];
    expect(["HIGH", "CRITICAL"]).toContain(top.risk_level);
    expect(top.risk_findings.length).toBeGreaterThan(0);
    const ids = new Set(top.medical_evidence.map((e) => e.evidence_id));
    expect(top.risk_findings.some((f) => f.evidence.some((e) => ids.has(e.evidence_id)))).toBe(true);
  });
  it("tingkat penyimpangan berlabel realistis (3-12% klaim), bukan sebagian besar data", () => {
    const anomalous = Object.values(ds.labels).filter((l) => l.length > 0).length / ds.claims.length;
    expect(anomalous).toBeGreaterThan(0.03);
    expect(anomalous).toBeLessThan(0.12);
    const high = ds.claims.filter((c) => c.risk_score >= 75).length / ds.claims.length;
    expect(high).toBeLessThan(0.1);
  });
  it("tidak ada faskes atau klaim bernama tetap: identitas dibangkitkan dari statistik FKRTL", () => {
    expect(ds.providers.every((p) => /^FKL-\d+$/.test(p.provider_id))).toBe(true);
    expect(ds.providers.length).toBeGreaterThanOrEqual(34);
  });
  it("tidak ada PII mentah pada klaim sintetis", () => {
    const blob = JSON.stringify(ds.claims.slice(0, 300));
    expect(blob).not.toMatch(/(?<!\d)\d{16}(?!\d)/);
    expect(blob).not.toContain("Bambang Sudibyo");
  });
  it("kualitas deteksi masuk akal tetapi TIDAK sempurna (data sengaja mengandung kasus samar dan kasus sah yang janggal)", () => {
    expect(report.macro.f1).toBeGreaterThanOrEqual(0.65);
    expect(report.micro.recall).toBeGreaterThanOrEqual(0.7);
    expect(report.macro.f1).toBeLessThan(0.97); // jika hampir sempurna, data terlalu ideal dan tidak menggambarkan keadaan nyata
  });
  it("detektor berbasis aturan jelas (upcoding, tindakan fiktif, unbundling, tagihan ganda, readmisi) presisi dan recall tinggi", () => {
    for (const t of ["UPCODING", "PHANTOM_BILLING", "UNBUNDLING", "REPEAT_BILLING", "READMISSION"]) {
      const m = report.per_detector.find((d) => d.risk_type === t)!;
      if (m.positives < 3) continue; // sampel terlalu kecil untuk diuji
      expect(m.precision, `precision ${t}`).toBeGreaterThanOrEqual(0.75);
      expect(m.recall, `recall ${t}`).toBeGreaterThanOrEqual(0.75);
    }
  });
  it("detektor berbasis sebaran (lama rawat, biaya) lebih lemah: kelemahannya terlihat jujur pada metrik", () => {
    const los = report.per_detector.find((d) => d.risk_type === "ABNORMAL_LOS")!;
    expect(los.f1).toBeLessThan(0.9);
  });
  it("false positive pada klaim normal < 5%", () => {
    expect(report.claim_level.false_positive_rate).toBeLessThan(0.05);
  });
  it("setiap temuan bersitasi bukti yang benar-benar ada", () => {
    // Sebagian klaim sengaja tanpa ringkasan/resume terlampir (ekspor SIMRS tidak lengkap), jadi tidak harus 100%.
    expect(report.evidence_completeness.pct).toBeGreaterThanOrEqual(85);
  });
  it("Arsa mengungguli baseline ambang tunggal pada F1 tingkat-klaim", () => {
    expect(report.uplift.claim_f1_arsa).toBeGreaterThan(report.uplift.claim_f1_baseline);
  });
});

import { readmissionDetector, repeatBillingDetector } from "@/lib/risk/detectors";

describe("Repeat Billing & Readmission (riwayat pasien)", () => {
  const prior = (over: Partial<CanonicalClaim> = {}) =>
    claim({ claim_id: "CLM-P", service: { ...claim().service, admission_date: "2026-07-20", discharge_date: "2026-07-23", submission_date: "2026-07-25" }, ...over });
  const mine = (adm: string, over: Partial<CanonicalClaim> = {}) =>
    claim({ claim_id: "CLM-N", service: { ...claim().service, admission_date: adm, discharge_date: "2026-08-10", submission_date: "2026-08-12" }, ...over });
  const withHist = (h: CanonicalClaim[]): DetectorContext => ({ ...ctx(), history: h });

  it("Repeat: admisi tepat setelah/di tengah episode sebelumnya, diagnosis sama -> ditandai dan dikutip", () => {
    const f = repeatBillingDetector.run(mine("2026-07-23"), withHist([prior()]))!;
    expect(f).not.toBeNull();
    expect(f.evidence[0].source_claim_id).toBe("CLM-P");
    const overlap = repeatBillingDetector.run(mine("2026-07-22"), withHist([prior()]))!;
    expect(overlap.risk_score).toBeGreaterThan(f.risk_score - 1);
  });

  it("Repeat: nominal hampir sama menaikkan skor", () => {
    const same = repeatBillingDetector.run(mine("2026-07-23", { claim_amount: 3_850_000 }), withHist([prior()]))!;
    const diff = repeatBillingDetector.run(mine("2026-07-23", { claim_amount: 9_000_000 }), withHist([prior()]))!;
    expect(same.risk_score).toBeGreaterThan(diff.risk_score);
  });

  it("Repeat: diagnosis berbeda atau tanpa riwayat -> tidak ditandai", () => {
    const other = prior({ diagnoses: [{ code: "I10", description: "x", is_primary: true, severity: 1 }] });
    expect(repeatBillingDetector.run(mine("2026-07-23"), withHist([other]))).toBeNull();
    expect(repeatBillingDetector.run(mine("2026-07-23"), withHist([]))).toBeNull();
  });

  it("Readmission: ulang 5 hari, diagnosis sama -> ditandai; 25 hari tunggal -> wajar; diagnosis beda -> wajar", () => {
    expect(readmissionDetector.run(mine("2026-07-28"), withHist([prior()]))).not.toBeNull();
    expect(readmissionDetector.run(mine("2026-08-17"), withHist([prior()]))).toBeNull(); // gap 25 hari, hanya satu
    expect(readmissionDetector.run(mine("2026-07-28"), withHist([prior({ diagnoses: [{ code: "I10", description: "x", is_primary: true, severity: 1 }] })]))).toBeNull();
  });

  it("Readmission: dua episode dalam 30 hari ditandai walau gap terakhir 20 hari", () => {
    const p2 = prior({ claim_id: "CLM-P2", service: { ...claim().service, admission_date: "2026-07-05", discharge_date: "2026-07-08", submission_date: "2026-07-10" } });
    expect(readmissionDetector.run(mine("2026-08-12"), withHist([p2, prior()]))).toBeNull(); // gap >30 pada keduanya
    const p3 = prior({ claim_id: "CLM-P3", service: { ...claim().service, admission_date: "2026-07-24", discharge_date: "2026-07-26", submission_date: "2026-07-28" } });
    expect(readmissionDetector.run(mine("2026-08-12", { service: { ...claim().service, admission_date: "2026-08-12", discharge_date: "2026-08-14", submission_date: "2026-08-16" } }), withHist([prior(), p3]))).not.toBeNull();
  });

  it("episode yang LEBIH BARU tidak dianggap riwayat (hanya yang terlambat yang ditandai)", () => {
    const later = prior({ claim_id: "CLM-L", service: { ...claim().service, admission_date: "2026-08-20", discharge_date: "2026-08-22", submission_date: "2026-08-24" } });
    expect(repeatBillingDetector.run(mine("2026-08-08"), withHist([later]))).toBeNull();
    expect(readmissionDetector.run(mine("2026-08-08"), withHist([later]))).toBeNull();
  });
});
