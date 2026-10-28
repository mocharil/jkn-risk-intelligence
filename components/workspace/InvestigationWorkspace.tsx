"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { RiskPill } from "@/components/ui/RiskPill";
import { PageLoader } from "@/components/ui/PageLoader";
import { Pagination } from "@/components/ui/Pagination";
import { Investigation } from "@/types/investigation";
import type { RiskType } from "@/types/risk";
import { CanonicalClaim, NationalContext } from "@/types/claim";
import { INDONESIA_PROVINCES } from "@/lib/data/indonesia-provinces";
import { formatRupiah } from "@/lib/formatting/currency";
import { formatRelativeTime } from "@/lib/formatting/date";
import {
  ShieldAlert,
  Search,
  ArrowRight,
  LayoutGrid,
  List,
  ChevronRight,
  RotateCcw,
  FileText,
  Building2,
  Printer,
  Download,
  X,
} from "lucide-react";

const RING_COLOR: Record<string, string> = { CRITICAL: "#B91C1C", HIGH: "#EA580C", MEDIUM: "#CA8A04", LOW: "#059669" };

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  NEW: {
    label: "Belum Ditinjau",
    className: "bg-surface-secondary text-jkn-text border-jkn-border",
  },
  UNDER_INVESTIGATION: {
    label: "Sedang Diinvestigasi",
    className: "bg-risk-info-bg text-risk-info border-risk-info-border",
  },
  NEED_EVIDENCE: {
    label: "Butuh Bukti Tambahan",
    className: "bg-risk-medium-bg text-risk-medium border-risk-medium-border",
  },
  CONFIRMED_RISK: {
    label: "Risiko Terkonfirmasi",
    className: "bg-risk-critical-bg text-risk-critical border-risk-critical-border",
  },
  FALSE_POSITIVE: {
    label: "Positif Palsu",
    className: "bg-risk-low-bg text-risk-low border-risk-low-border",
  },
  ESCALATED: {
    label: "Dieskalasi",
    className: "bg-purple-50 text-purple-800 border-purple-200",
  },
  CLOSED: {
    label: "Ditutup",
    className: "bg-surface-secondary text-jkn-muted border-jkn-border",
  },
};

const CLAIM_STATUS_LABEL: Record<string, string> = {
  NEW: "Baru",
  FLAGGED: "Ditandai",
  IN_QUEUE: "Dalam Antrean",
  UNDER_INVESTIGATION: "Diinvestigasi",
  NEED_EVIDENCE: "Butuh Bukti",
  CONFIRMED_RISK: "Risiko Terkonfirmasi",
  FALSE_POSITIVE: "Positif Palsu",
  CLEARED: "Normal / Lolos",
  CLEAN: "Normal / Lolos",
  PENDING_REVIEW: "Menunggu tinjauan",
  IN_INVESTIGATION: "Diinvestigasi",
  RESOLVED_VALID: "Wajar / lolos",
};

const CLAIM_STATUS_STYLE: Record<string, string> = {
  FLAGGED: "bg-risk-high-bg text-risk-high border-risk-high-border",
  CONFIRMED_RISK: "bg-risk-critical-bg text-risk-critical border-risk-critical-border",
  IN_QUEUE: "bg-intel-light text-intel-deep border-intel-border",
  UNDER_INVESTIGATION: "bg-intel-light text-intel-deep border-intel-border",
  NEED_EVIDENCE: "bg-risk-medium-bg text-risk-medium border-risk-medium-border",
  CLEAN: "bg-bpjs-soft text-bpjs-dark border-bpjs-border",
  CLEARED: "bg-bpjs-soft text-bpjs-dark border-bpjs-border",
  FALSE_POSITIVE: "bg-surface-secondary text-jkn-muted border-jkn-border",
  PENDING_REVIEW: "bg-risk-medium-bg text-risk-medium border-risk-medium-border",
  IN_INVESTIGATION: "bg-intel-light text-intel-deep border-intel-border",
  RESOLVED_VALID: "bg-bpjs-soft text-bpjs-dark border-bpjs-border",
};

const SORT_OPTIONS = [
  { key: "risk", label: "Skor risiko tertinggi" },
  { key: "exposure", label: "Eksposur terbesar" },
  { key: "amount", label: "Tagihan terbesar" },
  { key: "date", label: "Pengajuan terbaru" },
];

const CLASS_OPTIONS = [
  { key: "KELAS_1", label: "Kelas 1" },
  { key: "KELAS_2", label: "Kelas 2" },
  { key: "KELAS_3", label: "Kelas 3" },
  { key: "RAWAT_JALAN", label: "Rawat jalan" },
  { key: "TIDAK_DIKETAHUI", label: "Kelas tidak tercatat" },
];

/** Biaya klaim dibanding rerata nasional BPJS 2018 untuk kelas yang sama (rawat inap per admisi, rawat jalan per kunjungan). */
function NationalChip({ n, className = "" }: { n?: NationalContext; className?: string }) {
  if (!n || !n.cost_ref || n.cost_ratio == null) return null;
  const r = n.cost_ratio;
  const tone = r >= 2 ? "text-risk-critical" : r >= 1.35 ? "text-risk-high" : "text-jkn-muted";
  return (
    <span
      className={`font-mono tabular-nums ${tone} ${className}`}
      title={`Rerata nasional BPJS ${n.year}, ${n.class_label.toLowerCase()}: ${formatRupiah(n.cost_ref)} per ${n.level === "INAP" ? "admisi" : "kunjungan"}`}
    >
      {r.toLocaleString("id-ID", { maximumFractionDigits: 1 })}x rerata nasional
    </span>
  );
}

const PROVIDER_TYPE_LABEL: Record<string, string> = {
  RS_KELAS_A: "RS Kelas A",
  RS_KELAS_B: "RS Kelas B",
  RS_KELAS_C: "RS Kelas C",
  RS_KELAS_D: "RS Kelas D",
  KLINIK_UTAMA: "Klinik Utama",
  PUSKESMAS: "Puskesmas",
};

const TREATMENT_CLASS_LABEL: Record<string, string> = {
  KELAS_1: "R. Inap Kelas 1",
  KELAS_2: "R. Inap Kelas 2",
  KELAS_3: "R. Inap Kelas 3",
  VIP: "R. Inap VIP",
  ICU: "Intensif (ICU)",
  RAWAT_JALAN: "Rawat Jalan",
  TIDAK_DIKETAHUI: "Kelas tidak tercatat",
};

