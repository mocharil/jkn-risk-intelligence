"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Activity,
  FileCheck2,
  Lock,
  Layers,
  Bot,
  Database,
  Building2,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Cpu,
  Eye,
  FileSpreadsheet,
  Copy,
  Server,
  Zap,
  Clock,
  BarChart3,
  Search,
  Scale,
  Users,
  Play,
  RotateCcw,
  Sliders,
  Terminal as TerminalIcon,
  Check,
  AlertTriangle,
  FileText,
  Stethoscope,
  MapPin,
  Flame,
  Network as NetworkIcon,
  Map as MapIcon,
  SplitSquareVertical,
  SlidersHorizontal,
  ChevronDown,
  HelpCircle,
  Radio,
  ArrowUpRight,
  Maximize2,
  Workflow,
  KeyRound,
  FileSearch,
} from "lucide-react";
import { formatRupiah, formatNumber } from "@/lib/formatting/currency";
import { RiskPill } from "@/components/ui/RiskPill";
import { IndonesiaRiskMap } from "@/components/map/IndonesiaRiskMap";
import { NetworkGraphView } from "@/components/network/NetworkGraphView";
import { ProvinceRiskData } from "@/types/risk";
import { INDONESIA_PROVINCES } from "@/lib/data/indonesia-provinces";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// --- Magic UI Motion Components ---
import { BorderBeam } from "@/components/magicui/border-beam";
import { RetroGrid } from "@/components/magicui/retro-grid";
import { Marquee } from "@/components/magicui/marquee";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { AnimatedGradientText } from "@/components/magicui/animated-gradient-text";
import { WordRotate } from "@/components/magicui/word-rotate";
import { OrbitingCircles } from "@/components/magicui/orbiting-circles";
import { BentoGrid, BentoCard } from "@/components/magicui/bento-grid";
import { AnimatedList } from "@/components/ui/animated-list";

