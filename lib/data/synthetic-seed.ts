import { CanonicalClaim, Diagnosis, EvidenceItem, Procedure } from "@/types/claim";
import { Doctor, Provider } from "@/types/provider";
import { ALL_RISK_TYPES, RiskType } from "@/types/risk";
import { INDONESIA_PROVINCES } from "./indonesia-provinces";
import { DIAGNOSIS_REFERENCE, PROCEDURE_REFERENCE, BUNDLE_COMPONENTS, referenceFor } from "../risk/reference";
import { anonymizePatient } from "../pii/anonymize";
import { admissionsForIcdPrefix, classAdmissionShare, classCostFactor, provinceReference, sampleAgeSex } from "./bpjs-national";

/**
 * Generator data sintetis BERLABEL & deterministik (seed tetap).
 * - Label kebenaran (`labels`) dipisahkan dari klaim → dipakai untuk evaluasi precision/recall detector.
 * - Detector TIDAK melihat label; ia hanya melihat klaim + dokumen.
 * - Ada hard-negative (kasus berat yang sah, operasi sah dengan catatan, rawat lama karena komplikasi)
 *   dan hard-positive (anomali tipis) agar metrik tidak semu 100%.
 * - Data pasien mentah dibuat lalu langsung dianonimisasi (sama seperti jalur ingest).
 */

export const AS_OF_DATE = "2026-09-30";
/** Versi pembangkit data bawaan. Naikkan bila komposisi dataset berubah, agar snapshot lama (status kasus per ID klaim) tidak menempel ke klaim yang berbeda. */
export const SEED_VERSION = "calibrated-bpjs-2018-v2";
/** Trio klaim demo utama; tidak dijadikan sumber klon massal agar pasangan klon hero tetap CLM-09283. */
const HERO_IDS = new Set(["CLM-10293", "CLM-09283", "CLM-08741"]);
export const SEED = 20261002;

export type GroundTruth = Record<string, RiskType[]>;

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
type Rng = () => number;
const pick = <T,>(rng: Rng, arr: T[]): T => arr[Math.floor(rng() * arr.length)];
const between = (rng: Rng, lo: number, hi: number) => lo + rng() * (hi - lo);
const intBetween = (rng: Rng, lo: number, hi: number) => Math.floor(between(rng, lo, hi + 1));

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Faskes (34 provinsi) & dokter
// ---------------------------------------------------------------------------
const CLASS_FACTOR = classCostFactor();

const CAPITALS: Record<string, string> = {
  "ID-AC": "Banda Aceh", "ID-SU": "Medan", "ID-SB": "Padang", "ID-RI": "Pekanbaru", "ID-KR": "Tanjung Pinang", "ID-JA": "Jambi",
  "ID-SS": "Palembang", "ID-BE": "Bengkulu", "ID-BB": "Pangkal Pinang", "ID-LA": "Bandar Lampung", "ID-BT": "Serang", "ID-JK": "Jakarta Selatan",
  "ID-JB": "Bandung", "ID-JT": "Semarang", "ID-YO": "Yogyakarta", "ID-JI": "Surabaya", "ID-BA": "Denpasar", "ID-NB": "Mataram",
  "ID-NT": "Kupang", "ID-KB": "Pontianak", "ID-KT": "Palangka Raya", "ID-KS": "Banjarmasin", "ID-KI": "Samarinda", "ID-KU": "Tanjung Selor",
  "ID-SA": "Manado", "ID-GO": "Gorontalo", "ID-ST": "Palu", "ID-SR": "Mamuju", "ID-SN": "Makassar", "ID-SG": "Kendari",
  "ID-MU": "Sofifi", "ID-MA": "Ambon", "ID-PB": "Manokwari", "ID-PA": "Jayapura",
};

interface ProviderSeed {
  id: string;
  name: string;
  type: Provider["type"];
  province: string;
  city?: string;
  address: string;
  weight: number;
  rates: Partial<Record<RiskType, number>>;
}

/** Total klaim massal yang dialokasikan ke provinsi (di luar klaim hero). */
const MASS_CLAIMS = 1180;

const NAMED_PROVIDERS: ProviderSeed[] = [
  { id: "HOSP-01", name: "RS Sehat Sentosa", type: "RS_KELAS_B", province: "ID-JK", city: "Jakarta Selatan", address: "Jl. Jenderal Sudirman No. 45, Kebayoran Baru", weight: 90, rates: { UPCODING: 0.34, PHANTOM_BILLING: 0.16, ABNORMAL_LOS: 0.14, CLONING: 0.1, UNBUNDLING: 0.06, INFLATED_BILLS: 0.04 } },
  { id: "HOSP-02", name: "RS Medika Utama", type: "RS_KELAS_B", province: "ID-JB", city: "Kota Bandung", address: "Jl. Pasteur No. 120, Sukajadi", weight: 60, rates: { CLONING: 0.28, UPCODING: 0.12, PHANTOM_BILLING: 0.06, ABNORMAL_LOS: 0.05 } },
  { id: "HOSP-03", name: "RS Mitra Kasih Surabaya", type: "RS_KELAS_A", province: "ID-JI", city: "Kota Surabaya", address: "Jl. Raya Darmo No. 88, Wonokromo", weight: 70, rates: { PHANTOM_BILLING: 0.22, UPCODING: 0.08, CLONING: 0.06, ABNORMAL_LOS: 0.05, UNBUNDLING: 0.07 } },
  { id: "HOSP-04", name: "RS Graha Medika Semarang", type: "RS_KELAS_B", province: "ID-JT", city: "Kota Semarang", address: "Jl. Pandanaran No. 56", weight: 50, rates: { ABNORMAL_LOS: 0.2, UPCODING: 0.06, INFLATED_BILLS: 0.07 } },
  { id: "HOSP-05", name: "RS Prima Husada Medan", type: "RS_KELAS_B", province: "ID-SU", city: "Kota Medan", address: "Jl. S. Parman No. 102", weight: 55, rates: { UPCODING: 0.3, ABNORMAL_LOS: 0.08, INFLATED_BILLS: 0.08, CLONING: 0.04 } },
  { id: "HOSP-06", name: "RS Bintang Kasih Makassar", type: "RS_KELAS_B", province: "ID-SN", city: "Kota Makassar", address: "Jl. Perintis Kemerdekaan KM 11", weight: 45, rates: { PHANTOM_BILLING: 0.15, ABNORMAL_LOS: 0.08, UNBUNDLING: 0.08 } },
  { id: "HOSP-07", name: "RS Surya Husada Bali", type: "RS_KELAS_B", province: "ID-BA", city: "Kota Denpasar", address: "Jl. Pulau Seram No. 1", weight: 40, rates: { UPCODING: 0.03, ABNORMAL_LOS: 0.02 } },
  { id: "KLIN-01", name: "Klinik Utama Sehat Bersama", type: "KLINIK_UTAMA", province: "ID-JK", city: "Jakarta Timur", address: "Jl. Pemuda No. 78, Rawamangun", weight: 35, rates: { CLONING: 0.3, UNBUNDLING: 0.1, INFLATED_BILLS: 0.08 } },
];

