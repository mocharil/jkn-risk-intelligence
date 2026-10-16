"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { IndonesiaRiskMap } from "@/components/map/IndonesiaRiskMap";
import { NetworkGraphView } from "@/components/network/NetworkGraphView";
import { RiskPill } from "@/components/ui/RiskPill";
import { PageLoader } from "@/components/ui/PageLoader";
import { ProvinceRiskData, EmergingSignal } from "@/types/risk";
import { formatRupiah, formatNumber } from "@/lib/formatting/currency";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { MapPin, TrendingUp, ChevronRight, Layers } from "lucide-react";

type RiskTab = "OVERVIEW" | "MAP" | "GRAPH" | "PATTERNS";

export default function RiskIntelligencePage() {
  const [activeTab, setActiveTab] = useState<RiskTab>("OVERVIEW");
  const [provinceData, setProvinceData] = useState<ProvinceRiskData[]>([]);
  const [signals, setSignals] = useState<EmergingSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [graphProvider, setGraphProvider] = useState("");
  const [providerOptions, setProviderOptions] = useState<Array<{ provider_id: string; name: string; risk_score: number }>>([]);

  useEffect(() => {
    fetch("/api/providers")
      .then((r) => r.json())
      .then((j) => setProviderOptions((j.data || []).slice(0, 25)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((data) => {
        setProvinceData(data.province_risk || []);
        setSignals(data.emerging_signals || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  // Agregasi per Gugus Kepulauan
  const islandGroupStats = useMemo(() => {
    const groups = new Map<
      string,
      { island: string; total_claims: number; high_risk_claims: number; potential_exposure: number; active_provinces: number }
    >();
    for (const p of provinceData) {
      const cur = groups.get(p.island_group) || {
        island: p.island_group,
        total_claims: 0,
        high_risk_claims: 0,
        potential_exposure: 0,
        active_provinces: 0,
      };
      cur.total_claims += p.total_claims;
      cur.high_risk_claims += p.high_risk_claims;
      cur.potential_exposure += p.potential_exposure;
      if (p.total_claims > 0) cur.active_provinces += 1;
      groups.set(p.island_group, cur);
    }
    return Array.from(groups.values()).sort((a, b) => b.potential_exposure - a.potential_exposure);
  }, [provinceData]);

  // Top 8 Provinsi berdasarkan eksposur
  const topProvinces = useMemo(() => {
    return [...provinceData]
      .filter((p) => p.total_claims > 0)
      .sort((a, b) => b.potential_exposure - a.potential_exposure)
      .slice(0, 8);
  }, [provinceData]);

  const tabs: { id: RiskTab; label: string }[] = [
    { id: "OVERVIEW", label: "Ringkasan & Geospasial" },
    { id: "MAP", label: "Peta Risiko (34 Provinsi)" },
    { id: "GRAPH", label: "Graf Relasi Entitas" },
    { id: "PATTERNS", label: "Pola Anomali" },
  ];

  return (
    <DashboardShell>
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold text-jkn-text tracking-tight">Intelijen Risiko Nasional</h1>
            <span className="px-2 py-0.5 rounded-md bg-bpjs-light text-bpjs-dark text-xs font-semibold border border-bpjs-border">
              Sistemik & Klaster
            </span>
          </div>
          <p className="text-xs text-jkn-muted mt-0.5">
            Visualisasi klaster anomali, titik panas geografis 34 provinsi, agregasi gugus kepulauan, dan korelasi lintas-entitas dari data hasil analisis.
          </p>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-1.5 border-b border-jkn-border pb-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`h-8 px-3 rounded-lg text-xs font-semibold transition-all shrink-0 border ${
              activeTab === tab.id
                ? "bg-bpjs-soft text-bpjs-dark border-bpjs-border font-bold"
                : "bg-surface text-jkn-muted border-transparent hover:bg-surface-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {loading ? (
        <PageLoader label="Memuat telemetri intelijen risiko nasional..." />
      ) : activeTab === "OVERVIEW" ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8">
              <IndonesiaRiskMap provinceData={provinceData} />
            </div>
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-surface rounded-xl border border-jkn-border p-4 shadow-subtle space-y-3">
                <h3 className="text-xs font-bold text-jkn-text uppercase tracking-wider">
                  Klaster Kritis Teridentifikasi
                </h3>
                <div className="space-y-2.5">
                  {signals.length === 0 && <p className="text-[11px] text-jkn-muted">Belum ada klaster signifikan.</p>}
                  {signals.slice(0, 3).map((sig) => (
                    <Link
                      key={sig.signal_id}
                      href={`/investigation-queue?risk_type=${sig.risk_type}`}
                      className={`block p-3 rounded-lg border text-xs space-y-1 transition-all hover:shadow-subtle ${
                        sig.severity === "CRITICAL"
                          ? "bg-risk-critical-bg border-risk-critical-border"
                          : "bg-risk-medium-bg border-risk-medium-border"
                      }`}
                    >
                      <div className={`flex justify-between font-bold ${sig.severity === "CRITICAL" ? "text-risk-critical" : "text-risk-medium"}`}>
                        <span>{sig.title}</span>
                        <span className="text-[10px] uppercase">{sig.severity === "CRITICAL" ? "Kritis" : "Tinggi"}</span>
                      </div>
                      <p className="text-[11px] text-jkn-muted leading-relaxed">{sig.description}</p>
                      <div className="flex items-center justify-between pt-1 text-[10px] font-semibold font-mono tabular-nums">
                        <span className="text-bpjs-dark">Keyakinan {(sig.confidence * 100).toFixed(0)}%</span>
                        <span className="text-risk-critical font-bold">{formatRupiah(sig.potential_exposure, true)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Regional Island Group & Top Provinces Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Peringkat Provinsi dengan Eksposur Tertinggi (6 cols) */}
            <div className="lg:col-span-6 bg-surface rounded-xl border border-jkn-border p-4 shadow-subtle space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-jkn-text flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-bpjs" />
                    <span>Peringkat Provinsi Berdasarkan Eksposur Risiko</span>
                  </h3>
                  <p className="text-[11px] text-jkn-muted mt-0.5">8 provinsi dengan nilai selisih tagihan tertinggi</p>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProvinces} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <XAxis
                      type="number"
                      stroke="#70877D"
                      fontSize={10}
                      tickFormatter={(v: number) => formatRupiah(v, true)}
                    />
                    <YAxis
                      dataKey="province_name"
                      type="category"
                      stroke="#70877D"
                      fontSize={11}
                      width={125}
                    />
                    <Tooltip
                      formatter={(v: number) => [formatRupiah(v), "Potensi Eksposur"]}
                      contentStyle={{ backgroundColor: "#FFFFFF", borderRadius: "8px", border: "1px solid #D5E0DA", fontSize: "12px" }}
                    />
                    <Bar dataKey="potential_exposure" name="Eksposur Risiko" radius={[0, 4, 4, 0]}>
                      {topProvinces.map((entry, idx) => (
                        <Cell
                          key={entry.province_code}
                          fill={entry.risk_level === "CRITICAL" ? "#C81E1E" : entry.risk_level === "HIGH" ? "#D94625" : idx < 3 ? "#B45309" : "#007A3A"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sebaran Risiko per Gugus Kepulauan (6 cols) */}
            <div className="lg:col-span-6 bg-surface rounded-xl border border-jkn-border p-4 shadow-subtle space-y-3">
              <div>
                <h3 className="text-sm font-bold text-jkn-text flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-bpjs" />
                  <span>Distribusi Risiko per Gugus Kepulauan</span>
                </h3>
                <p className="text-[11px] text-jkn-muted mt-0.5">Agregasi volume klaim, rasio risiko tinggi, dan eksposur lintas wilayah</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {islandGroupStats.map((g) => {
                  const highPct = g.total_claims > 0 ? Math.round((g.high_risk_claims / g.total_claims) * 100) : 0;
                  return (
                    <div key={g.island} className="p-3 rounded-lg bg-surface-secondary/60 border border-jkn-divider space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-jkn-text">{g.island}</span>
                        <span className="text-[10px] font-bold text-risk-critical font-mono tabular-nums">{formatRupiah(g.potential_exposure, true)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-jkn-muted tabular-nums">
                        <span>{formatNumber(g.total_claims)} klaim ({g.active_provinces} prov.)</span>
                        <span className="font-semibold text-jkn-text">{formatNumber(g.high_risk_claims)} risiko tinggi ({highPct}%)</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-surface-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full ${highPct >= 40 ? "bg-risk-critical" : highPct >= 25 ? "bg-risk-medium" : "bg-bpjs"}`}
                          style={{ width: `${Math.min(100, Math.max(4, highPct))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <NetworkGraphView />
        </div>
      ) : activeTab === "MAP" ? (
        <div className="space-y-4">
          <IndonesiaRiskMap provinceData={provinceData} className="min-h-[500px]" />
        </div>
      ) : activeTab === "GRAPH" ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs">
            <label className="font-semibold text-jkn-text" htmlFor="graph-provider">Fokus faskes:</label>
            <select id="graph-provider" value={graphProvider} onChange={(e) => setGraphProvider(e.target.value)} className="h-9 px-2.5 rounded-lg border border-jkn-border bg-white text-xs">
              <option value="">Faskes berisiko tertinggi (otomatis)</option>
              {providerOptions.map((p) => (
                <option key={p.provider_id} value={p.provider_id}>{p.name} — skor {p.risk_score}</option>
              ))}
            </select>
          </div>
          <NetworkGraphView providerId={graphProvider || undefined} className="min-h-[550px]" />
        </div>
      ) : (
        /* PATTERNS TAB */
        <div className="space-y-5">
          {signals.length > 0 && (
            <div className="bg-surface rounded-xl border border-jkn-border p-4 shadow-subtle space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-jkn-text flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-risk-critical" />
                    <span>Komparasi Eksposur & Lonjakan Sinyal Anomali (14 Hari)</span>
                  </h3>
                  <p className="text-[11px] text-jkn-muted mt-0.5">Perbandingan besaran dampak finansial antar pola anomali yang sedang meningkat</p>
                </div>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={signals}>
                    <XAxis dataKey="risk_type" stroke="#70877D" fontSize={11} />
                    <YAxis stroke="#70877D" fontSize={10} tickFormatter={(v: number) => formatRupiah(v, true)} />
                    <Tooltip
                      formatter={(v: number) => [formatRupiah(v), "Potensi Eksposur"]}
                      contentStyle={{ backgroundColor: "#FFFFFF", borderRadius: "8px", border: "1px solid #D5E0DA", fontSize: "12px" }}
                    />
                    <Bar dataKey="potential_exposure" name="Potensi Eksposur" radius={[4, 4, 0, 0]}>
                      {signals.map((sig) => (
                        <Cell key={sig.signal_id} fill={sig.severity === "CRITICAL" ? "#C81E1E" : "#B45309"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {signals.map((sig) => (
              <div key={sig.signal_id} className="bg-surface rounded-xl border border-jkn-border p-4 shadow-subtle space-y-3 flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <RiskPill type={sig.risk_type} size="sm" />
                    <span className="text-xs font-bold text-risk-critical font-mono tabular-nums">{formatRupiah(sig.potential_exposure, true)}</span>
                  </div>
                  <h3 className="text-sm font-bold text-jkn-text">{sig.title}</h3>
                  <p className="text-xs text-jkn-muted leading-relaxed">{sig.description}</p>
                </div>

                <div className="space-y-2 pt-2 border-t border-jkn-divider">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-jkn-dim">Tingkat keyakinan detektor</span>
                      <span className="font-bold text-bpjs-dark font-mono tabular-nums">{(sig.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-surface-secondary overflow-hidden">
                      <div className="h-full rounded-full bg-bpjs" style={{ width: `${Math.round(sig.confidence * 100)}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-jkn-dim tabular-nums">{sig.affected_providers_count} faskes · {sig.change_percentage >= 0 ? "+" : ""}{sig.change_percentage}% vs 14 hari lalu</span>
                    <Link
                      href={`/investigation-queue?risk_type=${sig.risk_type}`}
                      className="text-xs font-semibold text-bpjs hover:underline inline-flex items-center gap-1"
                    >
                      <span>Investigasi</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

