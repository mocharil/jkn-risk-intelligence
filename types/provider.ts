import { RiskLevel, RiskType } from "./risk";

export interface Doctor {
  doctor_id: string;
  name: string;
  specialty: string;
  sip_number: string;
  total_claims_handled: number;
  high_risk_claims_count: number;
  risk_score: number;
  provider_id: string;
}

export interface Provider {
  provider_id: string;
  name: string;
  type: "RS_KELAS_A" | "RS_KELAS_B" | "RS_KELAS_C" | "RS_KELAS_D" | "KLINIK_UTAMA" | "PUSKESMAS";
  province_code: string;
  province_name: string;
  city: string;
  address: string;
  phone: string;
  risk_score: number; // 0 - 100
  risk_level: RiskLevel;
  total_claims: number;
  high_risk_claims: number;
  potential_exposure: number;
  dominant_risk_type: RiskType;
  risk_composition: {
    upcoding_pct: number;
    cloning_pct: number;
    phantom_billing_pct: number;
    abnormal_los_pct: number;
  };
  peer_comparison: {
    severity_3_rate: { provider: number; peer_median: number };
    avg_los_days: { provider: number; peer_median: number };
    avg_claim_amount: { provider: number; peer_median: number };
    readmission_rate_pct: { provider: number; peer_median: number };
  };
  doctors: Doctor[];
  monthly_risk_trend: Array<{
    month: string;
    risk_score: number;
    claim_count: number;
  }>;
}
