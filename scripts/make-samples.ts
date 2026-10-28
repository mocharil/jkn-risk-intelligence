import fs from "fs";
import path from "path";
import { generateSyntheticDataset } from "../lib/data/synthetic-seed";
import { analyzeLocal } from "../lib/risk/engine";
import { CanonicalClaim } from "../types/claim";

/**
 * Membuat 2 file CSV contoh ala ekspor SIMRS (data PII PALSU) untuk uji manual upload:
 *   scripts/fixtures/pii-uji/simrs_rs_a.csv  – header Indonesia, delimiter ';', tanggal yyyy-mm-dd
 *   scripts/fixtures/pii-uji/simrs_rs_b.csv  – header berbeda, delimiter ',', tanggal dd/mm/yyyy, "Rp" bertitik, termasuk baris invalid
 */
const FIRST = ["Ahmad", "Siti", "Budi", "Dewi", "Eko", "Nur", "Hadi", "Sri", "Agus", "Rini", "Joko", "Lestari", "Dian", "Fajar", "Indah", "Rizky"];
const LAST = ["Kusuma", "Pratama", "Hidayat", "Saputra", "Wibowo", "Santoso", "Utami", "Nugroho", "Firmansyah", "Rahman", "Wijaya", "Susanto"];
let seed = 7;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
const digits = (n: number) => Array.from({ length: n }, () => Math.floor(rnd() * 10)).join("");

const store = { claims: [] as CanonicalClaim[], investigations: [], embeddings: new Map(), meta: {} } as never;
const ds = generateSyntheticDataset();
(store as { claims: CanonicalClaim[] }).claims = ds.claims;
analyzeLocal(store);

const anomalous = ds.claims.filter((c) => ds.labels[c.claim_id]?.length > 0);
const normal = ds.claims.filter((c) => ds.labels[c.claim_id]?.length === 0);
const pool = (n: number, offset: number) => [...anomalous.slice(offset, offset + Math.round(n * 0.45)), ...normal.slice(offset, offset + Math.round(n * 0.55))];

