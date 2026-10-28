"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { IndonesiaRiskMap } from "@/components/map/IndonesiaRiskMap";
import { formatRupiah, formatNumber } from "@/lib/formatting/currency";
import type { ProvinceRiskData } from "@/types/risk";

type Level = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type CopilotVisual =
  | {
      kind: "provinces";
      title: string;
      rows: Array<{ code: string; name: string; score: number; level: Level; high: number; total: number; exposure: number; cost_ratio: number | null; access: number | null }>;
    }
  | {
      kind: "providers";
      title: string;
      rows: Array<{ provider_id: string; name: string; city: string; score: number; level: Level; exposure: number; high: number; total: number }>;
    }
  | {
      kind: "claim";
      title: string;
      claim_id: string;
      score: number;
      level: Level;
      provider: string;
      amount: number;
      marks: Array<{ key: string; label: string; value: number }>;
      findings: Array<{ type: string; score: number }>;
    };

const LEVEL_COLOR: Record<Level, string> = { CRITICAL: "#B91C1C", HIGH: "#EA580C", MEDIUM: "#CA8A04", LOW: "#059669" };

const TYPE_LABEL: Record<string, string> = {
  UPCODING: "Upcoding",
  CLONING: "Cloning",
  PHANTOM_BILLING: "Phantom billing",
  ABNORMAL_LOS: "LOS anomali",
  UNBUNDLING: "Unbundling",
  INFLATED_BILLS: "Inflasi tagihan",
  REPEAT_BILLING: "Tagihan berulang",
  READMISSION: "Rawat ulang dini",
};

function Ring({ score, level, size = 44 }: { score: number; level: Level; size?: number }) {
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={`Skor risiko ${score}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E4ECE8" strokeWidth="4" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={LEVEL_COLOR[level]}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${(Math.max(0, Math.min(100, score)) / 100) * c} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[13px] font-semibold text-jkn-text tabular-nums">{score}</span>
    </span>
  );
}

function ProvinceVisual({ v }: { v: Extract<CopilotVisual, { kind: "provinces" }> }) {
  // Peta hanya memuat provinsi yang dibahas; sisanya abu-abu polos.
  const data = useMemo<ProvinceRiskData[]>(
    () =>
      v.rows.map(
        (r) =>
          ({
            province_code: r.code,
            province_name: r.name,
            island_group: "Jawa",
            latitude: 0,
            longitude: 0,
            total_claims: r.total,
            high_risk_claims: r.high,
            potential_exposure: r.exposure,
            dominant_risk_type: "UPCODING",
            risk_level: r.level,
            risk_score: r.score,
            top_providers: [],
          }) as ProvinceRiskData
      ),
    [v.rows]
  );
  return (
    <section className="rounded-2xl border border-jkn-border/70 overflow-hidden grid grid-cols-1 md:grid-cols-5" aria-label={v.title}>
      <div className="md:col-span-3 border-b md:border-b-0 md:border-r border-jkn-border/70">
        <IndonesiaRiskMap provinceData={data} heat bare className="!p-0 !border-0 !rounded-none !shadow-none" />
      </div>
      <div className="md:col-span-2 p-4 flex flex-col justify-center gap-3">
        <h3 className="text-sm font-semibold text-jkn-text">{v.title}</h3>
        <ul className="space-y-3">
          {v.rows.map((r) => (
            <li key={r.code} className="flex items-center gap-3">
              <Ring score={r.score} level={r.level} />
              <div className="min-w-0">
                <Link href={`/risk-intelligence?tab=peta&province=${r.code}`} className="text-sm font-medium text-jkn-text hover:text-bpjs block truncate">
                  {r.name}
                </Link>
                <p className="text-xs text-jkn-muted tabular-nums">
                  {formatNumber(r.high)} dari {formatNumber(r.total)} klaim berisiko tinggi
                </p>
                <p className="text-xs text-jkn-dim tabular-nums">
                  {formatRupiah(r.exposure, true)}
                  {r.cost_ratio ? `, biaya ${r.cost_ratio.toLocaleString("id-ID", { maximumFractionDigits: 1 })}x rerata nasional` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ProviderVisual({ v }: { v: Extract<CopilotVisual, { kind: "providers" }> }) {
  return (
    <section aria-label={v.title}>
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {v.rows.map((p) => (
          <li key={p.provider_id}>
            <Link href={`/providers/${p.provider_id}`} className="h-full flex flex-col items-center text-center gap-1.5 rounded-2xl border border-jkn-border/70 hover:border-bpjs/50 hover:bg-frame/40 transition-colors px-2 py-3">
              <Ring score={p.score} level={p.level} size={52} />
              <span className="text-xs font-medium text-jkn-text leading-tight line-clamp-2">{p.name}</span>
              <span className="text-[11px] text-jkn-muted tabular-nums">
                {formatNumber(p.high)}/{formatNumber(p.total)} klaim · {formatRupiah(p.exposure, true)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ClaimVisual({ v }: { v: Extract<CopilotVisual, { kind: "claim" }> }) {
  const maxV = Math.max(...v.marks.map((m) => m.value), 1) * 1.08;
  const colors: Record<string, string> = { claim: "#B91C1C", peer: "#007A3A", nat: "#0E7490" };
  const sorted = [...v.marks].sort((a, b) => a.value - b.value);
  return (
    <section className="rounded-2xl border border-jkn-border/70 p-4 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-5 items-center" aria-label={`Ringkasan ${v.claim_id}`}>
      <div className="flex items-center gap-3">
        <Ring score={v.score} level={v.level} size={60} />
        <div className="min-w-0">
          <Link href={`/investigation-queue?mode=CLAIMS&search=${v.claim_id}`} className="text-sm font-semibold text-jkn-text hover:text-bpjs tabular-nums">
            {v.claim_id}
          </Link>
          <p className="text-xs text-jkn-muted truncate max-w-[200px]">{v.provider}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {v.findings.map((f) => (
              <span key={f.type} className="text-[11px] px-1.5 py-0.5 rounded bg-frame text-jkn-text">
                {TYPE_LABEL[f.type] || f.type} {f.score}
              </span>
            ))}
          </div>
        </div>
      </div>
      {v.marks.length > 1 && (
        <div className="relative h-20 tabular-nums" aria-label="Posisi tagihan terhadap pembanding">
          <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-frame" />
          {sorted.map((m, i) => {
            const pos = (m.value / maxV) * 100;
            const above = i % 2 === 0;
            return (
              <div key={m.key} className="absolute top-1/2" style={{ left: `${pos}%` }}>
                <span className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow" style={{ width: m.key === "claim" ? 14 : 11, height: m.key === "claim" ? 14 : 11, backgroundColor: colors[m.key] }} aria-hidden />
                <div className={`absolute whitespace-nowrap text-center ${above ? "bottom-3" : "top-3"}`} style={{ transform: `translateX(${pos > 80 ? "-100%" : pos < 15 ? "0%" : "-50%"})` }}>
                  <div className="text-[11px] text-jkn-muted">{m.label}</div>
                  <div className="text-xs font-semibold" style={{ color: colors[m.key] }}>
                    {formatRupiah(m.value, true)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/** Peta, cincin skor, dan posisi tagihan di bawah jawaban Copilot. */
export const CopilotVisuals: React.FC<{ visuals: CopilotVisual[] }> = ({ visuals }) => (
  <div className="space-y-3">
    {visuals.map((v, i) =>
      v.kind === "provinces" ? <ProvinceVisual key={i} v={v} /> : v.kind === "providers" ? <ProviderVisual key={i} v={v} /> : <ClaimVisual key={i} v={v} />
    )}
  </div>
);
