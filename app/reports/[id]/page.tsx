"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { formatRupiah } from "@/lib/formatting/currency";
import { formatDate } from "@/lib/formatting/date";
import { Investigation } from "@/types/investigation";
import {
  ArrowLeft,
  Printer,
  FileSpreadsheet,
} from "lucide-react";

const verdictLabel: Record<string, string> = {
  CONFIRMED_RISK: "CONFIRMED RISK (TARIFF DOWN-CORRECTION)",
  FALSE_POSITIVE: "FALSE POSITIVE (CLAIM APPROVED)",
  NEED_EVIDENCE: "PENDING — ADDITIONAL EVIDENCE REQUESTED",
};

export default function ReportDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const investigationId = id.replace(/^REP-/, "");

  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    fetch(`/api/investigations/${investigationId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.data) {
          setInvestigation(data.data);
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
  }, [investigationId]);

  if (loading) {
    return (
      <DashboardShell>
        <PageLoader label={`Loading audit dossier for ${id}...`} />
      </DashboardShell>
    );
  }

  if (notFound || !investigation) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center print:hidden">
          <FileSpreadsheet className="w-8 h-8 text-jkn-dim" />
          <p className="text-sm font-bold text-jkn-text">Report not found</p>
          <p className="text-xs text-jkn-muted">No investigation matches "{investigationId}".</p>
          <Link href="/reports" className="text-xs font-bold text-bpjs-dark hover:underline">
            Back to Reports Directory
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const { claim, decision } = investigation;
  const topFinding = claim.risk_findings[0];

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
            <span className="font-mono text-jkn-dim block">REP-{investigation.investigation_id}</span>
            <span className="font-bold text-risk-critical">CONFIDENTIAL AUDIT</span>
          </div>
        </div>

        {/* Report Metadata */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-surface-secondary/70 border border-jkn-divider text-xs">
          <div>
            <span className="text-[10px] text-jkn-dim font-medium block">Claim Dossier Reference:</span>
            <span className="font-bold text-jkn-text">{claim.claim_id} (SEP: {claim.sep_number})</span>
          </div>
          <div>
            <span className="text-[10px] text-jkn-dim font-medium block">Audited Healthcare Facility:</span>
            <span className="font-bold text-jkn-text">{claim.provider.name} ({claim.provider.city})</span>
          </div>
          <div>
            <span className="text-[10px] text-jkn-dim font-medium block">Participant / Patient Name:</span>
            <span className="font-bold text-jkn-text">{claim.patient.name} ({claim.patient.patient_id})</span>
          </div>
          <div>
            <span className="text-[10px] text-jkn-dim font-medium block">Report Publication Date:</span>
            <span className="font-bold text-jkn-text">{formatDate(decision?.decided_at || investigation.updated_at)}</span>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-jkn-text uppercase tracking-wider border-b border-jkn-divider pb-1">
            I. Executive Finding Summary
          </h3>
          <p className="text-xs text-jkn-text leading-relaxed">
            {claim.risk_findings.length > 0 ? (
              <>
                Based on forensic examination of electronic medical records, integrated physician notes (CPPT), and
                INA-CBG tariff schedule benchmarks, the audit taskforce determines that claim{" "}
                <strong>{claim.claim_id}</strong> contains indicators of{" "}
                {claim.risk_findings.map((f, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && (i === claim.risk_findings.length - 1 ? " and " : ", ")}
                    <strong>{f.title}</strong>
                  </React.Fragment>
                ))}
                .{claim.tariff_difference ? ` An unwarranted financial variance of ` : ""}
                {claim.tariff_difference && <strong>{formatRupiah(claim.tariff_difference)}</strong>}
                {claim.tariff_difference ? " has been identified." : ""}
              </>
            ) : (
              <>No automated risk indicators were raised for claim <strong>{claim.claim_id}</strong>.</>
            )}
          </p>
        </div>

        {/* Evidence Matrix */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-jkn-text uppercase tracking-wider border-b border-jkn-divider pb-1">
            II. Clinical Evidence & Record Contradictions
          </h3>
          <div className="space-y-2 text-xs">
            {claim.risk_findings.length > 0 ? (
              claim.risk_findings.map((finding, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-risk-critical-border bg-risk-critical-bg/30 space-y-1">
                  <div className="font-bold text-risk-critical">
                    {idx + 1}. {finding.title}
                  </div>
                  <p className="text-[11px] text-jkn-muted">{finding.summary}</p>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-jkn-muted">No contradicting or missing evidence was identified for this claim.</p>
            )}
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
              <span>{decision ? verdictLabel[decision.verdict] || decision.verdict : "AWAITING INVESTIGATOR DETERMINATION"}</span>
            </div>
            <p className="text-[11px] text-jkn-muted leading-relaxed">
              {decision?.rationale ||
                (topFinding
                  ? `Recommended: down-correction to standard INA-CBG tariff and disallowance of unsupported charges pending final investigator sign-off, based on: ${topFinding.recommended_actions.join("; ") || topFinding.summary}.`
                  : "No remediation action is required at this time.")}
            </p>
            {decision?.recommended_recovery_amount ? (
              <p className="text-[11px] font-bold text-risk-critical">
                Recommended recovery amount: {formatRupiah(decision.recommended_recovery_amount)}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-8 pt-8 text-xs text-center">
            <div className="space-y-12">
              <span className="text-jkn-dim font-medium">Lead Investigating Auditor,</span>
              <div>
                <span className="font-bold text-jkn-text underline block">{investigation.assigned_to.name}</span>
                <span className="text-[10px] text-jkn-dim">{investigation.assigned_to.role}</span>
              </div>
            </div>
            <div className="space-y-12">
              <span className="text-jkn-dim font-medium">Determination,</span>
              <div>
                <span className="font-bold text-jkn-text underline block">
                  {decision?.decided_by || "Pending"}
                </span>
                <span className="text-[10px] text-jkn-dim">
                  {decision ? formatDate(decision.decided_at) : "Investigation still in progress"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
