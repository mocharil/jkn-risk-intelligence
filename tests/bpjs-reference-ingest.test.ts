import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as N from "@/lib/data/bpjs-national";
import { INDONESIA_PROVINCES } from "@/lib/data/indonesia-provinces";
import { heuristicMapping } from "@/lib/ingest/mapper";
import { normalizeRows, parseCareLevel, parseTreatmentClass } from "@/lib/ingest/normalize";
import { missingRequiredFields } from "@/lib/ingest/canonical";
import { parseUpload } from "@/lib/ingest/parse";
import { anonymizeUpload } from "@/lib/ingest/pii";
import { profileColumns } from "@/lib/ingest/profile";
import { analyzeLocal, hasNarrative } from "@/lib/risk/engine";
import { evaluate } from "@/lib/eval/evaluate";
import { generateSyntheticDataset } from "@/lib/data/synthetic-seed";
import type { CanonicalClaim } from "@/types/claim";
import type { RiskType } from "@/types/risk";

describe("acuan nasional BPJS (statistik agregat 2014-2018)", () => {
  it("konsisten antar berkas sumber: total biaya, admisi kelas x peserta = total outcome", () => {
    expect(N.costPerAdmission().total).toBeCloseTo(4_747_547, -2);
    // admisi per kelas = peserta x angka admisi per 10.000; jumlahnya harus mendekati total admisi RITL 2018
    const est = N.provinceReference().reduce((a, p) => a + p.admissions_est, 0);
    expect(Math.abs(est / N.totalAdmissions() - 1)).toBeLessThan(0.03);
    const share = N.classAdmissionShare();
    expect(share["1"] + share["2"] + share["3"]).toBeCloseTo(1, 6);
    expect(share["3"]).toBeGreaterThan(share["1"]);
  });

  it("34 provinsi terpetakan pada setiap tabel provinsi", () => {
    const refs = N.provinceReference();
    expect(refs).toHaveLength(INDONESIA_PROVINCES.length);
    for (const r of refs) {
      expect(r.participants, r.name).toBeGreaterThan(0);
      expect(r.cost_per_admission, r.name).toBeGreaterThan(1_000_000);
      expect(r.fkrtl_count, r.name).toBeGreaterThan(0);
    }
  });

  it("faktor biaya kelas: kelas 1 > rata-rata > kelas 3; lama rawat rerata ~3,65 hari", () => {
    const f = N.classCostFactor();
    expect(f["1"]).toBeGreaterThan(1.2);
    expect(f["3"]).toBeLessThan(0.95);
    expect(N.losByClass().total).toBeGreaterThan(3.4);
    expect(N.losByClass().total).toBeLessThan(3.9);
  });

  it("kode ICD tanpa titik (format berkas BPJS) dicocokkan dengan kode berformat titik pada aplikasi", () => {
    expect(N.icdKey("A09.9")).toBe("A099");
    expect(N.admissionsForIcdPrefix("A09")).toBeGreaterThan(400_000); // A099 + A090
    expect(N.admissionsForIcdPrefix("K35")).toBeGreaterThan(0);
    expect(N.admissionsForIcdPrefix("ZZZ")).toBe(0);
  });
});