function buildProviderSeeds(): ProviderSeed[] {
  const rng = mulberry32(SEED ^ 0x51ed);
  const seeds = [...NAMED_PROVIDERS];
  let n = 8;
  for (const prov of INDONESIA_PROVINCES) {
    n++;
    const city = CAPITALS[prov.code] || prov.name;
    const rates: Partial<Record<RiskType, number>> = {};
    const base = 0.02 + rng() * 0.03;
    ALL_RISK_TYPES.forEach((t) => (rates[t] = base));
    if (rng() < 0.22) rates[pick(rng, ["UPCODING", "PHANTOM_BILLING", "CLONING", "INFLATED_BILLS"] as RiskType[])] = 0.14 + rng() * 0.1;
    seeds.push({
      id: `HOSP-${String(n).padStart(2, "0")}`,
      name: `RSUD ${city}`,
      type: rng() < 0.3 ? "RS_KELAS_C" : "RS_KELAS_B",
      province: prov.code,
      city: `Kota ${city}`,
      address: `Jl. Pelayanan Kesehatan No. ${intBetween(rng, 1, 120)}, ${city}`,
      weight: intBetween(rng, 22, 34),
      rates,
    });
  }
  // Volume klaim per provinsi proporsional dengan admisi RITL nasional (BPJS 2018). Faskes contoh dengan pola
  // kecurangan sengaja ditanam tetap ada, tetapi bobotnya dikecilkan bila melebihi jatah provinsinya.
  const refs = provinceReference();
  const totalAdm = refs.reduce((a, r) => a + r.admissions_est, 0) || 1;
  const NAMED_IDS = new Set(NAMED_PROVIDERS.map((x) => x.id));
  for (const prov of INDONESIA_PROVINCES) {
    const share = (refs.find((r) => r.code === prov.code)?.admissions_est || 0) / totalAdm;
    const target = Math.max(8, Math.round(MASS_CLAIMS * share));
    const here = seeds.filter((x) => x.province === prov.code);
    const named = here.filter((x) => NAMED_IDS.has(x.id));
    const generic = here.filter((x) => !NAMED_IDS.has(x.id));
    const namedSum = named.reduce((a, x) => a + x.weight, 0);
    if (namedSum > target * 0.85) {
      const k = (target * 0.85) / namedSum;
      named.forEach((x) => (x.weight = Math.max(10, Math.round(x.weight * k))));
    }
    const left = target - named.reduce((a, x) => a + x.weight, 0);
    generic.forEach((g) => (g.weight = Math.max(0, left)));
  }
  const keep = seeds.filter((x) => x.weight >= 8);
  seeds.length = 0;
  seeds.push(...keep);

  const hot = (id: string, t: RiskType, r: number) => {
    const sd = seeds.find((x) => x.id === id);
    if (sd) sd.rates[t] = r;
  };
  hot("HOSP-01", "READMISSION", 0.05);
  hot("HOSP-03", "READMISSION", 0.07);
  hot("HOSP-05", "REPEAT_BILLING", 0.06);
  hot("KLIN-01", "REPEAT_BILLING", 0.05);
  return seeds;
}

const FIRST = ["Ahmad", "Siti", "Budi", "Dewi", "Eko", "Nur", "Hadi", "Sri", "Agus", "Rini", "Tri", "Wati", "Joko", "Lestari", "Dian", "Fajar", "Indah", "Rizky", "Putri", "Bayu", "Maya", "Andi", "Yusuf", "Citra"];
const LAST = ["Kusuma", "Pratama", "Hidayat", "Saputra", "Wibowo", "Santoso", "Lestari", "Utami", "Nugroho", "Firmansyah", "Pramudya", "Rahman", "Wijaya", "Susanto", "Hakim", "Permata"];
const SPECIALTY = [
  { code: "Sp.PD", label: "Spesialis Penyakit Dalam" },
  { code: "Sp.B", label: "Spesialis Bedah Umum" },
  { code: "Sp.A", label: "Spesialis Anak" },
  { code: "Sp.OG", label: "Spesialis Obstetri & Ginekologi" },
  { code: "Sp.JP", label: "Spesialis Jantung & Pembuluh Darah" },
  { code: "Sp.OT", label: "Spesialis Bedah Ortopedi" },
];

function buildDoctors(seeds: ProviderSeed[]): Doctor[] {
  const rng = mulberry32(SEED ^ 0xd0c);
  const out: Doctor[] = [];
  seeds.forEach((s, idx) => {
    for (let i = 0; i < 3; i++) {
      const sp = SPECIALTY[(idx + i) % SPECIALTY.length];
      const fixed = s.id === "HOSP-01" && i === 0;
      out.push({
        doctor_id: fixed ? "DR-01" : `DR-${String(idx + 1).padStart(2, "0")}${i + 1}`,
        name: fixed ? "dr. Hendra Prasetyo, Sp.OT" : `dr. ${pick(rng, FIRST)} ${pick(rng, LAST)}, ${sp.code}`,
        specialty: fixed ? "Spesialis Bedah Ortopedi" : sp.label,
        sip_number: `SIP.440/${intBetween(rng, 1000, 1999)}/DSP/${2021 + (i % 4)}`,
        total_claims_handled: 0,
        high_risk_claims_count: 0,
        risk_score: 0,
        provider_id: s.id,
      });
    }
  });
  return out;
}

// ---------------------------------------------------------------------------
// Narasi klinis per diagnosis
// ---------------------------------------------------------------------------
interface Narrative {
  complaints: string[];
  exams: string[];
  labs: string[];
  therapies: string[];
  evals: string[];
  discharges: string[];
  severe: string[];
}

