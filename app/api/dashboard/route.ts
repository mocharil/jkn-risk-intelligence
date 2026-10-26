import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/auth/guard";
import { DatabaseService } from "@/lib/supabase/db-service";
import { getStore, memoized } from "@/lib/data/store";
import { computeWorkflow } from "@/lib/analytics/aggregates";
import { computeProvinceNational } from "@/lib/analytics/provider-national";

export async function GET(request: NextRequest) {
  const g = await guard(request);
  if (g.error) return g.error;

  const [kpis, provinceRisk, emergingSignals, providers] = await Promise.all([
    DatabaseService.getDashboardKPIs(),
    DatabaseService.getProvinceRiskData(),
    DatabaseService.getEmergingSignals(),
    DatabaseService.getProviders(),
  ]);

  const store = getStore();
  const meta = memoized("dashboard.meta", () => {
    let first = "9999-12-31";
    for (const c of store.claims) if (c.service.submission_date < first) first = c.service.submission_date;
    const ingested = store.ingestedClaimIds.size;
    return {
      first_submission_date: store.claims.length ? first : null,
      ingested_claims: ingested,
      // Dataset bawaan = sintetis berlabel; bila ada unggahan, data bercampur.
      data_mode: ingested === 0 ? ("sintetis" as const) : ("campuran" as const),
      datasets_ready: store.datasets.filter((d) => d.status === "READY").length,
      analyzed_at: store.meta.analyzed_at ?? null,
      embedding_model: store.meta.embedding_model ?? null,
    };
  });

  const provinceNational = memoized("province.national", () => computeProvinceNational(store));

  // Faskes prioritas = skor risiko tertinggi (getProviders() terurut menurut eksposur, bukan skor).
  const topProviders = [...providers].sort((a, b) => b.risk_score - a.risk_score || b.potential_exposure - a.potential_exposure).slice(0, 5);

  return NextResponse.json({
    kpis,
    province_risk: provinceRisk.map((p) => ({ ...p, national: provinceNational.get(p.province_code) })),
    emerging_signals: emergingSignals,
    top_providers: topProviders,
    providers_total: providers.length,
    workflow: computeWorkflow(store.investigations),
    meta,
    is_supabase_connected: DatabaseService.isSupabaseConfigured(),
  });
}
