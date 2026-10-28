/**
 * Verifikasi INDEPENDEN: membaca ulang berkas xlsx di Sample/ dengan logika terpisah dari build-bpjs-reference.ts
 * lalu membandingkannya dengan lib/data/bpjs-national.json. Keluar dengan kode 1 bila ada selisih.
 *
 *   npx tsx scripts/verify-bpjs-reference.ts
 */
import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { INDONESIA_PROVINCES } from "../lib/data/indonesia-provinces";

const SAMPLE = path.resolve(__dirname, "../Sample");
const ref = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../lib/data/bpjs-national.json"), "utf8"));
const YEARS = ["2014", "2015", "2016", "2017", "2018"];
const norm = (s: unknown) => String(s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const PROV = new Map(INDONESIA_PROVINCES.map((p) => [norm(p.name), p.code]));

function raw(prefix: string): unknown[][] {
  const f = fs.readdirSync(SAMPLE).find((x) => x.startsWith(`${prefix}_`) && x.endsWith(".xlsx"));
  if (!f) throw new Error(`Sample/${prefix}_* tidak ada`);
  const wb = XLSX.readFile(path.join(SAMPLE, f));
  return XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: null });
}

let checks = 0;
const problems: string[] = [];
function eq(label: string, got: unknown, want: unknown, tol?: number) {
  checks++;
  const a = Number(got);
  const b = Number(want);
  // pembulatan di json: 0 desimal untuk nilai besar (rupiah, jumlah), 2 desimal untuk angka kecil
  const t = tol ?? (Math.abs(b) >= 1000 ? 0.51 : 0.011);
  if (!Number.isFinite(a) || !Number.isFinite(b) || Math.abs(a - b) > t) problems.push(`${label}: json=${got} xlsx=${want}`);
}

/** Tabel provinsi: baris berlabel nama provinsi, 5 angka tahun pertama setelahnya. */
function checkProvince(prefix: string, block: Record<string, Record<string, number>>, name: string) {
  const rows = raw(prefix);
  const seen = new Set<string>();
  for (const r of rows) {
    const code = PROV.get(norm(r[0]));
    if (!code) continue;
    const nums = r.slice(1).filter((v) => typeof v === "number") as number[];
    if (nums.length < 5) continue;
    seen.add(code);
    YEARS.forEach((y, i) => eq(`${name} ${code} ${y}`, block?.[code]?.[y], nums[i]));
  }
  checks++;
  if (seen.size !== 34) problems.push(`${name}: ${seen.size} provinsi terbaca di xlsx (harus 34)`);
  checks++;
  const missing = Object.keys(block || {}).filter((c) => !seen.has(c));
  if (missing.length) problems.push(`${name}: ada di json tapi tidak di xlsx: ${missing.join(",")}`);
}

/** Top-100 penyakit: nomor, kode, jumlah, dan peserta tiap baris. */
function checkTop(prefix: string, items: Array<Record<string, number | string>>, name: string, countKey: string) {
  const rows = raw(prefix).filter((r) => typeof r[0] === "number" && r[1]);
  checks++;
  if (rows.length !== items.length) problems.push(`${name}: ${items.length} baris di json vs ${rows.length} di xlsx`);
  rows.forEach((r, i) => {
    const it = items[i];
    if (!it) return;
    checks++;
    if (String(it.code) !== String(r[1]).trim()) problems.push(`${name} #${r[0]}: kode json=${it.code} xlsx=${r[1]}`);
    eq(`${name} #${r[0]} ${countKey}`, it[countKey], r[3], 0.5);
    eq(`${name} #${r[0]} peserta`, it.participants, r[4], 0.5);
  });
}

