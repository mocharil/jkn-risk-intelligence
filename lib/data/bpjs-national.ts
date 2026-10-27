import raw from "./bpjs-national.json";
import type { NationalContext } from "@/types/claim";
import { INDONESIA_PROVINCES } from "./indonesia-provinces";

/**
 * Acuan nasional dari statistik resmi Portal Data BPJS Kesehatan (2014-2018), dibangun oleh
 * scripts/build-bpjs-reference.ts dari folder Sample/. Data AGREGAT, bukan klaim per orang:
 * dipakai sebagai benchmark kewajaran dan kalibrasi, tidak untuk menyimpulkan kecurangan.
 */

type YearMap = Record<string, number>;
type DxRow = { rank: number; code: string; description: string; admisi: number; participants: number };

interface NationalJson {
  meta: { sumber: string; url: string; cakupan: string; tahun: string[]; sumber_berkas: Record<string, string> };
  top_diagnoses_ritl: Record<string, DxRow[]>;
  top_diagnoses_rjtl_2018: Array<{ rank: number; code: string; description: string; kunjungan: number; participants: number }>;
  biaya_per_admisi_ritl: {
    by_class: Record<string, YearMap>;
    total: YearMap;
    by_province: Record<string, YearMap>;
    by_age_sex: { bands: Array<{ age: string; values: Record<string, { L: number; P: number; T: number }> }>; total: Record<string, { L: number; P: number; T: number }> };
  };
  biaya_per_kunjungan_rjtl_by_province: Record<string, YearMap>;
  lama_rawat_ritl: { by_class: Record<string, YearMap>; total: YearMap; catatan: string };
  angka_admisi_ritl_per_10k: { by_class: Record<string, YearMap>; total: YearMap; by_province: Record<string, YearMap> };
  peserta: { by_class: Record<string, YearMap>; total: YearMap; by_province: Record<string, YearMap>; by_segment: Record<string, YearMap> };
  fkrtl: { jumlah_by_province: Record<string, YearMap>; rasio_per_100k_by_province: Record<string, YearMap> };
  outcome_ritl: Record<
    string,
    {
      by_class: Record<string, Record<string, number>>;
      total_n?: { meninggal: number; pulang_paksa: number; rujuk: number; sehat: number; tidak_tahu: number; total: number };
      total_pct?: Record<string, number>;
    }
  >;
  outcome_rjtl: NationalJson["outcome_ritl"];
  top_diagnoses_ritp_2018: Array<{ rank: number; code: string; description: string; admisi: number; participants: number }>;
  top_diagnoses_rjtp_2018: Array<{ rank: number; code: string; description: string; kunjungan: number; participants: number }>;
  angka_admisi_ritl_usia_jk_per_10k: { bands: Array<{ age: string; values: Record<string, { L: number; P: number; T: number }> }>; total: Record<string, { L: number; P: number; T: number }> };
  biaya_per_kunjungan_rjtl: { by_class: Record<string, YearMap>; total: YearMap; by_age_sex: { bands: Array<{ age: string; values: Record<string, { L: number; P: number; T: number }> }>; total: Record<string, { L: number; P: number; T: number }> } };
  angka_kunjungan_rjtl_per_10k_by_province: Record<string, YearMap>;
  faskes_primer: Record<"puskesmas" | "klinik_pratama" | "dokter_praktik", { jumlah_by_province: Record<string, YearMap>; rasio_per_100k_by_province: Record<string, YearMap> }>;
}

/**
 * Distribusi usia & jenis kelamin pasien rawat inap, diturunkan dari angka admisi RITL per 10.000 peserta
 * per pita usia x JK (Sample/29). Pembobot pita = angka admisi x lebar pita (asumsi: peserta tersebar merata per
 * tahun usia di dalam pita, karena berkas peserta menurut usia tidak tersedia di Sample).
 */
