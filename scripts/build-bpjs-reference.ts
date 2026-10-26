/**
 * Membangun lib/data/bpjs-national.json dari berkas statistik resmi Portal Data BPJS Kesehatan
 * (https://data.bpjs-kesehatan.go.id/) yang disimpan di folder Sample/.
 *
 *   npx tsx scripts/build-bpjs-reference.ts
 *
 * Data bersifat AGREGAT nasional 2014-2018 (bukan klaim per orang). Dipakai sebagai acuan/benchmark,
 * bukan sebagai pengganti data klaim. Setiap blok mencantumkan berkas sumbernya.
 */
import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { INDONESIA_PROVINCES } from "../lib/data/indonesia-provinces";

const SAMPLE_DIR = path.resolve(__dirname, "../Sample");
const OUT = path.resolve(__dirname, "../lib/data/bpjs-national.json");
const YEARS = ["2014", "2015", "2016", "2017", "2018"] as const;

type Row = (string | number | null)[];

function fileByPrefix(prefix: string): string {
  const f = fs.readdirSync(SAMPLE_DIR).find((x) => x.startsWith(`${prefix}_`) && x.endsWith(".xlsx"));
  if (!f) throw new Error(`Berkas Sample/${prefix}_*.xlsx tidak ditemukan`);
  return f;
}

function rowsOf(prefix: string): { file: string; rows: Row[] } {
  const file = fileByPrefix(prefix);
  const wb = XLSX.readFile(path.join(SAMPLE_DIR, file));
  return { file, rows: XLSX.utils.sheet_to_json<Row>(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: null }) };
}

const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
const PROV_BY_NAME = new Map(INDONESIA_PROVINCES.map((p) => [norm(p.name), p.code]));

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Tabel "label | 2014..2018" (judul kolom tahun berada di baris mana pun dalam 6 baris awal). */
function yearTable(rows: Row[]): { label: string; values: Record<string, number> }[] {
  const hdr = rows.findIndex((r, i) => i < 8 && YEARS.every((y, k) => Number(r[k + 1]) === Number(y)));
  if (hdr < 0) throw new Error("Baris tahun tidak ditemukan");
  const out: { label: string; values: Record<string, number> }[] = [];
  for (const r of rows.slice(hdr + 1)) {
    if (r[0] === null || r[0] === undefined || String(r[0]).trim() === "") continue;
    const values: Record<string, number> = {};
    let ok = true;
    YEARS.forEach((y, k) => {
      const v = r[k + 1];
      if (isNum(v)) values[y] = v;
      else ok = false;
    });
    if (ok) out.push({ label: String(r[0]).trim(), values });
  }
  return out;
}

const unmatched = new Set<string>();
function byProvince(prefix: string, digits = 2): { file: string; data: Record<string, Record<string, number>>; national?: Record<string, number> } {
  const { file, rows } = rowsOf(prefix);
  const data: Record<string, Record<string, number>> = {};
  let national: Record<string, number> | undefined;
  for (const t of yearTable(rows)) {
    const vals = Object.fromEntries(Object.entries(t.values).map(([y, v]) => [y, round(v, digits)]));
    if (/^(total|nasional)$/i.test(t.label)) {
      national = vals;
      continue;
    }
    const code = PROV_BY_NAME.get(norm(t.label));
    if (!code) {
      unmatched.add(`${file}: ${t.label}`);
      continue;
    }
    data[code] = vals;
  }
  return { file, data, national };
}

function byClass(prefix: string, digits = 2): { file: string; data: Record<string, Record<string, number>>; total?: Record<string, number> } {
  const { file, rows } = rowsOf(prefix);
  const data: Record<string, Record<string, number>> = {};
  let total: Record<string, number> | undefined;
  for (const t of yearTable(rows)) {
    const vals = Object.fromEntries(Object.entries(t.values).map(([y, v]) => [y, round(v, digits)]));
    if (/^total$/i.test(t.label)) total = vals;
    else data[t.label] = vals;
  }
  return { file, data, total };
}

function topDiseases(prefix: string, countLabel: "admisi" | "kunjungan") {
  const { file, rows } = rowsOf(prefix);
  const hdr = rows.findIndex((r) => String(r[0]).trim() === "NO.");
  if (hdr < 0) throw new Error(`${file}: header NO. tidak ditemukan`);
  const items = rows
    .slice(hdr + 1)
    .filter((r) => isNum(r[0]) && r[1])
    .map((r) => ({ rank: r[0] as number, code: String(r[1]).trim(), description: String(r[2]).replace(/\s+/g, " ").trim(), [countLabel]: Number(r[3]), participants: Number(r[4]) }));
  return { file, items };
}

