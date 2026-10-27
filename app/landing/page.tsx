"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { PROVENANCE_SUMMARY } from "@/lib/data/provenance";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useSpring,
  useInView,
  type MotionValue,
} from "framer-motion";
import {
  Sparkles,
  ChevronRight,
  ChevronDown,
  Search,
  Plus,
  Download,
  Bell,
  LayoutGrid,
  FolderKanban,
  FileCheck2,
  Building2,
  Network,
  Settings,
  Zap,
  Users,
  Layers,
  TrendingUp,
  Pause,
  Play,
  Square,
  ShieldCheck,
  Database,
  FileSpreadsheet,
  Cpu,
  FileText,
  Globe,
  Phone,
  Link2,
  CheckCircle2,
  Activity,
  ArrowUpRight,
} from "lucide-react";
import { formatNumber } from "@/lib/formatting/currency";
import { HeroDashboardMock } from "@/components/landing/HeroDashboardMock";
import { PublicStats, RISK_LABEL } from "@/components/landing/stats";
import { AuditChainCard, CopilotCard, OverviewCard, PriorityQueueCard } from "@/components/landing/BentoCards";
import { REQUIRED_FIELDS } from "@/lib/ingest/canonical";


const AVATARS = [
  "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?auto=format&fit=crop&w=200&q=80",
];

// Hospital photos for card backdrops
const HOSPITAL_BACKDROPS = [
  "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=900&q=80",
];

// Orbit positions (angle in degrees, radius in px, size in px)
const ORBIT_AVATARS = [
  { src: AVATARS[0], angle: 25, radius: 102, size: 40 },
  { src: AVATARS[1], angle: 85, radius: 74, size: 36 },
  { src: AVATARS[2], angle: 145, radius: 104, size: 40 },
  { src: AVATARS[3], angle: 205, radius: 76, size: 42 },
  { src: AVATARS[4], angle: 265, radius: 102, size: 36 },
  { src: AVATARS[5], angle: 325, radius: 78, size: 40 },
];

const ADVANTAGES = [
  {
    num: "01.",
    badge: "RBAC & Komite Medis",
    title: "Selaras untuk Tim Audit & Komite Medis",
    description:
      "Menyatukan verifikator klaim, auditor forensik, dan supervisor RS/BPJS dalam satu papan bukti bersama dengan otorisasi berjenjang.",
    metricLabel: "Otorisasi Berjenjang",
    metricValue: "3 Peran Terpadu",
    icon: Users,
    backdrop: HOSPITAL_BACKDROPS[0],
  },
  {
    num: "02.",
    badge: "Antrean Terprioritas",
    title: "Pangkas Kerja Manual",
    description:
      "ARSA memadukan penyaringan 8 detektor klinis, visibilitas bukti verbatim, dan penyelarasan tim agar Anda fokus pada klaim krusial.",
    metricLabel: "Urutan Telaah",
    metricValue: "Skor Risiko 0-100",
    icon: Zap,
    backdrop: HOSPITAL_BACKDROPS[1],
  },
  {
    num: "03.",
    badge: `${REQUIRED_FIELDS.length}/${REQUIRED_FIELDS.length} Kolom Wajib`,
    title: "Terhubung Lintas Sistem RS",
    description:
      "Menerima ekspor klaim multi-format (CSV, XLSX, JSON) dari berbagai skema SIMRS rumah sakit otomatis dengan pemetaan kolom berbasis AI.",
    metricLabel: "Kompatibilitas Skema",
    metricValue: "Multi-SIMRS & e-Klaim",
    icon: Layers,
    backdrop: HOSPITAL_BACKDROPS[2],
  },
  {
    num: "04.",
    badge: "pgvector HNSW",
    title: "Skalabel Seiring Pertumbuhan",
    description:
      "Dirancang untuk menyaring ribuan klaim INA-CBG secara sensus lintas provinsi dengan pencarian kemiripan vektor.",
    metricLabel: "Cakupan Pengawasan",
    metricValue: "Lintas Provinsi",
    icon: TrendingUp,
    backdrop: HOSPITAL_BACKDROPS[3],
  },
];

const FAQS = [
  {
    q: "Bagaimana cara ARSA menggunakan AI dalam audit klaim rumah sakit?",
    a: "ARSA menggunakan 8 detektor deterministik dan pencarian kemiripan vektor pgvector untuk mengidentifikasi anomali klaim INA-CBG secara objektif, mengoptimalkan antrean prioritas harian, dan menyusun ringkasan bukti rekam medis dengan sitasi verbatim tanpa halusinasi.",
  },
  {
    q: "Apakah ARSA cocok untuk kolaborasi tim verifikator dan komite medis RS?",
    a: "Ya. ARSA menyediakan kontrol akses berbasis peran (Investigator, Supervisor, dan Admin) sehingga verifikator dapat menelaah bukti klaim dan meminta dokumen tambahan ke faskes, sementara keputusan akhir dikonfirmasi oleh supervisor dengan alasan tertulis wajib.",
  },
  {
    q: "Bagaimana perlindungan privasi data pasien (UU PDP No. 27/2022) di ARSA?",
    a: "Seluruh identitas langsung seperti NIK 16 digit, nomor kartu BPJS, nama lengkap, dan alamat dianonimisasi menggunakan token kriptografis HMAC-SHA256 di memori sebelum disimpan ke basis data.",
  },
  {
    q: "Apakah ARSA menggantikan peran verifikator manusia?",
    a: "Tidak. ARSA berfungsi sebagai intelijen pendukung keputusan (Decision-Support Copilot) yang memprioritaskan berkas yang perlu ditelaah lebih dulu, sementara keputusan hukum dan klinis tetap 100% di tangan manusia.",
  },
];

const STATEMENT_WORDS =
  "ARSA membantu verifikator menyaring klaim INA-CBG, memprioritaskan risiko, dan membedah rekam medis, sehingga ribuan klaim yang tersebar berubah menjadi keputusan yang bisa dipertanggungjawabkan.".split(
    " "
  );

function ScrollWord({
  word,
  progress,
  range,
  isHighlight,
}: {
  word: string;
  progress: MotionValue<number>;
  range: [number, number];
  isHighlight: boolean;
}) {
  const opacity = useTransform(progress, range, [0.22, 1]);
  const y = useTransform(progress, range, [4, 0]);
  return (
    <motion.span
      style={{ opacity, y }}
      className={`inline-block mr-[0.28em] transition-colors ${
        isHighlight ? "text-[#174622] font-semibold" : "text-[#141A16]"
      }`}
    >
      {word}
    </motion.span>
  );
}

