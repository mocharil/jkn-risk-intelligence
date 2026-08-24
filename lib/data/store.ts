import { CanonicalClaim } from "@/types/claim";
import { Investigation, InvestigationNote, InvestigationStatus } from "@/types/investigation";
import { Provider } from "@/types/provider";
import { Dataset } from "@/types/dataset";
import { DashboardKPIs, EmergingSignal, ProvinceRiskData } from "@/types/risk";
import { generateSyntheticClaims, SYNTHETIC_PROVIDERS } from "./synthetic-seed";
import { INDONESIA_PROVINCES } from "./indonesia-provinces";

interface GlobalDataStore {
  claims: CanonicalClaim[];
  investigations: Investigation[];
  providers: Provider[];
  datasets: Dataset[];
  emergingSignals: EmergingSignal[];
}

let storeInstance: GlobalDataStore | null = null;

function initializeStore(): GlobalDataStore {
  const { claims, investigations } = generateSyntheticClaims();
  
  const emergingSignals: EmergingSignal[] = [
    {
      signal_id: "SIG-492",
      risk_type: "UPCODING",
      title: "Severity Level 3 Upcoding Surge",
      description: "Detected a 34.2% spike in severity level 3 claims for gastroenteritis (A09) across 7 network hospital providers.",
      severity: "CRITICAL",
      change_percentage: 34.2,
      affected_providers_count: 7,
      potential_exposure: 42100000000, // Rp 42.1B
      confidence: 0.94,
      detected_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
      highlighted_claim_ids: ["CLM-10293", "CLM-10294", "CLM-10298"],
    },
    {
      signal_id: "SIG-488",
      risk_type: "PHANTOM_BILLING",
      title: "Digestive Surgery Claims Lacking OR Records",
      description: "Laparoscopic digestive surgery claims billed without operating room (OR) electronic log entries in East Java.",
      severity: "HIGH",
      change_percentage: 18.5,
      affected_providers_count: 4,
      potential_exposure: 18900000000,
      confidence: 0.89,
      detected_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      highlighted_claim_ids: ["CLM-10295", "CLM-10299"],
    },
    {
      signal_id: "SIG-482",
      risk_type: "CLONING",
      title: "Cross-Provider Medical Narrative Duplication",
      description: "Over 90% semantic similarity in clinical summaries across different patient admissions in South Jakarta & Bandung.",
      severity: "HIGH",
      change_percentage: 12.0,
      affected_providers_count: 3,
      potential_exposure: 9400000000,
      confidence: 0.92,
      detected_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      highlighted_claim_ids: ["CLM-10293", "CLM-10300"],
    },
  ];

  const defaultDatasets: Dataset[] = [
    {
      dataset_id: "DS-001",
      name: "JKN_National_Claims_August_2026.csv",
      source_format: "CSV",
      file_size_bytes: 48200000,
      row_count: 1284392,
      status: "READY",
      columns: [
        { name: "NO_SEP", detected_type: "string", sample_values: ["0045R0010826V0010293", "0045R0010826V0010294"], null_count: 0, total_count: 1284392, distinct_count: 1284392 },
        { name: "NO_KARTU", detected_type: "string", sample_values: ["0001892837461", "000189281001"], null_count: 0, total_count: 1284392, distinct_count: 948210 },
        { name: "KODE_PPK", detected_type: "string", sample_values: ["HOSP-01", "HOSP-02"], null_count: 0, total_count: 1284392, distinct_count: 2480 },
        { name: "NAMA_PPK", detected_type: "string", sample_values: ["RS Sehat Sentosa", "RS Medika Utama"], null_count: 0, total_count: 1284392, distinct_count: 2480 },
        { name: "DIAG_PRIMER", detected_type: "string", sample_values: ["A09", "K35.8", "J18.9"], null_count: 0, total_count: 1284392, distinct_count: 1420 },
        { name: "SEVERITY_LEVEL", detected_type: "number", sample_values: ["3", "2", "1"], null_count: 0, total_count: 1284392, distinct_count: 3 },
        { name: "LAMA_RAWAT", detected_type: "number", sample_values: ["6", "3", "2"], null_count: 0, total_count: 1284392, distinct_count: 45 },
        { name: "BIAYA_TAGIHAN", detected_type: "number", sample_values: ["18450000", "12500000"], null_count: 0, total_count: 1284392, distinct_count: 89400 },
        { name: "TARIF_INACBG", detected_type: "number", sample_values: ["3800000", "12500000"], null_count: 0, total_count: 1284392, distinct_count: 340 },
      ],
      mappings: [
        { source_field: "NO_SEP", canonical_field: "claim_id", confidence: 0.98, is_ai_suggested: true, status: "CONFIRMED" },
        { source_field: "NO_KARTU", canonical_field: "patient_id", confidence: 0.96, is_ai_suggested: true, status: "CONFIRMED" },
        { source_field: "KODE_PPK", canonical_field: "provider_id", confidence: 0.97, is_ai_suggested: true, status: "CONFIRMED" },
        { source_field: "DIAG_PRIMER", canonical_field: "primary_diagnosis", confidence: 0.95, is_ai_suggested: true, status: "CONFIRMED" },
        { source_field: "LAMA_RAWAT", canonical_field: "length_of_stay", confidence: 0.94, is_ai_suggested: true, status: "CONFIRMED" },
        { source_field: "BIAYA_TAGIHAN", canonical_field: "claim_amount", confidence: 0.96, is_ai_suggested: true, status: "CONFIRMED" },
      ],
      quality_summary: {
        total_rows: 1284392,
        valid_rows: 1279810,
        invalid_rows: 4582,
        duplicate_rows: 120,
        completeness_score: 99.6,
        validity_score: 99.2,
        missing_required_fields: [],
      },
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-01T02:30:00Z",
    },
    {
      dataset_id: "DS-002",
      name: "Private_Hospital_Inpatient_West_Java.csv",
      source_format: "CSV",
      file_size_bytes: 14200000,
      row_count: 342100,
      status: "MAPPING_REQUIRED",
      columns: [
        { name: "ID_TRANSAKSI_KLAIM", detected_type: "string", sample_values: ["TRX-99812", "TRX-99813"], null_count: 0, total_count: 342100, distinct_count: 342100 },
        { name: "NOMOR_PESERTA_BPJS", detected_type: "string", sample_values: ["0001928374", "0001928375"], null_count: 0, total_count: 342100, distinct_count: 290100 },
        { name: "KODE_RUMAH_SAKIT", detected_type: "string", sample_values: ["HOSP-02", "HOSP-03"], null_count: 0, total_count: 342100, distinct_count: 180 },
        { name: "ICD10_UTAMA", detected_type: "string", sample_values: ["A09", "K35.8"], null_count: 0, total_count: 342100, distinct_count: 890 },
        { name: "HARI_RAWAT", detected_type: "number", sample_values: ["5", "3"], null_count: 0, total_count: 342100, distinct_count: 30 },
        { name: "TOTAL_BIAYA_RS", detected_type: "number", sample_values: ["16800000", "9200000"], null_count: 0, total_count: 342100, distinct_count: 42000 },
      ],
      mappings: [
        { source_field: "ID_TRANSAKSI_KLAIM", canonical_field: "claim_id", confidence: 0.96, is_ai_suggested: true, status: "SUGGESTED" },
        { source_field: "NOMOR_PESERTA_BPJS", canonical_field: "patient_id", confidence: 0.95, is_ai_suggested: true, status: "SUGGESTED" },
        { source_field: "KODE_RUMAH_SAKIT", canonical_field: "provider_id", confidence: 0.97, is_ai_suggested: true, status: "SUGGESTED" },
        { source_field: "ICD10_UTAMA", canonical_field: "primary_diagnosis", confidence: 0.94, is_ai_suggested: true, status: "SUGGESTED" },
        { source_field: "HARI_RAWAT", canonical_field: "length_of_stay", confidence: 0.93, is_ai_suggested: true, status: "SUGGESTED" },
        { source_field: "TOTAL_BIAYA_RS", canonical_field: "claim_amount", confidence: 0.96, is_ai_suggested: true, status: "SUGGESTED" },
      ],
      created_at: "2026-08-15T10:00:00Z",
      updated_at: "2026-08-15T10:05:00Z",
    }
  ];

  return {
    claims,
    investigations,
    providers: SYNTHETIC_PROVIDERS,
    datasets: defaultDatasets,
    emergingSignals,
  };
}