const NARRATIVES: Record<string, Narrative> = {
  A09: {
    complaints: ["diare cair 4 kali sejak pagi tanpa darah dan lendir", "diare cair 5 kali disertai mual dan muntah 1 kali", "BAB cair berulang sejak 2 hari dengan demam ringan"],
    exams: ["Abdomen supel, bising usus meningkat ringan", "Turgor kulit sedikit menurun, mukosa agak kering", "Nyeri tekan epigastrium ringan, tidak ada distensi"],
    labs: ["Hemoglobin 14,1 g/dL, leukosit 8.700/uL, elektrolit dalam batas normal", "Leukosit 9.100/uL, natrium 137 mEq/L, kalium 3,6 mEq/L", "Darah rutin normal, feses tanpa leukosit bermakna"],
    therapies: ["Rehidrasi oral dan infus RL 20 tpm, zinc 20 mg 1x1", "Cairan RL intravena, probiotik, oralit sesuai kebutuhan", "Terapi cairan dan zinc, diet lunak bertahap"],
    evals: ["Pada hari ke-2 pasien membaik, asupan oral baik, kondisi stabil", "Keluhan berkurang bermakna hari ke-2, keadaan umum baik", "Pasien pulih dengan terapi suportif, tanpa komplikasi"],
    discharges: ["pulang dalam kondisi stabil, tanpa gejala, tanda vital normal", "pulang kondisi membaik, kontrol rawat jalan bila perlu", "dinyatakan sembuh klinis, tanda vital normal"],
    severe: ["Terjadi dehidrasi berat dengan hipotensi dan perburukan klinis, diperlukan resusitasi cairan agresif dan perawatan intensif ICU", "Disertai sepsis dan syok hipovolemik, kondisi kritis"],
  },
  "K35.8": {
    complaints: ["nyeri perut kanan bawah sejak 1 hari disertai mual", "nyeri periumbilikal berpindah ke fossa iliaka kanan dengan demam", "nyeri perut kanan bawah dan muntah 2 kali"],
    exams: ["Nyeri tekan McBurney positif, defans muskular ringan", "Rovsing sign positif, tidak ada tanda peritonitis difus", "Nyeri lepas ringan di kuadran kanan bawah"],
    labs: ["Leukosit 13.400/uL, CRP meningkat ringan", "Leukosit 12.800/uL, USG menunjang apendisitis akut", "Leukosit 14.100/uL, neutrofil dominan"],
    therapies: ["Antibiotik intravena dan puasa, direncanakan apendektomi", "Analgesik, antibiotik profilaksis, persiapan operasi", "Resusitasi cairan, antibiotik, persiapan tindakan"],
    evals: ["Pascaoperasi pasien membaik dan stabil, luka bersih", "Pemulihan pascatindakan baik, mobilisasi dini berhasil", "Kondisi stabil, nyeri terkontrol, tanpa komplikasi"],
    discharges: ["pulang hari ke-3 dalam kondisi stabil", "pulang kondisi membaik, kontrol luka rawat jalan", "dinyatakan boleh pulang, tanda vital normal"],
    severe: ["Apendisitis perforasi dengan peritonitis difus dan sepsis, dirawat ICU dengan perburukan klinis"],
  },
  "J18.9": {
    complaints: ["batuk berdahak 5 hari dengan demam dan sesak ringan", "demam, batuk produktif, nyeri dada pleuritik", "sesak napas ringan, batuk dan demam 4 hari"],
    exams: ["Ronki basah kasar di lapang paru kanan bawah", "Retraksi ringan, ronki basah basal bilateral", "Saturasi 95% udara ruangan, napas 22 kali per menit"],
    labs: ["Leukosit 14.200/uL; foto thorax infiltrat lobus kanan bawah", "Leukosit 13.000/uL; infiltrat bercak pada foto dada", "CRP meningkat, foto dada konsisten dengan pneumonia"],
    therapies: ["Antibiotik intravena, nebulisasi, oksigen nasal", "Seftriakson IV, mukolitik, terapi suportif", "Antibiotik empiris dan hidrasi"],
    evals: ["Demam turun hari ke-3, sesak berkurang, kondisi stabil", "Respons baik terhadap antibiotik, membaik bertahap", "Pasien membaik, saturasi normal tanpa oksigen"],
    discharges: ["pulang dengan antibiotik oral, kondisi stabil", "pulang kondisi membaik, kontrol 1 minggu", "dinyatakan stabil dan boleh pulang"],
    severe: ["Terjadi gagal napas dengan kebutuhan ventilator dan perawatan ICU, disertai sepsis"],
  },
  I10: {
    complaints: ["pusing dan tengkuk berat dengan tekanan darah tinggi", "sakit kepala berdenyut, tekanan darah 170/100", "keluhan pusing dan berdebar"],
    exams: ["Tekanan darah 168/98 mmHg, tidak ada defisit neurologis", "Tekanan darah 172/102 mmHg, jantung dan paru dalam batas normal", "Funduskopi tanpa kelainan bermakna"],
    labs: ["EKG sinus ritme, ureum kreatinin normal", "Profil lipid sedikit meningkat, fungsi ginjal normal", "EKG tanpa iskemia akut"],
    therapies: ["Amlodipin dan ACE inhibitor, observasi tekanan darah", "Antihipertensi oral, edukasi diet rendah garam", "Penyesuaian dosis antihipertensi"],
    evals: ["Tekanan darah terkontrol 135/85, keluhan hilang, stabil", "Tekanan darah membaik bertahap, kondisi stabil", "Pasien membaik, tanpa komplikasi"],
    discharges: ["pulang kondisi stabil dengan obat oral", "pulang membaik, kontrol poliklinik 1 minggu", "dinyatakan stabil, tekanan darah terkontrol"],
    severe: ["Krisis hipertensi dengan ensefalopati dan komplikasi organ target, memburuk dan dirawat ICU"],
  },
  "E11.9": {
    complaints: ["lemas, banyak minum dan sering kencing", "gula darah tinggi dengan keluhan lemas", "polidipsia dan poliuria sejak seminggu"],
    exams: ["Kesadaran compos mentis, tanpa luka diabetik", "Tanda vital stabil, turgor baik", "Tidak ada ulkus kaki, refleks normal"],
    labs: ["Glukosa darah sewaktu 312 mg/dL, HbA1c 9,2%", "Gula darah puasa 245 mg/dL, keton negatif", "HbA1c 8,8%, fungsi ginjal normal"],
    therapies: ["Insulin subkutan dan edukasi diet", "Metformin dan titrasi insulin basal", "Pengaturan gula darah dan diet diabetes"],
    evals: ["Gula darah terkontrol bertahap, kondisi stabil", "Keluhan membaik, gula darah menurun", "Stabil tanpa hipoglikemia atau komplikasi"],
    discharges: ["pulang dengan regimen insulin, stabil", "pulang kondisi membaik, kontrol rutin", "dinyatakan stabil, edukasi diberikan"],
    severe: ["Ketoasidosis diabetik dengan asidosis berat dan penurunan kesadaran, dirawat ICU"],
  },
  "O80.0": {
    complaints: ["inpartu kala I dengan kontraksi teratur", "ibu hamil aterm datang dengan mulas teratur", "G2P1 hamil 39 minggu, kontraksi sejak malam"],
    exams: ["Pembukaan 6 cm, denyut jantung janin 144 per menit", "Kontraksi adekuat, DJJ baik, presentasi kepala", "Pembukaan lengkap, ketuban jernih"],
    labs: ["Hb 11,8 g/dL, golongan darah dan urin rutin normal", "Hb 12,1 g/dL, tidak ada proteinuria", "Laboratorium prapersalinan normal"],
    therapies: ["Pertolongan persalinan normal dengan pemantauan partograf", "Persalinan pervaginam spontan, manajemen aktif kala III", "Partus spontan tanpa penyulit"],
    evals: ["Bayi lahir spontan, ibu dan bayi stabil", "Pasca persalinan ibu stabil, perdarahan normal", "Ibu dan bayi sehat tanpa komplikasi"],
    discharges: ["pulang hari ke-2 ibu dan bayi sehat", "pulang kondisi baik, kontrol nifas", "dinyatakan stabil, boleh pulang"],
    severe: ["Perdarahan pascapersalinan masif dengan syok, transfusi dan perawatan ICU, kondisi kritis"],
  },
  "A01.0": {
    complaints: ["demam naik turun sejak 6 hari disertai nyeri perut dan lemas", "demam tinggi terutama sore hingga malam, mual, dan nyeri kepala", "demam 5 hari dengan lidah kotor dan sulit buang air besar"],
    exams: ["Suhu 38,6 C, lidah kotor tepi hiperemis, nyeri tekan epigastrium", "Tampak sakit sedang, hepatomegali ringan, tidak ada tanda perdarahan", "Abdomen supel, bising usus normal, tanpa tanda peritonitis"],
    labs: ["Widal titer O 1/320, leukosit 5.200/uL, trombosit 148.000/uL", "Tubex TF positif 6, hemoglobin 12,8 g/dL, SGOT SGPT meningkat ringan", "Leukosit 4.900/uL, trombosit 156.000/uL, elektrolit dalam batas normal"],
    therapies: ["Seftriakson IV 2 gram per hari, paracetamol, cairan RL", "Antibiotik intravena, antipiretik, diet lunak", "Terapi cairan, antibiotik sesuai pedoman, istirahat total"],
    evals: ["Demam turun hari ke-4, nafsu makan membaik, kondisi stabil", "Suhu normal sejak hari ke-3 perawatan, keluhan berkurang, tanpa komplikasi", "Pasien membaik bertahap, tidak ada perdarahan maupun perforasi"],
    discharges: ["pulang dalam kondisi stabil dengan antibiotik oral", "pulang kondisi membaik, kontrol poliklinik 1 minggu", "dinyatakan stabil, tidak demam lebih dari 48 jam"],
    severe: ["Terjadi perforasi usus dengan peritonitis dan syok sepsis, perburukan klinis, dirawat ICU", "Komplikasi perdarahan saluran cerna dengan penurunan kesadaran, kondisi kritis, dirawat intensif ICU"],
  },
  K30: {
    complaints: ["nyeri ulu hati dan mual sejak 3 hari, memberat setelah makan", "perih di ulu hati disertai kembung dan sendawa", "nyeri epigastrium berulang dengan mual tanpa muntah darah"],
    exams: ["Nyeri tekan epigastrium ringan, tidak ada defans muskular", "Abdomen supel, bising usus normal, tidak teraba massa", "Konjungtiva tidak anemis, tidak ada tanda perdarahan saluran cerna"],
    labs: ["Hemoglobin 13,6 g/dL, leukosit 7.800/uL, amilase dan lipase normal", "Darah rutin normal, EKG sinus ritme tanpa iskemia", "Hemoglobin 13,9 g/dL, fungsi hati dalam batas normal"],
    therapies: ["Omeprazol IV, antasida, domperidon, diet lambung", "Penghambat pompa proton, sukralfat, terapi simtomatik", "Terapi cairan, PPI, antiemetik, edukasi pola makan"],
    evals: ["Nyeri ulu hati berkurang bermakna hari ke-2, kondisi stabil", "Keluhan membaik dengan terapi, makan dan minum baik", "Pasien membaik, tidak ada muntah darah maupun melena"],
    discharges: ["pulang dengan obat lambung oral, kondisi stabil", "pulang membaik, kontrol poliklinik penyakit dalam", "dinyatakan stabil, edukasi pola makan diberikan"],
    severe: ["Perdarahan saluran cerna atas dengan syok hipovolemik, memerlukan transfusi, kondisi kritis, dirawat ICU", "Perforasi lambung dengan sepsis dan perburukan klinis, dirawat intensif ICU"],
  },
};

