import { NextRequest, NextResponse } from "next/server";
import { actorOf, guard } from "@/lib/auth/guard";
import { resetDemoStore } from "@/lib/data/store";

/** Reset ke dataset sintetis awal (menghapus data hasil ingest & keputusan). Hanya ADMIN. */
export async function POST(request: NextRequest) {
  if (process.env.ARSA_DISABLE_DEMO === "1" || process.env.ARSA_STRICT_PRODUCTION === "1") {
    return NextResponse.json({ error: "Reset data demo dinonaktifkan pada mode produksi ketat." }, { status: 403 });
  }
  const g = await guard(request, "admin.reset_demo");
  if (g.error) return g.error;
  const store = resetDemoStore(actorOf(g.user));
  return NextResponse.json({
    message: "Data demo berhasil direset ke kondisi awal.",
    total_claims: store.claims.length,
    total_investigations: store.investigations.length,
    hero_claim_status: store.claims.find((c) => c.claim_id === "CLM-10293")?.status,
  });
}
