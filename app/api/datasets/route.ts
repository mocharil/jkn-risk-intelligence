import { NextRequest, NextResponse } from "next/server";
import { actorOf, guard } from "@/lib/auth/guard";
import { getStore } from "@/lib/data/store";
import { createDatasetFromUpload } from "@/lib/ingest/service";

export async function GET(request: NextRequest) {
  const g = await guard(request);
  if (g.error) return g.error;
  return NextResponse.json({ data: getStore().datasets });
}

/** Upload multipart (field `file`): parse → anonimisasi → profiling → usulan mapping. */
export async function POST(request: NextRequest) {
  const g = await guard(request, "dataset.upload");
  if (g.error) return g.error;

  let file: File | null = null;
  try {
    const form = await request.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch {
    return NextResponse.json({ error: "Gunakan multipart/form-data dengan field 'file'" }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
  if (!/\.(csv|tsv|txt|xlsx|xls|json)$/i.test(file.name)) return NextResponse.json({ error: "Format tidak didukung. Gunakan CSV, XLSX, atau JSON." }, { status: 415 });

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const res = await createDatasetFromUpload(buffer, file.name, actorOf(g.user));
    return NextResponse.json({ data: res.dataset, mapping_engine: res.engine, note: res.note, truncated: res.truncated });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Gagal memproses file" }, { status: 422 });
  }
}