function narrativeFor(code: string): Narrative {
  return NARRATIVES[code] || NARRATIVES["A09"];
}

interface BuiltNarrative {
  summary: string;
  excerpt: string;
  resume: string;
  resumeExcerpt: string;
}

/** Variasi angka klinis (lab, vital) agar tiap narasi unik per pasien, seperti rekam medis nyata. */
function jitterNumbers(rng: Rng, text: string): string {
  return text.replace(/\d+(?:[.,]\d+)?/g, (m) => {
    const hasDec = /[.,]/.test(m) && !/^\d{1,3}(?:\.\d{3})+$/.test(m);
    if (/^\d{1,3}(?:\.\d{3})+$/.test(m)) {
      const v = Number(m.replace(/\./g, ""));
      return Math.round((v * between(rng, 0.85, 1.18)) / 100) * 100 >= 1000 ? (Math.round((v * between(rng, 0.85, 1.18)) / 100) * 100).toLocaleString("id-ID") : m;
    }
    if (hasDec) return (Number(m.replace(",", ".")) * between(rng, 0.9, 1.12)).toFixed(1).replace(".", ",");
    const v = Number(m);
    return v <= 3 ? m : String(Math.max(1, Math.round(v * between(rng, 0.88, 1.15))));
  });
}

function buildNarrative(rng: Rng, code: string, age: number, gender: "L" | "P", severe: boolean): BuiltNarrative {
  const n = narrativeFor(code);
  const complaint = pick(rng, n.complaints);
  const exam = jitterNumbers(rng, pick(rng, n.exams));
  const lab = jitterNumbers(rng, pick(rng, n.labs));
  const therapy = pick(rng, n.therapies);
  const evalText = severe ? pick(rng, n.severe) : pick(rng, n.evals);
  const discharge = pick(rng, n.discharges);
  const vitals = `TD ${intBetween(rng, 105, 135)}/${intBetween(rng, 68, 88)} mmHg, nadi ${intBetween(rng, 72, 98)}/menit, suhu ${(36.4 + rng() * 1.3).toFixed(1)} C`;
  const sex = gender === "L" ? "laki-laki" : "perempuan";
  const summary = `Pasien ${sex} usia ${age} tahun datang dengan keluhan ${complaint}. Pemeriksaan fisik: ${exam}. ${vitals}. Penunjang: ${lab}. Terapi: ${therapy}. Evaluasi: ${evalText}.`;
  const resume = severe
    ? `Kondisi pulang: setelah perawatan intensif, pasien ${discharge}. ${pick(rng, n.severe)}.`
    : `Kondisi pulang: pasien ${discharge}.`;
  return { summary, excerpt: `${complaint}. ${evalText}.`, resume, resumeExcerpt: `Pasien ${discharge}.` };
}

/** Mutasi kecil agar klon tidak identik 100% (sering terjadi pada copy-paste nyata). */
function microEdit(rng: Rng, text: string): string {
  let t = text.replace(/usia (\d+) tahun/, (_m, a) => `usia ${Number(a) + intBetween(rng, -2, 2)} tahun`);
  t = t.replace(/nadi (\d+)/, (_m, a) => `nadi ${Number(a) + intBetween(rng, -3, 3)}`);
  return t;
}