function outcomes(prefix: string) {
  const { file, rows } = rowsOf(prefix);
  const keys = ["meninggal", "pulang_paksa", "rujuk", "sehat", "tidak_tahu"] as const;
  const by_class: Record<string, Record<string, number>> = {};
  let total_n: Record<string, number> | undefined;
  let total_pct: Record<string, number> | undefined;
  for (const r of rows.slice(3)) {
    const label = r[0];
    const kind = r[1];
    const vals = keys.map((_, i) => Number(r[i + 2]));
    const rec = Object.fromEntries(keys.map((k, i) => [k, vals[i]]));
    if (isNum(label) && kind === "%") by_class[String(label)] = Object.fromEntries(keys.map((k, i) => [k, round(vals[i], 4)]));
    else if (label === "Seluruh Kelas" && kind === "N") total_n = { ...rec, total: Number(r[7]) };
    else if (label === null && kind === "%") total_pct = Object.fromEntries(keys.map((k, i) => [k, round(vals[i], 4)]));
  }
  return { file, by_class, total_n, total_pct };
}

function ageSex(prefix: string) {
  const { file, rows } = rowsOf(prefix);
  // baris 2: tahun di kolom 1,4,7,10,13; baris 3: L,P,T
  const yearCols = YEARS.map((y) => rows[2].findIndex((c) => Number(c) === Number(y)));
  if (yearCols.some((c) => c < 0)) throw new Error(`${file}: kolom tahun tidak lengkap`);
  const bands: { age: string; values: Record<string, { L: number; P: number; T: number }> }[] = [];
  let total: Record<string, { L: number; P: number; T: number }> | undefined;
  for (const r of rows.slice(4)) {
    if (!r[0]) continue;
    const values: Record<string, { L: number; P: number; T: number }> = {};
    YEARS.forEach((y, i) => {
      const c = yearCols[i];
      values[y] = { L: round(Number(r[c]), 0), P: round(Number(r[c + 1]), 0), T: round(Number(r[c + 2]), 0) };
    });
    if (String(r[0]).toLowerCase() === "total") total = values;
    else bands.push({ age: String(r[0]), values });
  }
  return { file, bands, total };
}

