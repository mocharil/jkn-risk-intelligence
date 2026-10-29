"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Activity, ArrowRight, Building2, Database, Gauge, LayoutGrid, Library, Network, RefreshCw, Search, Settings, ShieldAlert, Sparkles } from "lucide-react";
import { formatNumber, formatRupiah } from "@/lib/formatting/currency";
import dynamic from "next/dynamic";
import type { PublicStats } from "./stats";

const HeroRiskMap = dynamic(() => import("./HeroRiskMap"), { ssr: false, loading: () => <div className="h-full bg-[#EEF3F0]" /> });

const NAV: Array<{ label: string; href: string; icon: typeof LayoutGrid; group: string }> = [
  { group: "Operasional & audit", label: "Command Center", href: "/", icon: LayoutGrid },
  { group: "Operasional & audit", label: "Pemeriksaan Klaim", href: "/investigation-queue", icon: ShieldAlert },
  { group: "Operasional & audit", label: "Profil Faskes", href: "/providers", icon: Building2 },
  { group: "Intelijen & detektor", label: "Peta Risiko & Graf", href: "/risk-intelligence", icon: Network },
  { group: "Intelijen & detektor", label: "AI Copilot", href: "/copilot", icon: Sparkles },
  { group: "Intelijen & detektor", label: "Evaluasi & Kalibrasi", href: "/model-performance", icon: Gauge },
  { group: "Data & tata kelola", label: "Acuan Nasional BPJS", href: "/acuan-nasional", icon: Library },
  { group: "Data & tata kelola", label: "Manajemen Dataset", href: "/data-management", icon: Database },
  { group: "Data & tata kelola", label: "Pengaturan & Audit", href: "/settings", icon: Settings },
];