try {
  checkProvince("66", ref.biaya_per_admisi_ritl.by_province, "biaya/admisi RITL");
  checkProvince("23", ref.biaya_per_kunjungan_rjtl_by_province, "biaya/kunjungan RJTL");
  checkProvince("27", ref.angka_admisi_ritl_per_10k.by_province, "angka admisi RITL");
  checkProvince("32", ref.angka_kunjungan_rjtl_per_10k_by_province, "angka kunjungan RJTL");
  checkProvince("57", ref.peserta.by_province, "peserta JKN");
  checkProvince("61", ref.fkrtl.jumlah_by_province, "FKRTL");
  checkProvince("62", ref.fkrtl.rasio_per_100k_by_province, "rasio FKRTL");

  for (const [y, prefix] of [["2014", "16"], ["2015", "12"], ["2016", "08"], ["2017", "05"], ["2018", "01"]] as const) checkTop(prefix, ref.top_diagnoses_ritl[y], `top RITL ${y}`, "admisi");
  checkTop("02", ref.top_diagnoses_rjtl_2018, "top RJTL 2018", "kunjungan");
  checkTop("03", ref.top_diagnoses_ritp_2018, "top RITP 2018", "admisi");
  checkTop("04", ref.top_diagnoses_rjtp_2018, "top RJTP 2018", "kunjungan");

  // Tabel kelas rawat: label kelas (1/2/3) + total
  const classCheck = (prefix: string, block: Record<string, Record<string, number>>, name: string) => {
    for (const r of raw(prefix)) {
      const label = String(r[0] ?? "").trim();
      if (!/^[123]$/.test(label)) continue;
      const nums = r.slice(1).filter((v) => typeof v === "number") as number[];
      if (nums.length < 5) continue;
      YEARS.forEach((y, i) => eq(`${name} kelas ${label} ${y}`, block?.[label]?.[y], nums[i]));
    }
  };
  classCheck("22", ref.biaya_per_admisi_ritl.by_class, "biaya/admisi kelas");
  // Lama rawat (hari) = angka hari rawat (berkas 30) / angka admisi (berkas 31), keduanya per 10.000 peserta
  {
    const nums = (prefix: string) => {
      const out: Record<string, number[]> = {};
      for (const r of raw(prefix)) {
        const label = String(r[0] ?? "").trim().toLowerCase();
        if (!/^([123]|total)$/.test(label)) continue;
        const n = r.slice(1).filter((v) => typeof v === "number") as number[];
        if (n.length >= 5) out[label] = n;
      }
      return out;
    };
    const days = nums("30");
    const adm = nums("31");
    for (const k of ["1", "2", "3", "total"]) {
      YEARS.forEach((y, i) => eq(`lama rawat ${k} ${y}`, k === "total" ? ref.lama_rawat_ritl.total?.[y] : ref.lama_rawat_ritl.by_class?.[k]?.[y], days[k]?.[i] / adm[k]?.[i], 0.011));
    }
  }
  classCheck("31", ref.angka_admisi_ritl_per_10k.by_class, "admisi kelas");
  classCheck("55", ref.peserta.by_class, "peserta kelas");
  classCheck("25", ref.biaya_per_kunjungan_rjtl.by_class, "biaya RJTL kelas");

  // Faskes primer (jumlah + rasio per 100 ribu peserta)
  checkProvince("59", ref.faskes_primer.puskesmas.jumlah_by_province, "puskesmas");
  checkProvince("60", ref.faskes_primer.puskesmas.rasio_per_100k_by_province, "rasio puskesmas");
  checkProvince("56", ref.faskes_primer.klinik_pratama.jumlah_by_province, "klinik pratama");
  checkProvince("63", ref.faskes_primer.klinik_pratama.rasio_per_100k_by_province, "rasio klinik pratama");
  checkProvince("64", ref.faskes_primer.dokter_praktik.jumlah_by_province, "dokter praktik");
  checkProvince("65", ref.faskes_primer.dokter_praktik.rasio_per_100k_by_province, "rasio dokter praktik");

  // Segmen peserta + total peserta (baris Total)
  for (const r of raw("58")) {
    const label = String(r[0] ?? "").trim();
    const n = r.slice(1).filter((v) => typeof v === "number") as number[];
    if (n.length < 5 || !label) continue;
    if (/^total$/i.test(label)) YEARS.forEach((y, i) => eq(`peserta total ${y}`, ref.peserta.total?.[y], n[i], 0.5));
    else if (ref.peserta.by_segment[label]) YEARS.forEach((y, i) => eq(`segmen ${label} ${y}`, ref.peserta.by_segment[label][y], n[i], 0.5));
  }

  // Hasil terapi (outcome): proporsi per kelas + total N
  const keys = ["meninggal", "pulang_paksa", "rujuk", "sehat", "tidak_tahu"];
  const outcomeCheck = (prefix: string, block: { by_class: Record<string, Record<string, number>>; total_n?: Record<string, number> }, name: string) => {
    for (const r of raw(prefix)) {
      if (typeof r[0] === "number" && r[1] === "%") keys.forEach((k, i) => eq(`${name} kelas ${r[0]} ${k}`, block.by_class?.[String(r[0])]?.[k], r[i + 2], 0.0001));
      if (r[0] === "Seluruh Kelas" && r[1] === "N") {
        keys.forEach((k, i) => eq(`${name} total ${k}`, block.total_n?.[k], r[i + 2], 0.5));
        eq(`${name} total semua`, block.total_n?.total, r[7], 0.5);
      }
    }
  };
  outcomeCheck("72", ref.outcome_ritl["2014"], "outcome RITL 2014");
  outcomeCheck("73", ref.outcome_ritl["2015"], "outcome RITL 2015");
  outcomeCheck("74", ref.outcome_ritl["2016"], "outcome RITL 2016");
  outcomeCheck("75", ref.outcome_ritl["2017"], "outcome RITL 2017");
  outcomeCheck("20", ref.outcome_ritl["2018"], "outcome RITL 2018");
  [["67", "2014"], ["68", "2015"], ["69", "2016"], ["70", "2017"], ["71", "2018"]].forEach(([p, y]) => outcomeCheck(p, ref.outcome_rjtl[y], `outcome RJTL ${y}`));

  // Usia x jenis kelamin (3 kolom L,P,T per tahun)
  const ageCheck = (prefix: string, block: { bands: Array<{ age: string; values: Record<string, { L: number; P: number; T: number }> }>; total?: Record<string, { L: number; P: number; T: number }> }, name: string) => {
    for (const r of raw(prefix)) {
      const label = String(r[0] ?? "").trim();
      const n = r.slice(1).filter((v) => typeof v === "number") as number[];
      if (!label || n.length < 15) continue;
      const row = /^total$/i.test(label) ? undefined : block.bands.find((b) => b.age === label);
      const got = /^total$/i.test(label) ? block.total : row?.values;
      YEARS.forEach((y, i) => {
        (["L", "P", "T"] as const).forEach((g, j) => eq(`${name} ${label} ${y} ${g}`, got?.[y]?.[g], n[i * 3 + j], 0.51));
      });
    }
  };
  ageCheck("21", ref.biaya_per_admisi_ritl.by_age_sex, "biaya/admisi usia-JK");
  ageCheck("29", ref.angka_admisi_ritl_usia_jk_per_10k, "admisi usia-JK");
  ageCheck("24", ref.biaya_per_kunjungan_rjtl.by_age_sex, "biaya RJTL usia-JK");
} catch (e) {
  problems.push(`galat: ${(e as Error).message}`);
}

console.log(`${checks} pemeriksaan, ${problems.length} selisih.`);
problems.slice(0, 40).forEach((p) => console.log("  -", p));
process.exit(problems.length ? 1 : 0);
