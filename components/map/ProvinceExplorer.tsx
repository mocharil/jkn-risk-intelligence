"use client";

import React, { useMemo, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ReferenceLine, LabelList } from "recharts";
import { ChevronDown, TrendingDown, TrendingUp, Gauge } from "lucide-react";
import { IndonesiaRiskMap } from "./IndonesiaRiskMap";
import { formatNumber } from "@/lib/formatting/currency";
import type { ProvinceRiskData } from "@/types/risk";

type Key = "NAT_COST" | "NAT_ACCESS" | "NAT_FKRTL";

interface Props {
  mapData: ProvinceRiskData[];
  year: string;
  nationalCost: number;
  nationalFkrtl: number;
}

const id = (v: number, d = 0) => v.toLocaleString("id-ID", { maximumFractionDigits: d });

const LAYERS: Record<Key, { label: string; short: string; hint: string; get: (p: NonNullable<ProvinceRiskData["national"]>) => number; fmt: (v: number) => string }> = {
  NAT_COST: { label: "Biaya per admisi", short: "Biaya", hint: "Rerata biaya klaim rawat inap per admisi", get: (p) => p.cost_per_admission, fmt: (v) => `Rp ${id(v / 1_000_000, 2)} jt` },
  NAT_ACCESS: { label: "Akses rawat inap", short: "Akses", hint: "Admisi per 10.000 peserta; makin tinggi, makin sering peserta dirawat", get: (p) => p.admission_rate_per_10k, fmt: (v) => id(v) },
  NAT_FKRTL: { label: "Ketersediaan FKRTL", short: "FKRTL", hint: "Rumah sakit/fasilitas rujukan per 100 ribu peserta", get: (p) => p.fkrtl_per_100k, fmt: (v) => id(v, 2) },
};

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function shade(t: number): string {
  const [r1, g1, b1] = hex("#BBF7D0");
  const [r2, g2, b2] = hex("#064E3B");
  const k = Math.max(0, Math.min(1, t));
  return `rgb(${Math.round(r1 + (r2 - r1) * k)}, ${Math.round(g1 + (g2 - g1) * k)}, ${Math.round(b1 + (b2 - b1) * k)})`;
}