export function InvestigationQueueInner({
  defaultWorkspaceMode = "QUEUE",
}: {
  defaultWorkspaceMode?: "QUEUE" | "CLAIMS";
}) {
  const searchParams = useSearchParams();
  const [workspaceMode, setWorkspaceMode] = useState<"QUEUE" | "CLAIMS">(() => {
    const paramMode = searchParams.get("mode");
    if (paramMode === "CLAIMS" || paramMode === "QUEUE") return paramMode;
    return defaultWorkspaceMode;
  });

  // Investigation Queue state
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [overview, setOverview] = useState<{
    open: number;
    exposure: number;
    aged: number;
    byType: Array<{ risk_type: string; claim_count: number; potential_exposure: number }>;
  } | null>(null);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<{ all: number; critical: number; high: number; medium: number }>({
    all: 0,
    critical: 0,
    high: 0,
    medium: 0,
  });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetch("/api/dashboard")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (cancelled || !d) return;
          const age: Array<{ key: string; count: number }> = d.queue_age || [];
          setOverview({
            open: d.workflow?.open ?? 0,
            exposure: d.kpis?.potential_exposure ?? 0,
            aged: age.filter((a) => a.key === "d60" || a.key === "d90").reduce((acc, a) => acc + a.count, 0),
            byType: (d.kpis?.risk_by_type || []).filter((t: { claim_count: number }) => t.claim_count > 0),
          });
        })
        .catch(() => {});
    load();
    window.addEventListener("arsa:store-updated", load);
    return () => {
      cancelled = true;
      window.removeEventListener("arsa:store-updated", load);
    };
  }, []);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [claimsError, setClaimsError] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string>(() => searchParams.get("priority") || "ALL");
  const [statusFilter, setStatusFilter] = useState<string>(() => searchParams.get("status") || "ALL");
  const [riskTypeFilter, setRiskTypeFilter] = useState<string>(() => searchParams.get("risk_type") || "ALL");
  const [provinceFilter, setProvinceFilter] = useState<string>(() => searchParams.get("province") || "ALL");
  const [classFilter, setClassFilter] = useState<string>(() => searchParams.get("treatment_class") || "ALL");
  const [sortKey, setSortKey] = useState<string>(() => searchParams.get("sort") || "risk");
  const [reloadKey, setReloadKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("search") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get("search") || "");
  const [viewMode, setViewMode] = useState<"TABLE" | "CARD">("TABLE");
  const [page, setPage] = useState(1);
  const pageSize = 9;

  // All-Claims Census state
  const [claims, setClaims] = useState<CanonicalClaim[]>([]);
  const [claimsTotal, setClaimsTotal] = useState(0);
  const [claimsTotalUnfiltered, setClaimsTotalUnfiltered] = useState(0);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [claimRiskLevel, setClaimRiskLevel] = useState<string>(() => searchParams.get("risk_level") || "ALL");
  const [selectedClaim, setSelectedClaim] = useState<CanonicalClaim | null>(null);
  const [claimsPage, setClaimsPage] = useState(1);
  const claimsPageSize = 10;

  useEffect(() => {
    const paramMode = searchParams.get("mode");
    const paramRisk = searchParams.get("risk_type");
    const paramPriority = searchParams.get("priority");
    const paramStatus = searchParams.get("status");
    const paramSearch = searchParams.get("search");
    const paramRiskLvl = searchParams.get("risk_level");
    const paramProvince = searchParams.get("province");
    const paramClass = searchParams.get("treatment_class");
    const paramSort = searchParams.get("sort");
    if (paramProvince) setProvinceFilter(paramProvince);
    if (paramClass) setClassFilter(paramClass);
    if (paramSort) setSortKey(paramSort);
    if (paramMode === "CLAIMS" || paramMode === "QUEUE") setWorkspaceMode(paramMode);
    if (paramRisk) setRiskTypeFilter(paramRisk);
    if (paramPriority) setPriorityFilter(paramPriority);
    if (paramStatus) setStatusFilter(paramStatus);
    if (paramRiskLvl) setClaimRiskLevel(paramRiskLvl);
    if (paramSearch !== null) {
      setSearchQuery(paramSearch);
      setDebouncedSearch(paramSearch);
    }
  }, [searchParams]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
    setClaimsPage(1);
  }, [priorityFilter, statusFilter, riskTypeFilter, claimRiskLevel, debouncedSearch, provinceFilter, classFilter, sortKey]);

  // Jaga halaman tetap valid bila jumlah hasil menyusut (mis. setelah keputusan kasus / reload).
  useEffect(() => {
    if (!loading && total > 0 && (page - 1) * pageSize >= total) setPage(Math.max(1, Math.ceil(total / pageSize)));
  }, [loading, total, page]);
  useEffect(() => {
    if (!claimsLoading && claimsTotal > 0 && (claimsPage - 1) * claimsPageSize >= claimsTotal) setClaimsPage(Math.max(1, Math.ceil(claimsTotal / claimsPageSize)));
  }, [claimsLoading, claimsTotal, claimsPage]);

  // Segarkan saat ada perubahan di tempat lain (keputusan kasus, unggahan dataset) atau tab kembali aktif.
  useEffect(() => {
    const bump = () => setReloadKey((k) => k + 1);
    const onVisible = () => document.visibilityState === "visible" && bump();
    window.addEventListener("arsa:store-updated", bump);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("arsa:store-updated", bump);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // Fetch initial counts for both tabs independently so none blocks the others
  useEffect(() => {
    const pv = provinceFilter !== "ALL" ? `&province=${provinceFilter}` : "";
    const countInv = (q: string) =>
      fetch(`/api/investigations?limit=1${q}${pv}`)
        .then((r) => r.json())
        .then((j) => j.total_count || 0)
        .catch(() => 0);

    Promise.all([
      countInv(""),
      countInv("&priority=CRITICAL"),
      countInv("&priority=HIGH"),
      countInv("&priority=MEDIUM"),
    ]).then(([all, critical, high, medium]) => {
      setCounts({ all, critical, high, medium });
    });

    fetch("/api/claims?limit=1")
      .then((r) => r.json())
      .then((j) => setClaimsTotalUnfiltered(j.total_count || 0))
      .catch(() => {});
  }, [provinceFilter, reloadKey]);

  // Fetch Investigations when in QUEUE mode
  useEffect(() => {
    if (workspaceMode !== "QUEUE") return;
    const ctrl = new AbortController();
    const qs = new URLSearchParams({ limit: String(pageSize), offset: String((page - 1) * pageSize) });
    if (debouncedSearch) qs.set("search", debouncedSearch);
    if (priorityFilter !== "ALL") qs.set("priority", priorityFilter);
    if (statusFilter !== "ALL") qs.set("status", statusFilter);
    if (riskTypeFilter !== "ALL") qs.set("risk_type", riskTypeFilter);
    if (provinceFilter !== "ALL") qs.set("province", provinceFilter);
    if (sortKey !== "risk") qs.set("sort", sortKey);
    setLoading(true);
    setLoadError(null);
    fetch(`/api/investigations?${qs}`, { signal: ctrl.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setInvestigations(data.data || []);
        const tc = data.total_count || 0;
        setTotal(tc);
        if (priorityFilter === "ALL" && statusFilter === "ALL" && riskTypeFilter === "ALL" && !debouncedSearch) {
          setCounts((prev) => ({ ...prev, all: tc }));
        }
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setLoadError(`Gagal memuat antrean investigasi (${err.message}).`);
        setInvestigations([]);
        setTotal(0);
        setLoading(false);
      });
    return () => ctrl.abort();
  }, [workspaceMode, page, debouncedSearch, priorityFilter, statusFilter, riskTypeFilter, provinceFilter, sortKey, reloadKey]);

  // Fetch All Claims when in CLAIMS mode
  useEffect(() => {
    if (workspaceMode !== "CLAIMS") return;
    const ctrl = new AbortController();
    const qs = new URLSearchParams({
      limit: String(claimsPageSize),
      offset: String((claimsPage - 1) * claimsPageSize),
    });
    if (debouncedSearch) qs.set("search", debouncedSearch);
    if (claimRiskLevel !== "ALL") qs.set("risk_level", claimRiskLevel);
    if (riskTypeFilter !== "ALL") qs.set("risk_type", riskTypeFilter);
    if (provinceFilter !== "ALL") qs.set("province", provinceFilter);
    if (classFilter !== "ALL") qs.set("treatment_class", classFilter);
    if (sortKey !== "risk") qs.set("sort", sortKey);
    setClaimsLoading(true);
    setClaimsError(null);
    fetch(`/api/claims?${qs}`, { signal: ctrl.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setClaims(data.data || []);
        setClaimsTotal(data.total_count || 0);
        setClaimsLoading(false);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setClaimsError(`Gagal memuat daftar klaim (${err.message}).`);
        setClaims([]);
        setClaimsTotal(0);
        setClaimsLoading(false);
      });
    return () => ctrl.abort();
  }, [workspaceMode, claimsPage, debouncedSearch, claimRiskLevel, riskTypeFilter, provinceFilter, classFilter, sortKey, reloadKey]);

  const openClaim = async (c: CanonicalClaim) => {
    setSelectedClaim(c);
    try {
      const res = await fetch(`/api/claims/${c.claim_id}`);
      if (res.ok) {
        const full = (await res.json()).data;
        if (full) setSelectedClaim((cur) => (cur && cur.claim_id === c.claim_id ? full : cur));
      }
    } catch {
      /* tetap tampilkan versi ringkas */
    }
  };

  const hasActiveFilters =
    priorityFilter !== "ALL" ||
    statusFilter !== "ALL" ||
    riskTypeFilter !== "ALL" ||
    claimRiskLevel !== "ALL" ||
    provinceFilter !== "ALL" ||
    classFilter !== "ALL" ||
    sortKey !== "risk" ||
    searchQuery.trim() !== "";

  const csvHref = (() => {
    const qs = new URLSearchParams({ format: "csv" });
    if (debouncedSearch) qs.set("search", debouncedSearch);
    if (claimRiskLevel !== "ALL") qs.set("risk_level", claimRiskLevel);
    if (riskTypeFilter !== "ALL") qs.set("risk_type", riskTypeFilter);
    if (provinceFilter !== "ALL") qs.set("province", provinceFilter);
    if (classFilter !== "ALL") qs.set("treatment_class", classFilter);
    if (sortKey !== "risk") qs.set("sort", sortKey);
    return `/api/claims?${qs}`;
  })();

  const handleResetFilters = () => {
    setProvinceFilter("ALL");
    setClassFilter("ALL");
    setSortKey("risk");
    setPriorityFilter("ALL");
    setStatusFilter("ALL");
    setRiskTypeFilter("ALL");
    setClaimRiskLevel("ALL");
    setSearchQuery("");
    setDebouncedSearch("");
    setPage(1);
    setClaimsPage(1);
  };

  return (
    <DashboardShell>
      {/* Page Header & Unified Mode Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-jkn-text tracking-tight">
              Pemeriksaan klaim
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-bpjs-soft text-bpjs-dark text-xs font-mono font-bold tabular-nums border border-bpjs-border">
              {workspaceMode === "QUEUE"
                ? `${total.toLocaleString("id-ID")} kasus${hasActiveFilters ? " sesuai filter" : ""}`
                : `${claimsTotal.toLocaleString("id-ID")} klaim${hasActiveFilters ? " sesuai filter" : ""}`}
            </span>
          </div>
          <p className="text-xs text-jkn-muted mt-1">
            Antrean kasus untuk diperiksa, dosier PDF untuk audit, dan sensus seluruh klaim. Biaya setiap klaim dibandingkan dengan rerata nasional BPJS untuk kelas rawat yang sama.
          </p>
        </div>

        {/* Right Controls: Workspace Mode Switcher + View Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Primary Mode Switcher: Antrean Prioritas vs Sensus Semua Klaim */}
          <div className="flex items-center gap-1 p-1 bg-surface border border-jkn-border/90 rounded-xl shadow-card">
            <button
              onClick={() => setWorkspaceMode("QUEUE")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                workspaceMode === "QUEUE"
                  ? "bg-[#071A12] text-white shadow-2xs"
                  : "text-jkn-muted hover:text-jkn-text"
              }`}
            >
              <ShieldAlert className={`w-3.5 h-3.5 ${workspaceMode === "QUEUE" ? "text-[#34D399]" : ""}`} />
              <span>Antrean kasus</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums ${
                  workspaceMode === "QUEUE"
                    ? "bg-[#00A859]/25 text-[#6EE7B7] border border-[#00A859]/35 font-bold"
                    : "bg-surface-secondary text-jkn-dim"
                }`}
              >
                {counts.all.toLocaleString("id-ID")}
              </span>
            </button>
            <button
              onClick={() => setWorkspaceMode("CLAIMS")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                workspaceMode === "CLAIMS"
                  ? "bg-[#071A12] text-white shadow-2xs"
                  : "text-jkn-muted hover:text-jkn-text"
              }`}
            >
              <FileText className={`w-3.5 h-3.5 ${workspaceMode === "CLAIMS" ? "text-[#34D399]" : ""}`} />
              <span>Semua klaim</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums ${
                  workspaceMode === "CLAIMS"
                    ? "bg-[#00A859]/25 text-[#6EE7B7] border border-[#00A859]/35 font-bold"
                    : "bg-surface-secondary text-jkn-dim"
                }`}
              >
                {claimsTotalUnfiltered.toLocaleString("id-ID")}
              </span>
            </button>
          </div>

          {/* Table / Card Switcher (Only in QUEUE mode) */}
          {workspaceMode === "QUEUE" && (
            <div className="flex items-center gap-1 p-1 bg-surface border border-jkn-border/90 rounded-xl shadow-card">
              <button
                onClick={() => setViewMode("TABLE")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === "TABLE"
                    ? "bg-bpjs-soft text-bpjs-dark border border-bpjs-border"
                    : "text-jkn-muted hover:text-jkn-text"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Tabel</span>
              </button>
              <button
                onClick={() => setViewMode("CARD")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === "CARD"
                    ? "bg-bpjs-soft text-bpjs-dark border border-bpjs-border"
                    : "text-jkn-muted hover:text-jkn-text"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Kartu</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Ringkasan antrean: angka kunci dan pintasan filter menurut sinyal detektor */}
      {workspaceMode === "QUEUE" && overview && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-6 rounded-2xl border border-jkn-border/90 bg-surface shadow-card overflow-hidden grid grid-cols-3 gap-px bg-jkn-divider tabular-nums">
            {[
              { label: "Kasus terbuka", value: overview.open.toLocaleString("id-ID"), hint: "belum diputuskan" },
              { label: "Eksposur terflag", value: formatRupiah(overview.exposure, true), hint: "selisih tarif" },
              { label: "Berumur lebih dari 30 hari", value: overview.aged.toLocaleString("id-ID"), hint: "perlu didahulukan", warn: overview.aged > 0 },
            ].map((k) => (
              <div key={k.label} className="bg-surface px-4 py-3.5 flex flex-col justify-center">
                <div className="text-xs text-jkn-muted leading-tight">{k.label}</div>
                <div className={`mt-1 font-mono text-lg font-bold whitespace-nowrap ${k.warn ? "text-risk-critical" : "text-jkn-text"}`}>{k.value}</div>
                <div className="text-[11px] text-jkn-dim mt-0.5">{k.hint}</div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-6 rounded-2xl border border-jkn-border/90 bg-surface shadow-card px-4 py-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-jkn-text">Sinyal dalam antrean</h2>
              {riskTypeFilter !== "ALL" && (
                <button onClick={() => setRiskTypeFilter("ALL")} className="text-xs font-semibold text-bpjs hover:underline">
                  Hapus filter
                </button>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {[...overview.byType]
                .sort((a, b) => b.claim_count - a.claim_count)
                .map((t) => {
                  const active = riskTypeFilter === t.risk_type;
                  return (
                    <button
                      key={t.risk_type}
                      onClick={() => {
                        setRiskTypeFilter(active ? "ALL" : t.risk_type);
                        setPage(1);
                      }}
                      aria-pressed={active}
                      className={`inline-flex items-center gap-2 rounded-full border pl-1 pr-3 py-1 transition-colors ${
                        active ? "border-bpjs bg-bpjs-soft" : "border-jkn-border hover:border-bpjs/50"
                      }`}
                    >
                      <RiskPill type={t.risk_type as RiskType} size="sm" />
                      <span className="font-mono text-xs font-bold text-jkn-text tabular-nums">{t.claim_count}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Unified Control Bar */}
      <div className="bg-surface rounded-2xl border border-jkn-border/90 shadow-card overflow-hidden">
        {workspaceMode === "QUEUE" && (
          /* Top Tier: Architectural Priority Tabs (for Investigation Queue) */
          <div className="px-4 border-b border-jkn-divider bg-surface-subtle flex items-center justify-between gap-4 overflow-x-auto">
            <div className="flex items-center gap-1">
              {[
                { key: "ALL", label: "Semua kasus", count: counts.all },
                { key: "CRITICAL", label: "Kritis", count: counts.critical, dot: "bg-risk-critical" },
                { key: "HIGH", label: "Tinggi", count: counts.high, dot: "bg-risk-high" },
              ].map((tab) => {
                const active = priorityFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setPriorityFilter(tab.key)}
                    className={`relative py-3 px-3.5 text-xs flex items-center gap-2 transition-colors shrink-0 border-b-2 ${
                      active
                        ? "border-[#071A12] text-jkn-text font-bold bg-surface"
                        : "border-transparent text-jkn-muted hover:text-jkn-text font-medium"
                    }`}
                  >
                    {tab.dot && <span className={`w-1.5 h-1.5 rounded-full ${tab.dot}`} />}
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono tabular-nums ${
                        active
                          ? "bg-[#071A12] text-white font-bold"
                          : "bg-surface text-jkn-dim border border-jkn-divider"
                      }`}
                    >
                      {tab.count.toLocaleString("id-ID")}
                    </span>
                  </button>
                );
              })}
            </div>

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="h-7 flex items-center gap-1.5 px-2.5 rounded-lg border border-jkn-border bg-surface text-[11px] font-semibold text-jkn-muted hover:text-bpjs hover:border-bpjs transition-colors shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Atur ulang filter</span>
              </button>
            )}
          </div>
        )}

        {/* Bottom Tier: Search & Facet Selects */}
        <div className="p-3.5 flex flex-col md:flex-row items-center gap-2.5">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 text-jkn-dim absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder={
                workspaceMode === "QUEUE"
                  ? "Cari ID klaim (CLM-...), ID investigasi, nama faskes, peserta, atau kode ICD-10..."
                  : "Cari ID klaim, nomor SEP, peserta (pseudonim), ICD-10, DPJP, atau nama faskes..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs rounded-xl bg-surface-subtle border border-jkn-border text-jkn-text outline-hidden focus:border-bpjs focus:bg-white transition-colors"
            />
          </div>

          <select
            aria-label="Filter jenis anomali"
            value={riskTypeFilter}
            onChange={(e) => setRiskTypeFilter(e.target.value)}
            className="h-9 text-xs px-3 rounded-xl bg-surface-subtle border border-jkn-border text-jkn-text outline-hidden focus:border-bpjs w-full md:w-56"
          >
            <option value="ALL">Semua Sinyal Detektor</option>
            <option value="UPCODING">Upcoding Diagnosis / CBG</option>
            <option value="CLONING">Duplikasi Narasi (Cloning)</option>
            <option value="PHANTOM_BILLING">Klaim Fiktif (Phantom)</option>
            <option value="ABNORMAL_LOS">Lama Rawat Abnormal (LOS)</option>
            <option value="UNBUNDLING">Pemecahan Klaim (Unbundling)</option>
            <option value="INFLATED_BILLS">Inflasi Tagihan (Mark-up)</option>
            <option value="REPEAT_BILLING">Penagihan Berulang</option>
            <option value="READMISSION">Readmisi Dini (&lt;30 Hari)</option>
          </select>

          <select
            aria-label="Filter provinsi faskes"
            value={provinceFilter}
            onChange={(e) => setProvinceFilter(e.target.value)}
            className="h-9 text-xs px-3 rounded-xl bg-surface-subtle border border-jkn-border text-jkn-text outline-hidden focus:border-bpjs w-full md:w-48"
          >
            <option value="ALL">Semua provinsi</option>
            {INDONESIA_PROVINCES.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Urutkan"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            className="h-9 text-xs px-3 rounded-xl bg-surface-subtle border border-jkn-border text-jkn-text outline-hidden focus:border-bpjs w-full md:w-48"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>

          {workspaceMode === "QUEUE" ? (
            <select
              aria-label="Filter status investigasi"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 text-xs px-3 rounded-lg bg-surface-secondary border border-jkn-border text-jkn-text outline-hidden focus:border-bpjs w-full md:w-52"
            >
              <option value="ALL">Semua Status Audit</option>
              <option value="NEW">Belum Ditinjau</option>
              <option value="UNDER_INVESTIGATION">Sedang Diinvestigasi</option>
              <option value="NEED_EVIDENCE">Butuh Bukti Tambahan</option>
              <option value="ESCALATED">Dieskalasi</option>
              <option value="CONFIRMED_RISK">Risiko Terkonfirmasi</option>
              <option value="FALSE_POSITIVE">Positif Palsu</option>
              <option value="CLOSED">Ditutup</option>
            </select>
          ) : (
            <>
              <select
                aria-label="Filter tingkat risiko klaim"
                value={claimRiskLevel}
                onChange={(e) => setClaimRiskLevel(e.target.value)}
                className="h-9 text-xs px-3 rounded-lg bg-surface-secondary border border-jkn-border text-jkn-text outline-hidden focus:border-bpjs w-full md:w-52"
              >
                <option value="ALL">Semua Tingkat Risiko</option>
                <option value="CRITICAL">Kritis (Critical)</option>
                <option value="HIGH">Tinggi (High)</option>
                <option value="MEDIUM">Sedang (Medium)</option>
                <option value="LOW">Rendah / Normal</option>
              </select>

              <select
                aria-label="Filter kelas rawat"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="h-9 text-xs px-3 rounded-lg bg-surface-secondary border border-jkn-border text-jkn-text outline-hidden focus:border-bpjs w-full md:w-44"
              >
                <option value="ALL">Semua kelas rawat</option>
                {CLASS_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>

              <a
                href={csvHref}
                download
                className="h-9 flex items-center gap-1.5 px-3 rounded-lg border border-jkn-border bg-white text-xs font-semibold text-jkn-text hover:bg-surface-secondary transition-colors shrink-0"
                title="Unduh klaim sesuai filter (CSV, peserta berupa pseudonim). Pengunduhan dicatat di jejak audit."
              >
                <Download className="w-3.5 h-3.5" aria-hidden />
                <span>Unduh CSV</span>
              </a>

              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="h-9 flex items-center gap-1.5 px-3 rounded-lg border border-jkn-border bg-white text-xs font-semibold text-jkn-muted hover:text-bpjs hover:border-bpjs transition-colors shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mode 1: Investigation Queue & Audit Dossier */}
      {workspaceMode === "QUEUE" ? (
        loading ? (
          <PageLoader label="Memuat antrean investigasi..." />
        ) : loadError ? (
          <div role="alert" className="text-center py-16 bg-surface rounded-xl border border-risk-critical-border p-6 space-y-3">
            <h4 className="text-sm font-bold text-risk-critical">{loadError}</h4>
            <button onClick={() => setReloadKey((k) => k + 1)} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-bpjs text-white text-xs font-semibold hover:bg-bpjs-deep transition-all">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Coba lagi</span>
            </button>
          </div>
        ) : total === 0 ? (
          <div className="text-center py-16 bg-surface rounded-xl border border-jkn-border p-6 space-y-3">
            <ShieldAlert className="w-8 h-8 text-jkn-dim mx-auto" />
            <h4 className="text-sm font-bold text-jkn-text">Tidak ada berkas investigasi yang cocok dengan filter</h4>
            <p className="text-xs text-jkn-muted">Coba ubah kata kunci pencarian atau setel ulang filter aktif Anda.</p>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-bpjs text-white text-xs font-semibold hover:bg-bpjs-deep transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Semua Filter</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {viewMode === "TABLE" ? (
              /* Daftar kasus: satu baris per kasus, skor sebagai cincin, eksposur sebagai angka utama */
              <ul className="bg-surface rounded-2xl border border-jkn-border/90 overflow-hidden shadow-card divide-y divide-jkn-divider">
                {investigations.map((inv) => {
                  const topFinding = inv.claim.risk_findings?.[0];
                  const primaryDiagnosis = inv.claim.diagnoses?.[0];
                  const signals = (inv.primary_risk_signals ?? []).slice(0, 2);
                  const extraSignals = Math.max(0, (inv.primary_risk_signals ?? []).length - 2);
                  const statusMeta = STATUS_STYLE[inv.status] || {
                    label: inv.status,
                    className: "bg-surface-secondary text-jkn-muted border-jkn-divider",
                  };
                  const ringColor = RING_COLOR[inv.priority] || "#059669";
                  const circ = 2 * Math.PI * 22;
                  const patient = inv.claim.patient;

                  return (
                    <li key={inv.investigation_id} className="group px-5 py-4 grid grid-cols-[56px_minmax(0,1fr)] md:grid-cols-[56px_minmax(0,1fr)_190px_150px] gap-x-4 gap-y-3 items-center hover:bg-surface-secondary/50 transition-colors">
                      {/* Skor sebagai cincin */}
                      <div className="relative w-14 h-14 shrink-0" title={`Skor risiko ${inv.risk_score}, ${inv.priority}`}>
                        <svg viewBox="0 0 56 56" className="w-14 h-14" role="img" aria-label={`Skor risiko ${inv.risk_score}`}>
                          <circle cx="28" cy="28" r="22" fill="none" stroke="#E4ECE8" strokeWidth="5" />
                          <circle
                            cx="28"
                            cy="28"
                            r="22"
                            fill="none"
                            stroke={ringColor}
                            strokeWidth="5"
                            strokeLinecap="round"
                            strokeDasharray={`${(inv.risk_score / 100) * circ} ${circ}`}
                            transform="rotate(-90 28 28)"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-base font-semibold text-jkn-text tabular-nums">{inv.risk_score}</span>
                      </div>

                      {/* Faskes, klaim, temuan */}
                      <div className="min-w-0">
                        <Link href={`/investigations/${inv.investigation_id}`} className="block">
                          <span className="text-[15px] font-semibold text-jkn-text group-hover:text-bpjs transition-colors line-clamp-1">{inv.claim.provider.name}</span>
                        </Link>
                        <p className="mt-0.5 text-xs text-jkn-muted line-clamp-1">
                          <span className="font-mono">{inv.claim_id}</span>
                          {" · "}
                          {inv.claim.provider.city}
                          {" · "}
                          {patient.age > 0 ? `${patient.age} thn, ${patient.gender}` : "usia tidak tercatat"}
                          {primaryDiagnosis ? ` · ${primaryDiagnosis.description}` : ""}
                        </p>
                        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                          {signals.map((sig) => (
                            <RiskPill key={sig} type={sig} size="sm" />
                          ))}
                          {extraSignals > 0 && <span className="text-xs text-jkn-muted">+{extraSignals}</span>}
                          <span className="text-xs text-jkn-dim line-clamp-1 min-w-0 flex-1 basis-40">{topFinding?.title ?? inv.ai_priority_rationale}</span>
                        </div>
                      </div>

                      {/* Eksposur sebagai angka utama */}
                      <div className="col-span-2 md:col-span-1 md:text-right">
                        {inv.potential_exposure > 0 ? (
                          <div className="font-mono text-lg font-semibold text-risk-critical tabular-nums leading-tight">{formatRupiah(inv.potential_exposure, true)}</div>
                        ) : (
                          <div className="text-sm font-medium text-jkn-muted leading-tight" title="Temuan berasal dari pola (mis. narasi mirip), bukan dari selisih tarif">
                            Tanpa selisih tarif
                          </div>
                        )}
                        <div className="text-xs text-jkn-muted mt-0.5 tabular-nums">
                          tagihan {formatRupiah(inv.claim.claim_amount, true)}
                        </div>
                        <NationalChip n={inv.claim.national} className="text-xs block mt-0.5" />
                      </div>

                      {/* Status dan aksi */}
                      <div className="col-span-2 md:col-span-1 flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2">
                        <span className={`inline-block text-[11px] px-2 py-0.5 rounded-md font-semibold border whitespace-nowrap ${statusMeta.className}`}>{statusMeta.label}</span>
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            href={`/reports/${inv.investigation_id}`}
                            title="Buka dosier audit; unduh PDF dari halaman itu"
                            aria-label={`Dosier ${inv.claim_id}`}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-jkn-border text-jkn-muted hover:text-jkn-text hover:bg-surface-secondary transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Link>
                          <Link
                            href={`/investigations/${inv.investigation_id}`}
                            className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-[#071A12] text-white text-xs font-semibold hover:bg-[#0D2B1E] transition-colors"
                          >
                            <span>Periksa</span>
                            <ChevronRight className="w-3.5 h-3.5 text-[#34D399]" />
                          </Link>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              /* Clean Forensic Dossier Card Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {investigations.map((inv) => {
                  const topFinding = inv.claim.risk_findings?.[0];
                  const topEvidenceId = topFinding?.evidence?.[0]?.evidence_id;
                  const primaryDiagnosis = inv.claim.diagnoses?.[0];
                  const visibleSignals = (inv.primary_risk_signals ?? []).slice(0, 3);
                  const hiddenSignalCount = Math.max(0, (inv.primary_risk_signals ?? []).length - 3);
                  const exposurePct =
                    inv.claim.claim_amount > 0
                      ? Math.min(100, Math.round((inv.potential_exposure / inv.claim.claim_amount) * 100))
                      : 0;
                  const statusMeta = STATUS_STYLE[inv.status] || {
                    label: inv.status,
                    className: "bg-surface-secondary text-jkn-muted border-jkn-divider",
                  };
                  const losDays = inv.claim.service?.length_of_stay ?? 1;

                  return (
                    <div
                      key={inv.investigation_id}
                      className="group bg-surface rounded-xl border border-jkn-border hover:border-bpjs/60 shadow-subtle hover:shadow-card transition-all flex flex-col justify-between overflow-hidden"
                    >
                      <div className="p-4 space-y-3.5">
                        {/* Header Row: IDs & Risk Score */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-mono font-bold text-jkn-text tabular-nums">
                                {inv.claim_id}
                              </span>
                              <span className="text-[10px] font-mono text-jkn-dim tabular-nums">
                                · {inv.investigation_id}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-jkn-muted mt-1 min-w-0">
                              <Building2 className="w-3 h-3 text-jkn-dim shrink-0" />
                              <span className="font-semibold text-jkn-text truncate">{inv.claim.provider.name}</span>
                              <span className="text-jkn-dim shrink-0">· {inv.claim.provider.city}</span>
                            </div>
                          </div>
                          <div className="shrink-0">
                            <RiskPill score={inv.risk_score} level={inv.priority} size="sm" />
                          </div>
                        </div>

                        {/* Clinical Block: Patient + Diagnosis + Severity/LOS */}
                        <div className="p-2.5 rounded-lg bg-surface-secondary/70 border border-jkn-divider space-y-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-jkn-muted">
                              Peserta:{" "}
                              <strong className="text-jkn-text font-semibold">{inv.claim.patient.name}</strong> (
                              {inv.claim.patient.age > 0 ? `${inv.claim.patient.age} thn, ${inv.claim.patient.gender})` : "usia tidak tercatat)"}
                            </span>
                            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-surface border border-jkn-divider text-jkn-text shrink-0">
                              {primaryDiagnosis?.severity ? `Severity Lv.${primaryDiagnosis.severity}` : "Klaim JKN"} · LOS {losDays}h
                            </span>
                          </div>
                          {primaryDiagnosis && (
                            <div className="pt-1.5 border-t border-jkn-divider/80 text-[11px] leading-snug">
                              <span className="text-jkn-dim mr-1.5">ICD-10:</span>
                              <span className="font-mono font-bold text-bpjs-dark mr-1">
                                {primaryDiagnosis.code}
                              </span>
                              <span className="text-jkn-text font-medium">{primaryDiagnosis.description}</span>
                            </div>
                          )}
                        </div>

                        {/* Specific Forensic Contradiction */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-jkn-dim">
                              Temuan utama
                            </span>
                            {topEvidenceId && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-surface-secondary text-bpjs-dark border border-jkn-border">
                                <FileText className="w-2.5 h-2.5" />
                                {topEvidenceId}
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-semibold text-jkn-text leading-snug">
                            {topFinding ? topFinding.title : "Anomali Komposit Multi-Detektor"}
                          </div>
                          <p className="text-[11px] text-jkn-muted leading-relaxed line-clamp-2">
                            {topFinding ? topFinding.summary : inv.ai_priority_rationale}
                          </p>
                        </div>

                        {/* Signal Pills */}
                        <div className="flex items-center flex-wrap gap-1 pt-0.5">
                          {visibleSignals.map((sig) => (
                            <RiskPill key={sig} type={sig} size="sm" />
                          ))}
                          {hiddenSignalCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-surface-secondary text-jkn-muted border border-jkn-divider">
                              +{hiddenSignalCount} sinyal
                            </span>
                          )}
                        </div>

                        {/* Financial Comparison Strip */}
                        <div className="pt-2.5 border-t border-jkn-divider flex items-end justify-between gap-3">
                          <div>
                            <span className="text-xs text-jkn-dim block">Tagihan</span>
                            <span className="text-xs font-mono font-semibold text-jkn-text tabular-nums">
                              {formatRupiah(inv.claim.claim_amount)}
                            </span>
                            <NationalChip n={inv.claim.national} className="text-xs block" />
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-jkn-dim block">
                              Eksposur ({exposurePct}%)
                            </span>
                            <span className="text-xs font-mono font-bold text-risk-critical tabular-nums">
                              {formatRupiah(inv.potential_exposure)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Calm Architectural Footer Strip */}
                      <div className="px-4 py-2.5 bg-surface-secondary/60 border-t border-jkn-divider flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-semibold border shrink-0 ${statusMeta.className}`}
                          >
                            {statusMeta.label}
                          </span>
                          <span className="text-[10px] text-jkn-dim tabular-nums truncate">
                            {formatRelativeTime(inv.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Link
                            href={`/reports/${inv.investigation_id}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-jkn-border bg-white text-xs font-semibold text-jkn-muted hover:text-jkn-text transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Dosier</span>
                          </Link>
                          <Link
                            href={`/investigations/${inv.investigation_id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-bpjs-dark hover:text-bpjs transition-all"
                          >
                            <span>Periksa</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
          </>
        )
      ) : (
        /* Mode 2: Full-Population Claims Census (Sensus Semua Klaim) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className={selectedClaim ? "lg:col-span-7" : "lg:col-span-12"}>
            <div className="bg-surface rounded-xl border border-jkn-border overflow-hidden shadow-subtle overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-secondary border-b border-jkn-border text-jkn-dim font-semibold text-xs">
                  <tr>
                    <th className="py-3 px-3.5">Klaim</th>
                    <th className={`py-3 px-3.5 ${selectedClaim ? "hidden" : ""}`}>Peserta (pseudonim)</th>
                    <th className="py-3 px-3.5">Faskes</th>
                    <th className="py-3 px-3.5">Diagnosis</th>
                    <th className="py-3 px-3.5 text-right">Tagihan</th>
                    <th className="py-3 px-3.5">Skor</th>
                    <th className="py-3 px-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-jkn-divider">
                  {claimsLoading ? (
                    <tr>
                      <td colSpan={7}>
                        <PageLoader label="Memuat sensus repositori klaim..." className="py-14" />
                      </td>
                    </tr>
                  ) : claimsError ? (
                    <tr>
                      <td colSpan={7} role="alert" className="p-8 text-center space-y-2">
                        <div className="text-risk-critical font-semibold">{claimsError}</div>
                        <button onClick={() => setReloadKey((k) => k + 1)} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-bpjs text-white text-xs font-semibold hover:bg-bpjs-deep transition-all">
                          <RotateCcw className="w-3 h-3" />
                          <span>Coba lagi</span>
                        </button>
                      </td>
                    </tr>
                  ) : claimsTotal === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-jkn-muted space-y-2">
                        <div>Tidak ada klaim yang cocok dengan kriteria pencarian.</div>
                        {hasActiveFilters && (
                          <button
                            onClick={handleResetFilters}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-bpjs text-white text-xs font-semibold hover:bg-bpjs-deep transition-all mt-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reset Filter</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    claims.map((claim) => (
                      <tr
                        key={claim.claim_id}
                        onClick={() => openClaim(claim)}
                        className={`hover:bg-bpjs-soft/30 cursor-pointer transition-colors ${
                          selectedClaim?.claim_id === claim.claim_id ? "bg-bpjs-soft/60" : ""
                        }`}
                      >
                        <td className="py-3 px-3.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openClaim(claim);
                            }}
                            className="font-mono font-bold text-jkn-text tabular-nums hover:text-bpjs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bpjs rounded"
                            aria-label={`Buka ringkasan klaim ${claim.claim_id}`}
                          >
                            {claim.claim_id}
                          </button>
                          <div className="text-xs text-jkn-dim font-mono tabular-nums mt-0.5">{claim.sep_number}</div>
                        </td>
                        <td className={`py-3 px-3.5 ${selectedClaim ? "hidden" : ""}`}>
                          <div className="font-semibold text-jkn-text">{claim.patient.name}</div>
                          <div className="text-[10px] text-jkn-dim font-mono tabular-nums mt-0.5">
                            {claim.patient.patient_id}{claim.patient.age > 0 ? ` · ${claim.patient.age} thn` : ""}
                          </div>
                        </td>
                        <td className="py-3 px-3.5">
                          <div className={`font-semibold text-jkn-text ${selectedClaim ? "truncate max-w-[140px]" : ""}`}>{claim.provider.name}</div>
                          <div className="text-xs text-jkn-dim mt-0.5">{claim.provider.city}</div>
                        </td>
                        <td className="py-3 px-3.5">
                          <div className={`text-jkn-text truncate ${selectedClaim ? "max-w-[150px]" : "max-w-[220px]"}`}>
                            <span className="font-mono font-bold text-bpjs-dark">{claim.diagnoses[0]?.code}</span>{" "}
                            <span className="font-medium">{claim.diagnoses[0]?.description}</span>
                          </div>
                          <div className="text-xs text-jkn-dim tabular-nums mt-0.5">
                            {TREATMENT_CLASS_LABEL[claim.service.treatment_class] || claim.service.treatment_class}
                            {claim.service.treatment_class === "RAWAT_JALAN" ? "" : `, ${claim.service.length_of_stay} hari`}
                          </div>
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono font-bold text-jkn-text tabular-nums whitespace-nowrap">
                          {formatRupiah(claim.claim_amount)}
                          <NationalChip n={claim.national} className="text-xs font-normal block" />
                        </td>
                        <td className="py-3 px-3.5">
                          <RiskPill score={claim.risk_score} level={claim.risk_level} size="sm" />
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border whitespace-nowrap ${
                              CLAIM_STATUS_STYLE[claim.status] || "bg-surface-secondary text-jkn-dim border-jkn-border"
                            }`}
                          >
                            {CLAIM_STATUS_LABEL[claim.status] || claim.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {!claimsLoading && (
              <Pagination
                page={claimsPage}
                pageSize={claimsPageSize}
                total={claimsTotal}
                onPageChange={setClaimsPage}
                className="pt-3"
              />
            )}
          </div>

          {/* Side Preview Drawer for Claims Census */}
          {selectedClaim && (
            <div className="lg:col-span-5 bg-surface rounded-xl border border-jkn-border p-4 shadow-card space-y-4 sticky top-20 animate-in slide-in-from-right-3 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-jkn-divider">
                <div>
                  <span className="text-xs font-semibold text-jkn-dim">Ringkasan klaim</span>
                  <h3 className="text-sm font-bold text-jkn-text flex items-center gap-2 mt-0.5">
                    <span className="font-mono tabular-nums">{selectedClaim.claim_id}</span>
                    <RiskPill score={selectedClaim.risk_score} level={selectedClaim.risk_level} size="sm" />
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedClaim(null)}
                  aria-label="Tutup ringkasan klaim"
                  className="p-1.5 rounded-lg text-jkn-dim hover:text-jkn-text hover:bg-surface-secondary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="divide-y divide-jkn-divider border border-jkn-divider rounded-lg bg-surface-secondary/50 px-3">
                  <div className="flex justify-between py-2">
                    <span className="text-jkn-muted">Peserta (Pseudonim)</span>
                    <span className="font-semibold text-jkn-text">{selectedClaim.patient.name}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-jkn-muted">Fasilitas Kesehatan</span>
                    <span className="font-semibold text-jkn-text">{selectedClaim.provider.name}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-jkn-muted">DPJP Penanggung Jawab</span>
                    <span className="font-medium text-jkn-text">{selectedClaim.service.doctor_name}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-jkn-muted">Nilai Tagihan Klaim</span>
                    <span className="font-mono font-bold text-jkn-text tabular-nums">
                      {formatRupiah(selectedClaim.claim_amount)}
                    </span>
                  </div>
                </div>

                {selectedClaim.national && selectedClaim.national.cost_ref > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-jkn-dim block mb-2">
                      Dibanding statistik BPJS {selectedClaim.national.year}
                    </span>
                    <div className="divide-y divide-jkn-divider border border-jkn-divider rounded-lg bg-surface-secondary/50 px-3 text-xs tabular-nums">
                      <div className="flex justify-between gap-3 py-2">
                        <span className="text-jkn-muted">
                          Rerata {selectedClaim.national.class_label.toLowerCase()} {selectedClaim.national.level === "INAP" ? "per admisi" : "per kunjungan"}
                        </span>
                        <span className="font-mono font-semibold text-jkn-text">
                          {formatRupiah(selectedClaim.national.cost_ref)} ({selectedClaim.national.cost_ratio?.toLocaleString("id-ID", { maximumFractionDigits: 1 }) ?? "-"}x)
                        </span>
                      </div>
                      {selectedClaim.national.province_cost ? (
                        <div className="flex justify-between gap-3 py-2">
                          <span className="text-jkn-muted">Rerata {selectedClaim.national.province_name}</span>
                          <span className="font-mono font-semibold text-jkn-text">
                            {formatRupiah(selectedClaim.national.province_cost)} ({(selectedClaim.national.province_ratio || 0).toLocaleString("id-ID", { maximumFractionDigits: 1 })}x)
                          </span>
                        </div>
                      ) : null}
                      {selectedClaim.national.los_ref ? (
                        <div className="flex justify-between gap-3 py-2">
                          <span className="text-jkn-muted">Lama rawat rerata kelas</span>
                          <span className="font-mono font-semibold text-jkn-text">
                            {selectedClaim.national.los_ref.toLocaleString("id-ID")} hari, klaim ini {selectedClaim.service.length_of_stay} hari
                          </span>
                        </div>
                      ) : null}
                      <div className="flex justify-between gap-3 py-2">
                        <span className="text-jkn-muted">Diagnosis di 100 teratas nasional</span>
                        <span className="font-mono font-semibold text-jkn-text">
                          {selectedClaim.national.dx ? `peringkat ${selectedClaim.national.dx.rank}, ${selectedClaim.national.dx.admissions.toLocaleString("id-ID")} ${selectedClaim.national.level === "INAP" ? "admisi" : "kunjungan"}` : "tidak termasuk"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-xs font-semibold text-jkn-dim block mb-2">
                    Indikator anomali ({(selectedClaim.risk_findings ?? []).length})
                  </span>
                  <div className="divide-y divide-jkn-divider border border-jkn-border rounded-lg overflow-hidden">
                    {(selectedClaim.risk_findings ?? []).length === 0 && (
                      <p className="text-[11px] text-jkn-muted p-3">
                        Tidak ditemukan sinyal anomali pada klaim ini (status bersih / sesuai tarif INA-CBG).
                      </p>
                    )}
                    {(selectedClaim.risk_findings ?? []).map((finding, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-surface hover:bg-surface-secondary/40 text-[11px] space-y-1 transition-colors"
                      >
                        <div className="flex items-center justify-between font-bold text-jkn-text">
                          <span>{finding.title}</span>
                          <RiskPill score={finding.risk_score} size="sm" />
                        </div>
                        <p className="text-jkn-muted text-[11px] leading-relaxed line-clamp-2">{finding.summary}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {selectedClaim.investigation_id ? (
                <div className="flex items-center gap-2">
                  <Link
                    href={`/reports/${selectedClaim.investigation_id}`}
                    className="h-9 px-3 flex items-center justify-center gap-1.5 rounded-lg border border-jkn-border bg-white text-xs font-semibold text-jkn-text hover:bg-surface-secondary transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Dosier</span>
                  </Link>
                  <Link
                    href={`/investigations/${selectedClaim.investigation_id}`}
                    className="flex-1 h-9 flex items-center justify-center gap-2 rounded-lg bg-bpjs text-white text-xs font-semibold hover:bg-bpjs-deep transition-all shadow-subtle"
                  >
                    <span>Buka Workspace Investigasi</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <div className="text-[11px] text-jkn-muted text-center p-2.5 rounded-lg bg-surface-secondary border border-jkn-divider tabular-nums">
                  Skor {selectedClaim.risk_score} di bawah ambang masuk antrean kasus (75).
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
