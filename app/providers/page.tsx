"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { RiskPill } from "@/components/ui/RiskPill";
import { PageLoader } from "@/components/ui/PageLoader";
import { Pagination } from "@/components/ui/Pagination";
import { FacilityMark, PersonAvatar } from "@/components/ui/Avatar";
import { Provider } from "@/types/provider";
import { RiskLevel, RiskType } from "@/types/risk";
import { INDONESIA_PROVINCES } from "@/lib/data/indonesia-provinces";
import { formatRupiah, formatNumber } from "@/lib/formatting/currency";
import { FACILITY_TYPE_LABELS } from "@/lib/formatting/provider-labels";
import { AlertTriangle, ArrowUpRight, Building2, Download, Eye, LayoutGrid, List, MapPin, RotateCcw, Search, X } from "lucide-react";

type RiskFilter = "ALL" | RiskLevel;
type SortKey = "exposure" | "risk_score" | "high_risk_ratio" | "peer_delta" | "national_ratio";

const LEVEL_LABEL: Record<RiskLevel, string> = { CRITICAL: "Kritis", HIGH: "Tinggi", MEDIUM: "Sedang", LOW: "Rendah" };

const TYPE_META: Record<string, { label: string; color: string }> = {
  upcoding_pct: { label: "Upcoding", color: "#B91C1C" },
  cloning_pct: { label: "Kloning narasi", color: "#CA8A04" },
  phantom_billing_pct: { label: "Tagihan fiktif", color: "#0E7490" },
  abnormal_los_pct: { label: "Lama rawat", color: "#007A3A" },
  unbundling_pct: { label: "Unbundling", color: "#7C3AED" },
  inflated_bills_pct: { label: "Tagihan membengkak", color: "#EA580C" },
  repeat_billing_pct: { label: "Tagihan berulang", color: "#BE185D" },
  readmission_pct: { label: "Readmisi dini", color: "#475569" },
};

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "exposure", label: "Eksposur terbesar" },
  { key: "risk_score", label: "Skor risiko tertinggi" },
  { key: "high_risk_ratio", label: "Rasio klaim berisiko" },
  { key: "national_ratio", label: "Biaya vs rerata nasional" },
  { key: "peer_delta", label: "Selisih vs median peer" },
];

const ratioText = (r: number | null | undefined) => (r === null || r === undefined ? "-" : `${r.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}x`);
const ratioTone = (r: number | null | undefined) => (r === null || r === undefined ? "text-jkn-muted" : r >= 1.5 ? "text-risk-critical" : r >= 1.25 ? "text-risk-high" : "text-jkn-text");

const peerDelta = (p: Provider) => {
  const prov = p.peer_comparison?.avg_claim_amount?.provider || 0;
  const peer = p.peer_comparison?.avg_claim_amount?.peer_median || 0;
  return peer ? Math.round(((prov - peer) / peer) * 100) : 0;
};
const highRiskRatio = (p: Provider) => (p.total_claims > 0 ? Math.round((p.high_risk_claims / p.total_claims) * 100) : 0);

