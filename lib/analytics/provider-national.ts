import { CanonicalClaim } from "@/types/claim";
import { Provider, ProviderNational } from "@/types/provider";
import { nationalContext, provinceReference, LATEST_YEAR, NATIONAL } from "../data/bpjs-national";

/** Di bawah jumlah klaim ini, skor & rasio faskes terlalu goyah untuk disimpulkan. */
export const SMALL_SAMPLE_CLAIMS = 20;

/**
 * Posisi tiap faskes terhadap statistik resmi BPJS (2018). Rasio biaya dibandingkan dengan rerata nasional untuk
 * CAMPURAN KELAS RAWAT YANG SAMA: jumlah tagihan faskes dibagi jumlah rerata nasional tiap klaimnya (kelas 1 > kelas 3).
 * Dengan begitu faskes yang banyak melayani kelas 1 tidak dianggap mahal hanya karena campuran kelasnya.
 */
export function computeProviderNational(store: { claims: CanonicalClaim[]; providers: Provider[] }): Map<string, ProviderNational> {
  const acc = new Map<string, { n: number; amount: number; ref: number; los: number; losRef: number; losN: number; classes: Record<string, number> }>();
  for (const c of store.claims) {
    const id = c.provider.provider_id;
    const ctx = nationalContext(c);
    const a = acc.get(id) || { n: 0, amount: 0, ref: 0, los: 0, losRef: 0, losN: 0, classes: {} };
    a.n++;
    if (ctx.cost_ref > 0) {
      a.amount += c.claim_amount;
      a.ref += ctx.cost_ref;
    }
    if (ctx.los_ref) {
      a.los += c.service.length_of_stay;
      a.losRef += ctx.los_ref;
      a.losN++;
    }
    const k = c.service.treatment_class;
    a.classes[k] = (a.classes[k] || 0) + 1;
    acc.set(id, a);
  }

  const provs = provinceReference(LATEST_YEAR);
  // Rasio nasional tertimbang peserta: total FKRTL / total peserta x 100 ribu (bukan rerata sederhana antarprovinsi).
  const totalParticipants = provs.reduce((s, p) => s + p.participants, 0);
  const meanFkrtlRatio = totalParticipants ? (provs.reduce((s, p) => s + p.fkrtl_count, 0) / totalParticipants) * 100_000 : 0;
  const out = new Map<string, ProviderNational>();
  for (const p of store.providers) {
    const a = acc.get(p.provider_id);
    const prov = provs.find((x) => x.code === p.province_code);
    const n = a?.n ?? 0;
    out.set(p.provider_id, {
      year: LATEST_YEAR,
      claims: n,
      small_sample: n < SMALL_SAMPLE_CLAIMS,
      cost_ratio: a && a.ref > 0 ? a.amount / a.ref : null,
      los_ratio: a && a.losRef > 0 ? a.los / a.losRef : null,
      class_mix: Object.fromEntries(Object.entries(a?.classes ?? {}).map(([k, v]) => [k, n ? v / n : 0])),
      province: prov
        ? {
            name: prov.name,
            participants: prov.participants,
            fkrtl_count: prov.fkrtl_count,
            fkrtl_per_100k: prov.fkrtl_per_100k,
            fkrtl_per_100k_national_mean: Number(meanFkrtlRatio.toFixed(2)),
            admission_rate_per_10k: prov.admission_rate_per_10k,
            cost_per_admission: prov.cost_per_admission,
            cost_index: prov.cost_index,
          }
        : null,
    });
  }
  return out;
}

export const NATIONAL_COST_PER_ADMISSION = NATIONAL.biaya_per_admisi_ritl.total[LATEST_YEAR];

/**
 * Posisi tiap provinsi terhadap statistik BPJS: pangsa klaim di data ini dibanding pangsa admisi nasional (seberapa
 * mewakili dataset), serta rasio biaya terhadap rerata nasional untuk campuran kelas yang sama.
 */
export function computeProvinceNational(store: { claims: CanonicalClaim[] }): Map<string, import("@/types/risk").ProvinceNational> {
  const refs = provinceReference(LATEST_YEAR);
  const totalAdm = refs.reduce((s, r) => s + r.admissions_est, 0) || 1;
  const acc = new Map<string, { n: number; amount: number; ref: number }>();
  for (const c of store.claims) {
    const code = c.provider.province_code;
    const ctx = nationalContext(c);
    const a = acc.get(code) || { n: 0, amount: 0, ref: 0 };
    a.n++;
    if (ctx.cost_ref > 0) {
      a.amount += c.claim_amount;
      a.ref += ctx.cost_ref;
    }
    acc.set(code, a);
  }
  const total = store.claims.length || 1;
  const out = new Map<string, import("@/types/risk").ProvinceNational>();
  for (const r of refs) {
    const a = acc.get(r.code);
    out.set(r.code, {
      participants: r.participants,
      admission_rate_per_10k: r.admission_rate_per_10k,
      admissions_est: r.admissions_est,
      cost_per_admission: r.cost_per_admission,
      cost_index: Number(r.cost_index.toFixed(3)),
      fkrtl_count: r.fkrtl_count,
      fkrtl_per_100k: r.fkrtl_per_100k,
      dataset_share: (a?.n ?? 0) / total,
      national_share: r.admissions_est / totalAdm,
      cost_ratio: a && a.ref > 0 ? Number((a.amount / a.ref).toFixed(3)) : null,
      small_sample: (a?.n ?? 0) < SMALL_SAMPLE_CLAIMS,
    });
  }
  return out;
}
