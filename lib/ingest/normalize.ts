import { CanonicalClaim, Diagnosis, EvidenceItem, Procedure } from "@/types/claim";
import { DataQualitySummary, FieldMapping, RejectedRow } from "@/types/dataset";
import { Provider } from "@/types/provider";
import { INDONESIA_PROVINCES } from "../data/indonesia-provinces";
import { initialsOnly, maskCardNumber, pseudonymPatientId, scrubText } from "../pii/anonymize";
import { DIAGNOSIS_REFERENCE, PROCEDURE_REFERENCE, referenceFor } from "../risk/reference";
import { icdDescription } from "../data/bpjs-national";
import { CANONICAL_FIELDS, REQUIRED_FIELDS, missingRequiredFields, normName } from "./canonical";

export interface NormalizeContext {
  existingClaimIds: Set<string>;
  providers: Map<string, Provider>;
  /** Tanggal acuan bila baris tidak punya tanggal submit. */
  today: string;
}

export interface NormalizeResult {
  claims: CanonicalClaim[];
  newProviders: Provider[];
  rejected: RejectedRow[];
  quality: DataQualitySummary;
}

// ---------------------------------------------------------------------------
// Parser nilai
// ---------------------------------------------------------------------------
export function parseDate(v: string): string | null {
  const s = v.trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  let y: number, mo: number, d: number;
  if (m) {
    y = +m[1]; mo = +m[2]; d = +m[3];
  } else if ((m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/))) {
    d = +m[1]; mo = +m[2]; y = +m[3];
  } else return null;
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return null;
  const iso = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const dt = new Date(`${iso}T00:00:00Z`);
  // Tolak tanggal mustahil (mis. 31/02) — JS menggulung ke bulan berikutnya, jadi cek ulang komponennya.
  if (Number.isNaN(dt.getTime()) || dt.getUTCFullYear() !== y || dt.getUTCMonth() + 1 !== mo || dt.getUTCDate() !== d) return null;
  return iso;
}

