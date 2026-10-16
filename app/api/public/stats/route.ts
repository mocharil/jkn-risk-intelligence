import { NextResponse } from "next/server";
import { getStore, memoized } from "@/lib/data/store";
import { evaluate } from "@/lib/eval/evaluate";
import { DETECTOR_REGISTRY } from "@/lib/risk/detectors";

/**
 * Statistik AGREGAT untuk halaman landing (publik). Tidak memuat data pasien/klaim individual selain
 * klaim demo sintetis CLM-10293 yang sudah teranonimkan. Seluruh angka dihitung dari data hasil analisis.
 */
export async function GET() {
  const data = memoized("public.stats", () => {
    const store = getStore();
    const hero = store.claims.find((c) => c.claim_id === "CLM-10293");
    const clone = hero?.similar_claims[0];
    const report = evaluate(store.claims, store.labels);
    return {
      dataset: "sintetis",
      claims: store.claims.length,
      flagged_claims: store.claims.filter((c) => c.risk_score >= 50).length,
      high_risk_claims: store.claims.filter((c) => c.risk_level === "HIGH" || c.risk_level === "CRITICAL").length,
      providers: store.providers.length,
      detectors: DETECTOR_REGISTRY.length,
      narratives_embedded: store.embeddings.size,
      embedding_model: store.meta.embedding_model,
      macro_f1: report.macro.f1,
      hero: hero
        ? {
            claim_id: hero.claim_id,
            amount: hero.claim_amount,
            peer_median: hero.approved_tariff,
            exposure: hero.tariff_difference,
            score: hero.risk_score,
            signals: hero.risk_signals.length,
            clone_partner: clone?.claim_id,
            clone_similarity: clone?.similarity_score,
          }
        : null,
    };
  });
  return NextResponse.json({ data }, { headers: { "Cache-Control": "public, max-age=60" } });
}
