"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  motion,
  useInView,
  useSpring,
  useMotionValue,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import {
  FileText,
  ShieldAlert,
  Cpu,
  CheckCircle2,
  GitCompare,
  Sparkles,
  Lock,
} from "lucide-react";

/* ============================================================================
   1. MAGIC UI — NUMBER TICKER (Spring-animated numeric counter)
============================================================================ */
interface NumberTickerProps {
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

export function NumberTicker({
  value,
  decimals = 0,
  suffix = "",
  prefix = "",
  className = "",
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px" });
  const motionVal = useMotionValue(Math.max(0, value * 0.65));
  const springVal = useSpring(motionVal, {
    damping: 26,
    stiffness: 260,
  });
  const [display, setDisplay] = useState(() =>
    decimals > 0
      ? value.toFixed(decimals).replace(".", ",")
      : Math.round(value).toLocaleString("id-ID")
  );

  useEffect(() => {
    if (inView) {
      motionVal.set(value);
    }
  }, [inView, value, motionVal]);

  useEffect(() => {
    const unsubscribe = springVal.on("change", (latest) => {
      if (decimals > 0) {
        setDisplay(latest.toFixed(decimals).replace(".", ","));
      } else {
        setDisplay(Math.round(latest).toLocaleString("id-ID"));
      }
    });
    return () => unsubscribe();
  }, [springVal, decimals]);

  return (
    <span ref={ref} className={`tabular-nums inline-block ${className}`}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

/* ============================================================================
   2. MAGIC UI — BLUR FADE & TEXT REVEAL HEADLINE
============================================================================ */
export function BlurFade({
  children,
  delay = 0,
  className = "",
  yOffset = 14,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  yOffset?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "120px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: yOffset }}
      animate={
        inView
          ? { opacity: 1, y: 0 }
          : { opacity: 0, y: yOffset }
      }
      transition={{
        duration: 0.5,
        delay: delay * 0.5,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggeredHeadline({
  lines,
  slideKey,
  className = "",
}: {
  lines: string[];
  slideKey: string | number;
  className?: string;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.h1
        key={slideKey}
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.09 } },
          exit: { transition: { staggerChildren: 0.04, staggerDirection: -1 } },
        }}
        className={className}
      >
        {lines.map((line, i) => (
          <span key={i} className="block overflow-hidden pb-1">
            <motion.span
              className="block"
              variants={{
                hidden: { y: "105%", opacity: 0, filter: "blur(8px)" },
                visible: {
                  y: "0%",
                  opacity: 1,
                  filter: "blur(0px)",
                  transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] },
                },
                exit: {
                  y: "-40%",
                  opacity: 0,
                  filter: "blur(4px)",
                  transition: { duration: 0.25 },
                },
              }}
            >
              {line}
            </motion.span>
          </span>
        ))}
      </motion.h1>
    </AnimatePresence>
  );
}

/* ============================================================================
   3. 21ST.DEV / MAGIC UI — SPOTLIGHT CARD (Mouse-tracking radial illumination)
============================================================================ */
export function SpotlightCard({
  children,
  className = "",
  spotlightColor = "rgba(0, 166, 81, 0.14)",
}: {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={`relative overflow-hidden ${className}`}
    >
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300 z-10"
        style={{
          opacity,
          background: `radial-gradient(480px circle at ${pos.x}px ${pos.y}px, ${spotlightColor}, transparent 45%)`,
        }}
      />
      {children}
    </div>
  );
}

/* ============================================================================
   4. MAGIC UI — BORDER BEAM (Animated light beam tracing container border)
============================================================================ */
export function BorderBeam({
  duration = 10,
  colorFrom = "#34D399",
  colorTo = "#00A651",
}: {
  duration?: number;
  colorFrom?: string;
  colorTo?: string;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden z-20">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration, repeat: Infinity, ease: "linear" }}
        style={{
          background: `conic-gradient(from 0deg, transparent 0deg 290deg, ${colorTo} 325deg, ${colorFrom} 355deg, transparent 360deg)`,
        }}
        className="absolute -inset-[120%] opacity-65"
      />
      <div className="absolute inset-[1.5px] rounded-[inherit] bg-transparent" />
    </div>
  );
}

/* ============================================================================
   5. MAGIC UI — HERO INTERACTIVE ILLUSTRATION + ANIMATED BEAMS (PURE VISUAL)
============================================================================ */
export function HeroForensicIllustration() {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useTransform(mouseY, [-200, 200], [6, -6]);
  const rotateY = useTransform(mouseX, [-200, 200], [-7, 7]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    mouseX.set(e.clientX - cx);
    mouseY.set(e.clientY - cy);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full max-w-[500px] ml-auto rounded-3xl border border-white/15 bg-[#061810]/70 backdrop-blur-md p-3 shadow-[0_28px_70px_rgba(0,0,0,0.55)] overflow-hidden group"
    >
      {/* Subtle Ambient Glow */}
      <div
        className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, #10B981 0%, transparent 70%)" }}
      />

      {/* Pure Visual Canvas: 3D Isometric Glass Illustration + Animated SVG Light Beams */}
      <div className="relative rounded-2xl overflow-hidden bg-[#04110B] h-[290px] sm:h-[320px]">
        <img
          src="/landing/hero-illustration.png"
          alt="Ilustrasi Mesin Forensik Klaim JKN"
          className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(4,17,11,0.0) 35%, rgba(4,17,11,0.65) 100%)",
          }}
        />

        {/* Magic UI Animated SVG Beam Overlay (pure light pulses, zero text tags) */}
        <svg
          viewBox="0 0 480 300"
          fill="none"
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          <defs>
            <linearGradient id="beamGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0" />
              <stop offset="50%" stopColor="#34D399" stopOpacity="1" />
              <stop offset="100%" stopColor="#A7F3D0" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="beamGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0" />
              <stop offset="50%" stopColor="#FBBF24" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Animated Beams flowing into the isometric optical prism */}
          <motion.path
            d="M 60 85 C 145 85, 175 150, 245 150"
            stroke="url(#beamGrad1)"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: 0.35, pathOffset: 0 }}
            animate={{ pathOffset: [0, 1] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "linear" }}
          />
          <motion.path
            d="M 60 225 C 145 225, 175 150, 245 150"
            stroke="url(#beamGrad1)"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: 0.35, pathOffset: 0 }}
            animate={{ pathOffset: [0, 1] }}
            transition={{ duration: 3.3, delay: 0.7, repeat: Infinity, ease: "linear" }}
          />
          <motion.path
            d="M 245 150 C 315 150, 345 100, 420 100"
            stroke="url(#beamGrad2)"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: 0.4, pathOffset: 0 }}
            animate={{ pathOffset: [0, 1] }}
            transition={{ duration: 2.5, delay: 0.3, repeat: Infinity, ease: "linear" }}
          />
          <motion.path
            d="M 245 150 C 315 150, 345 205, 420 205"
            stroke="url(#beamGrad1)"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: 0.4, pathOffset: 0 }}
            animate={{ pathOffset: [0, 1] }}
            transition={{ duration: 3.0, delay: 1.0, repeat: Infinity, ease: "linear" }}
          />
        </svg>
      </div>
    </motion.div>
  );
}

/* ============================================================================
   6. MAGIC UI — INFINITE TELEMETRY MARQUEE STRIP
============================================================================ */
const MARQUEE_ITEMS = [
  "01 · UPCODING SEVERITY LEVEL III",
  "02 · PHANTOM BILLING KAMAR OPERASI IBS",
  "03 · CLONING NARASI MEDIS (COSINE ≥ 0.92)",
  "04 · UNBUNDLING EPISODE RAWAT INAP",
  "05 · ABNORMAL LENGTH OF STAY (P95 PEER)",
  "06 · INFLASI KOMPONEN OBAT & ALKES",
  "07 · PSEUDONIMISASI HMAC-SHA256 (UU PDP NO. 27/2022)",
  "08 · RANTAI HASH AUDIT APPEND-ONLY",
];

export function InfiniteTelemetryMarquee() {
  return (
    <div className="bg-[#05140E] border-y border-white/10 py-3 overflow-hidden select-none">
      <motion.div
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 34, repeat: Infinity, ease: "linear" }}
        className="flex items-center gap-10 whitespace-nowrap w-max"
      >
        {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
          <div
            key={i}
            className="inline-flex items-center gap-3 text-[11px] font-mono uppercase tracking-[0.16em] text-white/65"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
            <span>{item}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
