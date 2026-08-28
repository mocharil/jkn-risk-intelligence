"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { RiskPill } from "@/components/ui/RiskPill";
import { PageLoader } from "@/components/ui/PageLoader";
import { Pagination } from "@/components/ui/Pagination";
import { Provider } from "@/types/provider";
import { formatRupiah, formatNumber, formatPercent } from "@/lib/formatting/currency";
import {
  Building2,
  Search,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Stethoscope,
  ChevronRight,
  Activity,
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
            <h1 className="text-xl font-black text-jkn-text tracking-tight">Healthcare Providers (Faskes Directory)</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-bpjs-light text-bpjs-dark text-xs font-bold border border-bpjs-border">
              {filtered.length} Monitored Facilities
            </span>
          </div>
          <p className="text-xs text-jkn-muted mt-1">
            Aggregate billing behavior analysis, national peer benchmark deviations, and provider risk profiles
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-surface rounded-2xl border border-jkn-border p-3.5 shadow-sm">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-jkn-dim absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search hospital name, clinic, city, or province..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-surface-secondary border border-jkn-border text-jkn-text outline-hidden focus:border-bpjs"
          />
        </div>
      </div>

      {/* Provider Cards Grid */}
      {loading ? (
        <PageLoader label="Loading providers directory..." />
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginated.map((provider) => (
            <div
              key={provider.provider_id}
              className={`bg-surface rounded-2xl border p-4 shadow-sm hover:shadow-card transition-all flex flex-col justify-between ${
                provider.risk_level === "CRITICAL"
                  ? "border-l-4 border-l-risk-critical border-jkn-border"
                  : provider.risk_level === "HIGH"
                  ? "border-l-4 border-l-risk-high border-jkn-border"
                  : "border-jkn-border"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-jkn-dim">{provider.provider_id}</span>
                    <h3 className="text-xs font-bold text-jkn-text leading-snug">{provider.name}</h3>
                    <p className="text-[11px] text-jkn-muted mt-0.5">{provider.city}, {provider.province_name}</p>
                  </div>
                  <RiskPill score={provider.risk_score} level={provider.risk_level} size="sm" />
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-surface-secondary/70 border border-jkn-divider text-xs">
                  <div>
                    <span className="text-[10px] text-jkn-dim font-medium block">Total Claims:</span>
                    <span className="font-bold text-jkn-text">{formatNumber(provider.total_claims)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-jkn-dim font-medium block">High-Risk Claims:</span>
                    <span className="font-bold text-risk-critical">{formatNumber(provider.high_risk_claims)}</span>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-jkn-divider/50">
                    <span className="text-[10px] text-jkn-dim font-medium block">Potential Risk Exposure:</span>
                    <span className="font-black text-sm text-risk-critical">
                      {formatRupiah(provider.potential_exposure, true)}
                    </span>
                  </div>
                </div>

                {/* Dominant Risk Type */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-jkn-dim text-[11px]">Dominant Pattern:</span>
                  <RiskPill type={provider.dominant_risk_type} size="sm" />
                </div>
              </div>

              {/* Action Link */}
              <div className="mt-4 pt-3 border-t border-jkn-divider">
                <Link
                  href={`/providers/${provider.provider_id}`}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-surface-secondary hover:bg-bpjs hover:text-white border border-jkn-border text-xs font-bold transition-all text-jkn-text"
                >
                  <span>View 360° Provider Intelligence</span>
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
