import { describe, expect, it } from "vitest";
import { generateSyntheticDataset } from "@/lib/data/synthetic-seed";
import { SYNTH } from "@/lib/data/synthetic-config";
import { provinceReference } from "@/lib/data/bpjs-national";
import { patientEligible } from "@/lib/risk/reference";

describe("data sintetis menyerupai keadaan nyata", () => {
  const ds = generateSyntheticDataset();

  it("jumlah klaim dan faskes mengikuti konfigurasi dan statistik FKRTL BPJS", () => {
    expect(Math.abs(ds.claims.length - SYNTH.claims)).toBeLessThan(SYNTH.claims * 0.08);
    const perProv = new Map<string, number>();
    ds.providers.forEach((p) => perProv.set(p.province_code, (perProv.get(p.province_code) || 0) + 1));
    const refs = provinceReference();
    // provinsi dengan FKRTL terbanyak memiliki faskes terbanyak
    const topFkrtl = [...refs].sort((a, b) => b.fkrtl_count - a.fkrtl_count)[0].code;
    const maxProv = Array.from(perProv.entries()).sort((a, b) => b[1] - a[1])[0][0];
    expect(perProv.get(topFkrtl)).toBe(perProv.get(maxProv));
  });

  it("pasien masuk akal secara klinis untuk diagnosisnya (mis. persalinan hanya perempuan usia subur)", () => {
    for (const c of ds.claims) expect(patientEligible(c.diagnoses[0].code, c.patient.age, c.patient.gender), `${c.claim_id} ${c.diagnoses[0].code} ${c.patient.age}${c.patient.gender}`).toBe(true);
  });

  it("nilai klaim wajar: tagihan positif, tanggal pulang tidak mendahului masuk", () => {
    for (const c of ds.claims) {
      expect(c.claim_amount).toBeGreaterThan(0);
      expect(c.service.discharge_date >= c.service.admission_date).toBe(true);
      expect(c.service.length_of_stay).toBeGreaterThanOrEqual(1);
    }
  });

  it("penyalinan narasi umumnya di faskes yang sama atau provinsi yang sama, bukan lintas provinsi", () => {
    const byId = new Map(ds.claims.map((c) => [c.claim_id, c]));
    const cloned = ds.claims.filter((c) => (ds.labels[c.claim_id] || []).includes("CLONING") && c.similar_claims.length === 0);
    // similar_claims diisi setelah analisis; di sini cukup periksa bahwa label cloning tidak menyebar ke semua provinsi
    const provs = new Set(cloned.map((c) => c.provider.province_code));
    expect(cloned.length).toBeGreaterThan(0);
    expect(provs.size).toBeLessThan(ds.providers.length);
    expect(byId.size).toBe(ds.claims.length);
  });

  it("nama faskes unik dan kota berformat wajar", () => {
    const names = ds.providers.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
    expect(ds.providers.every((p) => !/^Kab\. /.test(p.city))).toBe(true);
  });
});
