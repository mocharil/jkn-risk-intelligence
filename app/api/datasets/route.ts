import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/data/store";
import { Dataset } from "@/types/dataset";

export async function GET() {
  const store = getStore();
  return NextResponse.json({ data: store.datasets });
}

export async function POST(request: NextRequest) {
  const store = getStore();
  const body = await request.json();

  const newDataset: Dataset = {
    dataset_id: `DS-${String(store.datasets.length + 1).padStart(3, "0")}`,
    name: body.name || "Upload_Klaim_Baru.csv",
    source_format: "CSV",
    file_size_bytes: body.size || 24500000,
    row_count: body.row_count || 150000,
    status: "MAPPING_REQUIRED",
    columns: body.columns || [
      { name: "NO_KLAIM", detected_type: "string", sample_values: ["KLM-001", "KLM-002"], null_count: 0, total_count: 150000, distinct_count: 150000 },
      { name: "ID_PESERTA", detected_type: "string", sample_values: ["P-101", "P-102"], null_count: 0, total_count: 150000, distinct_count: 120000 },
      { name: "KODE_FASKES", detected_type: "string", sample_values: ["HOSP-01", "HOSP-02"], null_count: 0, total_count: 150000, distinct_count: 50 },
      { name: "DIAGNOSIS_ICD", detected_type: "string", sample_values: ["A09", "K35.8"], null_count: 0, total_count: 150000, distinct_count: 400 },
      { name: "BIAYA", detected_type: "number", sample_values: ["15000000", "8000000"], null_count: 0, total_count: 150000, distinct_count: 12000 },
    ],
    mappings: [
      { source_field: "NO_KLAIM", canonical_field: "claim_id", confidence: 0.97, is_ai_suggested: true, status: "SUGGESTED" },
      { source_field: "ID_PESERTA", canonical_field: "patient_id", confidence: 0.95, is_ai_suggested: true, status: "SUGGESTED" },
      { source_field: "KODE_FASKES", canonical_field: "provider_id", confidence: 0.96, is_ai_suggested: true, status: "SUGGESTED" },
      { source_field: "DIAGNOSIS_ICD", canonical_field: "primary_diagnosis", confidence: 0.94, is_ai_suggested: true, status: "SUGGESTED" },
      { source_field: "BIAYA", canonical_field: "claim_amount", confidence: 0.96, is_ai_suggested: true, status: "SUGGESTED" },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  store.datasets.unshift(newDataset);
  return NextResponse.json({ data: newDataset });
}
