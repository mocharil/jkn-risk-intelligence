"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { IndonesiaRiskMap } from "@/components/map/IndonesiaRiskMap";
import { RiskPill } from "@/components/ui/RiskPill";
import { PageLoader } from "@/components/ui/PageLoader";
import { formatRupiah, formatNumber } from "@/lib/formatting/currency";
import { formatDate, formatRelativeTime } from "@/lib/formatting/date";
import { DashboardKPIs, EmergingSignal, ProvinceRiskData } from "@/types/risk";
import { Provider } from "@/types/provider";
import { AlertTriangle, ArrowRight, ChevronRight, RefreshCw } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface DashboardPayload {
  kpis: DashboardKPIs;
  province_risk: ProvinceRiskData[];
  emerging_signals: EmergingSignal[];
  top_providers: Provider[];
  providers_total: number;
  workflow: {
    total: number;
    open: number;
    by_status: Record<string, number>;
    confirmed_count: number;
    confirmed_recovery: number;
    false_positive_count: number;
    need_evidence_count: number;
  };
  meta: {
    first_submission_date: string | null;
    ingested_claims: number;
    data_mode: "sintetis" | "campuran";
    datasets_ready: number;
    analyzed_at: string | null;
    embedding_model: string | null;
  };
}

const LEVEL_COLOR = { CRITICAL: "#B91C1C", HIGH: "#EA580C", MEDIUM: "#CA8A04", LOW: "#059669" } as const;

const RISK_TYPE_DESC: Record<string, string> = {
  UPCODING: "Tingkat keparahan INA-CBG dinaikkan tanpa bukti klinis",
  CLONING: "Narasi medis nyaris identik di antara pasien berbeda",
  PHANTOM_BILLING: "Tindakan ditagih tanpa catatan tindakan atau laporan operasi",
  ABNORMAL_LOS: "Lama rawat jauh di atas klaim sejenis",
  UNBUNDLING: "Komponen paket tarif ditagih terpisah",
  INFLATED_BILLS: "Harga komponen melebihi harga acuan",
  REPEAT_BILLING: "Episode perawatan yang sama ditagih lebih dari sekali",
  READMISSION: "Pasien masuk lagi dalam 30 hari",
};

const STATUS_FLOW: Array<{ key: string; label: string; color: string }> = [
  { key: "NEW", label: "Baru", color: "#94A3B8" },
  { key: "UNDER_INVESTIGATION", label: "Diperiksa", color: "#0E7490" },
  { key: "NEED_EVIDENCE", label: "Butuh bukti", color: "#CA8A04" },
  { key: "ESCALATED", label: "Dieskalasi", color: "#7C3AED" },
  { key: "CONFIRMED_RISK", label: "Risiko terkonfirmasi", color: "#B91C1C" },
  { key: "FALSE_POSITIVE", label: "False positive", color: "#059669" },
  { key: "CLOSED", label: "Ditutup", color: "#64748B" },
];

const RANGES = [
  { key: "7", label: "7 hari", unit: "per hari" },
  { key: "30", label: "30 hari", unit: "per hari" },
  { key: "90", label: "90 hari", unit: "per minggu" },
] as const;

/** Perubahan persen. Untuk metrik risiko, naik = buruk (merah) dan turun = baik (hijau). */
function Delta({ value, riskMetric = true, basis }: { value: number; riskMetric?: boolean; basis: string }) {
  const up = value > 0;
  const flat = value === 0;
  const tone = flat || !riskMetric ? "text-jkn-text" : up ? "text-risk-critical" : "text-bpjs-dark";
  return (
    <span className="text-xs text-jkn-muted">
      <strong className={`font-mono font-semibold ${tone}`}>
        {up ? "+" : ""}
        {value.toLocaleString("id-ID")}%
      </strong>{" "}
      {basis}
    </span>
  );
}

const tooltipStyle = { backgroundColor: "#FFFFFF", borderRadius: 12, border: "1px solid #D5E0DA", fontSize: 12 };

