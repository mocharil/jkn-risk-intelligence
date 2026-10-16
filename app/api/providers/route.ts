import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/auth/guard";
import { DatabaseService } from "@/lib/supabase/db-service";

export async function GET(request: NextRequest) {
  const g = await guard(request);
  if (g.error) return g.error;

  const sp = request.nextUrl.searchParams;
  const search = sp.get("search")?.toLowerCase() || "";
  const riskLevel = sp.get("risk_level");
  let filtered = await DatabaseService.getProviders();

  if (search) {
    filtered = filtered.filter((p) => p.name.toLowerCase().includes(search) || p.city?.toLowerCase().includes(search) || p.province_name?.toLowerCase().includes(search) || p.provider_id.toLowerCase().includes(search));
  }
  if (riskLevel && riskLevel !== "ALL") filtered = filtered.filter((p) => p.risk_level === riskLevel);
  filtered = [...filtered].sort((a, b) => b.risk_score - a.risk_score);

  return NextResponse.json({ data: filtered, total_count: filtered.length, is_supabase_connected: DatabaseService.isSupabaseConfigured() });
}