// ---------------------------------------------------------------------------
// Pembuat klaim
// ---------------------------------------------------------------------------
interface MakeOpts {
  claimNum: number;
  provider: ProviderSeed;
  doctor: Doctor;
  code: string;
  forced: RiskType[];
  admissionDate: string;
  recentBoost: boolean;
  /** Hak kelas rawat (1-3); menentukan tarif dasar lewat faktor biaya kelas BPJS. */
  klass: 1 | 2 | 3;
  cloneFrom?: CanonicalClaim;
  patientRaw: { id: string; name: string; card: string; nik: string; age: number; gender: "L" | "P" };
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function makeClaim(rng: Rng, o: MakeOpts, providerGeo: { name: string; province: string }): { claim: CanonicalClaim; labels: RiskType[] } {
  const ref = referenceFor(o.code);
  // Tarif paket dasar disesuaikan kelas rawat (faktor biaya riil BPJS RITL 2018).
  const tariff = ref.expected_tariff * CLASS_FACTOR[String(o.klass)];
  const labels = new Set<RiskType>(o.forced);
  const claimId = `CLM-${o.claimNum}`;

  // --- baseline normal ---
  let severity: 1 | 2 | 3 = ref.expected_severity;
  let los = Math.max(1, Math.round(ref.expected_los + between(rng, -0.6, 0.9)));
  let amount = Math.round(tariff * between(rng, 0.9, 1.12));
  const procedures: Procedure[] = ref.package_procedures.slice(0, 1 + intBetween(rng, 0, 1)).map((c) => ({
    code: c,
    description: PROCEDURE_REFERENCE[c]?.description || c,
    date: o.admissionDate,
  }));
  let severeNarrative = false;
  const extraDocs: EvidenceItem[] = [];
  let extraLegitSurgeryDoc = false;
  let legitProc: Procedure | undefined;

  // --- hard negatives (sah) ---
  const clean = labels.size === 0; // kasus sah hanya dibuat pada klaim tanpa anomali lain (agar narasi konsisten)
  const legitSevere = clean && rng() < 0.07 && severity < 3;
  if (legitSevere) {
    severity = Math.min(3, severity + 1) as 1 | 2 | 3;
    severeNarrative = true;
    amount = Math.round(amount * between(rng, 1.18, 1.4));
    los = Math.max(los + 1, Math.round(ref.expected_los * between(rng, 1.3, 1.6)));
  }
  const legitLongLos = clean && !legitSevere && rng() < 0.04;
  if (legitLongLos) {
    severeNarrative = true;
    los = Math.ceil(ref.expected_los * between(rng, 2.0, 2.6));
  }
  if (o.code === "K35.8" && !labels.has("PHANTOM_BILLING")) {
    legitProc = { code: "47.01", description: PROCEDURE_REFERENCE["47.01"].description, date: o.admissionDate, cost: undefined };
    procedures.push(legitProc);
    extraLegitSurgeryDoc = true;
  } else if (!labels.has("PHANTOM_BILLING") && rng() < 0.05 && o.code !== "O80.0") {
    legitProc = { code: "45.13", description: PROCEDURE_REFERENCE["45.13"].description, date: o.admissionDate, cost: PROCEDURE_REFERENCE["45.13"].reference_price };
    procedures.push(legitProc);
    amount += PROCEDURE_REFERENCE["45.13"].reference_price;
    extraLegitSurgeryDoc = true;
  }

  // --- injeksi anomali ---
  if (labels.has("UPCODING")) {
    const subtle = rng() < 0.12;
    const gap = ref.expected_severity === 1 ? (rng() < 0.55 ? 2 : 1) : 1;
    severity = Math.min(3, ref.expected_severity + gap) as 1 | 2 | 3;
    if (severity === ref.expected_severity) severity = Math.min(3, severity + 1) as 1 | 2 | 3;
    amount = Math.round(tariff * (subtle ? between(rng, 1.05, 1.25) : between(rng, 1.7, 2.8)));
    severeNarrative = false;
  }
  if (labels.has("ABNORMAL_LOS")) {
    los = Math.ceil(ref.expected_los * between(rng, 2.0, 3.2));
    severeNarrative = false;
    amount = Math.round(amount * between(rng, 1.05, 1.2));
  }
  if (labels.has("PHANTOM_BILLING")) {
    const code = o.code === "K35.8" ? "47.01" : pick(rng, ["44.95", "45.13", "47.01"]);
    const price = PROCEDURE_REFERENCE[code].reference_price;
    const idx = procedures.findIndex((p) => p.code === code);
    if (idx >= 0) procedures.splice(idx, 1);
    procedures.push({ code, description: PROCEDURE_REFERENCE[code].description, date: addDays(o.admissionDate, 1), cost: price });
    amount += price;
    extraLegitSurgeryDoc = false;
    const explicit = rng() < 0.55;
    extraDocs.push({
      evidence_id: `DOC-${o.claimNum}-04`,
      document_type: "CATATAN_TINDAKAN",
      title: "Catatan Perintah DPJP & Registri Kamar Tindakan",
      date: addDays(o.admissionDate, 1),
      excerpt: explicit
        ? `Tidak ada catatan tindakan (${code}) pada lembar perintah DPJP maupun registri kamar operasi.`
        : "Perintah DPJP: lanjutkan terapi cairan, evaluasi elektrolit, diet lunak.",
      content: explicit
        ? `Perintah DPJP tanggal ${addDays(o.admissionDate, 1)}: lanjutkan terapi cairan dan observasi. Tidak ada catatan tindakan (${code}) pada lembar perintah DPJP maupun registri kamar operasi; tidak ada persetujuan tindakan maupun jadwal ke instalasi bedah sentral.`
        : `Perintah DPJP tanggal ${addDays(o.admissionDate, 1)}: lanjutkan terapi cairan, evaluasi elektrolit, diet lunak. Pasien tirah baring di bangsal.`,
      status: "NEEDS_REVIEW",
    });
  }
  if (labels.has("UNBUNDLING")) {
    // Komponen yang SUDAH termasuk paket: prosedur paket diagnosis + komponen dari prosedur induk yang ditagih.
    const pool = new Set<string>(ref.package_procedures);
    procedures.forEach((p) => (BUNDLE_COMPONENTS[p.code] || []).forEach((c) => pool.add(c)));
    const chosen = Array.from(pool);
    const take = chosen.slice(0, Math.max(1, Math.min(chosen.length, intBetween(rng, 1, 3))));
    for (const c of take) {
      const price = Math.round(PROCEDURE_REFERENCE[c].reference_price * between(rng, 0.9, 1.1));
      const idx = procedures.findIndex((p) => p.code === c);
      if (idx >= 0) procedures.splice(idx, 1);
      procedures.push({ code: c, description: PROCEDURE_REFERENCE[c].description, date: o.admissionDate, cost: price });
      amount += price;
    }
  }
  if (labels.has("INFLATED_BILLS")) {
    if (rng() < 0.5) {
      amount = Math.round(tariff * between(rng, 1.75, 2.5));
    } else {
      const packaged = new Set(ref.package_procedures);
      const cand = ["89.52", "87.44", "90.39", "93.11", "99.04", "96.56"].filter((c) => !packaged.has(c) && !procedures.some((p) => p.code === c));
      const c = pick(rng, cand);
      const price = Math.round(PROCEDURE_REFERENCE[c].reference_price * between(rng, 2.1, 3.4));
      procedures.push({ code: c, description: PROCEDURE_REFERENCE[c].description, date: o.admissionDate, cost: price });
      amount += price;
    }
    if (severity > ref.expected_severity) severity = ref.expected_severity;
  }

  // --- narasi & dokumen ---
  const dischargeDate = addDays(o.admissionDate, los);
  const submissionDate = addDays(dischargeDate, intBetween(rng, 1, 3));
  const { patient: anon } = anonymizePatient({ id: o.patientRaw.id, name: o.patientRaw.name, card_number: o.patientRaw.card, nik: o.patientRaw.nik, age: o.patientRaw.age, gender: o.patientRaw.gender });
  const patient = { ...anon, province_code: o.provider.province };

  let built = buildNarrative(rng, o.code, o.patientRaw.age, o.patientRaw.gender, severeNarrative);
  if (o.cloneFrom) {
    const srcSummary = o.cloneFrom.medical_evidence.find((e) => e.document_type === "RINGKASAN_MEDIS");
    const srcResume = o.cloneFrom.medical_evidence.find((e) => e.document_type === "RESUME_PULANG");
    if (srcSummary) {
      built = {
        summary: microEdit(rng, srcSummary.content),
        excerpt: srcSummary.excerpt,
        resume: srcResume?.content || built.resume,
        resumeExcerpt: srcResume?.excerpt || built.resumeExcerpt,
      };
    }
  }

  const evidence: EvidenceItem[] = [
    { evidence_id: `DOC-${o.claimNum}-01`, document_type: "RINGKASAN_MEDIS", title: "Ringkasan Medis Rawat Inap", date: o.admissionDate, excerpt: built.excerpt, content: built.summary, status: "NEEDS_REVIEW", attached_file_name: `Ringkasan_Medis_${claimId}.pdf` },
    { evidence_id: `DOC-${o.claimNum}-02`, document_type: "RESUME_PULANG", title: "Resume Pulang & Instruksi DPJP", date: dischargeDate, excerpt: built.resumeExcerpt, content: built.resume, status: "NEEDS_REVIEW", attached_file_name: `Resume_Pulang_${claimId}.pdf` },
  ];

  if (extraLegitSurgeryDoc && legitProc) {
    const proc = legitProc;
    evidence.push({
      evidence_id: `DOC-${o.claimNum}-04`,
      document_type: "CATATAN_TINDAKAN",
      title: "Laporan Operasi & Catatan Anestesi",
      date: o.admissionDate,
      excerpt: `Tindakan ${proc.description} (${proc.code}) dilaksanakan, sesuai laporan operasi.`,
      content: `Laporan operasi: tindakan ${proc.description} (${proc.code}) dilaksanakan oleh DPJP dengan anestesi umum, perdarahan minimal, tidak ada penyulit intraoperatif.`,
      status: "SUPPORTS_CLAIM",
      attached_file_name: `Laporan_Operasi_${claimId}.pdf`,
    });
  }
  evidence.push(...extraDocs);

  const lineItems = [`Paket INA-CBG ${o.code}: Rp ${Math.round(tariff).toLocaleString("id-ID")}`, ...procedures.filter((p) => (p.cost ?? 0) > 0).map((p) => `${p.description} [${p.code}]: Rp ${(p.cost as number).toLocaleString("id-ID")}`)];
  evidence.push({
    evidence_id: `DOC-${o.claimNum}-03`,
    document_type: "BUKTI_BILLING",
    title: "Rincian Tagihan Faskes",
    date: submissionDate,
    excerpt: lineItems.slice(0, 2).join("; "),
    content: `Rincian tagihan: ${lineItems.join("; ")}. Total tagihan Rp ${amount.toLocaleString("id-ID")}.`,
    status: "NEEDS_REVIEW",
    attached_file_name: `Billing_${claimId}.pdf`,
  });

  const diagnoses: Diagnosis[] = [{ code: o.code, description: ref.description, is_primary: true, severity }];

  const claim: CanonicalClaim = {
    claim_id: claimId,
    sep_number: `0045R001${o.admissionDate.slice(2, 4)}${o.admissionDate.slice(5, 7)}V${String(o.claimNum).padStart(7, "0")}`,
    patient,
    provider: { provider_id: o.provider.id, name: providerGeo.name, type: o.provider.type, province_code: o.provider.province, city: o.provider.city || "—" },
    service: {
      admission_date: o.admissionDate,
      discharge_date: dischargeDate,
      submission_date: submissionDate,
      length_of_stay: los,
      treatment_class: `KELAS_${o.klass}` as CanonicalClaim["service"]["treatment_class"],
      doctor_id: o.doctor.doctor_id,
      doctor_name: o.doctor.name,
      doctor_specialty: o.doctor.specialty,
    },
    diagnoses,
    procedures,
    claim_amount: amount,
    medical_evidence: evidence,
    risk_score: 0,
    risk_level: "LOW",
    risk_signals: [],
    risk_findings: [],
    similar_claims: [],
    status: "PENDING_REVIEW",
    created_at: `${submissionDate}T08:00:00Z`,
    updated_at: `${submissionDate}T08:00:00Z`,
  };
  return { claim, labels: Array.from(labels) };
}

/** Geser semua tanggal klaim agar submission_date = target (distribusi submit seragam, tren 7 hari wajar). */
function daysBetweenIso(a: string, b: string): number {
  return Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86_400_000);
}

