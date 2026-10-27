import { NextResponse } from "next/server";
import { getStore, memoized } from "@/lib/data/store";
import { evaluate } from "@/lib/eval/evaluate";
import { DETECTOR_REGISTRY } from "@/lib/risk/detectors";
import { verifyChain } from "@/lib/audit/chain";
import { computeDashboardKPIs, computeProvinceRisk } from "@/lib/analytics/aggregates";
import { pickSpotlight } from "@/lib/analytics/spotlight";

/**
 * Statistik AGREGAT untuk halaman landing (publik). Tidak memuat data pasien/klaim individual selain
 * satu klaim sintetis teranonimkan sebagai contoh. Seluruh angka dan contoh dihitung dari data hasil analisis, tanpa nilai tulisan tangan.
 */
export async function GET() {
  const data = memoized("public.stats", () => {
    const store = getStore();
    // Pasangan klaim paling mirip (temuan cloning) dari hasil analisis nyata.
    let clone: { claim_id: string; partner: string; similarity: number } | undefined;
    for (const c of store.claims) {
      if (!c.risk_signals.includes("CLONING")) continue;
      const top = c.similar_claims[0];
      if (top && (!clone || top.similarity_score > clone.similarity)) clone = { claim_id: c.claim_id, partner: top.claim_id, similarity: top.similarity_score };
    }
    const report = evaluate(store.claims, store.labels);
    const inv = store.investigations;
    const doneStatus = new Set(["CONFIRMED_RISK", "FALSE_POSITIVE", "CLOSED"]);
    const topProvider = [...store.providers].sort((a, b) => b.risk_score - a.risk_score)[0];
    const topClaims = topProvider ? store.claims.filter((c) => c.provider.provider_id === topProvider.provider_id && c.approved_tariff) : [];
    const sumAmount = topClaims.reduce((a, c) => a + c.claim_amount, 0);
    const sumPeer = topClaims.reduce((a, c) => a + (c.approved_tariff || 0), 0);
    const byProvince = new Map<string, { name: string; high: number; claims: number }>();
    store.providers.forEach((pv) => {
      const cur = byProvince.get(pv.province_code) || { name: pv.province_name, high: 0, claims: 0 };
      cur.high += pv.high_risk_claims;
      cur.claims += pv.total_claims;
      byProvince.set(pv.province_code, cur);
    });
    const topClaimsList = [...inv].sort((a, b) => b.risk_score - a.risk_score).slice(0, 4);
    const chain = verifyChain(store.auditLog);
    return {
      dataset: store.ingestedClaimIds.size > 0 ? "sintetis+unggahan" : "sintetis",
      exposure_total: computeDashboardKPIs(store).potential_exposure,
      risky_providers: store.providers.filter((pv) => pv.risk_level === "HIGH" || pv.risk_level === "CRITICAL").length,
      province_map: computeProvinceRisk(store).map((d) => ({ code: d.province_code, name: d.province_name, lat: d.latitude, lng: d.longitude, score: d.risk_score, high: d.high_risk_claims, claims: d.total_claims })),
      top_provinces: Array.from(byProvince.values()).sort((a, b) => b.high - a.high).slice(0, 5),
      top_providers: [...store.providers].sort((a, b) => b.potential_exposure - a.potential_exposure).slice(0, 3).map((pv) => ({ name: pv.name, risk_score: pv.risk_score, high_risk_claims: pv.high_risk_claims, total_claims: pv.total_claims, exposure: pv.potential_exposure, dominant_risk_type: pv.dominant_risk_type })),
      top_claims: topClaimsList.map((i) => ({ claim_id: i.claim_id, risk_score: i.risk_score, signals: i.primary_risk_signals.slice(0, 3), exposure: i.potential_exposure })),
      audit: { entries: chain.length, valid: chain.valid },
      provinces: new Set(store.providers.map((p) => p.province_code)).size,
      queue_cases: inv.length,
      workflow: {
        new: inv.filter((i) => i.status === "NEW").length,
        in_progress: inv.filter((i) => i.status === "UNDER_INVESTIGATION" || i.status === "NEED_EVIDENCE").length,
        completed: inv.filter((i) => doneStatus.has(i.status)).length,
        critical: inv.filter((i) => i.priority === "CRITICAL").length,
      },
      top_provider: topProvider ? { name: topProvider.name, peer_gap_pct: sumPeer > 0 ? Math.round((sumAmount / sumPeer - 1) * 100) : null } : null,
      claims: store.claims.length,
      flagged_claims: store.claims.filter((c) => c.risk_score >= 50).length,
      high_risk_claims: store.claims.filter((c) => c.risk_level === "HIGH" || c.risk_level === "CRITICAL").length,
      providers: store.providers.length,
      detectors: DETECTOR_REGISTRY.length,
      narratives_embedded: store.embeddings.size,
      embedding_model: store.meta.embedding_model,
      macro_f1: report.macro.f1,
      spotlight: pickSpotlight(store.claims),
      clone: clone ?? null,
    };
  });
  return NextResponse.json({ data }, { headers: { "Cache-Control": "public, max-age=60" } });
}
