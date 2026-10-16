import { NextRequest, NextResponse } from "next/server";
import { buildGraph } from "@/lib/analytics/graph";
import { guard } from "@/lib/auth/guard";
import { getStore } from "@/lib/data/store";

export async function GET(request: NextRequest) {
  const g = await guard(request);
  if (g.error) return g.error;
  const sp = request.nextUrl.searchParams;
  const data = buildGraph(getStore(), { claim_id: sp.get("claim_id") || undefined, provider_id: sp.get("provider_id") || undefined });
  return NextResponse.json({ data });
}
