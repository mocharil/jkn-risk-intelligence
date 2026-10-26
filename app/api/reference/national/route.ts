import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/auth/guard";
import { getStore, memoized } from "@/lib/data/store";
import * as N from "@/lib/data/bpjs-national";

const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

/** Acuan nasional BPJS (statistik agregat 2014-2018) + posisi dataset yang sedang dianalisis terhadap acuan itu. */
export async function GET(request: NextRequest) {
  const g = await guard(request);
  if (g.error) return g.error;

  const national = memoized("reference.national", () => {
    const year = N.LATEST_YEAR;
    const cost = N.costPerAdmission(year);
    const los = N.losByClass(year);
    const out = N.outcomes(year);
    const provinces = N.provinceReference(year);
    return {
      source: N.SOURCE,
      years: N.NATIONAL_YEARS,
      latest_year: year,
      kpi: {
        admissions: N.totalAdmissions(year),
        participants: N.NATIONAL.peserta.total[year],
        cost_per_admission: cost.total,
        los_days: los.total,
        fkrtl_count: provinces.reduce((a, p) => a + p.fkrtl_count, 0),
        death_pct: out.pct.meninggal,
        recovered_pct: out.pct.sehat,
        referred_pct: out.pct.rujuk,
      },
      cost_trend: N.NATIONAL_YEARS.map((y) => ({
        year: y,
        total: N.NATIONAL.biaya_per_admisi_ritl.total[y],
        kelas_1: N.NATIONAL.biaya_per_admisi_ritl.by_class["1"][y],
        kelas_2: N.NATIONAL.biaya_per_admisi_ritl.by_class["2"][y],
        kelas_3: N.NATIONAL.biaya_per_admisi_ritl.by_class["3"][y],
        los: N.NATIONAL.lama_rawat_ritl.total[y],
        admissions: N.totalAdmissions(y),
      })),
      cost_by_class: cost.by_class,
      los_by_class: los.by_class,
      class_share: N.classAdmissionShare(year),
      cost_by_age_sex: N.costByAgeSex(year),
      top_diagnoses: N.diagnosisTrend(15),
      provinces,
    };
  });

  const comparison = memoized("reference.comparison", () => {
    const store = getStore();
    const claims = store.claims;
    // Acuan dibandingkan dengan klaim yang tidak ditandai (skor < 50) agar anomali tidak menggeser rata-rata.
    const clean = claims.filter((c) => c.risk_score < 50);
    const classOf = (c: (typeof claims)[number]) => String(c.service.treatment_class || "").replace(/\D/g, "") || "?";
    const byClass: Record<string, { n: number; mean_amount: number; mean_los: number }> = {};
    for (const k of N.CLASS_KEYS) {
      const list = clean.filter((c) => classOf(c) === k);
      byClass[k] = { n: list.length, mean_amount: Math.round(mean(list.map((c) => c.claim_amount))), mean_los: Number(mean(list.map((c) => c.service.length_of_stay)).toFixed(2)) };
    }
    const nTotal = claims.length || 1;
    const dxCount = new Map<string, number>();
    for (const c of claims) {
      const d = c.diagnoses.find((x) => x.is_primary) || c.diagnoses[0];
      if (d) dxCount.set(d.code, (dxCount.get(d.code) || 0) + 1);
    }
    const dx = Array.from(dxCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([code, n]) => {
        const nat = N.admissionsForIcdPrefix(code);
        const desc = claims.find((c) => c.diagnoses.some((d) => d.code === code))?.diagnoses.find((d) => d.code === code)?.description || code;
        return { code, description: desc, dataset_share: n / nTotal, national_admissions: nat, in_national_top100: nat > 0 };
      });
    const provCount = new Map<string, number>();
    for (const c of claims) provCount.set(c.provider.province_code, (provCount.get(c.provider.province_code) || 0) + 1);
    const provRef = N.provinceReference();
    const natAdm = provRef.reduce((a, p) => a + p.admissions_est, 0) || 1;
    const provinces = provRef.map((p) => ({
      code: p.code,
      dataset_share: (provCount.get(p.code) || 0) / nTotal,
      national_share: p.admissions_est / natAdm,
    }));
    return {
      claims: claims.length,
      clean_claims: clean.length,
      mean_amount_clean: Math.round(mean(clean.map((c) => c.claim_amount))),
      mean_los_clean: Number(mean(clean.map((c) => c.service.length_of_stay)).toFixed(2)),
      by_class: byClass,
      class_share: Object.fromEntries(N.CLASS_KEYS.map((k) => [k, claims.filter((c) => classOf(c) === k).length / nTotal])),
      diagnoses: dx,
      provinces,
      data_mode: store.ingestedClaimIds.size === 0 ? "sintetis" : "campuran",
    };
  });

  return NextResponse.json({ national, comparison });
}
