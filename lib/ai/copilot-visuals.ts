import { DataStore } from "../data/store";
import { ContextItem } from "./context";
import { computeProvinceRisk } from "../analytics/aggregates";
import { computeProvinceNational } from "../analytics/provider-national";
import type { RiskLevel } from "@/types/risk";

/**
 * Visual pendamping jawaban Copilot. Dihitung deterministik dari data (bukan dari teks LLM),
 * sehingga angka pada peta dan grafik selalu sama dengan data aplikasi.
 */
export type CopilotVisual =
  | {
      kind: "provinces";
      title: string;
      rows: Array<{
        code: string;
        name: string;
        score: number;
        level: RiskLevel;
        high: number;
        total: number;
        exposure: number;
        cost_ratio: number | null;
        access: number | null;
      }>;
    }
  | {
      kind: "providers";
      title: string;
      rows: Array<{ provider_id: string; name: string; city: string; score: number; level: RiskLevel; exposure: number; high: number; total: number }>;
    }
  | {
      kind: "claim";
      title: string;
      claim_id: string;
      score: number;
      level: RiskLevel;
      provider: string;
      amount: number;
      marks: Array<{ key: string; label: string; value: number }>;
      findings: Array<{ type: string; score: number }>;
    };

const MAX_PROVINCES = 3;
const MAX_PROVIDERS = 5;

export function buildVisuals(store: DataStore, items: ContextItem[], _question: string): CopilotVisual[] {
  const out: CopilotVisual[] = [];

  // 1. Provinsi yang dibahas -> peta dan perbandingan
  const codes = Array.from(new Set(items.filter((i) => i.link?.type === "MAP" && i.link.id).map((i) => i.link!.id))).slice(0, MAX_PROVINCES);
  if (codes.length > 0) {
    const risk = new Map(computeProvinceRisk(store).map((p) => [p.province_code, p]));
    const nat = computeProvinceNational(store);
    const rows = codes
      .map((code) => {
        const r = risk.get(code);
        if (!r) return null;
        const n = nat.get(code);
        return {
          code,
          name: r.province_name,
          score: r.risk_score ?? 0,
          level: r.risk_level,
          high: r.high_risk_claims,
          total: r.total_claims,
          exposure: r.potential_exposure,
          cost_ratio: n?.cost_ratio ?? null,
          access: n?.admission_rate_per_10k ?? null,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    if (rows.length > 0) out.push({ kind: "provinces", title: rows.length > 1 ? "Perbandingan wilayah" : rows[0].name, rows });
  }

  // 2. Faskes yang dibahas atau daftar faskes teratas
  const providerIds = Array.from(new Set(items.filter((i) => i.link?.type === "PROVIDER" && i.link.id && i.id !== "list:top_providers").map((i) => i.link!.id)));
  const hasClaim = items.some((i) => i.kind === "CLAIM");
  // Daftar faskes teratas hanya relevan bila pertanyaan tidak sedang membahas provinsi atau satu klaim.
  const wantsTopList = items.some((i) => i.id === "list:top_providers") && out.length === 0 && !hasClaim;
  const providers = store.providers;
  const explicit = hasClaim && providerIds.length <= 1 ? [] : providerIds;
  const picked = explicit.length > 0 ? providers.filter((p) => explicit.includes(p.provider_id)) : wantsTopList ? [...providers].sort((a, b) => b.risk_score - a.risk_score || b.potential_exposure - a.potential_exposure).slice(0, MAX_PROVIDERS) : [];
  if (picked.length > 0) {
    out.push({
      kind: "providers",
      title: picked.length > 1 ? "Faskes yang dibahas" : picked[0].name,
      rows: picked.slice(0, MAX_PROVIDERS).map((p) => ({
        provider_id: p.provider_id,
        name: p.name,
        city: p.city,
        score: p.risk_score,
        level: p.risk_level,
        exposure: p.potential_exposure,
        high: p.high_risk_claims,
        total: p.total_claims,
      })),
    });
  }

  // 3. Klaim yang dibahas -> skor dan posisi tagihan
  const claimItem = items.find((i) => i.kind === "CLAIM");
  if (claimItem) {
    const id = claimItem.id.replace("claim:", "");
    const c = store.claims.find((x) => x.claim_id === id);
    if (c) {
      const marks: Array<{ key: string; label: string; value: number }> = [{ key: "claim", label: "Tagihan ini", value: c.claim_amount }];
      if ((c.approved_tariff || 0) > 0) marks.push({ key: "peer", label: "Median peer", value: c.approved_tariff! });
      if (c.national && c.national.cost_ref > 0) marks.push({ key: "nat", label: `Rerata ${c.national.class_label.toLowerCase()} BPJS`, value: c.national.cost_ref });
      out.push({
        kind: "claim",
        title: c.claim_id,
        claim_id: c.claim_id,
        score: c.risk_score,
        level: c.risk_level,
        provider: c.provider.name,
        amount: c.claim_amount,
        marks,
        findings: c.risk_findings.map((f) => ({ type: f.risk_type, score: f.risk_score })),
      });
    }
  }
  return out;
}