function shiftToSubmitDate(c: CanonicalClaim, target: string) {
  shiftDates(c, daysBetweenIso(c.service.submission_date, target));
}

function shiftDates(c: CanonicalClaim, delta: number) {
  if (delta === 0) return;
  const sh = (d: string) => addDays(d, delta);
  c.service.admission_date = sh(c.service.admission_date);
  c.service.discharge_date = sh(c.service.discharge_date);
  c.service.submission_date = sh(c.service.submission_date);
  c.procedures.forEach((p) => (p.date = sh(p.date)));
  c.medical_evidence.forEach((e) => (e.date = sh(e.date)));
  c.created_at = `${c.service.submission_date}T08:00:00Z`;
  c.updated_at = c.created_at;
  c.sep_number = c.sep_number.replace(/^(0045R001)\d{4}/, `$1${c.service.admission_date.slice(2, 4)}${c.service.admission_date.slice(5, 7)}`);
}

// ---------------------------------------------------------------------------
// Dataset utama
// ---------------------------------------------------------------------------
export interface SyntheticDataset {
  claims: CanonicalClaim[];
  providers: Provider[];
  doctors: Doctor[];
  labels: GroundTruth;
}

const DX_CODES = Object.keys(DIAGNOSIS_REFERENCE);

/** Bobot campuran diagnosis = jumlah admisi RITL nasional 2018 pada awalan ICD-10 tiap diagnosis (BPJS, 100 penyakit terbanyak). */
const DX_WEIGHTS = DX_CODES.map((code) => ({ code, w: admissionsForIcdPrefix(DIAGNOSIS_REFERENCE[code].icd_prefix || code) || 1 }));
const DX_WEIGHT_SUM = DX_WEIGHTS.reduce((a, d) => a + d.w, 0);
function pickDx(rng: Rng): string {
  let r = rng() * DX_WEIGHT_SUM;
  for (const d of DX_WEIGHTS) {
    r -= d.w;
    if (r <= 0) return d.code;
  }
  return DX_WEIGHTS[DX_WEIGHTS.length - 1].code;
}

/** Pangsa admisi per hak kelas (peserta x angka admisi, BPJS 2018): kelas 1 ~21%, kelas 2 ~27%, kelas 3 ~52%. */
const CLASS_SHARE = classAdmissionShare();
function pickClass(rng: Rng): 1 | 2 | 3 {
  const r = rng();
  if (r < CLASS_SHARE["1"]) return 1;
  if (r < CLASS_SHARE["1"] + CLASS_SHARE["2"]) return 2;
  return 3;
}