export function getStore(): GlobalDataStore {
  if (!storeInstance) {
    storeInstance = initializeStore();
  }
  return storeInstance;
}

export function resetDemoStore(): GlobalDataStore {
  storeInstance = initializeStore();
  return storeInstance;
}

/**
 * Get Dashboard KPIs
 */
export function getDashboardKPIs(): DashboardKPIs {
  const store = getStore();
  const highRiskClaims = store.claims.filter((c) => c.risk_level === "CRITICAL" || c.risk_level === "HIGH");
  const criticalCount = store.claims.filter((c) => c.risk_level === "CRITICAL").length;
  const highCount = store.claims.filter((c) => c.risk_level === "HIGH").length;
  const mediumCount = store.claims.filter((c) => c.risk_level === "MEDIUM").length;
  const lowCount = store.claims.filter((c) => c.risk_level === "LOW").length;

  return {
    total_claims_analyzed: 1284392,
    high_risk_claims: 47281,
    potential_exposure: 824600000000, // Rp 824.6 Billion
    providers_at_risk: 128,
    trends: {
      claims_change_pct: 4.8,
      high_risk_change_pct: 2.4,
      exposure_change_pct: 1.8,
      providers_change_pct: -0.5,
      period: "Last 7 days",
    },
    ai_briefing: {
      summary:
        "AI Intelligence System detected an upcoding cluster across 7 hospitals in DKI Jakarta and West Java involving undocumented laparoscopic digestive procedures. Total estimated risk exposure is Rp 42.8 Billion with 94% model confidence.",
      key_findings: [
        "RS Sehat Sentosa demonstrates a 44.5% severity level 3 rate (peer benchmark median 18.2%).",
        "Hero claim CLM-10293 exhibits compound indicators of Upcoding, Phantom Billing, and Abnormal LOS.",
        "Cluster CLUSTER-42 indicates copy-paste clinical narratives across 12 consecutive inpatient claims.",
      ],
      confidence: 0.94,
      affected_providers: 7,
      potential_exposure: 42800000000,
      detected_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    },
    risk_distribution: {
      critical: criticalCount + 1247,
      high: highCount + 8934,
      medium: mediumCount + 37100,
      low: lowCount + 1237111,
    },
    risk_trends: [
      { date: "Aug 17", critical_count: 1180, high_count: 8400, medium_count: 35000, exposure_amount: 760000000000 },
      { date: "Aug 18", critical_count: 1195, high_count: 8520, medium_count: 35400, exposure_amount: 775000000000 },
      { date: "Aug 19", critical_count: 1210, high_count: 8640, medium_count: 35900, exposure_amount: 790000000000 },
      { date: "Aug 20", critical_count: 1225, high_count: 8780, medium_count: 36400, exposure_amount: 805000000000 },
      { date: "Aug 21", critical_count: 1238, high_count: 8870, medium_count: 36800, exposure_amount: 814000000000 },
      { date: "Aug 22", critical_count: 1244, high_count: 8910, medium_count: 37000, exposure_amount: 820000000000 },
      { date: "Aug 23", critical_count: 1247, high_count: 8934, medium_count: 37100, exposure_amount: 824600000000 },
    ],
  };
}

