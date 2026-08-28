"use client";

import React, { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { IndonesiaRiskMap } from "@/components/map/IndonesiaRiskMap";
import { NetworkGraphView } from "@/components/network/NetworkGraphView";
import { RiskPill } from "@/components/ui/RiskPill";
import { PageLoader } from "@/components/ui/PageLoader";
import { ProvinceRiskData, EmergingSignal } from "@/types/risk";
import { formatRupiah, formatNumber } from "@/lib/formatting/currency";
import { formatRelativeTime } from "@/lib/formatting/date";
import {
  Network,
  MapPin,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Layers,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

export default function RiskIntelligencePage() {
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "MAP" | "GRAPH" | "PATTERNS" | "TRENDS">("OVERVIEW");
  const [provinceData, setProvinceData] = useState<ProvinceRiskData[]>([]);
  const [signals, setSignals] = useState<EmergingSignal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((data) => {
        setProvinceData(data.province_risk || []);
        setSignals(data.emerging_signals || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <DashboardShell>
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-black text-jkn-text tracking-tight">National Risk Intelligence</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-bpjs-light text-bpjs-dark text-xs font-bold border border-bpjs-border">
              Systemic & Clusters
            </span>
          </div>
          <p className="text-xs text-jkn-muted mt-1">
            Visualization of hidden fraud syndicates, geographic hotspot clusters, and cross-entity correlation analysis
          </p>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-jkn-border pb-1 overflow-x-auto">
        {[
          { id: "OVERVIEW", label: "Intelligence Overview" },
          { id: "MAP", label: "Geospatial Risk Map (34 Provinces)" },
          { id: "GRAPH", label: "Entity Relation Graph (Network Graph)" },
          { id: "PATTERNS", label: "Anomaly Pattern Clusters" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 border ${
              activeTab === tab.id
                ? "bg-bpjs-soft text-bpjs-dark border-bpjs-border shadow-2xs font-bold"
                : "bg-surface text-jkn-muted border-transparent hover:bg-surface-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {loading ? (
        <PageLoader label="Loading risk intelligence telemetry..." />
      ) : activeTab === "OVERVIEW" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8">
              <IndonesiaRiskMap provinceData={provinceData} />
            </div>
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-surface rounded-2xl border border-jkn-border p-4 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-jkn-text uppercase tracking-wider">
                  Identified Critical Clusters
                </h3>
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-risk-critical-bg border border-risk-critical-border text-xs space-y-1">
                    <div className="flex justify-between font-bold text-risk-critical">
                      <span>Cluster #42: Digestive Surgery Upcoding</span>
                      <span>CRITICAL</span>
                    </div>
                    <p className="text-[11px] text-jkn-muted">Involving 7 hospitals across Greater Jakarta & Bandung billing code 44.95 without OR logs.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1">
                    <div className="flex justify-between font-bold text-amber-800">
                      <span>Cluster #38: CPPT Template Duplication</span>
                      <span>HIGH</span>
                    </div>
                    <p className="text-[11px] text-jkn-muted">96.4% semantic overlap in inpatient discharge summaries across different patients.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <NetworkGraphView />
        </div>
      ) : activeTab === "MAP" ? (
        <div className="space-y-4">
          <IndonesiaRiskMap provinceData={provinceData} className="min-h-[500px]" />
        </div>
      ) : activeTab === "GRAPH" ? (
        <div className="space-y-4">
          <NetworkGraphView className="min-h-[550px]" />
        </div>
      ) : (
        /* PATTERNS TAB */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {signals.map((sig) => (
            <div key={sig.signal_id} className="bg-surface rounded-2xl border border-jkn-border p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <RiskPill type={sig.risk_type} size="sm" />
                <span className="text-xs font-bold text-risk-critical">{formatRupiah(sig.potential_exposure, true)}</span>
              </div>
              <h3 className="text-sm font-bold text-jkn-text">{sig.title}</h3>
              <p className="text-xs text-jkn-muted leading-relaxed">{sig.description}</p>
              <div className="pt-2 border-t border-jkn-divider flex items-center justify-between text-xs">
                <span className="text-jkn-dim">{sig.affected_providers_count} Providers Involved</span>
                <span className="font-bold text-bpjs-dark bg-bpjs-light px-2 py-0.5 rounded-full text-[10px]">
                  {(sig.confidence * 100).toFixed(0)}% AI Confidence
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
