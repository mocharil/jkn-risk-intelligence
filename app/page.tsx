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
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
  Treemap,
} from "recharts";

interface DashboardPayload {
  kpis: DashboardKPIs;
  province_risk: ProvinceRiskData[];
  emerging_signals: EmergingSignal[];
  pattern_shifts: Array<{ risk_type: string; recent: number; previous: number; change_percentage: number | null; exposure_recent: number; significant: boolean }>;
  queue_age: Array<{ key: string; label: string; count: number }>;
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

const TYPE_SHORT: Record<string, string> = {
  UPCODING: "Upcoding",
  CLONING: "Cloning",
  PHANTOM_BILLING: "Phantom billing",
  ABNORMAL_LOS: "LOS anomali",
  UNBUNDLING: "Unbundling",
  INFLATED_BILLS: "Inflasi tagihan",
  REPEAT_BILLING: "Tagihan berulang",
  READMISSION: "Rawat ulang dini",
};

/** Warna petak provinsi: putih-hijau yang sama dengan peta panas. */
function heatColor(t: number): string {
  const from = [220, 252, 231];
  const to = [20, 83, 45];
  const k = 0.1 + 0.9 * Math.pow(Math.max(0, Math.min(1, t)), 0.6);
  return `rgb(${from.map((v, i) => Math.round(v + (to[i] - v) * k)).join(",")})`;
}

interface TreeCellProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  exposure?: number;
  claims?: number;
  tone?: number;
}

