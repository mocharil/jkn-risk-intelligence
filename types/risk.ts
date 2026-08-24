export type RiskType = "UPCODING" | "CLONING" | "PHANTOM_BILLING" | "ABNORMAL_LOS";

export type RiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface RiskEvidenceRef {
  evidence_id: string;
  document_type: string;
  claim_statement: string;
  supports_finding: boolean;
}

export interface RiskFinding {
  risk_type: RiskType;
  risk_score: number; // 0 - 100
  confidence: number; // 0.0 - 1.0
  verdict: RiskLevel;
  title: string;
  summary: string;
  evidence: RiskEvidenceRef[];
  missing_evidence: string[];
  recommended_actions: string[];
  limitations: string[];
  metrics?: {
    peer_benchmark_median?: number;
    actual_value?: number;
    variance_percentage?: number;
  };
}

export interface EmergingSignal {
  signal_id: string;
  risk_type: RiskType;
  title: string;
  description: string;
  severity: RiskLevel;
  change_percentage: number;
  affected_providers_count: number;
  potential_exposure: number; // in IDR
  confidence: number;
  detected_at: string;
  highlighted_claim_ids: string[];
}

export interface ProvinceRiskData {
  province_code: string;
  province_name: string;
  island_group: "Sumatera" | "Jawa" | "Kalimantan" | "Sulawesi" | "Bali & Nusa Tenggara" | "Maluku & Papua";
  latitude: number;
  longitude: number;
  total_claims: number;
  high_risk_claims: number;
  potential_exposure: number;
  dominant_risk_type: RiskType;
  risk_level: RiskLevel;
  top_providers: string[];
}

export interface DashboardKPIs {
  total_claims_analyzed: number;
  high_risk_claims: number;
  potential_exposure: number; // in IDR
  providers_at_risk: number;
  trends: {
    claims_change_pct: number;
    high_risk_change_pct: number;
    exposure_change_pct: number;
    providers_change_pct: number;
    period: string;
  };
  ai_briefing: {
    summary: string;
    key_findings: string[];
    confidence: number;
    affected_providers: number;
    potential_exposure: number;
    detected_at: string;
  };
  risk_distribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  risk_trends: Array<{
    date: string;
    critical_count: number;
    high_count: number;
    medium_count: number;
    exposure_amount: number;
  }>;
}
