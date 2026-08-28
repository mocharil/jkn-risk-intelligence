"use client";

import React from "react";
import { Sparkles, ShieldCheck, Activity } from "lucide-react";

export default function GlobalLoading() {
  return (
    <div className="fixed inset-0 z-50 bg-[#F8FBFA]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 select-none animate-in fade-in duration-200">
      {/* Background Decorative Ambient Glow */}
      <div className="absolute w-[400px] h-[400px] bg-gradient-to-tr from-bpjs/15 via-emerald-100/30 to-intel/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Logo Card with Radar Pulse */}
      <div className="relative flex flex-col items-center space-y-6 z-10 max-w-sm text-center">
        {/* Animated Outer Pulse Ring */}
        <div className="relative flex items-center justify-center">
          {/* Radar Waves */}
          <div className="absolute w-24 h-24 rounded-3xl bg-bpjs/15 animate-ping-slow pointer-events-none" />
          <div className="absolute w-28 h-28 rounded-full border border-bpjs/30 animate-pulse pointer-events-none" />

          {/* Logo Frame */}
          <div className="w-20 h-20 rounded-3xl bg-white border-2 border-bpjs/40 p-2.5 shadow-elevated flex items-center justify-center relative overflow-hidden">
            <img
              src="/arsa_logo.png"
              alt="ARSA JKN Logo"
              className="w-full h-full object-contain drop-shadow-xs"
            />
            {/* High-tech scanning line shimmer */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bpjs/20 to-transparent w-full h-full animate-[bounce_2s_infinite]" />
          </div>
        </div>

        {/* Text & Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-1.5">
            <span className="font-extrabold text-sm tracking-wider text-jkn-text">JKN RISK</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-bpjs-light text-bpjs-dark font-bold tracking-widest uppercase">
              INTELLIGENCE
            </span>
          </div>

          <p className="text-xs text-jkn-muted font-medium flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-bpjs animate-spin" />
            <span>Loading detection engine & clinical evidence...</span>
          </p>
        </div>

        {/* Progress Dots Indicator */}
        <div className="flex items-center gap-2 py-1 px-3.5 rounded-full bg-white border border-jkn-border text-[11px] font-semibold text-jkn-dim shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-bpjs animate-pulse" />
          <span>BPJS Kesehatan AI Decision Support</span>
        </div>
      </div>
    </div>
  );
}