export function ProvinceExplorer({ mapData, year, nationalCost, nationalFkrtl }: Props) {
  const [layer, setLayer] = useState<Key>("NAT_COST");
  const [selected, setSelected] = useState<string | undefined>();
  const [showAll, setShowAll] = useState(false);
  const L = LAYERS[layer];

  const rows = useMemo(
    () =>
      mapData
        .filter((d) => d.national)
        .map((d) => ({ code: d.province_code, name: d.province_name, value: L.get(d.national!), nat: d.national! }))
        .sort((a, b) => b.value - a.value),
    [mapData, L]
  );

  const avg = useMemo(() => {
    if (layer === "NAT_COST") return nationalCost;
    const parts = mapData.reduce((s, d) => s + (d.national?.participants ?? 0), 0);
    if (parts <= 0) return 0;
    if (layer === "NAT_ACCESS") return (mapData.reduce((s, d) => s + (d.national?.admissions_est ?? 0), 0) / parts) * 10_000;
    return (nationalFkrtl / parts) * 100_000;
  }, [layer, mapData, nationalCost, nationalFkrtl]);

  if (!rows.length) return null;
  const max = rows[0].value;
  const min = rows[rows.length - 1].value;
  const top = rows.slice(0, 8).map((r) => ({ ...r, t: (r.value - min) / Math.max(1e-9, max - min) }));
  const focus = selected ? rows.find((r) => r.code === selected) : undefined;

  const cards = [
    { icon: TrendingUp, tone: "text-risk-high", title: "Tertinggi", name: rows[0].name, value: L.fmt(max) },
    { icon: TrendingDown, tone: "text-bpjs-dark", title: "Terendah", name: rows[rows.length - 1].name, value: L.fmt(min) },
    { icon: Gauge, tone: "text-jkn-text", title: "Rerata nasional", name: `${year}, seluruh provinsi`, value: L.fmt(avg) },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-jkn-text">Biaya dan akses per provinsi {year}</h2>
          <p className="text-xs text-jkn-muted mt-0.5">{L.hint}. Klik provinsi di peta atau batang untuk menyorotnya.</p>
        </div>
        <div role="tablist" aria-label="Lapisan" className="inline-flex rounded-xl bg-surface-secondary p-0.5 border border-jkn-border shrink-0">
          {(Object.keys(LAYERS) as Key[]).map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={layer === k}
              onClick={() => setLayer(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${layer === k ? "bg-[#071A12] text-white" : "text-jkn-muted hover:text-jkn-text"}`}
            >
              {LAYERS[k].short}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-jkn-muted tabular-nums flex flex-wrap gap-x-5 gap-y-1">
        {cards.map((c) => (
          <span key={c.title}>
            {c.title}: <strong className="text-jkn-text font-semibold">{c.value}</strong> <span className="text-jkn-dim">({c.name})</span>
          </span>
        ))}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 min-w-0">
          <IndonesiaRiskMap provinceData={mapData} nationalOnly heat metric={layer} focusProvince={selected} onSelectProvince={setSelected} />
        </div>
        <div className="lg:col-span-2 bg-surface rounded-xl border border-jkn-border p-4 shadow-subtle flex flex-col min-w-0">
          <h3 className="text-sm font-bold text-jkn-text">8 provinsi teratas: {L.label.toLowerCase()}</h3>
          <p className="text-xs text-jkn-muted">Garis putus-putus = rerata nasional ({L.fmt(avg)})</p>
          <div className="flex-1 min-h-[300px] mt-2 tabular-nums">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top} layout="vertical" margin={{ top: 4, right: 64, left: 0, bottom: 0 }}>
                <XAxis type="number" hide domain={[0, "dataMax"]} />
                <YAxis type="category" dataKey="name" width={118} tick={{ fontSize: 11, fill: "#61756D" }} tickLine={false} axisLine={false} interval={0} />
                <Tooltip cursor={{ fill: "rgba(5,150,105,0.06)" }} formatter={(v: number) => [L.fmt(v), L.label]} contentStyle={{ backgroundColor: "#FFFFFF", borderRadius: 12, border: "1px solid #D5E0DA", fontSize: 12 }} />
                <ReferenceLine x={avg} stroke="#11241D" strokeDasharray="4 3" />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20} onClick={(d: { code?: string }) => d.code && setSelected(d.code)} style={{ cursor: "pointer" }}>
                  {top.map((r) => (
                    <Cell key={r.code} fill={shade(0.25 + r.t * 0.75)} stroke={r.code === selected ? "#071A12" : "none"} strokeWidth={2} />
                  ))}
                  <LabelList dataKey="value" position="right" formatter={(v: number) => L.fmt(v)} style={{ fontSize: 11, fontWeight: 600, fill: "#11241D" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {focus && (
            <div className="mt-2 rounded-lg bg-bpjs-soft border border-jkn-border px-3 py-2 text-xs">
              <div className="font-bold text-jkn-text">{focus.name}</div>
              <div className="text-jkn-muted mt-0.5">
                {LAYERS.NAT_COST.fmt(focus.nat.cost_per_admission)} per admisi · {id(focus.nat.admission_rate_per_10k)} admisi/10.000 peserta · {formatNumber(focus.nat.fkrtl_count)} FKRTL
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-jkn-border/90 shadow-card overflow-hidden">
        <button type="button" onClick={() => setShowAll((s) => !s)} aria-expanded={showAll} className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-jkn-text hover:bg-surface-secondary transition-colors">
          <span>{showAll ? "Sembunyikan" : "Lihat"} data lengkap {rows.length} provinsi</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showAll ? "rotate-180" : ""}`} aria-hidden />
        </button>
        {showAll && (
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto border-t border-jkn-divider">
            <table className="w-full text-sm tabular-nums">
              <thead className="sticky top-0 bg-surface-subtle">
                <tr className="text-left text-xs font-semibold text-jkn-muted border-b border-jkn-border">
                  <th className="py-2.5 px-4">Provinsi</th>
                  <th className="py-2.5 px-3 text-right">Biaya per admisi</th>
                  <th className="py-2.5 px-3 text-right">Indeks biaya</th>
                  <th className="py-2.5 px-3 text-right">Admisi / 10.000 peserta</th>
                  <th className="py-2.5 px-4 text-right">FKRTL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-jkn-divider">
                {rows.map((r) => (
                  <tr key={r.code} className={r.code === selected ? "bg-bpjs-soft" : ""}>
                    <td className="py-2 px-4 font-medium">{r.name}</td>
                    <td className="py-2 px-3 text-right">{LAYERS.NAT_COST.fmt(r.nat.cost_per_admission)}</td>
                    <td className="py-2 px-3 text-right">{id(r.nat.cost_index, 2)}</td>
                    <td className="py-2 px-3 text-right">{id(r.nat.admission_rate_per_10k)}</td>
                    <td className="py-2 px-4 text-right">{formatNumber(r.nat.fkrtl_count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