/** Tren skor per bulan; hanya digambar bila ada minimal dua bulan data (tidak ada deret cadangan). */
function Sparkline({ trend, level }: { trend: Provider["monthly_risk_trend"]; level: RiskLevel }) {
  if (!trend || trend.length < 2) return <span className="text-xs text-jkn-dim">belum ada tren</span>;
  const pts = trend.map((t) => t.risk_score);
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = Math.max(1, max - min);
  const w = 88;
  const h = 24;
  const coords = pts.map((v, i) => `${((i / (pts.length - 1)) * w).toFixed(1)},${(h - ((v - min) / range) * (h - 6) - 3).toFixed(1)}`);
  const color = level === "CRITICAL" ? "#B91C1C" : level === "HIGH" ? "#C2410C" : level === "MEDIUM" ? "#B45309" : "#007A3A";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Tren skor risiko ${pts.join(", ")}`}>
      <path d={`M ${coords.join(" L ")}`} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Komposisi jenis temuan faskes (dari temuan nyata); hanya tiga terbesar yang diberi label. */
function Composition({ comp }: { comp: Provider["risk_composition"] }) {
  const items = Object.entries(comp || {})
    .map(([k, v]) => ({ key: k, pct: Number(v) || 0, ...(TYPE_META[k] || { label: k, color: "#94A3B8" }) }))
    .filter((i) => i.pct > 0)
    .sort((a, b) => b.pct - a.pct);
  if (items.length === 0) return <p className="text-xs text-jkn-dim">Belum ada temuan pada faskes ini.</p>;
  return (
    <div className="space-y-1.5">
      <div className="h-2 w-full rounded-full bg-surface-secondary overflow-hidden flex gap-px" role="img" aria-label={items.map((i) => `${i.label} ${i.pct}%`).join(", ")}>
        {items.map((i) => (
          <div key={i.key} title={`${i.label}: ${i.pct}%`} style={{ width: `${i.pct}%`, backgroundColor: i.color }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-jkn-muted">
        {items.slice(0, 3).map((i) => (
          <span key={i.key} className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: i.color }} aria-hidden />
            {i.label} {i.pct}%
          </span>
        ))}
      </div>
    </div>
  );
}

function SmallSampleBadge({ n }: { n: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-risk-medium-bg text-risk-medium border border-risk-medium-border text-xs font-medium"
      title={`Baru ${n} klaim pada data ini. Skor dan rasio faskes belum dapat disimpulkan.`}
    >
      <AlertTriangle className="w-3 h-3" aria-hidden />
      sampel kecil
    </span>
  );
}

export default function ProvidersListPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [provinceFilter, setProvinceFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<SortKey>("exposure");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [inspect, setInspect] = useState<Provider | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 9;

  // Tautan dalam dari peta/dasbor: /providers?province=ID-JK&risk_level=CRITICAL&search=...
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const prov = sp.get("province");
    const lvl = sp.get("risk_level");
    const q = sp.get("search");
    if (prov) setProvinceFilter(prov);
    if (lvl && ["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(lvl)) setRiskFilter(lvl as RiskFilter);
    if (q) setSearchQuery(q);
  }, []);

  const reqSeq = useRef(0);
  const load = useCallback(() => {
    // Hanya respons permintaan terbaru yang dipakai (mencegah data lama menimpa data baru).
    const seq = ++reqSeq.current;
    fetch("/api/providers")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => {
        if (seq !== reqSeq.current) return;
        setProviders(Array.isArray(d.data) ? d.data : []);
        setError(null);
      })
      .catch((e) => {
        if (seq !== reqSeq.current) return;
        setError(`Gagal memuat faskes (${e.message}).`);
      })
      .finally(() => {
        if (seq === reqSeq.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
    const onVisible = () => document.visibilityState === "visible" && load();
    window.addEventListener("arsa:store-updated", load);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("arsa:store-updated", load);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  useEffect(() => {
    if (!inspect) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setInspect(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inspect]);

  const levelCount = useMemo(() => {
    const c: Record<RiskLevel, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    providers.forEach((p) => {
      if (p.risk_level in c) c[p.risk_level]++;
    });
    return c;
  }, [providers]);

  const summary = useMemo(() => {
    const exposure = providers.reduce((a, p) => a + (p.potential_exposure || 0), 0);
    const high = providers.reduce((a, p) => a + (p.high_risk_claims || 0), 0);
    const total = providers.reduce((a, p) => a + (p.total_claims || 0), 0);
    const ratios = providers.filter((p) => p.national?.cost_ratio != null && !p.national.small_sample).map((p) => p.national!.cost_ratio as number).sort((a, b) => a - b);
    const medianRatio = ratios.length ? ratios[Math.floor(ratios.length / 2)] : null;
    return { exposure, high, total, medianRatio, ratioN: ratios.length, small: providers.filter((p) => p.national?.small_sample).length };
  }, [providers]);

  const provinceOptions = useMemo(() => {
    const present = new Set(providers.map((p) => p.province_code));
    return INDONESIA_PROVINCES.filter((p) => present.has(p.code)).sort((a, b) => a.name.localeCompare(b.name, "id"));
  }, [providers]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return providers
      .filter((p) => (q ? [p.name, p.provider_id, p.city, p.province_name].some((v) => (v || "").toLowerCase().includes(q)) : true))
      .filter((p) => riskFilter === "ALL" || p.risk_level === riskFilter)
      .filter((p) => typeFilter === "ALL" || p.type === typeFilter)
      .filter((p) => provinceFilter === "ALL" || p.province_code === provinceFilter)
      .sort((a, b) => {
        if (sortBy === "risk_score") return b.risk_score - a.risk_score || b.potential_exposure - a.potential_exposure;
        if (sortBy === "high_risk_ratio") return highRiskRatio(b) - highRiskRatio(a);
        if (sortBy === "peer_delta") return peerDelta(b) - peerDelta(a);
        if (sortBy === "national_ratio") return (b.national?.cost_ratio ?? -1) - (a.national?.cost_ratio ?? -1);
        return b.potential_exposure - a.potential_exposure;
      });
  }, [providers, searchQuery, riskFilter, typeFilter, provinceFilter, sortBy]);

  useEffect(() => setPage(1), [searchQuery, riskFilter, typeFilter, provinceFilter, sortBy]);

  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize)));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const hasFilters = searchQuery.trim() !== "" || riskFilter !== "ALL" || typeFilter !== "ALL" || provinceFilter !== "ALL" || sortBy !== "exposure";
  const reset = () => {
    setSearchQuery("");
    setRiskFilter("ALL");
    setTypeFilter("ALL");
    setProvinceFilter("ALL");
    setSortBy("exposure");
  };

  const downloadCsv = () => {
    const esc = (v: unknown) => {
      let s = v === null || v === undefined ? "" : String(v);
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const head = ["kode_faskes", "nama", "jenis", "provinsi", "kota", "klaim", "klaim_berisiko", "persen_berisiko", "skor_risiko", "tingkat", "eksposur_rp", "pola_dominan", "biaya_vs_rerata_nasional", "lama_rawat_vs_rerata_nasional", "sampel_kecil"];
    const lines = [head.join(",")];
    for (const p of filtered)
      lines.push(
        [p.provider_id, p.name, FACILITY_TYPE_LABELS[p.type] || p.type, p.province_name, p.city, p.total_claims, p.high_risk_claims, highRiskRatio(p), p.risk_score, p.risk_level, Math.round(p.potential_exposure), p.dominant_risk_type, p.national?.cost_ratio?.toFixed(2) ?? "", p.national?.los_ratio?.toFixed(2) ?? "", p.national?.small_sample ? "ya" : "tidak"].map(esc).join(",")
      );
    const blob = new Blob(["﻿" + lines.join("\n") + "\n"], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `faskes-arsa-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const dominantLabel = (t: RiskType) => <RiskPill type={t} size="sm" />;

  return (
    <DashboardShell>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-jkn-text tracking-tight">Profil faskes</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-bpjs-light text-bpjs-dark text-xs font-semibold border border-bpjs-border font-mono tabular-nums">
              {filtered.length}
              {hasFilters ? ` dari ${providers.length}` : ""} faskes
            </span>
          </div>
          <p className="text-sm text-jkn-muted mt-1.5 leading-relaxed">
            Perilaku penagihan tiap faskes dibandingkan dengan faskes lain pada data ini dan dengan rerata nasional BPJS untuk campuran kelas rawat yang sama.
          </p>
        </div>
        <button
          type="button"
          onClick={downloadCsv}
          disabled={filtered.length === 0}
          className="h-9 inline-flex items-center gap-1.5 px-3.5 rounded-xl bg-surface border border-jkn-border text-sm font-semibold text-jkn-text hover:bg-surface-secondary transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bpjs shrink-0"
          title="Unduh daftar faskes sesuai filter (CSV). Hanya angka agregat, tanpa data peserta."
        >
          <Download className="w-4 h-4" aria-hidden />
          <span>Unduh CSV</span>
        </button>
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-risk-critical-border bg-risk-critical-bg px-4 py-2.5 text-sm text-risk-critical">
          <span>{error}</span>
          <button onClick={load} className="font-semibold underline underline-offset-2 shrink-0">
            Coba lagi
          </button>
        </div>
      )}

      {!loading && providers.length > 0 && (
        <div className="bg-surface rounded-2xl border border-jkn-border/90 shadow-card overflow-hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-jkn-divider tabular-nums">
          <div className="p-5 bg-[#071A12] text-white">
            <span className="text-sm font-medium text-emerald-100/80">Potensi eksposur faskes</span>
            <div className="mt-2 text-2xl font-mono font-bold tracking-tight">{formatRupiah(summary.exposure, true)}</div>
            <div className="mt-2 text-xs text-emerald-100/70">Selisih tarif klaim terflag, {providers.length} faskes</div>
          </div>
          <div className="p-5">
            <span className="text-sm font-medium text-jkn-muted">Faskes kritis dan tinggi</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-mono font-bold text-risk-critical">{levelCount.CRITICAL + levelCount.HIGH}</span>
              <span className="text-sm font-mono text-jkn-muted">dari {providers.length}</span>
            </div>
            <div className="mt-2 text-xs text-jkn-muted">
              {levelCount.CRITICAL} kritis (skor 90+), {levelCount.HIGH} tinggi (75+)
            </div>
          </div>
          <div className="p-5">
            <span className="text-sm font-medium text-jkn-muted">Klaim berisiko tinggi</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-mono font-bold text-jkn-text">{formatNumber(summary.high)}</span>
              <span className="text-sm font-mono text-jkn-muted">dari {formatNumber(summary.total)}</span>
            </div>
            <div className="mt-2 text-xs text-jkn-muted">{summary.total ? Math.round((summary.high / summary.total) * 100) : 0}% dari seluruh klaim</div>
          </div>
          <div className="p-5">
            <span className="text-sm font-medium text-jkn-muted">Biaya vs rerata nasional</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-2xl font-mono font-bold ${ratioTone(summary.medianRatio)}`}>{ratioText(summary.medianRatio)}</span>
              <span className="text-sm text-jkn-muted">median faskes</span>
            </div>
            <div className="mt-2 text-xs text-jkn-muted">
              BPJS 2018, campuran kelas sama. {summary.ratioN} faskes dihitung{summary.small ? `, ${summary.small} bersampel kecil dilewati` : ""}.
            </div>
          </div>
        </div>
      )}

      <div className="bg-surface rounded-2xl border border-jkn-border p-3 shadow-subtle flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row gap-2.5 lg:items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-jkn-dim absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden />
            <input
              type="text"
              aria-label="Cari faskes"
              placeholder="Cari nama, kode faskes, kota, atau provinsi"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-sm rounded-xl bg-surface-subtle border border-jkn-border text-jkn-text focus:outline-none focus:border-bpjs focus:bg-white transition-colors"
            />
          </div>
          <select aria-label="Filter provinsi" value={provinceFilter} onChange={(e) => setProvinceFilter(e.target.value)} className="h-9 px-3 rounded-xl border border-jkn-border bg-surface-subtle text-sm text-jkn-text focus:outline-none focus:border-bpjs">
            <option value="ALL">Semua provinsi</option>
            {provinceOptions.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
          <select aria-label="Filter jenis faskes" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-9 px-3 rounded-xl border border-jkn-border bg-surface-subtle text-sm text-jkn-text focus:outline-none focus:border-bpjs">
            <option value="ALL">Semua jenis faskes</option>
            {Object.entries(FACILITY_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select aria-label="Urutkan faskes" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className="h-9 px-3 rounded-xl border border-jkn-border bg-surface-subtle text-sm text-jkn-text focus:outline-none focus:border-bpjs">
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div role="tablist" aria-label="Tingkat risiko" className="inline-flex flex-wrap rounded-xl bg-surface-secondary p-0.5 border border-jkn-divider">
            {(
              [
                { id: "ALL", label: "Semua", count: providers.length },
                { id: "CRITICAL", label: "Kritis", count: levelCount.CRITICAL },
                { id: "HIGH", label: "Tinggi", count: levelCount.HIGH },
                { id: "MEDIUM", label: "Sedang", count: levelCount.MEDIUM },
                { id: "LOW", label: "Rendah", count: levelCount.LOW },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={riskFilter === t.id}
                onClick={() => setRiskFilter(t.id)}
                className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors inline-flex items-center gap-1.5 ${riskFilter === t.id ? "bg-[#071A12] text-white" : "text-jkn-muted hover:text-jkn-text"}`}
              >
                {t.label}
                <span className={`font-mono text-xs ${riskFilter === t.id ? "text-emerald-200" : "text-jkn-dim"}`}>{t.count}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {hasFilters && (
              <button type="button" onClick={reset} className="inline-flex items-center gap-1 h-9 px-2.5 rounded-xl text-sm font-semibold text-bpjs hover:bg-bpjs-soft transition-colors">
                <RotateCcw className="w-3.5 h-3.5" aria-hidden />
                <span>Atur ulang</span>
              </button>
            )}
            <div className="inline-flex items-center rounded-xl border border-jkn-border bg-surface-subtle p-0.5" role="group" aria-label="Tampilan">
              <button type="button" onClick={() => setViewMode("grid")} aria-pressed={viewMode === "grid"} title="Tampilan kartu" className={`p-1.5 rounded-lg ${viewMode === "grid" ? "bg-white text-jkn-text shadow-subtle" : "text-jkn-muted hover:text-jkn-text"}`}>
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setViewMode("table")} aria-pressed={viewMode === "table"} title="Tampilan tabel" className={`p-1.5 rounded-lg ${viewMode === "table" ? "bg-white text-jkn-text shadow-subtle" : "text-jkn-muted hover:text-jkn-text"}`}>
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <PageLoader label="Memuat profil faskes..." />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-surface rounded-2xl border border-jkn-border p-6 space-y-3 shadow-subtle">
          <Building2 className="w-8 h-8 text-jkn-dim mx-auto" aria-hidden />
          <h2 className="text-base font-bold text-jkn-text">Tidak ada faskes yang cocok</h2>
          <p className="text-sm text-jkn-muted">Ubah kata kunci atau atur ulang filter.</p>
          <button onClick={reset} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-bpjs text-white text-sm font-semibold hover:bg-bpjs-deep transition-colors">
            <RotateCcw className="w-3.5 h-3.5" aria-hidden />
            <span>Tampilkan semua faskes</span>
          </button>
        </div>
      ) : viewMode === "grid" ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginated.map((p) => {
              const ratio = highRiskRatio(p);
              const delta = peerDelta(p);
              return (
                <article key={p.provider_id} className="bg-surface rounded-2xl border border-jkn-border/90 hover:border-bpjs/60 shadow-subtle hover:shadow-card transition-all flex flex-col overflow-hidden">
                  <div className="p-4 flex items-start justify-between gap-3 border-b border-jkn-divider">
                    <div className="flex items-start gap-3 min-w-0">
                      <FacilityMark level={p.risk_level} size={40} />
                      <div className="min-w-0">
                        <Link href={`/providers/${p.provider_id}`} className="block text-base font-bold text-jkn-text hover:text-bpjs leading-snug truncate">
                          {p.name}
                        </Link>
                        <p className="text-xs text-jkn-muted mt-0.5 inline-flex items-center gap-1 max-w-full">
                          <MapPin className="w-3 h-3 shrink-0" aria-hidden />
                          <span className="truncate">
                            {p.city}, {p.province_name}
                          </span>
                        </p>
                        <p className="text-xs text-jkn-dim mt-0.5 font-mono">
                          {p.provider_id} · {FACILITY_TYPE_LABELS[p.type] || p.type}
                        </p>
                      </div>
                    </div>
                    <RiskPill score={p.risk_score} level={p.risk_level} size="sm" />
                  </div>

                  <div className="p-4 space-y-3.5 flex-1">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="rounded-xl bg-surface-subtle border border-jkn-divider p-3">
                        <span className="text-xs text-jkn-dim block">Potensi eksposur</span>
                        <span className="font-mono text-base font-bold text-jkn-text tabular-nums block mt-0.5">{formatRupiah(p.potential_exposure, true)}</span>
                        <span className={`text-xs font-mono tabular-nums ${delta > 25 ? "text-risk-critical" : delta > 0 ? "text-risk-high" : "text-bpjs"}`}>
                          {delta > 0 ? "+" : ""}
                          {delta}% vs median peer
                        </span>
                      </div>
                      <div className="rounded-xl bg-surface-subtle border border-jkn-divider p-3">
                        <span className="text-xs text-jkn-dim block">Klaim berisiko</span>
                        <span className="font-mono text-base font-bold text-jkn-text tabular-nums block mt-0.5">
                          {formatNumber(p.high_risk_claims)} <span className="text-xs font-normal text-jkn-dim">dari {formatNumber(p.total_claims)}</span>
                        </span>
                        <div className="mt-1.5 h-1.5 w-full rounded-full bg-surface-secondary overflow-hidden">
                          <div className={`h-full rounded-full ${p.risk_level === "CRITICAL" ? "bg-risk-critical" : p.risk_level === "HIGH" ? "bg-risk-high" : "bg-bpjs"}`} style={{ width: `${Math.min(100, ratio)}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-jkn-muted">Biaya vs rerata nasional</span>
                      <span className={`font-mono font-semibold tabular-nums ${ratioTone(p.national?.cost_ratio)}`} title="Tagihan faskes dibagi rerata nasional BPJS 2018 untuk campuran kelas rawat yang sama">
                        {ratioText(p.national?.cost_ratio)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className="text-xs text-jkn-dim block mb-1">Pola dominan</span>
                        {dominantLabel(p.dominant_risk_type)}
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-jkn-dim block mb-1">Tren skor bulanan</span>
                        <Sparkline trend={p.monthly_risk_trend} level={p.risk_level} />
                      </div>
                    </div>

                    <Composition comp={p.risk_composition} />

                    {p.national?.small_sample && <SmallSampleBadge n={p.national.claims} />}

                    {p.doctors && p.doctors.length > 0 && (
                      <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-surface-subtle border border-jkn-divider">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex -space-x-1 shrink-0">
                            {p.doctors.slice(0, 3).map((d) => (
                              <span key={d.doctor_id} className="ring-2 ring-white rounded-full" title={`${d.name}, ${d.specialty}, skor ${d.risk_score}`}>
                                <PersonAvatar name={d.name} size={30} />
                              </span>
                            ))}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-jkn-text truncate">{p.doctors[0].name}</div>
                            <div className="text-xs text-jkn-muted truncate">
                              {p.doctors[0].specialty}
                              {p.doctors.length > 1 ? `, +${p.doctors.length - 1} DPJP` : ""}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="px-4 py-3 border-t border-jkn-divider flex items-center justify-between gap-2">
                    <button type="button" onClick={() => setInspect(p)} className="h-8 px-3 rounded-xl border border-jkn-border bg-surface-subtle hover:bg-surface-secondary text-sm font-semibold text-jkn-muted hover:text-jkn-text inline-flex items-center gap-1.5 transition-colors">
                      <Eye className="w-3.5 h-3.5" aria-hidden />
                      <span>Ringkasan</span>
                    </button>
                    <Link href={`/providers/${p.provider_id}`} className="h-8 px-3.5 rounded-xl bg-[#0B291C] hover:bg-bpjs text-white text-sm font-semibold inline-flex items-center gap-1.5 transition-colors">
                      <span>Buka profil</span>
                      <ArrowUpRight className="w-3.5 h-3.5" aria-hidden />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
          <Pagination page={currentPage} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />
        </>
      ) : (
        <div className="bg-surface rounded-2xl border border-jkn-border shadow-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse tabular-nums">
              <thead>
                <tr className="border-b border-jkn-border bg-surface-subtle text-xs font-semibold text-jkn-muted">
                  <th scope="col" className="py-3 px-4">Faskes</th>
                  <th scope="col" className="py-3 px-3">Skor</th>
                  <th scope="col" className="py-3 px-3 text-right">Klaim berisiko</th>
                  <th scope="col" className="py-3 px-3 text-right">vs median peer</th>
                  <th scope="col" className="py-3 px-3 text-right">vs rerata nasional</th>
                  <th scope="col" className="py-3 px-3 text-right">Eksposur</th>
                  <th scope="col" className="py-3 px-3">Pola dominan</th>
                  <th scope="col" className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-jkn-divider text-sm">
                {paginated.map((p) => {
                  const delta = peerDelta(p);
                  return (
                    <tr key={p.provider_id} className="hover:bg-surface-subtle/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <FacilityMark level={p.risk_level} size={32} />
                          <div className="min-w-0">
                            <div className="font-semibold text-jkn-text">{p.name}</div>
                            <div className="text-xs text-jkn-muted">
                              {p.city}, {p.province_name} · {FACILITY_TYPE_LABELS[p.type] || p.type}
                            </div>
                            {p.national?.small_sample && <SmallSampleBadge n={p.national.claims} />}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <RiskPill score={p.risk_score} level={p.risk_level} size="sm" />
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        <span className="font-bold text-risk-critical">{p.high_risk_claims}</span>
                        <span className="text-jkn-dim"> / {p.total_claims}</span>
                        <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded bg-surface-secondary text-jkn-text font-semibold">{highRiskRatio(p)}%</span>
                      </td>
                      <td className={`py-3 px-3 text-right font-mono font-semibold ${delta > 25 ? "text-risk-critical" : delta > 0 ? "text-risk-high" : "text-bpjs"}`}>
                        {delta > 0 ? "+" : ""}
                        {delta}%
                      </td>
                      <td className={`py-3 px-3 text-right font-mono font-semibold ${ratioTone(p.national?.cost_ratio)}`}>{ratioText(p.national?.cost_ratio)}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-jkn-text">{formatRupiah(p.potential_exposure, true)}</td>
                      <td className="py-3 px-3">{dominantLabel(p.dominant_risk_type)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-3">
                          <button type="button" onClick={() => setInspect(p)} className="text-sm font-semibold text-jkn-muted hover:text-jkn-text">
                            Ringkasan
                          </button>
                          <Link href={`/providers/${p.provider_id}`} className="inline-flex items-center gap-1 text-sm font-bold text-bpjs hover:underline">
                            <span>Profil</span>
                            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t border-jkn-divider">
            <Pagination page={currentPage} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />
          </div>
        </div>
      )}

      {inspect && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-[2px]" onClick={() => setInspect(null)}>
          <div role="dialog" aria-modal="true" aria-label={`Ringkasan ${inspect.name}`} onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-white h-full shadow-2xl border-l border-jkn-border flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="p-5 border-b border-jkn-divider flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <FacilityMark level={inspect.risk_level} size={44} />
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-jkn-text leading-snug">{inspect.name}</h2>
                    <p className="text-sm text-jkn-muted">
                      {inspect.city}, {inspect.province_name}
                    </p>
                    <p className="text-xs font-mono text-jkn-dim mt-0.5">
                      {inspect.provider_id} · {FACILITY_TYPE_LABELS[inspect.type] || inspect.type}
                    </p>
                  </div>
                </div>
                <button type="button" autoFocus onClick={() => setInspect(null)} aria-label="Tutup ringkasan" className="p-1.5 rounded-lg text-jkn-dim hover:text-jkn-text hover:bg-surface-secondary transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                <div className="flex items-center gap-3">
                  <RiskPill score={inspect.risk_score} level={inspect.risk_level} />
                  <span className="text-sm text-jkn-muted">Tingkat {(LEVEL_LABEL[inspect.risk_level] || inspect.risk_level).toLowerCase()}, {formatNumber(inspect.high_risk_claims)} dari {formatNumber(inspect.total_claims)} klaim berisiko tinggi</span>
                </div>
                {inspect.national?.small_sample && <SmallSampleBadge n={inspect.national.claims} />}

                {inspect.peer_comparison && (
                <section className="space-y-2.5">
                  <h3 className="text-sm font-bold text-jkn-text">Dibanding faskes lain pada data ini</h3>
                  <div className="grid grid-cols-2 gap-2.5 text-sm">
                    {[
                      { l: "Rerata klaim", a: formatRupiah(inspect.peer_comparison.avg_claim_amount?.provider ?? 0, true), b: formatRupiah(inspect.peer_comparison.avg_claim_amount?.peer_median ?? 0, true) },
                      { l: "Klaim severity 3", a: `${inspect.peer_comparison.severity_3_rate?.provider ?? "-"}%`, b: `${inspect.peer_comparison.severity_3_rate?.peer_median ?? "-"}%` },
                      { l: "Rerata lama rawat", a: `${inspect.peer_comparison.avg_los_days?.provider ?? "-"} hari`, b: `${inspect.peer_comparison.avg_los_days?.peer_median ?? "-"} hari` },
                      { l: "Rawat ulang 30 hari", a: `${inspect.peer_comparison.readmission_rate_pct?.provider ?? "-"}%`, b: `${inspect.peer_comparison.readmission_rate_pct?.peer_median ?? "-"}%` },
                    ].map((r) => (
                      <div key={r.l} className="p-3 rounded-xl bg-surface-subtle border border-jkn-divider">
                        <span className="text-xs text-jkn-dim block">{r.l}</span>
                        <span className="font-mono font-bold text-jkn-text block mt-0.5">{r.a}</span>
                        <span className="text-xs text-jkn-muted font-mono">median peer {r.b}</span>
                      </div>
                    ))}
                  </div>
                </section>
                )}

                {inspect.national && (
                  <section className="space-y-2.5">
                    <h3 className="text-sm font-bold text-jkn-text">Dibanding statistik BPJS {inspect.national.year}</h3>
                    <div className="divide-y divide-jkn-divider rounded-xl border border-jkn-divider bg-surface-subtle px-3 text-sm tabular-nums">
                      <div className="flex justify-between gap-3 py-2">
                        <span className="text-jkn-muted">Biaya vs rerata nasional</span>
                        <span className={`font-mono font-semibold ${ratioTone(inspect.national.cost_ratio)}`}>{ratioText(inspect.national.cost_ratio)}</span>
                      </div>
                      <div className="flex justify-between gap-3 py-2">
                        <span className="text-jkn-muted">Lama rawat vs rerata kelas</span>
                        <span className="font-mono font-semibold text-jkn-text">{ratioText(inspect.national.los_ratio)}</span>
                      </div>
                      {inspect.national.province && (
                        <div className="flex justify-between gap-3 py-2">
                          <span className="text-jkn-muted">FKRTL di {inspect.national.province.name}</span>
                          <span className="font-mono font-semibold text-jkn-text">
                            {formatNumber(inspect.national.province.fkrtl_count)} ({inspect.national.province.fkrtl_per_100k.toLocaleString("id-ID")} per 100 ribu peserta)
                          </span>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {inspect.doctors && inspect.doctors.length > 0 && (
                  <section className="space-y-2.5">
                    <h3 className="text-sm font-bold text-jkn-text">DPJP dengan skor risiko tertinggi</h3>
                    <div className="divide-y divide-jkn-divider rounded-xl border border-jkn-border overflow-hidden">
                      {[...inspect.doctors]
                        .sort((a, b) => b.risk_score - a.risk_score)
                        .slice(0, 3)
                        .map((d) => (
                          <div key={d.doctor_id} className="p-3 flex items-center justify-between gap-2.5 text-sm">
                            <div className="flex items-center gap-3 min-w-0">
                              <PersonAvatar name={d.name} size={34} />
                              <div className="min-w-0">
                                <div className="font-semibold text-jkn-text truncate">{d.name}</div>
                                <div className="text-xs text-jkn-muted truncate">
                                  {d.specialty}, {d.high_risk_claims_count} dari {d.total_claims_handled} klaim berisiko
                                </div>
                              </div>
                            </div>
                            <RiskPill score={d.risk_score} size="sm" />
                          </div>
                        ))}
                    </div>
                  </section>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-jkn-divider bg-surface-subtle flex items-center justify-between gap-3">
              <button type="button" onClick={() => setInspect(null)} className="h-9 px-4 rounded-xl border border-jkn-border bg-white text-sm font-semibold text-jkn-muted hover:text-jkn-text">
                Tutup
              </button>
              <Link href={`/providers/${inspect.provider_id}`} className="flex-1 h-9 rounded-xl bg-[#0B291C] hover:bg-bpjs text-white text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors">
                <span>Buka profil lengkap</span>
                <ArrowUpRight className="w-3.5 h-3.5" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
