export interface ColumnProfile {
  name: string;
  detected_type: "string" | "number" | "date" | "boolean";
  sample_values: string[];
  null_count: number;
  total_count: number;
  distinct_count: number;
}

export interface FieldMapping {
  source_field: string;
  canonical_field: string;
  confidence: number; // 0.0 - 1.0
  is_ai_suggested: boolean;
  transformation_rule?: string;
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
  created_at: string;
  updated_at: string;
}
