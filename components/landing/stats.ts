export interface PublicStats {
  claims: number;
  flagged_claims: number;
  high_risk_claims: number;
  detectors: number;
  narratives_embedded: number;
  macro_f1: number;
  provinces: number;
  queue_cases: number;
  providers: number;
  exposure_total: number;
  risky_providers: number;
  workflow: { new: number; in_progress: number; completed: number; critical: number };
  top_provider: { name: string; peer_gap_pct: number | null } | null;
  province_map: Array<{ code: string; name: string; lat: number; lng: number; score: number; high: number; claims: number }>;
  top_provinces: Array<{ name: string; high: number; claims: number }>;
  top_providers: Array<{ name: string; risk_score: number; high_risk_claims: number; total_claims: number; exposure: number; dominant_risk_type: string }>;
  top_claims: Array<{ claim_id: string; risk_score: number; signals: string[]; exposure: number }>;
  audit: { entries: number; valid: boolean };
  hero: { claim_id?: string; clone_similarity?: number } | null;
}

export const RISK_LABEL: Record<string, string> = {
  UPCODING: "Upcoding",
  CLONING: "Kloning narasi",
  PHANTOM_BILLING: "Klaim fiktif",
  ABNORMAL_LOS: "Lama rawat janggal",
  UNBUNDLING: "Unbundling",
  INFLATED_BILLS: "Tagihan membengkak",
  REPEAT_BILLING: "Tagihan berulang",
  READMISSION: "Rawat ulang dini",
};
