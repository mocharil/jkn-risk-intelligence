import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/auth/guard";
import { DatabaseService } from "@/lib/supabase/db-service";
import { getStore, memoized } from "@/lib/data/store";
import { computeProviderNational } from "@/lib/analytics/provider-national";

export async function GET(request: NextRequest) {
  const g = await guard(request);
  if (g.error) return g.error;

  const sp = request.nextUrl.searchParams;
  const search = sp.get("search")?.toLowerCase() || "";
  const riskLevel = sp.get("risk_level");
  const province = sp.get("province");
  let filtered = await DatabaseService.getProviders();

  if (search) {
    filtered = filtered.filter((p) => p.name.toLowerCase().includes(search) || p.city?.toLowerCase().includes(search) || p.province_name?.toLowerCase().includes(search) || p.provider_id.toLowerCase().includes(search));
  }
  if (riskLevel && riskLevel !== "ALL") filtered = filtered.filter((p) => p.risk_level === riskLevel);
  if (province && province !== "ALL") filtered = filtered.filter((p) => p.province_code === province);
  filtered = [...filtered].sort((a, b) => b.risk_score - a.risk_score || b.potential_exposure - a.potential_exposure);

  const store = getStore();
  const national = memoized("providers.national", () => computeProviderNational(store));
  const data = filtered.map((p) => ({ ...p, national: national.get(p.provider_id) }));

  return NextResponse.json({ data, total_count: data.length, is_supabase_connected: DatabaseService.isSupabaseConfigured() });
}
