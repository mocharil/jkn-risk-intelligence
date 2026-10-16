import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/auth/guard";
import { DatabaseService } from "@/lib/supabase/db-service";

function intParam(v: string | null, def?: number): number | undefined {
  if (v === null) return def;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 1000) : def;
}

export async function GET(request: NextRequest) {
  const g = await guard(request);
  if (g.error) return g.error;

  const sp = request.nextUrl.searchParams;
  const result = await DatabaseService.getClaims({
    search: sp.get("search") || undefined,
    risk_type: sp.get("risk_type") || undefined,
    risk_level: sp.get("risk_level") || undefined,
    provider_id: sp.get("provider_id") || undefined,
    status: sp.get("status") || undefined,
    limit: intParam(sp.get("limit")),
    offset: intParam(sp.get("offset"), 0),
    lite: sp.get("full") !== "1",
  });

  return NextResponse.json({ data: result.data, total_count: result.total_count, is_supabase_connected: DatabaseService.isSupabaseConfigured() });
}