function AnimatedCounter({
  target,
  suffix = "",
}: {
  target: number;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let frame: number;
    const duration = 1200;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      setVal(Math.round(eased * target));
      if (elapsed < 1) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, target]);

  return (
    <span ref={ref}>
      {val}
      {suffix}
    </span>
  );
}

/**
 * Custom Visual Header tailored specifically to each of the 4 Advantage cards (01 - 04)
 */
function AdvantageCardVisual({
  index,
  isFeatured,
  backdrop,
  num,
  badge,
  stats,
}: {
  index: number;
  isFeatured: boolean;
  backdrop: string;
  num: string;
  badge: string;
  stats: PublicStats | null;
}) {
  return (
    <div className="relative h-48 w-full rounded-[22px] overflow-hidden select-none">
      {/* Hospital / Healthcare Architectural Backdrop */}
      <motion.img
        src={backdrop}
        alt=""
        animate={{
          scale: isFeatured ? [1.04, 1.12, 1.04] : 1.02,
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Rich Emerald JKN Healthcare Tint Overlay */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${
          isFeatured
            ? "bg-gradient-to-br from-[#0D2E16]/85 via-[#1B5228]/78 to-[#2E7D32]/85"
            : "bg-gradient-to-br from-[#12351B]/88 via-[#1B4624]/82 to-[#0F2915]/90"
        }`}
      />

      {/* Fine Medical Grid Overlay */}
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.45) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
      />

      {/* Top Bar Inside Visual Chamber: Number Pill + Specialized Badge */}
      <div className="relative z-10 flex items-center justify-between px-3.5 pt-3">
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-bold tracking-tight backdrop-blur-md border transition-colors ${
            isFeatured
              ? "bg-white text-[#14361B] border-white shadow-sm"
              : "bg-white/15 text-white/90 border-white/25"
          }`}
        >
          {num}
        </span>
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-400/20 text-emerald-100 border border-emerald-300/30 backdrop-blur-md">
          {badge}
        </span>
      </div>

      {/* ===============================================================
          UNIQUE BESPOKE GRAPHIC PER CARD (01, 02, 03, 04)
      ================================================================ */}
      <div className="relative z-10 h-[132px] px-3.5 flex items-center justify-center">
        {index === 0 && (
          /* 01: Selaras untuk Tim Audit & Komite Medis — Multi-Role Medical Sign-Off */
          <div className="w-full space-y-2">
            <div className="flex items-center justify-center gap-2">
              {[
                { role: "Verifikator", img: AVATARS[0] },
                { role: "DPJP Medis", img: AVATARS[1] },
                { role: "Supervisor", img: AVATARS[2] },
              ].map((member, i) => (
                <motion.div
                  key={member.role}
                  animate={{ y: isFeatured ? [0, -4, 0] : 0 }}
                  transition={{
                    duration: 2.8,
                    delay: i * 0.25,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="flex flex-col items-center bg-white/12 backdrop-blur-md border border-white/25 rounded-xl px-2.5 py-1.5"
                >
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={member.img}
                      alt={member.role}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-300/80"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 text-[#0B2612] flex items-center justify-center">
                      <CheckCircle2 className="w-2.5 h-2.5 stroke-[2.5]" />
                    </span>
                  </div>
                  <span className="text-[9px] font-semibold text-white/95 mt-1">
                    {member.role}
                  </span>
                </motion.div>
              ))}
            </div>
            <div className="mx-auto max-w-[210px] px-2.5 py-1 rounded-lg bg-black/30 border border-white/15 backdrop-blur-md flex items-center justify-between text-[9px] text-emerald-100">
              <span>Konsensus bukti {stats?.spotlight ? `#${stats.spotlight.claim_id}` : ""}</span>
              <span className="font-mono font-bold text-emerald-300">3/3 Sah</span>
            </div>
          </div>
        )}

        {index === 1 && (
          /* 02: Pangkas Kerja Manual — seluruh klaim vs antrean terprioritas */
          <div className="w-full bg-white/12 backdrop-blur-md border border-white/25 rounded-2xl p-3 space-y-2.5">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[9px] text-white/75">
                <span>Telaah seluruh klaim</span>
                <span className="font-mono line-through text-rose-200">
                  {stats ? `${formatNumber(stats.claims)} klaim` : "semua klaim"}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/15 overflow-hidden">
                <div className="w-[88%] h-full rounded-full bg-white/35" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[9px] text-white font-semibold">
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-emerald-300 fill-emerald-300" />
                  ARSA 8-Detektor + AI
                </span>
                <span className="font-mono text-emerald-300 font-bold">
                  {stats && stats.claims > 0 ? `${formatNumber(stats.queue_cases)} kasus (-${Math.round((1 - stats.queue_cases / stats.claims) * 100)}%)` : "antrean terprioritas"}
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-black/30 overflow-hidden p-0.5">
                <motion.div
                  animate={{ width: ["18%", "32%", "22%"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-emerald-400 shadow-[0_0_10px_rgba(110,231,183,0.8)]"
                />
              </div>
            </div>
          </div>
        )}

        {index === 2 && (
          /* 03: Terhubung Lintas Sistem RS — Multi-SIMRS & e-Klaim Auto-Mapper Flow */
          <div className="w-full flex items-center justify-between gap-1.5 px-1">
            <div className="flex flex-col gap-1.5">
              {["SIMRS RS", "e-Klaim", "CSV / XLSX"].map((src, i) => (
                <motion.span
                  key={src}
                  animate={{ x: isFeatured ? [0, 3, 0] : 0 }}
                  transition={{
                    duration: 2.2,
                    delay: i * 0.2,
                    repeat: Infinity,
                  }}
                  className="px-2 py-1 rounded-md bg-white/15 border border-white/25 text-[9px] font-mono font-semibold text-white backdrop-blur-md"
                >
                  {src}
                </motion.span>
              ))}
            </div>

            {/* Animated Connector */}
            <div className="flex-1 flex flex-col items-center justify-center px-1">
              <div className="w-full h-0.5 bg-emerald-300/35 relative overflow-hidden rounded-full">
                <motion.div
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                  className="w-1/2 h-full bg-emerald-300"
                />
              </div>
              <span className="text-[8px] font-mono text-emerald-200 mt-1">
                AI Mapper
              </span>
            </div>

            {/* Target Unified JKN Schema Node */}
            <div className="px-2.5 py-2.5 rounded-xl bg-white text-[#12381B] shadow-md border border-emerald-200 text-center">
              <Building2 className="w-4 h-4 mx-auto text-[#2E6B38]" />
              <div className="text-[9px] font-extrabold mt-0.5">{REQUIRED_FIELDS.length}/{REQUIRED_FIELDS.length} Kolom Wajib</div>
              <div className="text-[8px] text-emerald-700 font-medium">
                UU PDP Ready
              </div>
            </div>
          </div>
        )}

        {index === 3 && (
          /* 04: Skalabel Seiring Pertumbuhan — 38-Province Hospital Telemetry Bars */
          <div className="w-full bg-white/12 backdrop-blur-md border border-white/25 rounded-2xl p-3 flex flex-col justify-between h-[104px]">
            <div className="flex items-center justify-between text-[9px] text-white/90">
              <span className="font-semibold flex items-center gap-1">
                <Activity className="w-3 h-3 text-emerald-300" />
                {stats ? `Sensus Klaim ${stats.provinces} Provinsi` : "Sensus Klaim Lintas Provinsi"}
              </span>
              <span className="font-mono text-emerald-300 font-bold">
                Vektor aktif
              </span>
            </div>

            <div className="flex items-end justify-between gap-1.5 h-12 pt-2 px-1">
              {[38, 52, 46, 68, 82, 74, 96].map((h, i) => (
                <motion.div
                  key={i}
                  animate={{
                    height: isFeatured
                      ? [`${h * 0.75}%`, `${h}%`, `${h * 0.75}%`]
                      : `${h * 0.85}%`,
                  }}
                  transition={{
                    duration: 2.4,
                    delay: i * 0.12,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className={`flex-1 rounded-t-md ${
                    i >= 5
                      ? "bg-gradient-to-t from-emerald-400 to-emerald-200 shadow-[0_0_10px_rgba(110,231,183,0.6)]"
                      : "bg-white/35"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [activeAdvantage, setActiveAdvantage] = useState<number>(1);
  const [advantagePaused, setAdvantagePaused] = useState<boolean>(false);
  const [openFaq, setOpenFaq] = useState<number>(0);

  // Interactive Time Tracker inside Bento Card
  const [timerRunning, setTimerRunning] = useState(true);
  const [navCompact, setNavCompact] = useState(false);
  useEffect(() => {
    const onScroll = () => setNavCompact(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const [seconds, setSeconds] = useState(0);

  // Scroll references for video-accurate motion effects
  const heroRef = useRef<HTMLElement | null>(null);
  const aboutRef = useRef<HTMLElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);

  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const heroBgY = useTransform(heroScroll, [0, 1], ["0%", "16%"]);
  const heroBgScale = useTransform(heroScroll, [0, 1], [1, 1.07]);
  const mockupRotateX = useSpring(
    useTransform(heroScroll, [0, 0.55], [9, 0]),
    { stiffness: 120, damping: 24 }
  );
  const mockupScale = useSpring(
    useTransform(heroScroll, [0, 0.55], [0.95, 1]),
    { stiffness: 120, damping: 24 }
  );
  const mockupY = useSpring(useTransform(heroScroll, [0, 0.55], [22, 0]), {
    stiffness: 120,
    damping: 24,
  });

  // Scroll-driven word-by-word illumination in Section 2 (00:02 - 00:04)
  const { scrollYProgress: aboutScroll } = useScroll({
    target: aboutRef,
    offset: ["start 0.82", "end 0.45"],
  });

  // Footer parallax & rising giant ARSA watermark (00:18 - 00:26)
  const { scrollYProgress: footerScroll } = useScroll({
    target: footerRef,
    offset: ["start end", "end end"],
  });
  const footerBgScale = useTransform(footerScroll, [0, 1], [1.1, 1]);
  const watermarkY = useTransform(footerScroll, [0, 1], [80, 0]);
  const watermarkOpacity = useTransform(
    footerScroll,
    [0, 0.6, 1],
    [0.12, 0.38, 0.55]
  );

  useEffect(() => {
    fetch("/api/public/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j?.data && setStats(j.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => {
      setSeconds((s) => (s + 1) % 3600);
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  // Subtle auto-cycling on Section 5 cards unless user hovers
  useEffect(() => {
    if (advantagePaused) return;
    const id = setInterval(() => {
      setActiveAdvantage((prev) => (prev + 1) % ADVANTAGES.length);
    }, 4500);
    return () => clearInterval(id);
  }, [advantagePaused]);

  const formatTimer = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return [hrs, mins, secs].map((v) => String(v).padStart(2, "0")).join(":");
  };

  const f1Target = stats?.macro_f1 ? Math.round(stats.macro_f1 * 100) : 0;

  return (
    <div
      id="top"
      className="min-h-screen bg-white text-[#141A16] selection:bg-[#2F6A38]/20 selection:text-[#1D4624] font-sans antialiased overflow-x-hidden"
    >
      {/* =====================================================================
          SECTION 1: GREEN JKN HOSPITAL HERO + 3D GLASS WORKSPACE (00:00 - 00:01)
      ====================================================================== */}
      <section ref={heroRef} className="relative w-full overflow-hidden">
        {/* Parallax Modern Indonesian Green JKN Hospital Campus Background */}
        <motion.div
          style={{ y: heroBgY, scale: heroBgScale }}
          className="absolute inset-0 pointer-events-none will-change-transform"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/landing/arsa-hero-hospital.png"
            alt="Rumah Sakit Mitra JKN"
            className="w-full h-full object-cover object-center"
          />
          {/* Subtle emerald-tinted atmospheric wash for 100% headline contrast */}
          <motion.div
            animate={{
              opacity: [0.3, 0.55, 0.3],
              x: ["-2%", "2%", "-2%"],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_18%,rgba(232,245,235,0.75),transparent_70%)]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#EDF6EF]/55 via-transparent to-white" />
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-white via-white/85 to-transparent" />
        </motion.div>

        {/* Ambient Floating Emerald Healthcare Bokeh Particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[
            { left: "14%", top: "28%", size: 6, dur: 6.5, delay: 0 },
            { left: "26%", top: "48%", size: 8, dur: 8, delay: 1.2 },
            { left: "78%", top: "32%", size: 7, dur: 7.2, delay: 0.6 },
            { left: "86%", top: "54%", size: 5, dur: 6.8, delay: 1.8 },
            { left: "52%", top: "42%", size: 6, dur: 7.5, delay: 0.9 },
          ].map((p, i) => (
            <motion.span
              key={i}
              animate={{
                y: [0, -24, 0],
                x: [0, 10, 0],
                opacity: [0.25, 0.8, 0.25],
                scale: [0.9, 1.25, 0.9],
              }}
              transition={{
                duration: p.dur,
                delay: p.delay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{
                left: p.left,
                top: p.top,
                width: p.size,
                height: p.size,
              }}
              className="absolute rounded-full bg-emerald-100 shadow-[0_0_16px_rgba(46,125,50,0.65)]"
            />
          ))}
        </div>

        {/* Navigasi: tetap menempel di atas dan mengecil menjadi kapsul di tengah saat halaman digulir */}
        <div aria-hidden className="h-[76px]" />
        <motion.header
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className={`fixed inset-x-0 top-0 z-50 flex justify-center px-3 sm:px-6 pointer-events-none transition-[padding] duration-500 ease-out ${navCompact ? "pt-3" : "pt-6"}`}
        >
          <div
            className={`pointer-events-auto flex items-center justify-between w-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              navCompact
                ? "max-w-3xl rounded-full px-3 sm:px-4 py-1.5 bg-white/80 backdrop-blur-xl border border-emerald-900/10 shadow-[0_10px_34px_-10px_rgba(16,46,24,0.3)]"
                : "max-w-6xl rounded-none px-3 sm:px-6 py-1.5 bg-transparent border border-transparent"
            }`}
          >
            <Link href="/landing" className="flex items-center gap-2 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/arsa_logo.png"
                alt="ARSA"
                className={`object-contain group-hover:scale-105 transition-all duration-500 ${navCompact ? "w-6 h-6" : "w-8 h-8"}`}
              />
              <span className={`font-extrabold tracking-tight text-[#14261B] transition-all duration-500 ${navCompact ? "text-sm" : "text-base"}`}>
                ARSA
              </span>
            </Link>

            <nav className={`hidden md:flex items-center font-medium text-[#223327] transition-all duration-500 ${navCompact ? "gap-5 text-[12px]" : "gap-7 text-[13px]"}`}>
              <a href="#top" className="hover:text-[#1B5E20] transition-colors">Beranda</a>
              <a href="#about" className="hover:text-[#1B5E20] transition-colors">Tentang</a>
              <a href="#platform" className="hover:text-[#1B5E20] transition-colors">Platform</a>
              <a href="#ecosystem" className="hover:text-[#1B5E20] transition-colors">Ekosistem</a>
              <a href="#advantages" className="hover:text-[#1B5E20] transition-colors">Keunggulan</a>
              <a href="#faq" className="hover:text-[#1B5E20] transition-colors">FAQ</a>
            </nav>

            <div className="flex items-center gap-2">
              <Link
                href="/"
                className={`hidden sm:inline-flex rounded-full font-semibold text-[#14261B] hover:text-[#2E6B38] transition-all duration-500 ${navCompact ? "px-3 py-1 text-[12px]" : "px-4 py-1.5 text-[13px] bg-white/70 hover:bg-white backdrop-blur-md border border-emerald-900/10 shadow-2xs"}`}
              >
                Command Center
              </Link>
              <Link
                href="/login"
                className={`rounded-full bg-[#1E4D24] hover:bg-[#2C5E33] text-white font-semibold shadow-sm transition-all duration-500 ${navCompact ? "px-3.5 py-1 text-[12px]" : "px-4 py-1.5 text-[13px]"}`}
              >
                Masuk
              </Link>
            </div>
          </div>
        </motion.header>

        {/* Hero Copy & CTAs */}
        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-10 pb-12 text-center">
          {/* Eyebrow Pill with animated shimmer sweep */}
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55 }}
            className="relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E3F0E6]/90 backdrop-blur-md border border-emerald-800/15 shadow-sm mb-6 overflow-hidden"
          >
            <motion.span
              animate={{ x: ["-150%", "250%"] }}
              transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
              className="pointer-events-none absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/80 to-transparent skew-x-12"
            />
            <span className="relative px-2 py-0.5 rounded-md bg-[#2E6B38] text-white text-[10px] font-bold uppercase tracking-wider shadow-2xs">
              JKN AI
            </span>
            <span className="relative text-xs font-medium text-[#1C3823]">
              Intelijen audit klaim untuk rumah sakit mitra JKN
            </span>
          </motion.div>

          {/* Giant Editorial Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08 }}
            className="text-4xl sm:text-6xl md:text-[64px] font-semibold tracking-[-0.03em] leading-[1.08] text-[#111713]"
          >
            Audit klaim JKN
            <br className="hidden sm:block" />
            <motion.span
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              style={{ backgroundSize: "200% 200%" }}
              className="bg-gradient-to-r from-[#184D23] via-[#2E7D32] to-[#4CAF50] bg-clip-text text-transparent"
            >
              berbasis bukti
            </motion.span>
            , lebih cepat
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.16 }}
            className="mt-5 text-sm sm:text-[15px] text-[#2F4034] max-w-xl mx-auto leading-relaxed font-normal"
          >
            Ubah ribuan berkas klaim INA-CBG menjadi keputusan audit yang terukur.
            ARSA menandai klaim yang janggal dan menunjukkan bukti rekam medisnya,
            sehingga verifikator bisa langsung fokus pada kasus yang paling krusial.
          </motion.p>

          {/* Dual Pill CTA Buttons with Spring Hover */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.24 }}
            className="mt-8 flex items-center justify-center gap-3.5 flex-wrap"
          >
            <motion.div whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/"
                className="relative overflow-hidden h-11 px-6 rounded-xl bg-gradient-to-b from-[#3B7A42] to-[#1E4D24] hover:from-[#44894C] hover:to-[#24592B] text-white text-xs sm:text-[13px] font-medium inline-flex items-center justify-center shadow-[0_10px_24px_-4px_rgba(30,77,36,0.5),inset_0_1px_0_rgba(255,255,255,0.35)] border border-[#193F1E] transition-all"
              >
                <span>Mulai sekarang</span>
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.98 }}>
              <a
                href="#platform"
                className="h-11 px-5 rounded-xl bg-white/65 hover:bg-white/85 backdrop-blur-md border border-white/90 text-[#182B1D] text-xs sm:text-[13px] font-medium inline-flex items-center gap-1.5 shadow-sm transition-all"
              >
                <span>Cara kerja</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </motion.div>
          </motion.div>
        </div>

        {/* 3D Scroll-Tilted Floating Glassmorphic App Mockup Window (00:00 - 00:01) */}
        <div
          style={{ perspective: "1400px" }}
          className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6"
        >
          <motion.div
            initial={{ opacity: 0, y: 40, rotateX: 12, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{
              rotateX: mockupRotateX,
              scale: mockupScale,
              y: mockupY,
              transformStyle: "preserve-3d",
            }}
          >
            {/* Frosted outer glass frame with animated specular border sheen */}
            <div className="relative rounded-t-[28px] p-2.5 sm:p-3.5 bg-white/55 backdrop-blur-xl border border-white/85 shadow-[0_28px_80px_-15px_rgba(16,46,24,0.28)] overflow-hidden">
              <motion.div
                animate={{ x: ["-120%", "220%"] }}
                transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
                className="pointer-events-none absolute inset-y-0 w-36 bg-gradient-to-r from-transparent via-white/55 to-transparent skew-x-12"
              />
              <div className="relative bg-white rounded-t-[22px] border border-emerald-900/10 overflow-hidden shadow-sm">
                <HeroDashboardMock stats={stats} />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 2: SCROLL-DRIVEN WORD REVEAL + HOSPITAL GREEN STAT CARD (00:02 - 00:04)
      ====================================================================== */}
      <section
        id="about"
        ref={aboutRef}
        className="max-w-6xl mx-auto px-6 py-24 sm:py-32"
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 mb-6"
        >
          <span className="w-5 h-5 rounded-md bg-[#2E6B38] text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-3 h-3" />
          </span>
          <span className="text-xs font-medium text-stone-500">Tentang ARSA JKN</span>
        </motion.div>

        {/* Scroll-Driven Word-by-Word Illumination matching 00:02 -> 00:04 */}
        <h2 className="text-2xl sm:text-4xl md:text-[42px] leading-[1.24] tracking-[-0.02em] font-normal max-w-5xl flex flex-wrap">
          {STATEMENT_WORDS.map((word, i) => {
            const start = i / STATEMENT_WORDS.length;
            const end = Math.min(start + 1.8 / STATEMENT_WORDS.length, 1);
            const isHighlight = i >= STATEMENT_WORDS.length - 8;
            return (
              <ScrollWord
                key={i}
                word={word}
                progress={aboutScroll}
                range={[start, end]}
                isHighlight={isHighlight}
              />
            );
          })}
        </h2>

        <div className="mt-14 sm:mt-20 flex flex-col md:flex-row md:items-end justify-between gap-10">
          {/* Bottom-Left: Overlapping Doctor/Auditor Avatars + Caption */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-4 max-w-sm"
          >
            <div className="flex -space-x-2.5">
              {AVATARS.slice(0, 3).map((src, idx) => (
                <motion.img
                  key={idx}
                  src={src}
                  alt="Tim Auditor & Dokter"
                  initial={{ opacity: 0, scale: 0.6, x: -12 }}
                  whileInView={{ opacity: 1, scale: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: idx * 0.12 }}
                  whileHover={{ y: -4, scale: 1.08, zIndex: 10 }}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-md cursor-pointer"
                />
              ))}
            </div>
            <p className="text-xs sm:text-[13px] text-stone-500 leading-relaxed">
              Dirancang untuk verifikator klaim, komite medis rumah sakit, dan
              pimpinan JKN yang mengutamakan kejelasan bukti rekam medis dan kecepatan
              triase.
            </p>
          </motion.div>

          {/* Bottom-Right: Green JKN Hospital Stat Card (Matches 00:04) */}
          <motion.div
            initial={{ opacity: 0, x: 28, scale: 0.94 }}
            whileInView={{ opacity: 1, x: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -5, scale: 1.02 }}
            className="relative w-full sm:w-80 h-60 rounded-[26px] overflow-hidden shadow-xl p-3 group"
          >
            <motion.img
              src="/landing/arsa-hero-hospital.png"
              alt=""
              animate={{
                scale: [1.08, 1.18, 1.08],
                x: ["-2%", "2%", "-2%"],
              }}
              transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 w-full h-full object-cover object-bottom"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[#123D1B]/85 via-[#1E5B29]/75 to-[#0D2B13]/90" />
            <div className="relative h-full w-full rounded-[18px] border border-white/40 p-5 flex flex-col justify-between text-white backdrop-blur-[2px]">
              <div className="flex items-center justify-between">
                <div className="text-5xl sm:text-6xl font-semibold tracking-tight text-white drop-shadow-xs">
                  <AnimatedCounter target={f1Target} suffix="%" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-400/20 border border-emerald-300/35 text-[10px] font-semibold text-emerald-100">
                  INA-CBG Verified
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-white/95 leading-snug">
                Skor F1 deteksi klaim berisiko pada data sintetis berlabel (bukan
                klaim riil)
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 3: ONE INTELLIGENT WORKSPACE — 5-CARD BENTO WITH MOTION (00:05 - 00:09)
      ====================================================================== */}
      <section id="platform" className="max-w-6xl mx-auto px-6 py-20">
        {/* Centered Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-md bg-[#2E6B38] text-white flex items-center justify-center shadow-xs">
              <Layers className="w-3 h-3" />
            </span>
            <span className="text-xs font-medium text-stone-500">Platform</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-[-0.025em] text-[#141A16] leading-[1.12]">
            Satu ruang kerja untuk
            <br /> memeriksa klaim rumah sakit
          </h2>
          <p className="mt-4 text-xs sm:text-sm text-stone-500 leading-relaxed">
            Delapan detektor, pencarian kemiripan vektor, dan AI yang selalu menyertakan
            sitasi bukti, dalam satu alur kerja dari unggah data sampai keputusan.
          </p>
        </motion.div>

        {/* 5-Card Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Card 1 (Top-Left, 6 cols): Continuous Orbiting Avatars & Radar Pulse */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            whileHover={{ y: -4 }}
            className="lg:col-span-6 rounded-[26px] border border-stone-200/90 bg-white p-6 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between overflow-hidden relative"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(46,107,56,0.08) 1px, transparent 1px)",
              backgroundSize: "18px 18px",
            }}
          >
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-[#141A16]">
                Kerja bersama verifikator &amp; DPJP
              </h3>
              <p className="text-xs text-stone-500 mt-1.5 max-w-sm leading-relaxed">
                Verifikator klaim, dokter DPJP, dan auditor medis melihat bukti
                rekam medis yang sama, dengan hak akses sesuai peran.
              </p>
            </div>

            {/* Concentric Radar Rings + Center Logo + Continuously Orbiting Avatars */}
            <div className="relative h-60 my-4 flex items-center justify-center">
              <motion.div
                animate={{ scale: [0.65, 1.35], opacity: [0.45, 0] }}
                transition={{ duration: 3.4, repeat: Infinity, ease: "easeOut" }}
                className="absolute w-48 h-48 rounded-full border border-emerald-500/35 pointer-events-none"
              />

              <div className="w-52 h-52 rounded-full border border-emerald-500/15 bg-emerald-500/[0.03] flex items-center justify-center">
                <div className="w-36 h-36 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] flex items-center justify-center">
                  <motion.div
                    animate={{ scale: [1, 1.06, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="w-16 h-16 rounded-full bg-white shadow-md border border-emerald-100 flex items-center justify-center z-10"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/arsa_logo.png"
                      alt="ARSA"
                      className="w-8 h-8 object-contain"
                    />
                  </motion.div>
                </div>
              </div>

              {/* Rotating Orbital Container keeping Avatars Upright via Counter-Rotation */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 34, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                {ORBIT_AVATARS.map((item, idx) => {
                  const rad = (item.angle * Math.PI) / 180;
                  const x = Math.cos(rad) * item.radius;
                  const y = Math.sin(rad) * item.radius;
                  return (
                    <div
                      key={idx}
                      style={{
                        transform: `translate(${x}px, ${y}px)`,
                      }}
                      className="absolute"
                    >
                      <motion.img
                        src={item.src}
                        alt=""
                        animate={{ rotate: -360 }}
                        transition={{
                          duration: 34,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        style={{ width: item.size, height: item.size }}
                        className="rounded-full object-cover ring-2 ring-white shadow-md"
                      />
                    </div>
                  );
                })}
              </motion.div>
            </div>
          </motion.div>

          <PriorityQueueCard stats={stats} />
          <AuditChainCard stats={stats} />
          <OverviewCard stats={stats} />
          <CopilotCard qa={stats?.spotlight?.qa ?? null} />
        </div>
      </section>

      {/* =====================================================================
          SECTION 4: RADIAL ECOSYSTEM HUB WITH ANIMATED PULSES (00:10 - 00:12)
      ====================================================================== */}
      <section
        id="ecosystem"
        className="max-w-6xl mx-auto px-6 py-24 relative overflow-hidden"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(46,107,56,0.07) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-xl mx-auto mb-16"
        >
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-md bg-[#2E6B38] text-white flex items-center justify-center shadow-xs">
              <Globe className="w-3 h-3" />
            </span>
            <span className="text-xs font-medium text-stone-500">
              Ekosistem rumah sakit &amp; JKN
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-[-0.025em] text-[#141A16] leading-[1.12]">
            Terhubung dengan sistem
            <br /> yang sudah dipakai rumah sakit
          </h2>
        </motion.div>

        {/* Central Hub + 6 Floating Nodes + Animated SVG Data Beams */}
        <div className="relative max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 items-center gap-8 py-6">
          <svg
            viewBox="0 0 900 320"
            fill="none"
            className="hidden md:block absolute inset-0 w-full h-full pointer-events-none"
          >
            {[
              "M 450 160 C 350 160, 310 65, 220 65",
              "M 450 160 C 340 160, 290 160, 190 160",
              "M 450 160 C 350 160, 310 255, 220 255",
              "M 450 160 C 550 160, 590 65, 680 65",
              "M 450 160 C 560 160, 610 160, 710 160",
              "M 450 160 C 550 160, 590 255, 680 255",
            ].map((d, i) => (
              <g key={i}>
                <path
                  d={d}
                  stroke="rgba(46,107,56,0.14)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <motion.path
                  d={d}
                  stroke="rgba(46,107,56,0.65)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="18 180"
                  animate={{ strokeDashoffset: [198, 0] }}
                  transition={{
                    duration: 2.8,
                    delay: i * 0.35,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              </g>
            ))}
          </svg>

          {/* Left 3 Floating Pills */}
          <div className="relative z-10 flex flex-col items-center md:items-end gap-6">
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
              whileHover={{ scale: 1.05 }}
              className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white border border-stone-200/90 shadow-[0_10px_30px_rgba(46,107,56,0.1)]"
            >
              <span className="w-6 h-6 rounded-md bg-[#2E6B38] text-white flex items-center justify-center">
                <Globe className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs sm:text-sm font-medium text-stone-800">
                Web Command Center
              </span>
            </motion.div>

            <motion.div
              animate={{ y: [0, -7, 0] }}
              transition={{
                duration: 4.6,
                delay: 0.6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              whileHover={{ scale: 1.05 }}
              className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white border border-stone-200/90 shadow-[0_10px_30px_rgba(46,107,56,0.1)] md:mr-8"
            >
              <span className="w-6 h-6 rounded-md bg-[#2E6B38] text-white flex items-center justify-center">
                <FileSpreadsheet className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs sm:text-sm font-medium text-stone-800">
                SIMRS &amp; e-Klaim Ingest
              </span>
            </motion.div>

            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{
                duration: 4.4,
                delay: 1.1,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              whileHover={{ scale: 1.05 }}
              className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white border border-stone-200/90 shadow-[0_10px_30px_rgba(46,107,56,0.1)]"
            >
              <span className="w-6 h-6 rounded-md bg-[#2E6B38] text-white flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs sm:text-sm font-medium text-stone-800">
                Perisai Privasi UU PDP
              </span>
            </motion.div>
          </div>

          {/* Center Concentric Neumorphic Hub with Breathing Ripple */}
          <div className="relative z-10 flex items-center justify-center">
            <motion.div
              animate={{ scale: [0.95, 1.18], opacity: [0.35, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeOut" }}
              className="absolute w-64 h-64 rounded-full border border-emerald-600/30 pointer-events-none"
            />
            <motion.div
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-60 h-60 rounded-full bg-gradient-to-b from-stone-50 to-white border border-stone-200/70 shadow-[0_20px_50px_rgba(0,0,0,0.06)] flex items-center justify-center"
            >
              <div className="w-44 h-44 rounded-full bg-white border border-stone-200/80 shadow-[0_12px_30px_rgba(0,0,0,0.06)] flex items-center justify-center">
                <div className="w-28 h-28 rounded-full bg-white border border-stone-100 shadow-inner flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/arsa_logo.png"
                    alt="ARSA Hub"
                    className="w-14 h-14 object-contain"
                  />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right 3 Floating Pills */}
          <div className="relative z-10 flex flex-col items-center md:items-start gap-6">
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{
                duration: 4.5,
                delay: 0.3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              whileHover={{ scale: 1.05 }}
              className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white border border-stone-200/90 shadow-[0_10px_30px_rgba(46,107,56,0.1)]"
            >
              <span className="w-6 h-6 rounded-md bg-[#2E6B38] text-white flex items-center justify-center">
                <Database className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs sm:text-sm font-medium text-stone-800">
                Vektor pgvector HNSW
              </span>
            </motion.div>

            <motion.div
              animate={{ y: [0, -7, 0] }}
              transition={{
                duration: 4.8,
                delay: 0.9,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              whileHover={{ scale: 1.05 }}
              className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white border border-stone-200/90 shadow-[0_10px_30px_rgba(46,107,56,0.1)] md:ml-8"
            >
              <span className="w-6 h-6 rounded-md bg-[#2E6B38] text-white flex items-center justify-center">
                <Cpu className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs sm:text-sm font-medium text-stone-800">
                8 Detektor Deterministik
              </span>
            </motion.div>

            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{
                duration: 4.3,
                delay: 1.4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              whileHover={{ scale: 1.05 }}
              className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white border border-stone-200/90 shadow-[0_10px_30px_rgba(46,107,56,0.1)]"
            >
              <span className="w-6 h-6 rounded-md bg-[#2E6B38] text-white flex items-center justify-center">
                <FileText className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs sm:text-sm font-medium text-stone-800">
                Dosier Audit PDF SHA-256
              </span>
            </motion.div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 5: WHY ARSA MAKES AUDIT FEEL SIMPLER — 4 DISTINCT SCULPTED CARDS
      ====================================================================== */}
      <section
        id="advantages"
        className="max-w-6xl mx-auto px-6 py-24"
        onMouseEnter={() => setAdvantagePaused(true)}
        onMouseLeave={() => setAdvantagePaused(false)}
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div>
            <div className="inline-flex items-center gap-2 mb-3">
              <span className="w-5 h-5 rounded-md bg-[#2E6B38] text-white flex items-center justify-center shadow-xs">
                <Zap className="w-3 h-3" />
              </span>
              <span className="text-xs font-medium text-stone-500">Keunggulan</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-semibold tracking-[-0.025em] text-[#141A16] leading-[1.12]">
              Audit klaim jadi lebih
              <br /> ringkas dan jelas
            </h2>
          </div>

          <div className="max-w-md space-y-4">
            <p className="text-xs sm:text-sm text-stone-500 leading-relaxed">
              ARSA menggabungkan perencanaan audit berbasis AI, visibilitas bukti
              rekam medis yang jernih, dan penyelarasan tim rumah sakit ke dalam
              satu ruang kerja terpadu.
            </p>
            <motion.div
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="inline-block"
            >
              <Link
                href="/"
                className="h-10 px-5 rounded-xl bg-gradient-to-b from-[#437A49] to-[#234D29] text-white text-xs font-medium inline-flex items-center gap-1.5 justify-center shadow-sm hover:opacity-95 transition-opacity"
              >
                <span>Coba ARSA</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </motion.div>
          </div>
        </div>

        {/* 4-Column Sculpted Double-Bezel Bento Cards — Each with its own distinct JKN Hospital Visual */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
          {ADVANTAGES.map((item, idx) => {
            const Icon = item.icon;
            const isFeatured = activeAdvantage === idx;

            return (
              <motion.div
                key={item.num}
                onClick={() => setActiveAdvantage(idx)}
                onMouseEnter={() => setActiveAdvantage(idx)}
                animate={{
                  y: isFeatured ? -16 : 0,
                  scale: isFeatured ? 1.02 : 1,
                }}
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
                className={`group relative rounded-[30px] p-2 flex flex-col justify-between cursor-pointer transition-all duration-300 ${
                  isFeatured
                    ? "bg-gradient-to-b from-[#E5F2E7] via-[#F3F8F4] to-white border-2 border-[#2E6B38]/40 shadow-[0_24px_50px_-12px_rgba(24,68,34,0.22)]"
                    : "bg-[#F6F9F7] hover:bg-[#EFF5F0] border border-stone-200/90 shadow-[0_6px_20px_rgba(0,0,0,0.04)]"
                }`}
              >
                {/* Top Custom Visual Chamber Specific to Each Card's Naming */}
                <AdvantageCardVisual
                  index={idx}
                  isFeatured={isFeatured}
                  backdrop={item.backdrop}
                  num={item.num}
                  badge={item.badge}
                  stats={stats}
                />

                {/* Sculpted Floating Bridge Icon Badge */}
                <div className="relative z-20 -mt-5 ml-4 flex items-center justify-between pr-4">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-md border transition-all duration-300 ${
                      isFeatured
                        ? "bg-gradient-to-br from-[#387B40] to-[#1D4723] text-white border-emerald-200 scale-105"
                        : "bg-white text-[#1E4423] border-stone-200/90 group-hover:border-emerald-300"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  {isFeatured && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="px-2.5 py-0.5 rounded-full bg-[#2E6B38]/10 text-[#1D4D25] text-[10px] font-bold"
                    >
                      Aktif
                    </motion.span>
                  )}
                </div>

                {/* Card Body Copy & Bottom Metric Pill */}
                <div className="p-4 pt-3.5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-[17px] font-bold text-[#122016] leading-snug tracking-tight">
                      {item.title}
                    </h3>
                    <p
                      className={`text-xs leading-relaxed transition-colors ${
                        isFeatured ? "text-stone-600" : "text-stone-500"
                      }`}
                    >
                      {item.description}
                    </p>
                  </div>

                  {/* Bottom Telemetry Footer Box inside Card */}
                  <div
                    className={`pt-3 border-t flex items-center justify-between text-[11px] transition-colors ${
                      isFeatured
                        ? "border-emerald-800/15 text-[#183D1F]"
                        : "border-stone-200/80 text-stone-500"
                    }`}
                  >
                    <span className="text-[10px] text-stone-400 font-medium">
                      {item.metricLabel}
                    </span>
                    <span
                      className={`font-bold font-mono text-[11px] ${
                        isFeatured ? "text-[#245E2D]" : "text-stone-700"
                      }`}
                    >
                      {item.metricValue}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* =====================================================================
          SECTION 6: FREQUENTLY ASKED QUESTIONS ACCORDION (00:15 - 00:17)
      ====================================================================== */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-md bg-[#2E6B38] text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-3 h-3" />
            </span>
            <span className="text-xs font-medium text-stone-500">
              Pertanyaan umum
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-[-0.025em] text-[#141A16] leading-[1.12]">
            Jawaban singkat
            <br /> sebelum Anda mulai
          </h2>
        </motion.div>

        <div className="divide-y divide-stone-200/90 border-b border-stone-200/90">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className="py-5">
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                  className="w-full flex items-center justify-between gap-4 text-left group"
                >
                  <span className="text-sm sm:text-base font-medium text-[#141A16] group-hover:text-[#2E6B38] transition-colors">
                    {faq.q}
                  </span>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  >
                    <ChevronDown className="w-4 h-4 text-stone-500 shrink-0" />
                  </motion.div>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.26, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <p className="pt-3 text-xs sm:text-sm text-stone-500 leading-relaxed max-w-2xl">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* =====================================================================
          SECTION 7: GREEN JKN HOSPITAL ATRIUM FOOTER + RISING WATERMARK (00:18 - 00:26)
      ====================================================================== */}
      <footer ref={footerRef} className="relative w-full pt-16 overflow-hidden">
        {/* Top White Footer Content */}
        <div className="relative z-10 max-w-6xl mx-auto px-6 pb-16 flex flex-col md:flex-row justify-between gap-12">
          <div className="space-y-6">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.02em] text-[#141A16] leading-tight">
              Audit klaim yang jelas,
              <br /> dengan bukti yang bisa ditelusuri.
            </h2>
            <div className="flex items-center gap-2.5">
              <Link
                href="/"
                className="w-9 h-9 rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-200/80 flex items-center justify-center text-[#2E6B38] transition-colors"
                title="Command Center"
              >
                <ShieldCheck className="w-4 h-4" />
              </Link>
              <Link
                href="/providers"
                className="w-9 h-9 rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-200/80 flex items-center justify-center text-stone-700 transition-colors"
                title="Direktori Faskes"
              >
                <Building2 className="w-4 h-4" />
              </Link>
              <Link
                href="/copilot"
                className="w-9 h-9 rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-200/80 flex items-center justify-center text-stone-700 transition-colors"
                title="AI Copilot"
              >
                <Sparkles className="w-4 h-4" />
              </Link>
            </div>
            <p className="text-xs text-stone-500 max-w-md">{PROVENANCE_SUMMARY}. Rincian di halaman Acuan Nasional.</p>
          </div>

          <div className="flex flex-wrap gap-10 sm:gap-14">
            {/* Quick Links Column */}
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600">
                <Link2 className="w-3.5 h-3.5 text-[#2E6B38]" />
                <span>Tautan</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <a
                  href="#about"
                  className="px-3.5 py-2 rounded-lg bg-stone-100/90 hover:bg-stone-200/70 text-stone-700 text-center transition-colors"
                >
                  Tentang
                </a>
                <a
                  href="#platform"
                  className="px-3.5 py-2 rounded-lg bg-stone-100/90 hover:bg-stone-200/70 text-stone-700 text-center transition-colors"
                >
                  Platform
                </a>
                <a
                  href="#ecosystem"
                  className="px-3.5 py-2 rounded-lg bg-stone-100/90 hover:bg-stone-200/70 text-stone-700 text-center transition-colors"
                >
                  Ekosistem
                </a>
                <a
                  href="#advantages"
                  className="px-3.5 py-2 rounded-lg bg-stone-100/90 hover:bg-stone-200/70 text-stone-700 text-center transition-colors"
                >
                  Keunggulan
                </a>
                <a
                  href="#faq"
                  className="px-3.5 py-2 rounded-lg bg-stone-100/90 hover:bg-stone-200/70 text-stone-700 text-center transition-colors"
                >
                  FAQ
                </a>
                <Link
                  href="/"
                  className="px-3.5 py-2 rounded-lg bg-stone-100/90 hover:bg-stone-200/70 text-stone-700 text-center transition-colors"
                >
                  Command Center
                </Link>
              </div>
            </div>

            {/* Contact Column */}
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600">
                <Phone className="w-3.5 h-3.5 text-[#2E6B38]" />
                <span>Kontak</span>
              </div>
              <div className="flex flex-col gap-2 text-xs">
                <span className="px-4 py-2 rounded-lg bg-stone-100/90 text-stone-700 font-mono">
                  BPJS Kesehatan Care Center 165
                </span>
                <span className="px-4 py-2 rounded-lg bg-stone-100/90 text-stone-700">
                  contact@arsa-jkn.id
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Modern Green JKN Hospital Campus + Rising Giant ARSA Watermark */}
        <div className="relative h-[360px] sm:h-[440px] w-full overflow-hidden">
          <motion.img
            src="/landing/arsa-footer-hospital.png"
            alt="Rumah Sakit Mitra JKN"
            style={{ scale: footerBgScale }}
            className="w-full h-full object-cover object-center will-change-transform"
          />
          {/* Smooth top white fade into the green hospital architecture */}
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white via-white/75 to-transparent" />

          {/* Giant Translucent Watermark Wordmark Rising with Scroll */}
          <motion.div
            style={{ y: watermarkY, opacity: watermarkOpacity }}
            className="absolute inset-x-0 bottom-[-6%] flex items-end justify-center pointer-events-none select-none overflow-hidden"
          >
            <span className="text-[130px] sm:text-[220px] md:text-[290px] font-bold tracking-tight leading-none text-white mix-blend-overlay drop-shadow-sm">
              ARSA
            </span>
          </motion.div>
        </div>
      </footer>
    </div>
  );
}