/** Miniatur Command Center yang sebenarnya: menu, judul, empat KPI, sebaran provinsi, dan ringkasan temuan, semua dari data hasil analisis. */
export function HeroDashboardMock({ stats }: { stats: PublicStats | null }) {
  const reduce = useReducedMotion();
  const t = (delay: number) => (reduce ? { duration: 0 } : { duration: 0.5, delay });
  const pctHigh = stats && stats.claims ? ((stats.high_risk_claims / stats.claims) * 100).toFixed(1).replace(".", ",") : "—";
  let lastGroup = "";
  const hot = [...(stats?.province_map ?? [])].filter((p) => p.high > 0).sort((x, y) => y.score - x.score).slice(0, 5);

  return (
    <div className="grid grid-cols-12 min-h-[380px] text-left">
      <aside className="hidden md:flex md:col-span-3 flex-col bg-[#0A2417] text-emerald-50/80 p-3.5 gap-1">
        <div className="flex items-center gap-2 px-1 pb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/arsa_logo.png" alt="ARSA" className="w-6 h-6 object-contain" />
          <div className="leading-tight">
            <div className="text-[12px] font-bold text-white">ARSA JKN</div>
            <div className="text-[9px] text-emerald-200/60">Audit & Intelijen Klaim</div>
          </div>
        </div>
        {NAV.map((n) => {
          const head = n.group !== lastGroup;
          lastGroup = n.group;
          const Icon = n.icon;
          const active = n.label === "Command Center";
          return (
            <div key={n.label}>
              {head && <div className="px-2 pt-2.5 pb-1 text-[9px] font-semibold text-emerald-200/45">{n.group}</div>}
              <Link
                href={n.href}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${active ? "bg-white/10 text-white ring-1 ring-emerald-400/30" : "hover:bg-white/5"}`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{n.label}</span>
              </Link>
            </div>
          );
        })}
      </aside>

      <div className="col-span-12 md:col-span-9 bg-[#F6F8F5] p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-[11px] text-stone-400 w-56 sm:w-72">
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Cari klaim, faskes, atau ICD-10...</span>
          </div>
          <div className="text-[10px] text-stone-500 hidden sm:block">
            Operasional › <span className="font-semibold text-stone-700">Command Center</span>
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-base sm:text-lg font-bold tracking-tight text-[#10251B]">Pusat komando risiko klaim JKN</h3>
            <p className="text-[11px] text-stone-500 mt-0.5">
              {stats ? `${formatNumber(stats.claims)} klaim` : "—"} ·{" "}
              <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">Dataset sintetis berlabel</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-stone-700">
              <RefreshCw className="w-3 h-3" />
              Segarkan
            </span>
            <Link href="/investigation-queue" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0F2A1B] text-white hover:bg-[#1B4228] transition-colors">
              Antrean prioritas ({stats ? formatNumber(stats.queue_cases) : "—"}) <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={t(0.45)}
          className="grid grid-cols-2 lg:grid-cols-4 rounded-xl overflow-hidden border border-stone-200 bg-white"
        >
          <div className="p-3 bg-[#0F2A1B] text-white col-span-2 lg:col-span-1">
            <div className="text-[10px] text-emerald-100/70">Potensi eksposur finansial</div>
            <div className="mt-1 font-mono text-xl font-bold tracking-tight">{stats ? formatRupiah(stats.exposure_total, true) : "—"}</div>
            <div className="text-[9px] text-emerald-100/60 mt-1">Selisih tarif klaim terflag terhadap acuan peer</div>
          </div>
          {[
            ["Klaim berisiko tinggi", stats ? formatNumber(stats.high_risk_claims) : "—", `dari ${stats ? formatNumber(stats.claims) : "—"} (${pctHigh}%)`, "text-red-600"],
            ["Klaim diajukan", stats ? formatNumber(stats.claims) : "—", `${stats?.provinces ?? "—"} provinsi`, "text-stone-900"],
            ["Faskes berisiko", stats ? formatNumber(stats.risky_providers) : "—", `dari ${stats?.providers ?? "—"} faskes`, "text-stone-900"],
          ].map(([k, v, sub, tone]) => (
            <div key={k} className="p-3 border-l border-stone-100">
              <div className="text-[10px] text-stone-500">{k}</div>
              <div className={`mt-1 font-mono text-xl font-bold tracking-tight ${tone}`}>{v}</div>
              <div className="text-[9px] text-stone-400 mt-1">{sub}</div>
            </div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={t(0.6)}
            className="lg:col-span-3 rounded-xl bg-white border border-stone-200 p-3.5"
          >
            <div className="text-[12px] font-bold text-[#10251B]">Sebaran risiko klaim per provinsi</div>
            <div className="text-[10px] text-stone-500 mb-2">Warna menurut skor risiko provinsi; makin pekat hijau, makin tinggi.</div>
            <div className="relative h-[230px] rounded-lg overflow-hidden border border-stone-200 z-0">
              {stats ? <HeroRiskMap provinces={stats.province_map} /> : <div className="h-full bg-[#EEF3F0]" />}
              <div className="absolute left-2 bottom-2 z-10 flex items-center gap-1.5 rounded-md bg-white/90 border border-stone-200 px-2 py-1 text-[9px] text-stone-600">
                Skor 0
                <span className="inline-block h-2 w-16 rounded-full border border-stone-200" style={{ background: "linear-gradient(90deg,#DCFCE7,#14532D)" }} />
                Skor {Math.max(0, ...(stats?.province_map ?? []).map((p) => p.score))}
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-300 ml-1" />
                tanpa data
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={t(0.7)}
            className="lg:col-span-2 rounded-xl bg-white border border-stone-200 p-3.5"
          >
            <div className="flex items-center justify-between">
              <div className="text-[12px] font-bold text-[#10251B]">Ringkasan temuan</div>
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <p className="text-[10px] leading-snug text-stone-600 mt-1">
              Arsa menganalisis {stats ? formatNumber(stats.claims) : "—"} klaim dan menandai {stats ? formatNumber(stats.high_risk_claims) : "—"} klaim berisiko tinggi dengan potensi eksposur {stats ? formatRupiah(stats.exposure_total, true) : "—"}.
            </p>

            <div className="mt-2.5 flex items-center justify-between">
              <div className="text-[11px] font-semibold text-[#10251B]">Faskes sorotan</div>
              <span className="text-[9px] font-semibold text-[#007A3A]">Semua faskes</span>
            </div>
            <ul className="mt-1.5 grid grid-cols-3 gap-1.5">
              {(stats?.top_providers ?? []).map((p) => {
                const r = 15;
                const c = 2 * Math.PI * r;
                return (
                  <li key={p.name} className="flex flex-col items-center text-center rounded-lg border border-stone-100 py-1.5 px-1">
                    <svg width="40" height="40" viewBox="0 0 40 40" role="img" aria-label={`Skor risiko ${p.risk_score}`}>
                      <circle cx="20" cy="20" r={r} fill="none" stroke="#E4ECE8" strokeWidth="4" />
                      <circle cx="20" cy="20" r={r} fill="none" stroke={p.risk_score >= 90 ? "#B91C1C" : p.risk_score >= 75 ? "#C2410C" : p.risk_score >= 50 ? "#B45309" : "#047857"} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(p.risk_score / 100) * c} ${c}`} transform="rotate(-90 20 20)" />
                      <text x="20" y="24" textAnchor="middle" fontSize="11" fontWeight="700" fill="#11241D">{p.risk_score}</text>
                    </svg>
                    <span className="mt-1 text-[9px] font-semibold leading-tight text-stone-800 line-clamp-2">{p.name}</span>
                    <span className="font-mono text-[8px] text-stone-400">{formatRupiah(p.exposure, true)}</span>
                  </li>
                );
              })}
            </ul>

            <div className="mt-2.5 flex items-center justify-between">
              <div className="text-[11px] font-semibold text-[#10251B]">Provinsi terpanas</div>
              <span className="text-[9px] font-semibold text-[#007A3A]">Peta lengkap</span>
            </div>
            <ul className="mt-1.5 grid grid-cols-5 gap-1">
              {hot.map((p) => {
                const tt = Math.max(0, Math.min(1, p.score / Math.max(1, hot[0]?.score ?? 1)));
                const k = 0.1 + 0.9 * Math.pow(tt, 0.6);
                const bg = [0xdc, 0xfc, 0xe7].map((v, i) => Math.round(v + ([0x14, 0x53, 0x2d][i] - v) * k));
                return (
                  <li key={p.code} className="rounded-md px-1 py-2 text-center" style={{ backgroundColor: `rgb(${bg.join(",")})`, color: tt > 0.45 ? "#fff" : "#11241D" }}>
                    <span className="block text-[12px] font-semibold leading-none">{p.score}</span>
                    <span className="block mt-0.5 text-[8px] leading-tight line-clamp-2 opacity-90">{p.name}</span>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
