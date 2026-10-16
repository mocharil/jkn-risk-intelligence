import { createHmac } from "crypto";

/**
 * Anonimisasi sejak input (UU PDP No. 27/2022).
 *
 * Aturan:
 *  - NIK, alamat, nomor telepon, email: TIDAK PERNAH disimpan.
 *  - Nomor kartu BPJS & ID peserta: diganti pseudonim HMAC-SHA256 (stabil, tidak bisa dibalik tanpa secret).
 *  - Nama pasien: hanya inisial.
 *  - Teks bebas (narasi medis): identifier pola dikaburkan sebelum disimpan / dikirim ke LLM.
 */

const DEV_SECRET = "arsa-dev-only-secret-change-me";

function getSecret(): string {
  if (!process.env.PII_HMAC_SECRET && process.env.ARSA_STRICT_PRODUCTION === "1") {
    throw new Error("PII_HMAC_SECRET wajib diatur saat ARSA_STRICT_PRODUCTION=1");
  }
  return process.env.PII_HMAC_SECRET || DEV_SECRET;
}

export function isUsingDevSecret(): boolean {
  return !process.env.PII_HMAC_SECRET;
}

export function pseudonymize(value: string, kind: string, length = 10): string {
  const digest = createHmac("sha256", getSecret()).update(`${kind}:${value.trim()}`).digest("hex");
  return digest.slice(0, length).toUpperCase();
}

export function pseudonymPatientId(rawId: string): string {
  return `PSN-${pseudonymize(rawId, "patient")}`;
}

/** "0001892837461" -> "•••••••7461" (hanya 4 digit terakhir sebagai petunjuk). */
export function maskCardNumber(card: string): string {
  const digits = card.replace(/\D/g, "");
  if (digits.length < 5) return "•".repeat(Math.max(digits.length, 4));
  return "•".repeat(digits.length - 4) + digits.slice(-4);
}

/** "Bambang Sudibyo" -> "B. S."; gelar depan (dr., prof.) dan gelar belakang setelah koma (Sp.OT) diabaikan. */
export function initialsOnly(name: string): string {
  const parts = name
    .split(",")[0]
    .replace(/\b(?:dr|drg|prof|ir|hj?)\b\.?/gi, "")
    .split(/\s+/)
    .map((p) => p.replace(/[^A-Za-zÀ-ɏ]/g, ""))
    .filter(Boolean);
  if (parts.length === 0) return "—";
  return parts.map((p) => `${p[0].toUpperCase()}.`).join(" ");
}

const NIK_RE = /(?<!\d)\d{16}(?!\d)/g;
const CARD_RE = /(?<!\d)(?:000\d{10}|\d{13})(?!\d)/g;
const PHONE_RE = /(?<!\d)(?:\+62|62|0)8\d{8,11}(?!\d)/g;
const LANDLINE_RE = /(?<!\d)\(?0[2-9]\d{1,2}\)?[\s.-]?\d{6,8}(?!\d)/g;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const RT_RW_RE = /\bRT\.?\s*\d{1,3}\s*[/,-]?\s*RW\.?\s*\d{1,3}\b/gi;
const INLINE_ADDR_RE = /\b(?:Jl\.|Jalan)\s+[A-Z0-9][A-Za-z0-9\s.,/-]{2,35}?(?=[,.;)\n]|$)/g;
const HONORIFIC_STOP = /^(?:dr|drg|prof|ir|hj|tn|ny|nn|sdr|sdri|bp|bpk|ibu|an)$/i;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Kaburkan identifier langsung di dalam teks bebas. Nama diberikan eksplisit bila diketahui. */
export function scrubText(text: string, knownNames: string[] = []): string {
  // Urutan penting: pola terpanjang/paling spesifik dulu (NIK 16 digit) agar tidak terpotong pola telepon.
  let out = text
    .replace(EMAIL_RE, "[EMAIL]")
    .replace(NIK_RE, "[NIK]")
    .replace(CARD_RE, "[NO_KARTU]")
    .replace(PHONE_RE, "[TELEPON]")
    .replace(LANDLINE_RE, "[TELEPON]")
    .replace(RT_RW_RE, "[ALAMAT]")
    .replace(INLINE_ADDR_RE, "[ALAMAT]");

  for (const name of knownNames) {
    const n = name.trim();
    if (n.length < 3) continue;
    out = out.replace(new RegExp(escapeRegExp(n), "gi"), "[PASIEN]");
    // Kaburkan juga potongan kata nama pasien (>= 4 huruf, bukan gelar) bila disebut parsial di resume medis.
    const tokens = n
      .split(",")[0]
      .split(/\s+/)
      .map((t) => t.replace(/[^A-Za-zÀ-ɏ]/g, ""))
      .filter((t) => t.length >= 4 && !HONORIFIC_STOP.test(t));
    for (const tok of tokens) {
      out = out.replace(new RegExp(`\\b${escapeRegExp(tok)}\\b`, "gi"), "[PASIEN]");
    }
  }
  return out;
}

export interface RawPatientInput {
  id?: string;
  name?: string;
  card_number?: string;
  nik?: string;
  address?: string;
  age?: number;
  gender?: string;
}

export interface AnonymizedPatient {
  patient_id: string;
  name: string; // inisial
  age: number;
  gender: "L" | "P";
  bpjs_card_number: string; // termasking
  nik?: undefined; // tidak pernah disimpan
}

export interface AnonymizationReport {
  fields_dropped: string[];
  fields_pseudonymized: string[];
  fields_masked: string[];
}

export function anonymizePatient(raw: RawPatientInput): { patient: AnonymizedPatient; report: AnonymizationReport } {
  const report: AnonymizationReport = { fields_dropped: [], fields_pseudonymized: [], fields_masked: [] };
  const idSource = raw.card_number || raw.id || raw.nik || raw.name || "unknown";

  if (raw.nik) report.fields_dropped.push("nik");
  if (raw.address) report.fields_dropped.push("address");
  if (raw.id || raw.card_number || raw.nik) report.fields_pseudonymized.push("patient_id");
  if (raw.card_number) report.fields_masked.push("bpjs_card_number");
  if (raw.name) report.fields_masked.push("name");

  const gender = (raw.gender || "").toUpperCase().startsWith("P") || (raw.gender || "").toUpperCase().startsWith("F") ? "P" : "L";
  return {
    patient: {
      patient_id: pseudonymPatientId(idSource),
      name: raw.name ? initialsOnly(raw.name) : "—",
      age: Number.isFinite(raw.age) ? Math.max(0, Math.round(raw.age as number)) : 0,
      gender,
      bpjs_card_number: raw.card_number ? maskCardNumber(raw.card_number) : "—",
    },
    report,
  };
}

/** Pemeriksa untuk test & halaman verifikasi: adakah pola PII mentah di string ini? */
export function containsRawPII(text: string): boolean {
  return (
    /(?<!\d)\d{16}(?!\d)/.test(text) ||
    /(?<!\d)(?:000\d{10}|\d{13})(?!\d)/.test(text) ||
    /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(text) ||
    /(?<!\d)(?:\+62|62|0)8\d{8,11}(?!\d)/.test(text) ||
    /(?<!\d)\(?0[2-9]\d{1,2}\)?[\s.-]?\d{6,8}(?!\d)/.test(text)
  );
}
