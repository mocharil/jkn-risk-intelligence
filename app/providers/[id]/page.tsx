"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { RiskPill } from "@/components/ui/RiskPill";
import { PageLoader } from "@/components/ui/PageLoader";
import { Provider } from "@/types/provider";
import { CanonicalClaim } from "@/types/claim";
import { formatRupiah, formatNumber } from "@/lib/formatting/currency";
import { formatDate } from "@/lib/formatting/date";
import { FACILITY_TYPE_LABELS } from "@/lib/formatting/provider-labels";
import { FacilityMark, PersonAvatar } from "@/components/ui/Avatar";
import { AlertTriangle, ArrowLeft, Building2, ChevronRight, MapPin } from "lucide-react";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

const CHART_COLOR_JKN_DIM = "#687D74";
const CHART_COLOR_RISK_CRITICAL = "#D92D20";
const CHART_COLOR_BPJS = "#007A3A";

const CLASS_LABEL: Record<string, string> = {
  KELAS_1: "kelas 1",
  KELAS_2: "kelas 2",
  KELAS_3: "kelas 3",
  RAWAT_JALAN: "rawat jalan",
  TIDAK_DIKETAHUI: "kelas tak tercatat",
  VIP: "VIP",
  ICU: "ICU",
};

export default function ProviderDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [provider, setProvider] = useState<(Provider & { recent_claims: CanonicalClaim[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setLoadError(null);
    setProvider(null);
    fetch(`/api/providers/${encodeURIComponent(id)}`)
      .then(async (res) => {
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (data?.data) {
          setProvider(data.data);
        } else {
          setNotFound(true);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setLoadError(`Gagal memuat profil faskes (${err.message}).`);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <DashboardShell>
        <PageLoader label={`Memuat profil audit fasilitas kesehatan ${id}...`} />
      </DashboardShell>
    );
  }

  if (loadError) {
    return (
      <DashboardShell>
        <div role="alert" className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <AlertTriangle className="w-8 h-8 text-risk-critical" />
          <p className="text-sm font-bold text-jkn-text">{loadError}</p>
          <button type="button" onClick={() => window.location.reload()} className="text-xs font-semibold text-bpjs-dark hover:underline">
            Coba lagi
          </button>
          <Link href="/providers" className="text-xs font-semibold text-bpjs-dark hover:underline">
            Kembali ke Direktori Faskes
          </Link>
        </div>
      </DashboardShell>
    );
  }

  if (notFound || !provider) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <Building2 className="w-8 h-8 text-jkn-dim" />
          <p className="text-sm font-bold text-jkn-text">Fasilitas kesehatan tidak ditemukan</p>
          <p className="text-xs text-jkn-muted">Tidak ada profil faskes dengan kode &ldquo;{id}&rdquo;.</p>
          <Link href="/providers" className="text-xs font-semibold text-bpjs-dark hover:underline">
            Kembali ke Direktori Faskes
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const pc = provider.peer_comparison;
  const zero = { provider: 0, peer_median: 0 };
  const sev3 = pc?.severity_3_rate ?? zero;
  const losPc = pc?.avg_los_days ?? zero;
  const readm = pc?.readmission_rate_pct ?? zero;
  const rc = provider.risk_composition ?? ({} as Partial<Provider["risk_composition"]>);
  const doctors = provider.doctors ?? [];
  const trend = provider.monthly_risk_trend ?? [];
  const peerComparisonData = [
    {
      name: "Rasio Severity 3 (%)",
      provider: sev3.provider,
      peer: sev3.peer_median,
    },
    {
      name: "Rerata Lama Rawat / LOS (Hari)",
      provider: losPc.provider,
      peer: losPc.peer_median,
    },
    {
      name: "Rasio Rawat Ulang ≤30hr (%)",
      provider: readm.provider,
      peer: readm.peer_median,
    },
  ];

  // Controlled semantic tones instead of 8 rainbow colors
  const compositionItems = [
    { label: "Upcoding (Inflasi Severity)", subject: "Upcoding", pct: rc.upcoding_pct ?? 0 },
    { label: "Phantom Billing (Tanpa Bukti Tindakan)", subject: "Phantom", pct: rc.phantom_billing_pct ?? 0 },
    { label: "Cloning (Duplikasi Narasi Medis)", subject: "Cloning", pct: rc.cloning_pct ?? 0 },
    { label: "Abnormal LOS (Deviasi Lama Rawat)", subject: "LOS", pct: rc.abnormal_los_pct ?? 0 },
    { label: "Unbundling (Pemecahan Paket)", subject: "Unbundling", pct: rc.unbundling_pct ?? 0 },
    { label: "Inflated Bills (Mark-up Obat/Alkes)", subject: "Inflated", pct: rc.inflated_bills_pct ?? 0 },
    { label: "Repeat Billing (Tagihan Berulang)", subject: "Repeat", pct: rc.repeat_billing_pct ?? 0 },
    { label: "Readmission (Rawat Ulang Dini)", subject: "Readmisi", pct: rc.readmission_pct ?? 0 },
  ];

  const avgAmtProvider = (pc?.avg_claim_amount?.provider ?? 0);
  const avgAmtPeer = (pc?.avg_claim_amount?.peer_median ?? 0);
  const maxAvgAmt = Math.max(1, avgAmtProvider, avgAmtPeer);
  const amtVariancePct = avgAmtPeer > 0 ? Math.round(((avgAmtProvider - avgAmtPeer) / avgAmtPeer) * 100) : 0;

  return (
    <DashboardShell>
      {/* Header */}
      <div className="bg-[#071A12] text-white rounded-2xl border border-jkn-border shadow-subtle overflow-hidden p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link
            href="/providers"
            aria-label="Kembali ke daftar faskes"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-semibold text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
            Daftar faskes
          </Link>
          <span className="text-sm font-mono text-emerald-200">
            {provider.provider_id} · {FACILITY_TYPE_LABELS[provider.type] || provider.type.replace(/_/g, " ")}
          </span>
        </div>
        <div className="flex items-start gap-4">
          <FacilityMark level={provider.risk_level} size={52} />
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{provider.name}</h1>
              <RiskPill score={provider.risk_score} level={provider.risk_level} size="sm" />
            </div>
            <p className="text-sm text-emerald-100/85 mt-1.5 inline-flex items-center gap-1.5 flex-wrap">
              <MapPin className="w-4 h-4 text-emerald-300 shrink-0" aria-hidden />
              {provider.address && provider.address !== "—" ? `${provider.address}, ` : ""}
              {provider.city}, {provider.province_name}
            </p>
          </div>
        </div>
        {provider.national?.small_sample && (
          <p className="inline-flex items-start gap-2 text-sm text-amber-100 bg-amber-500/15 border border-amber-300/30 rounded-lg px-3 py-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
            <span>
              Baru {provider.national.claims} klaim pada data ini, di bawah 20. Skor dan rasio faskes ini belum dapat disimpulkan; gunakan sebagai petunjuk, bukan temuan.
            </span>
          </p>
        )}
      </div>

      {/* Unified Telemetry Strip (Replaces 4 floating cards) */}
      <div className="bg-surface rounded-xl border border-jkn-border shadow-subtle grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-jkn-divider tabular-nums">
        <div className="p-4 sm:p-5">
          <span className="text-xs text-jkn-muted font-semibold block">
            Potensi Eksposur Risiko
          </span>
          <div className="text-2xl font-mono font-bold text-risk-critical mt-1.5">
            {formatRupiah(provider.potential_exposure, true)}
          </div>
          <span className="text-[11px] font-mono text-jkn-muted mt-1 block">
            {formatRupiah(provider.potential_exposure)}
          </span>
        </div>

        <div className="p-4 sm:p-5">
          <span className="text-xs text-jkn-muted font-semibold block">
            Klaim Risiko Tinggi
          </span>
          <div className="text-2xl font-mono font-bold text-jkn-text mt-1.5">
            {formatNumber(provider.high_risk_claims)}{" "}
            <span className="text-xs font-normal text-jkn-muted">
              / {formatNumber(provider.total_claims)}
            </span>
          </div>
          <span className="text-[11px] text-risk-critical font-semibold mt-1 block">
            {provider.total_claims > 0
              ? ((provider.high_risk_claims / provider.total_claims) * 100).toFixed(1)
              : "0"}
            % dari populasi klaim faskes
          </span>
        </div>

        <div className="p-4 sm:p-5">
          <span className="text-xs text-jkn-muted font-semibold block">
            Rerata Tagihan per Klaim
          </span>
          <div className="text-2xl font-mono font-bold text-jkn-text mt-1.5">
            {formatRupiah(avgAmtProvider, true)}
          </div>
          <span className="text-[11px] text-jkn-muted mt-1 block">
            {amtVariancePct >= 0 ? "+" : ""}
            {amtVariancePct}% terhadap median faskes lain ({formatRupiah(avgAmtPeer, true)})
          </span>
        </div>

        <div className="p-4 sm:p-5">
          <span className="text-xs text-jkn-muted font-semibold block">
            Pola Anomali Dominan
          </span>
          <div className="mt-2">
            <RiskPill type={provider.dominant_risk_type} size="sm" />
          </div>
          <span className="text-[11px] text-jkn-muted block mt-1.5">
            {doctors.length} DPJP aktif dalam pengawasan
          </span>
        </div>
      </div>

      {/* Posisi terhadap statistik resmi BPJS */}
      {provider.national && (
        <div className="bg-surface rounded-xl border border-jkn-border p-5 shadow-subtle space-y-3 tabular-nums">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base font-bold text-jkn-text">Dibanding statistik resmi BPJS {provider.national.year}</h2>
            <Link href="/acuan-nasional" className="text-sm font-semibold text-bpjs hover:underline">
              Lihat acuan nasional
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="p-4 rounded-lg bg-surface-secondary/70 border border-jkn-divider">
              <span className="text-xs text-jkn-dim block">Biaya klaim vs rerata nasional</span>
              <span
                className={`text-2xl font-mono font-bold block mt-1 ${
                  provider.national.cost_ratio === null ? "text-jkn-muted" : provider.national.cost_ratio >= 1.5 ? "text-risk-critical" : provider.national.cost_ratio >= 1.25 ? "text-risk-high" : "text-jkn-text"
                }`}
              >
                {provider.national.cost_ratio === null ? "-" : `${provider.national.cost_ratio.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}x`}
              </span>
              <span className="text-xs text-jkn-muted block mt-1">
                Tagihan dibagi rerata nasional untuk campuran kelas rawat yang sama ({Object.entries(provider.national.class_mix ?? {})
                  .sort((a, b) => b[1] - a[1])
                  .map(([k, v]) => `${CLASS_LABEL[k] || k} ${Math.round(v * 100)}%`)
                  .join(", ") || "tidak ada klaim"}).
              </span>
            </div>
            <div className="p-4 rounded-lg bg-surface-secondary/70 border border-jkn-divider">
              <span className="text-xs text-jkn-dim block">Lama rawat vs rerata kelas</span>
              <span className="text-2xl font-mono font-bold text-jkn-text block mt-1">
                {provider.national.los_ratio === null ? "-" : `${provider.national.los_ratio.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}x`}
              </span>
              <span className="text-xs text-jkn-muted block mt-1">Lama rawat rerata faskes dibagi rerata nasional kelas yang sama.</span>
            </div>
            {provider.national.province && (
              <div className="p-4 rounded-lg bg-surface-secondary/70 border border-jkn-divider">
                <span className="text-xs text-jkn-dim block">Konteks {provider.national.province.name}</span>
                <span className="text-2xl font-mono font-bold text-jkn-text block mt-1">{formatNumber(provider.national.province.fkrtl_count)} FKRTL</span>
                <span className="text-xs text-jkn-muted block mt-1">
                  {provider.national.province.fkrtl_per_100k.toLocaleString("id-ID")} per 100 ribu peserta (rerata provinsi {provider.national.province.fkrtl_per_100k_national_mean.toLocaleString("id-ID")}).
                  Biaya per admisi di provinsi ini {formatRupiah(provider.national.province.cost_per_admission, true)}, indeks {provider.national.province.cost_index.toLocaleString("id-ID", { maximumFractionDigits: 2 })} terhadap nasional.
                </span>
              </div>
            )}
          </div>
          <p className="text-xs text-jkn-muted leading-relaxed">
            Rerata nasional mencakup seluruh jenis kasus, jadi dipakai sebagai konteks kewajaran, bukan bukti kecurangan. Klaim yang ditandai ikut dihitung, sehingga faskes dengan banyak temuan cenderung di atas 1,0.
          </p>
        </div>
      )}

      {/* Peer Benchmarking Chart & Radar + 8-Detector Composition */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 tabular-nums">
        {/* Peer Benchmark Bar Chart + Average Tariff Bullet Comparison (6 cols) */}
        <div className="lg:col-span-6 bg-surface rounded-xl border border-jkn-border p-5 shadow-subtle space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div>
              <h2 className="text-sm font-bold text-jkn-text">
                Dibanding faskes lain pada data ini
              </h2>
              <p className="text-[11px] text-jkn-muted mt-0.5">
                Faskes ini (merah) terhadap median seluruh faskes pada data yang dianalisis (hijau)
              </p>
            </div>
            <div className="space-y-3.5" role="list" aria-label="Perbandingan indikator dengan median faskes lain">
              {peerComparisonData.map((row) => {
                const unit = row.name.includes("Hari") ? " hari" : "%";
                const max = Math.max(row.provider, row.peer, 0.0001);
                return (
                  <div key={row.name} role="listitem" className="space-y-1">
                    <div className="text-sm font-medium text-jkn-text">{row.name.replace(" (%)", "").replace(" (Hari)", "")}</div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-20 text-jkn-muted shrink-0">Faskes ini</span>
                      <div className="h-2 flex-1 rounded-full bg-surface-secondary overflow-hidden"><div className="h-full rounded-full bg-risk-critical" style={{ width: `${(row.provider / max) * 100}%` }} /></div>
                      <span className="w-16 text-right font-mono font-semibold text-jkn-text">{row.provider.toLocaleString("id-ID")}{unit}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-20 text-jkn-muted shrink-0">Median lain</span>
                      <div className="h-2 flex-1 rounded-full bg-surface-secondary overflow-hidden"><div className="h-full rounded-full bg-bpjs" style={{ width: `${(row.peer / max) * 100}%` }} /></div>
                      <span className="w-16 text-right font-mono font-semibold text-jkn-text">{row.peer.toLocaleString("id-ID")}{unit}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Visual Bullet Comparison for Average Claim Tariff */}
          <div className="p-3.5 rounded-lg bg-surface-secondary border border-jkn-border space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-jkn-text">Rerata nilai klaim vs median faskes lain</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                  amtVariancePct > 15
                    ? "bg-risk-critical-bg text-risk-critical border-risk-critical-border"
                    : "bg-bpjs-soft text-bpjs-dark border-bpjs-border"
                }`}
              >
                {amtVariancePct >= 0 ? "+" : ""}
                {amtVariancePct}% vs median
              </span>
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div>
                <div className="flex justify-between text-jkn-muted mb-0.5">
                  <span>Faskes Ini</span>
                  <span className="font-mono font-bold text-risk-critical">
                    {formatRupiah(avgAmtProvider)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white overflow-hidden border border-jkn-divider">
                  <div
                    className="h-full bg-risk-critical rounded-full"
                    style={{ width: `${Math.round((avgAmtProvider / maxAvgAmt) * 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-jkn-muted mb-0.5">
                  <span>Median faskes lain</span>
                  <span className="font-mono font-bold text-bpjs-dark">
                    {formatRupiah(avgAmtPeer)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white overflow-hidden border border-jkn-divider">
                  <div
                    className="h-full bg-bpjs rounded-full"
                    style={{ width: `${Math.round((avgAmtPeer / maxAvgAmt) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Radar Chart + 8-Detector Anomaly Breakdown (6 cols) */}
        <div className="lg:col-span-6 bg-surface rounded-xl border border-jkn-border p-5 shadow-subtle space-y-3">
          <div>
            <h2 className="text-sm font-bold text-jkn-text">
              Komposisi 8 Detektor Anomali Faskes
            </h2>
            <p className="text-[11px] text-jkn-muted mt-0.5">
              Distribusi proporsi temuan aturan INA-CBG, statistik LOS, dan kemiripan vektor
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <div className="sm:col-span-5 h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={compositionItems} outerRadius="70%">
                  <PolarGrid stroke="#D5E0DA" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "#43564E", fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 60]} tick={false} axisLine={false} />
                  <Radar name="Proporsi (%)" dataKey="pct" stroke="#D92D20" fill="#D92D20" fillOpacity={0.25} />
                  <Tooltip formatter={(v: number) => [`${v}%`, "Proporsi Temuan"]} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="sm:col-span-7 space-y-2">
              {compositionItems.map((item) => (
                <div key={item.subject}>
                  <div className="flex justify-between text-[11px] font-medium mb-0.5">
                    <span className="text-jkn-text truncate">{item.label}</span>
                    <span className="font-mono font-semibold text-jkn-muted">{item.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-surface-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        item.pct >= 25
                          ? "bg-risk-critical"
                          : item.pct >= 15
                          ? "bg-amber-600"
                          : "bg-bpjs"
                      }`}
                      style={{ width: `${Math.min(100, item.pct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Risk Score Trajectory + Associated Doctors (DPJP) Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 tabular-nums">
        {/* Monthly Risk Trend AreaChart (6 cols) */}
        <div className="lg:col-span-6 bg-surface rounded-xl border border-jkn-border p-5 shadow-subtle space-y-3">
          <div>
            <h2 className="text-sm font-bold text-jkn-text">
              Tren Skor Risiko & Volume Klaim Bulanan
            </h2>
            <p className="text-[11px] text-jkn-muted mt-0.5">
              Perkembangan skor risiko faskes (0–100) per bulan pengajuan klaim
            </p>
          </div>
          {trend.length < 2 ? (
            <p className="text-sm text-jkn-muted py-10 text-center">Belum cukup bulan data untuk menggambar tren (butuh minimal dua bulan pengajuan).</p>
          ) : (
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="provRiskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D92D20" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#D92D20" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke={CHART_COLOR_JKN_DIM} fontSize={11} />
                <YAxis stroke={CHART_COLOR_JKN_DIM} fontSize={11} domain={[0, 100]} />
                <Tooltip
                  formatter={(v: number, name: string) => [
                    name === "Skor Risiko" ? `${v}/100` : `${v} klaim`,
                    name,
                  ]}
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: "8px",
                    border: "1px solid #D5E0DA",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="risk_score"
                  name="Skor Risiko"
                  stroke="#D92D20"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#provRiskGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="claim_count"
                  name="Volume Klaim"
                  stroke="#007A3A"
                  strokeWidth={2}
                  fillOpacity={0}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          )}
        </div>

        {/* Associated Doctors Table (6 cols - replaces icon-in-box cards) */}
        <div className="lg:col-span-6 bg-surface rounded-xl border border-jkn-border shadow-subtle overflow-hidden">
          <div className="px-5 py-4 border-b border-jkn-divider">
            <h2 className="text-sm font-bold text-jkn-text">
              Dokter Penanggung Jawab Pelayanan (DPJP) Terkait
            </h2>
            <p className="text-[11px] text-jkn-muted mt-0.5">
              Rasio klaim berisiko dan skor anomali per dokter di fasilitas kesehatan ini
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-secondary border-b border-jkn-border text-xs font-semibold text-jkn-muted">
                  <th className="py-2.5 px-4">Nama DPJP & Spesialisasi</th>
                  <th className="py-2.5 px-3 text-right">Klaim Anomali</th>
                  <th className="py-2.5 px-4 text-right">Skor Risiko</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-jkn-divider">
                {doctors.map((doc) => {
                  const highRatio =
                    doc.total_claims_handled > 0
                      ? Math.round((doc.high_risk_claims_count / doc.total_claims_handled) * 100)
                      : 0;
                  return (
                    <tr key={doc.doctor_id} className="hover:bg-surface-subtle transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-3">
                          <PersonAvatar name={doc.name} size={36} />
                          <div>
                            <div className="font-semibold text-jkn-text">{doc.name}</div>
                            <div className="text-[11px] text-jkn-muted">
                              {doc.specialty} · <span className="font-mono">SIP: {doc.sip_number}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-jkn-text whitespace-nowrap">
                        {doc.high_risk_claims_count}/{doc.total_claims_handled}{" "}
                        <span className="text-jkn-muted">({highRatio}%)</span>
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <RiskPill score={doc.risk_score} size="sm" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent High-Risk Claims Table (Replaces 3-column card grid) */}
      {provider.recent_claims && provider.recent_claims.length > 0 && (
        <div className="bg-surface rounded-xl border border-jkn-border shadow-subtle overflow-hidden tabular-nums">
          <div className="px-5 py-4 border-b border-jkn-divider flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-jkn-text">
                Klaim dengan skor risiko tertinggi di {provider.name}
              </h2>
              <p className="text-[11px] text-jkn-muted mt-0.5">
                Klaim bersekor 75 ke atas dibuka di ruang kerja pemeriksaan; yang lain di daftar klaim
              </p>
            </div>
            <Link
              href={`/investigation-queue?mode=CLAIMS&search=${encodeURIComponent(provider.name)}`}
              className="text-xs font-semibold text-bpjs hover:underline flex items-center gap-1"
            >
              <span>Lihat semua klaim faskes ini</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-secondary border-b border-jkn-border text-xs font-semibold text-jkn-muted">
                  <th className="py-2.5 px-4">ID Klaim & Tanggal</th>
                  <th className="py-2.5 px-4">Diagnosis Primer</th>
                  <th className="py-2.5 px-4">DPJP</th>
                  <th className="py-2.5 px-4 text-right">Nilai Tagihan</th>
                  <th className="py-2.5 px-4 text-right">Potensi Selisih</th>
                  <th className="py-2.5 px-4 text-right">Skor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-jkn-divider">
                {provider.recent_claims.slice(0, 6).map((c) => (
                  <tr key={c.claim_id} className="hover:bg-surface-subtle transition-colors">
                    <td className="py-2.5 px-4">
                      <Link
                        href={c.investigation_id ? `/investigations/${c.investigation_id}` : `/investigation-queue?mode=CLAIMS&search=${encodeURIComponent(c.claim_id)}`}
                        className="font-mono font-bold text-bpjs hover:underline block"
                        title={c.investigation_id ? "Buka ruang kerja pemeriksaan" : "Skor di bawah ambang kasus (75): dibuka di daftar klaim"}
                      >
                        {c.claim_id}
                      </Link>
                      <span className="text-[11px] text-jkn-muted">
                        {formatDate(c.service.admission_date)}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="font-mono font-semibold text-jkn-text">
                        {c.diagnoses[0]?.code}
                      </span>{" "}
                      <span className="text-jkn-muted">— {c.diagnoses[0]?.description}</span>
                    </td>
                    <td className="py-2.5 px-4 text-jkn-text">
                      <div className="inline-flex items-center gap-2">
                        <PersonAvatar name={c.service.doctor_name} size={24} />
                        <span>{c.service.doctor_name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-jkn-text">
                      {formatRupiah(c.claim_amount)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-risk-critical">
                      +{formatRupiah(c.tariff_difference || 0)}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <RiskPill score={c.risk_score} level={c.risk_level} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