export function ageSexAdmissionWeights(year: string = "2018"): { age_lo: number; age_hi: number; gender: "L" | "P"; w: number }[] {
  const out: { age_lo: number; age_hi: number; gender: "L" | "P"; w: number }[] = [];
  for (const b of NATIONAL.angka_admisi_ritl_usia_jk_per_10k.bands) {
    const m = /^(\d+)(?:-(\d+)|\+)$/.exec(b.age.trim());
    if (!m) continue;
    const lo = Number(m[1]);
    const hi = m[2] ? Number(m[2]) : 85;
    const width = hi - lo + 1;
    const v = b.values[year];
    out.push({ age_lo: lo, age_hi: hi, gender: "L", w: v.L * width });
    out.push({ age_lo: lo, age_hi: hi, gender: "P", w: v.P * width });
  }
  return out;
}

/** Pilih (usia, jenis kelamin) dari distribusi Sample/29 memakai SATU angka acak u dalam [0,1) dan satu angka acak untuk usia dalam pita. */
export function sampleAgeSex(u: number, u2: number, year: string = "2018"): { age: number; gender: "L" | "P" } {
  const ws = ageSexAdmissionWeights(year);
  const sum = ws.reduce((a, x) => a + x.w, 0);
  let r = u * sum;
  for (const x of ws) {
    r -= x.w;
    if (r < 0) return { age: Math.min(90, x.age_lo + Math.floor(u2 * (x.age_hi - x.age_lo + 1))), gender: x.gender };
  }
  const last = ws[ws.length - 1];
  return { age: last.age_hi, gender: last.gender };
}

export const NATIONAL = raw as unknown as NationalJson;
export const LATEST_YEAR = "2018";
export const NATIONAL_YEARS = NATIONAL.meta.tahun;

export const SOURCE = { name: NATIONAL.meta.sumber, url: NATIONAL.meta.url, scope: NATIONAL.meta.cakupan };

