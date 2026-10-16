"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { IndonesiaRiskMap } from "@/components/map/IndonesiaRiskMap";
import { RiskPill } from "@/components/ui/RiskPill";
import { PageLoader } from "@/components/ui/PageLoader";
import { formatRupiah, formatNumber } from "@/lib/formatting/currency";
import { formatRelativeTime } from "@/lib/formatting/date";
import { DashboardKPIs, EmergingSignal, ProvinceRiskData } from "@/types/risk";
import { Provider } from "@/types/provider";
import {
  ArrowRight,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const RISK_TYPE_DESC: Record<string, string> = {
  UPCODING: "Inflasi tingkat keparahan INA-CBG tanpa bukti objektif",
  CLONING: "Kemiripan semantik & leksikal narasi medis lintas pasien",
  PHANTOM_BILLING: "Prosedur ditagihkan tanpa laporan operasi/tindakan",
  ABNORMAL_LOS: "Lama rawat inap melampaui distribusi peer sejenis",
  UNBUNDLING: "Pemecahan paket layanan menjadi tagihan terpisah",
  INFLATED_BILLS: "Tagihan obat/alkes melampaui acuan e-Katalog",
  REPEAT_BILLING: "Penagihan berulang untuk episode perawatan sama",
  READMISSION: "Rawat ulang dini berulang dalam ≤30 hari",
};

export default function CommandCenterPage() {
  const [data, setData] = useState<{
    kpis: DashboardKPIs;
    province_risk: ProvinceRiskData[];
    emerging_signals: EmergingSignal[];
    top_providers: Provider[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trendMode, setTrendMode] = useState<"VOLUME" | "EXPOSURE">("VOLUME");

  const loadDashboard = React.useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/dashboard")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((resData) => {
        setData(resData);
        setLoading(false);
        if (resData?.kpis?.ai_briefing?.pending) {
          fetch("/api/dashboard/briefing")
            .then((r) => (r.ok ? r.json() : null))
            .then((b) =>
              b?.ai_briefing &&
              setData((prev: typeof resData) =>
                prev ? { ...prev, kpis: { ...prev.kpis, ai_briefing: b.ai_briefing } } : prev
              )
            )
            .catch(() => {});
        }
      })
      .catch((err) => {
        console.error("Failed to load dashboard:", err);
        setError("Gagal memuat data Command Center. Pastikan layanan lokal berjalan dengan baik.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadDashboard();
    const onStoreUpdated = () => loadDashboard();
    window.addEventListener("arsa:store-updated", onStoreUpdated);
    return () => window.removeEventListener("arsa:store-updated", onStoreUpdated);
  }, [loadDashboard]);

  if (loading) {
    return (
      <DashboardShell>
        <PageLoader label="Memuat JKN Risk Command Center..." className="h-[60vh]" />
      </DashboardShell>
    );
  }

  if (error || !data) {
    return (
      <DashboardShell>
        <div className="bg-surface rounded-xl border border-jkn-border p-8 text-center max-w-md mx-auto my-16 space-y-3 shadow-subtle">
          <AlertTriangle className="w-6 h-6 text-risk-critical mx-auto" />
          <h2 className="text-sm font-bold text-jkn-text">Gagal Memuat Command Center</h2>
          <p className="text-xs text-jkn-muted">{error || "Data ringkasan risiko belum tersedia."}</p>
          <button
            onClick={loadDashboard}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-bpjs text-white text-xs font-semibold hover:bg-bpjs-deep transition-colors"
          >
            <span>Coba Lagi</span>
          </button>
        </div>
      </DashboardShell>
    );
  }

  const { kpis, province_risk, emerging_signals, top_providers } = data;

  const distributionChartData = [
    { name: "Kritis", level: "CRITICAL", value: kpis.risk_distribution.critical, color: "#D92D20" },
    { name: "Tinggi", level: "HIGH", value: kpis.risk_distribution.high, color: "#F04438" },
    { name: "Sedang", level: "MEDIUM", value: kpis.risk_distribution.medium, color: "#D97706" },
    { name: "Rendah", level: "LOW", value: kpis.risk_distribution.low, color: "#059669" },
  ];

  const highRiskPct =
    kpis.total_claims_analyzed > 0
      ? ((kpis.high_risk_claims / kpis.total_claims_analyzed) * 100).toFixed(1)
      : "0.0";

  const riskByType = kpis.risk_by_type || [];
  const maxTypeExposure = Math.max(1, ...riskByType.map((r) => r.potential_exposure));

  return (
    <DashboardShell>
      {/* Page Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-jkn-text tracking-tight">
              Pusat Komando Risiko Klaim JKN
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-bpjs-soft text-bpjs-dark text-[11px] font-semibold border border-bpjs-border">
              <span className="w-1.5 h-1.5 rounded-full bg-bpjs animate-pulse" />
              Sensus Aktif · {formatNumber(kpis.total_claims_analyzed)} Klaim
            </span>
          </div>
          <p className="text-xs text-jkn-muted mt-1">
            Pemantauan eksposur finansial INA-CBG, distribusi geospasial tingkat provinsi, dan eskalasi temuan audit klaim.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/investigation-queue?mode=CLAIMS"
            className="h-9 inline-flex items-center gap-1.5 px-3.5 rounded-xl bg-surface border border-jkn-border text-jkn-text text-xs font-semibold shadow-2xs hover:bg-surface-secondary transition-all"
          >
            <span>Sensus Semua Klaim</span>
          </Link>
          <Link
            href="/investigation-queue"
            className="h-9 inline-flex items-center gap-2 px-4 rounded-xl bg-[#071A12] text-white text-xs font-semibold shadow-card hover:bg-[#0D2B1E] border border-[#00A859]/40 transition-all tabular-nums"
          >
            <span>Antrean Prioritas ({formatNumber(kpis.high_risk_claims)})</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#34D399]" />
          </Link>
        </div>
      </div>

      {/* Unified Architectural Telemetry Ledger */}
      <div className="bg-surface rounded-2xl border border-jkn-border/90 shadow-card overflow-hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 divide-y sm:divide-y-0 sm:divide-x divide-jkn-divider tabular-nums">
        {/* Primary Financial Metric: Potential Exposure — Signature Dark-Emerald Cell (4 cols) */}
        <div className="lg:col-span-4 p-5 flex flex-col justify-between bg-[#071A12] text-white relative overflow-hidden">
          <div
            className="pointer-events-none absolute -right-12 -top-12 w-44 h-44 rounded-full opacity-25 blur-2xl"
            style={{ background: "radial-gradient(circle, #00A859 0%, transparent 70%)" }}
          />
          <div className="relative flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-emerald-200/75 uppercase tracking-[0.12em]">
              Potensi Eksposur Finansial
            </span>
            <span className="text-[10px] font-mono font-semibold text-rose-200 bg-rose-500/20 border border-rose-400/30 px-2 py-0.5 rounded-md">
              Prioritas Audit
            </span>
          </div>
          <div className="relative mt-3">
            <div className="text-2xl sm:text-[26px] font-mono font-bold text-white tracking-tight leading-none">
              {formatRupiah(kpis.potential_exposure)}
            </div>
            <div className="mt-2.5 pt-2 border-t border-white/10 text-[11px] text-emerald-100/65 flex items-center justify-between">
              <span>Akumulasi selisih tarif berisiko</span>
              <span className="font-mono font-semibold text-[#6EE7B7]">
                {formatRupiah(kpis.potential_exposure, true)}
              </span>
            </div>
          </div>
        </div>

        {/* High Risk Claims (3 cols) */}
        <div className="lg:col-span-3 p-5 flex flex-col justify-between bg-surface">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-jkn-muted uppercase tracking-[0.1em]">
              Klaim Berisiko Tinggi
            </span>
            <span className="text-[11px] font-mono font-semibold text-risk-critical bg-risk-critical-bg border border-risk-critical-border px-1.5 py-0.5 rounded-md">
              {highRiskPct}%
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono font-bold text-risk-critical tracking-tight leading-none">
                {formatNumber(kpis.high_risk_claims)}
              </span>
              <span className="text-xs font-mono text-jkn-muted">
                / {formatNumber(kpis.total_claims_analyzed)} klaim
              </span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-jkn-divider text-[11px] text-jkn-muted">
              <strong
                className={
                  kpis.trends.high_risk_change_pct >= 0
                    ? "font-mono font-semibold text-risk-critical"
                    : "font-mono font-semibold text-bpjs-dark"
                }
              >
                {kpis.trends.high_risk_change_pct >= 0 ? "+" : ""}
                {kpis.trends.high_risk_change_pct}%
              </strong>{" "}
              dibanding {kpis.trends.period}
            </div>
          </div>
        </div>

        {/* Total Claims Analyzed (3 cols) */}
        <div className="lg:col-span-3 p-5 flex flex-col justify-between bg-surface">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-jkn-muted uppercase tracking-[0.1em]">
              Volume Sensus Klaim
            </span>
            <span className="text-[10px] font-mono font-semibold text-bpjs-dark bg-bpjs-soft border border-bpjs-border px-1.5 py-0.5 rounded-md">
              INA-CBG
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-mono font-bold text-jkn-text tracking-tight leading-none">
              {formatNumber(kpis.total_claims_analyzed)}
            </div>
            <div className="mt-2.5 pt-2 border-t border-jkn-divider text-[11px] text-jkn-muted">
              <strong className="font-mono font-semibold text-jkn-text">
                {kpis.trends.claims_change_pct >= 0 ? "+" : ""}
                {kpis.trends.claims_change_pct}%
              </strong>{" "}
              volume klaim · {kpis.trends.period}
            </div>
          </div>
        </div>

        {/* Providers at Risk (2 cols) */}
        <div className="lg:col-span-2 p-5 flex flex-col justify-between bg-surface">
          <span className="text-[10px] font-bold text-jkn-muted uppercase tracking-[0.1em]">
            Faskes Diawasi
          </span>
          <div className="mt-3">
            <div className="text-2xl font-mono font-bold text-jkn-text tracking-tight leading-none">
              {formatNumber(kpis.providers_at_risk)}
            </div>
            <div className="mt-2.5 pt-2 border-t border-jkn-divider text-[11px] text-jkn-muted">
              <Link href="/providers" className="text-bpjs font-semibold hover:underline inline-flex items-center gap-1">
                <span>Profil faskes</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Indonesia Map + Executive Audit Briefing */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Indonesia Risk Map (8 cols) */}
        <div className="lg:col-span-8">
          <IndonesiaRiskMap provinceData={province_risk} />
        </div>

        {/* Executive Audit Briefing (4 cols) */}
        <div className="lg:col-span-4 bg-surface rounded-2xl border border-jkn-border/90 p-5 shadow-card flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#071A12] via-bpjs to-[#34D399]" />
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-jkn-divider">
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-jkn-text">Ikhtisar Intelijen Audit</h2>
                <p className="text-[11px] text-jkn-muted mt-0.5">
                  {kpis.ai_briefing.source === "llm"
                    ? `${kpis.ai_briefing.model || "Gemini"} · Sitasi tervalidasi`
                    : kpis.ai_briefing.pending
                    ? "Menyusun sintesis temuan..."
                    : "Sintesis agregat deterministik"}
                </p>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-md font-semibold whitespace-nowrap shrink-0 border ${
                  kpis.ai_briefing.source === "llm"
                    ? "bg-intel-light text-intel-deep border-intel-border"
                    : "bg-surface-secondary text-jkn-muted border-jkn-border"
                }`}
              >
                {kpis.ai_briefing.source === "llm" ? "Vertex AI" : "Deterministik"}
              </span>
            </div>

            <p className="text-xs text-jkn-text leading-relaxed bg-surface-subtle/80 p-3 rounded-xl border border-jkn-divider">
              {kpis.ai_briefing.summary}
            </p>

            <div className="space-y-2 pt-0.5">
              <span className="text-[10px] font-bold text-jkn-dim uppercase tracking-[0.12em] block">
                Pokok Temuan Prioritas
              </span>
              <ol className="divide-y divide-jkn-divider border-t border-b border-jkn-divider">
                {kpis.ai_briefing.key_findings.map((finding, idx) => (
                  <li
                    key={idx}
                    className="py-2.5 text-xs text-jkn-text flex items-start gap-2.5"
                  >
                    <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-bpjs-soft text-bpjs-dark border border-bpjs-border shrink-0 mt-0.5">
                      0{idx + 1}
                    </span>
                    <span className="leading-snug">{finding}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-jkn-divider flex items-center justify-between gap-2">
            <span className="text-[11px] text-jkn-muted">Tanya jawab berbasis sitasi klaim</span>
            <Link
              href="/copilot"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#071A12] hover:bg-[#0D2B1E] text-white text-xs font-semibold transition-all shadow-2xs"
            >
              <span>Buka Copilot</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#34D399]" />
            </Link>
          </div>
        </div>
      </div>

      {/* Analytics Row: 7-Day Interactive Trend + Risk Distribution + Priority Facilities */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 tabular-nums">
        {/* 7-Day Risk Trend Area/Bar Chart with Mode Switcher (6 cols) */}
        <div className="lg:col-span-6 bg-surface rounded-2xl border border-jkn-border/90 p-5 shadow-card space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-jkn-text">
                {trendMode === "VOLUME"
                  ? "Tren Deteksi Klaim Berisiko (7 Hari)"
                  : "Tren Eksposur Finansial Harian (7 Hari)"}
              </h2>
              <span className="text-[11px] text-jkn-muted">
                {trendMode === "VOLUME"
                  ? "Jumlah klaim kritis, tinggi & sedang per tanggal pengajuan"
                  : "Nilai Rupiah potensi selisih klaim per hari"}
              </span>
            </div>
            <div className="inline-flex rounded-xl bg-surface-secondary p-0.5 border border-jkn-border shrink-0">
              <button
                type="button"
                onClick={() => setTrendMode("VOLUME")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  trendMode === "VOLUME"
                    ? "bg-[#071A12] text-white shadow-2xs"
                    : "text-jkn-muted hover:text-jkn-text"
                }`}
              >
                Volume Klaim
              </button>
              <button
                type="button"
                onClick={() => setTrendMode("EXPOSURE")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  trendMode === "EXPOSURE"
                    ? "bg-[#071A12] text-white shadow-2xs"
                    : "text-jkn-muted hover:text-jkn-text"
                }`}
              >
                Eksposur (Rp)
              </button>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {trendMode === "VOLUME" ? (
                <AreaChart data={kpis.risk_trends}>
                  <defs>
                    <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D92D20" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#D92D20" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D97706" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#D97706" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorMedium" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#007A3A" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#007A3A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#687D74" fontSize={11} tickLine={false} />
                  <YAxis stroke="#687D74" fontSize={11} tickLine={false} />
                  <Tooltip
                    formatter={(val: number, name: string) => [`${formatNumber(val)} klaim`, name]}
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: "12px",
                      border: "1px solid #D5E0DA",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="critical_count"
                    name="Kritis"
                    stroke="#D92D20"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCritical)"
                  />
                  <Area
                    type="monotone"
                    dataKey="high_count"
                    name="Tinggi"
                    stroke="#D97706"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorHigh)"
                  />
                  <Area
                    type="monotone"
                    dataKey="medium_count"
                    name="Sedang"
                    stroke="#007A3A"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fillOpacity={1}
                    fill="url(#colorMedium)"
                  />
                </AreaChart>
              ) : (
                <BarChart data={kpis.risk_trends}>
                  <XAxis dataKey="date" stroke="#687D74" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#687D74"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(v: number) => formatRupiah(v, true)}
                  />
                  <Tooltip
                    formatter={(val: number) => [formatRupiah(val), "Potensi Eksposur"]}
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: "12px",
                      border: "1px solid #D5E0DA",
                      fontSize: "12px",
                    }}
                  />
                  <Bar
                    dataKey="exposure_amount"
                    name="Eksposur Harian"
                    fill="#D92D20"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Distribution Breakdown (3 cols) */}
        <div className="lg:col-span-3 bg-surface rounded-2xl border border-jkn-border/90 p-5 shadow-card flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-jkn-text">Distribusi Tingkat Risiko</h2>
            <p className="text-[11px] text-jkn-muted mt-0.5">Filter cepat ke sensus klaim</p>
          </div>
          <div className="h-36 w-full relative flex items-center justify-center my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={60}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {distributionChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: number) => [formatNumber(val), "Klaim"]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-sm font-mono font-bold text-risk-critical">{highRiskPct}%</span>
              <span className="text-[9px] font-bold text-jkn-dim uppercase tracking-wider">
                Kritis+Tinggi
              </span>
            </div>
          </div>
          <div className="divide-y divide-jkn-divider border-t border-jkn-divider text-xs">
            {distributionChartData.map((item) => (
              <Link
                key={item.level}
                href={`/investigation-queue?mode=CLAIMS&risk_level=${item.level}`}
                className="flex items-center justify-between py-1.5 hover:text-bpjs transition-colors"
              >
                <span className="flex items-center gap-2 font-medium text-jkn-text">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.name}
                </span>
                <span className="font-mono font-semibold text-jkn-muted">
                  {formatNumber(item.value)}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Priority Facilities Table/List (3 cols) */}
        <div className="lg:col-span-3 bg-surface rounded-2xl border border-jkn-border/90 p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-jkn-text">Faskes Prioritas Audit</h2>
              <Link href="/providers" className="text-xs font-semibold text-bpjs hover:underline">
                Direktori →
              </Link>
            </div>
            <p className="text-[11px] text-jkn-muted mt-0.5">Diurutkan menurut skor risiko agregat</p>
          </div>

          <div className="divide-y divide-jkn-divider border-t border-b border-jkn-divider my-3 flex-1">
            {[...top_providers]
              .sort((a, b) => b.risk_score - a.risk_score)
              .slice(0, 4)
              .map((p) => (
                <Link
                  key={p.provider_id}
                  href={`/providers/${p.provider_id}`}
                  className="py-2.5 flex items-center justify-between gap-2 hover:bg-surface-subtle transition-colors group"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-jkn-text group-hover:text-bpjs truncate">
                      {p.name}
                    </div>
                    <div className="text-[11px] text-jkn-muted truncate">
                      {p.city} · <span className="font-mono">{formatRupiah(p.potential_exposure, true)}</span>
                    </div>
                  </div>
                  <RiskPill score={p.risk_score} level={p.risk_level} size="sm" />
                </Link>
              ))}
          </div>

          <div className="text-[11px] text-jkn-muted">
            Menampilkan 4 dari {formatNumber(top_providers.length)} faskes aktif.
          </div>
        </div>
      </div>

      {/* Combined Forensic Registers: Emerging Signals & 8-Detector Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 tabular-nums items-start">
        {/* Emerging Signals Register (5 cols) */}
        <div className="lg:col-span-5 bg-surface rounded-2xl border border-jkn-border/90 shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-jkn-divider flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-jkn-text">Sinyal Anomali Emergen (14 Hari)</h2>
              <p className="text-[11px] text-jkn-muted mt-0.5">
                Pola klaim dengan lonjakan frekuensi tertinggi lintas faskes
              </p>
            </div>
            <Link
              href="/risk-intelligence"
              className="text-xs font-semibold text-bpjs hover:underline flex items-center gap-0.5 shrink-0"
            >
              <span>Graf Klaster</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {emerging_signals.length === 0 ? (
            <p className="p-5 text-xs text-jkn-muted">Belum ada lonjakan signifikan pada periode ini.</p>
          ) : (
            <div className="divide-y divide-jkn-divider">
              {emerging_signals.map((signal) => (
                <Link
                  key={signal.signal_id}
                  href={`/investigation-queue?risk_type=${signal.risk_type}`}
                  className="p-4 block hover:bg-surface-subtle transition-colors group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <RiskPill type={signal.risk_type} size="sm" />
                      <span className="text-xs font-bold text-jkn-text group-hover:text-bpjs truncate">
                        {signal.title}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-bold text-risk-critical shrink-0">
                      {formatRupiah(signal.potential_exposure, true)}
                    </span>
                  </div>
                  <p className="text-[11px] text-jkn-muted mt-1.5 leading-relaxed">
                    {signal.description}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-jkn-dim">
                    <span>
                      {signal.affected_providers_count} faskes terdampak ·{" "}
                      <strong className="font-mono text-jkn-text">
                        {signal.change_percentage >= 0 ? "+" : ""}
                        {signal.change_percentage}%
                      </strong>
                    </span>
                    <span>{formatRelativeTime(signal.detected_at)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* 8-Detector Forensic Matrix Table (7 cols) */}
        <div className="lg:col-span-7 bg-surface rounded-2xl border border-jkn-border/90 shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-jkn-divider flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-jkn-text">
                Matriks 8 Detektor Forensik Klaim JKN
              </h2>
              <p className="text-[11px] text-jkn-muted mt-0.5">
                Distribusi temuan klaim, tingkat keyakinan rata-rata, dan nilai eksposur per detektor
              </p>
            </div>
            <Link
              href="/model-performance"
              className="text-xs font-semibold text-bpjs hover:underline flex items-center gap-0.5 shrink-0"
            >
              <span>Evaluasi F1</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-subtle border-b border-jkn-border text-[10px] font-bold text-jkn-muted uppercase tracking-[0.1em]">
                  <th className="py-3 px-4">Detektor & Spesifikasi</th>
                  <th className="py-3 px-3 text-right">Klaim</th>
                  <th className="py-3 px-3 text-right">Keyakinan</th>
                  <th className="py-3 px-4 text-right w-48">Potensi Eksposur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-jkn-divider">
                {riskByType.map((item) => {
                  const barPct = Math.max(
                    4,
                    Math.round((item.potential_exposure / maxTypeExposure) * 100)
                  );
                  return (
                    <tr
                      key={item.risk_type}
                      className="hover:bg-surface-subtle transition-colors group"
                    >
                      <td className="py-2.5 px-4">
                        <Link
                          href={`/investigation-queue?risk_type=${item.risk_type}`}
                          className="block"
                        >
                          <div className="flex items-center gap-2">
                            <RiskPill type={item.risk_type} size="sm" />
                          </div>
                          <div className="text-[11px] text-jkn-muted mt-0.5 line-clamp-1">
                            {RISK_TYPE_DESC[item.risk_type] ||
                              "Deteksi anomali klaim berbasis aturan & statistik."}
                          </div>
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-jkn-text whitespace-nowrap">
                        {formatNumber(item.claim_count)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-jkn-muted whitespace-nowrap">
                        {(item.avg_confidence * 100).toFixed(0)}%
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <Link
                          href={`/investigation-queue?risk_type=${item.risk_type}`}
                          className="block space-y-1"
                        >
                          <div className="font-mono font-bold text-risk-critical group-hover:underline">
                            {formatRupiah(item.potential_exposure, true)}
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-surface-secondary overflow-hidden ml-auto max-w-[140px]">
                            <div
                              className="h-full rounded-full bg-bpjs"
                              style={{ width: `${barPct}%` }}
                            />
                          </div>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
