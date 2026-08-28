"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ArrowRight,
  ShieldAlert,
  FileCheck2,
  Lock,
  CheckCircle2,
  ChevronRight,
  Play,
  RotateCcw,
  AlertTriangle,
  Network as NetworkIcon,
  Map as MapIcon,
  SlidersHorizontal,
  ChevronDown,
  FileSearch,
  Clock,
} from "lucide-react";
import { formatRupiah, formatNumber } from "@/lib/formatting/currency";
import { RiskPill } from "@/components/ui/RiskPill";
import { IndonesiaRiskMap } from "@/components/map/IndonesiaRiskMap";
import { ProvinceRiskData } from "@/types/risk";
import { INDONESIA_PROVINCES } from "@/lib/data/indonesia-provinces";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// Shared easing for every deliberate motion on this page — one considered
// curve used consistently, rather than default linear/ease transitions.
const EASE = [0.16, 1, 0.3, 1] as const;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-bold text-bpjs-dark tracking-widest uppercase">
        {children}
      </span>
      <span className="flex-1 h-px bg-jkn-border" />
    </div>
  );
}

// A single restrained fade-up used once per section (not per element) so
// the page feels alive on scroll without turning into a motion showcase.
function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

export default function LandingPage() {
  // --- Smooth Shrinking Header on Scroll ---
  const [isScrolled, setIsScrolled] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // --- Live Interactive Detector Simulator State ---
  const [selectedCaseId, setSelectedCaseId] = useState<"CLM-10293" | "CLM-09283" | "CLM-08741">("CLM-10293");
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // --- FAQ Accordion State ---
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // --- Province Risk Data for Embedded Map ---
  const [provinces, setProvinces] = useState<ProvinceRiskData[]>([]);

  useEffect(() => {
    const provList: ProvinceRiskData[] = INDONESIA_PROVINCES.map((p, idx) => {
      const isCritical = ["ID-JK", "ID-JB", "ID-JI", "ID-SU"].includes(p.code);
      const isHigh = ["ID-JT", "ID-SN", "ID-BA", "ID-RI", "ID-SS"].includes(p.code);
      const isMedium = idx % 2 === 0;

      const risk_level = isCritical ? "CRITICAL" : isHigh ? "HIGH" : isMedium ? "MEDIUM" : "LOW";
      // Deterministic per-province variance so same-tier provinces don't show identical figures.
      const variance = 0.72 + ((idx * 37) % 60) / 100;
      const baseClaims = isCritical ? 142 : isHigh ? 68 : isMedium ? 28 : 8;
      const baseExposure = isCritical ? 148500000000 : isHigh ? 42000000000 : 12500000000;
      const high_risk_claims = Math.round(baseClaims * variance);
      const potential_exposure = Math.round(baseExposure * variance);
      const dominant = isCritical
        ? (idx % 2 === 0 ? "UPCODING" : "PHANTOM_BILLING")
        : isHigh
        ? "CLONING"
        : "ABNORMAL_LOS";

      return {
        province_code: p.code,
        province_name: p.name,
        island_group: p.island,
        latitude: p.lat,
        longitude: p.lng,
        total_claims: high_risk_claims * 85,
        high_risk_claims,
        potential_exposure,
        risk_level,
        dominant_risk_type: dominant as any,
        top_providers: isCritical ? ["RS Sehat Sentosa", "RS Medika Utama", "RS Mitra Husada"] : ["RSUD Regional Hospital"],
      };
    });
    setProvinces(provList);
  }, []);

  const casesData = {
    "CLM-10293": {
      id: "CLM-10293",
      sep: "0045R0010826V0010293",
      provider: "RS Sehat Sentosa (Class B)",
      patient: "Bambang Sudibyo (48 yo)",
      dpjp: "dr. Hendra Prasetyo, Sp.OT",
      claimed: 18450000,
      standard: 3800000,
      exposure: 14650000,
      findings: [
        { detector: "Upcoding Severity 3", detail: "Severity Level 3 invoiced for Gastroenteritis A09 without documented hypovolemic shock or metabolic complications.", delta: "+Rp 14,650,000", risk: "CRITICAL" as const },
        { detector: "Phantom Procedure 44.95", detail: "Laparoscopic surgery billed without supporting operating room logs or anesthesia record sheets.", delta: "+Rp 12,500,000", risk: "CRITICAL" as const },
        { detector: "Semantic Text Match (96%)", detail: "Progress note narrative exhibits 96.4% semantic overlap with claim CLM-09283.", delta: "Cluster #42", risk: "HIGH" as const },
      ],
      docMismatch: "Clinical Discharge Summary (DOC-01) notes: 'Patient admitted for 2 days of supportive IV hydration, nausea subsided'. No surgical intervention performed.",
    },
    "CLM-09283": {
      id: "CLM-09283",
      sep: "0045R0010826V0009283",
      provider: "RS Sehat Sentosa (Class B)",
      patient: "Eko Nugroho (52 yo)",
      dpjp: "dr. Hendra Prasetyo, Sp.OT",
      claimed: 16800000,
      standard: 4200000,
      exposure: 12600000,
      findings: [
        { detector: "Semantic Cloning 96.4%", detail: "Discharge summary narrative is 96.4% identical to CLM-10293 (only name and date swapped).", delta: "Text Duplication", risk: "CRITICAL" as const },
        { detector: "Phantom Billing Check", detail: "Digestive surgery package billing unverified in hospital surgical equipment logs.", delta: "+Rp 12,500,000", risk: "CRITICAL" as const },
      ],
      docMismatch: "Nursing Care Notes (DOC-03) show patient resided in general ward Melati 3 for the entire claim duration.",
    },
    "CLM-08741": {
      id: "CLM-08741",
      sep: "0022R0010826V0008741",
      provider: "RS Medika Utama (Class B)",
      patient: "Siti Aminah (39 yo)",
      dpjp: "dr. Setiawan Santoso, Sp.PD",
      claimed: 14200000,
      standard: 6400000,
      exposure: 7800000,
      findings: [
        { detector: "Abnormal LOS (6 Days vs 2.2 Days)", detail: "Length of stay of 6 days significantly exceeds national peer median (2.2 days) for uncomplicated pneumonia.", delta: "+3.8 Days Deviation", risk: "HIGH" as const },
        { detector: "Medication Cross-Check", detail: "IV antibiotic course completed on Day 2; no clinical rationale found for continued inpatient retention.", delta: "+Rp 7,800,000", risk: "HIGH" as const },
      ],
      docMismatch: "Daily progress notes on Days 3-6 record patient as stable, afebrile, and symptom-free.",
    },
  };

  const handleRunScan = () => {
    setIsScanning(true);
    setTimeout(() => setIsScanning(false), 1100);
  };

  // --- Interactive RoI Recovery Calculator State ---
  const [claimVolume, setClaimVolume] = useState<number>(450000);
  const [avgClaimAmount, setAvgClaimAmount] = useState<number>(8500000);
  const [anomalyRate, setAnomalyRate] = useState<number>(4.8);

  const totalExposureYearly = (claimVolume * 12 * avgClaimAmount * (anomalyRate / 100));
  const estimatedRecoveryYearly = totalExposureYearly * 0.88;
  const auditHoursSaved = Math.round((claimVolume * 12 * 0.15) / 60);

  // --- Interactive Forensic Query Console State ---
  const [activeConsoleQuery, setActiveConsoleQuery] = useState<number>(0);
  const consoleQueries = [
    {
      command: "SCAN --rule 'UPCODING_SEV3' --icd10 'A09' --threshold 0.85",
      result: `[+] Scanning 124,892 active inpatient claims in stream...
[!] DETECTED 14 claims with Severity Level 3 lacking shock/complication biomarkers.
[!] Target: RS Sehat Sentosa (CLM-10293) | Discrepancy: +Rp 14,650,000
[+] Evidence Cross-Check: DOC-01 Discharge Summary | Score: 94/100 (CRITICAL)`,
    },
    {
      command: "MATCH --vector-cosine --threshold 0.90 --cluster 'CLUSTER-42'",
      result: `[+] Running pgvector cosine distance across 48,200 CPPT narratives...
[!] High Similarity Cluster #42 Identified (12 Connected Claims).
[!] CLM-10293 <--> CLM-09283 Cosine Similarity Match: 96.42%
[!] Identified Attending Physician: dr. Hendra Prasetyo, Sp.OT | Action: Multi-Claim Audit Assigned`,
    },
    {
      command: "VERIFY --phantom --procedure '44.95' --require-doc 'IBS_LOG'",
      result: `[+] Verifying surgical operating room log & anesthesia schedule...
[!] MISSING: No electronic OR entry found for SEP 0045R0010826V0010293.
[!] Invoiced Amount: Rp 12,500,000 | Verified Status: UNPROVEN_PROCEDURE
[+] Auditor Recommendation: DISALLOW_BILLING (Confidence: 99.1%)`,
    },
  ];

  const urgentAlertsList = [
    {
      id: "N1",
      time: "Just now",
      title: "Critical Upcoding Flagged",
      description: "Claim CLM-10293 billed Severity Level 3 for Gastroenteritis without shock indicators.",
      exposure: "+Rp 14,650,000",
      badge: "CRITICAL",
      icon: ShieldAlert,
      style: "bg-risk-critical-bg text-risk-critical border-risk-critical-border",
    },
    {
      id: "N2",
      time: "2m ago",
      title: "Syndicate Pattern Identified",
      description: "Cluster #42: 96.4% duplicate CPPT clinical narrative matched across 12 claims.",
      exposure: "Cluster Match",
      badge: "HIGH RISK",
      icon: NetworkIcon,
      style: "bg-intel-light text-intel-deep border-intel-light",
    },
    {
      id: "N3",
      time: "5m ago",
      title: "Phantom Procedure Pre-empted",
      description: "Unverified laparoscopic surgical package 44.95 missing operating room logs.",
      exposure: "+Rp 12,500,000",
      badge: "PREVENTED",
      icon: Lock,
      style: "bg-bpjs-light text-bpjs-dark border-bpjs-border",
    },
    {
      id: "N4",
      time: "8m ago",
      title: "Abnormal Length of Stay (LOS)",
      description: "Pneumonia stay of 6 days significantly exceeds national peer median of 2.2 days.",
      exposure: "+3.8 Days Dev",
      badge: "AUDIT REQ",
      icon: Clock,
      style: "bg-risk-medium-bg text-amber-800 border-risk-medium-border",
    },
    {
      id: "N5",
      time: "12m ago",
      title: "National Telemetry Ingested",
      description: "1,284,392 claims parsed with 100% deterministic validation & UU PDP masking.",
      exposure: "100% Census",
      badge: "VERIFIED",
      icon: CheckCircle2,
      style: "bg-bpjs-light text-bpjs-dark border-bpjs-border",
    },
  ];

  const faqs = [
    {
      q: "How does the platform guarantee zero hallucination in medical claim audits?",
      a: "The platform is deterministic-first and evidence-grounded. Before any AI model evaluates a claim, deterministic clinical rules and vector fact-matching verify the record. Every AI inference must cite the specific documents it relied on (DOC-01 Discharge Summary, DOC-02 Itemized Billing, DOC-IBS Operating Log) so an auditor can independently check the claim.",
    },
    {
      q: "Does the system comply with Personal Data Protection regulations (UU PDP No. 27/2022)?",
      a: "Yes. National ID (NIK), BPJS card number, and full address are anonymized and masked at ingestion. Processing stays within private BPJS gateways — raw electronic medical records are never sent to a third-party public LLM endpoint.",
    },
    {
      q: "How does the platform handle varied hospital Electronic Health Record (SIMRS) schemas?",
      a: "A two-column schema mapping engine parses CSV, JSON, or API payloads and maps unstandardized hospital fields to canonical INA-CBG schemas at roughly 96% accuracy, with a human reviewing and confirming every mapping before it's used.",
    },
    {
      q: "Are audit determinations made autonomously, or by human investigators?",
      a: "Every final decision — confirm risk, request evidence, or mark false positive — stays with a human auditor. AI accelerates the investigation, cutting the cycle from 4–6 weeks down to minutes, but it never closes a case on its own.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-jkn-text font-sans selection:bg-bpjs/20 selection:text-bpjs-dark">
      {/* --- TOP UTILITY STRIP + NAV: attached to the edge (not a floating pill), --- */}
      {/* --- but the bar itself still smoothly shrinks on scroll like before.   --- */}
      <header
        className={cn(
          "sticky top-0 z-50 bg-surface/95 backdrop-blur-sm border-b border-jkn-border transition-shadow duration-300",
          isScrolled && "shadow-sm"
        )}
      >
        <div
          className={cn(
            "hidden md:flex items-center justify-center gap-2 px-4 text-[10.5px] font-semibold text-jkn-muted bg-surface-secondary border-b border-jkn-divider overflow-hidden transition-all duration-300 ease-out",
            isScrolled ? "max-h-0 py-0 opacity-0" : "max-h-8 py-1.5 opacity-100"
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-bpjs animate-pulse shrink-0" />
          <span>BPJS Kesehatan · Direktorat Kepatuhan &amp; Manajemen Risiko</span>
          <span className="text-jkn-dim">—</span>
          <span>National Claim Risk Intelligence Platform</span>
        </div>

        <nav
          className={cn(
            "max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between transition-all duration-300 ease-out",
            isScrolled ? "h-12" : "h-16"
          )}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                "rounded-xl bg-white border border-jkn-border flex items-center justify-center p-1 shrink-0 overflow-hidden transition-all duration-300",
                isScrolled ? "w-7 h-7" : "w-9 h-9"
              )}
            >
              <img src="/arsa_logo.png" alt="ARSA JKN" className="w-full h-full object-contain" />
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "font-black tracking-tight text-jkn-text whitespace-nowrap transition-all duration-300",
                  isScrolled ? "text-xs" : "text-sm"
                )}
              >
                JKN RISK
              </span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full bg-bpjs-light text-bpjs-dark border border-bpjs-border font-extrabold uppercase tracking-wider whitespace-nowrap transition-all duration-300 overflow-hidden",
                  isScrolled ? "max-w-0 px-0 opacity-0 border-0" : "max-w-[160px] text-[9px] opacity-100"
                )}
              >
                Intelligence Suite
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center justify-center gap-6 text-xs font-semibold text-jkn-muted">
            <a href="#capabilities" className="hover:text-bpjs-dark transition-colors">Capabilities</a>
            <a href="#live-simulator" className="hover:text-bpjs-dark transition-colors">Detector</a>
            <a href="#comparison" className="hover:text-bpjs-dark transition-colors">Sampling vs. Census</a>
            <a href="#roi-calculator" className="hover:text-bpjs-dark transition-colors">Recovery ROI</a>
            <a href="#query-console" className="hover:text-bpjs-dark transition-colors">Console</a>
            <a href="#compliance" className="hover:text-bpjs-dark transition-colors">Compliance</a>
          </div>

          <Link
            href="/"
            className={cn(
              "flex items-center gap-1.5 rounded-lg bg-bpjs text-white font-bold hover:bg-bpjs-deep active:scale-[0.97] transition-all duration-300 shadow-sm whitespace-nowrap",
              isScrolled ? "text-[11px] px-3 py-1.5" : "text-xs px-4 py-2"
            )}
          >
            <span>Open Command Center</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </nav>
      </header>

      {/* --- HERO SECTION --- */}
      <section className="pt-14 pb-16 px-4 sm:px-6 max-w-7xl mx-auto">
        <motion.div
          className="relative overflow-hidden rounded-3xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: EASE }}
        >
          {/* Jakarta skyline (BNI 46 tower) — photo by Gints Gailis on Unsplash,
              grayscaled + green duotone overlay so it reads as institutional
              atmosphere rather than a stock-photo cliché. */}
          <img
            src="https://images.unsplash.com/photo-1562367072-fea5c7eb8748?q=80&w=2000&auto=format&fit=crop"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover object-[70%_30%] grayscale scale-105 blur-[1px]"
          />
          <div className="absolute inset-0 bg-bpjs-dark/80 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-t from-bpjs-dark via-bpjs-dark/75 to-bpjs-dark/40" />

          <div className="relative z-10 p-8 sm:p-14 md:p-16 max-w-3xl space-y-5">
            <span className="text-[11px] font-bold text-emerald-300 tracking-widest uppercase">
              Claim Risk Intelligence for JKN
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-[1.08]">
              Audit every claim the fund pays —{" "}
              <span className="text-emerald-300">not just a sample.</span>
            </h1>
            <p className="text-base sm:text-lg text-white/75 max-w-2xl leading-relaxed">
              Deterministic fraud detectors and semantic clinical matching run across 100% of
              submitted claims. Every flag comes with an evidence-grounded dossier an auditor can
              verify — not a black-box score.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href="/"
                className="px-6 py-3.5 rounded-xl bg-bpjs text-white font-bold text-sm shadow-sm hover:bg-bpjs-deep active:scale-[0.97] transition-all flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Open Command Center</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/investigations/INV-2026-10293"
                className="px-6 py-3.5 rounded-xl bg-white/10 text-white font-bold text-sm border border-white/25 hover:bg-white/15 active:scale-[0.97] transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
              >
                <FileSearch className="w-4 h-4 text-emerald-300" />
                <span>Inspect a Case Dossier</span>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Hero visual: real risk map (not decoration) + live signal feed */}
        <motion.div
          className="pt-10 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: EASE, delay: 0.15 }}
        >
          <div className="lg:col-span-7">
            <IndonesiaRiskMap provinceData={provinces} onSelectProvince={() => {}} />
          </div>

          <div className="lg:col-span-5 rounded-2xl bg-surface border border-jkn-border shadow-subtle hover:shadow-card transition-shadow duration-300 p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between pb-3 border-b border-jkn-divider">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-bpjs animate-pulse" />
                <span className="text-xs font-bold text-jkn-text">Priority Signals</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-secondary text-jkn-muted border border-jkn-border">
                Auto-Triaged
              </span>
            </div>

            <div className="space-y-2 py-3 flex-1 overflow-hidden">
              {urgentAlertsList.slice(0, 4).map((item) => {
                const IconComp = item.icon;
                return (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-surface-subtle border border-jkn-border flex items-center gap-3 text-left"
                  >
                    <div className={cn("p-2 rounded-lg border shrink-0", item.style)}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-jkn-text truncate">{item.title}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-surface border border-jkn-border text-jkn-dim shrink-0">
                          {item.time}
                        </span>
                      </div>
                      <p className="text-[11px] text-jkn-muted truncate mt-0.5">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-jkn-divider flex items-center justify-between text-[11px] text-jkn-muted">
              <span>100% grounded in evidence · UU PDP compliant</span>
              <Link href="/claims" className="text-bpjs-dark font-bold hover:underline flex items-center gap-1">
                <span>View All Claims</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* --- STATS ROW --- */}
      <section className="py-10 border-b border-jkn-border bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-stretch divide-y sm:divide-y-0 sm:divide-x divide-jkn-divider text-center">
          <div className="flex-1 py-4 sm:py-0 sm:px-6">
            <div className="text-3xl font-black text-jkn-text font-mono"><NumberTicker value={1284392} /></div>
            <div className="text-[11px] text-jkn-muted font-bold mt-1 uppercase tracking-wider">Claims Ingested (Census)</div>
          </div>
          <div className="flex-1 py-4 sm:py-0 sm:px-6">
            <div className="text-3xl font-black text-bpjs-dark font-mono">Rp <NumberTicker value={824} /> B</div>
            <div className="text-[11px] text-jkn-muted font-bold mt-1 uppercase tracking-wider">Exposure Identified</div>
          </div>
          <div className="flex-1 py-4 sm:py-0 sm:px-6">
            <div className="text-3xl font-black text-jkn-text font-mono"><NumberTicker value={96} />.4%</div>
            <div className="text-[11px] text-jkn-muted font-bold mt-1 uppercase tracking-wider">Vector Semantic Match</div>
          </div>
          <div className="flex-1 py-4 sm:py-0 sm:px-6">
            <div className="text-3xl font-black text-bpjs-dark font-mono">&lt; <NumberTicker value={2} /> Min</div>
            <div className="text-[11px] text-jkn-muted font-bold mt-1 uppercase tracking-wider">Audit Investigation Speed</div>
          </div>
        </div>
      </section>

      {/* --- CORE CAPABILITIES --- */}
      <section id="capabilities" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto space-y-8">
        <Reveal className="max-w-2xl space-y-3">
          <SectionLabel>Core Capabilities</SectionLabel>
          <h2 className="text-3xl sm:text-4xl font-bold text-jkn-text tracking-tight">
            From raw hospital exports to court-admissible dossiers
          </h2>
        </Reveal>

        <Reveal className="grid grid-cols-1 md:grid-cols-12 gap-5" delay={0.08}>
          {/* Card 1: Top Provinces by Exposure (the full map already lives in the hero) */}
          <div className="md:col-span-7 rounded-2xl bg-surface border border-jkn-border shadow-subtle hover:shadow-card transition-shadow duration-300 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-bpjs-light text-bpjs-dark border border-bpjs-border">
                  <MapIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-jkn-text">Top Provinces by Risk Exposure</h3>
                  <p className="text-xs text-jkn-muted">Ranked from the same 34-province radar shown above</p>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              {[...provinces]
                .sort((a, b) => b.potential_exposure - a.potential_exposure)
                .slice(0, 5)
                .map((p) => (
                  <div
                    key={p.province_code}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-surface-subtle border border-jkn-border text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <RiskPill level={p.risk_level} size="sm" showIcon={false} />
                      <span className="font-bold text-jkn-text truncate">{p.province_name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-jkn-muted">
                      <span>{formatNumber(p.high_risk_claims)} claims</span>
                      <span className="font-mono font-bold text-risk-critical">
                        {formatRupiah(p.potential_exposure, true)}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
            <div className="flex items-center justify-between text-xs text-jkn-muted pt-2 border-t border-jkn-divider">
              <span>DKI Jakarta, West Java &amp; East Java show the highest severity-3 concentration.</span>
              <Link href="/" className="text-bpjs-dark font-bold hover:underline flex items-center gap-1 shrink-0 ml-3">
                <span>View Full Map</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Card 2: Syndicate Relation Graph */}
          <div className="md:col-span-5 rounded-2xl bg-surface border border-jkn-border shadow-subtle hover:shadow-card transition-shadow duration-300 p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-intel-light text-intel-deep border border-intel-light">
                <NetworkIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-jkn-text">Syndicate Relation Graph</h3>
                <p className="text-xs text-jkn-muted">Cross-hospital doctor &amp; duplicate-narrative graph</p>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <div className="p-3 rounded-lg bg-surface-subtle border border-jkn-border text-xs flex items-start gap-3">
                <span className="px-2 py-0.5 rounded bg-intel-light text-intel-deep font-bold text-[10px] shrink-0">
                  CLUSTER #42
                </span>
                <p className="text-jkn-muted text-[11px]">
                  <span className="font-bold text-jkn-text">dr. Hendra Prasetyo, Sp.OT</span> attends both CLM-10293
                  and CLM-09283 — narratives are 96.4% identical.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-surface-subtle border border-jkn-border text-xs flex items-start gap-3">
                <span className="px-2 py-0.5 rounded bg-risk-critical text-white font-bold text-[10px] shrink-0">
                  PHANTOM
                </span>
                <p className="text-jkn-muted text-[11px]">
                  Procedure <span className="font-bold text-jkn-text">44.95</span> is billed across 2 linked claims
                  with no matching operating room log.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-surface-subtle border border-jkn-border text-xs flex items-start gap-3">
                <span className="px-2 py-0.5 rounded bg-bpjs-light text-bpjs-dark font-bold text-[10px] shrink-0">
                  RS SEHAT SENTOSA
                </span>
                <p className="text-jkn-muted text-[11px]">
                  3 linked claims from one facility, Rp 39.75M combined exposure under review.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-jkn-muted pt-2 border-t border-jkn-divider">
              <span>Surfaces repeat-physician patterns and multi-claim cloning.</span>
              <Link href="/risk-intelligence" className="text-bpjs-dark font-bold hover:underline flex items-center gap-1 shrink-0 ml-3">
                <span>Inspect Graph</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Card 3: Evidence Board */}
          <div className="md:col-span-6 rounded-2xl bg-surface border border-jkn-border shadow-subtle hover:shadow-card transition-shadow duration-300 p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-risk-critical-bg text-risk-critical border border-risk-critical-border">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-jkn-text">Explainable Digital Evidence Board</h3>
                <p className="text-xs text-jkn-muted">Every AI assertion mapped against a digital EMR citation</p>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <div className="p-3 rounded-lg bg-surface-subtle border border-jkn-border text-xs flex items-start gap-3">
                <span className="px-2 py-0.5 rounded bg-risk-critical text-white font-bold text-[10px] shrink-0">
                  CONTRADICTS
                </span>
                <div>
                  <span className="font-bold text-jkn-text">DOC-01 Medical Discharge Summary:</span>
                  <p className="text-jkn-muted text-[11px] mt-0.5">
                    "Patient in good condition, mild dehydration, oral therapy adequate." Contradicts the billed Severity Level 3 tariff (+Rp 14.65M).
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-surface-subtle border border-jkn-border text-xs flex items-start gap-3">
                <span className="px-2 py-0.5 rounded bg-risk-critical text-white font-bold text-[10px] shrink-0">
                  MISSING
                </span>
                <div>
                  <span className="font-bold text-jkn-text">Operating Room Log (44.95):</span>
                  <p className="text-jkn-muted text-[11px] mt-0.5">
                    No record of surgical suite scheduling or anesthesia log for the claimed laparoscopic procedure.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Ingestion Engine */}
          <div className="md:col-span-6 rounded-2xl bg-surface border border-jkn-border shadow-subtle hover:shadow-card transition-shadow duration-300 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-risk-medium-bg text-amber-800 border border-risk-medium-border">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-jkn-text">Source-Agnostic Ingestion Engine</h3>
                  <p className="text-xs text-jkn-muted">Auto-aligns hospital EHR exports at ~96% confidence</p>
                </div>
              </div>
              <Link href="/data-management" className="text-xs text-bpjs-dark font-bold hover:underline shrink-0">
                Upload CSV →
              </Link>
            </div>

            <div className="space-y-2 pt-1 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-surface-subtle border border-jkn-border flex items-center justify-between">
                <span className="text-jkn-muted">NO_KLAIM (SIMRS)</span>
                <span className="text-bpjs-dark font-bold">→ claim_id (98%)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-subtle border border-jkn-border flex items-center justify-between">
                <span className="text-jkn-muted">DIAGNOSIS_ICD (EHR)</span>
                <span className="text-bpjs-dark font-bold">→ primary_diagnosis (95%)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-subtle border border-jkn-border flex items-center justify-between">
                <span className="text-jkn-muted">BIAYA_TAGIHAN (Invoice)</span>
                <span className="text-bpjs-dark font-bold">→ claim_amount (96%)</span>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* --- LIVE ANOMALY DETECTOR SIMULATOR --- */}
      <section id="live-simulator" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto space-y-8">
        <Reveal className="max-w-2xl space-y-3">
          <SectionLabel>Interactive Sandbox</SectionLabel>
          <h2 className="text-3xl sm:text-4xl font-bold text-jkn-text tracking-tight">
            See a flagged claim get investigated
          </h2>
          <p className="text-sm text-jkn-muted">
            Pick a synthetic claim below and run the same multi-detector check the platform runs on every submission.
          </p>
        </Reveal>

        <div className="flex flex-wrap gap-2.5">
          {(["CLM-10293", "CLM-09283", "CLM-08741"] as const).map((id) => (
            <button
              key={id}
              onClick={() => setSelectedCaseId(id)}
              className={cn(
                "px-4 py-2.5 rounded-xl border text-xs font-bold transition-all active:scale-[0.97] flex items-center gap-2",
                selectedCaseId === id
                  ? "bg-bpjs-soft border-bpjs text-bpjs-dark ring-1 ring-bpjs/30"
                  : "bg-surface border-jkn-border text-jkn-muted hover:border-bpjs/40 hover:text-jkn-text"
              )}
            >
              <span className="font-mono">{id}</span>
              <span className="text-[10px] text-jkn-dim">
                ({casesData[id].provider.replace(/^RS /, "").split(" (")[0]})
              </span>
            </button>
          ))}
        </div>

        <div className="rounded-2xl bg-surface border border-jkn-border shadow-subtle p-6 sm:p-7 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedCaseId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="space-y-7"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-jkn-divider">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold text-jkn-text">{casesData[selectedCaseId].id}</span>
                    <span className="text-[10px] font-mono text-jkn-muted">SEP: {casesData[selectedCaseId].sep}</span>
                    <span className="px-2 py-0.5 rounded-full bg-risk-critical-bg text-risk-critical font-extrabold text-[10px] border border-risk-critical-border">
                      FLAGGED
                    </span>
                  </div>
                  <p className="text-xs text-jkn-muted mt-1">
                    {casesData[selectedCaseId].patient} · {casesData[selectedCaseId].provider} · Attending: {casesData[selectedCaseId].dpjp}
                  </p>
                </div>

                <button
                  onClick={handleRunScan}
                  disabled={isScanning}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-bpjs text-white font-bold text-xs hover:bg-bpjs-deep disabled:opacity-60 active:scale-[0.97] transition-all shadow-sm"
                >
                  {isScanning ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>Scanning Multi-Detectors...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" />
                      <span>Re-Run Forensic Audit</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="p-4 rounded-xl bg-surface-subtle border border-jkn-border space-y-3.5">
                  <div className="text-xs font-bold text-jkn-text">Financial Exposure Breakdown</div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-jkn-muted">
                      <span>Billed Amount:</span>
                      <span className="font-mono font-bold text-jkn-text">{formatRupiah(casesData[selectedCaseId].claimed)}</span>
                    </div>
                    <div className="flex justify-between text-jkn-muted">
                      <span>Standard Tariff:</span>
                      <span className="font-mono font-bold text-bpjs-dark">{formatRupiah(casesData[selectedCaseId].standard)}</span>
                    </div>
                    <div className="pt-2 border-t border-jkn-border flex justify-between font-bold">
                      <span className="text-risk-critical">Unwarranted Variance:</span>
                      <span className="font-mono text-risk-critical text-sm">+{formatRupiah(casesData[selectedCaseId].exposure)}</span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-2.5">
                  <div className="text-xs font-bold text-jkn-text">Triggered Forensic Detectors</div>
                  <div className="space-y-2">
                    {casesData[selectedCaseId].findings.map((f, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-surface-subtle border border-jkn-border flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-jkn-text">{f.detector}</span>
                            <RiskPill level={f.risk} size="sm" showIcon={false} />
                          </div>
                          <p className="text-jkn-muted text-[11px] leading-relaxed">{f.detail}</p>
                        </div>
                        <span className="font-mono font-bold text-risk-critical text-[11px] shrink-0 bg-surface px-2 py-1 rounded border border-jkn-border">
                          {f.delta}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* --- SAMPLING VS. CENSUS --- */}
      <section id="comparison" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto space-y-8">
        <Reveal className="max-w-2xl space-y-3">
          <SectionLabel>Sampling vs. Census</SectionLabel>
          <h2 className="text-3xl sm:text-4xl font-bold text-jkn-text tracking-tight">
            From reactive sampling to 100% census intelligence
          </h2>
        </Reveal>

        <Reveal className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch" delay={0.08}>
          <div className="p-7 rounded-2xl bg-surface-secondary border border-jkn-border shadow-subtle hover:shadow-card transition-shadow duration-300 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-surface text-jkn-muted border border-jkn-border">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-jkn-text">Traditional Sampling (Status Quo)</h3>
                <p className="text-xs text-jkn-muted">Random 5–10% post-payment human spot checks</p>
              </div>
            </div>

            <ul className="space-y-3 text-xs text-jkn-muted">
              <li className="flex items-start gap-2">
                <span className="text-risk-critical font-bold">✕</span>
                <span><strong className="text-jkn-text">90%+ unchecked claims:</strong> sophisticated cloning and systemic upcoding bypass spot audits.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-risk-critical font-bold">✕</span>
                <span><strong className="text-jkn-text">4–6 weeks latency:</strong> manual retrieval of paper and PDF records prolongs dispute resolution.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-risk-critical font-bold">✕</span>
                <span><strong className="text-jkn-text">No cross-hospital visibility:</strong> syndicated copy-paste narratives across facilities go undetected.</span>
              </li>
            </ul>
          </div>

          <div className="p-7 rounded-2xl bg-bpjs-soft border border-bpjs-border border-l-4 border-l-bpjs shadow-subtle hover:shadow-card transition-shadow duration-300 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-bpjs text-white">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-jkn-text">JKN Risk Intelligence Platform</h3>
                <p className="text-xs text-bpjs-dark font-bold">100% census ingestion, AI evidence grounding</p>
              </div>
            </div>

            <ul className="space-y-3 text-xs text-jkn-text font-medium">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-bpjs shrink-0 mt-0.5" />
                <span><strong>100% census automated auditing:</strong> every submitted claim is verified in seconds.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-bpjs shrink-0 mt-0.5" />
                <span><strong>pgvector semantic matching:</strong> a 96.4% duplicate-narrative match catches syndicate cloning.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-bpjs shrink-0 mt-0.5" />
                <span><strong>Court-admissible dossiers:</strong> instant PDF summaries with an immutable audit trail.</span>
              </li>
            </ul>
          </div>
        </Reveal>
      </section>

      {/* --- ROI CALCULATOR --- */}
      <section id="roi-calculator" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto space-y-8">
        <Reveal className="max-w-2xl space-y-3">
          <SectionLabel>Measurable Impact</SectionLabel>
          <h2 className="text-3xl sm:text-4xl font-bold text-jkn-text tracking-tight">
            Estimate the recovery impact
          </h2>
          <p className="text-sm text-jkn-muted">
            Model potential fund protection from a region's or the nation's claim volume.
          </p>
        </Reveal>

        <Reveal className="rounded-2xl bg-surface border border-jkn-border shadow-subtle p-6 sm:p-9 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center" delay={0.08}>
          <div className="lg:col-span-7 space-y-6">
            <div>
              <div className="flex justify-between text-xs font-bold text-jkn-text mb-2">
                <span>Monthly Claim Volume</span>
                <span className="text-bpjs-dark font-mono">{formatNumber(claimVolume)} claims / mo</span>
              </div>
              <input
                type="range"
                min="50000"
                max="2000000"
                step="50000"
                value={claimVolume}
                onChange={(e) => setClaimVolume(Number(e.target.value))}
                className="w-full h-2 bg-jkn-border rounded-lg appearance-none cursor-pointer accent-bpjs"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-jkn-text mb-2">
                <span>Average Inpatient Claim Amount</span>
                <span className="text-bpjs-dark font-mono">{formatRupiah(avgClaimAmount)}</span>
              </div>
              <input
                type="range"
                min="3000000"
                max="25000000"
                step="500000"
                value={avgClaimAmount}
                onChange={(e) => setAvgClaimAmount(Number(e.target.value))}
                className="w-full h-2 bg-jkn-border rounded-lg appearance-none cursor-pointer accent-bpjs"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-jkn-text mb-2">
                <span>Estimated Anomaly Rate</span>
                <span className="text-bpjs-dark font-mono">{anomalyRate}%</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="12.0"
                step="0.2"
                value={anomalyRate}
                onChange={(e) => setAnomalyRate(Number(e.target.value))}
                className="w-full h-2 bg-jkn-border rounded-lg appearance-none cursor-pointer accent-bpjs"
              />
            </div>
          </div>

          <div className="lg:col-span-5 p-6 rounded-xl bg-bpjs-soft border border-bpjs-border text-center space-y-4">
            <div className="text-xs font-bold text-bpjs-dark uppercase tracking-wider">Estimated Annual Fund Protection</div>
            <div className="text-3xl sm:text-4xl font-black text-jkn-text font-mono">
              Rp {formatNumber(Math.round(estimatedRecoveryYearly / 1000000000))} Miliar
            </div>
            <p className="text-xs text-jkn-muted">
              Recoverable through automated pre-payment and post-payment disallowances.
            </p>
            <div className="pt-3 border-t border-bpjs-border/70 text-xs text-jkn-muted flex justify-around">
              <div>
                <div className="font-bold text-jkn-text font-mono">{formatNumber(auditHoursSaved)} hrs</div>
                <div className="text-[10px] text-jkn-dim">Auditor Hours Saved</div>
              </div>
              <div>
                <div className="font-bold text-jkn-text font-mono">88.4%</div>
                <div className="text-[10px] text-jkn-dim">Recovery Rate</div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* --- FORENSIC QUERY CONSOLE (the one intentional dark surface) --- */}
      <section id="query-console" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto space-y-8">
        <Reveal className="max-w-2xl space-y-3">
          <SectionLabel>Auditor CLI &amp; AI Copilot</SectionLabel>
          <h2 className="text-3xl sm:text-4xl font-bold text-jkn-text tracking-tight">
            Query the evidence directly
          </h2>
        </Reveal>

        <Reveal className="rounded-2xl bg-jkn-text text-white/90 p-6 sm:p-8 shadow-card space-y-6 font-mono text-xs" delay={0.08}>
          <div className="flex flex-wrap gap-2 pb-4 border-b border-white/10">
            {consoleQueries.map((q, idx) => (
              <button
                key={idx}
                onClick={() => setActiveConsoleQuery(idx)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs transition-all active:scale-[0.97]",
                  activeConsoleQuery === idx
                    ? "bg-bpjs/25 text-emerald-300 border border-bpjs/50"
                    : "text-white/50 hover:text-white/80 hover:bg-white/5"
                )}
              >
                Query #{idx + 1}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeConsoleQuery}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: EASE }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <div className="text-white/40 text-[11px]">// Executing auditor diagnostic command:</div>
                <div className="p-3 rounded-xl bg-black/20 border border-white/10 text-emerald-300 font-bold">
                  $ {consoleQueries[activeConsoleQuery].command}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-black/15 border border-white/10 whitespace-pre-wrap leading-relaxed text-white/70 text-[11px]">
                {consoleQueries[activeConsoleQuery].result}
              </div>
            </motion.div>
          </AnimatePresence>
        </Reveal>
      </section>

      {/* --- FAQ SECTION --- */}
      <section id="compliance" className="py-20 px-4 sm:px-6 max-w-4xl mx-auto space-y-8">
        <Reveal className="space-y-3">
          <SectionLabel>Transparency &amp; Security</SectionLabel>
          <h2 className="text-3xl font-bold text-jkn-text tracking-tight">
            Frequently asked questions
          </h2>
        </Reveal>

        <Reveal className="space-y-2.5" delay={0.08}>
          {faqs.map((f, idx) => (
            <div
              key={idx}
              onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
              className="p-5 rounded-xl bg-surface border border-jkn-border shadow-subtle hover:shadow-card cursor-pointer hover:border-bpjs/40 transition-all space-y-2"
            >
              <div className="flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-jkn-text">
                <span>{f.q}</span>
                <ChevronDown className={cn("w-4 h-4 text-jkn-dim transition-transform duration-300 shrink-0", openFaq === idx && "rotate-180")} />
              </div>
              <AnimatePresence initial={false}>
                {openFaq === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <p className="text-xs text-jkn-muted leading-relaxed pt-2 border-t border-jkn-divider">
                      {f.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </Reveal>
      </section>

      {/* --- CLOSING CTA (flat, no gradient) --- */}
      <section className="py-16 px-4 sm:px-6 max-w-7xl mx-auto">
        <Reveal className="rounded-2xl bg-bpjs-dark p-8 sm:p-14 text-center text-white space-y-6">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight max-w-2xl mx-auto leading-tight">
            Protect the JKN fund with evidence, not guesswork.
          </h2>
          <p className="text-sm sm:text-base text-white/70 max-w-xl mx-auto">
            Explore the live investigation queue and inspect a multi-detector forensic dossier.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/"
              className="px-7 py-3.5 rounded-xl bg-white text-bpjs-dark font-extrabold text-sm hover:bg-white/90 active:scale-[0.97] transition-all flex items-center gap-2"
            >
              <span>Launch Live Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/investigations/INV-2026-10293"
              className="px-6 py-3.5 rounded-xl bg-white/10 text-white font-bold text-sm border border-white/20 hover:bg-white/15 active:scale-[0.97] transition-all flex items-center gap-2"
            >
              <span>Hero Case Dossier</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </Reveal>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-10 border-t border-jkn-border bg-surface-secondary text-xs text-jkn-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/arsa_logo.png" alt="ARSA JKN" className="w-6 h-6 object-contain" />
            <span className="font-bold text-jkn-text">JKN Risk Intelligence Platform</span>
            <span>· BPJS Kesehatan AI Hackathon Edition</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-bpjs-dark">Dashboard</Link>
            <Link href="/claims" className="hover:text-bpjs-dark">Claims</Link>
            <Link href="/providers" className="hover:text-bpjs-dark">Providers</Link>
            <Link href="/copilot" className="hover:text-bpjs-dark">AI Copilot</Link>
            <Link href="/data-management" className="hover:text-bpjs-dark">Data Onboarding</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
