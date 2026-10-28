import { NextRequest, NextResponse } from "next/server";
import { actorOf, guard } from "@/lib/auth/guard";
import { discardDataset } from "@/lib/ingest/service";

/** Membuang dataset yang belum selesai diproses (menunggu pemetaan atau gagal). Dataset READY dan bawaan tidak dapat dibuang. */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const g = await guard(request, "dataset.upload");
  if (g.error) return g.error;
  try {
    discardDataset(params.id, actorOf(g.user));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Gagal membuang dataset" }, { status: 422 });
  }
}
