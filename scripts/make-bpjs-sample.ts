/**
 * Membuat sampel CSV berformat DATA MIKRO BPJS (file FKRTL pada "Buku Data Sampel BPJS Kesehatan 2015-2020"):
 *   public/samples/bpjs_sampel_fkrtl.csv        - kolom PSTV01, FKL02..FKL48 (kode variabel resmi)
 *   scripts/fixtures/bpjs_sampel_fkrtl.labels.json - label anomali yang ditanam (untuk uji akurasi)
 *
 * DATA SINTETIS. Sebaran dikalibrasi dari statistik resmi Portal Data BPJS (lib/data/bpjs-national.ts):
 * diagnosis = 30 penyakit rawat inap terbanyak 2018, pangsa kelas rawat, provinsi, biaya per admisi per kelas dan provinsi,
 * lama rawat per kelas, serta distribusi status pulang. Faktor biaya/lama rawat per diagnosis bersifat ilustratif
 * (statistik agregat tidak memuat biaya per kode). Data mikro asli memerlukan akun peneliti BPJS.
 *
 *   npx tsx scripts/make-bpjs-sample.ts            # buat berkas
 *   npx tsx scripts/make-bpjs-sample.ts --verify   # buat + jalankan pipeline impor & ukur presisi/recall
 */
import fs from "node:fs";
import path from "node:path";
import { INDONESIA_PROVINCES } from "../lib/data/indonesia-provinces";
import { SYNTH } from "../lib/data/synthetic-config";
import * as N from "../lib/data/bpjs-national";
import { KEMENDAGRI_PROVINCE, normalizeRows } from "../lib/ingest/normalize";
import { parseUpload } from "../lib/ingest/parse";
import { anonymizeUpload } from "../lib/ingest/pii";
import { profileColumns } from "../lib/ingest/profile";
import { heuristicMapping } from "../lib/ingest/mapper";
import { analyzeLocal } from "../lib/risk/engine";
import { evaluate } from "../lib/eval/evaluate";
import { CanonicalClaim } from "../types/claim";
import { RiskType } from "../types/risk";

