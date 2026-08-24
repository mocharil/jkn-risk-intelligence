"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { IndonesiaRiskMap } from "@/components/map/IndonesiaRiskMap";
import { RiskPill } from "@/components/ui/RiskPill";
import { formatRupiah, formatNumber } from "@/lib/formatting/currency";
import { formatRelativeTime } from "@/lib/formatting/date";
import { DashboardKPIs, EmergingSignal, ProvinceRiskData } from "@/types/risk";
import { Provider } from "@/types/provider";
import {
  ShieldAlert,
  FileCheck2,
  TrendingUp,
  Building2,
  Sparkles,
  ArrowUpRight,
  ArrowRight,
  Activity,
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function CommandCenterPage() {
  const [data, setData] = useState<{
    kpis: DashboardKPIs;
    province_risk: ProvinceRiskData[];
    emerging_signals: EmergingSignal[];
    top_providers: Provider[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((resData) => {
        setData(resData);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load dashboard:", err);
        setLoading(false);
      });
  }, []);

  if (loading || !data) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-bpjs border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold text-jkn-muted">Loading Risk Intelligence Command Center...</p>
          </div>
        </div>
      </DashboardShell>
    );
  }

  const { kpis, province_risk, emerging_signals, top_providers } = data;

  const distributionChartData = [
    { name: "Critical", value: kpis.risk_distribution.critical, color: "#D92D20" },
    { name: "High", value: kpis.risk_distribution.high, color: "#F04438" },
    { name: "Medium", value: kpis.risk_distribution.medium, color: "#F79009" },
    { name: "Low / Normal", value: kpis.risk_distribution.low, color: "#12B76A" },
  ];

  return (
    <DashboardShell>
      {/* Page Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-black text-jkn-text tracking-tight">JKN Risk Command Center</h1>
            <span className="px-2 py-0.5 rounded-full bg-bpjs-light text-bpjs-dark text-[11px] font-bold border border-bpjs-border">
              Real-Time Telemetry
            </span>
          </div>
          <p className="text-xs text-jkn-muted mt-1">
            Executive summary of claim anomaly detection, national geospatial distribution, and financial exposure mitigation
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/investigation-queue"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-bpjs text-white text-xs font-bold shadow-sm hover:bg-bpjs-deep hover:shadow-glow transition-all"
          >
            <span>Open Priority Queue (47)</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Claims Analyzed */}
        <div className="bg-surface rounded-2xl border border-jkn-border p-4 shadow-sm hover:shadow-card transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-jkn-dim uppercase tracking-wider">Total Claims Analyzed</span>
            <div className="p-2 rounded-xl bg-bpjs-light text-bpjs-dark">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-jkn-text">
              {formatNumber(kpis.total_claims_analyzed)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-bpjs font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+{kpis.trends.claims_change_pct}% from last month</span>
            </div>
          </div>
        </div>

        {/* KPI 2: High Risk Claims */}
        <div className="bg-surface rounded-2xl border border-jkn-border p-4 shadow-sm hover:shadow-card transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-jkn-dim uppercase tracking-wider">High-Risk Claims</span>
            <div className="p-2 rounded-xl bg-risk-critical-bg text-risk-critical">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-risk-critical">
              {formatNumber(kpis.high_risk_claims)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-risk-critical font-semibold">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+{kpis.trends.high_risk_change_pct}% detected increase</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Potential Exposure in Rupiah */}
        <div className="bg-surface rounded-2xl border border-jkn-border p-4 shadow-sm hover:shadow-card transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-jkn-dim uppercase tracking-wider">Potential Risk Exposure</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-jkn-text">
              {formatRupiah(kpis.potential_exposure, true)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-amber-700 font-semibold">
              <span>{formatRupiah(kpis.potential_exposure)}</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Providers at Risk */}
        <div className="bg-surface rounded-2xl border border-jkn-border p-4 shadow-sm hover:shadow-card transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-jkn-dim uppercase tracking-wider">Providers Under Review</span>
            <div className="p-2 rounded-xl bg-intel-light text-intel-deep">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-jkn-text">
              {formatNumber(kpis.providers_at_risk)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-bpjs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>7 priority investigation hospitals</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Indonesia Map + AI Briefing Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Indonesia Risk Map (8 cols) */}
        <div className="lg:col-span-8">
          <IndonesiaRiskMap provinceData={province_risk} />
        </div>

        {/* AI Executive Briefing (4 cols) */}
        <div className="lg:col-span-4 bg-gradient-to-br from-surface to-bpjs-soft/40 rounded-2xl border border-bpjs-border p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-bpjs-border/60">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-bpjs text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-jkn-text">AI Executive Intelligence Briefing</h3>
                  <p className="text-[10px] text-jkn-muted">Automated Grounded Reasoning Summary</p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-bpjs-light text-bpjs-dark font-bold">
                94% Confidence
              </span>
            </div>

            <p className="text-xs text-jkn-text leading-relaxed">
              {kpis.ai_briefing.summary}
            </p>

            <div className="space-y-2">
              <span className="text-[11px] font-bold text-jkn-dim uppercase tracking-wider">
                Key Findings Today:
              </span>
              <div className="space-y-1.5">
                {kpis.ai_briefing.key_findings.map((finding, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-white border border-jkn-border/80 text-[11px] text-jkn-text flex items-start gap-2 shadow-2xs"
                  >
                    <span className="w-4 h-4 rounded-full bg-bpjs-light text-bpjs-dark font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-snug">{finding}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-bpjs-border/60">
            <Link
              href="/copilot"
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-bpjs text-white text-xs font-bold hover:bg-bpjs-deep transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Discuss Findings with AI Copilot</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Emerging Risk Signals Section */}
      <div className="bg-surface rounded-2xl border border-jkn-border p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-risk-critical" />
            <h3 className="text-sm font-bold text-jkn-text">Emerging Risk Signals</h3>
          </div>
          <Link href="/risk-intelligence" className="text-xs font-semibold text-bpjs hover:underline flex items-center gap-1">
            <span>View Cluster Analysis</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {emerging_signals.map((signal) => (
            <Link
              key={signal.signal_id}
              href="/investigation-queue"
              className="p-4 rounded-xl border border-jkn-border hover:border-bpjs hover:bg-bpjs-soft/30 transition-all group flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <RiskPill type={signal.risk_type} size="sm" />
                  <span className="text-[10px] text-jkn-dim font-medium">
                    {formatRelativeTime(signal.detected_at)}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-jkn-text group-hover:text-bpjs transition-colors">
                  {signal.title}
                </h4>
                <p className="text-[11px] text-jkn-muted line-clamp-2 leading-relaxed">
                  {signal.description}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-jkn-divider flex items-center justify-between text-[11px]">
                <span className="text-jkn-dim">{signal.affected_providers_count} Providers Affected</span>
                <span className="font-bold text-risk-critical">{formatRupiah(signal.potential_exposure, true)}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Analytics Row: Risk Distribution Donut + 7-Day Trend + Top Risk Providers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 7-Day Risk Trend Area Chart (6 cols) */}
        <div className="lg:col-span-6 bg-surface rounded-2xl border border-jkn-border p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-jkn-text">Critical & High Claim Detection Trend (7 Days)</h3>
            <span className="text-[11px] text-jkn-dim font-medium">Unit: Detected Cases</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={kpis.risk_trends}>
                <defs>
                  <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D92D20" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#D92D20" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F79009" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#F79009" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#8A9E96" fontSize={11} tickLine={false} />
                <YAxis stroke="#8A9E96" fontSize={11} tickLine={false} />
                <Tooltip
                  formatter={(val: number) => [`${formatNumber(val)} claims`, ""]}
                  contentStyle={{ backgroundColor: "#FFFFFF", borderRadius: "12px", border: "1px solid #DDE7E2", fontSize: "12px" }}
                />
                <Area type="monotone" dataKey="critical_count" name="Critical" stroke="#D92D20" strokeWidth={2} fillOpacity={1} fill="url(#colorCritical)" />
                <Area type="monotone" dataKey="high_count" name="High" stroke="#F79009" strokeWidth={2} fillOpacity={1} fill="url(#colorHigh)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Distribution Donut (3 cols) */}
        <div className="lg:col-span-3 bg-surface rounded-2xl border border-jkn-border p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-jkn-text">Risk Tier Distribution</h3>
            <p className="text-[10px] text-jkn-muted mt-0.5">Proportion across all 1.28M claims</p>
          </div>
          <div className="h-40 w-full relative flex items-center justify-center my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {distributionChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: number) => [formatNumber(val), "Claims"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-risk-critical" /><span>Critical (1,247)</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-risk-high" /><span>High (8,934)</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-risk-medium" /><span>Medium (37,100)</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-risk-low" /><span>Normal (1.23M)</span></div>
          </div>
        </div>

        {/* Top Risk Providers List (3 cols) */}
        <div className="lg:col-span-3 bg-surface rounded-2xl border border-jkn-border p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-jkn-text">Priority Providers</h3>
              <Link href="/providers" className="text-[11px] font-semibold text-bpjs hover:underline">
                View All
              </Link>
            </div>
            <p className="text-[10px] text-jkn-muted mt-0.5">Healthcare facilities with highest anomaly score</p>
          </div>

          <div className="space-y-2 mt-3 flex-1">
            {top_providers.slice(0, 3).map((p) => (
              <Link
                key={p.provider_id}
                href={`/providers/${p.provider_id}`}
                className="block p-2.5 rounded-xl border border-jkn-border hover:border-bpjs hover:bg-bpjs-soft/30 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-jkn-text truncate max-w-[130px]">{p.name}</span>
                  <RiskPill score={p.risk_score} level={p.risk_level} size="sm" />
                </div>
                <div className="flex items-center justify-between text-[10px] text-jkn-dim mt-1">
                  <span>{p.city}</span>
                  <span className="font-bold text-risk-critical">{formatRupiah(p.potential_exposure, true)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
