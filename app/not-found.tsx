import React from "react";
import Link from "next/link";
import { FileSearch, Home, ClipboardList } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 shadow-card p-8 text-center">
        <div className="w-14 h-14 bg-blue-50 text-bpjs-primary rounded-2xl flex items-center justify-center mx-auto mb-5 border border-blue-100">
          <FileSearch size={28} />
        </div>
        <span className="inline-block px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider mb-3">
          Error 404 • Halaman Tidak Ditemukan
        </span>
        <h1 className="text-xl font-bold text-slate-800 mb-2">
          Modul atau Kasus Tidak Tersedia
        </h1>
        <p className="text-xs text-slate-500 leading-relaxed mb-6">
          Halaman atau ID kasus investigasi yang Anda tuju tidak ditemukan di dalam penyimpanan aktif Arsa AI.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-bpjs-primary hover:bg-bpjs-secondary text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
          >
            <Home size={14} /> Ke Pusat Komando
          </Link>
          <Link
            href="/investigation-queue"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
          >
            <ClipboardList size={14} /> Antrean Investigasi
          </Link>
        </div>
      </div>
    </div>
  );
}