/** Petak treemap: luas = eksposur, warna = keyakinan rata-rata detektor (makin pekat makin yakin). */
function TreeCell({ x = 0, y = 0, width = 0, height = 0, name, exposure = 0, claims = 0, tone = 0 }: TreeCellProps) {
  if (width <= 0 || height <= 0) return null;
  const dark = tone > 0.45;
  const ink = dark ? "#FFFFFF" : "#11241D";
  const roomy = width > 96 && height > 56;
  const narrow = width > 60 && height > 34;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={6} fill={heatColor(tone)} stroke="#FFFFFF" strokeWidth={3} />
      {narrow && (
        <text x={x + 10} y={y + 20} fill={ink} fontSize={12} fontWeight={600}>
          {name}
        </text>
      )}
      {roomy && (
        <>
          <text x={x + 10} y={y + 38} fill={ink} fontSize={12} opacity={0.9}>
            {formatRupiah(exposure, true)}
          </text>
          <text x={x + 10} y={y + 54} fill={ink} fontSize={11} opacity={0.75}>
            {claims} klaim
          </text>
        </>
      )}
    </g>
  );
}

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

  const { kpis, province_risk, emerging_signals, pattern_shifts = [], queue_age = [], top_providers, providers_total, workflow, meta } = data;
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
  const topProvinces = [...province_risk]
    .filter((p) => p.high_risk_claims > 0)
    .sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0) || b.potential_exposure - a.potential_exposure)
    .slice(0, 5);
  const spotlightProviders = [...top_providers].sort((a, b) => b.potential_exposure - a.potential_exposure).slice(0, 3);
  const spotlightMax = Math.max(1, ...spotlightProviders.map((p) => p.potential_exposure));
  const topScore = Math.max(1, ...topProvinces.map((p) => p.risk_score ?? 0));
  const radarData = Object.keys(TYPE_SHORT).map((k) => {
    const t = pattern_shifts.find((x) => x.risk_type === k);
    return { label: TYPE_SHORT[k], recent: t?.recent ?? 0, previous: t?.previous ?? 0 };
  });
  const shiftTop = [...pattern_shifts].sort((a, b) => b.recent - b.previous - (a.recent - a.previous))[0];
  const confMin = Math.min(...riskByType.filter((r) => r.claim_count > 0).map((r) => r.avg_confidence), 1);
  const confMax = Math.max(...riskByType.filter((r) => r.claim_count > 0).map((r) => r.avg_confidence), 0);
  const treeData = riskByType
    .filter((r) => r.claim_count > 0 && r.potential_exposure > 0)
    .map((r) => ({
      name: TYPE_SHORT[r.risk_type] || r.risk_type,
      size: r.potential_exposure,
      exposure: r.potential_exposure,
      claims: r.claim_count,
      conf: r.avg_confidence,
      tone: confMax > confMin ? (r.avg_confidence - confMin) / (confMax - confMin) : 1,
    }));
  const queueAgeMax = Math.max(1, ...queue_age.map((q) => q.count));
  const queueAgeTotal = queue_age.reduce((a, q) => a + q.count, 0);
  const oldestBucket = [...queue_age].reverse().find((q) => q.count > 0);
  const shiftMax = Math.max(1, ...pattern_shifts.map((t) => Math.max(t.recent, t.previous)));
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
          <IndonesiaRiskMap provinceData={province_risk} tall heat />
        </div>

        <div className="lg:col-span-4 bg-surface rounded-2xl border border-jkn-border/90 p-5 shadow-card flex flex-col gap-4 tabular-nums">
          <div>
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
            <p className="mt-1.5 text-[13px] text-jkn-text leading-relaxed line-clamp-3">{kpis.ai_briefing.summary}</p>
            {kpis.ai_briefing.key_findings.length > 0 && (
              <details className="mt-1 group">
                <summary className="cursor-pointer text-xs font-semibold text-bpjs hover:underline list-none">
                  <span className="group-open:hidden">Baca rincian dari AI</span>
                  <span className="hidden group-open:inline">Tutup rincian</span>
                </summary>
                <ul className="mt-2 space-y-2 text-xs text-jkn-muted leading-relaxed max-h-40 overflow-y-auto">
                  {kpis.ai_briefing.key_findings.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>

          {/* Faskes sorotan: skor risiko sebagai cincin */}
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-jkn-text">Faskes sorotan</h3>
              <Link href="/providers" className="text-xs font-semibold text-bpjs hover:underline">
                Semua faskes
              </Link>
            </div>
            <ul className="mt-2 grid grid-cols-3 gap-2">
              {spotlightProviders.map((p) => {
                const r = 20;
                const c = 2 * Math.PI * r;
                return (
                  <li key={p.provider_id}>
                    <Link href={`/providers/${p.provider_id}`} className="flex flex-col items-center text-center group rounded-xl border border-jkn-divider py-2.5 px-1.5 hover:border-bpjs/50 transition-colors h-full">
                      <svg width="52" height="52" viewBox="0 0 52 52" role="img" aria-label={`Skor risiko ${p.risk_score}`}>
                        <circle cx="26" cy="26" r={r} fill="none" stroke="#E4ECE8" strokeWidth="5" />
                        <circle
                          cx="26"
                          cy="26"
                          r={r}
                          fill="none"
                          stroke={LEVEL_COLOR[p.risk_level]}
                          strokeWidth="5"
                          strokeLinecap="round"
                          strokeDasharray={`${(p.risk_score / 100) * c} ${c}`}
                          transform="rotate(-90 26 26)"
                        />
                        <text x="26" y="30" textAnchor="middle" fontSize="13" fontWeight="600" fill="#11241D">
                          {p.risk_score}
                        </text>
                      </svg>
                      <span className="mt-1.5 text-[11px] font-medium text-jkn-text group-hover:text-bpjs leading-tight line-clamp-2">{p.name}</span>
                      <span className="mt-0.5 text-[11px] font-mono text-jkn-muted">{formatRupiah(p.potential_exposure, true)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Provinsi terpanas: petak berwarna sama dengan peta */}
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-jkn-text">Provinsi terpanas</h3>
              <Link href="/risk-intelligence" className="text-xs font-semibold text-bpjs hover:underline">
                Peta lengkap
              </Link>
            </div>
            <ul className="mt-2 grid grid-cols-5 gap-1.5">
              {topProvinces.map((p) => {
                const t = Math.max(0, Math.min(1, (p.risk_score ?? 0) / Math.max(1, topScore)));
                const dark = t > 0.45;
                return (
                  <li key={p.province_code}>
                    <Link
                      href={`/investigation-queue?mode=CLAIMS&province=${p.province_code}`}
                      title={`${p.province_name}: skor ${p.risk_score}, ${p.high_risk_claims} dari ${p.total_claims} klaim berisiko tinggi`}
                      className="block rounded-lg px-1.5 py-3.5 text-center h-full hover:ring-2 hover:ring-bpjs/40 transition-shadow"
                      style={{ backgroundColor: heatColor(t), color: dark ? "#FFFFFF" : "#11241D" }}
                    >
                      <span className="block text-base font-semibold leading-none">{p.risk_score}</span>
                      <span className="block mt-1 text-[10px] leading-tight line-clamp-2 opacity-90">{p.province_name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-auto pt-3 border-t border-jkn-divider flex items-center justify-between gap-2">
            <span className="text-xs text-jkn-muted">Tanya jawab dengan rujukan klaim</span>
            <Link href="/copilot" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#071A12] hover:bg-[#0D2B1E] text-white text-sm font-semibold transition-colors">
              <span>Buka Copilot</span>
              <ArrowRight className="w-4 h-4 text-[#34D399]" aria-hidden />
            </Link>
          </div>
        </div>
      </div>

      {/* Penanganan kasus: status dan umur antrean */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 tabular-nums">
        <div className="lg:col-span-7 bg-surface rounded-2xl border border-jkn-border/90 p-5 shadow-card flex flex-col">
          <div>
            <h2 className="text-base font-bold text-jkn-text">Penanganan kasus</h2>
            <p className="text-xs text-jkn-muted mt-0.5">
              {formatNumber(workflow.total)} kasus, {formatNumber(workflow.open)} belum diputuskan. Berubah setiap kali verifikator atau supervisor menetapkan status.
            </p>
          </div>

          <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-surface-secondary" role="img" aria-label="Komposisi status kasus">
            {STATUS_FLOW.map((s) => {
              const n = workflow.by_status[s.key] || 0;
              return n ? <div key={s.key} style={{ width: `${(n / statusTotal) * 100}%`, backgroundColor: s.color }} title={`${s.label}: ${n}`} /> : null;
            })}
          </div>
          <ul className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 mb-5">
            {STATUS_FLOW.map((s) => {
              const n = workflow.by_status[s.key] || 0;
              return (
                <li key={s.key}>
                  <Link href={`/investigation-queue?status=${s.key}`} className={`flex items-center gap-2 text-sm hover:text-bpjs transition-colors ${n === 0 ? "opacity-60" : ""}`}>
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} aria-hidden />
                    <span className="text-jkn-muted truncate">{s.label}</span>
                    <span className="font-mono font-semibold text-jkn-text ml-auto">{formatNumber(n)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-auto pt-4 border-t border-jkn-divider grid grid-cols-3 gap-4">
            <div>
              <div className="font-mono font-bold text-lg text-risk-critical leading-none">{formatRupiah(workflow.confirmed_recovery, true)}</div>
              <div className="text-xs text-jkn-muted mt-1">pemulihan terkonfirmasi</div>
            </div>
            <div>
              <div className="font-mono font-bold text-lg text-jkn-text leading-none">{formatNumber(workflow.confirmed_count)}</div>
              <div className="text-xs text-jkn-muted mt-1">kasus terkonfirmasi</div>
            </div>
            <div>
              <div className="font-mono font-bold text-lg text-jkn-text leading-none">{formatNumber(workflow.false_positive_count)}</div>
              <div className="text-xs text-jkn-muted mt-1">false positive</div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 bg-surface rounded-2xl border border-jkn-border/90 p-5 shadow-card">
          <h2 className="text-base font-bold text-jkn-text">Umur kasus yang belum diputuskan</h2>
          <p className="text-xs text-jkn-muted mt-0.5">
            Hari sejak klaim diajukan sampai {asOfLabel}
            {oldestBucket && oldestBucket.key !== "d7" ? `. ${formatNumber(oldestBucket.count)} kasus berumur ${oldestBucket.label}.` : "."}
          </p>
          <ul className="mt-3 space-y-2">
            {queue_age.map((q) => (
              <li key={q.key} className="grid grid-cols-[120px_1fr_36px] items-center gap-3 text-sm">
                <span className="text-jkn-muted">{q.label}</span>
                <span className="h-2.5 rounded-full bg-surface-secondary overflow-hidden">
                  <span className="block h-full rounded-full bg-bpjs" style={{ width: `${(q.count / queueAgeMax) * 100}%` }} />
                </span>
                <span className="font-mono font-semibold text-jkn-text text-right">{formatNumber(q.count)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-jkn-muted">Total {formatNumber(queueAgeTotal)} kasus terbuka. Target penyelesaian diatur di Pengaturan.</p>
        </div>
      </div>

      {/* Tren + distribusi + faskes prioritas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 tabular-nums">
        <div className="lg:col-span-5 bg-surface rounded-2xl border border-jkn-border/90 p-5 shadow-card space-y-3">
          <div className="flex flex-col gap-3">
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
          <div className="h-48 w-full relative my-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distribution} cx="50%" cy="50%" innerRadius={56} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
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

        <div className="lg:col-span-4 bg-surface rounded-2xl border border-jkn-border/90 p-5 shadow-card flex flex-col">
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
              <Link key={p.provider_id} href={`/providers/${p.provider_id}`} className="py-3.5 flex items-center justify-between gap-2 hover:bg-surface-subtle transition-colors group">
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

      {/* Pergeseran pola (radar) + eksposur per detektor (treemap) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 tabular-nums">
        <div className="lg:col-span-5 bg-surface rounded-2xl border border-jkn-border/90 shadow-card overflow-hidden flex flex-col">
          <div className="px-5 py-4 flex items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-jkn-text">{emerging_signals.length > 0 ? "Pola yang sedang naik" : "Pergeseran pola 14 hari"}</h2>
              <p className="text-xs text-jkn-muted mt-0.5">Klaim per jenis temuan, 14 hari sampai {asOfLabel} dibanding 14 hari sebelumnya</p>
            </div>
            <Link href="/risk-intelligence" className="text-xs font-semibold text-bpjs hover:underline flex items-center gap-0.5 shrink-0 mt-1">
              <span>Graf klaster</span>
              <ChevronRight className="w-3.5 h-3.5" aria-hidden />
            </Link>
          </div>
          <div className="h-72 w-full px-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="72%">
                <PolarGrid stroke="#D5E0DA" />
                <PolarAngleAxis dataKey="label" tick={{ fontSize: 11, fill: "#475B53" }} />
                <PolarRadiusAxis angle={90} tick={false} axisLine={false} domain={[0, "dataMax"]} />
                <Radar name="14 hari sebelumnya" dataKey="previous" stroke="#94A3B8" fill="#94A3B8" fillOpacity={0.18} strokeWidth={1.5} />
                <Radar name="14 hari terakhir" dataKey="recent" stroke="#007A3A" fill="#007A3A" fillOpacity={0.35} strokeWidth={2} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [`${formatNumber(v)} klaim`, n]} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <p className="px-5 pb-4 text-xs text-jkn-muted">
            {emerging_signals.length > 0
              ? `${emerging_signals.length} jenis naik secara bermakna: ${emerging_signals.map((e) => TYPE_SHORT[e.risk_type] || e.risk_type).join(", ")}.`
              : shiftTop
              ? `Belum ada kenaikan yang bermakna secara statistik. Selisih terbesar: ${TYPE_SHORT[shiftTop.risk_type] || shiftTop.risk_type} (${shiftTop.previous} menjadi ${shiftTop.recent} klaim).`
              : "Belum ada temuan pada 28 hari terakhir."}
          </p>
        </div>

        <div className="lg:col-span-7 bg-surface rounded-2xl border border-jkn-border/90 shadow-card overflow-hidden flex flex-col">
          <div className="px-5 py-4 flex items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-jkn-text">Eksposur per jenis temuan</h2>
              <p className="text-xs text-jkn-muted mt-0.5">Luas petak = eksposur, warna makin pekat = keyakinan detektor makin tinggi</p>
            </div>
            <Link href="/model-performance" className="text-xs font-semibold text-bpjs hover:underline flex items-center gap-0.5 shrink-0 mt-1">
              <span>Akurasi detektor</span>
              <ChevronRight className="w-3.5 h-3.5" aria-hidden />
            </Link>
          </div>
          <div className="h-72 w-full px-4 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap data={treeData} dataKey="size" aspectRatio={16 / 9} isAnimationActive={false} content={<TreeCell />}>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(_v: number, _n: string, item) => {
                    const d = item.payload as { exposure: number; claims: number; conf: number };
                    return [`${formatRupiah(d.exposure)}, ${d.claims} klaim, keyakinan ${Math.round(d.conf * 100)}%`, item.payload.name];
                  }}
                />
              </Treemap>
            </ResponsiveContainer>
          </div>
          <div className="px-5 pb-4 flex items-center justify-between text-xs text-jkn-muted">
            <span>Detektor dengan klaim: {treeData.length} dari {riskByType.length}</span>
            <span className="inline-flex items-center gap-2">
              keyakinan rendah
              <span className="inline-block w-20 h-2 rounded-full border border-jkn-border" style={{ background: "linear-gradient(90deg,#DCFCE7,#14532D)" }} aria-hidden />
              tinggi
            </span>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