export function parseNumber(v: string): number | null {
  let s = v.trim().replace(/rp\.?/gi, "").replace(/\s/g, "");
  if (!s) return null;
  // "1.234.567" atau "1.234.567,50" (format Indonesia) vs "1,234,567.50" (format US)
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, "");
  else s = s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86_400_000);
}
function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function normalizeIcd10(v: string): string | null {
  const firstToken = v.split(/[#;|,\n]+/)[0] ?? "";
  const s = firstToken.trim().toUpperCase().replace(/\s/g, "");
  const m = s.match(/^([A-Z]\d{2})\.?(\d{1,2})?$/);
  if (!m) return null;
  return m[2] ? `${m[1]}.${m[2]}` : m[1];
}

export function parseAllIcd10(v: string): string[] {
  return v
    .split(/[#;|,\n]+/)
    .map((part) => normalizeIcd10(part))
    .filter((code): code is string => Boolean(code));
}

function parseSeverity(v: string): 1 | 2 | 3 | null {
  const s = v.trim().toLowerCase();
  if (!s) return null;
  if (["1", "i", "ringan"].includes(s)) return 1;
  if (["2", "ii", "sedang"].includes(s)) return 2;
  if (["3", "iii", "berat"].includes(s)) return 3;
  // Kode grouper INA-CBG (mis. J-1-20-III, I-4-10-II, K-4-17-I)
  const cbgMatch = s.match(/-(iii|ii|i|[123])$/);
  if (cbgMatch) {
    const tail = cbgMatch[1];
    if (tail === "iii" || tail === "3") return 3;
    if (tail === "ii" || tail === "2") return 2;
    if (tail === "i" || tail === "1") return 1;
  }
  const n = parseNumber(s);
  return n && n >= 1 && n <= 3 ? (Math.round(n) as 1 | 2 | 3) : null;
}

/** Kode wilayah Kemendagri/BPS 2 digit (dipakai pada data BPJS) -> kode ID-XX. */
export const KEMENDAGRI_PROVINCE: Record<string, string> = {
  "11": "ID-AC", "12": "ID-SU", "13": "ID-SB", "14": "ID-RI", "15": "ID-JA", "16": "ID-SS", "17": "ID-BE", "18": "ID-LA", "19": "ID-BB", "21": "ID-KR",
  "31": "ID-JK", "32": "ID-JB", "33": "ID-JT", "34": "ID-YO", "35": "ID-JI", "36": "ID-BT", "51": "ID-BA", "52": "ID-NB", "53": "ID-NT",
  "61": "ID-KB", "62": "ID-KT", "63": "ID-KS", "64": "ID-KI", "65": "ID-KU", "71": "ID-SA", "72": "ID-ST", "73": "ID-SN", "74": "ID-SG", "75": "ID-GO", "76": "ID-SR",
  "81": "ID-MA", "82": "ID-MU", "91": "ID-PB", "92": "ID-PB", "94": "ID-PA",
};

function provinceCode(v: string): string | null {
  const s = v.trim();
  if (!s) return null;
  if (/^\d{2}$/.test(s) && KEMENDAGRI_PROVINCE[s]) return KEMENDAGRI_PROVINCE[s];
  const byCode = INDONESIA_PROVINCES.find((p) => p.code.toLowerCase() === s.toLowerCase());
  if (byCode) return byCode.code;
  const n = normName(s);
  const byName = INDONESIA_PROVINCES.find((p) => normName(p.name) === n || normName(p.name).includes(n) || n.includes(normName(p.name)));
  return byName?.code ?? null;
}

/** "1", "KELAS 2", "III", "Kelas I" -> KELAS_n; kosong/tak dikenal -> TIDAK_DIKETAHUI (faktor biaya netral). */
export function parseTreatmentClass(v: string): "KELAS_1" | "KELAS_2" | "KELAS_3" | "TIDAK_DIKETAHUI" {
  const t = v.trim().toLowerCase().replace(/^kelas\s*/, "").replace(/^kls\s*/, "");
  if (["1", "i", "satu"].includes(t)) return "KELAS_1";
  if (["2", "ii", "dua"].includes(t)) return "KELAS_2";
  if (["3", "iii", "tiga"].includes(t)) return "KELAS_3";
  return "TIDAK_DIKETAHUI";
}

/** RITL / RJTL / rawat jalan / rawat inap. Angka mengikuti konvensi SEP: 1 = rawat inap, 2 = rawat jalan. */
export function parseCareLevel(v: string): "INAP" | "JALAN" | null {
  const t = v.trim().toLowerCase();
  if (!t) return null;
  if (/^(2|rj|rjtl|rjtp|rawat\s*jalan|jalan|outpatient|op)$/.test(t)) return "JALAN";
  if (/^(1|ri|ritl|ritp|rawat\s*inap|inap|inpatient|ip)$/.test(t)) return "INAP";
  return null;
}

function splitList(v: string): string[] {
  return v.split(/[#;|,\n]+/).map((x) => x.trim()).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Normalisasi utama
// ---------------------------------------------------------------------------
/** Nama diagnosis: tabel referensi aplikasi, lalu nama resmi ICD-10 dari statistik BPJS, terakhir "Diagnosis lain". */
function describeDx(code: string): string {
  return DIAGNOSIS_REFERENCE[code]?.description || icdDescription(code) || referenceFor(code).description;
}

function providerTypeOf(tier: string): Provider["type"] {
  const t = tier.trim().toUpperCase().replace(/^TIPE\s*/, "");
  if (t === "A") return "RS_KELAS_A";
  if (t === "C") return "RS_KELAS_C";
  return "RS_KELAS_B";
}

export function normalizeRows(rows: Record<string, string>[], mappings: FieldMapping[], ctx: NormalizeContext): NormalizeResult {
  const colFor = new Map<string, string>();
  mappings.forEach((m) => {
    if (m.canonical_field && m.status !== "UNMAPPED") colFor.set(m.canonical_field, m.source_field);
  });
  const get = (row: Record<string, string>, field: string): string => {
    const c = colFor.get(field);
    return c ? (row[c] ?? "").trim() : "";
  };

  const missingRequired = missingRequiredFields(new Set(colFor.keys()));
  // Tanpa kolom kode faskes (data mikro BPJS): faskes diturunkan sebagai strata dari provinsi/kota/kepemilikan/jenis/tipe.
  const deriveProvider = !colFor.has("provider_id");

  const rejected: RejectedRow[] = [];
  const claims: CanonicalClaim[] = [];
  const newProviders = new Map<string, Provider>();
  const seen = new Set<string>();
  let duplicates = 0;
  let requiredFilled = 0;
  let requiredTotal = 0;

  if (missingRequired.length > 0) {
    return {
      claims: [],
      newProviders: [],
      rejected: [{ row: 0, reason: `Field wajib belum dipetakan: ${missingRequired.join(", ")}` }],
      quality: { total_rows: rows.length, valid_rows: 0, invalid_rows: rows.length, duplicate_rows: 0, completeness_score: 0, validity_score: 0, missing_required_fields: missingRequired },
    };
  }

  rows.forEach((row, i) => {
    const rowNo = i + 1;
    const reject = (reason: string) => rejected.push({ row: rowNo, reason });

    REQUIRED_FIELDS.forEach((f) => {
      if (f === "provider_id" && deriveProvider) return;
      requiredTotal++;
      if (get(row, f)) requiredFilled++;
    });

    const claimId = get(row, "claim_id");
    if (!claimId) return reject("ID klaim kosong");
    if (seen.has(claimId) || ctx.existingClaimIds.has(claimId)) {
      duplicates++;
      return reject(`ID klaim duplikat: ${claimId}`);
    }

    const dx = normalizeIcd10(get(row, "primary_diagnosis"));
    if (!dx) return reject(`Kode ICD-10 tidak valid: "${get(row, "primary_diagnosis")}"`);

    const amount = parseNumber(get(row, "claim_amount"));
    if (amount === null || amount <= 0) return reject(`Total tagihan tidak valid: "${get(row, "claim_amount")}"`);

    let providerRaw = get(row, "provider_id");
    let derivedName = "";
    if (!providerRaw && deriveProvider) {
      const pv = provinceCode(get(row, "province")) || "ID-UNK";
      const parts = [pv, get(row, "city"), get(row, "provider_ownership"), get(row, "provider_kind"), get(row, "provider_tier")].map((x) => normName(x).toUpperCase()).filter(Boolean);
      providerRaw = `FKRTL-${parts.join("-")}`.slice(0, 80);
      const tier = get(row, "provider_tier");
      derivedName = ["Strata faskes", get(row, "provider_kind"), tier ? `tipe ${tier}` : "", get(row, "provider_ownership"), get(row, "city")].filter(Boolean).join(" ");
    }
    if (!providerRaw) return reject("Kode faskes kosong");

    let admission = parseDate(get(row, "admission_date"));
    let discharge = parseDate(get(row, "discharge_date"));
    let los = parseNumber(get(row, "length_of_stay"));
    if (get(row, "admission_date") && !admission) return reject(`Tanggal masuk tidak valid: "${get(row, "admission_date")}"`);
    if (get(row, "discharge_date") && !discharge) return reject(`Tanggal keluar tidak valid: "${get(row, "discharge_date")}"`);
    if (admission && discharge) {
      const d = daysBetween(admission, discharge);
      if (d < 0) return reject("Tanggal keluar sebelum tanggal masuk");
      los = los ?? d;
    } else if (admission && los !== null) discharge = addDays(admission, Math.round(los));
    else if (discharge && los !== null) admission = addDays(discharge, -Math.round(los));
    else if (admission) {
      discharge = admission;
      los = los ?? 0;
    } else if (discharge) {
      admission = discharge;
      los = los ?? 0;
    } else return reject("Tanggal masuk/keluar tidak tersedia");
    if (los === null || los < 0 || los > 365) return reject(`Lama rawat tidak wajar: ${los}`);
    const submission = addDays(discharge as string, 2);

    // ---- pasien (sudah dipseudonimkan saat upload; pastikan konsisten) ----
    const rawPid = get(row, "patient_id");
    const pid = rawPid.startsWith("PSN-") ? rawPid : rawPid ? pseudonymPatientId(rawPid) : pseudonymPatientId(`${claimId}-anon`);
    const nameRaw = get(row, "patient_name");
    const ageN = parseNumber(get(row, "patient_age"));
    const genderRaw = get(row, "patient_gender").toUpperCase();

    // ---- faskes ----
    let provider = ctx.providers.get(providerRaw) || newProviders.get(providerRaw);
    const provCode = provinceCode(get(row, "province")) || provider?.province_code || "ID-UNK";
    if (!provider) {
      const geo = INDONESIA_PROVINCES.find((p) => p.code === provCode);
      provider = {
        provider_id: providerRaw,
        name: get(row, "provider_name") || derivedName || providerRaw,
        type: providerTypeOf(get(row, "provider_tier")),
        // note: tipe A/B/C/D diambil dari data bila ada
        province_code: provCode,
        province_name: geo?.name || "Tidak diketahui",
        city: get(row, "city") ? (/^\d+$/.test(get(row, "city")) ? `Kab/kota ${get(row, "city")}` : get(row, "city")) : "—",
        address: "—",
        phone: "—",
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
        doctors: [],
        monthly_risk_trend: [],
      };
      newProviders.set(providerRaw, provider);
    }

    // ---- diagnosis ----
    const ref = referenceFor(dx);
    const sevParsed = parseSeverity(get(row, "severity_level"));
    const allDxCodes = parseAllIcd10(get(row, "primary_diagnosis"));
    const diagnoses: Diagnosis[] = [
      { code: dx, description: get(row, "diagnosis_description") || describeDx(dx), is_primary: true, severity: sevParsed ?? ref.expected_severity },
      ...allDxCodes.slice(1).map((secCode) => {
        const secRef = referenceFor(secCode);
        return { code: secCode, description: describeDx(secCode), is_primary: false, severity: secRef.expected_severity };
      }),
    ];

    // ---- tindakan ----
    const codes = splitList(get(row, "procedure_codes"));
    const costs = splitList(get(row, "procedure_costs")).map((c) => parseNumber(c));
    const procedures: Procedure[] = codes.map((c, idx) => ({
      code: c,
      description: PROCEDURE_REFERENCE[c]?.description || `Tindakan ${c}`,
      date: admission as string,
      cost: costs[idx] && (costs[idx] as number) > 0 ? (costs[idx] as number) : undefined,
    }));

    const careLevel = parseCareLevel(get(row, "care_level"));

    // ---- dokter ----
    const doctorName = get(row, "doctor_name");
    const doctorId = get(row, "doctor_id") || (doctorName ? `DR-${normName(doctorName).slice(0, 12).toUpperCase()}` : "DR-UNK");

    // ---- dokumen ----
    const evidence: EvidenceItem[] = [];
    const narrative = scrubText(get(row, "clinical_narrative"));
    const num = claimId.replace(/\W/g, "");
    if (narrative) {
      evidence.push({
        evidence_id: `DOC-${num}-01`,
        document_type: "RINGKASAN_MEDIS",
        title: "Resume Medis (dari dataset terunggah)",
        date: admission as string,
        excerpt: narrative.length > 160 ? `${narrative.slice(0, 157)}...` : narrative,
        content: narrative,
        status: "NEEDS_REVIEW",
      });
    }
    const lineItems = [`Total tagihan Rp ${Math.round(amount).toLocaleString("id-ID")}`, ...procedures.filter((p) => p.cost).map((p) => `${p.description} [${p.code}]: Rp ${(p.cost as number).toLocaleString("id-ID")}`)];
    evidence.push({
      evidence_id: `DOC-${num}-03`,
      document_type: "BUKTI_BILLING",
      title: "Rincian Tagihan (disusun dari kolom biaya dataset)",
      date: submission,
      excerpt: lineItems.slice(0, 2).join("; "),
      content: `Rincian tagihan: ${lineItems.join("; ")}.`,
      status: "NEEDS_REVIEW",
    });

    seen.add(claimId);
    const approved = parseNumber(get(row, "approved_tariff"));
    claims.push({
      claim_id: claimId,
      sep_number: claimId,
      patient: {
        patient_id: pid,
        name: nameRaw ? (/^([A-Z]\.\s?)+$/.test(nameRaw) ? nameRaw : initialsOnly(nameRaw)) : "—",
        age: ageN !== null ? Math.max(0, Math.round(ageN)) : 0,
        gender: genderRaw.startsWith("P") || genderRaw.startsWith("F") || genderRaw === "2" ? "P" : "L",
        bpjs_card_number: rawPid ? maskCardNumber(rawPid.replace(/\D/g, "") || "0000") : "—",
        province_code: provCode,
      },
      provider: { provider_id: provider.provider_id, name: provider.name, type: provider.type, province_code: provider.province_code, city: provider.city },
      service: {
        admission_date: admission as string,
        discharge_date: discharge as string,
        submission_date: submission,
        length_of_stay: Math.round(los),
        treatment_class: careLevel === "JALAN" ? "RAWAT_JALAN" : parseTreatmentClass(get(row, "treatment_class")),
        doctor_id: doctorId,
        doctor_name: doctorName || "Tidak dicantumkan",
        doctor_specialty: "—",
      },
      diagnoses,
      procedures,
      claim_amount: Math.round(amount),
      approved_tariff: approved && approved > 0 ? Math.round(approved) : undefined,
      medical_evidence: evidence,
      risk_score: 0,
      risk_level: "LOW",
      risk_signals: [],
      risk_findings: [],
      similar_claims: [],
      status: "PENDING_REVIEW",
      created_at: `${submission}T08:00:00Z`,
      updated_at: `${submission}T08:00:00Z`,
    });
  });

  const total = rows.length;
  const valid = claims.length;
  return {
    claims,
    newProviders: Array.from(newProviders.values()),
    rejected,
    quality: {
      total_rows: total,
      valid_rows: valid,
      invalid_rows: total - valid,
      duplicate_rows: duplicates,
      completeness_score: requiredTotal ? Number(((requiredFilled / requiredTotal) * 100).toFixed(1)) : 0,
      validity_score: total ? Number(((valid / total) * 100).toFixed(1)) : 0,
      missing_required_fields: [],
    },
  };
}

export function describeField(id: string): string {
  return CANONICAL_FIELDS.find((f) => f.id === id)?.label || id;
}
