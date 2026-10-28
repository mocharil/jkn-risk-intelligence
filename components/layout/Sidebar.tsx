"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShieldAlert,
  FileText,
  Building2,
  Network,
  Bot,
  Database,
  FileSpreadsheet,
  Settings,
  Sparkles,
  Gauge,
  X,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  queueCount?: number;
  onOpenCopilot?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  queueCount: queueOverride,
  isCollapsed = false,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const pathname = usePathname();
  const [detectorCount, setDetectorCount] = useState<number | null>(null);
  const [queueCount, setQueueCount] = useState<number | null>(queueOverride ?? null);
  const [ai, setAi] = useState<{ available: boolean; mode: string; source: string; label?: string; reason?: string } | null>(null);

  const refreshCountsAndStatus = useCallback(() => {
    fetch("/api/investigations?limit=1&status=NEW")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setQueueCount(j.total_count))
      .catch(() => {});
    fetch("/api/system/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j && typeof j.detector_count === "number") setDetectorCount(j.detector_count); return j; })
      .then((j) => j && setAi({ available: j.ai.available, mode: j.ai.mode, source: j.ai.credential_source, label: j.ai.provider_label, reason: j.ai.reason }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshCountsAndStatus();
  }, [pathname, refreshCountsAndStatus]);

  useEffect(() => {
    const onStoreUpdated = () => refreshCountsAndStatus();
    window.addEventListener("arsa:store-updated", onStoreUpdated);
    return () => window.removeEventListener("arsa:store-updated", onStoreUpdated);
  }, [refreshCountsAndStatus]);

  const navGroups = [
    {
      group: "OPERASIONAL & AUDIT",
      items: [
        {
          name: "Command Center",
          href: "/",
          icon: LayoutDashboard,
        },
        {
          name: "Pemeriksaan Klaim",
          href: "/investigation-queue",
          icon: ShieldAlert,
          badge: queueCount === null ? undefined : queueCount.toString(),
          badgeColor: "bg-risk-critical text-white font-mono tabular-nums font-bold",
        },
        {
          name: "Profil Faskes",
          href: "/providers",
          icon: Building2,
        },
      ],
    },
    {
      group: "INTELIJEN & DETEKTOR",
      items: [
        {
          name: "Peta Risiko & Graf",
          href: "/risk-intelligence",
          icon: Network,
        },
        {
          name: "AI Copilot",
          href: "/copilot",
          icon: Bot,
          badge: ai ? (ai.available ? "AI" : "Lokal") : undefined,
          badgeColor: ai?.available
            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-semibold"
            : "bg-amber-500/20 text-amber-200 border border-amber-400/30 font-semibold",
        },
        {
          name: "Evaluasi & Kalibrasi",
          href: "/model-performance",
          icon: Gauge,
        },
      ],
    },
    {
      group: "DATA & TATA KELOLA",
      items: [
        {
          name: "Acuan Nasional BPJS",
          href: "/acuan-nasional",
          icon: BarChart3,
        },
        {
          name: "Manajemen Dataset",
          href: "/data-management",
          icon: Database,
        },
        {
          name: "Pengaturan & Audit",
          href: "/settings",
          icon: Settings,
        },
      ],
    },
  ];

  const renderSidebarContent = (collapsed: boolean, isMobile: boolean) => (
    <div className="relative flex flex-col h-full bg-[#071A12] text-white overflow-hidden">
      {/* Subtle architectural ambient glow */}
      <div
        className="pointer-events-none absolute -top-24 -left-24 w-64 h-64 rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle, #00A859 0%, transparent 70%)" }}
      />

      {/* Brand Header */}
      <div
        className={cn(
          "relative h-16 px-4 border-b border-white/[0.08] flex items-center shrink-0",
          collapsed ? "justify-center" : "justify-between gap-3"
        )}
      >
        <Link href="/" className="flex items-center gap-3 min-w-0 group">
          <div className="w-9 h-9 rounded-xl bg-white/95 border border-white/20 group-hover:border-[#34D399] flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.25)] overflow-hidden p-1 shrink-0 transition-all duration-200 group-hover:scale-[1.02]">
            <img src="/arsa_logo.png" alt="ARSA JKN Risk Intelligence" className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-white truncate">ARSA JKN</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#00A859]/20 text-[#6EE7B7] border border-[#00A859]/35 font-mono font-semibold uppercase tracking-wider">
                  BPJS
                </span>
              </div>
              <p className="text-[11px] text-emerald-100/55 truncate">Audit & Intelijen Klaim</p>
            </div>
          )}
        </Link>
        {isMobile && onCloseMobile && (
          <button
            onClick={onCloseMobile}
            aria-label="Tutup navigasi"
            className="p-1.5 rounded-lg text-emerald-100/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="relative flex-1 overflow-y-auto px-3 py-4 space-y-5 custom-scrollbar">
        {navGroups.map((group) => (
          <div key={group.group} className="space-y-1.5">
            {!collapsed && (
              <h4 className="px-2.5 text-[10px] font-bold text-emerald-100/40 tracking-[0.14em] uppercase">
                {group.group}
              </h4>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : item.href === "/investigation-queue"
                    ? pathname.startsWith("/investigation-queue") ||
                      pathname.startsWith("/investigations") ||
                      pathname.startsWith("/claims") ||
                      pathname.startsWith("/reports")
                    : pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => isMobile && onCloseMobile?.()}
                    title={collapsed ? item.name : undefined}
                    className={cn(
                      "flex items-center rounded-xl text-xs transition-all duration-150 group relative",
                      collapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5",
                      isActive
                        ? "bg-gradient-to-r from-[#00A859]/25 via-[#00A859]/12 to-white/[0.03] text-white font-semibold border border-[#00A859]/40 shadow-[0_2px_12px_-3px_rgba(0,168,89,0.3)]"
                        : "text-emerald-50/70 font-medium border border-transparent hover:bg-white/[0.06] hover:text-white"
                    )}
                  >
                    {isActive && !collapsed && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#34D399] shadow-[0_0_8px_#34D399]" />
                    )}
                    <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-2.5")}>
                      <Icon
                        className={cn(
                          "w-4 h-4 shrink-0 transition-colors",
                          isActive
                            ? "text-[#34D399]"
                            : "text-emerald-100/50 group-hover:text-emerald-200"
                        )}
                      />
                      {!collapsed && <span className="tracking-[-0.01em]">{item.name}</span>}
                    </div>
                    {!collapsed && item.badge && (
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-md leading-none",
                          item.badgeColor || "bg-white/10 text-emerald-100"
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                    {collapsed && item.badge && (
                      <span
                        className={cn(
                          "absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-[#071A12]",
                          item.href === "/investigation-queue" ? "bg-rose-500" : "bg-[#34D399]"
                        )}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* System Status Footer: status AI nyata + tautan ikhtisar */}
      <div className="relative p-3 border-t border-white/[0.08] bg-black/20 space-y-2">
        <div
          className={cn(
            "flex items-center rounded-xl bg-white/[0.04] border border-white/[0.08] py-2",
            collapsed ? "justify-center px-1" : "justify-between px-3"
          )}
          title={(ai?.available ? "Asisten AI aktif" : "AI: mode deterministik")}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={cn(
                "w-2 h-2 rounded-full shrink-0",
                ai === null
                  ? "bg-emerald-100/40"
                  : ai.available
                  ? "bg-[#34D399] shadow-[0_0_8px_#34D399] animate-pulse"
                  : "bg-amber-400"
              )}
            />
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-white/90 truncate leading-tight">
                  {ai === null
                    ? "Memeriksa Mesin..."
                    : ai.available
                    ? "Asisten AI aktif"
                    : "Mesin Deterministik"}
                </div>
                <div className="text-[10px] text-emerald-100/45 truncate">
                  {detectorCount === null ? "Detektor Forensik JKN" : `${detectorCount} Detektor Forensik JKN`}
                </div>
              </div>
            )}
          </div>
        </div>
        {!collapsed && (
          <Link
            href="/landing"
            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-emerald-100/55 hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <span>Ikhtisar Eksekutif</span>
            <span className="font-mono text-[10px] text-emerald-300/70">↗</span>
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex bg-[#071A12] border-r border-[#0E291E] flex-col shrink-0 h-screen sticky top-0 select-none z-30 print:hidden transition-all duration-200",
          isCollapsed ? "w-[74px]" : "w-64"
        )}
      >
        {renderSidebarContent(isCollapsed, false)}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex print:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative w-64 max-w-[82vw] bg-[#071A12] border-r border-white/10 flex flex-col h-full z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            {renderSidebarContent(false, true)}
          </aside>
        </div>
      )}
    </>
  );
};