/** "A09.9" -> "A099"; "k35.8" -> "K358". Kode ICD pada berkas BPJS ditulis tanpa titik. */
export function icdKey(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export interface DiagnosisAggregate {
  code: string;
  description: string;
  admisi: Record<string, number>;
  rank_2018?: number;
}

/** Gabungkan baris duplikat per kode (berkas BPJS memuat beberapa varian ejaan untuk kode yang sama). */
export function topDiagnoses(year: string = LATEST_YEAR): DiagnosisAggregate[] {
  const rows = NATIONAL.top_diagnoses_ritl[year] || [];
  const map = new Map<string, DiagnosisAggregate>();
  for (const r of rows) {
    const cur = map.get(r.code);
    if (cur) cur.admisi[year] = (cur.admisi[year] || 0) + r.admisi;
    else map.set(r.code, { code: r.code, description: r.description, admisi: { [year]: r.admisi }, rank_2018: year === LATEST_YEAR ? r.rank : undefined });
  }
  return Array.from(map.values()).sort((a, b) => b.admisi[year] - a.admisi[year]);
}

/** Tren admisi per kode untuk semua tahun yang tersedia (gabungan duplikat). */
export function diagnosisTrend(limit = 15): DiagnosisAggregate[] {
  const base = topDiagnoses(LATEST_YEAR).slice(0, limit);
  return base.map((d) => {
    const admisi: Record<string, number> = {};
    for (const y of NATIONAL_YEARS) admisi[y] = topDiagnoses(y).find((x) => x.code === d.code)?.admisi[y] ?? 0;
    return { ...d, admisi };
  });
}

/** Total admisi RITL tahun tertentu (dari tabel outcome, seluruh kelas). */
export function totalAdmissions(year: string = LATEST_YEAR): number {
  return NATIONAL.outcome_ritl[year]?.total_n?.total ?? 0;
}

/** Jumlah admisi RITL nasional untuk semua kode ICD yang diawali prefiks (mis. "A09" -> A090 + A099) pada daftar 100 teratas. */
export function admissionsForIcdPrefix(prefix: string, year: string = LATEST_YEAR): number {
  const p = icdKey(prefix);
  return topDiagnoses(year)
    .filter((d) => d.code.startsWith(p))
    .reduce((a, d) => a + (d.admisi[year] || 0), 0);
}

export const CLASS_KEYS = ["1", "2", "3"] as const;

export function costPerAdmission(year: string = LATEST_YEAR) {
  const c = NATIONAL.biaya_per_admisi_ritl;
  return {
    total: c.total[year],
    by_class: Object.fromEntries(CLASS_KEYS.map((k) => [k, c.by_class[k][year]])) as Record<string, number>,
  };
}

/** Faktor biaya kelas terhadap rata-rata nasional (kelas 1 > 1, kelas 3 < 1). */
export function classCostFactor(year: string = LATEST_YEAR): Record<string, number> {
  const { total, by_class } = costPerAdmission(year);
  return Object.fromEntries(CLASS_KEYS.map((k) => [k, by_class[k] / total]));
}

/** Pangsa admisi RITL per kelas = peserta x angka admisi (per 10.000). */
export function classAdmissionShare(year: string = LATEST_YEAR): Record<string, number> {
  const parts = NATIONAL.peserta.by_class;
  const rate = NATIONAL.angka_admisi_ritl_per_10k.by_class;
  const raw = CLASS_KEYS.map((k) => (parts[k][year] * rate[k][year]) / 10_000);
  const sum = raw.reduce((a, b) => a + b, 0);
  return Object.fromEntries(CLASS_KEYS.map((k, i) => [k, raw[i] / sum]));
}

export interface ProvinceReference {
  code: string;
  name: string;
  participants: number;
  admission_rate_per_10k: number;
  admissions_est: number;
  cost_per_admission: number;
  cost_index: number; // terhadap rata-rata nasional
  fkrtl_count: number;
  fkrtl_per_100k: number;
}

export function provinceReference(year: string = LATEST_YEAR): ProvinceReference[] {
  const nat = NATIONAL.biaya_per_admisi_ritl.total[year];
  return INDONESIA_PROVINCES.map((p) => {
    const participants = NATIONAL.peserta.by_province[p.code]?.[year] ?? 0;
    const rate = NATIONAL.angka_admisi_ritl_per_10k.by_province[p.code]?.[year] ?? 0;
    const cost = NATIONAL.biaya_per_admisi_ritl.by_province[p.code]?.[year] ?? 0;
    return {
      code: p.code,
      name: p.name,
      participants,
      admission_rate_per_10k: rate,
      admissions_est: Math.round((participants * rate) / 10_000),
      cost_per_admission: cost,
      cost_index: nat ? cost / nat : 0,
      fkrtl_count: NATIONAL.fkrtl.jumlah_by_province[p.code]?.[year] ?? 0,
      fkrtl_per_100k: NATIONAL.fkrtl.rasio_per_100k_by_province[p.code]?.[year] ?? 0,
    };
  });
}

/** Rerata biaya per admisi menurut usia & jenis kelamin; dikembalikan sebagai pita usia. */
export function costByAgeSex(year: string = LATEST_YEAR) {
  return NATIONAL.biaya_per_admisi_ritl.by_age_sex.bands.map((b) => ({ age: b.age, L: b.values[year].L, P: b.values[year].P, T: b.values[year].T }));
}

export function losByClass(year: string = LATEST_YEAR) {
  return {
    total: NATIONAL.lama_rawat_ritl.total[year],
    by_class: Object.fromEntries(CLASS_KEYS.map((k) => [k, NATIONAL.lama_rawat_ritl.by_class[k][year]])) as Record<string, number>,
  };
}

export function outcomes(year: string = LATEST_YEAR) {
  const o = NATIONAL.outcome_ritl[year];
  return { total: o.total_n!, pct: o.total_pct!, by_class: o.by_class };
}

const dxCache = new Map<string, DiagnosisAggregate[]>();
function cachedTopDiagnoses(year: string): DiagnosisAggregate[] {
  let v = dxCache.get(year);
  if (!v) {
    v = topDiagnoses(year);
    dxCache.set(year, v);
  }
  return v;
}

let rjtlCache: { code: string; description: string; kunjungan: number }[] | null = null;
function topRjtl() {
  if (!rjtlCache) {
    const map = new Map<string, { code: string; description: string; kunjungan: number }>();
    for (const r of NATIONAL.top_diagnoses_rjtl_2018) {
      const cur = map.get(r.code);
      if (cur) cur.kunjungan += r.kunjungan;
      else map.set(r.code, { code: r.code, description: r.description, kunjungan: r.kunjungan });
    }
    rjtlCache = Array.from(map.values()).sort((a, b) => b.kunjungan - a.kunjungan);
  }
  return rjtlCache;
}

let icdNames: Map<string, string> | null = null;
/** Nama resmi ICD-10 (bahasa Inggris, dari daftar penyakit terbanyak BPJS) untuk kode berformat apa pun ("A09.9", "A099"). */
export function icdDescription(code: string): string | undefined {
  if (!icdNames) {
    icdNames = new Map();
    for (const y of NATIONAL_YEARS.slice().reverse()) for (const d of cachedTopDiagnoses(y)) if (!icdNames.has(d.code)) icdNames.set(d.code, d.description);
    for (const d of topRjtl()) if (!icdNames.has(d.code)) icdNames.set(d.code, d.description);
  }
  const key = icdKey(code);
  if (icdNames.has(key)) return icdNames.get(key);
  // kode 3 digit ("K35") -> varian terbanyak berawalan sama
  if (key.length === 3) for (const [k, v] of Array.from(icdNames.entries())) if (k.startsWith(key)) return v;
  return undefined;
}

interface ContextClaim {
  claim_amount: number;
  service: { treatment_class: string; length_of_stay: number };
  provider: { province_code: string };
  diagnoses: { code: string; is_primary?: boolean }[];
}

/**
 * Posisi klaim terhadap statistik resmi BPJS 2018: biaya terhadap rerata per admisi (menurut kelas) atau per kunjungan
 * (rawat jalan, menurut provinsi), lama rawat terhadap rerata kelas, dan peringkat diagnosis di daftar 100 teratas nasional.
 */
export function nationalContext(c: ContextClaim, year: string = LATEST_YEAR): NationalContext {
  const cls = c.service.treatment_class;
  const classKey = /^KELAS_([123])$/.exec(cls)?.[1];
  const prov = INDONESIA_PROVINCES.find((p) => p.code === c.provider.province_code);
  const dxCode = icdKey((c.diagnoses.find((d) => d.is_primary) || c.diagnoses[0])?.code || "");
  const outpatient = cls === "RAWAT_JALAN";

  let ctx: NationalContext;
  if (outpatient) {
    const ref = NATIONAL.biaya_per_kunjungan_rjtl_by_province[c.provider.province_code]?.[year] ?? 0;
    ctx = { year, level: "JALAN", class_label: "Rawat jalan", cost_ref: ref, cost_ratio: ref ? c.claim_amount / ref : null, province_name: prov?.name };
  } else {
    const costs = costPerAdmission(year);
    const ref = classKey ? costs.by_class[classKey] : costs.total;
    const provCost = NATIONAL.biaya_per_admisi_ritl.by_province[c.provider.province_code]?.[year];
    const losRef = classKey ? losByClass(year).by_class[classKey] : losByClass(year).total;
    ctx = {
      year,
      level: "INAP",
      class_label: classKey ? `Kelas ${classKey}` : "Seluruh kelas",
      cost_ref: ref,
      cost_ratio: c.claim_amount / ref,
      province_name: prov?.name,
      province_cost: provCost,
      province_ratio: provCost ? c.claim_amount / provCost : undefined,
      los_ref: losRef,
      los_ratio: losRef ? c.service.length_of_stay / losRef : undefined,
    };
  }

  if (dxCode) {
    if (outpatient) {
      const list = topRjtl();
      const idx = list.findIndex((d) => d.code.startsWith(dxCode));
      if (idx >= 0) ctx.dx = { code: list[idx].code, description: list[idx].description, rank: idx + 1, admissions: list[idx].kunjungan };
    } else {
      const list = cachedTopDiagnoses(year);
      const idx = list.findIndex((d) => d.code.startsWith(dxCode));
      if (idx >= 0) {
        const adm = admissionsForIcdPrefix(dxCode, year);
        ctx.dx = { code: list[idx].code, description: list[idx].description, rank: idx + 1, admissions: adm, share_pct: totalAdmissions(year) ? (adm / totalAdmissions(year)) * 100 : undefined };
      }
    }
  }
  return ctx;
}

/** Indeks biaya per admisi provinsi terhadap rerata nasional (BPJS RITL, tahun terbaru). */
export function provinceCostIndex(code: string, year: string = LATEST_YEAR): number {
  const nat = NATIONAL.biaya_per_admisi_ritl.total[year];
  const v = NATIONAL.biaya_per_admisi_ritl.by_province[code]?.[year];
  return nat && v ? v / nat : 1;
}
