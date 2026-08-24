"use client";

import React, { useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import {
  Settings,
  ShieldCheck,
  Sliders,
  Sparkles,
  History,
  Save,
  CheckCircle2,
  Lock,
} from "lucide-react";

export default function SettingsPage() {
  const [upcodingThreshold, setUpcodingThreshold] = useState(75);
  const [cloningThreshold, setCloningThreshold] = useState(88);
  const [phantomSensitivity, setPhantomSensitivity] = useState("HIGH");
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const auditLogs = [
    {
      id: "LOG-9921",
      action: "STATUS_CHANGE",
      description: "Investigation status of INV-2026-010293 changed to CONFIRMED_RISK by Aril Indra Permana",
      time: "Aug 23, 2026, 08:35 WIB",
      ip: "10.24.18.92",
    },
    {
      id: "LOG-9920",
      action: "AI_REASONING_RUN",
      description: "AI Intelligence Engine executed clinical grounded reasoning audit on claim CLM-10293",
      time: "Aug 23, 2026, 08:30 WIB",
      ip: "10.24.18.92",
    },
    {
      id: "LOG-9918",
      action: "DATASET_NORMALIZATION",
      description: "Dataset Claims_JKN_August_2026_National.csv (1,284,392 rows) successfully normalized into canonical format",
      time: "Aug 23, 2026, 02:30 WIB",
      ip: "10.24.18.11",
    },
  ];

  return (
    <DashboardShell>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-jkn-border pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-black text-jkn-text tracking-tight">System Settings & Audit Trail (Governance)</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-bpjs-light text-bpjs-dark text-xs font-bold border border-bpjs-border">
              AI Governance
            </span>
          </div>
          <p className="text-xs text-jkn-muted mt-1">
            Configure detector sensitivity thresholds and inspect the immutable, append-only system audit log
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Risk Thresholds Form (6 cols) */}
        <div className="lg:col-span-6 bg-surface rounded-2xl border border-jkn-border p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-jkn-divider">
            <Sliders className="w-4 h-4 text-bpjs" />
            <h3 className="text-xs font-bold text-jkn-text uppercase tracking-wider">
              Detector Sensitivity Thresholds (Risk Engine)
            </h3>
          </div>

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <div className="flex justify-between font-semibold text-jkn-text">
                <span>Upcoding Tariff Deviation Threshold:</span>
                <span className="font-bold text-bpjs-dark">{upcodingThreshold}% Deviation</span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                value={upcodingThreshold}
                onChange={(e) => setUpcodingThreshold(Number(e.target.value))}
                className="w-full accent-bpjs cursor-pointer"
              />
              <p className="text-[10px] text-jkn-dim">
                Claims exceeding {upcodingThreshold}% tariff deviation from peer INA-CBG median are automatically flagged as critical.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between font-semibold text-jkn-text">
                <span>Cloning Similarity Threshold (Cosine Metric):</span>
                <span className="font-bold text-intel">{cloningThreshold}% Match</span>
              </div>
              <input
                type="range"
                min="70"
                max="99"
                value={cloningThreshold}
                onChange={(e) => setCloningThreshold(Number(e.target.value))}
                className="w-full accent-intel cursor-pointer"
              />
              <p className="text-[10px] text-jkn-dim">
                Semantic narrative duplicates above {cloningThreshold}% similarity are routed to the narrative cloning review queue.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-jkn-text block">Phantom Billing Sensitivity Mode:</label>
              <select
                value={phantomSensitivity}
                onChange={(e) => setPhantomSensitivity(e.target.value)}
                className="w-full p-2 rounded-xl bg-surface-secondary border border-jkn-border text-jkn-text outline-hidden"
              >
                <option value="HIGH">High (Immediate flag on unverified procedure codes)</option>
                <option value="MEDIUM">Medium (1-day grace period for EMR synchronization)</option>
                <option value="LOW">Low (Surgical & ICU package validation only)</option>
              </select>
            </div>

            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-bpjs text-white text-xs font-bold hover:bg-bpjs-deep transition-all shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>{savedSuccess ? "Configuration Saved!" : "Save Engine Parameters"}</span>
            </button>
          </form>
        </div>

        {/* Audit Trail Log (6 cols) */}
        <div className="lg:col-span-6 bg-surface rounded-2xl border border-jkn-border p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-jkn-divider">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-bpjs" />
              <h3 className="text-xs font-bold text-jkn-text uppercase tracking-wider">
                Immutable System Audit Trail
              </h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-surface-secondary text-jkn-dim font-mono flex items-center gap-1">
              <Lock className="w-3 h-3 text-bpjs" /> Append-Only
            </span>
          </div>

          <div className="divide-y divide-jkn-divider text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-bpjs-dark font-mono text-[11px]">{log.id}</span>
                  <span className="text-[10px] text-jkn-dim">{log.time}</span>
                </div>
                <p className="text-jkn-text text-[11px] leading-relaxed">{log.description}</p>
                <span className="text-[10px] text-jkn-dim block">Client IP: {log.ip}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
