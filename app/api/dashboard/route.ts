import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/auth/guard";
import { DatabaseService } from "@/lib/supabase/db-service";

export async function GET(request: NextRequest) {
  const g = await guard(request);
  if (g.error) return g.error;

  const [kpis, provinceRisk, emergingSignals, providers] = await Promise.all([
    DatabaseService.getDashboardKPIs(),
    DatabaseService.getProvinceRiskData(),
    DatabaseService.getEmergingSignals(),
    DatabaseService.getProviders(),
  ]);

  return NextResponse.json({
    kpis,
    province_risk: provinceRisk,
    emerging_signals: emergingSignals,
    top_providers: providers.slice(0, 5),
    is_supabase_connected: DatabaseService.isSupabaseConfigured(),
  });
}