const q = (v: string | number) => {
  const s = String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const ddmmyyyy = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const rpDots = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

// Narasi khusus sampel: kata-kata berbeda dari data seed agar tidak otomatis dianggap klon dari klaim yang sudah ada.
const OWN: Record<string, { c: string[]; p: string[]; t: string[]; e: string[] }> = {
  default: {
    c: ["mengeluh badan lemas dan tidak nafsu makan sejak tiga hari", "datang ke IGD karena keluhan memberat sejak semalam", "rujukan dari puskesmas dengan keluhan utama yang berlanjut", "mengeluh tidak nyaman, tidur terganggu, aktivitas menurun"],
    p: ["kesadaran penuh, tampak sakit sedang, akral hangat", "tidak tampak sesak, perfusi baik, pemeriksaan sistemik tanpa kelainan menonjol", "status generalis dalam batas wajar, nyeri tekan lokal minimal"],
    t: ["diberikan obat sesuai protokol bangsal, pemantauan tiap shift", "terapi simptomatik dan edukasi, observasi tanda vital berkala", "cairan maintenance dan obat oral, diet disesuaikan"],
    e: ["perkembangan harian cukup baik, pasien kooperatif dan stabil", "keluhan berangsur berkurang, hasil pemeriksaan tidak menunjukkan perburukan", "kondisi membaik, pasien mampu mobilisasi mandiri"],
  },
};
function ownNarrative(c: CanonicalClaim, name: string, extra = ""): string {
  const o = OWN.default;
  const dx = c.diagnoses[0];
  const r = Math.floor(rnd() * 1000);
  const age = c.patient.age + (r % 3);
  return `Pasien ${name}${extra} usia ${age} th, ${pick(o.c)} (dx ${dx.code} ${dx.description}). Pemeriksaan: ${pick(o.p)}; TD ${100 + (r % 35)}/${65 + (r % 22)}, nadi ${68 + (r % 30)}, suhu ${(36.2 + (r % 14) / 10).toFixed(1)}. Terapi: ${pick(o.t)}. Evaluasi: ${pick(o.e)}, tanpa komplikasi bermakna. Catatan nomor ${r}.`;
}

// ---------------- Sampel A ----------------
{
  const rows = pool(150, 0);
  const header = ["NO_SEP", "NO_KARTU", "NIK", "NAMA_PASIEN", "ALAMAT", "NO_HP", "UMUR", "JK", "KODE_PPK", "NAMA_PPK", "PROVINSI", "DIAG_PRIMER", "SEVERITY", "LAMA_RAWAT", "TGL_MASUK", "TGL_KELUAR", "BIAYA_TAGIHAN", "TINDAKAN", "BIAYA_TINDAKAN", "DPJP", "RESUME_MEDIS"];
  const lines = [header.join(";")];
  // Tanam pasangan klon: baris 25, 65, 105 menyalin narasi baris 5, 45, 85 (pasien berbeda).
  const clonePlan = new Map<number, number>([[25, 5], [65, 45], [105, 85]]);
  const narrativeCell = (i: number, c: CanonicalClaim, name: string, nik: string, phone: string): string => {
    const src = clonePlan.has(i) ? cloneText.get(clonePlan.get(i) as number) : undefined;
    if (src) return src.text.split(src.name).join(name).split(src.nik).join(nik).split(src.phone).join(phone);
    const text = ownNarrative(c, name, ` (NIK ${nik}, HP ${phone})`);
    if ([5, 45, 85].includes(i)) cloneText.set(i, { text, name, nik, phone });
    return text;
  };
  const cloneText = new Map<number, { text: string; name: string; nik: string; phone: string }>();
  rows.forEach((c, i) => {
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    const nik = `31${digits(14)}`;
    const phone = `0812${digits(8)}`;
    const dx = c.diagnoses[0];
    lines.push(
      [
        `SIMRS-A-${String(i + 1).padStart(5, "0")}`, `000${digits(10)}`, nik, name, `Jl. Mawar No. ${Math.floor(rnd() * 90) + 1}, Bandung`, phone,
        c.patient.age, c.patient.gender, "RSKB-001", "RS Kasih Bunda Bandung", "Jawa Barat", dx.code, dx.severity, c.service.length_of_stay,
        c.service.admission_date, c.service.discharge_date, c.claim_amount,
        c.procedures.map((p) => p.code).join("|"), c.procedures.map((p) => p.cost ?? 0).join("|"),
        c.service.doctor_name, narrativeCell(i, c, name, nik, phone),
      ].map(q).join(";")
    );
  });
  fs.writeFileSync(path.join("scripts", "fixtures", "pii-uji", "simrs_rs_a.csv"), lines.join("\n"), "utf8");
  console.log("simrs_rs_a.csv rows:", rows.length);
}

// ---------------- Sampel B (format berbeda + baris rusak) ----------------
{
  const rows = pool(120, 200);
  const header = ["Visit ID", "Member No", "Patient Name", "Provider Code", "Facility", "Province", "ICD10", "Admit Date", "Discharge Date", "Total Bill", "Procedures", "Attending", "Clinical Notes"];
  const lines = [header.join(",")];
  rows.forEach((c, i) => {
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    const dx = c.diagnoses[0];
    let icd = dx.code;
    let bill = rpDots(c.claim_amount);
    let admit = ddmmyyyy(c.service.admission_date);
    let id = `VIS-B-${String(i + 1).padStart(5, "0")}`;
    if (i === 10) icd = "XYZ";           // ICD tidak valid
    if (i === 20) bill = "Rp -500.000";   // nominal negatif
    if (i === 30) admit = "";             // tanggal masuk kosong (keluar ada) → tetap valid (admission dihitung dari LOS)
    if (i === 40) id = "VIS-B-00001";     // duplikat
    if (i === 50) admit = "31/02/2026";   // tanggal mustahil
    lines.push(
      [id, `000${digits(10)}`, name, "RSTB-002", "RS Tiga Benua Medan", "Sumatera Utara", icd, admit, ddmmyyyy(c.service.discharge_date), bill, c.procedures.map((p) => p.code).join(";"), c.service.doctor_name, `${name}: ${ownNarrative(c, name)}`]
        .map(q)
        .join(",")
    );
  });
  fs.writeFileSync(path.join("scripts", "fixtures", "pii-uji", "simrs_rs_b.csv"), lines.join("\n"), "utf8");
  console.log("simrs_rs_b.csv rows:", rows.length, "(6 baris sengaja rusak: ICD salah, nominal negatif, tanggal kosong, ID duplikat, tanggal mustahil)");
}
