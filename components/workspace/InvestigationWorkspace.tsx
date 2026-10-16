"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { RiskPill } from "@/components/ui/RiskPill";
import { PageLoader } from "@/components/ui/PageLoader";
import { Pagination } from "@/components/ui/Pagination";
import { Investigation } from "@/types/investigation";
import { CanonicalClaim } from "@/types/claim";
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
  X,
} from "lucide-react";

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
};

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
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<{ all: number; critical: number; high: number; medium: number }>({
    all: 0,
    critical: 0,
    high: 0,
    medium: 0,
  });
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState<string>(() => searchParams.get("priority") || "ALL");
  const [statusFilter, setStatusFilter] = useState<string>(() => searchParams.get("status") || "ALL");
  const [riskTypeFilter, setRiskTypeFilter] = useState<string>(() => searchParams.get("risk_type") || "ALL");
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
  }, [priorityFilter, statusFilter, riskTypeFilter, claimRiskLevel, debouncedSearch]);

  // Fetch initial counts for both tabs independently so none blocks the others
  useEffect(() => {
    const countInv = (q: string) =>
      fetch(`/api/investigations?limit=1${q}`)
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
  }, []);

  // Fetch Investigations when in QUEUE mode
  useEffect(() => {
    if (workspaceMode !== "QUEUE") return;
    const ctrl = new AbortController();
    const qs = new URLSearchParams({ limit: String(pageSize), offset: String((page - 1) * pageSize) });
    if (debouncedSearch) qs.set("search", debouncedSearch);
    if (priorityFilter !== "ALL") qs.set("priority", priorityFilter);
    if (statusFilter !== "ALL") qs.set("status", statusFilter);
    if (riskTypeFilter !== "ALL") qs.set("risk_type", riskTypeFilter);
    setLoading(true);
    fetch(`/api/investigations?${qs}`, { signal: ctrl.signal })
      .then((res) => res.json())
      .then((data) => {
        setInvestigations(data.data || []);
        const tc = data.total_count || 0;
        setTotal(tc);
        if (priorityFilter === "ALL" && statusFilter === "ALL" && riskTypeFilter === "ALL" && !debouncedSearch) {
          setCounts((prev) => ({ ...prev, all: tc || prev.all }));
        }
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setLoading(false);
      });
    return () => ctrl.abort();
  }, [workspaceMode, page, debouncedSearch, priorityFilter, statusFilter, riskTypeFilter]);

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
    setClaimsLoading(true);
    fetch(`/api/claims?${qs}`, { signal: ctrl.signal })
      .then((res) => res.json())
      .then((data) => {
        setClaims(data.data || []);
        setClaimsTotal(data.total_count || 0);
        setClaimsLoading(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setClaimsLoading(false);
      });
    return () => ctrl.abort();
  }, [workspaceMode, claimsPage, debouncedSearch, claimRiskLevel, riskTypeFilter]);

  const openClaim = async (c: CanonicalClaim) => {
    setSelectedClaim(c);
    try {
      const res = await fetch(`/api/claims/${c.claim_id}`);
      if (res.ok) setSelectedClaim((await res.json()).data);
    } catch {
      /* tetap tampilkan versi ringkas */
    }
  };

  const hasActiveFilters =
    priorityFilter !== "ALL" ||
    statusFilter !== "ALL" ||
    riskTypeFilter !== "ALL" ||
    claimRiskLevel !== "ALL" ||
    searchQuery.trim() !== "";

  const handleResetFilters = () => {
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
              Pemeriksaan Klaim &amp; Register Dosier
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-bpjs-soft text-bpjs-dark text-xs font-mono font-bold tabular-nums border border-bpjs-border">
              {workspaceMode === "QUEUE"
                ? `${total.toLocaleString("id-ID")} berkas investigasi`
                : `${claimsTotal.toLocaleString("id-ID")} klaim terdaftar`}
            </span>
          </div>
          <p className="text-xs text-jkn-muted mt-1">
            Pusat triase forensik klaim berisiko tinggi, ekspor berita acara audit (PDF), dan penelusuran sensus seluruh populasi klaim JKN.
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
              <span>Antrean Investigasi &amp; Dosier</span>
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
              <span>Sensus Semua Klaim</span>
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

      {/* Unified Control Bar */}
      <div className="bg-surface rounded-2xl border border-jkn-border/90 shadow-card overflow-hidden">
        {workspaceMode === "QUEUE" && (
          /* Top Tier: Architectural Priority Tabs (for Investigation Queue) */
          <div className="px-4 border-b border-jkn-divider bg-surface-subtle flex items-center justify-between gap-4 overflow-x-auto">
            <div className="flex items-center gap-1">
              {[
                { key: "ALL", label: "Semua Kasus", count: counts.all },
                { key: "CRITICAL", label: "Prioritas Kritis", count: counts.critical, dot: "bg-risk-critical" },
                { key: "HIGH", label: "Prioritas Tinggi", count: counts.high, dot: "bg-risk-high" },
                { key: "MEDIUM", label: "Prioritas Sedang", count: counts.medium, dot: "bg-risk-medium" },
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
                <span>Atur Ulang Filter</span>
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
              <option value="CONFIRMED_RISK">Risiko Terkonfirmasi</option>
              <option value="FALSE_POSITIVE">Positif Palsu</option>
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
              /* High-Density Forensic Triage Table with Direct PDF Dossier Export */
              <div className="bg-surface rounded-2xl border border-jkn-border/90 overflow-hidden shadow-card overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-subtle border-b border-jkn-border text-jkn-muted font-bold uppercase tracking-[0.1em] text-[10px]">
                    <tr>
                      <th className="py-3.5 px-3.5 w-32">Skor &amp; Berkas</th>
                      <th className="py-3.5 px-3 w-48">Klaim, Peserta &amp; Diagnosis</th>
                      <th className="py-3.5 px-3 w-44">Fasilitas Kesehatan</th>
                      <th className="py-3.5 px-3">Kontradiksi Klinis &amp; Sinyal Detektor</th>
                      <th className="py-3.5 px-3 text-right w-36">Tagihan vs Eksposur</th>
                      <th className="py-3.5 px-3.5 text-right w-44">Status, Dosier &amp; Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-jkn-divider">
                    {investigations.map((inv) => {
                      const topFinding = inv.claim.risk_findings?.[0];
                      const topEvidenceId = topFinding?.evidence?.[0]?.evidence_id;
                      const primaryDiagnosis = inv.claim.diagnoses?.[0];
                      const visibleSignals = inv.primary_risk_signals.slice(0, 3);
                      const hiddenSignalCount = Math.max(0, inv.primary_risk_signals.length - 3);
                      const exposurePct =
                        inv.claim.claim_amount > 0
                          ? Math.min(100, Math.round((inv.potential_exposure / inv.claim.claim_amount) * 100))
                          : 0;
                      const statusMeta = STATUS_STYLE[inv.status] || {
                        label: inv.status,
                        className: "bg-surface-secondary text-jkn-muted border-jkn-divider",
                      };
                      const providerTypeLabel =
                        PROVIDER_TYPE_LABEL[inv.claim.provider.type] || inv.claim.provider.type;
                      const treatmentClassLabel =
                        TREATMENT_CLASS_LABEL[inv.claim.service?.treatment_class] ||
                        inv.claim.service?.treatment_class ||
                        "Rawat Inap";
                      const losDays = inv.claim.service?.length_of_stay ?? 1;

                      return (
                        <tr
                          key={inv.investigation_id}
                          className="group hover:bg-surface-secondary/70 transition-colors align-top"
                        >
                          {/* 1. Skor & ID Berkas */}
                          <td className="py-3.5 px-3.5 whitespace-nowrap">
                            <RiskPill score={inv.risk_score} level={inv.priority} size="sm" />
                            <div className="font-mono text-[11px] font-bold text-jkn-text tabular-nums mt-1.5">
                              {inv.investigation_id}
                            </div>
                            <div className="text-[10px] text-jkn-dim tabular-nums mt-0.5">
                              {formatRelativeTime(inv.created_at)}
                            </div>
                          </td>

                          {/* 2. Klaim, Peserta & Diagnosis */}
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                              <span className="font-mono font-bold text-jkn-text tabular-nums">{inv.claim_id}</span>
                              {primaryDiagnosis?.severity && (
                                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-surface-secondary border border-jkn-divider text-jkn-muted">
                                  Sev Lv.{primaryDiagnosis.severity}
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-semibold text-jkn-text mt-1 line-clamp-1">
                              {inv.claim.patient.name}{" "}
                              <span className="font-normal text-jkn-muted text-[11px]">
                                ({inv.claim.patient.age} thn · {inv.claim.patient.gender})
                              </span>
                            </div>
                            {primaryDiagnosis && (
                              <div
                                className="text-[11px] text-jkn-muted mt-1 line-clamp-1"
                                title={`${primaryDiagnosis.code} — ${primaryDiagnosis.description}`}
                              >
                                <span className="font-mono font-bold text-bpjs-dark">{primaryDiagnosis.code}</span>{" "}
                                {primaryDiagnosis.description}
                              </div>
                            )}
                          </td>

                          {/* 3. Fasilitas Kesehatan */}
                          <td className="py-3.5 px-3">
                            <div className="font-semibold text-jkn-text leading-snug line-clamp-1">{inv.claim.provider.name}</div>
                            <div className="text-[11px] text-jkn-muted mt-0.5 line-clamp-1">
                              {providerTypeLabel} · {inv.claim.provider.city}
                            </div>
                            <div className="text-[10px] text-jkn-dim font-mono tabular-nums mt-1 whitespace-nowrap">
                              {treatmentClassLabel} · LOS {losDays}h
                            </div>
                          </td>

                          {/* 4. Kontradiksi Klinis & Sinyal Detektor */}
                          <td className="py-3.5 px-3">
                            {topFinding ? (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold text-jkn-text line-clamp-1">
                                    {topFinding.title}
                                  </span>
                                  {topEvidenceId && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-surface-secondary text-bpjs-dark border border-jkn-border shrink-0">
                                      <FileText className="w-2.5 h-2.5" />
                                      {topEvidenceId}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-jkn-muted leading-relaxed line-clamp-1">
                                  {topFinding.summary}
                                </p>
                              </div>
                            ) : (
                              <p className="text-[11px] text-jkn-muted leading-relaxed line-clamp-1">
                                {inv.ai_priority_rationale}
                              </p>
                            )}

                            <div className="flex items-center flex-wrap gap-1.5 mt-2">
                              {visibleSignals.map((sig) => (
                                <RiskPill key={sig} type={sig} size="sm" />
                              ))}
                              {hiddenSignalCount > 0 && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-surface-secondary text-jkn-muted border border-jkn-divider">
                                  +{hiddenSignalCount} sinyal
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 5. Tagihan vs Eksposur */}
                          <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                            <div className="text-[10px] text-jkn-dim uppercase tracking-wider">Potensi Eksposur</div>
                            <div className="font-mono text-xs font-bold text-risk-critical tabular-nums mt-0.5">
                              {formatRupiah(inv.potential_exposure)}
                            </div>
                            <div className="text-[11px] text-jkn-muted font-mono tabular-nums mt-1">
                              dari {formatRupiah(inv.claim.claim_amount)} ({exposurePct}%)
                            </div>
                          </td>

                          {/* 6. Status, Dosier PDF & Aksi */}
                          <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                            <div>
                              <span
                                className={`inline-block text-[10px] px-2 py-0.5 rounded-md font-semibold border ${statusMeta.className}`}
                              >
                                {statusMeta.label}
                              </span>
                            </div>
                            <div className="mt-2 inline-flex items-center justify-end gap-1.5">
                              <Link
                                href={`/investigations/${inv.investigation_id}/report`}
                                title="Cetak / Unduh Dosier PDF Audit"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-jkn-border bg-surface-subtle text-[11px] font-semibold text-jkn-muted hover:text-jkn-text hover:bg-surface-secondary transition-colors"
                              >
                                <Printer className="w-3 h-3" />
                                <span>PDF</span>
                              </Link>
                              <Link
                                href={`/investigations/${inv.investigation_id}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#071A12] text-white text-xs font-semibold hover:bg-[#0D2B1E] shadow-2xs transition-all"
                              >
                                <span>Periksa</span>
                                <ChevronRight className="w-3.5 h-3.5 text-[#34D399]" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Clean Forensic Dossier Card Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {investigations.map((inv) => {
                  const topFinding = inv.claim.risk_findings?.[0];
                  const topEvidenceId = topFinding?.evidence?.[0]?.evidence_id;
                  const primaryDiagnosis = inv.claim.diagnoses?.[0];
                  const visibleSignals = inv.primary_risk_signals.slice(0, 3);
                  const hiddenSignalCount = Math.max(0, inv.primary_risk_signals.length - 3);
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
                              {inv.claim.patient.age} thn, {inv.claim.patient.gender})
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
                            <span className="text-[10px] font-bold uppercase tracking-wider text-jkn-dim">
                              Kontradiksi Utama
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
                            <span className="text-[10px] text-jkn-dim block">Nilai Tagihan Klaim</span>
                            <span className="text-xs font-mono font-semibold text-jkn-text tabular-nums">
                              {formatRupiah(inv.claim.claim_amount)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-jkn-dim block">
                              Potensi Eksposur ({exposurePct}%)
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
                            href={`/investigations/${inv.investigation_id}/report`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-jkn-border bg-white text-[11px] font-semibold text-jkn-muted hover:text-jkn-text transition-colors"
                          >
                            <Printer className="w-3 h-3" />
                            <span>PDF</span>
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
                <thead className="bg-surface-secondary border-b border-jkn-border text-jkn-dim font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-3.5">ID Klaim / SEP</th>
                    <th className="py-3 px-3.5">Peserta (Pseudonim)</th>
                    <th className="py-3 px-3.5">Fasilitas Kesehatan</th>
                    <th className="py-3 px-3.5">Diagnosis &amp; LOS</th>
                    <th className="py-3 px-3.5 text-right">Nilai Tagihan</th>
                    <th className="py-3 px-3.5">Skor Risiko</th>
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
                          <div className="font-mono font-bold text-jkn-text tabular-nums">{claim.claim_id}</div>
                          <div className="text-[10px] text-jkn-dim font-mono tabular-nums mt-0.5">{claim.sep_number}</div>
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="font-semibold text-jkn-text">{claim.patient.name}</div>
                          <div className="text-[10px] text-jkn-dim font-mono tabular-nums mt-0.5">
                            {claim.patient.patient_id} · {claim.patient.age} thn
                          </div>
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="font-semibold text-jkn-text">{claim.provider.name}</div>
                          <div className="text-[10px] text-jkn-dim mt-0.5">{claim.provider.city}</div>
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="text-jkn-text truncate max-w-[180px]">
                            <span className="font-mono font-bold text-bpjs-dark">{claim.diagnoses[0]?.code}</span>{" "}
                            <span className="font-medium">{claim.diagnoses[0]?.description}</span>
                          </div>
                          <div className="text-[10px] text-jkn-dim tabular-nums mt-0.5">
                            Rawat inap: {claim.service.length_of_stay} hari
                          </div>
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono font-bold text-jkn-text tabular-nums whitespace-nowrap">
                          {formatRupiah(claim.claim_amount)}
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
                  <span className="text-[10px] font-semibold text-jkn-dim uppercase tracking-wider">
                    Ringkasan Cepat Klaim
                  </span>
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

                <div>
                  <span className="text-[10px] font-semibold text-jkn-dim uppercase tracking-wider block mb-2">
                    Indikator Anomali Terdeteksi ({selectedClaim.risk_findings.length})
                  </span>
                  <div className="divide-y divide-jkn-divider border border-jkn-border rounded-lg overflow-hidden">
                    {selectedClaim.risk_findings.length === 0 && (
                      <p className="text-[11px] text-jkn-muted p-3">
                        Tidak ditemukan sinyal anomali pada klaim ini (status bersih / sesuai tarif INA-CBG).
                      </p>
                    )}
                    {selectedClaim.risk_findings.map((finding, idx) => (
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
                    href={`/investigations/${selectedClaim.investigation_id}/report`}
                    className="h-9 px-3 flex items-center justify-center gap-1.5 rounded-lg border border-jkn-border bg-white text-xs font-semibold text-jkn-text hover:bg-surface-secondary transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>PDF Audit</span>
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
                  Skor {selectedClaim.risk_score} di bawah ambang antrean investigasi (75).
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
