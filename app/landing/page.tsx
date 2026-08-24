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
      iconColor: "text-rose-600 bg-rose-50 border-rose-200",
    },
    {
      id: "N2",
      time: "2m ago",
      title: "Syndicate Pattern Identified",
      description: "Cluster #42: 96.4% duplicate CPPT clinical narrative matched across 12 claims.",
      exposure: "Cluster Match",
      badge: "HIGH RISK",
      icon: NetworkIcon,
      iconColor: "text-purple-600 bg-purple-50 border-purple-200",
    },
    {
      id: "N3",
      time: "5m ago",
      title: "Phantom Procedure Pre-empted",
      description: "Unverified laparoscopic surgical package 44.95 missing operating room logs.",
      exposure: "+Rp 12,500,000",
      badge: "PREVENTED",
      icon: Lock,
      iconColor: "text-teal-600 bg-teal-50 border-teal-200",
    },
    {
      id: "N4",
      time: "8m ago",
      title: "Abnormal Length of Stay (LOS)",
      description: "Pneumonia stay of 6 days significantly exceeds national peer median of 2.2 days.",
      exposure: "+3.8 Days Dev",
      badge: "AUDIT REQ",
      icon: Clock,
      iconColor: "text-amber-600 bg-amber-50 border-amber-200",
    },
    {
      id: "N5",
      time: "12m ago",
      title: "National Telemetry Ingested",
      description: "1,284,392 claims parsed with 100% Zod deterministic validation & UU PDP masking.",
      exposure: "100% Census",
      badge: "VERIFIED",
      icon: CheckCircle2,
      iconColor: "text-emerald-600 bg-emerald-50 border-emerald-200",
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-emerald-500 selection:text-white overflow-x-hidden">
      {/* Subtle Light Perspective Grid */}
      <RetroGrid className="opacity-15" />

      {/* Ambient Lighting Glows (Light Mode) */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[500px] bg-gradient-to-tr from-emerald-200/30 via-teal-100/25 to-sky-100/20 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-tl from-emerald-100/40 via-slate-100/20 to-transparent rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Top Dynamic Floating Glass Navigation (Light Mode Island) */}
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
          "transition-colors duration-300 shadow-sm",
          isScrolled
            ? "bg-white/95 backdrop-blur-2xl border border-slate-200 shadow-[0_12px_32px_rgba(0,0,0,0.08),0_0_20px_rgba(16,185,129,0.12)]"
            : "bg-white/85 backdrop-blur-xl border border-slate-200/80"
        )}
      >
        {/* Column 1: Brand (Left-aligned, flex-1) */}
        <div className="flex-1 flex items-center justify-start gap-2.5">
          <div
            className={cn(
              "rounded-xl bg-white border border-slate-200 flex items-center justify-center p-1 shadow-xs shrink-0 overflow-hidden transition-all duration-300",
              isScrolled ? "w-8 h-8 rounded-lg" : "w-9 h-9"
            )}
          >
            <img src="/arsa_logo.png" alt="ARSA JKN" className="w-full h-full object-contain" />
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "font-black tracking-tight text-slate-900 transition-all duration-300 whitespace-nowrap",
                isScrolled ? "text-xs" : "text-sm"
              )}
            >
              JKN RISK
            </span>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold uppercase tracking-wider whitespace-nowrap">
              {isScrolled ? "PRO" : "REGTECH SUITE"}
            </span>
          </div>
        </div>

        {/* Column 2: Navigation Links (Dead Center, shrink-0) */}
        <div
          className={cn(
            "hidden md:flex items-center justify-center font-semibold text-slate-600 shrink-0 transition-all duration-300",
            isScrolled ? "gap-4 text-[11px]" : "gap-6 text-xs"
          )}
        >
          <a href="#bento-features" className="hover:text-emerald-700 transition-colors flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            <span>Suite</span>
          </a>
          <a href="#live-simulator" className="hover:text-emerald-700 transition-colors">Detector</a>
          <a href="#comparison" className="hover:text-emerald-700 transition-colors">Before/After</a>
          <a href="#roi-calculator" className="hover:text-emerald-700 transition-colors">Recovery ROI</a>
          <a href="#query-console" className="hover:text-emerald-700 transition-colors">Console</a>
          <a href="#compliance" className="hover:text-emerald-700 transition-colors">Compliance</a>
        </div>

        {/* Column 3: Live CTA (Right-aligned, flex-1) */}
        <div className="flex-1 flex items-center justify-end gap-2.5">
          <Link
            href="/"
            className={cn(
              "rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 whitespace-nowrap",
              isScrolled ? "text-[11px] px-3.5 py-1.5 rounded-full" : "text-xs px-4 py-2"
            )}
          >
            <span>Launch Live App</span>
            <ArrowRight className={cn("transition-all duration-300", isScrolled ? "w-3 h-3" : "w-3.5 h-3.5")} />
          </Link>
        </div>
      </motion.nav>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-32 md:pt-44 pb-20 px-4 sm:px-6 max-w-7xl mx-auto text-center space-y-8">
        {/* Animated Badge Pill */}
        <div className="inline-flex items-center justify-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span className="text-xs font-bold text-emerald-800 tracking-tight">
              Enterprise RegTech AI Suite for BPJS Kesehatan
            </span>
          </div>
        </div>

        {/* Dynamic Rotating Headline */}
        <div className="max-w-4xl mx-auto space-y-4">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-slate-900 leading-[1.1]">
            Next-Gen Intelligence against{" "}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 bg-clip-text text-transparent">
              Healthcare Claim Fraud
            </span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Unifying multi-detector anomaly auditing, pgvector semantic clinical matching, and explainable AI dossiers to protect national JKN funds with 100% grounded evidence.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link
            href="/"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-600 text-white font-bold text-sm shadow-md hover:bg-emerald-700 hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <ShieldCheck className="w-5 h-5" />
            <span>Open Command Center</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/investigations/INV-2026-10293"
            className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-white text-slate-800 font-bold text-sm border border-slate-200 shadow-xs hover:bg-slate-50 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <FileSearch className="w-4 h-4 text-emerald-600" />
            <span>Inspect Hero Case Dossier</span>
          </Link>
        </div>

        {/* Dual Visual Container: Orbiting Circles (Left) + Live Stream Notification (Right) */}
        <div className="pt-10 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left Box: Orbiting Circles (5 cols) */}
            <div className="lg:col-span-5 relative h-[360px] sm:h-[400px] rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden">
              <span className="pointer-events-none whitespace-pre-wrap bg-gradient-to-b from-slate-900 to-slate-600 bg-clip-text text-center text-4xl font-black leading-none text-transparent">
                ARSA Engine
              </span>

              {/* Inner Orbit Circles */}
              <OrbitingCircles radius={68} duration={20} delay={0}>
                <div className="p-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-sm">
                  <ShieldAlert className="w-4 h-4" />
                </div>
              </OrbitingCircles>
              <OrbitingCircles radius={68} duration={20} delay={10}>
                <div className="p-2 rounded-full bg-teal-50 border border-teal-200 text-teal-700 shadow-sm">
                  <Lock className="w-4 h-4" />
                </div>
              </OrbitingCircles>

              {/* Outer Orbit Circles */}
              <OrbitingCircles radius={135} duration={32} delay={0} reverse>
                <div className="p-2.5 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-700 shadow-sm">
                  <NetworkIcon className="w-4 h-4" />
                </div>
              </OrbitingCircles>
              <OrbitingCircles radius={135} duration={32} delay={11} reverse>
                <div className="p-2.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
              </OrbitingCircles>
              <OrbitingCircles radius={135} duration={32} delay={22} reverse>
                <div className="p-2.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 shadow-sm">
                  <Activity className="w-4 h-4" />
                </div>
              </OrbitingCircles>
            </div>

            {/* Right Box: Live Urgent Risk Stream via AnimatedList (7 cols) */}
            <div className="lg:col-span-7 relative rounded-3xl bg-white border border-slate-200 shadow-sm p-6 flex flex-col justify-between overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-slate-800">Live AI Telemetry Stream</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  Active Monitoring
                </span>
              </div>

              {/* Live Streaming List */}
              <div className="relative h-[280px] overflow-hidden flex flex-col justify-center">
                <AnimatedList delay={1800}>
                  {urgentAlertsList.map((item) => {
                    const IconComp = item.icon;
                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/80 shadow-xs flex items-center justify-between gap-3 text-left hover:border-emerald-300 hover:bg-white transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn("p-2 rounded-xl border shrink-0", item.iconColor)}>
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 truncate">{item.title}</span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-white border border-slate-200 text-slate-600">
                                {item.time}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">{item.description}</p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            {item.exposure}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </AnimatedList>
              </div>

              {/* Footer Indicator */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>100% Grounded in Evidence (UU PDP Compliant)</span>
                <Link href="/claims" className="text-emerald-700 font-bold hover:underline flex items-center gap-1">
                  <span>View All Claims</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Live Ticker Bar */}
        <div className="max-w-4xl mx-auto rounded-2xl bg-white border border-slate-200 p-3 shadow-xs flex items-center gap-3 overflow-hidden text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 font-bold shrink-0 border border-emerald-200">
            <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>RADAR</span>
          </div>

          <div className="overflow-hidden whitespace-nowrap w-full">
            <Marquee pauseOnHover className="[--duration:25s]">
              {liveTickerAlerts.map((t, idx) => (
                <div key={idx} className="flex items-center gap-2 mx-4 font-medium text-slate-700">
                  <span
                    className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded font-extrabold",
                      t.type === "CRITICAL"
                        ? "bg-rose-100 text-rose-700 border border-rose-200"
                        : t.type === "WARNING"
                        ? "bg-amber-100 text-amber-700 border border-amber-200"
                        : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                    )}
                  >
                    {t.type}
                  </span>
                  <span>{t.text}</span>
                </div>
              ))}
            </Marquee>
          </div>
        </div>
      </section>

      {/* --- STATS & METRICS SECTION --- */}
      <section className="py-12 border-y border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="text-3xl sm:text-4xl font-black text-slate-900">
              <NumberTicker value={1284392} />
            </div>
            <div className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-wider">Claims Ingested (Census)</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="text-3xl sm:text-4xl font-black text-emerald-600">
              Rp <NumberTicker value={824} /> B
            </div>
            <div className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-wider">Exposure Identified</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="text-3xl sm:text-4xl font-black text-slate-900">
              <NumberTicker value={96} />.4%
            </div>
            <div className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-wider">Vector Semantic Match</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="text-3xl sm:text-4xl font-black text-emerald-600">
              &lt; <NumberTicker value={2} /> Min
            </div>
            <div className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-wider">Audit Investigation Speed</div>
          </div>
        </div>
      </section>

      {/* --- BENTO GRID: 4 CORE PILLARS --- */}
      <section id="bento-features" className="py-24 px-4 sm:px-6 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <span className="text-xs font-extrabold text-emerald-700 tracking-wider uppercase px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
            Unified Core Architecture
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Designed for National Scale RegTech Operations
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            From raw hospital EHR dumps to court-admissible forensic dossiers, every stage is optimized for accuracy, privacy, and explainability.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Card 1: 34-Province Geospatial Risk Radar (7 cols) */}
          <div className="md:col-span-7 rounded-3xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <MapIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">National Geospatial Risk Radar</h3>
                  <p className="text-xs text-slate-500">Live 34-province claim risk heat map with anomaly clustering</p>
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                Interactive
              </span>
            </div>

            <div className="h-[260px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
              <IndonesiaRiskMap provinceData={provinces} onSelectProvince={() => {}} />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>DKI Jakarta, West Java & East Java exhibit highest severity-3 concentration.</span>
              <Link href="/" className="text-emerald-700 font-bold hover:underline flex items-center gap-1">
                <span>View Full Map</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Card 2: Relationship Graph & Syndicate Mapping (5 cols) */}
          <div className="md:col-span-5 rounded-3xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
                  <NetworkIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Syndicate Relation Graph</h3>
                  <p className="text-xs text-slate-500">Cross-hospital doctor & duplicate narrative graph</p>
                </div>
              </div>
            </div>

            <div className="h-[260px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 p-2">
              <NetworkGraphView />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>Identifies repeat physician patterns and multi-claim cloning.</span>
              <Link href="/risk-intelligence" className="text-emerald-700 font-bold hover:underline flex items-center gap-1">
                <span>Inspect Graph</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Card 3: Evidence Board & Medical Discrepancy (6 cols) */}
          <div className="md:col-span-6 rounded-3xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Explainable Digital Evidence Board</h3>
                <p className="text-xs text-slate-500">Every AI assertion mapped against digital EMR citations</p>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-start gap-3">
                <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px] shrink-0">
                  CONTRADICTS
                </span>
                <div>
                  <span className="font-bold text-slate-900">DOC-01 Medical Discharge Summary:</span>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    "Patient in good condition, mild dehydration, oral therapy adequate." Contradicts billed Severity Level 3 tariff (+Rp 14.65M).
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-start gap-3">
                <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px] shrink-0">
                  MISSING
                </span>
                <div>
                  <span className="font-bold text-slate-900">Operating Room Log (44.95):</span>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    Zero record of surgical suite scheduling or anesthesia log for claimed laparoscopic procedure.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Source-Agnostic AI Schema Normalizer (6 cols) */}
          <div className="md:col-span-6 rounded-3xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Source-Agnostic Ingestion Engine</h3>
                  <p className="text-xs text-slate-500">Auto-aligns hospital EHR exports with 96% confidence</p>
                </div>
              </div>
              <Link href="/data-management" className="text-xs text-emerald-700 font-bold hover:underline">
                Upload CSV →
              </Link>
            </div>

            <div className="space-y-2 pt-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-700">NO_KLAIM (SIMRS)</span>
                <span className="text-emerald-700 font-bold">➔ claim_id (98% Match)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-700">DIAGNOSIS_ICD (EHR)</span>
                <span className="text-emerald-700 font-bold">➔ primary_diagnosis (95% Match)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-700">BIAYA_TAGIHAN (Invoice)</span>
                <span className="text-emerald-700 font-bold">➔ claim_amount (96% Match)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- LIVE ANOMALY DETECTOR SIMULATOR --- */}
      <section id="live-simulator" className="py-24 px-4 sm:px-6 max-w-7xl mx-auto space-y-10">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <span className="text-xs font-extrabold text-emerald-700 tracking-wider uppercase px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
            Interactive Live Sandbox
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Test the Forensic Risk Engine
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Select a synthetic claim below and execute real-time multi-detector verification.
          </p>
        </div>

        {/* Case Switcher Tabs */}
        <div className="flex flex-wrap justify-center gap-3">
          {(["CLM-10293", "CLM-09283", "CLM-08741"] as const).map((id) => (
            <button
              key={id}
              onClick={() => setSelectedCaseId(id)}
              className={cn(
                "px-5 py-3 rounded-2xl border text-xs font-bold transition-all flex items-center gap-2",
                selectedCaseId === id
                  ? "bg-white border-emerald-500 text-emerald-700 shadow-sm ring-2 ring-emerald-500/20"
                  : "bg-white/80 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <span className="font-mono">{id}</span>
              <span className="text-[10px] text-slate-400">({casesData[id].provider.split(" ")[0]} RS)</span>
            </button>
          ))}
        </div>

        {/* Detector Workbench Card */}
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6 sm:p-8 space-y-8">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-bold text-slate-900">{casesData[selectedCaseId].id}</span>
                <span className="text-[10px] font-mono text-slate-500">SEP: {casesData[selectedCaseId].sep}</span>
                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-extrabold text-[10px] border border-rose-200">
                  FLAGGED
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {casesData[selectedCaseId].patient} · {casesData[selectedCaseId].provider} · Attending: {casesData[selectedCaseId].dpjp}
              </p>
            </div>

            <button
              onClick={handleRunScan}
              disabled={isScanning}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-sm active:scale-95"
            >
              {isScanning ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Scanning Multi-Detectors...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Re-Run AI Forensic Audit</span>
                </>
              )}
            </button>
          </div>

          {/* Detector Findings Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tariff Comparison Box */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="text-xs font-bold text-slate-700">Financial Exposure Breakdown</div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Billed Amount:</span>
                  <span className="font-mono font-bold text-slate-900">{formatRupiah(casesData[selectedCaseId].claimed)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Standard Tariff:</span>
                  <span className="font-mono font-bold text-emerald-700">{formatRupiah(casesData[selectedCaseId].standard)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold">
                  <span className="text-rose-700">Unwarranted Variance:</span>
                  <span className="font-mono text-rose-700 text-sm">+{formatRupiah(casesData[selectedCaseId].exposure)}</span>
                </div>
              </div>
            </div>

            {/* Findings List (2 cols) */}
            <div className="lg:col-span-2 space-y-3">
              <div className="text-xs font-bold text-slate-700">Triggered Forensic Detectors:</div>
              <div className="space-y-2">
                {casesData[selectedCaseId].findings.map((f, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{f.detector}</span>
                        <span className="px-2 py-0.2 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">
                          {f.risk}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">{f.detail}</p>
                    </div>
                    <span className="font-mono font-bold text-rose-700 text-[11px] shrink-0 bg-white px-2 py-1 rounded border border-slate-200">
                      {f.delta}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- PARADIGM SHIFT: BEFORE VS AFTER --- */}
      <section id="comparison" className="py-24 px-4 sm:px-6 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <span className="text-xs font-extrabold text-emerald-700 tracking-wider uppercase px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
            RegTech Transformation
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Moving from Reactive Sampling to 100% Census Intelligence
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* Traditional Way */}
          <div className="p-8 rounded-3xl bg-slate-100/80 border border-slate-200 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-slate-200 text-slate-700">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Traditional Sampling (Status Quo)</h3>
                <p className="text-xs text-slate-500">Random 5-10% post-payment human spot checks</p>
              </div>
            </div>

            <ul className="space-y-3 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-rose-500 font-bold">✕</span>
                <span><strong>90%+ Unchecked Claims:</strong> Sophisticated cloning and systemic upcoding bypass spot audits.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-500 font-bold">✕</span>
                <span><strong>4 to 6 Weeks Latency:</strong> Manual retrieval of paper and PDF records prolongs dispute resolution.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-500 font-bold">✕</span>
                <span><strong>Zero Cross-Hospital Vision:</strong> Cannot detect syndicated copy-paste narratives across facilities.</span>
              </li>
            </ul>
          </div>

          {/* ARSA Way */}
          <div className="p-8 rounded-3xl bg-gradient-to-b from-emerald-50/80 to-white border border-emerald-200 shadow-md space-y-6 relative overflow-hidden">
            <BorderBeam size={200} duration={12} delay={9} colorFrom="#10b981" colorTo="#059669" />
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-600 text-white shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">JKN Risk Intelligence Platform</h3>
                <p className="text-xs text-emerald-700 font-bold">100% Census Ingestion & AI Evidence Grounding</p>
              </div>
            </div>

            <ul className="space-y-3 text-xs text-slate-700 font-medium">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>100% Census Automated Auditing:</strong> Every single submitted claim verified in seconds.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>pgvector Semantic Matching:</strong> 96.4% duplicate narrative match catches syndicate cloning.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Court-Admissible Dossiers:</strong> Instant PDF & summary reports with immutable audit trail.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* --- INTERACTIVE ROI CALCULATOR --- */}
      <section id="roi-calculator" className="py-24 px-4 sm:px-6 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <span className="text-xs font-extrabold text-emerald-700 tracking-wider uppercase px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
            Measurable Impact
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Financial Impact & Fraud Recovery Calculator
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Estimate potential fund protection based on regional or national claim volume.
          </p>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Sliders (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-800 mb-2">
                <span>Monthly Claim Volume</span>
                <span className="text-emerald-700 font-mono">{formatNumber(claimVolume)} Claims / mo</span>
              </div>
              <input
                type="range"
                min="50000"
                max="2000000"
                step="50000"
                value={claimVolume}
                onChange={(e) => setClaimVolume(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-800 mb-2">
                <span>Average Inpatient Claim Amount</span>
                <span className="text-emerald-700 font-mono">{formatRupiah(avgClaimAmount)}</span>
              </div>
              <input
                type="range"
                min="3000000"
                max="25000000"
                step="500000"
                value={avgClaimAmount}
                onChange={(e) => setAvgClaimAmount(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-800 mb-2">
                <span>Estimated Anomaly Rate</span>
                <span className="text-emerald-700 font-mono">{anomalyRate}%</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="12.0"
                step="0.2"
                value={anomalyRate}
                onChange={(e) => setAnomalyRate(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
            </div>
          </div>

          {/* Result Card (5 cols) */}
          <div className="lg:col-span-5 p-6 rounded-2xl bg-gradient-to-b from-emerald-50 to-white border border-emerald-200 text-center space-y-4 shadow-sm">
            <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Estimated Annual Fund Protection</div>
            <div className="text-3xl sm:text-4xl font-black text-slate-900 font-mono">
              Rp {formatNumber(Math.round(estimatedRecoveryYearly / 1000000000))} Miliar
            </div>
            <p className="text-xs text-slate-600">
              Recoverable through automated pre-payment and post-payment disallowances.
            </p>
            <div className="pt-3 border-t border-emerald-200/60 text-xs text-slate-600 flex justify-around">
              <div>
                <div className="font-bold text-slate-900 font-mono">{formatNumber(auditHoursSaved)} hrs</div>
                <div className="text-[10px] text-slate-500">Auditor Hours Saved</div>
              </div>
              <div>
                <div className="font-bold text-slate-900 font-mono">88.4%</div>
                <div className="text-[10px] text-slate-500">Recovery Rate</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- FORENSIC QUERY CONSOLE --- */}
      <section id="query-console" className="py-24 px-4 sm:px-6 max-w-7xl mx-auto space-y-10">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <span className="text-xs font-extrabold text-emerald-700 tracking-wider uppercase px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
            Auditor CLI & AI Copilot
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Conversational Investigation & Instant Querying
          </h2>
        </div>

        <div className="rounded-3xl bg-slate-950 text-slate-100 p-6 sm:p-8 shadow-xl border border-slate-800 space-y-6 font-mono text-xs">
          <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-800">
            {consoleQueries.map((q, idx) => (
              <button
                key={idx}
                onClick={() => setActiveConsoleQuery(idx)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs transition-all",
                  activeConsoleQuery === idx
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                )}
              >
                Query #{idx + 1}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <div className="text-slate-500 text-[11px]">// Executing Auditor Diagnostic Command:</div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 font-bold">
              $ {consoleQueries[activeConsoleQuery].command}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 whitespace-pre-wrap leading-relaxed text-slate-300 text-[11px]">
            {consoleQueries[activeConsoleQuery].result}
          </div>
        </div>
      </section>

      {/* --- FAQ SECTION --- */}
      <section id="compliance" className="py-24 px-4 sm:px-6 max-w-4xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <span className="text-xs font-extrabold text-emerald-700 tracking-wider uppercase px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
            Transparency & Security
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((f, idx) => (
            <div
              key={idx}
              onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
              className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs cursor-pointer hover:border-emerald-300 transition-all space-y-2"
            >
              <div className="flex items-center justify-between font-bold text-xs sm:text-sm text-slate-900">
                <span>{f.q}</span>
                <ChevronDown className={cn("w-4 h-4 text-slate-500 transition-transform", openFaq === idx && "rotate-180")} />
              </div>
              {openFaq === idx && (
                <p className="text-xs text-slate-600 leading-relaxed pt-2 border-t border-slate-100">
                  {f.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* --- BOTTOM CTA BANNER --- */}
      <section className="py-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-8 sm:p-14 text-center text-white shadow-xl space-y-6">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight max-w-3xl mx-auto leading-tight">
            Safeguard Indonesia's Healthcare Future with Grounded AI
          </h2>
          <p className="text-sm sm:text-base text-emerald-100 max-w-2xl mx-auto">
            Ready to explore the live investigation queue and inspect multi-detector forensic dossiers?
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/"
              className="px-8 py-4 rounded-2xl bg-white text-emerald-800 font-extrabold text-sm shadow-lg hover:bg-emerald-50 transition-all flex items-center gap-2 active:scale-95"
            >
              <span>Launch Live Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/investigations/INV-2026-10293"
              className="px-7 py-4 rounded-2xl bg-emerald-700/60 text-white font-bold text-sm border border-emerald-400/40 hover:bg-emerald-700 transition-all flex items-center gap-2"
            >
              <span>Hero Case Dossier</span>
            </Link>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-12 border-t border-slate-200 bg-slate-50 text-xs text-slate-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/arsa_logo.png" alt="ARSA JKN" className="w-6 h-6 object-contain" />
            <span className="font-bold text-slate-900">JKN Risk Intelligence Platform</span>
            <span>· BPJS Kesehatan AI Hackathon Edition</span>
          </div>

          <div className="flex items-center gap-6 text-slate-500">
            <Link href="/" className="hover:text-emerald-700">Dashboard</Link>
            <Link href="/claims" className="hover:text-emerald-700">Claims</Link>
            <Link href="/providers" className="hover:text-emerald-700">Providers</Link>
            <Link href="/copilot" className="hover:text-emerald-700">AI Copilot</Link>
            <Link href="/data-management" className="hover:text-emerald-700">Data Onboarding</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