const N_ROWS = 1500;
/** Prevalensi penyimpangan per jenis: satu sumber dengan dataset bawaan (lib/data/synthetic-config.ts). */
const BR = Object.fromEntries(Object.entries(SYNTH.anomaly.base_rate).map(([k, v]) => [k, v * SYNTH.anomaly.sample_file_multiplier])) as Record<RiskType, number>;
const SUBTLE = SYNTH.anomaly.subtle_share;
const WINDOW_START = "2026-07-10";
const WINDOW_DAYS = 78;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20180401);
const pick = <T,>(a: T[]): T => a[Math.floor(rng() * a.length)];
const between = (lo: number, hi: number) => lo + rng() * (hi - lo);
const intBetween = (lo: number, hi: number) => Math.floor(between(lo, hi + 1));
const normal = () => Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
/** Lognormal bermean 1. */
const logn = (sigma: number) => Math.exp(sigma * normal() - (sigma * sigma) / 2);
const hash01 = (s: string) => {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return ((h >>> 0) % 100000) / 100000;
};
const addDays = (d: string, n: number) => {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
function weighted<T>(items: { v: T; w: number }[]): T {
  const sum = items.reduce((a, i) => a + i.w, 0);
  let r = rng() * sum;
  for (const i of items) {
    r -= i.w;
    if (r <= 0) return i.v;
  }
  return items[items.length - 1].v;
}

// ---------------------------------------------------------------- referensi nasional
const YEAR = N.LATEST_YEAR;
const nationalCost = N.costPerAdmission(YEAR);
const classFactor = N.classCostFactor(YEAR);
const classShare = N.classAdmissionShare(YEAR);
const losByClass = N.losByClass(YEAR).by_class;
const provinces = N.provinceReference(YEAR);
const idToKemendagri: Record<string, string> = {};
for (const [k, v] of Object.entries(KEMENDAGRI_PROVINCE)) if (!idToKemendagri[v]) idToKemendagri[v] = k;
const rjtlCost = N.NATIONAL.biaya_per_kunjungan_rjtl_by_province;

const inpatientDx = N.topDiagnoses(YEAR)
  .filter((d) => !/^[PZ]/.test(d.code)) // bukan neonatus/kontak layanan
  .slice(0, 30)
  .map((d) => ({ code: d.code, desc: d.description, w: d.admisi[YEAR] }));
const normFactor = (f: (code: string) => number) => {
  const sum = inpatientDx.reduce((a, d) => a + d.w, 0);
  const m = inpatientDx.reduce((a, d) => a + d.w * f(d.code), 0) / sum;
  return (code: string) => f(code) / m;
};
const dxCost = normFactor((c) => 0.55 + 1.6 * hash01(`c${c}`));
const dxLos = normFactor((c) => 0.6 + 1.0 * hash01(`l${c}`));
const dxBaseSeverity = (c: string): 1 | 2 => (hash01(`s${c}`) < 0.22 ? 2 : 1);
const ROMAN = ["", "I", "II", "III"];
const CMG: Record<string, string> = { A: "A", B: "A", C: "C", D: "D", E: "E", I: "I", J: "J", K: "K", L: "L", N: "N", O: "O", R: "R" };
const inaCbg = (code: string, sev: number, level: "RITL" | "RJTL") => `${CMG[code[0]] || "Q"}-${level === "RITL" ? 4 : 5}-${String(10 + Math.floor(hash01(`g${code}`) * 40)).padStart(2, "0")}-${ROMAN[sev]}`;

const rjtlDx = N.NATIONAL.top_diagnoses_rjtl_2018
  .filter((d, i, a) => a.findIndex((x) => x.code === d.code) === i)
  .slice(0, 12)
  .map((d) => ({ code: d.code, w: d.kunjungan }));

// ---------------------------------------------------------------- strata faskes
interface Stratum {
  prov: string;
  city: string;
  owner: string;
  kind: string;
  tier: string;
}
const strataByProv = new Map<string, Stratum[]>();
for (const p of provinces) {
  const code2 = idToKemendagri[p.code];
  const list: Stratum[] = [];
  for (const city of [`${code2}71`, `${code2}73`]) {
    for (const owner of ["Pemerintah", "Swasta"]) list.push({ prov: code2, city, owner, kind: "Rumah Sakit Umum", tier: owner === "Swasta" ? pick(["C", "B"]) : pick(["B", "C", "D"]) });
  }
  strataByProv.set(p.code, list);
}

const STATUS = [
  { v: "Sehat", w: 0.94 },
  { v: "Meninggal", w: 0.03 },
  { v: "Pulang Paksa", w: 0.01 },
  { v: "Rujuk", w: 0.02 },
];
const SEGMENT = ["PBI APBN", "PBI APBD", "PPU", "PBPU", "BP"];

// ---------------------------------------------------------------- pembangkit baris
interface Row {
  PSTV01: string;
  FKL02: string;
  FKL03: string;
  FKL04: string;
  FKL05: string;
  FKL06: string;
  FKL07: string;
  FKL08: string;
  FKL09: string;
  FKL10: string;
  FKL12: string;
  FKL13: string;
  FKL14: string;
  FKL16: string;
  FKL18: string;
  FKL19: string;
  FKL47: number;
  FKL48: number;
}
const rows: Row[] = [];
const labels: Record<string, RiskType[]> = {};
const patientPool: { id: string; dx: Set<string> }[] = [];
const lastInpatient: { row: Row; stratum: Stratum; los: number; amount: number; cls: number }[] = [];

let seq = 0;
const newPid = () => String(1_000_000_000 + intBetween(0, 899_999_999));
const claimId = () => `K${String(2018_000_000_00 + ++seq * 7919).slice(0, 12)}`;

function emit(args: { pid: string; adm: string; los: number; st: Stratum; level: "RITL" | "RJTL"; cls: number; dx: string; sev: number; amount: number; verified: number; labs: RiskType[] }) {
  const id = claimId();
  const code = args.dx;
  const row: Row = {
    PSTV01: args.pid,
    FKL02: id,
    FKL03: args.adm,
    FKL04: addDays(args.adm, args.los),
    FKL05: args.st.prov,
    FKL06: args.st.city,
    FKL07: args.st.owner,
    FKL08: args.st.kind,
    FKL09: args.st.tier,
    FKL10: args.level,
    FKL12: pick(SEGMENT),
    FKL13: String(args.cls),
    FKL14: weighted(STATUS.map((s) => ({ v: s.v, w: s.w }))),
    FKL16: rng() < 0.85 ? code : code.slice(0, 3),
    FKL18: code,
    FKL19: inaCbg(code, args.sev, args.level),
    FKL47: Math.round(args.amount),
    FKL48: Math.round(args.verified),
  };
  rows.push(row);
  labels[id] = args.labs;
  if (args.level === "RITL") lastInpatient.push({ row, stratum: args.st, los: args.los, amount: args.amount, cls: args.cls });
  return row;
}

function baseInpatient() {
  const prov = weighted(provinces.map((p) => ({ v: p, w: p.admissions_est })));
  const st = pick(strataByProv.get(prov.code)!);
  const cls = Number(weighted([1, 2, 3].map((k) => ({ v: String(k), w: classShare[String(k)] }))));
  const dx = weighted(inpatientDx.map((d) => ({ v: d, w: d.w }))).code;
  // Klaim INA-CBG berbasis tarif paket: sebaran sempit; ~12% memiliki tambahan khusus (obat/prosedur/alat) hingga +35%.
  // Indeks biaya provinsi sebagian besar mencerminkan campuran kasus, bukan tarif; tarif regional INA-CBG hanya beda ~±15%.
  const regional = Math.min(1.15, Math.max(0.92, 1 + 0.3 * (prov.cost_index - 1)));
  const amount = nationalCost.total * classFactor[String(cls)] * regional * dxCost(dx) * logn(0.1) * (rng() < 0.12 ? between(1.1, 1.35) : 1);
  const los = Math.min(40, Math.max(1, Math.round(losByClass[String(cls)] * dxLos(dx) * logn(0.35))));
  return { prov, st, cls, dx, amount, los };
}

const pickDate = () => addDays(WINDOW_START, intBetween(0, WINDOW_DAYS));

let guard = 0;
while (rows.length < N_ROWS && guard++ < N_ROWS * 4) {
  const kindRoll = rng();
  // ---- rawat jalan (RJTL) ----
  if (kindRoll < 0.08) {
    const prov = weighted(provinces.map((p) => ({ v: p, w: p.admissions_est })));
    const st = pick(strataByProv.get(prov.code)!);
    const cls = Number(weighted([1, 2, 3].map((k) => ({ v: String(k), w: classShare[String(k)] }))));
    const dx = weighted(rjtlDx.map((d) => ({ v: d.code, w: d.w })));
    const amount = (rjtlCost[prov.code]?.[YEAR] || 300_000) * logn(0.5);
    emit({ pid: newPid(), adm: pickDate(), los: 0, st, level: "RJTL", cls, dx, sev: 1, amount, verified: amount * between(0.97, 1), labs: [] });
    continue;
  }

  // ---- anomali berbasis riwayat: pakai ulang pasien & strata dari episode sebelumnya ----
  if (kindRoll < 0.08 + BR.REPEAT_BILLING && lastInpatient.length > 40) {
    // REPEAT_BILLING: episode yang sama ditagih lagi (tumpang tindih / bersambung)
    const prior = lastInpatient[intBetween(0, lastInpatient.length - 1)];
    if ((labels[prior.row.FKL02] || []).length === 0 && prior.row.FKL10 === "RITL") {
      const adm = addDays(prior.row.FKL04, intBetween(-1, 1));
      emit({ pid: prior.row.PSTV01, adm, los: prior.los, st: prior.stratum, level: "RITL", cls: prior.cls, dx: prior.row.FKL18, sev: 1, amount: prior.amount * between(0.97, 1.03), verified: prior.amount * between(0.97, 1), labs: ["REPEAT_BILLING"] });
      continue;
    }
  }
  if (kindRoll < 0.08 + BR.REPEAT_BILLING + BR.READMISSION && lastInpatient.length > 40) {
    // READMISSION: masuk lagi 3-12 hari setelah pulang dengan diagnosis sama
    const prior = lastInpatient[intBetween(0, lastInpatient.length - 1)];
    if ((labels[prior.row.FKL02] || []).length === 0 && prior.row.FKL10 === "RITL") {
      const adm = addDays(prior.row.FKL04, intBetween(3, 12));
      const los = Math.max(1, Math.round(prior.los * between(0.7, 1.2)));
      const amount = prior.amount * between(0.8, 1.15);
      emit({ pid: prior.row.PSTV01, adm, los, st: prior.stratum, level: "RITL", cls: prior.cls, dx: prior.row.FKL18, sev: 1, amount, verified: amount * between(0.97, 1), labs: ["READMISSION"] });
      continue;
    }
  }

  // ---- rawat inap (RITL) ----
  const b = baseInpatient();
  const reuse = patientPool.length > 20 && rng() < 0.12 ? pick(patientPool) : undefined;
  const pat = reuse && !reuse.dx.has(b.dx) ? reuse : (() => { const p = { id: newPid(), dx: new Set<string>() }; patientPool.push(p); return p; })();
  pat.dx.add(b.dx);
  let sev: number = dxBaseSeverity(b.dx);
  let amount = b.amount;
  let los = b.los;
  const verified = b.amount * between(0.97, 1);
  const injected: RiskType[] = [];
  const r = rng();
  if (r < BR.UPCODING) {
    sev = 3;
    amount = b.amount * (rng() < SUBTLE.UPCODING ? between(1.25, 1.55) : between(1.8, 2.7));
    injected.push("UPCODING");
  } else if (r < BR.UPCODING + BR.INFLATED_BILLS) {
    amount = b.amount * (rng() < SUBTLE.INFLATED_BILLS ? between(1.4, 1.7) : between(2.0, 2.9));
    injected.push("INFLATED_BILLS");
  } else if (r < BR.UPCODING + BR.INFLATED_BILLS + BR.ABNORMAL_LOS) {
    los = Math.min(60, Math.round(b.los * (rng() < SUBTLE.ABNORMAL_LOS ? between(1.6, 2.0) : between(2.6, 3.6))) + 2);
    amount = b.amount * between(1.05, 1.2);
    injected.push("ABNORMAL_LOS");
  }
  emit({ pid: pat.id, adm: pickDate(), los, st: b.st, level: "RITL", cls: b.cls, dx: b.dx, sev, amount, verified: injected.includes("INFLATED_BILLS") || injected.includes("UPCODING") ? verified : amount * between(0.97, 1), labs: injected });
}

// ---------------------------------------------------------------- tulis berkas
const HEADER: (keyof Row)[] = ["PSTV01", "FKL02", "FKL03", "FKL04", "FKL05", "FKL06", "FKL07", "FKL08", "FKL09", "FKL10", "FKL12", "FKL13", "FKL14", "FKL16", "FKL18", "FKL19", "FKL47", "FKL48"];
const csv = [HEADER.join(","), ...rows.map((r) => HEADER.map((h) => String(r[h])).join(","))].join("\n") + "\n";
fs.mkdirSync(path.join("public", "samples"), { recursive: true });
fs.writeFileSync(path.join("public", "samples", "bpjs_sampel_fkrtl.csv"), csv, "utf8");
fs.writeFileSync(path.join("scripts", "fixtures", "bpjs_sampel_fkrtl.labels.json"), JSON.stringify(labels), "utf8");
const injectedCount = Object.values(labels).filter((l) => l.length).length;
console.log(`bpjs_sampel_fkrtl.csv: ${rows.length} baris (${rows.filter((r) => r.FKL10 === "RJTL").length} RJTL), anomali ditanam: ${injectedCount}`);
const sumRI = rows.filter((r) => r.FKL10 === "RITL" && !(labels[r.FKL02] || []).length);
console.log(`rerata biaya RITL bersih Rp ${Math.round(sumRI.reduce((a, r) => a + r.FKL47, 0) / sumRI.length).toLocaleString("id-ID")} (nasional Rp ${Math.round(nationalCost.total).toLocaleString("id-ID")})`);

// ---------------------------------------------------------------- verifikasi pipeline impor
if (process.argv.includes("--verify")) {
  const parsed = parseUpload(Buffer.from(csv), "bpjs_sampel_fkrtl.csv");
  const anon = anonymizeUpload(parsed.columns, parsed.rows);
  const cols = profileColumns(anon);
  const mappings = heuristicMapping(cols);
  console.log("\nPemetaan otomatis:");
  for (const m of mappings) console.log(`  ${m.source_field.padEnd(7)} -> ${(m.canonical_field || "(tidak dipetakan)").padEnd(20)} ${m.confidence ? m.confidence.toFixed(2) : ""}`);
  console.log("PII: pseudonim", anon.report.columns_pseudonymized, "dihapus", anon.report.columns_dropped);

  const res = normalizeRows(anon.rows, mappings.map((m) => ({ ...m, status: m.canonical_field ? ("CONFIRMED" as const) : ("UNMAPPED" as const) })), { existingClaimIds: new Set(), providers: new Map(), today: "2026-09-30" });
  console.log(`\nNormalisasi: ${res.claims.length} valid, ${res.rejected.length} ditolak`, res.rejected.slice(0, 3), `faskes strata: ${res.newProviders.length}`);
  const store = { claims: res.claims as CanonicalClaim[], investigations: [], embeddings: new Map(), meta: {} } as never;
  analyzeLocal(store);
  const rep = evaluate(res.claims, labels);
  console.log(`\nEvaluasi terhadap ${injectedCount} anomali tertanam (tanpa narasi klinis):`);
  for (const m of rep.per_detector) console.log(`  ${m.risk_type.padEnd(16)} precision ${m.precision.toFixed(2)}  recall ${m.recall.toFixed(2)}  (tp ${m.tp} fp ${m.fp} fn ${m.fn})`);
  const relevant = rep.per_detector.filter((m) => m.tp + m.fn > 0);
  const f1 = relevant.reduce((acc, m) => acc + (m.precision + m.recall ? (2 * m.precision * m.recall) / (m.precision + m.recall) : 0), 0) / (relevant.length || 1);
  console.log(`  F1 rata-rata ${relevant.length} detektor yang relevan (CLONING, PHANTOM, UNBUNDLING butuh dokumen klinis) ${f1.toFixed(3)} | false positive klaim normal ${(rep.claim_level.false_positive_rate * 100).toFixed(1)}%`);
  const cls = (c: string) => res.claims.filter((x) => x.service.treatment_class === c).length;
  console.log("kelas:", { K1: cls("KELAS_1"), K2: cls("KELAS_2"), K3: cls("KELAS_3"), RJ: cls("RAWAT_JALAN"), ND: cls("TIDAK_DIKETAHUI") });
}
