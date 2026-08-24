"use client";

import React from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { formatRupiah } from "@/lib/formatting/currency";
import { formatDate } from "@/lib/formatting/date";
import {
  FileSpreadsheet,
  FileText,
  Download,
  Printer,
  ChevronRight,
  ShieldCheck,
  Building2,
  Calendar,
} from "lucide-react";

export default function ReportsHubPage() {
  const reports = [
    {
      id: "REP-INV-2026-010293",
      claim_id: "CLM-10293",
      title: "Formal Investigation Audit Report: Inpatient Claim Anomaly CLM-10293",
      provider: "RS Sehat Sentosa",
      investigator: "Aril Indra Permana",
      decision: "CONFIRMED_RISK",
      exposure: 14650000,
      created_at: "2026-08-23T08:30:00Z",
    },
    {
      id: "REP-INV-2026-010294",
      claim_id: "CLM-10294",
      title: "Audit Report: Inpatient Discharge Summary Narrative Duplication at RS Medika Utama",
      provider: "RS Medika Utama",
      investigator: "Aril Indra Permana",
      decision: "NEED_EVIDENCE",
      exposure: 9240000,
      created_at: "2026-08-22T14:15:00Z",
    },
  ];

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
            Official archival dossiers, evidence justifications, and legal determinations ready for print/export
          </p>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((rep) => (
          <div
            key={rep.id}
            className="bg-surface rounded-2xl border border-jkn-border p-5 shadow-sm hover:shadow-card transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-jkn-dim">{rep.id}</span>
                <span className="px-2 py-0.5 rounded-full bg-risk-critical-bg text-risk-critical text-[10px] font-bold">
                  {rep.decision}
                </span>
              </div>

              <h3 className="text-xs font-bold text-jkn-text leading-snug">{rep.title}</h3>

              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-surface-secondary/70 border border-jkn-divider text-xs">
                <div>
                  <span className="text-[10px] text-jkn-dim font-medium block">Healthcare Facility:</span>
                  <span className="font-bold text-jkn-text">{rep.provider}</span>
                </div>
                <div>
                  <span className="text-[10px] text-jkn-dim font-medium block">Lead Auditor:</span>
                  <span className="font-semibold text-jkn-text">{rep.investigator}</span>
                </div>
                <div className="col-span-2 pt-1 border-t border-jkn-divider/50 flex justify-between">
                  <span className="text-[10px] text-jkn-dim font-medium">Potential Fund Recovery:</span>
                  <span className="font-black text-risk-critical">{formatRupiah(rep.exposure)}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-jkn-divider flex items-center justify-between">
              <span className="text-[10px] text-jkn-dim">Published: {formatDate(rep.created_at)}</span>
              <Link
                href={`/reports/${rep.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bpjs text-white text-xs font-bold hover:bg-bpjs-deep transition-all shadow-2xs"
              >
                <span>Open PDF Dossier / Print</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}
