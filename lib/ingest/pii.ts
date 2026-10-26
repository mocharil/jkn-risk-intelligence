import { AnonymizationReport, ColumnProfile } from "@/types/dataset";
import { initialsOnly, pseudonymize, scrubText } from "../pii/anonymize";
import { normName } from "./canonical";

type PiiKind = NonNullable<ColumnProfile["pii"]>;

const HEADER_RULES: { kind: PiiKind; re: RegExp }[] = [
  { kind: "NIK", re: /(^|_)(nik|ktp|no_ktp|nomor_ktp)(_|$)/ },
  { kind: "ADDRESS", re: /(^|_)(alamat|address|kelurahan|kecamatan|jalan|nama_jalan|domisili)(_|$)/ },
  { kind: "PHONE", re: /(^|_)(telp|telepon|tlp|hp|no_hp|phone|whatsapp|wa)(_|$)/ },
  { kind: "EMAIL", re: /email|e_mail/ },
  { kind: "NAME", re: /^(nama|nama_pasien|nm_pasien|namapasien|nama_peserta|patient_name|nama_lengkap)$/ },
  { kind: "PATIENT_ID", re: /^(id_pasien|patient_id|no_rm|norm|nomor_rm|no_rkm_medis|mrn|pstv01|pstv02|fkl01|fkp01|pnk01|no_keluarga|nomor_keluarga)$/ },
  { kind: "CARD", re: /^(kartu|no_kartu|nokartu|nomor_kartu|id_peserta|no_peserta|nomor_peserta|nomor_peserta_bpjs|no_bpjs)$/ },
];

function digitShare(values: string[], lo: number, hi: number): number {
  const v = values.filter(Boolean);
  if (!v.length) return 0;
  return v.filter((x) => /^[\d\s.-]+$/.test(x) && x.replace(/\D/g, "").length >= lo && x.replace(/\D/g, "").length <= hi).length / v.length;
}

export function detectPiiKind(column: string, values: string[]): PiiKind | undefined {
  const n = normName(column);
  for (const rule of HEADER_RULES) if (rule.re.test(n)) return rule.kind;
  const sample = values.slice(0, 200);
  if (digitShare(sample, 16, 16) > 0.7) return "NIK";
  if (digitShare(sample, 12, 14) > 0.9 && /peserta|kartu|bpjs/.test(n)) return "CARD";
  const nonEmpty = sample.filter(Boolean);
  if (nonEmpty.length && nonEmpty.filter((v) => /@/.test(v) && /\.\w{2,}$/.test(v)).length / nonEmpty.length > 0.6) return "EMAIL";
  const avgLen = nonEmpty.reduce((a, v) => a + v.length, 0) / (nonEmpty.length || 1);
  if (avgLen > 60) return "FREE_TEXT";
  return undefined;
}

export interface AnonymizedUpload {
  columns: string[];
  rows: Record<string, string>[];
  report: AnonymizationReport;
  piiByColumn: Record<string, PiiKind>;
  treatmentByColumn: Record<string, NonNullable<ColumnProfile["pii_treatment"]>>;
}

/**
 * Anonimisasi saat input: dijalankan SEBELUM rows disimpan atau dikirim ke LLM.
 *  - NIK / no. kartu / ID pasien -> pseudonim HMAC-SHA256 (stabil, tidak dapat dibalik tanpa secret)
 *  - Nama -> inisial
 *  - Alamat / telepon / email -> kolom dihapus
 *  - Teks bebas -> identifier pola dikaburkan
 */
export function anonymizeUpload(columns: string[], rows: Record<string, string>[]): AnonymizedUpload {
  const piiByColumn: Record<string, PiiKind> = {};
  const treatmentByColumn: AnonymizedUpload["treatmentByColumn"] = {};
  const report: AnonymizationReport = { columns_dropped: [], columns_pseudonymized: [], columns_initials: [], columns_scrubbed: [] };

  for (const c of columns) {
    const kind = detectPiiKind(c, rows.map((r) => r[c]));
    if (kind) piiByColumn[c] = kind;
  }

  const dropKinds = ["ADDRESS", "PHONE", "EMAIL"];
  const nameCols = columns.filter((c) => piiByColumn[c] === "NAME");
  const keep = columns.filter((c) => !dropKinds.includes(piiByColumn[c] || ""));
  columns.forEach((c) => {
    if (dropKinds.includes(piiByColumn[c] || "")) {
      report.columns_dropped.push(c);
      treatmentByColumn[c] = "DROPPED";
    }
  });

  const out = rows.map((row) => {
    const o: Record<string, string> = {};
    const names = nameCols.map((c) => row[c]).filter(Boolean);
    for (const c of keep) {
      const v = row[c] ?? "";
      switch (piiByColumn[c]) {
        case "NIK":
        case "CARD":
        case "PATIENT_ID":
          o[c] = v ? `PSN-${pseudonymize(v, "patient")}` : "";
          break;
        case "NAME":
          o[c] = v ? initialsOnly(v) : "";
          break;
        case "FREE_TEXT":
          o[c] = scrubText(v, names);
          break;
        default:
          // Kolom lain: bila berupa kalimat (ada spasi, cukup panjang) atau menyebut nama pasien baris ini,
          // kaburkan juga — nama pasien sering terselip pada kolom catatan pendek.
          o[c] = /\s/.test(v) && v.length >= 12 ? scrubText(v, names) : names.some((n) => n.length >= 3 && v.toLowerCase().includes(n.toLowerCase())) ? scrubText(v, names) : v;
      }
    }
    return o;
  });

  for (const c of keep) {
    const k = piiByColumn[c];
    if (k === "NIK" || k === "CARD" || k === "PATIENT_ID") {
      report.columns_pseudonymized.push(c);
      treatmentByColumn[c] = "PSEUDONYMIZED";
    } else if (k === "NAME") {
      report.columns_initials.push(c);
      treatmentByColumn[c] = "INITIALS_ONLY";
    } else if (k === "FREE_TEXT") {
      report.columns_scrubbed.push(c);
      treatmentByColumn[c] = "SCRUBBED";
    }
  }
  return { columns: keep, rows: out, report, piiByColumn, treatmentByColumn };
}