export function generateSyntheticDataset(): SyntheticDataset {
  const rng = mulberry32(SEED);
  const seeds = buildProviderSeeds();
  const doctors = buildDoctors(seeds);
  const claims: CanonicalClaim[] = [];
  const labels: GroundTruth = {};
  const byDx = new Map<string, CanonicalClaim[]>();

  const register = (c: CanonicalClaim, l: RiskType[]) => {
    claims.push(c);
    labels[c.claim_id] = l;
    const code = c.diagnoses[0].code;
    const arr = byDx.get(code) || [];
    arr.push(c);
    byDx.set(code, arr);
  };

  // ---- Klaim pahlawan (hero) CLM-10293 beserta pasangan klonnya ----
  const hero = buildHeroClaims(rng);
  hero.forEach((h) => register(h.claim, h.labels));

  // ---- Klaim massal ----
  let counter = 10300;
  const patientPool = new Map<string, { id: string; name: string; card: string; nik: string; age: number; gender: "L" | "P" }[]>();
  const asOf = AS_OF_DATE;
  type PatientRaw = { id: string; name: string; card: string; nik: string; age: number; gender: "L" | "P" };
  const rawByClaim = new Map<string, PatientRaw>();
  const patientDx = new Map<string, Set<string>>();
  const usedPriors = new Set<string>();

  for (const prov of seeds) {
    const provDoctors = doctors.filter((d) => d.provider_id === prov.id);
    const pool = patientPool.get(prov.id) || [];
    patientPool.set(prov.id, pool);
    for (let i = 0; i < prov.weight; i++) {
      const dayOffset = intBetween(rng, 0, 83);
      const admission = addDays(asOf, -(dayOffset + 9)); // digeser setelah klaim dibuat agar TANGGAL SUBMIT seragam hingga tanggal acuan
      const recent = dayOffset <= 14;

      // Pemilihan diagnosis: bias ke A09 untuk RS panas (agar sinyal emergent terlihat)
      let code = prov.rates.UPCODING && prov.rates.UPCODING > 0.2 && rng() < 0.35 ? "A09" : pickDx(rng);
      const forced: RiskType[] = [];
      ALL_RISK_TYPES.forEach((t) => {
        let rate = prov.rates[t] ?? 0.02;
        if (recent && t === "UPCODING" && code === "A09") rate *= 1.9;
        if (recent && t === "PHANTOM_BILLING") rate *= 1.4;
        if (rng() < rate) forced.push(t);
      });

      // Repeat Billing / Readmission: butuh episode sebelumnya pada pasien & faskes yang sama (diagnosis sama).
      if (forced.includes("REPEAT_BILLING") && forced.includes("READMISSION")) forced.splice(forced.indexOf("READMISSION"), 1);
      let priorFor: CanonicalClaim | undefined;
      if (forced.includes("REPEAT_BILLING") || forced.includes("READMISSION")) {
        const elig = claims.filter(
          (c) => c.provider.provider_id === prov.id && Number(c.claim_id.slice(4)) >= 10300 && labels[c.claim_id]?.length === 0 && c.service.submission_date <= addDays(asOf, -16) && rawByClaim.has(c.claim_id) && !usedPriors.has(c.claim_id)
        );
        if (elig.length) {
          priorFor = pick(rng, elig);
          usedPriors.add(priorFor.claim_id);
          code = priorFor.diagnoses[0].code;
        } else {
          for (const t of ["REPEAT_BILLING", "READMISSION"] as RiskType[]) if (forced.includes(t)) forced.splice(forced.indexOf(t), 1);
        }
      }

      let cloneFrom: CanonicalClaim | undefined;
      if (forced.includes("CLONING")) {
        const sameDx = (byDx.get(code) || []).filter((c) => !HERO_IDS.has(c.claim_id) && !c.medical_evidence.some((e) => e.excerpt.includes("Tidak ada catatan tindakan")));
        const sameProv = sameDx.filter((c) => c.provider.provider_id === prov.id);
        const pool2 = sameProv.length && rng() < 0.65 ? sameProv : sameDx;
        if (pool2.length) cloneFrom = pick(rng, pool2);
        else forced.splice(forced.indexOf("CLONING"), 1);
      }

      // pasien (12% pasien lama → peluang readmisi)
      let patientRaw: PatientRaw;
      const reuse = pool.length && rng() < 0.12 ? pick(rng, pool) : undefined;
      if (priorFor) patientRaw = rawByClaim.get(priorFor.claim_id) as PatientRaw;
      else if (reuse && !patientDx.get(reuse.id)?.has(code)) patientRaw = reuse; // pasien lama hanya dengan diagnosis BERBEDA (bukan readmisi sengaja)
      else {
        // Usia & jenis kelamin dari distribusi admisi RITL menurut usia-JK (Sample/29), bukan seragam.
        const { age: pAge, gender } = sampleAgeSex(rng(), rng());
        patientRaw = {
          id: `RAW-${counter}-${i}`,
          name: `${pick(rng, FIRST)} ${pick(rng, LAST)}`,
          card: `000${String(1_000_000_000 + intBetween(rng, 0, 899_999_999))}`,
          nik: `${intBetween(rng, 1000, 9999)}${String(intBetween(rng, 0, 999_999_999_999)).padStart(12, "0")}`,
          age: pAge,
          gender,
        };
        pool.push(patientRaw);
      }

      // dokter: anomali terkonsentrasi di dokter pertama (cluster)
      const doctor = forced.length > 0 && rng() < 0.62 ? provDoctors[0] : pick(rng, provDoctors);
      const klass = pickClass(rng);

      const { claim, labels: l } = makeClaim(
        rng,
        { claimNum: counter++, provider: prov, doctor, code, forced, admissionDate: admission, recentBoost: recent, klass, cloneFrom, patientRaw },
        { name: prov.name, province: prov.province }
      );
      shiftToSubmitDate(claim, addDays(asOf, -dayOffset));
      if (priorFor) {
        const repeat = l.includes("REPEAT_BILLING");
        const gap = repeat ? intBetween(rng, -1, 1) : intBetween(rng, 3, 12);
        shiftDates(claim, daysBetweenIso(claim.service.admission_date, addDays(priorFor.service.discharge_date, gap)));
        if (repeat && l.length === 1) claim.claim_amount = Math.round(priorFor.claim_amount * between(rng, 0.97, 1.03));
      }
      rawByClaim.set(claim.claim_id, patientRaw);
      (patientDx.get(patientRaw.id) ?? patientDx.set(patientRaw.id, new Set()).get(patientRaw.id)!).add(code);
      register(claim, l);
      // Kedua anggota pasangan klon dianggap bagian dari klaster cloning.
      if (cloneFrom && !labels[cloneFrom.claim_id].includes("CLONING")) labels[cloneFrom.claim_id].push("CLONING");
    }
  }

  // ---- Provider ----
  const providers: Provider[] = seeds.map((s) => {
    const geo = INDONESIA_PROVINCES.find((p) => p.code === s.province)!;
    return {
      provider_id: s.id,
      name: s.name,
      type: s.type,
      province_code: s.province,
      province_name: geo.name,
      city: s.city || CAPITALS[s.province],
      address: s.address,
      phone: `(021) ${intBetween(rng, 200, 899)}-${intBetween(rng, 1000, 9999)}`,
      risk_score: 0,
      risk_level: "LOW",
      total_claims: 0,
      high_risk_claims: 0,
      potential_exposure: 0,
      dominant_risk_type: "UPCODING",
      risk_composition: { upcoding_pct: 0, cloning_pct: 0, phantom_billing_pct: 0, abnormal_los_pct: 0 },
      peer_comparison: {
        severity_3_rate: { provider: 0, peer_median: 0 },
        avg_los_days: { provider: 0, peer_median: 0 },
        avg_claim_amount: { provider: 0, peer_median: 0 },
        readmission_rate_pct: { provider: 0, peer_median: 0 },
      },
      doctors: doctors.filter((d) => d.provider_id === s.id),
      monthly_risk_trend: [],
    };
  });

  return { claims, providers, doctors, labels };
}

