import { NextRequest, NextResponse } from "next/server";
import { actorOf, guard } from "@/lib/auth/guard";
import { getStore, recordAudit, refreshAggregates } from "@/lib/data/store";
import { analyzeAll } from "@/lib/risk/engine";

/** Menjalankan ulang pipeline analisis (embedding → kemiripan → detector → antrean). */
export async function POST(request: NextRequest) {
  const g = await guard(request, "analysis.run");
  if (g.error) return g.error;
  const body = await request.json().catch(() => ({}));
  const store = getStore();
  const summary = await analyzeAll(store, { forceLocal: body?.local === true });
  store.meta.last_analysis = summary;
  refreshAggregates(store);
  recordAudit({
    claim_id: "SYSTEM",
    actor: actorOf(g.user).name,
    actor_role: g.user.role,
    action: "ANALYSIS_RUN",
    previous_status: null,
    new_status: null,
    justification: `${summary.claims_analyzed} klaim, ${summary.findings_total} temuan, embedding ${summary.embedding_model}, ${summary.duration_ms} ms`,
  });
  return NextResponse.json({ data: summary });
}
