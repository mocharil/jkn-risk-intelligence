/**
 * Sumber tunggal provenance data aplikasi: komponen mana yang memakai DATA RESMI Sample BPJS
 * (Portal Data BPJS Kesehatan, folder Sample/) dan mana yang SINTETIS beserta alasannya.
 * Aturan panitia: data resmi dipakai sebisa mungkin; sintetis hanya bila tidak ada padanannya di Sample.
 * Parameter sintetis terpusat di lib/data/synthetic-config.ts (tiap nilai diberi basis "Sample" atau "asumsi").
 * Dipakai UI (Acuan Nasional, Manajemen Dataset, landing) dan didokumentasikan di Sample/README.md.
 */

import { SYNTH } from "./synthetic-config";

export type ProvenanceKind = "resmi" | "sintetis";

export interface ProvenanceSource {
  id: string;
  kind: ProvenanceKind;
  component: string;
  /** Resmi: nama berkas Sample/. Sintetis: alasan tidak ada padanan. */
  detail: string;
  /** Berkas dalam Sample/ (hanya untuk kind = "resmi"). */
  files?: string[];
  usage: string;
}

export const PROVENANCE_SOURCES: ProvenanceSource[] = [
  { id: "dx-mix", kind: "resmi", component: "Campuran diagnosis klaim", detail: "100 Penyakit Terbanyak RITL 2014-2018", files: ["01_100_Penyakit_Terbanyak_pada_RITL_Tahun_2018.xlsx", "05_…RITL_Tahun_2017.xlsx", "08_…RITL_Tahun_2016.xlsx", "12_…RITL_Tahun_2015.xlsx", "16_…RITL_Tahun_2014.xlsx"], usage: "Bobot pemilihan diagnosis pada generator klaim; peringkat & tren di Acuan Nasional" },
  { id: "dx-other", kind: "resmi", component: "Diagnosis RJTL / RITP / RJTP", detail: "100 Penyakit Terbanyak RJTL, RITP, RJTP 2018", files: ["02_100_Penyakit_Terbanyak_pada_RJTL_Tahun_2018.xlsx", "03_100_Penyakit_Terbanyak_pada_RITP_Tahun_2018.xlsx", "04_100_Penyakit_Terbanyak_pada_RJTP_Tahun_2018.xlsx"], usage: "Acuan lintas jenis layanan (tersedia di bpjs-national.json)" },
  { id: "province", kind: "resmi", component: "Bobot provinsi & sebaran faskes", detail: "Peserta per provinsi, angka admisi per provinsi, FKRTL", files: ["57_Pertumbuhan_Peserta_JKN_per_Provinsi.xlsx", "27_Angka_Admisi_Pelayanan_RITL_berdasarkan_Provinsi.xlsx", "61_FKRTL_yang_Bekerjasama.xlsx", "62_Rasio_FKRTL.xlsx"], usage: "Jumlah faskes sintetis per provinsi = FKRTL provinsi ÷ skala; jumlah klaim per provinsi sebanding dengan perkiraan admisi (angka admisi × peserta); peta provinsi" },
  { id: "class", kind: "resmi", component: "Hak kelas rawat", detail: "Peserta & angka admisi per kelas; biaya per admisi per kelas", files: ["55_Pertumbuhan_Peserta_JKN_berdasarkan_Kelas_Rawat.xlsx", "31_Angka_Admisi_Pelayanan_RITL_berdasarkan_Hak_Kelas_Perawatan_Tahun.xlsx", "22_Distribusi_Rerata_Biaya_Satuan_Klaim_per_Admisi_Pelayanan_RITL_berdasarkan_Hak_Kelas_Perawatan.xlsx"], usage: "Pangsa kelas 1/2/3 & faktor biaya kelas pada tarif klaim sintetis" },
  { id: "age-sex", kind: "resmi", component: "Usia & jenis kelamin pasien", detail: "Angka admisi RITL menurut usia dan jenis kelamin", files: ["29_Angka_Admisi_Pelayanan_RITL_berdasarkan_Usia_dan_Jenis_Kelamin.xlsx"], usage: "Sebaran usia-JK pasien pada klaim sintetis (asumsi peserta merata per tahun usia dalam pita)" },
  { id: "cost-los", kind: "resmi", component: "Biaya & lama rawat nasional", detail: "Biaya per admisi (kelas, provinsi, usia-JK); hari rawat ÷ admisi per kelas", files: ["22_…per_Admisi_…Hak_Kelas_Perawatan.xlsx", "66_…per_Admisi_…Provinsi.xlsx", "21_…per_Admisi_…Usia_dan_Jenis_Kelamin.xlsx", "30_Angka_Hari_Rawat_Pelayanan_RITL_berdasarkan_Hak_Kelas_Perawatan.xlsx"], usage: "Pembanding kewajaran biaya & LOS (Acuan Nasional, konteks nasional pada kasus); indeks biaya provinsi menggeser tarif klaim dan dinormalkan oleh detektor" },
  { id: "outcome", kind: "resmi", component: "Hasil terapi (outcome)", detail: "Outcome RITL & RJTL per hak kelas 2014-2018", files: ["20_…RITL…2018.xlsx", "72–75_…RITL…2014-2017.xlsx", "67–71_…RJTL…2014-2018.xlsx"], usage: "Persentase meninggal/rujuk/sehat di Acuan Nasional" },
  { id: "segment-faskes", kind: "resmi", component: "Segmen peserta & rasio faskes primer", detail: "Segmen peserta; Puskesmas, Klinik Pratama, dokter praktik perorangan (jumlah & rasio)", files: ["58_Pertumbuhan_Peserta_JKN_berdasarkan_Segmen_Peserta.xlsx", "56/59/60/63/64/65_*.xlsx"], usage: "Konteks cakupan & rasio faskes (bpjs-national.json)" },
  { id: "claims-person", kind: "sintetis", component: `Klaim per orang (${SYNTH.claims.toLocaleString("id-ID")} baris)`, detail: "Sample hanya agregat nasional; mikro-data kohort memerlukan akun peneliti BPJS dan tidak boleh dipublikasi.", usage: "Entitas klaim, pasien (dianonimkan), tanggal, dokter, faskes; dibangkitkan dari statistik Sample, tanpa klaim atau faskes tulis-tangan" },
  { id: "tariff-icd", kind: "sintetis", component: "Tarif & LOS per kode ICD", detail: "Sample tidak memuat tarif INA-CBG per kode; hanya rerata per kelas/provinsi (dipakai sebagai faktor skala).", usage: "DIAGNOSIS_REFERENCE di lib/risk/reference.ts" },
  { id: "procedures", kind: "sintetis", component: "Tindakan & harga acuan tindakan", detail: "Tidak ada data tindakan/prosedur ICD-9 di Sample.", usage: "PROCEDURE_REFERENCE & aturan unbundling" },
  { id: "narrative", kind: "sintetis", component: "Narasi rekam medis & dokumen", detail: "Teks klinis per pasien tidak tersedia pada data publik.", usage: "Ringkasan medis, resume pulang, bukti dokumen" },
  { id: "anomaly-labels", kind: "sintetis", component: "Anomali berlabel (ground truth)", detail: `Sample tidak berisi label kecurangan. Prevalensi dasar ±${(Object.values(SYNTH.anomaly.base_rate).reduce((a, b) => a + b, 0) * 100).toFixed(1).replace(".", ",")}% per klaim (asumsi: audit klaim umumnya menemukan satu digit persen), dengan faskes yang sangat bervariasi, kasus tipis, dan kasus sah yang tampak janggal.`, usage: "Evaluasi & halaman Evaluasi & Kalibrasi; hasilnya sengaja tidak sempurna" },
  { id: "provider-names", kind: "sintetis", component: "Nama faskes & dokter", detail: "Identitas faskes/dokter nyata tidak ada di Sample (agregat provinsi saja); nama dibentuk acak dari kosakata dan kota.", usage: "Daftar faskes & dokter" },
  { id: "variation", kind: "sintetis", component: "Sebaran biaya & lama rawat dalam satu diagnosis", detail: `Sample hanya memuat rerata, bukan sebaran per diagnosis. Dipakai sebaran log-normal (σ biaya ${SYNTH.variation.amount_sigma}, σ lama rawat ${SYNTH.variation.los_sigma}) agar penyimpangan tidak terlalu mudah dipisahkan.`, usage: "Klaim yang wajar tetapi beragam" },
];

export const PROVENANCE_RESMI = PROVENANCE_SOURCES.filter((s) => s.kind === "resmi");
export const PROVENANCE_SINTETIS = PROVENANCE_SOURCES.filter((s) => s.kind === "sintetis");

/** Label ringkas untuk footer/badge. */
export const PROVENANCE_SUMMARY = `Data resmi Sample BPJS (${PROVENANCE_RESMI.length} kelompok acuan) + data sintetis untuk ${PROVENANCE_SINTETIS.length} komponen yang tak ada padanannya di Sample`;