export default function FinTechRegTechEnterpriseLandingPage() {
  // --- Dynamic Shrinking Header on Scroll State ---
  const [isScrolled, setIsScrolled] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // --- Live Interactive Detector Simulator State ---
  const [selectedCaseId, setSelectedCaseId] = useState<"CLM-10293" | "CLM-09283" | "CLM-08741">("CLM-10293");
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(100);
  const [activeStep, setActiveStep] = useState<number>(4);

  // --- Bento Grid Feature Switcher ---
  const [bentoActiveTab, setBentoActiveTab] = useState<"map" | "network" | "evidence" | "mapping">("map");

  // --- Comparison Slider State (Before vs After) ---
  const [comparisonMode, setComparisonMode] = useState<"after" | "before">("after");

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
      const high_risk_claims = isCritical ? 142 : isHigh ? 68 : isMedium ? 28 : 8;
      const potential_exposure = isCritical ? 148500000000 : isHigh ? 42000000000 : 12500000000;
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
        { detector: "Upcoding Severity 3", detail: "Severity Level 3 invoiced for Gastroenteritis A09 without documented hypovolemic shock or metabolic complications.", delta: "+Rp 14,650,000", risk: "CRITICAL" },
        { detector: "Phantom Procedure 44.95", detail: "Laparoscopic surgery billed without supporting operating room logs or anesthesia record sheets.", delta: "+Rp 12,500,000", risk: "CRITICAL" },
        { detector: "Semantic Text Match (96%)", detail: "Progress note narrative exhibits 96.4% semantic overlap with claim CLM-09283.", delta: "Cluster #42", risk: "HIGH" },
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
        { detector: "Semantic Cloning 96.4%", detail: "Discharge summary narrative is 96.4% identical to CLM-10293 (only name and date swapped).", delta: "Text Duplication", risk: "CRITICAL" },
        { detector: "Phantom Billing Check", detail: "Digestive surgery package billing unverified in hospital surgical equipment logs.", delta: "+Rp 12,500,000", risk: "CRITICAL" },
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
        { detector: "Abnormal LOS (6 Days vs 2.2 Days)", detail: "Length of stay of 6 days significantly exceeds national peer median (2.2 days) for uncomplicated pneumonia.", delta: "+3.8 Days Deviation", risk: "HIGH" },
        { detector: "Medication Cross-Check", detail: "IV antibiotic course completed on Day 2; no clinical rationale found for continued inpatient retention.", delta: "+Rp 7,800,000", risk: "HIGH" },
      ],
      docMismatch: "Daily progress notes on Days 3-6 record patient as stable, afebrile, and symptom-free.",
    },
  };

  const handleRunScan = () => {
    setIsScanning(true);
    setScanProgress(0);
    setActiveStep(1);

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          setActiveStep(4);
          return 100;
        }
        const next = prev + 25;
        if (next >= 75) setActiveStep(3);
        else if (next >= 50) setActiveStep(2);
        else if (next >= 25) setActiveStep(1);
        return next;
      });
    }, 350);
  };

  // --- Interactive RoI Recovery Calculator State ---
  const [claimVolume, setClaimVolume] = useState<number>(450000); // 450k claims/month
  const [avgClaimAmount, setAvgClaimAmount] = useState<number>(8500000); // Rp 8.5M
  const [anomalyRate, setAnomalyRate] = useState<number>(4.8); // 4.8%

  const totalExposureYearly = (claimVolume * 12 * avgClaimAmount * (anomalyRate / 100));
  const estimatedRecoveryYearly = totalExposureYearly * 0.88; // 88% recoverable
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

  const liveTickerAlerts = [
    { type: "CRITICAL", text: "CLM-10293: Gastroenteritis Severity 3 flagged (+Rp 14.65M variance)" },
    { type: "WARNING", text: "CLUSTER-42: South Jakarta 96.4% duplicate CPPT narrative detected" },
    { type: "SUCCESS", text: "HOSP-01: Auto-remediation notice sent for unproven procedure 44.95" },
    { type: "CRITICAL", text: "CLM-09283: Phantom digestive surgery without OR operating log" },
    { type: "INFO", text: "DKI Jakarta Radar: 184 active anomaly claims mapped in real-time" },
    { type: "SUCCESS", text: "Census Audit: 1,284,392 claims ingested with 100% Zod validation" },
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
      iconColor: "text-rose-400 bg-rose-500/20 border-rose-500/30",
    },
    {
      id: "N2",
      time: "2m ago",
      title: "Syndicate Pattern Identified",
      description: "Cluster #42: 96.4% duplicate CPPT clinical narrative matched across 12 claims.",
      exposure: "Cluster Match",
      badge: "HIGH RISK",
      icon: NetworkIcon,
      iconColor: "text-purple-400 bg-purple-500/20 border-purple-500/30",
    },
    {
      id: "N3",
      time: "5m ago",
      title: "Phantom Procedure Pre-empted",
      description: "Unverified laparoscopic surgical package 44.95 missing operating room logs.",
      exposure: "+Rp 12,500,000",
      badge: "PREVENTED",
      icon: Lock,
      iconColor: "text-cyan-400 bg-cyan-500/20 border-cyan-500/30",
    },
    {
      id: "N4",
      time: "8m ago",
      title: "Abnormal Length of Stay (LOS)",
      description: "Pneumonia stay of 6 days significantly exceeds national peer median of 2.2 days.",
      exposure: "+3.8 Days Dev",
      badge: "AUDIT REQ",
      icon: Clock,
      iconColor: "text-amber-400 bg-amber-500/20 border-amber-500/30",
    },
    {
      id: "N5",
      time: "12m ago",
      title: "National Telemetry Ingested",
      description: "1,284,392 claims parsed with 100% Zod deterministic validation & UU PDP masking.",
      exposure: "100% Census",
      badge: "VERIFIED",
      icon: CheckCircle2,
      iconColor: "text-emerald-400 bg-emerald-500/20 border-emerald-500/30",
    },
  ];

  const faqs = [
    {
      q: "How does the platform guarantee zero hallucination in medical claim audits?",
      a: "The platform adopts a Deterministic-First & Evidence-Grounded design. Before AI models evaluate a claim, deterministic clinical rules and vector fact-matching verify every record. Every AI inference must provide explicit document citations (DOC-01 Discharge Summary, DOC-02 Itemized Billing, DOC-IBS Operating Log) that auditors can independently inspect.",
    },
    {
      q: "Does the system comply with Personal Data Protection regulations (UU PDP No. 27/2022)?",
      a: "Yes. All patient identifiers (National ID / NIK, BPJS Card Number, Full Address) are automatically anonymized and masked at ingestion. Data processing operates within private BPJS gateways without exposing raw electronic medical records to third-party public LLM endpoints.",
    },
    {
      q: "How does the platform handle varied hospital Electronic Health Record (SIMRS) schemas?",
      a: "The system features a Visual 2-Column Schema Mapping engine (Source-Agnostic Processor) that automatically parses CSV, JSON, or API payloads and maps unstandardized fields to canonical INA-CBG schemas with 96% accuracy.",
    },
    {
      q: "Are audit determinations executed autonomously or by Human Investigators?",
      a: "All final decisions (Confirm Risk, Request Evidence, Mark False Positive) remain 100% in the hands of Human Auditors (Human-in-the-Loop 65/35 workspace). AI serves as an intelligence co-pilot, accelerating investigation cycles from 4-6 weeks down to minutes.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 font-sans selection:bg-emerald-500 selection:text-black overflow-x-hidden">
      {/* --- Magic UI: Animated Perspective Retro Grid Background --- */}
      <RetroGrid className="opacity-40" />

      {/* Ambient Lighting Glows */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[600px] bg-gradient-to-tr from-emerald-600/20 via-teal-500/15 to-cyan-600/15 rounded-full blur-[150px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-tl from-emerald-900/20 via-slate-900/10 to-transparent rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Top Dynamic Floating Glass Navigation (Perfect 3-Column Symmetrical Island) */}
      <motion.nav
        initial={false}
        animate={{
          width: isScrolled ? "min(920px, 92vw)" : "min(1280px, 94vw)",
          height: isScrolled ? 54 : 66,
          top: isScrolled ? 12 : 16,
          paddingLeft: isScrolled ? 18 : 28,
          paddingRight: isScrolled ? 18 : 28,
          borderRadius: isScrolled ? 9999 : 20,
        }}
        transition={{
          duration: 0.35,
          ease: [0.16, 1, 0.3, 1], // Apple cubic-bezier
        }}
        className={cn(
          "fixed left-1/2 -translate-x-1/2 z-50 flex items-center justify-between",
          "transition-colors duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
          isScrolled
            ? "bg-[#080d18]/95 backdrop-blur-2xl border border-emerald-500/40 shadow-[0_12px_40px_rgba(0,0,0,0.7),0_0_25px_rgba(16,185,129,0.25)]"
            : "bg-[#0c1220]/90 backdrop-blur-xl border border-emerald-500/20"
        )}
      >
        {/* Column 1: Brand (Left-aligned, flex-1) */}
        <div className="flex-1 flex items-center justify-start gap-2.5">
          <div
            className={cn(
              "rounded-xl bg-white/5 border border-emerald-500/30 flex items-center justify-center p-1 shadow-inner shrink-0 overflow-hidden transition-all duration-300",
              isScrolled ? "w-8 h-8 rounded-lg" : "w-9 h-9"
            )}
          >
            <img src="/arsa_logo.png" alt="ARSA JKN" className="w-full h-full object-contain" />
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "font-black tracking-tight text-white transition-all duration-300 whitespace-nowrap",
                isScrolled ? "text-xs" : "text-sm"
              )}
            >
              JKN RISK
            </span>
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-extrabold uppercase tracking-wider whitespace-nowrap">
              {isScrolled ? "PRO" : "REGTECH SUITE"}
            </span>
          </div>
        </div>

        {/* Column 2: Navigation Links (Dead Center, shrink-0) */}
        <div
          className={cn(
            "hidden md:flex items-center justify-center font-semibold text-slate-300 shrink-0 transition-all duration-300",
            isScrolled ? "gap-4 text-[11px]" : "gap-6 text-xs"
          )}
        >
          <a href="#bento-features" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>Suite</span>
          </a>
          <a href="#live-simulator" className="hover:text-emerald-400 transition-colors">Detector</a>
          <a href="#comparison" className="hover:text-emerald-400 transition-colors">Before/After</a>
          <a href="#roi-calculator" className="hover:text-emerald-400 transition-colors">Recovery ROI</a>
          <a href="#query-console" className="hover:text-emerald-400 transition-colors">Console</a>
          <a href="#compliance" className="hover:text-emerald-400 transition-colors">Compliance</a>
        </div>

        {/* Column 3: Action Button (Right-aligned, flex-1) */}
        <div className="flex-1 flex items-center justify-end gap-2">
          <Link href="/">
            <ShimmerButton
              className={cn(
                "font-bold transition-all duration-300",
                isScrolled ? "text-[11px] px-3.5 py-1.5 rounded-full" : "text-xs px-4 py-2 rounded-xl"
              )}
              shimmerColor="#10B981"
              shimmerSize="0.05em"
            >
              <span className="flex items-center gap-1.5 text-white whitespace-nowrap">
                <span>Command Center</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </ShimmerButton>
          </Link>
        </div>
      </motion.nav>

      {/* --- HERO SECTION (FinTech / RegTech High-Impact Style with Motion) --- */}
      <section className="relative pt-36 pb-20 px-6 md:px-12 max-w-7xl mx-auto text-center space-y-8">
        {/* Magic UI: Animated Gradient Text Badge */}
        <AnimatedGradientText className="cursor-pointer hover:scale-105 transition-transform">
          <span className="flex items-center gap-2 text-xs font-bold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>HealthKathon 2026 Innovation · Autonomous Claim Integrity Engine</span>
            <ChevronRight className="w-3.5 h-3.5 text-emerald-300" />
          </span>
        </AnimatedGradientText>

        {/* Dynamic Headline with Magic UI Word Rotate */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-5xl mx-auto leading-[1.08]">
          Securing National Health Funds: <br />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            <WordRotate
              words={[
                "Combat Upcoding Inflation",
                "Eliminate Phantom Billing Fraud",
                "Detect Narrative Medical Cloning",
                "Grounded in Clinical Evidence",
              ]}
              duration={3000}
            />
          </span>
        </h1>

        <p className="text-sm sm:text-base md:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
          Empowering BPJS Kesehatan with deterministic rule engines, semantic vector cross-examination, and <strong>irrefutable medical evidence citations</strong> to protect public healthcare funds compliant with UU PDP No. 27/2022.
        </p>

        {/* Hero CTAs with Shimmer Button */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link href="/">
            <ShimmerButton className="w-full sm:w-auto text-sm font-black px-8 py-4 shadow-[0_0_30px_rgba(16,185,129,0.4)]">
              <span className="flex items-center gap-2 text-white">
                <span>Launch Command Center</span>
                <ArrowRight className="w-4 h-4" />
              </span>
            </ShimmerButton>
          </Link>
          <a
            href="#bento-features"
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white text-sm font-bold hover:bg-slate-800 hover:border-emerald-500/50 transition-all shadow-md active:scale-95"
          >
            <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
            <span>Explore Live Interactive Suite</span>
          </a>
        </div>

        {/* --- Magic UI: Hero Dual-Panel Visual (Orbiting Circles AI Core + AnimatedList Live Risk Stream) --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-6xl mx-auto mt-8 items-stretch text-left">
          {/* Panel 1: Orbiting Circles AI Core (5 cols) */}
          <div className="lg:col-span-5 relative flex min-h-[340px] flex-col items-center justify-center overflow-hidden rounded-3xl bg-[#0c1220]/70 border border-emerald-500/30 backdrop-blur-md shadow-2xl p-6">
            <BorderBeam size={220} duration={8} colorFrom="#10B981" colorTo="#06B6D4" />

            {/* Center Brand Core */}
            <div className="relative z-10 flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-br from-emerald-950 via-[#0c1220] to-teal-950 border border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/20 flex items-center justify-center p-2 mb-1">
                <img src="/arsa_logo.png" alt="ARSA Logo" className="w-full h-full object-contain" />
              </div>
              <span className="text-xs font-black text-white tracking-tight">ARSA CORE</span>
              <span className="text-[9px] text-emerald-400 font-mono">INA-CBG v2.4</span>
            </div>

            {/* Inner Orbital Circle */}
            <OrbitingCircles className="size-[36px] border-none bg-transparent" duration={20} delay={0} radius={75}>
              <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 backdrop-blur-md shadow-md">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
            </OrbitingCircles>
            <OrbitingCircles className="size-[36px] border-none bg-transparent" duration={20} delay={10} radius={75}>
              <div className="p-2 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-400 backdrop-blur-md shadow-md">
                <Stethoscope className="w-3.5 h-3.5" />
              </div>
            </OrbitingCircles>

            {/* Outer Orbital Circle */}
            <OrbitingCircles className="size-[38px] border-none bg-transparent" duration={30} delay={0} radius={125} reverse>
              <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 backdrop-blur-md shadow-md">
                <Database className="w-3.5 h-3.5" />
              </div>
            </OrbitingCircles>
            <OrbitingCircles className="size-[38px] border-none bg-transparent" duration={30} delay={10} radius={125} reverse>
              <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-400 backdrop-blur-md shadow-md">
                <NetworkIcon className="w-3.5 h-3.5" />
              </div>
            </OrbitingCircles>
            <OrbitingCircles className="size-[38px] border-none bg-transparent" duration={30} delay={20} radius={125} reverse>
              <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 backdrop-blur-md shadow-md">
                <ShieldAlert className="w-3.5 h-3.5" />
              </div>
            </OrbitingCircles>
          </div>

          {/* Panel 2: Magic UI AnimatedList Live Urgent Risk Stream (7 cols) */}
          <div className="lg:col-span-7 relative flex flex-col justify-between overflow-hidden rounded-3xl bg-[#0c1220]/70 border border-emerald-500/30 backdrop-blur-md shadow-2xl p-5">
            <BorderBeam size={260} duration={10} colorFrom="#10B981" colorTo="#8B5CF6" />

            {/* Stream Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-black text-white tracking-wide">Live Autonomous Risk Stream</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold uppercase tracking-wider">
                Real-time Telemetry
              </span>
            </div>

            {/* AnimatedList Container */}
            <div className="py-2 overflow-hidden max-h-[260px]">
              <AnimatedList delay={2400}>
                {urgentAlertsList.map((n) => {
                  const Icon = n.icon;
                  return (
                    <div
                      key={n.id}
                      className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 transition-all shadow-md group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-xl border shrink-0 ${n.iconColor}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                              {n.title}
                            </span>
                            <span className="text-[9px] text-slate-500 font-mono shrink-0">{n.time}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {n.description}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-3">
                        <span className="text-xs font-extrabold text-white block font-mono">
                          {n.exposure}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase ${
                            n.badge === "CRITICAL"
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              : n.badge === "HIGH RISK"
                              ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                              : n.badge === "PREVENTED"
                              ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                              : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          }`}
                        >
                          {n.badge}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </AnimatedList>
            </div>

            {/* Stream Footer */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Evidence Citations Automatically Appended</span>
              </span>
              <Link href="/investigation-queue" className="text-emerald-400 font-bold hover:underline flex items-center gap-1">
                <span>View Queue (47)</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Floating Metrics Bar (Sleek Glass Strip with Magic UI Number Ticker) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-left max-w-5xl mx-auto">
          <div className="p-4 rounded-2xl bg-[#0c1220]/80 border border-slate-800/80 backdrop-blur-md shadow-lg space-y-1 relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Claims Scanned / Day</span>
            <div className="text-2xl font-black text-white">
              <NumberTicker value={1284392} />
            </div>
            <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
              <Check className="w-3 h-3" /> 100% Automated Census
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0c1220]/80 border border-slate-800/80 backdrop-blur-md shadow-lg space-y-1 relative overflow-hidden group hover:border-rose-500/40 transition-colors">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Potential Exposure Prevented</span>
            <div className="text-2xl font-black text-rose-400 flex items-center">
              <span>Rp&nbsp;</span>
              <NumberTicker value={824.6} decimalPlaces={1} />
              <span>B</span>
            </div>
            <span className="text-[11px] text-rose-400/90 font-semibold flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" /> YTD Audit 2026
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0c1220]/80 border border-slate-800/80 backdrop-blur-md shadow-lg space-y-1 relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Clinical Evidence Precision</span>
            <div className="text-2xl font-black text-emerald-400 flex items-center">
              <NumberTicker value={99.4} decimalPlaces={1} />
              <span>%</span>
            </div>
            <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
              <Check className="w-3 h-3" /> Zero Hallucination
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0c1220]/80 border border-slate-800/80 backdrop-blur-md shadow-lg space-y-1 relative overflow-hidden group hover:border-cyan-500/40 transition-colors">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Inference Speed</span>
            <div className="text-2xl font-black text-cyan-400 flex items-center">
              <span>&lt;&nbsp;</span>
              <NumberTicker value={120} />
              <span>ms</span>
            </div>
            <span className="text-[11px] text-cyan-400 font-semibold flex items-center gap-1">
              <Zap className="w-3 h-3" /> Real-time Streaming
            </span>
          </div>
        </div>

        {/* --- Magic UI: Live Streaming Anomaly Ticker (Marquee) --- */}
        <div className="pt-6 max-w-5xl mx-auto space-y-2">
          <div className="flex items-center justify-between px-2 text-[10px] font-bold uppercase text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Radio className="w-3 h-3 animate-pulse" /> Live Telemetry Feed
            </span>
            <span>Deterministic Grounding Active</span>
          </div>

          <div className="relative rounded-2xl border border-slate-800 bg-[#0c1220]/90 backdrop-blur-md overflow-hidden py-1">
            <Marquee pauseOnHover className="[--duration:25s]">
              {liveTickerAlerts.map((alert, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-semibold"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      alert.type === "CRITICAL"
                        ? "bg-rose-400 animate-ping"
                        : alert.type === "WARNING"
                        ? "bg-amber-400"
                        : "bg-emerald-400"
                    }`}
                  />
                  <span className="text-slate-200">{alert.text}</span>
                </div>
              ))}
            </Marquee>
          </div>
        </div>

        {/* Institutional Trust Logo Marquee */}
        <div className="pt-8 border-t border-slate-800/80 max-w-4xl mx-auto space-y-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
            Integrated & Compatible with the National Health Ecosystem
          </span>
          <Marquee reverse pauseOnHover className="[--duration:30s]">
            {[
              "BPJS Kesehatan VClaim",
              "Kemenkes SatuSehat Platform",
              "e-Klaim INA-CBG Tariffs",
              "Advanced Hospital SIMRS",
              "UU PDP No. 27/2022 Verified",
              "ICD-10 & ICD-9-CM Standards",
            ].map((partner, idx) => (
              <span
                key={idx}
                className="px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-bold text-slate-300 hover:border-emerald-500/50 hover:text-emerald-400 transition-colors"
              >
                {partner}
              </span>
            ))}
          </Marquee>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* --- SIGNATURE BENTO GRID FEATURE SUITE (LIVE MAP, NETWORK, EVIDENCE) --- */}
      {/* ========================================================================= */}
      <section id="bento-features" className="py-20 px-6 md:px-12 max-w-7xl mx-auto space-y-10">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
            <Layers className="w-3.5 h-3.5" />
            <span>Interactive RegTech Architecture</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Live Feature Bento Showcase
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Explore live interactive system modules: 34-Province Geospatial Map, Force-Directed Network Graph, 65/35 Evidence Matrix, and Visual Schema Mapping.
          </p>
        </div>

        {/* Feature Tab Selector */}
        <div className="flex justify-center gap-2 overflow-x-auto pb-2">
          {[
            { key: "map", label: "34 Provinces Risk Map (Leaflet)", icon: MapIcon },
            { key: "network", label: "Entity Relation Graph (vis-network)", icon: NetworkIcon },
            { key: "evidence", label: "Evidence Board 65/35", icon: SplitSquareVertical },
            { key: "mapping", label: "Schema Normalizer (2-Column)", icon: SlidersHorizontal },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = bentoActiveTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setBentoActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black transition-all border shrink-0 ${
                  isActive
                    ? "bg-emerald-500 text-black border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                    : "bg-[#0c1220] text-slate-300 border-slate-800 hover:border-emerald-500/40 hover:text-white"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-black" : "text-emerald-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* BENTO VIEW 1: LIVE MAP */}
        {bentoActiveTab === "map" && (
          <div className="bg-[#0c1220] rounded-3xl border border-slate-800 p-6 md:p-8 shadow-2xl space-y-6 relative overflow-hidden">
            <BorderBeam size={350} duration={12} colorFrom="#10B981" colorTo="#06B6D4" />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8 rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
                {provinces.length > 0 && (
                  <IndonesiaRiskMap provinceData={provinces} className="border-none" />
                )}
              </div>

              <div className="lg:col-span-4 space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Tile: CartoDB Positron Enterprise
                  </span>
                  <h3 className="text-lg font-black text-white">
                    National Geospatial Radar Telemetry
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Interactive map powered by real latitude and longitude coordinates across 34 Indonesian provinces with pulsing critical radar hotspots over anomalous provider clusters.
                  </p>
                </div>

                <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-400">Total Monitored Hotspots:</span>
                    <span className="font-bold text-white">34 Provinces</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-400">Critical Risk Regions:</span>
                    <span className="font-bold text-rose-400">DKI Jakarta, West Java, East Java, North Sumatra</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-400">Highest Exposure Province:</span>
                    <span className="font-bold text-emerald-400">DKI Jakarta (Rp 148.5B)</span>
                  </div>
                </div>

                <Link
                  href="/risk-intelligence"
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black text-xs font-black hover:opacity-90 transition-all shadow-md"
                >
                  <span>Open Full Map in Risk Intelligence</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* BENTO VIEW 2: LIVE NETWORK GRAPH */}
        {bentoActiveTab === "network" && (
          <div className="bg-[#0c1220] rounded-3xl border border-slate-800 p-6 md:p-8 shadow-2xl space-y-6 relative overflow-hidden">
            <BorderBeam size={350} duration={12} colorFrom="#10B981" colorTo="#8B5CF6" />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8 rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
                <NetworkGraphView className="border-none" />
              </div>

              <div className="lg:col-span-4 space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
                    Physics: ForceAtlas2 Engine
                  </span>
                  <h3 className="text-lg font-black text-white">
                    Connected Anomaly Syndicate Detection (Cluster #42)
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Connects healthcare facilities, attending physicians (DPJP), recurring claims, and phantom surgical procedures in an interactive elastic physics relation graph.
                  </p>
                </div>

                <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-400">Cluster Identity:</span>
                    <span className="font-bold text-rose-400">Anomaly Cluster #42</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-400">Connected Entities:</span>
                    <span className="font-bold text-white">10 Nodes (Hospitals, DPJP, Claims)</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-400">Pattern Findings:</span>
                    <span className="font-bold text-cyan-400">Upcoding + Text Duplication</span>
                  </div>
                </div>

                <Link
                  href="/risk-intelligence"
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black text-xs font-black hover:opacity-90 transition-all shadow-md"
                >
                  <span>Explore Full Graph in Risk Intelligence</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* BENTO VIEW 3: EVIDENCE BOARD */}
        {bentoActiveTab === "evidence" && (
          <div className="bg-[#0c1220] rounded-3xl border border-slate-800 p-6 md:p-8 shadow-2xl space-y-6 relative overflow-hidden">
            <BorderBeam size={350} duration={10} colorFrom="#10B981" colorTo="#F59E0B" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span>Evidence Board (Investigation Workspace)</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                    Hero Case CLM-10293
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Categorizes electronic medical records into 3 evidential streams: Supporting, Contradicting, and Missing Mandatory Documents.
                </p>
              </div>
              <Link
                href="/investigations/INV-2026-010293"
                className="px-4 py-2 rounded-xl bg-emerald-500 text-black text-xs font-black hover:opacity-90 transition-all flex items-center gap-1.5 shrink-0"
              >
                <span>Open Full Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-emerald-950/30 rounded-2xl border border-emerald-500/30 p-4 space-y-3">
                <div className="flex items-center justify-between font-bold text-xs text-emerald-400 border-b border-emerald-500/20 pb-2">
                  <span>Supporting Evidence</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 rounded font-black text-emerald-300">1 Doc</span>
                </div>
                <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 text-xs space-y-1">
                  <span className="font-bold text-white block">DOC-01: DPJP Discharge Summary</span>
                  <p className="text-[11px] text-slate-400">Supports primary diagnosis of Gastroenteritis A09 with mild nausea complaints.</p>
                </div>
              </div>

              <div className="bg-rose-950/30 rounded-2xl border border-rose-500/30 p-4 space-y-3">
                <div className="flex items-center justify-between font-bold text-xs text-rose-400 border-b border-rose-500/20 pb-2">
                  <span>Contradicting Evidence</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-rose-500/20 rounded font-black text-rose-300">2 Docs</span>
                </div>
                <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 text-xs space-y-1">
                  <span className="font-bold text-rose-400 block">DOC-02: INA-CBG Itemized Billing</span>
                  <p className="text-[11px] text-slate-400">Invoices Severity Level 3 tariff (Rp 18.45M), directly contradicting mild clinical status.</p>
                </div>
                <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 text-xs space-y-1">
                  <span className="font-bold text-rose-400 block">DOC-03: Nursing CPPT Progress Notes</span>
                  <p className="text-[11px] text-slate-400">Vital signs stable with no signs of severe dehydration or metabolic acidosis.</p>
                </div>
              </div>

              <div className="bg-amber-950/30 rounded-2xl border border-amber-500/30 p-4 space-y-3">
                <div className="flex items-center justify-between font-bold text-xs text-amber-400 border-b border-amber-500/20 pb-2">
                  <span>Missing Mandatory Documents</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 rounded font-black text-amber-300">1 Required</span>
                </div>
                <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 text-xs space-y-1">
                  <span className="font-bold text-amber-400 block">DOC-IBS: Operating & Anesthesia Log</span>
                  <p className="text-[11px] text-slate-400">No electronic OR records exist for laparoscopic surgical claim 44.95 worth Rp 12,500,000.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BENTO VIEW 4: SCHEMA MAPPING */}
        {bentoActiveTab === "mapping" && (
          <div className="bg-[#0c1220] rounded-3xl border border-slate-800 p-6 md:p-8 shadow-2xl space-y-6 relative overflow-hidden">
            <BorderBeam size={350} duration={10} colorFrom="#10B981" colorTo="#06B6D4" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span>Visual 2-Column Schema Mapping Tool (Source-Agnostic Engine)</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                    96% Match Confidence
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Connects raw hospital CSV columns directly to standard BPJS Kesehatan canonical claim schemas.
                </p>
              </div>
              <Link
                href="/data-management"
                className="px-4 py-2 rounded-xl bg-emerald-500 text-black text-xs font-black hover:opacity-90 transition-all flex items-center gap-1.5 shrink-0"
              >
                <span>Open Data Onboarding</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-2.5 font-mono text-xs">
              {[
                { source: "NO_SEP_PASIEN", canonical: "claim_id (Zod String)", match: "97%" },
                { source: "BIAYA_TOTAL_TARIF", canonical: "claimed_amount (Zod Number)", match: "96%" },
                { source: "DIAGNOSA_PRIMER_ICD", canonical: "primary_diagnosis (ICD-10 Code)", match: "95%" },
                { source: "DPJP_DOKTER_NAMA", canonical: "dpjp_name (String Canonical)", match: "94%" },
              ].map((row, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-3 items-center p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 transition-colors"
                >
                  <div className="col-span-5 font-bold text-slate-200 truncate">
                    {row.source}
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-bold text-[10px] border border-emerald-500/30">
                      ➔ {row.match}
                    </span>
                  </div>
                  <div className="col-span-5 font-bold text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-500/30 truncate">
                    {row.canonical}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* --- LIVE INTERACTIVE DETECTOR SIMULATOR --- */}
      <section id="live-simulator" className="py-16 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="bg-[#0c1220] rounded-3xl border border-emerald-500/40 p-6 md:p-8 shadow-[0_0_40px_rgba(16,185,129,0.15)] space-y-6 relative overflow-hidden">
          <BorderBeam size={380} duration={12} colorFrom="#10B981" colorTo="#06B6D4" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-500 text-black">
                  <Activity className="w-4 h-4" />
                </span>
                <h2 className="text-lg md:text-xl font-black text-white">
                  Live Anomaly Detection & Cross-Examiner
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Select a hospital claim record below, then click <strong>"Run Detector Scan"</strong> to trigger real-time multi-detector cross-examination.
              </p>
            </div>

            {/* Case Selector Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {(["CLM-10293", "CLM-09283", "CLM-08741"] as const).map((cId) => (
                <button
                  key={cId}
                  onClick={() => {
                    setSelectedCaseId(cId);
                    setScanProgress(100);
                    setActiveStep(4);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all border shrink-0 ${
                    selectedCaseId === cId
                      ? "bg-emerald-500 text-black border-emerald-400 shadow-md"
                      : "bg-slate-900 text-slate-300 border-slate-800 hover:border-emerald-500/40 hover:text-white"
                  }`}
                >
                  {cId} {cId === "CLM-10293" ? "(Hero Case)" : ""}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Claim Metadata & Trigger (5 cols) */}
            <div className="lg:col-span-5 space-y-4 bg-slate-900/90 rounded-2xl border border-slate-800 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 block">NO. SEP: {casesData[selectedCaseId].sep}</span>
                  <h3 className="text-sm font-bold text-white">{casesData[selectedCaseId].provider}</h3>
                </div>
                <RiskPill score={94} level="CRITICAL" size="sm" />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Patient:</span>
                  <span className="font-bold text-slate-200">{casesData[selectedCaseId].patient}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Physician (DPJP):</span>
                  <span className="font-bold text-slate-200 truncate block">{casesData[selectedCaseId].dpjp}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-emerald-500/30 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Invoiced Amount (Billed):</span>
                  <span className="font-bold text-white">{formatRupiah(casesData[selectedCaseId].claimed)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Standard Approved Tariff:</span>
                  <span className="font-bold text-emerald-400">{formatRupiah(casesData[selectedCaseId].standard)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800 font-bold text-rose-400">
                  <span>Potential Overpayment Exposure:</span>
                  <span>{formatRupiah(casesData[selectedCaseId].exposure)}</span>
                </div>
              </div>

              <button
                onClick={handleRunScan}
                disabled={isScanning}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black text-xs font-black hover:opacity-90 disabled:opacity-50 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                {isScanning ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span>Executing Detector Suite ({scanProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-black" />
                    <span>Run Detector Scan on This Claim</span>
                  </>
                )}
              </button>

              <div className="space-y-1.5 pt-1 text-[11px]">
                {[
                  { step: 1, label: "INA-CBG Schema Normalization & Zod Validation" },
                  { step: 2, label: "Operating Room Log & Anesthesia Verification" },
                  { step: 3, label: "pgvector Cosine Distance Semantic Matching" },
                  { step: 4, label: "Medical Evidence Synthesis & Recommendation" },
                ].map((s) => (
                  <div key={s.step} className="flex items-center gap-2">
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                        activeStep >= s.step
                          ? "bg-emerald-500 text-black"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}
                    >
                      {activeStep >= s.step ? "✓" : s.step}
                    </span>
                    <span className={activeStep >= s.step ? "font-semibold text-slate-200" : "text-slate-500"}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Live Findings & Medical Evidence Verification (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="border border-slate-800 rounded-2xl p-4 bg-slate-900/90 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>Verified Deterministic Findings</span>
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30">
                    {casesData[selectedCaseId].findings.length} Anomaly Indicators
                  </span>
                </div>

                <div className="space-y-2.5">
                  {casesData[selectedCaseId].findings.map((f, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1 hover:border-emerald-500/40 transition-colors"
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-slate-200 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          {f.detector}
                        </span>
                        <span className="text-rose-400">{f.delta}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{f.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-amber-500/30 rounded-2xl p-4 bg-amber-950/20 space-y-2 text-xs">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>Medical Record Contradiction (Ground-Truth Discrepancy):</span>
                </span>
                <p className="text-amber-200/90 text-[11px] leading-relaxed bg-slate-950 p-3 rounded-xl border border-amber-500/20">
                  {casesData[selectedCaseId].docMismatch}
                </p>
                <div className="flex items-center justify-between text-[11px] text-amber-300 pt-1 font-semibold">
                  <span>Recommended Determination: <strong className="text-rose-400">CONFIRMED RISK</strong></span>
                  <Link href={`/investigations/INV-2026-${selectedCaseId.replace("CLM-", "")}`} className="text-emerald-400 font-bold hover:underline flex items-center gap-1">
                    <span>Open Investigation Workspace</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- BEFORE VS AFTER COMPARISON SANDBOX --- */}
      <section id="comparison" className="py-20 px-6 md:px-12 bg-slate-950/60 border-y border-slate-800 relative">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
              <Scale className="w-3.5 h-3.5" />
              <span>Paradigm Shift</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Conventional Manual Audits vs JKN Risk Intelligence
            </h2>
            <p className="text-xs text-slate-400">
              Transforming slow manual sampling into an automated, evidence-grounded intelligence census.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Before Card */}
            <div className="bg-[#0c1220] rounded-3xl border border-slate-800 p-6 md:p-8 space-y-4 shadow-xl hover:border-rose-500/40 transition-colors">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-black uppercase text-rose-400">Legacy Method (Manual Sampling)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold">Reactive</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">✕</span>
                  <span><strong>Low Audit Coverage:</strong> Only 8-12% of claims are manually sampled due to capacity limits.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">✕</span>
                  <span><strong>Slow Dispute Cycles:</strong> Takes 4-6 weeks after payment to detect discrepancies (post-payment clawbacks).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">✕</span>
                  <span><strong>High Provider Friction:</strong> Denials are frequently contested due to lack of explicit document citations.</span>
                </li>
              </ul>
            </div>

            {/* After Card */}
            <div className="bg-[#0c1220] rounded-3xl border border-emerald-500/50 p-6 md:p-8 space-y-4 shadow-[0_0_30px_rgba(16,185,129,0.15)] relative overflow-hidden hover:scale-[1.01] transition-transform">
              <BorderBeam size={280} duration={9} colorFrom="#10B981" colorTo="#06B6D4" />
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-black uppercase text-emerald-400">JKN Risk Intelligence (AI Suite)</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500 text-black font-black">Proactive & Census</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-200">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>100% Automated Census:</strong> Every single claim across all hospitals is analyzed in &lt; 1.2 seconds.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Pre-Payment Prevention:</strong> Blocks overpayments before funds leave the national health insurance treasury.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Irrefutable Evidence Citations:</strong> Pins specific medical record document IDs to ensure zero hallucination.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* --- LIVE INTERACTIVE FINANCIAL RECOVERY CALCULATOR --- */}
      <section id="roi-calculator" className="py-20 px-6 md:px-12 max-w-7xl mx-auto space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
            <Sliders className="w-3.5 h-3.5" />
            <span>Financial Mitigation Simulator</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            JKN Fund Recovery & ROI Calculator
          </h2>
          <p className="text-xs text-slate-400">
            Adjust the operational parameters below to estimate annual budget protection and auditor hour savings.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#0c1220] p-6 md:p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
          <BorderBeam size={350} duration={14} colorFrom="#10B981" colorTo="#06B6D4" />

          {/* Left: Dynamic Sliders (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-300">Monthly Claim Inflow Volume:</span>
                <span className="text-emerald-400 font-mono">{formatNumber(claimVolume)} Claims / month</span>
              </div>
              <input
                type="range"
                min={50000}
                max={2000000}
                step={25000}
                value={claimVolume}
                onChange={(e) => setClaimVolume(Number(e.target.value))}
                className="w-full accent-emerald-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>50,000 (Regional Hospital)</span>
                <span>1,000,000 (Province Scale)</span>
                <span>2,000,000 (National Scale)</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-300">Average Value per Claim:</span>
                <span className="text-emerald-400 font-mono">{formatRupiah(avgClaimAmount)}</span>
              </div>
              <input
                type="range"
                min={3000000}
                max={20000000}
                step={500000}
                value={avgClaimAmount}
                onChange={(e) => setAvgClaimAmount(Number(e.target.value))}
                className="w-full accent-emerald-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Rp 3M (Outpatient)</span>
                <span>Rp 10M (General Surgery)</span>
                <span>Rp 20M (Subspecialist Care)</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-300">Estimated Anomaly Rate:</span>
                <span className="text-rose-400 font-mono">{anomalyRate.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min={1.0}
                max={12.0}
                step={0.2}
                value={anomalyRate}
                onChange={(e) => setAnomalyRate(Number(e.target.value))}
                className="w-full accent-rose-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>1.0% (Well-Monitored Providers)</span>
                <span>5.0% (National Benchmark)</span>
                <span>12.0% (High-Risk Syndicate)</span>
              </div>
            </div>
          </div>

          {/* Right: Real-time Output Card (5 cols) */}
          <div className="lg:col-span-5 bg-slate-950 rounded-2xl border border-emerald-500/40 p-6 shadow-card space-y-4 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Estimated Annual Budget Preservation
            </span>

            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-1">
              <span className="text-xs text-emerald-400 font-bold block">Potential Preserved Funds:</span>
              <span className="text-2xl sm:text-3xl font-black text-white block font-mono">
                {formatRupiah(estimatedRecoveryYearly, true)}
              </span>
              <span className="text-[10px] text-emerald-400/80 font-medium">Based on 88% verified recovery ratio</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Auditor Time Saved</span>
                <span className="font-bold text-white">{formatNumber(auditHoursSaved)} Hours</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Audit Coverage</span>
                <span className="font-bold text-emerald-400">100% Census</span>
              </div>
            </div>

            <Link href="/">
              <ShimmerButton className="w-full text-xs font-bold py-3">
                <span className="flex items-center justify-center gap-2 text-white">
                  <span>Open Dashboard for Live Audits</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </ShimmerButton>
            </Link>
          </div>
        </div>
      </section>

      {/* --- FORENSIC QUERY CONSOLE & TERMINAL --- */}
      <section id="query-console" className="py-20 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
              <TerminalIcon className="w-3.5 h-3.5" />
              <span>Forensic Query Engine</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Clinical Vector & Rule Cross-Examiner
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Auditors can execute direct forensic queries using deterministic INA-CBG rules, pgvector cosine distance metrics, and electronic medical record evidence matching.
            </p>

            <div className="space-y-2 pt-2">
              {consoleQueries.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveConsoleQuery(idx)}
                  className={`w-full text-left p-3 rounded-xl border text-xs font-mono transition-all flex items-center justify-between ${
                    activeConsoleQuery === idx
                      ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-300 font-bold"
                      : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  <span className="truncate">{q.command}</span>
                  <ChevronRight className="w-4 h-4 shrink-0 text-emerald-400" />
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="bg-[#050914] rounded-3xl border border-slate-800 p-6 shadow-2xl space-y-3 font-mono text-xs relative overflow-hidden">
              <BorderBeam size={250} duration={8} colorFrom="#10B981" colorTo="#8B5CF6" />

              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="text-[11px] text-slate-400 ml-2">arsa-forensic-cli v2.4 (sandbox)</span>
                </div>
                <span className="text-[10px] text-emerald-400">READY</span>
              </div>

              <div className="space-y-3 pt-1">
                <div className="text-emerald-400 font-bold">
                  $ {consoleQueries[activeConsoleQuery].command}
                </div>
                <pre className="text-slate-300 text-[11px] whitespace-pre-wrap leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800">
                  {consoleQueries[activeConsoleQuery].result}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- INSTITUTIONAL COMPLIANCE & LEGAL HARMONY --- */}
      <section id="compliance" className="py-20 px-6 md:px-12 bg-slate-950/60 border-t border-slate-800">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
              <Lock className="w-3.5 h-3.5" />
              <span>National Governance</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Enterprise Compliance & Data Governance
            </h2>
            <p className="text-xs text-slate-400">
              Built to strictly conform with Indonesian Healthcare Regulations, Personal Data Protection, and institutional audit trails.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Lock,
                title: "UU PDP No. 27/2022",
                desc: "Zero patient data exposure. Real-time de-identification masks NIK, BPJS ID, and patient names before vector processing.",
                badge: "Data Privacy",
              },
              {
                icon: ShieldCheck,
                title: "Permenkes INA-CBG",
                desc: "Compliant with Ministry of Health Tariff Regulations, clinical pathway guidelines, and severity level codification.",
                badge: "Tariff Integrity",
              },
              {
                icon: FileCheck2,
                title: "Immutable Audit Trail",
                desc: "Append-only SHA-256 ledger recording every investigator action, status change, and recommendation with forensic timestamps.",
                badge: "Cryptographic Log",
              },
              {
                icon: Cpu,
                title: "Private In-Premise LLM",
                desc: "Runs strictly on private institutional endpoints. Zero clinical medical records are transmitted to public cloud LLMs.",
                badge: "Sovereign AI",
              },
            ].map((card, idx) => {
              const Icon = card.icon;
              return (
                <div
                  key={idx}
                  className="bg-[#0c1220] rounded-2xl border border-slate-800 p-6 space-y-3 hover:border-emerald-500/40 hover:-translate-y-1 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 uppercase">
                      {card.badge}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* --- FREQUENTLY ASKED QUESTIONS --- */}
      <section className="py-20 px-6 md:px-12 max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Auditor FAQs</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-slate-400">
            Learn more about the architecture, compliance, and integration of the JKN Risk Intelligence platform.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-[#0c1220] rounded-2xl border border-slate-800 overflow-hidden transition-all"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full p-5 text-left flex items-center justify-between text-xs font-bold text-white hover:text-emerald-400 transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ml-4 ${
                    openFaq === idx ? "rotate-180 text-emerald-400" : ""
                  }`}
                />
              </button>
              {openFaq === idx && (
                <div className="px-5 pb-5 text-xs text-slate-300 leading-relaxed border-t border-slate-800/80 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="border-t border-slate-800 py-12 px-6 md:px-12 bg-[#050811] text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-emerald-500/30 flex items-center justify-center p-1">
              <img src="/arsa_logo.png" alt="ARSA" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-bold text-white block">JKN RISK INTELLIGENCE</span>
              <span className="text-[10px] text-slate-500">BPJS Kesehatan HealthKathon 2026 Innovation</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-[11px] font-semibold text-slate-400">
            <Link href="/" className="hover:text-emerald-400 transition-colors">Command Center</Link>
            <Link href="/investigation-queue" className="hover:text-emerald-400 transition-colors">Investigation Queue</Link>
            <Link href="/risk-intelligence" className="hover:text-emerald-400 transition-colors">Risk Intelligence</Link>
            <Link href="/data-management" className="hover:text-emerald-400 transition-colors">Data Onboarding</Link>
            <Link href="/reports" className="hover:text-emerald-400 transition-colors">Audit Dossiers</Link>
          </div>

          <p className="text-[10px] text-slate-500 text-center md:text-right">
            © 2026 ARSA Tech · BPJS Kesehatan National Claim Integrity Suite. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
