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

/** Posisi faskes terhadap statistik resmi BPJS; hanya pada respons API. */
export interface ProviderNational {
  year: string;
  claims: number;
  /** Kurang dari 20 klaim: skor dan rasio belum dapat disimpulkan. */
  small_sample: boolean;
  /** Tagihan faskes / rerata nasional untuk campuran kelas rawat yang sama (1,0 = sebanding). */
  cost_ratio: number | null;
  los_ratio: number | null;
  class_mix: Record<string, number>;
  province: {
    name: string;
    participants: number;
    fkrtl_count: number;
    fkrtl_per_100k: number;
    fkrtl_per_100k_national_mean: number;
    admission_rate_per_10k: number;
    cost_per_admission: number;
    cost_index: number;
  } | null;
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
    unbundling_pct?: number;
    inflated_bills_pct?: number;
    repeat_billing_pct?: number;
    readmission_pct?: number;
  };
  peer_comparison: {
    severity_3_rate: { provider: number; peer_median: number };
    avg_los_days: { provider: number; peer_median: number };
    avg_claim_amount: { provider: number; peer_median: number };
    readmission_rate_pct: { provider: number; peer_median: number };
  };
  doctors: Doctor[];
  /** Hanya pada respons API. */
  national?: ProviderNational;
  monthly_risk_trend: Array<{
    month: string;
    risk_score: number;
    claim_count: number;
  }>;
}
