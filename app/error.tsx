"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCcw, Home, ShieldAlert } from "lucide-react";

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Arsa AI Error Boundary]:", error);
  }, [error]);

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-xl border border-red-200 shadow-card p-8 text-center">
        <div className="w-14 h-14 bg-red-50 text-risk-high rounded-2xl flex items-center justify-center mx-auto mb-5 border border-red-100">
          <AlertTriangle size={28} />
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-[10px] font-bold uppercase tracking-wider mb-3">
          <ShieldAlert size={12} /> Gangguan Komponen Aplikasi
        </div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">
          Terjadi Kendala Saat Memuat Halaman
        </h1>
        <p className="text-xs text-slate-500 leading-relaxed mb-6">
          {error.message ||
            "Sistem mengalami gangguan tak terduga saat merender modul ini. Data audit dan sesi Anda tetap aman."}
        </p>
        {error.digest && (
          <p className="text-[10px] font-mono text-slate-400 bg-slate-50 py-1.5 px-3 rounded border border-slate-100 mb-6">
            Digest ID: {error.digest}
          </p>
        )}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-bpjs-primary hover:bg-bpjs-secondary text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
          >
            <RefreshCcw size={14} /> Muat Ulang Modul
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
          >
            <Home size={14} /> Pusat Komando
          </Link>
        </div>
      </div>
    </div>
  );
}
