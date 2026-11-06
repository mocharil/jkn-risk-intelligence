import type { RiskLevel, RiskType } from "@/types/risk";
import type { InvestigationStatus } from "@/types/investigation";

/** Nama jenis risiko yang sama di lencana antrean, berkas kasus, dan jawaban Copilot. */
export const RISK_TYPE_LABEL: Record<RiskType, string> = {
  UPCODING: "Upcoding",
  CLONING: "Cloning",
  PHANTOM_BILLING: "Phantom Billing",
  ABNORMAL_LOS: "LOS Anomali",
  UNBUNDLING: "Unbundling",
  INFLATED_BILLS: "Inflasi Tagihan",
  REPEAT_BILLING: "Tagihan Berulang",
  READMISSION: "Readmisi Dini",
};

export const RISK_LEVEL_LABEL: Record<RiskLevel, string> = {
  CRITICAL: "Kritis",
  HIGH: "Tinggi",
  MEDIUM: "Sedang",
  LOW: "Rendah",
};

export const CLAIM_STATUS_LABEL: Record<string, string> = {
  NEW: "Baru",
  FLAGGED: "Ditandai",
  IN_QUEUE: "Dalam Antrean",
  UNDER_INVESTIGATION: "Diinvestigasi",
  NEED_EVIDENCE: "Butuh Bukti",
  CONFIRMED_RISK: "Risiko Terkonfirmasi",
  FALSE_POSITIVE: "Positif Palsu",
  CLEARED: "Normal / Lolos",
  CLEAN: "Normal / Lolos",
  PENDING_REVIEW: "Menunggu tinjauan",
  IN_INVESTIGATION: "Diinvestigasi",
  RESOLVED_VALID: "Wajar / lolos",
};

/** Status kasus investigasi (alur kerja), berbeda dari status klaim di CLAIM_STATUS_LABEL. */
export const INVESTIGATION_STATUS_LABEL: Record<InvestigationStatus, string> = {
  NEW: "Baru",
  UNDER_INVESTIGATION: "Dalam Investigasi",
  NEED_EVIDENCE: "Membutuhkan Bukti Tambahan",
  CONFIRMED_RISK: "Risiko Terkonfirmasi",
  FALSE_POSITIVE: "False Positive (Klaim Wajar)",
  ESCALATED: "Dieskalasi ke Komite Medis",
  CLOSED: "Ditutup",
};

/** Status apa pun (kasus atau klaim) menjadi teks yang dapat dibaca; yang tidak dikenal dirapikan. */
export const statusText = (s: string) => INVESTIGATION_STATUS_LABEL[s as InvestigationStatus] ?? CLAIM_STATUS_LABEL[s] ?? s.toLowerCase().replace(/_/g, " ");

const TYPE_CODE = new RegExp(String.raw`\b(${Object.keys(RISK_TYPE_LABEL).join("|")})\b`, "g");
const LEVEL_CODE_IN_PARENS = new RegExp(String.raw`\((${Object.keys(RISK_LEVEL_LABEL).join("|")})\)`, "g");

/**
 * Teks bebas (keluaran model, ringkasan) yang memuat kode mentah dirapikan dengan nama yang dipakai antarmuka:
 * "UPCODING" menjadi "Upcoding", "(CRITICAL)" menjadi "(Kritis)". Jangan dipakai pada teks yang masih memuat id sitasi.
 */
export function humanizeRiskCodes(text: string): string {
  return text.replace(TYPE_CODE, (m) => RISK_TYPE_LABEL[m as RiskType]).replace(LEVEL_CODE_IN_PARENS, (_, l: string) => `(${RISK_LEVEL_LABEL[l as RiskLevel]})`);
}

/** Label untuk kode apa pun; kode yang tidak dikenal dirapikan, tidak dibiarkan mentah. */
export const riskTypeName = (t: string) => RISK_TYPE_LABEL[t as RiskType] ?? t.toLowerCase().replace(/_/g, " ");
export const riskLevelName = (l: string) => RISK_LEVEL_LABEL[l as RiskLevel] ?? l.toLowerCase();
export const claimStatusName = (s: string) => CLAIM_STATUS_LABEL[s] ?? s.toLowerCase().replace(/_/g, " ");