/**
 * Get Province Risk Aggregations for Indonesia Map
 */
export function getProvinceRiskData(): ProvinceRiskData[] {
  return INDONESIA_PROVINCES.map((prov) => {
    let riskLevel: ProvinceRiskData["risk_level"] = "LOW";
    let highRiskCount = 4;
    let exposure = 450000000;
    let dominant: ProvinceRiskData["dominant_risk_type"] = "UPCODING";
    let topProv: string[] = [];

    if (prov.code === "ID-JK") {
      riskLevel = "CRITICAL";
      highRiskCount = 184;
      exposure = 18450000000;
      dominant = "UPCODING";
      topProv = ["RS Sehat Sentosa", "Klinik Utama Sehat Bersama"];
    } else if (prov.code === "ID-JB") {
      riskLevel = "HIGH";
      highRiskCount = 88;
      exposure = 9240000000;
      dominant = "CLONING";
      topProv = ["RS Medika Utama"];
    } else if (prov.code === "ID-JI") {
      riskLevel = "HIGH";
      highRiskCount = 92;
      exposure = 11200000000;
      dominant = "PHANTOM_BILLING";
      topProv = ["RS Mitra Kasih Surabaya"];
    } else if (prov.code === "ID-SU") {
      riskLevel = "HIGH";
      highRiskCount = 72;
      exposure = 7800000000;
      dominant = "UPCODING";
      topProv = ["RS Prima Husada Medan"];
    } else if (prov.code === "ID-JT") {
      riskLevel = "MEDIUM";
      highRiskCount = 32;
      exposure = 3400000000;
      dominant = "ABNORMAL_LOS";
      topProv = ["RS Graha Medika Semarang"];
    } else if (prov.code === "ID-SN") {
      riskLevel = "MEDIUM";
      highRiskCount = 28;
      exposure = 2900000000;
      dominant = "PHANTOM_BILLING";
      topProv = ["RS Bintang Kasih Makassar"];
    }

    return {
      province_code: prov.code,
      province_name: prov.name,
      island_group: prov.island,
      latitude: prov.lat,
      longitude: prov.lng,
      total_claims: prov.code === "ID-JK" ? 420000 : 180000,
      high_risk_claims: highRiskCount,
      potential_exposure: exposure,
      dominant_risk_type: dominant,
      risk_level: riskLevel,
      top_providers: topProv,
    };
  });
}