// ---------------------------------------------------------------------------
// Klaim pahlawan (diperkirakan sebagai kasus demo utama) — teks Indonesia, pasien teranonimisasi
// ---------------------------------------------------------------------------
function buildHeroClaims(rng: Rng): { claim: CanonicalClaim; labels: RiskType[] }[] {
  const heroDoctor: Doctor = { doctor_id: "DR-01", name: "dr. Hendra Prasetyo, Sp.OT", specialty: "Spesialis Bedah Ortopedi", sip_number: "SIP.440/1029/DSP/2023", total_claims_handled: 0, high_risk_claims_count: 0, risk_score: 0, provider_id: "HOSP-01" };
  const heroProvider = { provider_id: "HOSP-01", name: "RS Sehat Sentosa", type: "RS_KELAS_B" as const, province_code: "ID-JK", city: "Jakarta Selatan" };

  const baseSummary =
    "Pasien laki-laki usia 48 tahun datang dengan keluhan diare cair 4 kali sejak pagi tanpa darah dan lendir, mual dan muntah 1 kali, demam ringan 37,6 C. Pemeriksaan fisik: abdomen supel, bising usus meningkat ringan, tidak ada distensi maupun tanda peritonitis. TD 118/76 mmHg, nadi 84/menit. Penunjang: hemoglobin 14,2 g/dL, leukosit 8.900/uL, kalium 3,6 mEq/L, natrium 138 mEq/L, dalam batas normal. Terapi: rehidrasi oral dan infus RL 20 tpm, zinc 20 mg 1x1, probiotik. Evaluasi: pada hari ke-2 pasien membaik, asupan oral baik, kondisi stabil tanpa komplikasi.";
  const baseResume = "Kondisi pulang: pasien dinyatakan stabil secara klinis sejak hari ke-2, tanda vital normal, tanpa gejala. Obat pulang: oralit, zinc 20 mg 1x1, probiotik.";
  const baseExcerpt = "Diare cair 4 kali tanpa darah dan lendir. Pada hari ke-2 pasien membaik, kondisi stabil tanpa komplikasi.";

  const mk = (num: number, patientIdx: number, amount: number, los: number, admission: string, withHeroSurgery: boolean, summary: string): CanonicalClaim => {
    const { patient: anon } = anonymizePatient({ id: `RAW-HERO-${patientIdx}`, name: ["Bambang Sudibyo", "Hartono Wijaya", "Slamet Riyadi"][patientIdx], card_number: `00018928${37460 + patientIdx}`, nik: `31740512087500${String(patientIdx).padStart(2, "0")}`, age: 48 - patientIdx, gender: "L" });
    const patient = { ...anon, province_code: "ID-JK" };
    const dischargeDate = addDays(admission, los);
    const submission = addDays(dischargeDate, 2);
    const procs: Procedure[] = withHeroSurgery
      ? [
          { code: "44.95", description: PROCEDURE_REFERENCE["44.95"].description, date: addDays(admission, 2), cost: 12_500_000 },
          { code: "99.18", description: PROCEDURE_REFERENCE["99.18"].description, date: admission, cost: 950_000 },
        ]
      : [{ code: "99.18", description: PROCEDURE_REFERENCE["99.18"].description, date: admission }];
    const evidence: EvidenceItem[] = [
      { evidence_id: `DOC-${num}-01`, document_type: "RINGKASAN_MEDIS", title: "Ringkasan Medis Rawat Inap", date: admission, excerpt: baseExcerpt, content: summary, status: "CONTRADICTS_CLAIM", attached_file_name: `Discharge_Summary_CLM${num}.pdf` },
      { evidence_id: `DOC-${num}-02`, document_type: "RESUME_PULANG", title: "Resume Pulang & Instruksi DPJP", date: dischargeDate, excerpt: "Pasien dinyatakan stabil secara klinis sejak hari ke-2, namun pemulangan ditunda hingga hari ke-6.", content: baseResume, status: "NEEDS_REVIEW", attached_file_name: `Discharge_Instructions_CLM${num}.pdf` },
      { evidence_id: `DOC-${num}-03`, document_type: "BUKTI_BILLING", title: "Rincian Tagihan Faskes", date: submission, excerpt: `Paket INA-CBG A09: Rp 3.800.000; ${withHeroSurgery ? "Prosedur bedah digestif laparoskopik [44.95]: Rp 12.500.000" : ""}`, content: `Rincian tagihan: Paket INA-CBG A09: Rp 3.800.000${withHeroSurgery ? "; Prosedur bedah digestif laparoskopik [44.95]: Rp 12.500.000; Infus elektrolit & hidrasi [99.18]: Rp 950.000" : ""}. Total tagihan Rp ${amount.toLocaleString("id-ID")}.`, status: "NEEDS_REVIEW", attached_file_name: `Billing_CLM${num}.pdf` },
    ];
    if (withHeroSurgery) {
      evidence.push({
        evidence_id: `DOC-${num}-04`,
        document_type: "CATATAN_TINDAKAN",
        title: "Lembar Perintah DPJP & Registri Kamar Operasi",
        date: addDays(admission, 2),
        excerpt: "Tidak ada catatan tindakan bedah digestif (44.95) pada lembar perintah DPJP maupun registri kamar operasi.",
        content: `Perintah DPJP ${addDays(admission, 2)}: lanjutkan infus, cek ulang elektrolit, diet bubur lunak. Pasien tirah baring di bangsal Melati 3. Tidak ada catatan tindakan bedah digestif (44.95) pada lembar perintah DPJP maupun registri kamar operasi; tidak ada persetujuan tindakan atau penjadwalan ke instalasi bedah sentral (IBS).`,
        status: "CONTRADICTS_CLAIM",
        attached_file_name: `Physician_Orders_CLM${num}.pdf`,
      });
      evidence.push({
        evidence_id: `DOC-${num}-05`,
        document_type: "HASIL_LABORATORIUM",
        title: "Hematologi & Elektrolit",
        date: admission,
        excerpt: "Hb 14,2 g/dL, leukosit 8.900/uL, trombosit 245.000/uL, kalium 3,6, natrium 138.",
        content: "Parameter hematologi dan elektrolit dalam rentang normal. Tidak ada bukti sepsis, syok hipovolemik, maupun asidosis metabolik akut.",
        status: "SUPPORTS_CLAIM",
        attached_file_name: `Hematology_Report_CLM${num}.pdf`,
      });
    }
    return {
      claim_id: `CLM-${num}`,
      sep_number: `0045R0010826V00${num}`,
      patient,
      provider: heroProvider,
      service: { admission_date: admission, discharge_date: dischargeDate, submission_date: submission, length_of_stay: los, treatment_class: "KELAS_2", doctor_id: heroDoctor.doctor_id, doctor_name: heroDoctor.name, doctor_specialty: heroDoctor.specialty },
      diagnoses: [
        { code: "A09", description: DIAGNOSIS_REFERENCE["A09"].description, is_primary: true, severity: 3 },
        { code: "K52.9", description: "Gastroenteritis non-infeksi", is_primary: false, severity: 2 },
      ],
      procedures: procs,
      claim_amount: amount,
      medical_evidence: evidence,
      risk_score: 0,
      risk_level: "LOW",
      risk_signals: [],
      risk_findings: [],
      similar_claims: [],
      status: "FLAGGED",
      created_at: `${submission}T08:30:00Z`,
      updated_at: `${submission}T08:30:00Z`,
    };
  };

  const partner = mk(9283, 1, 17_900_000, 5, addDays(AS_OF_DATE, -40), false, microEdit(rng, baseSummary));
  partner.claim_id = "CLM-09283";
  partner.sep_number = "0045R0010826V0009283";
  partner.procedures = [{ code: "99.18", description: PROCEDURE_REFERENCE["99.18"].description, date: partner.service.admission_date, cost: 900_000 }];
  const third = mk(8741, 2, 18_200_000, 6, addDays(AS_OF_DATE, -55), false, "Pasien laki-laki usia 51 tahun dengan gastroenteritis akut, keluhan diare dan muntah 2 hari. Pemeriksaan fisik: turgor sedikit menurun, abdomen supel. Terapi: cairan intravena dan antiemetik. Evaluasi: keluhan membaik hari ke-2, kondisi stabil.");
  third.claim_id = "CLM-08741";
  third.sep_number = "0045R0010826V0008741";
  const heroClaim = mk(10293, 0, 18_450_000, 6, addDays(AS_OF_DATE, -30), true, baseSummary);
  heroClaim.claim_id = "CLM-10293";
  heroClaim.sep_number = "0045R0010826V0010293";
  heroClaim.investigation_id = "INV-2026-010293";

  return [
    { claim: heroClaim, labels: ["UPCODING", "PHANTOM_BILLING", "ABNORMAL_LOS", "CLONING", "UNBUNDLING"] },
    { claim: partner, labels: ["UPCODING", "CLONING", "ABNORMAL_LOS", "UNBUNDLING"] },
    { claim: third, labels: ["UPCODING", "ABNORMAL_LOS"] },
  ];
}

export { median };
