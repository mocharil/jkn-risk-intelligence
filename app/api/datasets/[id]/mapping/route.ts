import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/data/store";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const store = getStore();
  const datasetId = params.id;
  const body = await request.json();
  const { mappings, action } = body;

  const dataset = store.datasets.find((d) => d.dataset_id === datasetId);
  if (!dataset) {
    return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
  }

  if (mappings) {
    dataset.mappings = mappings;
    dataset.updated_at = new Date().toISOString();
  }

  if (action === "CONFIRM_AND_NORMALIZE") {
    dataset.status = "READY";
    dataset.quality_summary = {
      total_rows: dataset.row_count,
      valid_rows: Math.round(dataset.row_count * 0.994),
      invalid_rows: Math.round(dataset.row_count * 0.006),
      duplicate_rows: 45,
      completeness_score: 99.4,
      validity_score: 99.1,
      missing_required_fields: [],
    };
  }

  return NextResponse.json({ data: dataset });
}
