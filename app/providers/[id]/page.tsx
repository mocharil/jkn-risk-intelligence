"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { RiskPill } from "@/components/ui/RiskPill";
import { Provider } from "@/types/provider";
import { CanonicalClaim } from "@/types/claim";
import { formatRupiah, formatNumber, formatPercent } from "@/lib/formatting/currency";
import {
  ArrowLeft,
  Building2,
  Stethoscope,
  TrendingUp,
  AlertTriangle,
  FileText,
  Activity,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

export default function ProviderDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [provider, setProvider] = useState<(Provider & { recent_claims: CanonicalClaim[] }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/providers/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.data) {
          setProvider(data.data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  if (loading || !provider) {
    return (
      <DashboardShell>
        <div className="text-center py-20 text-xs text-jkn-muted">Loading provider intelligence profile for {id}...</div>
      </DashboardShell>
    );
  }

  const peerComparisonData = [
    { name: "Severity 3 Ratio", provider: provider.peer_comparison.severity_3_rate.provider, peer: provider.peer_comparison.severity_3_rate.peer_median, unit: "%" },
    { name: "Avg Length of Stay (LOS)", provider: provider.peer_comparison.avg_los_days.provider, peer: provider.peer_comparison.avg_los_days.peer_median, unit: " Days" },
    { name: "Readmission Rate", provider: provider.peer_comparison.readmission_rate_pct.provider, peer: provider.peer_comparison.readmission_rate_pct.peer_median, unit: "%" },
  ];

  return (
    <DashboardShell>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-jkn-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/providers"
            className="p-2 rounded-xl bg-surface-secondary border border-jkn-border text-jkn-dim hover:text-jkn-text transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-jkn-dim">{provider.provider_id}</span>
              <h1 className="text-xl font-black text-jkn-text tracking-tight">{provider.name}</h1>
              <RiskPill score={provider.risk_score} level={provider.risk_level} size="sm" />
            </div>
            <p className="text-xs text-jkn-muted mt-0.5">{provider.address}, {provider.city} · Tel: {provider.phone}</p>
          </div>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface rounded-2xl border border-jkn-border p-4 shadow-xs">
          <span className="text-[10px] text-jkn-dim font-bold uppercase tracking-wider block">Total Claims Analyzed</span>
          <div className="text-xl font-black text-jkn-text mt-1">{formatNumber(provider.total_claims)}</div>
        </div>
        <div className="bg-surface rounded-2xl border border-jkn-border p-4 shadow-xs">
          <span className="text-[10px] text-jkn-dim font-bold uppercase tracking-wider block">High-Risk Claims</span>
          <div className="text-xl font-black text-risk-critical mt-1">{formatNumber(provider.high_risk_claims)}</div>
        </div>
        <div className="bg-surface rounded-2xl border border-jkn-border p-4 shadow-xs">
          <span className="text-[10px] text-jkn-dim font-bold uppercase tracking-wider block">Estimated Potential Exposure</span>
          <div className="text-xl font-black text-risk-critical mt-1">{formatRupiah(provider.potential_exposure, true)}</div>
        </div>
        <div className="bg-surface rounded-2xl border border-jkn-border p-4 shadow-xs">
          <span className="text-[10px] text-jkn-dim font-bold uppercase tracking-wider block">Dominant Anomaly Pattern</span>
          <div className="mt-1"><RiskPill type={provider.dominant_risk_type} size="sm" /></div>
        </div>
      </div>

      {/* Peer Benchmarking Chart & Risk Composition */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Peer Benchmark Bar Chart (7 cols) */}
        <div className="lg:col-span-7 bg-surface rounded-2xl border border-jkn-border p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-jkn-text uppercase tracking-wider">
              Comparison Against Peer Provider Medians
            </h3>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peerComparisonData} layout="vertical">
                <XAxis type="number" stroke="#8A9E96" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="#8A9E96" fontSize={11} width={150} />
                <Tooltip />
                <Bar dataKey="provider" name="This Facility" fill="#D92D20" radius={[0, 6, 6, 0]} />
                <Bar dataKey="peer" name="Peer Facility Median" fill="#00A651" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Composition Breakdown (5 cols) */}
        <div className="lg:col-span-5 bg-surface rounded-2xl border border-jkn-border p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-jkn-text uppercase tracking-wider">
            Provider Anomaly Composition Breakdown
          </h3>
          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Upcoding (Severity Inflation)</span>
                <span>{provider.risk_composition.upcoding_pct}%</span>
              </div>
              <div className="h-2 bg-surface-secondary rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: `${provider.risk_composition.upcoding_pct}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Phantom Billing (Unproven Procedures)</span>
                <span>{provider.risk_composition.phantom_billing_pct}%</span>
              </div>
              <div className="h-2 bg-surface-secondary rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${provider.risk_composition.phantom_billing_pct}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Cloning (Narrative Duplication)</span>
                <span>{provider.risk_composition.cloning_pct}%</span>
              </div>
              <div className="h-2 bg-surface-secondary rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${provider.risk_composition.cloning_pct}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Abnormal LOS (Length of Stay Deviation)</span>
                <span>{provider.risk_composition.abnormal_los_pct}%</span>
              </div>
              <div className="h-2 bg-surface-secondary rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${provider.risk_composition.abnormal_los_pct}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Associated Doctors List */}
      <div className="bg-surface rounded-2xl border border-jkn-border p-5 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-jkn-text uppercase tracking-wider">
          Associated Attending Physicians (DPJP)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {provider.doctors.map((doc) => (
            <div key={doc.doctor_id} className="p-3.5 rounded-xl border border-jkn-border bg-surface-secondary/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-bpjs-light text-bpjs-dark">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-jkn-text">{doc.name}</h4>
                  <p className="text-[11px] text-jkn-muted">{doc.specialty} · {doc.sip_number}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-jkn-dim block">{doc.high_risk_claims_count} Anomaly Claims</span>
                <RiskPill score={doc.risk_score} size="sm" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