function main() {
  // --- Diagnosis terbanyak ---
  const ritlFiles: Record<string, string> = { "2018": "01", "2017": "05", "2016": "08", "2015": "12", "2014": "16" };
  const top_diagnoses_ritl: Record<string, ReturnType<typeof topDiseases>["items"]> = {};
  const sources: Record<string, string> = {};
  for (const [y, p] of Object.entries(ritlFiles)) {
    const t = topDiseases(p, "admisi");
    top_diagnoses_ritl[y] = t.items;
    sources[`top_diagnoses_ritl.${y}`] = t.file;
  }
  const rjtl = topDiseases("02", "kunjungan");
  const ritp = topDiseases("03", "admisi");
  const rjtp = topDiseases("04", "kunjungan");
  const admAgeSex = ageSex("29");
  const costRjtlAgeSex = ageSex("24");
  const costRjtlClass = byClass("25", 0);
  const kunjRjtlProv = byProvince("32", 2);
  const puskesmas = byProvince("59", 0);
  const puskesmasRatio = byProvince("60", 2);
  const klinik = byProvince("56", 0);
  const klinikRatio = byProvince("63", 2);
  const dokter = byProvince("64", 0);
  const dokterRatio = byProvince("65", 2);
  const outRjtlFiles: Record<string, string> = { "2018": "71", "2017": "70", "2016": "69", "2015": "68", "2014": "67" };
  const outcomes_rjtl: Record<string, ReturnType<typeof outcomes>> = {};
  for (const [y, p] of Object.entries(outRjtlFiles)) outcomes_rjtl[y] = outcomes(p);
  sources["top_diagnoses_rjtl.2018"] = rjtl.file;

  // --- Biaya klaim per admisi RITL ---
  const costClass = byClass("22", 0);
  const costProv = byProvince("66", 0);
  const costAgeSex = ageSex("21");
  const costRjtlProv = byProvince("23", 0);

  // --- Lama rawat & admisi (per 10.000 peserta) → rerata lama rawat RITL = hari rawat / admisi ---
  const daysClass = byClass("30");
  const admClass = byClass("31");
  const admProv = byProvince("27");
  const los_by_class: Record<string, Record<string, number>> = {};
  for (const c of Object.keys(daysClass.data)) {
    los_by_class[c] = Object.fromEntries(YEARS.map((y) => [y, round(daysClass.data[c][y] / admClass.data[c][y], 2)]));
  }
  const los_total = Object.fromEntries(YEARS.map((y) => [y, round(daysClass.total![y] / admClass.total![y], 2)]));

  // --- Peserta & faskes ---
  const partClass = byClass("55", 0);
  const partProv = byProvince("57", 0);
  const partSeg = byClass("58", 0);
  const fkrtl = byProvince("61", 0);
  const fkrtlRatio = byProvince("62", 2);

  // --- Outcome RITL ---
  const outFiles: Record<string, string> = { "2018": "20", "2017": "75", "2016": "74", "2015": "73", "2014": "72" };
  const outcomes_ritl: Record<string, ReturnType<typeof outcomes>> = {};
  for (const [y, p] of Object.entries(outFiles)) outcomes_ritl[y] = outcomes(p);

  const json = {
    meta: {
      sumber: "Portal Data BPJS Kesehatan",
      url: "https://data.bpjs-kesehatan.go.id/",
      cakupan: "Statistik agregat nasional JKN 2014-2018. Bukan data klaim per orang.",
      tahun: YEARS,
      singkatan: { RITL: "Rawat inap tingkat lanjut (rumah sakit)", RJTL: "Rawat jalan tingkat lanjut", FKRTL: "Fasilitas kesehatan rujukan tingkat lanjut" },
      sumber_berkas: {
        ...sources,
        biaya_per_admisi_kelas: costClass.file,
        biaya_per_admisi_provinsi: costProv.file,
        biaya_per_admisi_usia_jk: costAgeSex.file,
        biaya_per_kunjungan_rjtl_provinsi: costRjtlProv.file,
        hari_rawat_kelas: daysClass.file,
        admisi_kelas: admClass.file,
        admisi_provinsi: admProv.file,
        peserta_kelas: partClass.file,
        peserta_provinsi: partProv.file,
        peserta_segmen: partSeg.file,
        fkrtl_provinsi: fkrtl.file,
        rasio_fkrtl: fkrtlRatio.file,
        top_diagnoses_ritp_2018: ritp.file,
        top_diagnoses_rjtp_2018: rjtp.file,
        admisi_ritl_usia_jk: admAgeSex.file,
        biaya_rjtl_usia_jk: costRjtlAgeSex.file,
        biaya_rjtl_kelas: costRjtlClass.file,
        kunjungan_rjtl_provinsi: kunjRjtlProv.file,
        puskesmas: puskesmas.file,
        rasio_puskesmas: puskesmasRatio.file,
        klinik_pratama: klinik.file,
        rasio_klinik_pratama: klinikRatio.file,
        dokter_praktik: dokter.file,
        rasio_dokter_praktik: dokterRatio.file,
        outcome_rjtl: Object.values(outRjtlFiles).map(fileByPrefix).join("; "),
      },
    },
    top_diagnoses_ritl,
    top_diagnoses_rjtl_2018: rjtl.items,
    biaya_per_admisi_ritl: {
      by_class: costClass.data,
      total: costClass.total,
      by_province: costProv.data,
      national_by_province_file: costProv.national,
      by_age_sex: { bands: costAgeSex.bands, total: costAgeSex.total },
    },
    biaya_per_kunjungan_rjtl_by_province: costRjtlProv.data,
    lama_rawat_ritl: { by_class: los_by_class, total: los_total, catatan: "Hari rawat dibagi admisi (keduanya per 10.000 peserta), RITL." },
    angka_admisi_ritl_per_10k: { by_class: admClass.data, total: admClass.total, by_province: admProv.data },
    peserta: { by_class: partClass.data, total: partClass.total, by_province: partProv.data, by_segment: partSeg.data },
    fkrtl: { jumlah_by_province: fkrtl.data, rasio_per_100k_by_province: fkrtlRatio.data },
    outcome_ritl: outcomes_ritl,
    outcome_rjtl: outcomes_rjtl,
    top_diagnoses_ritp_2018: ritp.items,
    top_diagnoses_rjtp_2018: rjtp.items,
    angka_admisi_ritl_usia_jk_per_10k: { bands: admAgeSex.bands, total: admAgeSex.total },
    biaya_per_kunjungan_rjtl: { by_class: costRjtlClass.data, total: costRjtlClass.total, by_age_sex: { bands: costRjtlAgeSex.bands, total: costRjtlAgeSex.total } },
    angka_kunjungan_rjtl_per_10k_by_province: kunjRjtlProv.data,
    faskes_primer: {
      puskesmas: { jumlah_by_province: puskesmas.data, rasio_per_100k_by_province: puskesmasRatio.data },
      klinik_pratama: { jumlah_by_province: klinik.data, rasio_per_100k_by_province: klinikRatio.data },
      dokter_praktik: { jumlah_by_province: dokter.data, rasio_per_100k_by_province: dokterRatio.data },
    },
  };

  // --- Pemeriksaan kewajaran ---
  const problems: string[] = [];
  if (unmatched.size) problems.push(`Provinsi tak terpetakan: ${Array.from(unmatched).join("; ")}`);
  for (const [name, d] of Object.entries({ costProv: costProv.data, admProv: admProv.data, partProv: partProv.data, fkrtl: fkrtl.data })) {
    const n = Object.keys(d).length;
    if (n !== INDONESIA_PROVINCES.length) problems.push(`${name}: ${n} provinsi (harus ${INDONESIA_PROVINCES.length})`);
  }
  if (Object.keys(top_diagnoses_ritl["2018"]).length < 100) problems.push("Top 100 RITL 2018 tidak lengkap");
  if (problems.length) {
    console.error("GAGAL:\n- " + problems.join("\n- "));
    process.exit(1);
  }

  fs.writeFileSync(OUT, JSON.stringify(json));
  const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
  console.log(`OK ${path.relative(process.cwd(), OUT)} (${kb} KB)`);
  console.log("RITL 2018 admisi total:", outcomes_ritl["2018"].total_n?.total, "| biaya rata-rata:", costClass.total?.["2018"], "| LOS rata-rata:", los_total["2018"]);
  console.log("LOS per kelas 2018:", Object.fromEntries(Object.entries(los_by_class).map(([c, v]) => [c, v["2018"]])));
}

main();
