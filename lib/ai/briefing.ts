import { z } from "zod";
import { DashboardKPIs } from "@/types/risk";
import { computeEmergingSignals } from "../analytics/aggregates";
import { DataStore } from "../data/store";
import { generateJson, getAIStatus } from "./llm";

const LlmSchema = z.object({
  summary: z.string().min(20),
  key_findings: z.array(z.string()).min(1).max(4),
  cited_ids: z.array(z.string()).min(1),
});

const g = globalThis as unknown as {
  __arsaBriefing?: { key: string; at: number; value: DashboardKPIs["ai_briefing"] };
  __arsaBriefingInflight?: { key: string; promise: Promise<DashboardKPIs["ai_briefing"] | null> };
};
const TTL = 10 * 60_000;

/**
 * AI Intelligence Briefing: ringkasan dari agregasi, dikutip ke sinyal/faskes sumber.
 * Tidak memblokir dashboard: tanpa `wait`, versi deterministik dikembalikan seketika (pending=true) sementara
 * versi LLM disusun di latar belakang (single-flight) dan disimpan di cache.
 */
export async function withAiBriefing(store: DataStore, kpis: DashboardKPIs, opts: { wait?: boolean } = {}): Promise<DashboardKPIs> {
  const key = `${store.meta.analyzed_at}|${store.claims.length}`;
  if (g.__arsaBriefing && g.__arsaBriefing.key === key && Date.now() - g.__arsaBriefing.at < TTL) {
    return { ...kpis, ai_briefing: g.__arsaBriefing.value };
  }
  const status = await getAIStatus();
  if (!status.available) return kpis;

  if (!g.__arsaBriefingInflight || g.__arsaBriefingInflight.key !== key) {
    const promise = generateBriefing(store, kpis, key).finally(() => {
      if (g.__arsaBriefingInflight?.promise === promise) g.__arsaBriefingInflight = undefined;
    });
    g.__arsaBriefingInflight = { key, promise };
  }
  if (!opts.wait) return { ...kpis, ai_briefing: { ...kpis.ai_briefing, pending: true } };
  const value = await g.__arsaBriefingInflight.promise;
  return value ? { ...kpis, ai_briefing: value } : kpis;
}

async function generateBriefing(store: DataStore, kpis: DashboardKPIs, key: string): Promise<DashboardKPIs["ai_briefing"] | null> {
  const status = await getAIStatus();
  const signals = computeEmergingSignals(store);
  const providers = [...store.providers].sort((a, b) => b.potential_exposure - a.potential_exposure).slice(0, 4);
  const ctx = [
    `[agg:national] ${kpis.total_claims_analyzed} klaim, ${kpis.high_risk_claims} berisiko tinggi, eksposur Rp ${Math.round(kpis.potential_exposure).toLocaleString("id-ID")}, ${kpis.providers_at_risk} faskes berisiko tinggi. Tren 7 hari: klaim ${kpis.trends.claims_change_pct}%, berisiko tinggi ${kpis.trends.high_risk_change_pct}%.`,
    ...signals.map((s) => `[signal:${s.signal_id}] ${s.title}: ${s.description} Eksposur Rp ${Math.round(s.potential_exposure).toLocaleString("id-ID")}.`),
    ...providers.map((p) => `[provider:${p.provider_id}] ${p.name}: skor ${p.risk_score}, ${p.high_risk_claims}/${p.total_claims} klaim tinggi, eksposur Rp ${Math.round(p.potential_exposure).toLocaleString("id-ID")}, dominan ${p.dominant_risk_type}.`),
  ];
  const validIds = new Set<string>(["agg:national", ...signals.map((s) => `signal:${s.signal_id}`), ...providers.map((p) => `provider:${p.provider_id}`)]);

  try {
    const res = await generateJson(
      `Buat briefing intelijen singkat untuk pimpinan investigator JKN dari data berikut. Gunakan HANYA angka pada data. 2–3 kalimat ringkasan + 3 temuan kunci. Sertakan id sumber yang dipakai di cited_ids.\n\nDATA:\n${ctx.join("\n")}\n\nJSON: {"summary":"...","key_findings":["..."],"cited_ids":["agg:national","signal:..."]}`,
      LlmSchema,
      { system: "Anda analis intelijen risiko klaim kesehatan. Bahasa Indonesia, faktual, tanpa mengarang angka.", temperature: 0.1, timeoutMs: 30_000 }
    );
    const cited = res.cited_ids.filter((id) => validIds.has(id));
    if (cited.length === 0 || cited.length < res.cited_ids.length) return null; // validator menolak → tetap deterministik
    const value: DashboardKPIs["ai_briefing"] = {
      ...kpis.ai_briefing,
      summary: res.summary,
      key_findings: res.key_findings,
      source: "llm",
      provider: status.provider_label,
      model: status.model,
      cited_signal_ids: cited,
      detected_at: new Date().toISOString(),
    };
    g.__arsaBriefing = { key, at: Date.now(), value };
    return value;
  } catch {
    return null;
  }
}