/**
 * Mutation: Update Investigation Status
 */
export function updateInvestigationStatus(
  investigationId: string,
  newStatus: InvestigationStatus,
  authorName: string = "Aril Indra Permana",
  noteText?: string
): Investigation | null {
  const store = getStore();
  const inv = store.investigations.find((i) => i.investigation_id === investigationId);
  if (!inv) return null;

  inv.status = newStatus;
  inv.updated_at = new Date().toISOString();

  // Add system note
  const statusLabels: Record<InvestigationStatus, string> = {
    NEW: "Baru",
    UNDER_INVESTIGATION: "Dalam Investigasi",
    NEED_EVIDENCE: "Membutuhkan Bukti Tambahan",
    CONFIRMED_RISK: "Risiko Terkonfirmasi (Confirmed Risk)",
    FALSE_POSITIVE: "False Positive (Klaim Wajar)",
    CLOSED: "Ditutup",
  };

  const newNote: InvestigationNote = {
    note_id: `NOT-${Date.now()}`,
    author: authorName,
    role: "Investigator",
    content: noteText ? `Status diubah menjadi "${statusLabels[newStatus]}". Catatan: ${noteText}` : `Status investigasi diperbarui menjadi "${statusLabels[newStatus]}".`,
    created_at: new Date().toISOString(),
    type: "USER_NOTE",
  };

  inv.notes.unshift(newNote);

  // Sync back to Claim status
  const claim = store.claims.find((c) => c.claim_id === inv.claim_id);
  if (claim) {
    if (newStatus === "CONFIRMED_RISK") claim.status = "CONFIRMED_RISK";
    else if (newStatus === "FALSE_POSITIVE") claim.status = "FALSE_POSITIVE";
    else if (newStatus === "UNDER_INVESTIGATION" || newStatus === "NEED_EVIDENCE") claim.status = "IN_INVESTIGATION";
    claim.updated_at = new Date().toISOString();
  }

  return inv;
}

/**
 * Mutation: Add Note
 */
export function addInvestigationNote(
  investigationId: string,
  content: string,
  authorName: string = "Aril Indra Permana"
): InvestigationNote | null {
  const store = getStore();
  const inv = store.investigations.find((i) => i.investigation_id === investigationId);
  if (!inv) return null;

  const note: InvestigationNote = {
    note_id: `NOT-${Date.now()}`,
    author: authorName,
    role: "Senior Investigator",
    content,
    created_at: new Date().toISOString(),
    type: "USER_NOTE",
  };

  inv.notes.unshift(note);
  inv.updated_at = new Date().toISOString();
  return note;
}
