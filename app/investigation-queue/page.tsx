"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { RiskPill } from "@/components/ui/RiskPill";
import { Investigation } from "@/types/investigation";
import { RiskType } from "@/types/risk";
import { formatRupiah, formatNumber } from "@/lib/formatting/currency";
import { formatRelativeTime } from "@/lib/formatting/date";
import {
  ShieldAlert,
  Search,
  Filter,
  ArrowRight,
  Sparkles,
  LayoutGrid,
  List,
  Building2,
  Calendar,
  DollarSign,
  ChevronRight,
} from "lucide-react";

export default function InvestigationQueuePage() {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [riskTypeFilter, setRiskTypeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"CARD" | "TABLE">("CARD");

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

  const filtered = investigations.filter((inv) => {
    if (priorityFilter !== "ALL" && inv.priority !== priorityFilter) return false;
    if (statusFilter !== "ALL" && inv.status !== statusFilter) return false;
    if (riskTypeFilter !== "ALL" && !inv.primary_risk_signals.includes(riskTypeFilter as RiskType)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchClaim = inv.claim_id.toLowerCase().includes(q);
      const matchPatient = inv.claim.patient.name.toLowerCase().includes(q);
      const matchProvider = inv.claim.provider.name.toLowerCase().includes(q);
      const matchDiag = inv.claim.diagnoses.some((d) => d.code.toLowerCase().includes(q) || d.description.toLowerCase().includes(q));
      return matchClaim || matchPatient || matchProvider || matchDiag;
    }
    return true;
  });

  const criticalCount = investigations.filter((i) => i.priority === "CRITICAL").length;
  const highCount = investigations.filter((i) => i.priority === "HIGH").length;
  const mediumCount = investigations.filter((i) => i.priority === "MEDIUM").length;

  return (
    <DashboardShell>
      {/* Title & Stats Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-black text-jkn-text tracking-tight">Investigation Case Queue</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-risk-critical-bg text-risk-critical text-xs font-bold border border-risk-critical-border">
              {filtered.length} Cases Requiring Action
            </span>
          </div>
          <p className="text-xs text-jkn-muted mt-1">
            Prioritized claims based on composite multi-detector anomaly scores and grounded AI reasoning justifications
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-secondary border border-jkn-border rounded-xl">
          <button
            onClick={() => setViewMode("CARD")}
            className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === "CARD" ? "bg-white text-bpjs-dark shadow-xs font-bold" : "text-jkn-dim hover:text-jkn-text"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("TABLE")}
            className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === "TABLE" ? "bg-white text-bpjs-dark shadow-xs font-bold" : "text-jkn-dim hover:text-jkn-text"
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Priority Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: "ALL", label: "All Cases", count: investigations.length },
          { key: "CRITICAL", label: "Critical", count: criticalCount, color: "text-risk-critical" },
          { key: "HIGH", label: "High", count: highCount, color: "text-risk-high" },
          { key: "MEDIUM", label: "Medium", count: mediumCount, color: "text-amber-700" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setPriorityFilter(tab.key)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 border ${
              priorityFilter === tab.key
                ? "bg-bpjs-soft text-bpjs-dark border-bpjs-border shadow-2xs font-bold"
                : "bg-surface text-jkn-muted border-jkn-border hover:bg-surface-secondary"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                priorityFilter === tab.key ? "bg-bpjs text-white" : "bg-surface-secondary text-jkn-dim"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-surface rounded-2xl border border-jkn-border p-3.5 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-jkn-dim absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Claim ID, Patient Name, Provider, or Diagnosis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-surface-secondary border border-jkn-border text-jkn-text outline-hidden focus:border-bpjs"
          />
        </div>

        {/* Risk Type Filter */}
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

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-xl bg-surface-secondary border border-jkn-border text-jkn-text outline-hidden"
        >
          <option value="ALL">All Investigation Statuses</option>
          <option value="NEW">New</option>
          <option value="UNDER_INVESTIGATION">Under Investigation</option>
          <option value="NEED_EVIDENCE">Need Evidence</option>
          <option value="CONFIRMED_RISK">Confirmed Risk</option>
          <option value="FALSE_POSITIVE">False Positive</option>
        </select>
      </div>

      {/* Investigation List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-xs text-jkn-muted">
          Loading investigation queue...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-surface rounded-2xl border border-jkn-border p-6 space-y-2">
          <ShieldAlert className="w-8 h-8 text-jkn-dim mx-auto" />
          <h4 className="text-sm font-bold text-jkn-text">No investigations match your filters</h4>
          <p className="text-xs text-jkn-muted">Try modifying your search keyword or active filters.</p>
        </div>
      ) : viewMode === "CARD" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((inv) => (
            <div
              key={inv.investigation_id}
              className={`bg-surface rounded-2xl border p-4 shadow-sm hover:shadow-card transition-all flex flex-col justify-between ${
                inv.priority === "CRITICAL"
                  ? "border-l-4 border-l-risk-critical border-jkn-border"
                  : inv.priority === "HIGH"
                  ? "border-l-4 border-l-risk-high border-jkn-border"
                  : "border-jkn-border"
              }`}
            >
              <div className="space-y-3">
                {/* Header info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-jkn-text">{inv.claim_id}</span>
                    <RiskPill score={inv.risk_score} level={inv.priority} size="sm" />
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-secondary text-jkn-dim font-bold">
                    {inv.status}
                  </span>
                </div>

                {/* Patient & Provider details */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-jkn-dim font-medium">Patient:</span>
                    <div className="font-bold text-jkn-text truncate">{inv.claim.patient.name}</div>
                    <div className="text-[11px] text-jkn-muted">{inv.claim.patient.age} yo, {inv.claim.patient.gender === "L" ? "Male" : "Female"}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-jkn-dim font-medium">Healthcare Provider:</span>
                    <div className="font-bold text-jkn-text truncate">{inv.claim.provider.name}</div>
                    <div className="text-[11px] text-jkn-muted">{inv.claim.provider.city}</div>
                  </div>
                </div>

                {/* Diagnosis & Tariff */}
                <div className="p-2.5 rounded-xl bg-surface-secondary/70 border border-jkn-divider text-xs space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-jkn-muted">Diagnosis:</span>
                    <span className="font-bold text-jkn-text truncate max-w-[200px]">
                      {inv.claim.diagnoses[0]?.code} - {inv.claim.diagnoses[0]?.description}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-jkn-muted">Claim Amount:</span>
                    <span className="font-bold text-jkn-text">{formatRupiah(inv.claim.claim_amount)}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-jkn-muted">Potential Exposure:</span>
                    <span className="font-bold text-risk-critical">{formatRupiah(inv.potential_exposure)}</span>
                  </div>
                </div>

                {/* AI Rationale Card */}
                <div className="p-2.5 rounded-xl bg-bpjs-soft/50 border border-bpjs-border/60 text-[11px] text-jkn-text flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-bpjs shrink-0 mt-0.5" />
                  <p className="leading-snug line-clamp-2">{inv.ai_priority_rationale}</p>
                </div>

                {/* Risk Signal Badges */}
                <div className="flex flex-wrap gap-1.5">
                  {inv.primary_risk_signals.map((sig) => (
                    <RiskPill key={sig} type={sig} size="sm" />
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-3 border-t border-jkn-divider flex items-center justify-between">
                <span className="text-[10px] text-jkn-dim">
                  Submitted: {formatRelativeTime(inv.created_at)}
                </span>
                <Link
                  href={`/investigations/${inv.investigation_id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bpjs text-white text-xs font-bold hover:bg-bpjs-deep transition-all shadow-xs"
                >
                  <span>Start Investigation</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-surface rounded-2xl border border-jkn-border overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-secondary border-b border-jkn-border text-jkn-dim font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Claim ID / Case</th>
                <th className="p-3.5">Patient</th>
                <th className="p-3.5">Healthcare Facility</th>
                <th className="p-3.5">Anomaly Patterns</th>
                <th className="p-3.5">Risk Score</th>
                <th className="p-3.5 text-right">Potential Exposure</th>
                <th className="p-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-jkn-divider">
              {filtered.map((inv) => (
                <tr key={inv.investigation_id} className="hover:bg-bpjs-soft/20 transition-colors">
                  <td className="p-3.5 font-bold text-jkn-text">
                    <div>{inv.claim_id}</div>
                    <div className="text-[10px] text-jkn-dim font-mono">{inv.investigation_id}</div>
                  </td>
                  <td className="p-3.5">
                    <div className="font-semibold text-jkn-text">{inv.claim.patient.name}</div>
                    <div className="text-[10px] text-jkn-dim">{inv.claim.patient.patient_id}</div>
                  </td>
                  <td className="p-3.5">
                    <div className="font-semibold text-jkn-text">{inv.claim.provider.name}</div>
                    <div className="text-[10px] text-jkn-dim">{inv.claim.provider.city}</div>
                  </td>
                  <td className="p-3.5">
                    <div className="flex flex-wrap gap-1">
                      {inv.primary_risk_signals.map((sig) => (
                        <RiskPill key={sig} type={sig} size="sm" />
                      ))}
                    </div>
                  </td>
                  <td className="p-3.5">
                    <RiskPill score={inv.risk_score} level={inv.priority} size="sm" />
                  </td>
                  <td className="p-3.5 text-right font-bold text-risk-critical">
                    {formatRupiah(inv.potential_exposure)}
                  </td>
                  <td className="p-3.5 text-center">
                    <Link
                      href={`/investigations/${inv.investigation_id}`}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-bpjs text-white text-xs font-bold hover:bg-bpjs-deep transition-colors"
                    >
                      <span>Investigate</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  );
}
