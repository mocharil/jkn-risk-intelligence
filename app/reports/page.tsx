"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { Pagination } from "@/components/ui/Pagination";
import { formatRupiah } from "@/lib/formatting/currency";
import { formatDate } from "@/lib/formatting/date";
import { Investigation } from "@/types/investigation";
import {
  FileSpreadsheet,
  ChevronRight,
} from "lucide-react";

const decisionStyle: Record<string, string> = {
  CONFIRMED_RISK: "bg-risk-critical-bg text-risk-critical",
  FALSE_POSITIVE: "bg-bpjs-light text-bpjs-dark",
  NEED_EVIDENCE: "bg-risk-medium-bg text-amber-800",
};

export default function ReportsHubPage() {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    fetch("/api/investigations")
      .then((res) => res.json())
      .then((data) => {
        setInvestigations(data.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const totalPages = Math.max(1, Math.ceil(investigations.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = investigations.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <DashboardShell>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-jkn-border pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-black text-jkn-text tracking-tight">Audit Reports & Dossiers Hub</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-bpjs-light text-bpjs-dark text-xs font-bold border border-bpjs-border">
              Print-Ready Compliance Dossiers
            </span>
          </div>
          <p className="text-xs text-jkn-muted mt-1">
            Every investigation is exportable as a formal audit dossier — generated from the investigation workspace.
          </p>
        </div>
      </div>

      {loading ? (
        <PageLoader label="Loading reports..." />
      ) : investigations.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
          <FileSpreadsheet className="w-8 h-8 text-jkn-dim" />
          <p className="text-sm font-bold text-jkn-text">No reports yet</p>
          <p className="text-xs text-jkn-muted max-w-sm">
            Reports are generated from an investigation's workspace. Open a case in the{" "}
            <Link href="/investigation-queue" className="text-bpjs-dark font-bold hover:underline">
              Investigation Queue
            </Link>{" "}
            and select "Generate Report" to create one.
          </p>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paginated.map((inv) => {
            const decision = inv.decision?.verdict || inv.status;
            return (
              <div
                key={inv.investigation_id}
                className="bg-surface rounded-2xl border border-jkn-border p-5 shadow-sm hover:shadow-card transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-jkn-dim">REP-{inv.investigation_id}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        decisionStyle[decision] || "bg-surface-secondary text-jkn-muted"
                      }`}
                    >
                      {decision.replace(/_/g, " ")}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-jkn-text leading-snug">
                    Formal Investigation Audit Report: {inv.claim.risk_signals[0]?.replace(/_/g, " ") || "Claim Anomaly"} {inv.claim_id}
                  </h3>

                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-surface-secondary/70 border border-jkn-divider text-xs">
                    <div>
                      <span className="text-[10px] text-jkn-dim font-medium block">Healthcare Facility:</span>
                      <span className="font-bold text-jkn-text">{inv.claim.provider.name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-jkn-dim font-medium block">Lead Auditor:</span>
                      <span className="font-semibold text-jkn-text">{inv.decision?.decided_by || inv.assigned_to.name}</span>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-jkn-divider/50 flex justify-between">
                      <span className="text-[10px] text-jkn-dim font-medium">Potential Fund Recovery:</span>
                      <span className="font-black text-risk-critical">{formatRupiah(inv.potential_exposure)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-jkn-divider flex items-center justify-between">
                  <span className="text-[10px] text-jkn-dim">
                    {inv.decision ? "Decided" : "Updated"}: {formatDate(inv.decision?.decided_at || inv.updated_at)}
                  </span>
                  <Link
                    href={`/reports/REP-${inv.investigation_id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bpjs text-white text-xs font-bold hover:bg-bpjs-deep transition-all shadow-2xs"
                  >
                    <span>Open PDF Dossier / Print</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
        <Pagination page={currentPage} pageSize={pageSize} total={investigations.length} onPageChange={setPage} />
        </>
      )}
    </DashboardShell>
  );
}