export default function CommandCenterPage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [trendMode, setTrendMode] = useState<"VOLUME" | "EXPOSURE">("VOLUME");
  const [range, setRange] = useState<"7" | "30" | "90">("30");
  const briefingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pollBriefing = useCallback((attempt = 0) => {
    if (attempt > 10) return;
    briefingTimer.current = setTimeout(() => {
      fetch("/api/dashboard/briefing")
        .then((r) => (r.ok ? r.json() : null))
        .then((b) => {
          if (!b?.ai_briefing) return;
          setData((prev) => (prev ? { ...prev, kpis: { ...prev.kpis, ai_briefing: b.ai_briefing } } : prev));
          if (b.ai_briefing.pending) pollBriefing(attempt + 1);
        })
        .catch(() => {});
    }, attempt === 0 ? 300 : 3000);
  }, []);

  const load = useCallback(
    (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(null);
      fetch("/api/dashboard")
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((payload: DashboardPayload) => {
          setData(payload);
          setLoadedAt(new Date());
          if (briefingTimer.current) clearTimeout(briefingTimer.current);
          if (payload?.kpis?.ai_briefing?.pending) pollBriefing();
        })
        .catch((err) => {
          console.error("Failed to load dashboard:", err);
          // Bila sudah ada data, pertahankan tampilan lama dan tandai gagal menyegarkan.
          setError("Gagal memuat data Command Center. Pastikan layanan berjalan, lalu coba lagi.");
        })
        .finally(() => {
          setLoading(false);
          setRefreshing(false);
        });
    },
    [pollBriefing]
  );

  useEffect(() => {
    load();
    const onUpdated = () => load(true);
    const onFocus = () => document.visibilityState === "visible" && load(true);
    const interval = setInterval(() => document.visibilityState === "visible" && load(true), 90_000);
    window.addEventListener("arsa:store-updated", onUpdated);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("arsa:store-updated", onUpdated);
      document.removeEventListener("visibilitychange", onFocus);
      clearInterval(interval);
      if (briefingTimer.current) clearTimeout(briefingTimer.current);
    };
  }, [load]);

  if (loading && !data) {
    return (
      <DashboardShell>
        <PageLoader label="Memuat Command Center..." className="h-[60vh]" />
      </DashboardShell>
    );
  }

  if (!data) {
    return (
      <DashboardShell>
        <div className="bg-surface rounded-xl border border-jkn-border p-8 text-center max-w-md mx-auto my-16 space-y-3 shadow-subtle">
          <AlertTriangle className="w-6 h-6 text-risk-critical mx-auto" />
          <h2 className="text-base font-bold text-jkn-text">Command Center belum bisa dimuat</h2>
          <p className="text-sm text-jkn-muted">{error || "Data ringkasan risiko belum tersedia."}</p>
          <button
            onClick={() => load()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-bpjs text-white text-sm font-semibold hover:bg-bpjs-deep transition-colors"
          >
            Coba lagi
          </button>
        </div>
      </DashboardShell>
    );
  }

  const { kpis, province_risk, emerging_signals, top_providers, providers_total, workflow, meta } = data;
  const { trends } = kpis;

  const distribution = [
    { name: "Kritis", level: "CRITICAL", value: kpis.risk_distribution.critical, color: LEVEL_COLOR.CRITICAL },
    { name: "Tinggi", level: "HIGH", value: kpis.risk_distribution.high, color: LEVEL_COLOR.HIGH },
    { name: "Sedang", level: "MEDIUM", value: kpis.risk_distribution.medium, color: LEVEL_COLOR.MEDIUM },
    { name: "Rendah", level: "LOW", value: kpis.risk_distribution.low, color: LEVEL_COLOR.LOW },
  ];
  const highRiskPct = kpis.total_claims_analyzed > 0 ? (kpis.high_risk_claims / kpis.total_claims_analyzed) * 100 : 0;
  const riskByType = kpis.risk_by_type || [];
  const maxTypeExposure = Math.max(1, ...riskByType.map((r) => r.potential_exposure));
  const series = kpis.trend_series?.[range] ?? kpis.risk_trends;
  const rangeCfg = RANGES.find((r) => r.key === range)!;
  const trendTotal = series.reduce((a, p) => a + p.critical_count + p.high_count + p.medium_count, 0);
  const trendExposure = series.reduce((a, p) => a + p.exposure_amount, 0);
  const statusTotal = Math.max(1, workflow.total);
  const asOfLabel = formatDate(kpis.as_of);
  const firstLabel = meta.first_submission_date ? formatDate(meta.first_submission_date) : "-";

  return (
    <DashboardShell>
      {/* Judul + kesegaran data */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-jkn-text tracking-tight">Pusat komando risiko klaim JKN</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-jkn-muted">
            <span>
              {formatNumber(kpis.total_claims_analyzed)} klaim, diajukan {firstLabel} sampai {asOfLabel}
            </span>
            <span
              className={`px-2 py-0.5 rounded-md border font-medium ${
                meta.data_mode === "sintetis"
                  ? "bg-risk-medium-bg text-risk-medium border-risk-medium-border"
                  : "bg-bpjs-soft text-bpjs-dark border-bpjs-border"
              }`}
              title={
                meta.data_mode === "sintetis"
                  ? "Dataset bawaan: klaim sintetis berlabel untuk uji akurasi. Unggah data SIMRS/E-Klaim di Manajemen Data untuk memakai data sendiri."
                  : `${formatNumber(meta.ingested_claims)} klaim berasal dari unggahan pengguna.`
              }
            >
              {meta.data_mode === "sintetis"
                ? "Dataset sintetis berlabel"
                : `Sintetis + ${formatNumber(meta.ingested_claims)} klaim unggahan`}
            </span>
            {meta.analyzed_at && <span>Analisis terakhir {formatRelativeTime(meta.analyzed_at)}</span>}
            <Link href="/acuan-nasional" className="font-semibold text-bpjs hover:underline">
              Bandingkan dengan acuan nasional BPJS
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => load(true)}
            disabled={refreshing}
            aria-label="Segarkan data"
            title={loadedAt ? `Dimuat ${loadedAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}` : "Segarkan data"}
            className="h-9 inline-flex items-center gap-2 px-3 rounded-xl bg-surface border border-jkn-border text-jkn-text text-sm font-semibold hover:bg-surface-secondary transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bpjs"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
            <span>{refreshing ? "Menyegarkan" : "Segarkan"}</span>
          </button>
          <Link
            href="/investigation-queue?mode=CLAIMS"
            className="h-9 inline-flex items-center px-3.5 rounded-xl bg-surface border border-jkn-border text-jkn-text text-sm font-semibold hover:bg-surface-secondary transition-colors"
          >
            Semua klaim
          </Link>
          <Link
            href="/investigation-queue"
            className="h-9 inline-flex items-center gap-2 px-4 rounded-xl bg-[#071A12] text-white text-sm font-semibold shadow-card hover:bg-[#0D2B1E] transition-colors tabular-nums"
          >
            <span>Antrean prioritas ({formatNumber(workflow.open)})</span>
            <ArrowRight className="w-4 h-4 text-[#34D399]" aria-hidden />
          </Link>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-risk-critical-border bg-risk-critical-bg px-4 py-2.5 text-sm text-risk-critical">
          <span>{error} Data di bawah adalah muatan terakhir yang berhasil.</span>
          <button onClick={() => load(true)} className="font-semibold underline underline-offset-2 shrink-0">
            Coba lagi
          </button>
        </div>
      )}

      {/* Angka utama */}
      <div className="bg-surface rounded-2xl border border-jkn-border/90 shadow-card overflow-hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 divide-y sm:divide-y-0 sm:divide-x divide-jkn-divider tabular-nums">
        <div className="lg:col-span-4 p-5 flex flex-col justify-between bg-[#071A12] text-white relative overflow-hidden">
          <div
            className="pointer-events-none absolute -right-12 -top-12 w-44 h-44 rounded-full opacity-25 blur-2xl"
            style={{ background: "radial-gradient(circle, #00A859 0%, transparent 70%)" }}
          />
          <span className="relative text-sm font-medium text-emerald-100/80">Potensi eksposur finansial</span>
          <div className="relative mt-3">
            <div className="text-3xl font-mono font-bold tracking-tight leading-none" title={formatRupiah(kpis.potential_exposure)}>
              {formatRupiah(kpis.potential_exposure, true)}
            </div>
            <div className="mt-3 pt-2.5 border-t border-white/10 text-xs text-emerald-100/75 space-y-1">
              <div>Selisih tarif klaim terflag terhadap tarif acuan peer</div>
              <div>
                <strong className="font-mono font-semibold text-emerald-200">
                  {trends.exposure_change_pct > 0 ? "+" : ""}
                  {trends.exposure_change_pct.toLocaleString("id-ID")}%
                </strong>{" "}
                eksposur klaim baru, {trends.period}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 p-5 flex flex-col justify-between">
          <span className="text-sm font-medium text-jkn-muted">Klaim berisiko tinggi</span>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-mono font-bold text-risk-critical tracking-tight leading-none">{formatNumber(kpis.high_risk_claims)}</span>
              <span className="text-sm font-mono text-jkn-muted">
                dari {formatNumber(kpis.total_claims_analyzed)} ({highRiskPct.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%)
              </span>
            </div>
            <div className="mt-3 pt-2.5 border-t border-jkn-divider">
              <Delta value={trends.high_risk_change_pct} basis={trends.period} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 p-5 flex flex-col justify-between">
          <span className="text-sm font-medium text-jkn-muted">Klaim diajukan</span>
          <div className="mt-3">
            <div className="text-3xl font-mono font-bold text-jkn-text tracking-tight leading-none">{formatNumber(kpis.total_claims_analyzed)}</div>
            <div className="mt-3 pt-2.5 border-t border-jkn-divider">
              <Delta value={trends.claims_change_pct} riskMetric={false} basis={trends.period} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 p-5 flex flex-col justify-between">
          <span className="text-sm font-medium text-jkn-muted">Faskes berisiko</span>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-mono font-bold text-jkn-text tracking-tight leading-none">{formatNumber(kpis.providers_at_risk)}</span>
              <span className="text-sm font-mono text-jkn-muted">dari {formatNumber(providers_total)}</span>
            </div>
            <div className="mt-3 pt-2.5 border-t border-jkn-divider">
              <Delta value={trends.providers_change_pct} basis={trends.period} />
            </div>
          </div>
        </div>
      </div>

      {/* Peta + ringkasan */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8">
          <IndonesiaRiskMap provinceData={province_risk} />
        </div>

        <div className="lg:col-span-4 bg-surface rounded-2xl border border-jkn-border/90 p-5 shadow-card flex flex-col justify-between">
          <div className="space-y-4">
            <div className="pb-3 border-b border-jkn-divider">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-base font-bold text-jkn-text">Ringkasan temuan</h2>
                <span
                  className={`text-xs px-2 py-0.5 rounded-md font-semibold whitespace-nowrap shrink-0 border ${
                    kpis.ai_briefing.source === "llm" ? "bg-intel-light text-intel-deep border-intel-border" : "bg-surface-secondary text-jkn-muted border-jkn-border"
                  }`}
                >
                  {kpis.ai_briefing.source === "llm" ? "Ditulis AI" : kpis.ai_briefing.pending ? "Menyusun" : "Dihitung otomatis"}
                </span>
              </div>
              <p className="text-xs text-jkn-muted mt-1">
                {kpis.ai_briefing.source === "llm"
                  ? `${kpis.ai_briefing.model || "Model bahasa"}, setiap rujukan dicek terhadap data`
                  : kpis.ai_briefing.pending
                  ? "Model bahasa sedang menulis ringkasan; sementara ini tampil ringkasan hitung otomatis."
                  : "Rangkuman dari agregat klaim tanpa model bahasa."}
              </p>
            </div>

            <p className="text-sm text-jkn-text leading-relaxed">{kpis.ai_briefing.summary}</p>

            <div>
              <h3 className="text-sm font-semibold text-jkn-text mb-1.5">Temuan teratas</h3>
              <ul className="divide-y divide-jkn-divider border-t border-b border-jkn-divider">
                {kpis.ai_briefing.key_findings.map((finding, idx) => (
                  <li key={idx} className="py-2.5 text-sm text-jkn-text leading-snug">
                    {finding}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-jkn-divider flex items-center justify-between gap-2">
            <span className="text-xs text-jkn-muted">Tanya jawab dengan rujukan klaim</span>
            <Link href="/copilot" className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#071A12] hover:bg-[#0D2B1E] text-white text-sm font-semibold transition-colors">
              <span>Buka Copilot</span>
              <ArrowRight className="w-4 h-4 text-[#34D399]" aria-hidden />
            </Link>
          </div>
        </div>
      </div>

      {/* Status penanganan kasus (berubah saat pengguna memutuskan) */}
      <div className="bg-surface rounded-2xl border border-jkn-border/90 p-5 shadow-card tabular-nums">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-jkn-text">Penanganan kasus</h2>
            <p className="text-xs text-jkn-muted mt-0.5">
              {formatNumber(workflow.total)} kasus, {formatNumber(workflow.open)} belum diputuskan. Angka ini berubah setiap kali verifikator atau supervisor menetapkan status.
            </p>
          </div>
          <div className="flex gap-6 text-sm">
            <div>
              <div className="font-mono font-bold text-lg text-risk-critical leading-none">{formatRupiah(workflow.confirmed_recovery, true)}</div>
              <div className="text-xs text-jkn-muted mt-1">pemulihan dari {formatNumber(workflow.confirmed_count)} kasus terkonfirmasi</div>
            </div>
            <div>
              <div className="font-mono font-bold text-lg text-jkn-text leading-none">{formatNumber(workflow.false_positive_count)}</div>
              <div className="text-xs text-jkn-muted mt-1">false positive</div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-surface-secondary" role="img" aria-label="Komposisi status kasus">
          {STATUS_FLOW.map((s) => {
            const n = workflow.by_status[s.key] || 0;
            return n ? <div key={s.key} style={{ width: `${(n / statusTotal) * 100}%`, backgroundColor: s.color }} title={`${s.label}: ${n}`} /> : null;
          })}
        </div>
        <ul className="mt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-x-4 gap-y-2">
          {STATUS_FLOW.map((s) => (
            <li key={s.key}>
              <Link href={`/investigation-queue?status=${s.key}`} className="flex items-center gap-2 text-sm hover:text-bpjs transition-colors">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} aria-hidden />
                <span className="text-jkn-muted truncate">{s.label}</span>
                <span className="font-mono font-semibold text-jkn-text ml-auto">{formatNumber(workflow.by_status[s.key] || 0)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Tren + distribusi + faskes prioritas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 tabular-nums">
        <div className="lg:col-span-6 bg-surface rounded-2xl border border-jkn-border/90 p-5 shadow-card space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-jkn-text">{trendMode === "VOLUME" ? "Klaim berisiko per tanggal pengajuan" : "Eksposur finansial per tanggal pengajuan"}</h2>
              <p className="text-xs text-jkn-muted mt-0.5">
                {trendMode === "VOLUME"
                  ? `${formatNumber(trendTotal)} klaim kritis, tinggi, dan sedang`
                  : `${formatRupiah(trendExposure, true)} selisih tarif`}
                , {rangeCfg.unit}, sampai {asOfLabel}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <div role="tablist" aria-label="Rentang waktu" className="inline-flex rounded-xl bg-surface-secondary p-0.5 border border-jkn-border">
                {RANGES.map((r) => (
                  <button
                    key={r.key}
                    role="tab"
                    aria-selected={range === r.key}
                    onClick={() => setRange(r.key)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${range === r.key ? "bg-[#071A12] text-white" : "text-jkn-muted hover:text-jkn-text"}`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <div role="tablist" aria-label="Ukuran" className="inline-flex rounded-xl bg-surface-secondary p-0.5 border border-jkn-border">
                {(["VOLUME", "EXPOSURE"] as const).map((m) => (
                  <button
                    key={m}
                    role="tab"
                    aria-selected={trendMode === m}
                    onClick={() => setTrendMode(m)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${trendMode === m ? "bg-[#071A12] text-white" : "text-jkn-muted hover:text-jkn-text"}`}
                  >
                    {m === "VOLUME" ? "Jumlah" : "Rupiah"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 4, right: 4, left: trendMode === "EXPOSURE" ? 8 : -12, bottom: 0 }}>
                <CartesianGrid stroke="#E4ECE8" vertical={false} />
                <XAxis dataKey="date" stroke="#61756D" fontSize={12} tickLine={false} axisLine={false} interval={range === "30" ? 4 : 0} />
                <YAxis
                  stroke="#61756D"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  tickFormatter={trendMode === "EXPOSURE" ? (v: number) => formatRupiah(v, true) : undefined}
                />
                {trendMode === "VOLUME" ? (
                  <>
                    <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} contentStyle={tooltipStyle} formatter={(v: number, n: string) => [`${formatNumber(v)} klaim`, n]} />
                    <Bar dataKey="critical_count" name="Kritis" stackId="a" fill={LEVEL_COLOR.CRITICAL} />
                    <Bar dataKey="high_count" name="Tinggi" stackId="a" fill={LEVEL_COLOR.HIGH} />
                    <Bar dataKey="medium_count" name="Sedang" stackId="a" fill={LEVEL_COLOR.MEDIUM} radius={[4, 4, 0, 0]} />
                  </>
                ) : (
                  <>
                    <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} contentStyle={tooltipStyle} formatter={(v: number) => [formatRupiah(v), "Eksposur"]} />
                    <Bar dataKey="exposure_amount" name="Eksposur" fill={LEVEL_COLOR.CRITICAL} radius={[4, 4, 0, 0]} />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
          {trendMode === "VOLUME" && (
            <div className="flex gap-4 text-xs text-jkn-muted">
              {distribution.slice(0, 3).map((d) => (
                <span key={d.level} className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} aria-hidden />
                  {d.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-3 bg-surface rounded-2xl border border-jkn-border/90 p-5 shadow-card flex flex-col">
          <div>
            <h2 className="text-base font-bold text-jkn-text">Tingkat risiko klaim</h2>
            <p className="text-xs text-jkn-muted mt-0.5">Klik untuk membuka daftar klaim</p>
          </div>
          <div className="h-36 w-full relative my-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distribution} cx="50%" cy="50%" innerRadius={42} outerRadius={62} paddingAngle={2} dataKey="value" stroke="none">
                  {distribution.map((entry) => (
                    <Cell key={entry.level} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [formatNumber(v), n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-mono font-bold text-risk-critical leading-none">{highRiskPct.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%</span>
              <span className="text-xs text-jkn-muted mt-1">kritis + tinggi</span>
            </div>
          </div>
          <div className="divide-y divide-jkn-divider border-t border-jkn-divider text-sm mt-auto">
            {distribution.map((item) => (
              <Link key={item.level} href={`/investigation-queue?mode=CLAIMS&risk_level=${item.level}`} className="flex items-center justify-between py-2 hover:text-bpjs transition-colors">
                <span className="flex items-center gap-2 font-medium text-jkn-text">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} aria-hidden />
                  {item.name}
                </span>
                <span className="font-mono font-semibold text-jkn-muted">{formatNumber(item.value)}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 bg-surface rounded-2xl border border-jkn-border/90 p-5 shadow-card flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-jkn-text">Faskes prioritas audit</h2>
              <p className="text-xs text-jkn-muted mt-0.5">Skor risiko tertinggi</p>
            </div>
            <Link href="/providers" className="text-xs font-semibold text-bpjs hover:underline shrink-0 mt-1">
              Semua faskes
            </Link>
          </div>
          <div className="divide-y divide-jkn-divider border-t border-b border-jkn-divider my-3 flex-1">
            {top_providers.map((p) => (
              <Link key={p.provider_id} href={`/providers/${p.provider_id}`} className="py-2.5 flex items-center justify-between gap-2 hover:bg-surface-subtle transition-colors group">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-jkn-text group-hover:text-bpjs truncate">{p.name}</div>
                  <div className="text-xs text-jkn-muted truncate">
                    {p.city}, <span className="font-mono">{formatRupiah(p.potential_exposure, true)}</span>
                  </div>
                </div>
                <RiskPill score={p.risk_score} level={p.risk_level} size="sm" />
              </Link>
            ))}
          </div>
          <div className="text-xs text-jkn-muted">
            {formatNumber(top_providers.length)} dari {formatNumber(providers_total)} faskes
          </div>
        </div>
      </div>

      {/* Sinyal emergen + matriks detektor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 tabular-nums items-start">
        <div className="lg:col-span-5 bg-surface rounded-2xl border border-jkn-border/90 shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-jkn-divider flex items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-jkn-text">Pola yang sedang naik</h2>
              <p className="text-xs text-jkn-muted mt-0.5">14 hari sampai {asOfLabel}, dibanding 14 hari sebelumnya</p>
            </div>
            <Link href="/risk-intelligence" className="text-xs font-semibold text-bpjs hover:underline flex items-center gap-0.5 shrink-0 mt-1">
              <span>Graf klaster</span>
              <ChevronRight className="w-3.5 h-3.5" aria-hidden />
            </Link>
          </div>

          {emerging_signals.length === 0 ? (
            <p className="p-5 text-sm text-jkn-muted">Belum ada pola dengan minimal 3 klaim pada periode ini.</p>
          ) : (
            <div className="divide-y divide-jkn-divider">
              {emerging_signals.map((signal) => (
                <Link key={signal.signal_id} href={`/investigation-queue?risk_type=${signal.risk_type}`} className="p-4 block hover:bg-surface-subtle transition-colors group">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <RiskPill type={signal.risk_type} size="sm" />
                      <span className="text-sm font-bold text-jkn-text group-hover:text-bpjs truncate">{signal.title}</span>
                    </div>
                    <span className="font-mono text-sm font-bold text-risk-critical shrink-0">{formatRupiah(signal.potential_exposure, true)}</span>
                  </div>
                  <p className="text-xs text-jkn-muted mt-1.5 leading-relaxed">{signal.description}</p>
                  <div className="mt-1.5 text-xs text-jkn-dim">
                    <strong className={`font-mono ${signal.change_percentage > 0 ? "text-risk-critical" : "text-bpjs-dark"}`}>
                      {signal.change_percentage > 0 ? "+" : ""}
                      {signal.change_percentage.toLocaleString("id-ID")}%
                    </strong>{" "}
                    dari {signal.previous_count ?? "-"} ke {signal.recent_count ?? "-"} klaim, {signal.affected_providers_count} faskes
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-7 bg-surface rounded-2xl border border-jkn-border/90 shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-jkn-divider flex items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-jkn-text">Temuan per detektor</h2>
              <p className="text-xs text-jkn-muted mt-0.5">Jumlah klaim, rata-rata keyakinan, dan eksposur dari {riskByType.length} detektor</p>
            </div>
            <Link href="/model-performance" className="text-xs font-semibold text-bpjs hover:underline flex items-center gap-0.5 shrink-0 mt-1">
              <span>Akurasi detektor</span>
              <ChevronRight className="w-3.5 h-3.5" aria-hidden />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-surface-subtle border-b border-jkn-border text-xs font-semibold text-jkn-muted">
                  <th scope="col" className="py-2.5 px-4">Detektor</th>
                  <th scope="col" className="py-2.5 px-3 text-right">Klaim</th>
                  <th scope="col" className="py-2.5 px-3 text-right">Keyakinan</th>
                  <th scope="col" className="py-2.5 px-4 text-right w-48">Eksposur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-jkn-divider">
                {riskByType.map((item) => {
                  const barPct = Math.max(4, Math.round((item.potential_exposure / maxTypeExposure) * 100));
                  return (
                    <tr key={item.risk_type} className="hover:bg-surface-subtle transition-colors group">
                      <td className="py-2.5 px-4">
                        <Link href={`/investigation-queue?risk_type=${item.risk_type}`} className="block">
                          <RiskPill type={item.risk_type} size="sm" />
                          <div className="text-xs text-jkn-muted mt-1 line-clamp-1">{RISK_TYPE_DESC[item.risk_type] || "Deteksi anomali klaim berbasis aturan dan statistik."}</div>
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-jkn-text whitespace-nowrap">{formatNumber(item.claim_count)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-jkn-muted whitespace-nowrap">{item.claim_count ? `${(item.avg_confidence * 100).toFixed(0)}%` : "-"}</td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <Link href={`/investigation-queue?risk_type=${item.risk_type}`} className="block space-y-1">
                          <div className="font-mono font-bold text-risk-critical group-hover:underline">{formatRupiah(item.potential_exposure, true)}</div>
                          <div className="h-1.5 w-full rounded-full bg-surface-secondary overflow-hidden ml-auto max-w-[140px]">
                            <div className="h-full rounded-full bg-bpjs" style={{ width: `${barPct}%` }} />
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
