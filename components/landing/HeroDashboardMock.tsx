"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Activity, ArrowRight, Building2, Database, Gauge, LayoutGrid, Library, Network, RefreshCw, Search, Settings, ShieldAlert, Sparkles } from "lucide-react";
import { formatNumber, formatRupiah } from "@/lib/formatting/currency";
import dynamic from "next/dynamic";
import { PublicStats, RISK_LABEL } from "./stats";

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
            <div className="text-[10px] text-stone-500 mb-2">Warna menurut skor risiko; ukuran menurut klaim berisiko tinggi</div>
            <div className="relative h-[230px] rounded-lg overflow-hidden border border-stone-200 z-0">
              {stats ? <HeroRiskMap provinces={stats.province_map} /> : <div className="h-full bg-[#EEF3F0]" />}
              <div className="absolute left-2 bottom-2 z-[500] flex items-center gap-2 rounded-md bg-white/90 px-2 py-1 text-[9px] text-stone-600 shadow-sm">
                {[["#DC2626", "Kritis"], ["#EA580C", "Tinggi"], ["#D97706", "Sedang"], ["#059669", "Rendah"]].map(([c, l]) => (
                  <span key={l} className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
                    {l}
                  </span>
                ))}
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
            <div className="text-[10px] text-stone-500 mb-2">Faskes dengan skor risiko tertinggi</div>
            <ul className="space-y-2">
              {(stats?.top_providers ?? []).map((p) => (
                <li key={p.name} className="text-[10px] leading-snug text-stone-600 pb-2 border-b border-stone-100 last:border-0">
                  <span className="font-semibold text-stone-800">{p.name}</span>: {formatNumber(p.high_risk_claims)} klaim berisiko tinggi dari {formatNumber(p.total_claims)}, eksposur{" "}
                  {formatRupiah(p.exposure, true)}, dominan {RISK_LABEL[p.dominant_risk_type] ?? p.dominant_risk_type}.
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
