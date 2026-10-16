export interface ColumnProfile {
  name: string;
  detected_type: "string" | "number" | "date" | "boolean";
  sample_values: string[];
  null_count: number;
  total_count: number;
  distinct_count: number;
  /** Jenis data pribadi yang terdeteksi pada kolom ini (ditangani saat upload). */
  pii?: "NIK" | "CARD" | "PATIENT_ID" | "NAME" | "ADDRESS" | "PHONE" | "EMAIL" | "FREE_TEXT";
  /** Perlakuan yang sudah diterapkan: nilai di dataset tersimpan TIDAK lagi berisi data pribadi asli. */
  pii_treatment?: "PSEUDONYMIZED" | "INITIALS_ONLY" | "DROPPED" | "SCRUBBED";
}

export interface FieldMapping {
  source_field: string;
  canonical_field: string;
  confidence: number; // 0.0 - 1.0
  is_ai_suggested: boolean;
  transformation_rule?: string;
  /** Asal usulan: "llm" (LLM), "heuristic" (nama kolom + pola nilai), atau "manual". */
  suggested_by?: "llm" | "heuristic" | "manual";
  reason?: string;
  status: "CONFIRMED" | "SUGGESTED" | "UNMAPPED";
}

export interface DataQualitySummary {
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  completeness_score: number; // percentage e.g. 98.4
  validity_score: number;
  missing_required_fields: string[];
}

export interface RejectedRow {
  row: number; // nomor baris data (mulai 1)
  reason: string;
}

export interface AnonymizationReport {
  columns_dropped: string[];
  columns_pseudonymized: string[];
  columns_initials: string[];
  columns_scrubbed: string[];
}

export interface Dataset {
  dataset_id: string;
  name: string;
  source_format: "CSV" | "JSON" | "EXCEL";
  file_size_bytes: number;
  row_count: number;
  status: "UPLOADED" | "PROFILING" | "MAPPING_REQUIRED" | "NORMALIZING" | "READY" | "ERROR";
  columns: ColumnProfile[];
  mappings: FieldMapping[];
  quality_summary?: DataQualitySummary;
  rejected_rows?: RejectedRow[];
  anonymization?: AnonymizationReport;
  /** Hasil normalisasi + analisis setelah mapping dikonfirmasi. */
  result?: { claims_ingested: number; findings_total: number; flagged_claims: number; investigations_created: number; embedding_model: string };
  error_message?: string;
  created_at: string;
  updated_at: string;
}
