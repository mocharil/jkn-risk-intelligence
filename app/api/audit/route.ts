import { NextRequest, NextResponse } from "next/server";
import { verifyChain } from "@/lib/audit/chain";
import { guard } from "@/lib/auth/guard";
import { getStore } from "@/lib/data/store";

/** GET /api/audit?claim_id=&limit= → entri (terbaru dulu) + hasil verifikasi seluruh rantai hash. */
export async function GET(request: NextRequest) {
  const g = await guard(request, "audit.verify");
  if (g.error) return g.error;
  const sp = request.nextUrl.searchParams;
  const store = getStore();
  const claimId = sp.get("claim_id");
  const limit = Math.min(Math.max(Number.parseInt(sp.get("limit") || "100", 10) || 100, 1), 500);

  const entries = [...store.auditLog].reverse().filter((e) => !claimId || e.claim_id === claimId || e.claim_id === "SYSTEM").slice(0, limit);
  return NextResponse.json({ data: entries, total: store.auditLog.length, verification: verifyChain(store.auditLog) });
}
