"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { RiskPill } from "@/components/ui/RiskPill";
import { CanonicalClaim } from "@/types/claim";
import { formatRupiah, formatNumber } from "@/lib/formatting/currency";
import { formatDate } from "@/lib/formatting/date";
import {
  FileText,
  Search,
  Filter,
  ArrowRight,
  X,
  Building2,
  User,
  Calendar,
  AlertTriangle,
  ChevronRight,
  Layers,
} from "lucide-react";

export default function ClaimsIntelligencePage() {
  const [claims, setClaims] = useState<CanonicalClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [riskLevelFilter, setRiskLevelFilter] = useState("ALL");
  const [riskTypeFilter, setRiskTypeFilter] = useState("ALL");
  const [selectedClaim, setSelectedClaim] = useState<CanonicalClaim | null>(null);

  useEffect(() => {
    fetch("/api/claims")
      .then((res) => res.json())
      .then((data) => {
        setClaims(data.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const filtered = claims.filter((claim) => {
    if (riskLevelFilter !== "ALL" && claim.risk_level !== riskLevelFilter) return false;
    if (riskTypeFilter !== "ALL" && !claim.risk_signals.includes(riskTypeFilter as any)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        claim.claim_id.toLowerCase().includes(q) ||
        claim.patient.name.toLowerCase().includes(q) ||
        claim.provider.name.toLowerCase().includes(q) ||
        claim.diagnoses.some((d) => d.code.toLowerCase().includes(q) || d.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <DashboardShell>
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-black text-jkn-text tracking-tight">Claims Intelligence</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-bpjs-light text-bpjs-dark text-xs font-bold border border-bpjs-border">
              {filtered.length} Ingested Claims
            </span>
          </div>
          <p className="text-xs text-jkn-muted mt-1">
            Comprehensive repository of inpatient & outpatient claims with automated multi-detector risk evaluations
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface rounded-2xl border border-jkn-border p-3.5 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-jkn-dim absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search claim ID, patient name, ICD-10 diagnosis, or provider..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-surface-secondary border border-jkn-border text-jkn-text outline-hidden focus:border-bpjs"
          />
        </div>

        <select
          value={riskLevelFilter}
          onChange={(e) => setRiskLevelFilter(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-xl bg-surface-secondary border border-jkn-border text-jkn-text outline-hidden"
        >
          <option value="ALL">All Risk Levels</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low / Normal</option>
        </select>

        <select
          value={riskTypeFilter}
          onChange={(e) => setRiskTypeFilter(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-xl bg-surface-secondary border border-jkn-border text-jkn-text outline-hidden"
        >
          <option value="ALL">All Anomaly Types</option>
          <option value="UPCODING">Upcoding</option>
          <option value="CLONING">Cloning</option>
          <option value="PHANTOM_BILLING">Phantom Billing</option>
          <option value="ABNORMAL_LOS">Abnormal LOS</option>
        </select>
      </div>

      {/* Main Table with Side Preview Drawer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Table Column */}
        <div className={selectedClaim ? "lg:col-span-7" : "lg:col-span-12"}>
          <div className="bg-surface rounded-2xl border border-jkn-border overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-secondary border-b border-jkn-border text-jkn-dim font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Claim ID</th>
                  <th className="p-3.5">Patient</th>
                  <th className="p-3.5">Healthcare Facility</th>
                  <th className="p-3.5">Diagnosis</th>
                  <th className="p-3.5">Billed Amount</th>
                  <th className="p-3.5">Risk Score</th>
                  <th className="p-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-jkn-divider">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-jkn-muted">
                      Loading claims repository...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-jkn-muted">
                      No claims found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filtered.map((claim) => (
                    <tr
                      key={claim.claim_id}
                      onClick={() => setSelectedClaim(claim)}
                      className={`hover:bg-bpjs-soft/30 cursor-pointer transition-colors ${
                        selectedClaim?.claim_id === claim.claim_id ? "bg-bpjs-soft/50 font-medium" : ""
                      }`}
                    >
                      <td className="p-3.5 font-bold text-jkn-text">
                        <div>{claim.claim_id}</div>
                        <div className="text-[10px] text-jkn-dim font-mono">{claim.sep_number}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-jkn-text">{claim.patient.name}</div>
                        <div className="text-[10px] text-jkn-dim">{claim.patient.patient_id} · {claim.patient.age} yo</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-jkn-text">{claim.provider.name}</div>
                        <div className="text-[10px] text-jkn-dim">{claim.provider.city}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-jkn-text truncate max-w-[150px]">
                          {claim.diagnoses[0]?.code} - {claim.diagnoses[0]?.description}
                        </div>
                        <div className="text-[10px] text-jkn-dim">LOS: {claim.service.length_of_stay} Days</div>
                      </td>
                      <td className="p-3.5 font-bold text-jkn-text">
                        {formatRupiah(claim.claim_amount)}
                      </td>
                      <td className="p-3.5">
                        <RiskPill score={claim.risk_score} level={claim.risk_level} size="sm" />
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-surface-secondary text-jkn-dim font-bold">
                          {claim.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side Preview Drawer (5 cols) */}
        {selectedClaim && (
          <div className="lg:col-span-5 bg-surface rounded-2xl border border-bpjs-border p-4 shadow-elevated space-y-4 sticky top-20 animate-in slide-in-from-right-3 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-jkn-divider">
              <div>
                <span className="text-[10px] font-bold text-jkn-dim uppercase tracking-wider">Quick Claim Dossier</span>
                <h3 className="text-sm font-bold text-jkn-text flex items-center gap-2">
                  <span>{selectedClaim.claim_id}</span>
                  <RiskPill score={selectedClaim.risk_score} level={selectedClaim.risk_level} size="sm" />
                </h3>
              </div>
              <button
                onClick={() => setSelectedClaim(null)}
                className="p-1 rounded-lg text-jkn-dim hover:text-jkn-text hover:bg-surface-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Details */}
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-surface-secondary/70 border border-jkn-divider space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-jkn-muted">Participant Name:</span>
                  <span className="font-bold text-jkn-text">{selectedClaim.patient.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-jkn-muted">Healthcare Facility:</span>
                  <span className="font-bold text-jkn-text">{selectedClaim.provider.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-jkn-muted">Attending DPJP:</span>
                  <span className="font-medium text-jkn-text">{selectedClaim.service.doctor_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-jkn-muted">Invoiced Amount:</span>
                  <span className="font-bold text-jkn-text">{formatRupiah(selectedClaim.claim_amount)}</span>
                </div>
              </div>

              {/* Risk Findings Summary */}
              <div>
                <span className="text-[11px] font-bold text-jkn-dim uppercase tracking-wider block mb-1.5">
                  Detected Anomaly Indicators ({selectedClaim.risk_findings.length})
                </span>
                <div className="space-y-1.5">
                  {selectedClaim.risk_findings.map((finding, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-risk-critical-bg/50 border border-risk-critical-border/50 text-[11px] space-y-1"
                    >
                      <div className="flex items-center justify-between font-bold text-risk-critical">
                        <span>{finding.title}</span>
                        <RiskPill score={finding.risk_score} size="sm" />
                      </div>
                      <p className="text-jkn-muted text-[10px] leading-relaxed line-clamp-2">
                        {finding.summary}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <Link
              href={
                selectedClaim.investigation_id
                  ? `/investigations/${selectedClaim.investigation_id}`
                  : `/investigations/INV-2026-010293`
              }
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-bpjs text-white text-xs font-bold hover:bg-bpjs-deep transition-all shadow-sm"
            >
              <span>Open Full Investigation Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
