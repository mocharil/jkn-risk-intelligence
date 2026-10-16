"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { RiskPill } from "@/components/ui/RiskPill";
import { PageLoader } from "@/components/ui/PageLoader";
import { Pagination } from "@/components/ui/Pagination";
import { Provider } from "@/types/provider";
import { formatRupiah, formatNumber } from "@/lib/formatting/currency";
import {
  Building2,
  Search,
  ChevronRight,
  RotateCcw,
} from "lucide-react";

export default function ProvidersListPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 9;

  useEffect(() => {
    fetch("/api/providers")
      .then((res) => res.json())
      .then((data) => {
        setProviders(data.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const filtered = providers.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.province_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <DashboardShell>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold text-jkn-text tracking-tight">Direktori Fasilitas Kesehatan (Faskes)</h1>
            <span className="px-2 py-0.5 rounded-md bg-bpjs-light text-bpjs-dark text-xs font-semibold border border-bpjs-border font-mono tabular-nums">
              {filtered.length} Faskes Dipantau
            </span>
          </div>
          <p className="text-xs text-jkn-muted mt-0.5">
            Analisis agregat perilaku penagihan klaim, deviasi terhadap benchmark rekan sejawat (peer group), dan profil risiko faskes.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-surface rounded-xl border border-jkn-border p-3 shadow-subtle flex items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-jkn-dim absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari nama rumah sakit, klinik, kota/kabupaten, atau provinsi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-xs rounded-lg bg-surface-secondary border border-jkn-border text-jkn-text outline-hidden focus:border-bpjs focus:bg-white transition-colors"
          />
        </div>
        {searchQuery.trim() !== "" && (
          <button
            onClick={() => setSearchQuery("")}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-jkn-border bg-white text-xs font-semibold text-jkn-muted hover:text-bpjs hover:border-bpjs transition-colors shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Provider Cards Grid */}
      {loading ? (
        <PageLoader label="Memuat direktori fasilitas kesehatan..." />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-surface rounded-xl border border-jkn-border p-6 space-y-3 shadow-subtle">
          <Building2 className="w-8 h-8 text-jkn-dim mx-auto" />
          <h4 className="text-sm font-bold text-jkn-text">Fasilitas kesehatan tidak ditemukan</h4>
          <p className="text-xs text-jkn-muted">Tidak ada faskes yang cocok dengan kata kunci &ldquo;{searchQuery}&rdquo;.</p>
          <button
            onClick={() => setSearchQuery("")}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-bpjs text-white text-xs font-semibold hover:bg-bpjs-deep transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Tampilkan Semua Faskes</span>
          </button>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginated.map((provider) => (
            <div
              key={provider.provider_id}
              className={`bg-surface rounded-xl border p-4 shadow-subtle hover:shadow-card transition-all flex flex-col justify-between ${
                provider.risk_level === "CRITICAL"
                  ? "border-l-[3px] border-l-risk-critical border-jkn-border"
                  : provider.risk_level === "HIGH"
                  ? "border-l-[3px] border-l-risk-high border-jkn-border"
                  : "border-jkn-border"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-semibold text-jkn-dim tabular-nums">{provider.provider_id}</span>
                    <h3 className="text-xs font-bold text-jkn-text leading-snug">{provider.name}</h3>
                    <p className="text-[11px] text-jkn-muted mt-0.5">{provider.city}, {provider.province_name}</p>
                  </div>
                  <RiskPill score={provider.risk_score} level={provider.risk_level} size="sm" />
                </div>

                {/* Metrics without nested box */}
                <div className="pt-2.5 border-t border-jkn-divider space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-jkn-dim font-medium block">Total Klaim</span>
                      <span className="font-bold text-jkn-text font-mono tabular-nums">{formatNumber(provider.total_claims)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-jkn-dim font-medium block">Klaim Risiko Tinggi</span>
                      <span className="font-bold text-risk-critical font-mono tabular-nums">{formatNumber(provider.high_risk_claims)}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-jkn-divider/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-jkn-dim font-medium">Potensi Eksposur Risiko</span>
                      <span className="font-bold text-xs text-risk-critical font-mono tabular-nums">
                        {formatRupiah(provider.potential_exposure, true)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-jkn-dim">
                        <span>Rasio klaim berisiko tinggi</span>
                        <span className="font-semibold text-jkn-text font-mono tabular-nums">
                          {provider.total_claims > 0 ? Math.round((provider.high_risk_claims / provider.total_claims) * 100) : 0}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-surface-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            provider.risk_level === "CRITICAL"
                              ? "bg-risk-critical"
                              : provider.risk_level === "HIGH"
                              ? "bg-risk-high"
                              : "bg-bpjs"
                          }`}
                          style={{
                            width: `${Math.min(
                              100,
                              provider.total_claims > 0 ? Math.round((provider.high_risk_claims / provider.total_claims) * 100) : 0
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dominant Risk Type */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-jkn-dim text-[11px]">Pola Dominan:</span>
                  <RiskPill type={provider.dominant_risk_type} size="sm" />
                </div>
              </div>

              {/* Action Link */}
              <div className="mt-3.5 pt-3 border-t border-jkn-divider">
                <Link
                  href={`/providers/${provider.provider_id}`}
                  className="w-full h-8 flex items-center justify-center gap-1.5 rounded-lg bg-surface-secondary hover:bg-bpjs hover:text-white border border-jkn-border text-xs font-semibold transition-all text-jkn-text"
                >
                  <span>Lihat Profil Intelijen 360°</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
        <Pagination page={currentPage} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />
        </>
      )}
    </DashboardShell>
  );
}

