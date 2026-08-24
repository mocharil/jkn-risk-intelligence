import { NextResponse } from "next/server";
import { DatabaseService } from "@/lib/supabase/db-service";

export async function GET() {
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
