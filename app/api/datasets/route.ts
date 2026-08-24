import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStore } from "@/lib/data/store";
import { Dataset } from "@/types/dataset";

export async function GET() {
  const admin = createAdminClient();

  if (admin) {
    try {
      const { data, error } = await admin.from("datasets").select("*").order("created_at", { ascending: false });
      if (!error && data && data.length > 0) {
        return NextResponse.json({ data });
      }
    } catch (err) {
      console.warn("Supabase datasets fallback:", err);
    }
  }

  const store = getStore();
  return NextResponse.json({ data: store.datasets });
}

export async function POST(request: NextRequest) {
  const admin = createAdminClient();
  const body = await request.json();

  const store = getStore();
  const newDatasetId = `DS-${String(store.datasets.length + 1).padStart(3, "0")}`;

  const newDataset: Dataset = {
    dataset_id: newDatasetId,
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
      { name: "BIAYA_TAGIHAN", detected_type: "number", sample_values: ["15000000", "8000000"], null_count: 0, total_count: 150000, distinct_count: 12000 },
      { name: "TGL_MASUK", detected_type: "date", sample_values: ["2026-08-01", "2026-08-05"], null_count: 0, total_count: 150000, distinct_count: 31 },
      { name: "TGL_KELUAR", detected_type: "date", sample_values: ["2026-08-07", "2026-08-10"], null_count: 0, total_count: 150000, distinct_count: 31 },
    ],
    mappings: [
      { source_field: "NO_KLAIM", canonical_field: "claim_id", confidence: 0.98, is_ai_suggested: true, status: "SUGGESTED" },
      { source_field: "ID_PESERTA", canonical_field: "patient_id", confidence: 0.95, is_ai_suggested: true, status: "SUGGESTED" },
      { source_field: "KODE_FASKES", canonical_field: "provider_id", confidence: 0.96, is_ai_suggested: true, status: "SUGGESTED" },
      { source_field: "DIAGNOSIS_ICD", canonical_field: "primary_diagnosis", confidence: 0.95, is_ai_suggested: true, status: "SUGGESTED" },
      { source_field: "BIAYA_TAGIHAN", canonical_field: "claim_amount", confidence: 0.96, is_ai_suggested: true, status: "SUGGESTED" },
      { source_field: "TGL_MASUK", canonical_field: "admission_date", confidence: 0.94, is_ai_suggested: true, status: "SUGGESTED" },
      { source_field: "TGL_KELUAR", canonical_field: "discharge_date", confidence: 0.94, is_ai_suggested: true, status: "SUGGESTED" },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Directly insert into Supabase if configured
  if (admin) {
    try {
      await admin.from("datasets").insert({
        dataset_id: newDataset.dataset_id,
        name: newDataset.name,
        source_format: newDataset.source_format,
        file_size_bytes: newDataset.file_size_bytes,
        row_count: newDataset.row_count,
        status: newDataset.status,
        columns: newDataset.columns,
        mappings: newDataset.mappings,
        created_at: newDataset.created_at,
        updated_at: newDataset.updated_at,
      });
    } catch (err) {
      console.warn("Supabase dataset insert error:", err);
    }
  }

  // Also update store
  store.datasets.unshift(newDataset);
  return NextResponse.json({ data: newDataset });
}
