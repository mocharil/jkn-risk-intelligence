"use client";

import React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { formatRupiah } from "@/lib/formatting/currency";
import { formatDate } from "@/lib/formatting/date";
import {
  ArrowLeft,
  Printer,
  ShieldCheck,
  Building2,
  FileText,
  AlertTriangle,
  User,
  Calendar,
} from "lucide-react";

export default function ReportDetailPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <DashboardShell>
      {/* Action Header */}
      <div className="flex items-center justify-between border-b border-jkn-border pb-4 print:hidden">
        <Link
          href="/reports"
          className="flex items-center gap-2 text-xs font-semibold text-jkn-muted hover:text-jkn-text"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Reports Directory</span>
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-bpjs text-white text-xs font-bold hover:bg-bpjs-deep transition-all shadow-sm"
        >
          <Printer className="w-4 h-4" />
          <span>Print / Export PDF Dossier</span>
        </button>
      </div>

      {/* Formal Printable Document Canvas */}
      <div className="max-w-4xl mx-auto bg-white border border-jkn-border p-8 md:p-12 rounded-2xl shadow-card space-y-6 print:border-none print:shadow-none print:p-0 print:max-w-none print:w-full print-page">
        {/* Institutional Header */}
        <div className="flex items-center justify-between border-b-2 border-bpjs pb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-white border border-bpjs-border flex items-center justify-center p-1.5 shadow-xs shrink-0">
              <img src="/arsa_logo.png" alt="ARSA JKN" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-base font-black text-jkn-text tracking-tight uppercase">
                SOCIAL SECURITY ADMINISTRATOR FOR HEALTH (BPJS KESEHATAN)
              </h2>
              <p className="text-xs text-bpjs font-bold">
                NATIONAL CLAIM INTEGRITY AUDIT & FORENSIC INVESTIGATION TASKFORCE (JKN RISK INTELLIGENCE)
              </p>
            </div>
          </div>
          <div className="text-right text-xs">
            <span className="font-mono text-jkn-dim block">{id}</span>
            <span className="font-bold text-risk-critical">CONFIDENTIAL AUDIT</span>
          </div>
        </div>

        {/* Report Metadata */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-surface-secondary/70 border border-jkn-divider text-xs">
          <div>
            <span className="text-[10px] text-jkn-dim font-medium block">Claim Dossier Reference:</span>
            <span className="font-bold text-jkn-text">CLM-10293 (SEP: 0045R0010826V0010293)</span>
          </div>
          <div>
            <span className="text-[10px] text-jkn-dim font-medium block">Audited Healthcare Facility:</span>
            <span className="font-bold text-jkn-text">RS Sehat Sentosa (South Jakarta)</span>
          </div>
          <div>
            <span className="text-[10px] text-jkn-dim font-medium block">Participant / Patient Name:</span>
            <span className="font-bold text-jkn-text">Bambang Sudibyo (P-10842)</span>
          </div>
          <div>
            <span className="text-[10px] text-jkn-dim font-medium block">Report Publication Date:</span>
            <span className="font-bold text-jkn-text">August 23, 2026</span>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-jkn-text uppercase tracking-wider border-b border-jkn-divider pb-1">
            I. Executive Finding Summary
          </h3>
          <p className="text-xs text-jkn-text leading-relaxed">
            Based on forensic examination of electronic medical records, integrated physician notes (CPPT), and INA-CBG tariff schedule benchmarks, the audit taskforce determines that claim <strong>CLM-10293</strong> contains confirmed evidence of <strong>Severity Level Upcoding</strong> and <strong>Fictitious Surgical Package Billing (Phantom Billing)</strong>. An unwarranted financial variance of <strong>Rp 14,650,000</strong> has been confirmed.
          </p>
        </div>

        {/* Evidence Matrix */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-jkn-text uppercase tracking-wider border-b border-jkn-divider pb-1">
            II. Clinical Evidence & Record Contradictions
          </h3>
          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-xl border border-risk-critical-border bg-risk-critical-bg/30 space-y-1">
              <div className="font-bold text-risk-critical">1. Surgical Procedure 44.95 Without Operating Room (IBS) Logs</div>
              <p className="text-[11px] text-jkn-muted">
                The claim invoiced digestive laparoscopic surgery totaling Rp 12,500,000. No surgical operative report, anesthesia chart, or disposable inventory log exists on date August 03, 2026.
              </p>
            </div>
            <div className="p-3 rounded-xl border border-risk-critical-border bg-risk-critical-bg/30 space-y-1">
              <div className="font-bold text-risk-critical">2. Severity Level 3 Inflation on Acute Gastroenteritis (A09)</div>
              <p className="text-[11px] text-jkn-muted">
                Discharge summary DOC-01 confirms patient was hemodynamically stable and resolved on Day 2 under standard oral rehydration without severe underlying comorbidities.
              </p>
            </div>
          </div>
        </div>

        {/* Decision & Signatures */}
        <div className="space-y-4 pt-4">
          <h3 className="text-xs font-bold text-jkn-text uppercase tracking-wider border-b border-jkn-divider pb-1">
            III. Remediation Order & Fund Recovery Plan
          </h3>
          <div className="p-4 rounded-xl bg-bpjs-soft/50 border border-bpjs-border text-xs space-y-2">
            <div className="flex justify-between font-bold text-bpjs-dark">
              <span>Remediation Order:</span>
              <span>CONFIRMED RISK (TARIFF DOWN-CORRECTION)</span>
            </div>
            <p className="text-[11px] text-jkn-muted leading-relaxed">
              1. Tariff adjustment to standard INA-CBG Acute Gastroenteritis Severity 1 (Rp 3,800,000).<br />
              2. Disallowance and clawback of unperformed surgical procedure 44.95 worth Rp 12,500,000.<br />
              3. Issuance of formal compliance compliance notice to RS Sehat Sentosa Medical Committee regarding electronic medical record integrity.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 pt-8 text-xs text-center">
            <div className="space-y-12">
              <span className="text-jkn-dim font-medium">Lead Investigating Auditor,</span>
              <div>
                <span className="font-bold text-jkn-text underline block">Aril Indra Permana</span>
                <span className="text-[10px] text-jkn-dim">Senior Fraud Investigator · ID. 19940823 201802 1 001</span>
              </div>
            </div>
            <div className="space-y-12">
              <span className="text-jkn-dim font-medium">Deputy Director of Healthcare Benefit Integrity,</span>
              <div>
                <span className="font-bold text-jkn-text underline block">dr. Hendro Wicaksono, M.Kes</span>
                <span className="text-[10px] text-jkn-dim">ID. 19780512 200312 1 002</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
