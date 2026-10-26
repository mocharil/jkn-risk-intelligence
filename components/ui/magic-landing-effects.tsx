"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  motion,
  useInView,
  useSpring,
  useMotionValue,
  AnimatePresence,
} from "framer-motion";

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