describe("dataset sintetis dikalibrasi ke acuan nasional", () => {
  const ds = generateSyntheticDataset();
  const claims = ds.claims;
  const share = (pred: (c: CanonicalClaim) => boolean) => claims.filter(pred).length / claims.length;

  it("campuran kelas rawat mengikuti pangsa admisi nasional (+/- 6 poin)", () => {
    const nat = N.classAdmissionShare();
    for (const k of ["1", "2", "3"]) expect(Math.abs(share((c) => c.service.treatment_class === `KELAS_${k}`) - nat[k])).toBeLessThan(0.06);
  });

  it("volume provinsi besar proporsional dengan admisi nasional", () => {
    const refs = N.provinceReference();
    const totalAdm = refs.reduce((a, r) => a + r.admissions_est, 0);
    for (const code of ["ID-JB", "ID-JT", "ID-JI", "ID-JK"]) {
      const nat = (refs.find((r) => r.code === code)!.admissions_est) / totalAdm;
      expect(Math.abs(share((c) => c.provider.province_code === code) - nat), code).toBeLessThan(0.02);
    }
  });

  it("biaya klaim yang tidak bermasalah mendekati rerata nasional per admisi (+/- 20%)", () => {
    const clean = claims.filter((c) => (ds.labels[c.claim_id] || []).length === 0);
    const mean = clean.reduce((a, c) => a + c.claim_amount, 0) / clean.length;
    expect(mean / N.costPerAdmission().total).toBeGreaterThan(0.8);
    expect(mean / N.costPerAdmission().total).toBeLessThan(1.2);
  });

  it("diagnosis terbanyak aplikasi adalah penyakit terbanyak nasional (tifoid, gastroenteritis, dispepsia)", () => {
    const count = new Map<string, number>();
    claims.forEach((c) => count.set(c.diagnoses[0].code, (count.get(c.diagnoses[0].code) || 0) + 1));
    const top3 = Array.from(count.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map((e) => e[0]);
    expect(top3).toEqual(expect.arrayContaining(["A09", "A01.0"]));
    expect(count.has("M54.5")).toBe(false); // bukan 100 penyakit rawat inap terbanyak
  });
});

describe("ingest skema data mikro BPJS (Buku Data Sampel, file FKRTL)", () => {
  it("parser nilai: kelas rawat, tingkat pelayanan", () => {
    expect(parseTreatmentClass("1")).toBe("KELAS_1");
    expect(parseTreatmentClass("Kelas III")).toBe("KELAS_3");
    expect(parseTreatmentClass("")).toBe("TIDAK_DIKETAHUI");
    expect(parseCareLevel("RITL")).toBe("INAP");
    expect(parseCareLevel("rawat jalan")).toBe("JALAN");
    expect(parseCareLevel("2")).toBe("JALAN");
    expect(parseCareLevel("???")).toBeNull();
  });

  it("kode faskes tidak wajib bila provinsi dipetakan (diturunkan sebagai strata)", () => {
    expect(missingRequiredFields(new Set(["claim_id", "patient_id", "primary_diagnosis", "claim_amount", "admission_date"]))).toContain("provider_id");
    expect(missingRequiredFields(new Set(["claim_id", "patient_id", "primary_diagnosis", "claim_amount", "admission_date", "province"]))).toEqual([]);
  });

  const csvPath = path.join(__dirname, "../public/samples/bpjs_sampel_fkrtl.csv");
  const labels = JSON.parse(fs.readFileSync(path.join(__dirname, "../scripts/fixtures/bpjs_sampel_fkrtl.labels.json"), "utf8")) as Record<string, RiskType[]>;
  const parsed = parseUpload(fs.readFileSync(csvPath), "bpjs_sampel_fkrtl.csv");
  const anon = anonymizeUpload(parsed.columns, parsed.rows);
  const mappings = heuristicMapping(profileColumns(anon));
  const field = (col: string) => mappings.find((m) => m.source_field === col)?.canonical_field;

  it("pemetaan otomatis mengenali kode variabel resmi FKLxx / PSTV01", () => {
    expect(field("PSTV01")).toBe("patient_id");
    expect(field("FKL02")).toBe("claim_id");
    expect(field("FKL03")).toBe("admission_date");
    expect(field("FKL04")).toBe("discharge_date");
    expect(field("FKL05")).toBe("province");
    expect(field("FKL10")).toBe("care_level");
    expect(field("FKL13")).toBe("treatment_class");
    expect(field("FKL18")).toBe("primary_diagnosis");
    expect(field("FKL19")).toBe("severity_level");
    expect(field("FKL47")).toBe("claim_amount");
    expect(field("FKL48")).toBe("approved_tariff");
  });

  it("nomor peserta dipseudonimkan saat input", () => {
    expect(anon.report.columns_pseudonymized).toContain("PSTV01");
    expect(anon.rows[0].PSTV01).toMatch(/^PSN-/);
  });

  const res = normalizeRows(anon.rows, mappings.map((m) => ({ ...m, status: m.canonical_field ? ("CONFIRMED" as const) : ("UNMAPPED" as const) })), { existingClaimIds: new Set(), providers: new Map(), today: "2026-09-30" });

  it("seluruh baris valid; kode provinsi numerik, ICD tanpa titik, kelas dan rawat jalan terbaca", () => {
    expect(res.rejected).toEqual([]);
    expect(res.claims).toHaveLength(parsed.rows.length);
    expect(new Set(res.claims.map((c) => c.provider.province_code)).size).toBeGreaterThan(25);
    expect(res.claims.some((c) => c.diagnoses[0].code === "A09.9")).toBe(true);
    expect(res.claims.some((c) => c.service.treatment_class === "KELAS_1")).toBe(true);
    expect(res.claims.some((c) => c.service.treatment_class === "RAWAT_JALAN")).toBe(true);
    expect(res.claims.every((c) => c.service.treatment_class !== "TIDAK_DIKETAHUI")).toBe(true);
    expect(res.newProviders.length).toBeGreaterThan(10);
    expect(res.newProviders[0].provider_id).toMatch(/^FKRTL-/);
  });

  it("diagnosis diberi nama resmi ICD-10 dari statistik BPJS, bukan 'Diagnosis lain'; kode kab/kota terbawa", () => {
    const z = res.claims.find((c) => c.diagnoses[0].code === "Z09.8")!;
    expect(z.diagnoses[0].description).toMatch(/Follow-up/i);
    const typhoid = res.claims.find((c) => c.diagnoses[0].code === "A01.0")!;
    expect(typhoid.diagnoses[0].description).toBe("Demam tifoid"); // nama Indonesia dari tabel referensi aplikasi didahulukan
    expect(res.claims.some((c) => c.diagnoses[0].description === "Diagnosis lain")).toBe(false);
    expect(res.claims[0].provider.city).toMatch(/^Kab\/kota \d+/);
  });

  describe("deteksi tanpa narasi klinis", () => {
    const store = { claims: res.claims, investigations: [], embeddings: new Map(), meta: {} } as never;
    analyzeLocal(store);
    const rep = evaluate(res.claims, labels);
    const m = (t: RiskType) => rep.per_detector.find((d) => d.risk_type === t)!;

    it("tanpa teks klinis tidak ada klaim yang ditandai klon (regresi: sebelumnya 1.499 dari 1.500)", () => {
      expect(res.claims.some(hasNarrative)).toBe(false);
      expect(res.claims.filter((c) => c.risk_signals.includes("CLONING"))).toHaveLength(0);
      expect(res.claims.filter((c) => c.risk_signals.includes("PHANTOM_BILLING"))).toHaveLength(0);
    });

    it("false positive pada klaim normal di bawah 5%", () => {
      expect(rep.claim_level.false_positive_rate).toBeLessThan(0.05);
    });

    it("detektor berbasis angka dan riwayat tetap akurat pada data berbentuk BPJS", () => {
      // Sebagian penyimpangan sengaja tipis (dekat ambang), jadi recall angka/ sebaran tidak 100%.
      expect(m("UPCODING").recall).toBeGreaterThanOrEqual(0.75);
      expect(m("UPCODING").precision).toBeGreaterThanOrEqual(0.9);
      expect(m("INFLATED_BILLS").precision).toBeGreaterThanOrEqual(0.8);
      expect(m("INFLATED_BILLS").recall).toBeGreaterThanOrEqual(0.6);
      expect(m("REPEAT_BILLING").recall).toBeGreaterThanOrEqual(0.9);
      expect(m("REPEAT_BILLING").precision).toBeGreaterThanOrEqual(0.8);
      expect(m("READMISSION").recall).toBeGreaterThanOrEqual(0.9);
      expect(m("READMISSION").precision).toBeGreaterThanOrEqual(0.9);
      expect(m("ABNORMAL_LOS").recall).toBeGreaterThanOrEqual(0.6); // presisi rendah: lama rawat riil menyebar lebar, ini kelemahan yang jujur
    });
  });
});

describe("konteks nasional per klaim", () => {
  const claim = (over: Partial<{ amount: number; cls: string; los: number; prov: string; dx: string }> = {}) => ({
    claim_amount: over.amount ?? 6_310_301,
    service: { treatment_class: over.cls ?? "KELAS_1", length_of_stay: over.los ?? 4 },
    provider: { province_code: over.prov ?? "ID-JK" },
    diagnoses: [{ code: over.dx ?? "A09.9", is_primary: true }],
  });

  it("rawat inap: rasio terhadap rerata kelas, provinsi, dan lama rawat kelas", () => {
    const n = N.nationalContext(claim());
    expect(n.level).toBe("INAP");
    expect(n.class_label).toBe("Kelas 1");
    expect(n.cost_ref).toBeCloseTo(6_310_301, -2);
    expect(n.cost_ratio).toBeCloseTo(1, 2);
    expect(n.province_name).toBe("DKI Jakarta");
    expect(n.province_ratio).toBeGreaterThan(0.5);
    expect(n.los_ref).toBeCloseTo(3.68, 2);
    expect(n.los_ratio).toBeCloseTo(4 / 3.68, 2);
  });

  it("kelas berbeda memakai acuan berbeda; kelas tak dikenal memakai rerata seluruh kelas", () => {
    expect(N.nationalContext(claim({ cls: "KELAS_3" })).cost_ref).toBeLessThan(N.nationalContext(claim({ cls: "KELAS_1" })).cost_ref);
    const nd = N.nationalContext(claim({ cls: "TIDAK_DIKETAHUI" }));
    expect(nd.class_label).toBe("Seluruh kelas");
    expect(nd.cost_ref).toBeCloseTo(N.costPerAdmission().total, -2);
  });

  it("rawat jalan memakai biaya per kunjungan provinsi dan tanpa lama rawat", () => {
    const n = N.nationalContext(claim({ cls: "RAWAT_JALAN", amount: 400_000, dx: "Z09.8" }));
    expect(n.level).toBe("JALAN");
    expect(n.cost_ref).toBeGreaterThan(50_000);
    expect(n.cost_ref).toBeLessThan(2_000_000);
    expect(n.los_ref).toBeUndefined();
  });

  it("peringkat diagnosis nasional: tifoid dan gastroenteritis teratas, diagnosis langka tidak ada", () => {
    expect(N.nationalContext(claim({ dx: "A01.0" })).dx?.rank).toBe(1);
    expect(N.nationalContext(claim({ dx: "A09" })).dx?.rank).toBeLessThanOrEqual(3);
    expect(N.nationalContext(claim({ dx: "M54.5" })).dx).toBeUndefined();
  });
});

describe("filter & urutan daftar klaim", () => {
  it("provinsi, kelas rawat, dan urutan bekerja; respons daftar membawa konteks nasional", async () => {
    const { DatabaseService } = await import("@/lib/supabase/db-service");
    const all = await DatabaseService.getClaims({ lite: true, limit: 5000 });
    const jb = await DatabaseService.getClaims({ province: "ID-JB", lite: true, limit: 5000 });
    expect(jb.total_count).toBeGreaterThan(100);
    expect(jb.data.every((c) => c.provider.province_code === "ID-JB")).toBe(true);
    expect(jb.total_count).toBeLessThan(all.total_count);

    const k3 = await DatabaseService.getClaims({ treatment_class: "KELAS_3", lite: true, limit: 5000 });
    expect(k3.data.length).toBeGreaterThan(300);
    expect(k3.data.every((c) => c.service.treatment_class === "KELAS_3")).toBe(true);

    const byAmount = await DatabaseService.getClaims({ sort: "amount", lite: true, limit: 50 });
    for (let i = 1; i < byAmount.data.length; i++) expect(byAmount.data[i - 1].claim_amount).toBeGreaterThanOrEqual(byAmount.data[i].claim_amount);
    expect(byAmount.data[0].national?.cost_ref).toBeGreaterThan(0);

    const inv = await DatabaseService.getInvestigations({ province: "ID-JB", sort: "exposure", lite: true, limit: 200 });
    expect(inv.data.every((i) => i.claim.provider.province_code === "ID-JB")).toBe(true);
    for (let i = 1; i < inv.data.length; i++) expect(inv.data[i - 1].potential_exposure).toBeGreaterThanOrEqual(inv.data[i].potential_exposure);
  });
});

describe("profil faskes terhadap statistik BPJS", () => {
  it("rasio biaya memakai campuran kelas yang sama; faskes tertinggi di atas median faskes", async () => {
    const { getStore } = await import("@/lib/data/store");
    const { computeProviderNational, SMALL_SAMPLE_CLAIMS } = await import("@/lib/analytics/provider-national");
    const store = getStore();
    const m = computeProviderNational(store);
    expect(m.size).toBe(store.providers.length);

    // faskes dengan rasio biaya tertinggi di antara yang sampelnya cukup (dipilih dari data, bukan ditulis tangan)
    const hot = Array.from(m.values()).filter((x) => !x.small_sample && x.cost_ratio !== null).sort((a, b) => (b.cost_ratio as number) - (a.cost_ratio as number))[0];
    expect(hot.claims).toBeGreaterThanOrEqual(SMALL_SAMPLE_CLAIMS);
    expect(hot.small_sample).toBe(false);
    expect(hot.cost_ratio!).toBeGreaterThan(1);
    expect(hot.province?.name).toBeTruthy();
    expect(Object.values(hot.class_mix).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);

    const ratios = store.providers
      .map((p) => m.get(p.provider_id)!)
      .filter((x) => !x.small_sample && x.cost_ratio !== null)
      .map((x) => x.cost_ratio as number);
    expect(ratios.length).toBeGreaterThan(10);
    const sorted = [...ratios].sort((a, b) => a - b);
    expect(sorted[Math.floor(sorted.length / 2)]).toBeLessThan(hot.cost_ratio!);
  });

  it("faskes dengan klaim sedikit ditandai sampel kecil", async () => {
    const { getStore } = await import("@/lib/data/store");
    const { computeProviderNational } = await import("@/lib/analytics/provider-national");
    const store = getStore();
    const m = computeProviderNational(store);
    const small = store.providers.filter((p) => p.total_claims < 20);
    expect(small.length).toBeGreaterThan(0);
    for (const p of small) expect(m.get(p.provider_id)!.small_sample).toBe(true);
  });
});

describe("peta risiko: konteks BPJS per provinsi", () => {
  it("34 provinsi; pangsa data mengikuti pangsa admisi nasional; rasio biaya terisi untuk provinsi berklaim", async () => {
    const { getStore } = await import("@/lib/data/store");
    const { computeProvinceNational } = await import("@/lib/analytics/provider-national");
    const { DatabaseService } = await import("@/lib/supabase/db-service");
    const store = getStore();
    const m = computeProvinceNational(store);
    expect(m.size).toBe(34);
    const sumData = Array.from(m.values()).reduce((a, x) => a + x.dataset_share, 0);
    const sumNat = Array.from(m.values()).reduce((a, x) => a + x.national_share, 0);
    expect(sumData).toBeCloseTo(1, 6);
    expect(sumNat).toBeCloseTo(1, 6);
    for (const code of ["ID-JB", "ID-JT", "ID-JI"]) {
      const x = m.get(code)!;
      expect(Math.abs(x.dataset_share - x.national_share)).toBeLessThan(0.02);
      expect(x.cost_ratio).not.toBeNull();
      expect(x.small_sample).toBe(false);
    }
    const prov = await DatabaseService.getProvinceRiskData();
    for (const p of prov) {
      expect(p.risk_score).toBeDefined();
      // level harus konsisten dengan aturan skor 90/75/50; provinsi tanpa klaim = skor 0
      const expected = p.total_claims === 0 ? "LOW" : (p.risk_score as number) >= 90 ? "CRITICAL" : (p.risk_score as number) >= 75 ? "HIGH" : (p.risk_score as number) >= 50 ? "MEDIUM" : "LOW";
      expect(p.risk_level).toBe(expected);
    }
  });

  it("graf: node klaim membawa ID kasus bila ada; klaim tanpa kasus tidak diberi tautan investigasi palsu", async () => {
    const { getStore } = await import("@/lib/data/store");
    const { buildGraph } = await import("@/lib/analytics/graph");
    const store = getStore();
    const g = buildGraph(store, {});
    const claims = g.nodes.filter((n) => n.type === "CLAIM");
    expect(claims.length).toBeGreaterThan(0);
    for (const n of claims) {
      const real = store.claims.find((c) => c.claim_id === n.id)!;
      expect(n.investigation_id).toBe(real.investigation_id);
    }
  });
});
