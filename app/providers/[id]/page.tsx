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
import {
  ArrowLeft,
  Building2,
  ChevronRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
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

export default function ProviderDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [provider, setProvider] = useState<(Provider & { recent_claims: CanonicalClaim[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    fetch(`/api/providers/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.data) {
          setProvider(data.data);
        } else {
          setNotFound(true);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setNotFound(true);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <DashboardShell>
        <PageLoader label={`Memuat profil audit fasilitas kesehatan ${id}...`} />
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

  const peerComparisonData = [
    {
      name: "Rasio Severity 3 (%)",
      provider: provider.peer_comparison.severity_3_rate.provider,
      peer: provider.peer_comparison.severity_3_rate.peer_median,
    },
    {
      name: "Rerata Lama Rawat / LOS (Hari)",
      provider: provider.peer_comparison.avg_los_days.provider,
      peer: provider.peer_comparison.avg_los_days.peer_median,
    },
    {
      name: "Rasio Rawat Ulang ≤30hr (%)",
      provider: provider.peer_comparison.readmission_rate_pct.provider,
      peer: provider.peer_comparison.readmission_rate_pct.peer_median,
    },
  ];

  // Controlled semantic tones instead of 8 rainbow colors
  const compositionItems = [
    { label: "Upcoding (Inflasi Severity)", subject: "Upcoding", pct: provider.risk_composition.upcoding_pct },
    { label: "Phantom Billing (Tanpa Bukti Tindakan)", subject: "Phantom", pct: provider.risk_composition.phantom_billing_pct },
    { label: "Cloning (Duplikasi Narasi Medis)", subject: "Cloning", pct: provider.risk_composition.cloning_pct },
    { label: "Abnormal LOS (Deviasi Lama Rawat)", subject: "LOS", pct: provider.risk_composition.abnormal_los_pct },
    { label: "Unbundling (Pemecahan Paket)", subject: "Unbundling", pct: provider.risk_composition.unbundling_pct ?? 0 },
    { label: "Inflated Bills (Mark-up Obat/Alkes)", subject: "Inflated", pct: provider.risk_composition.inflated_bills_pct ?? 0 },
    { label: "Repeat Billing (Tagihan Berulang)", subject: "Repeat", pct: provider.risk_composition.repeat_billing_pct ?? 0 },
    { label: "Readmission (Rawat Ulang Dini)", subject: "Readmisi", pct: provider.risk_composition.readmission_pct ?? 0 },
  ];

  const avgAmtProvider = provider.peer_comparison.avg_claim_amount.provider;
  const avgAmtPeer = provider.peer_comparison.avg_claim_amount.peer_median;
  const maxAvgAmt = Math.max(1, avgAmtProvider, avgAmtPeer);
  const amtVariancePct = avgAmtPeer > 0 ? Math.round(((avgAmtProvider - avgAmtPeer) / avgAmtPeer) * 100) : 0;

  return (
    <DashboardShell>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-jkn-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/providers"
            aria-label="Kembali ke direktori faskes"
            className="p-2 rounded-lg bg-surface border border-jkn-border text-jkn-muted hover:text-jkn-text hover:bg-surface-secondary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-jkn-dim">{provider.provider_id}</span>
              <h1 className="text-lg sm:text-xl font-bold text-jkn-text tracking-tight">
                {provider.name}
              </h1>
              <RiskPill score={provider.risk_score} level={provider.risk_level} size="sm" />
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-surface-secondary border border-jkn-border text-jkn-muted">
                {provider.type.replace(/_/g, " ")}
              </span>
            </div>
            <p className="text-xs text-jkn-muted mt-0.5">
              {provider.address}, {provider.city}, {provider.province_name} · Telp: {provider.phone}
            </p>
          </div>
        </div>
      </div>

      {/* Unified Telemetry Strip (Replaces 4 floating cards) */}
      <div className="bg-surface rounded-xl border border-jkn-border shadow-subtle grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-jkn-divider tabular-nums">
        <div className="p-4 sm:p-5">
          <span className="text-[11px] text-jkn-muted font-bold uppercase tracking-wider block">
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
          <span className="text-[11px] text-jkn-muted font-bold uppercase tracking-wider block">
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
          <span className="text-[11px] text-jkn-muted font-bold uppercase tracking-wider block">
            Rerata Tagihan per Klaim
          </span>
          <div className="text-2xl font-mono font-bold text-jkn-text mt-1.5">
            {formatRupiah(avgAmtProvider, true)}
          </div>
          <span className="text-[11px] text-jkn-muted mt-1 block">
            {amtVariancePct >= 0 ? "+" : ""}
            {amtVariancePct}% terhadap median peer ({formatRupiah(avgAmtPeer, true)})
          </span>
        </div>

        <div className="p-4 sm:p-5">
          <span className="text-[11px] text-jkn-muted font-bold uppercase tracking-wider block">
            Pola Anomali Dominan
          </span>
          <div className="mt-2">
            <RiskPill type={provider.dominant_risk_type} size="sm" />
          </div>
          <span className="text-[11px] text-jkn-muted block mt-1.5">
            {provider.doctors.length} DPJP aktif dalam pengawasan
          </span>
        </div>
      </div>

      {/* Peer Benchmarking Chart & Radar + 8-Detector Composition */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 tabular-nums">
        {/* Peer Benchmark Bar Chart + Average Tariff Bullet Comparison (6 cols) */}
        <div className="lg:col-span-6 bg-surface rounded-xl border border-jkn-border p-5 shadow-subtle space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div>
              <h2 className="text-sm font-bold text-jkn-text">
                Komparasi terhadap Median Faskes Sejawat (Peer Group)
              </h2>
              <p className="text-[11px] text-jkn-muted mt-0.5">
                Perbandingan indikator klinis faskes ini (merah) vs median nasional sekelas (hijau)
              </p>
            </div>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peerComparisonData} layout="vertical">
                  <XAxis type="number" stroke={CHART_COLOR_JKN_DIM} fontSize={11} />
                  <YAxis dataKey="name" type="category" stroke={CHART_COLOR_JKN_DIM} fontSize={11} width={165} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: "8px",
                      border: "1px solid #D5E0DA",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="provider" name="Faskes Ini" fill={CHART_COLOR_RISK_CRITICAL} radius={[0, 4, 4, 0]} />
                  <Bar dataKey="peer" name="Median Faskes Sejawat" fill={CHART_COLOR_BPJS} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Visual Bullet Comparison for Average Claim Tariff */}
          <div className="p-3.5 rounded-lg bg-surface-secondary border border-jkn-border space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-jkn-text">Rata-Rata Nilai Klaim vs Median Peer</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                  amtVariancePct > 15
                    ? "bg-risk-critical-bg text-risk-critical border-risk-critical-border"
                    : "bg-bpjs-soft text-bpjs-dark border-bpjs-border"
                }`}
              >
                {amtVariancePct >= 0 ? "+" : ""}
                {amtVariancePct}% vs Peer
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
                  <span>Median Peer Sejenis</span>
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
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={provider.monthly_risk_trend}>
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
                <tr className="bg-surface-secondary border-b border-jkn-border text-[10px] font-bold text-jkn-muted uppercase tracking-wider">
                  <th className="py-2.5 px-4">Nama DPJP & Spesialisasi</th>
                  <th className="py-2.5 px-3 text-right">Klaim Anomali</th>
                  <th className="py-2.5 px-4 text-right">Skor Risiko</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-jkn-divider">
                {provider.doctors.map((doc) => {
                  const highRatio =
                    doc.total_claims_handled > 0
                      ? Math.round((doc.high_risk_claims_count / doc.total_claims_handled) * 100)
                      : 0;
                  return (
                    <tr key={doc.doctor_id} className="hover:bg-surface-subtle transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-jkn-text">{doc.name}</div>
                        <div className="text-[11px] text-jkn-muted">
                          {doc.specialty} · <span className="font-mono">SIP: {doc.sip_number}</span>
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
                Daftar Klaim Berisiko Tertinggi di {provider.name}
              </h2>
              <p className="text-[11px] text-jkn-muted mt-0.5">
                Klik baris klaim untuk membuka ruang kerja pemeriksaan bukti
              </p>
            </div>
            <Link
              href={`/claims?search=${encodeURIComponent(provider.name)}`}
              className="text-xs font-semibold text-bpjs hover:underline flex items-center gap-1"
            >
              <span>Lihat Semua di Penjelajah Klaim</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-secondary border-b border-jkn-border text-[10px] font-bold text-jkn-muted uppercase tracking-wider">
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
                        href={`/investigations/${c.claim_id}`}
                        className="font-mono font-bold text-bpjs hover:underline block"
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
                    <td className="py-2.5 px-4 text-jkn-text">{c.service.doctor_name}</td>
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
