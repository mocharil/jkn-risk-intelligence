export type RiskType = "UPCODING" | "CLONING" | "PHANTOM_BILLING" | "ABNORMAL_LOS" | "UNBUNDLING" | "INFLATED_BILLS" | "REPEAT_BILLING" | "READMISSION";

export const ALL_RISK_TYPES: RiskType[] = ["UPCODING", "CLONING", "PHANTOM_BILLING", "ABNORMAL_LOS", "UNBUNDLING", "INFLATED_BILLS", "REPEAT_BILLING", "READMISSION"];

export type RiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface RiskEvidenceRef {
  evidence_id: string;
  document_type: string;
  claim_statement: string;
  supports_finding: boolean;
  /** Kutipan verbatim dari dokumen sumber (dapat diverifikasi auditor). */
  excerpt?: string;
  /** Bila bukti berasal dari klaim lain (mis. klaim yang mirip). */
  source_claim_id?: string;
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
  /** Id aturan deterministik yang memicu temuan ini. */
  rule_id?: string;
  /** Penjelasan generatif (LLM) – hanya boleh mengutip evidence_id yang ada. */
  ai_explanation?: { text: string; source: "llm" | "deterministic"; provider?: string; model?: string; cited_evidence_ids: string[] };
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
  /** Akhir jendela analisis (tanggal pengajuan klaim terbaru), bukan waktu jam dinding. */
  detected_at: string;
  recent_count?: number;
  previous_count?: number;
  window_days?: number;
  highlighted_claim_ids: string[];
}

/** Posisi provinsi terhadap statistik resmi BPJS (2018); hanya pada respons API. */
export interface ProvinceNational {
  participants: number;
  admission_rate_per_10k: number;
  admissions_est: number;
  cost_per_admission: number;
  /** Biaya per admisi provinsi / rerata nasional. */
  cost_index: number;
  fkrtl_count: number;
  fkrtl_per_100k: number;
  /** Pangsa klaim di data ini vs pangsa admisi RITL nasional provinsi tsb. */
  dataset_share: number;
  national_share: number;
  /** Tagihan / rerata nasional untuk campuran kelas rawat yang sama (null bila tak ada klaim). */
  cost_ratio: number | null;
  small_sample: boolean;
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
  /** Skor risiko provinsi (0-99) dari entityRiskScore; level diturunkan darinya. */
  risk_score?: number;
  national?: ProvinceNational;
}

export interface TrendPoint {
  date: string;
  critical_count: number;
  high_count: number;
  medium_count: number;
  exposure_amount: number;
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
    /** Asal ringkasan: 'llm' (dengan sitasi) atau 'deterministic' (templat dari agregasi). */
    source?: "llm" | "deterministic";
    provider?: string;
    model?: string;
    cited_signal_ids?: string[];
    /** true = briefing LLM sedang disusun di latar belakang; klien dapat mengambilnya lewat /api/dashboard/briefing. */
    pending?: boolean;
  };
  risk_distribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  risk_trends: TrendPoint[];
  /** Tanggal pengajuan klaim terbaru pada data; semua "N hari terakhir" dihitung mundur dari tanggal ini. */
  as_of: string;
  /** Deret tren per rentang: 7 & 30 hari harian, 90 hari per minggu. */
  trend_series: Record<"7" | "30" | "90", TrendPoint[]>;
  risk_by_type?: Array<{
    risk_type: RiskType;
    claim_count: number;
    potential_exposure: number;
    avg_confidence: number;
  }>;
}
