import type { RiskLevel, RiskType } from "@/types/risk";

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

/** Label untuk kode apa pun; kode yang tidak dikenal dirapikan, tidak dibiarkan mentah. */
export const riskTypeName = (t: string) => RISK_TYPE_LABEL[t as RiskType] ?? t.toLowerCase().replace(/_/g, " ");
export const riskLevelName = (l: string) => RISK_LEVEL_LABEL[l as RiskLevel] ?? l.toLowerCase();
export const claimStatusName = (s: string) => CLAIM_STATUS_LABEL[s] ?? s.toLowerCase().replace(/_/g, " ");
