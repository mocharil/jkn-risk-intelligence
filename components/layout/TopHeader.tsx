"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  Bell,
  RotateCcw,
  X,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Check,
  UserCheck,
  ChevronRight,
} from "lucide-react";
import { useSession } from "@/lib/auth/client";
import { Role, ROLE_LABEL } from "@/lib/auth/types";
import { EmergingSignal } from "@/types/risk";
import { formatRelativeTime } from "@/lib/formatting/date";
import { cn } from "@/lib/utils";

interface TopHeaderProps {
  onOpenSearch?: () => void;
  onOpenMobileMenu?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
}

const DEMO_ROLES: { role: Role; label: string; desc: string }[] = [
  { role: "INVESTIGATOR", label: "Investigator Klaim", desc: "Tinjau bukti & usul temuan" },
  { role: "SUPERVISOR", label: "Supervisor Verifikasi", desc: "Keputusan final & upload dataset" },
  { role: "ADMIN", label: "Administrator Sistem", desc: "Kelola akun & reset data demo" },
];

function getRouteContext(pathname: string): { section: string; title: string } {
  if (pathname === "/") return { section: "Operasional", title: "Command Center" };
  if (
    pathname.startsWith("/investigation-queue") ||
    pathname.startsWith("/investigations") ||
    pathname.startsWith("/claims") ||
    pathname.startsWith("/reports")
  ) {
    return { section: "Operasional", title: "Pemeriksaan Klaim & Dosier" };
  }
  if (pathname.startsWith("/providers")) return { section: "Operasional", title: "Profil Faskes" };
  if (pathname.startsWith("/risk-intelligence")) return { section: "Intelijen", title: "Peta Risiko & Graf" };
  if (pathname.startsWith("/copilot")) return { section: "Intelijen", title: "AI Copilot" };
  if (pathname.startsWith("/model-performance")) return { section: "Intelijen", title: "Evaluasi & Kalibrasi" };
  if (pathname.startsWith("/data-management")) return { section: "Tata Kelola", title: "Manajemen Dataset" };
  if (pathname.startsWith("/settings")) return { section: "Tata Kelola", title: "Pengaturan & Audit" };
  return { section: "ARSA JKN", title: "Ruang Kerja Audit" };
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onOpenSearch,
  onOpenMobileMenu,
  isSidebarCollapsed = false,
  onToggleSidebarCollapse,
}) => {
  const pathname = usePathname();
  const routeCtx = getRouteContext(pathname || "/");
  const [isResetting, setIsResetting] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [switchingRole, setSwitchingRole] = useState<Role | null>(null);

  const { user, role, can, logout, switchDemoRole } = useSession();
  const [signals, setSignals] = useState<EmergingSignal[]>([]);
  const [showMenu, setShowMenu] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setSignals(j.emerging_signals || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowNotifications(false);
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Notifikasi = sinyal emergen nyata dari data, bukan teks tetap.
  const notifications = signals.map((s) => ({
    id: s.signal_id,
    title: s.title,
    desc: s.description,
    time: s.detected_at,
    unread: s.severity === "CRITICAL" || s.severity === "HIGH",
    link: s.highlighted_claim_ids[0] ? `/claims?search=${encodeURIComponent(s.highlighted_claim_ids[0])}` : "/risk-intelligence",
    type: s.severity,
  }));

  const unreadCount = notifications.filter((n) => n.unread).length;

  const handleResetDemo = async () => {
    try {
      setIsResetting(true);
      const res = await fetch("/api/demo/reset", { method: "POST" });
      if (res.ok) {
        setResetSuccess(true);
        window.dispatchEvent(new CustomEvent("arsa:store-updated"));
        setTimeout(() => {
          setResetSuccess(false);
          window.location.reload();
        }, 800);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsResetting(false);
    }
  };

  const handleSwitchRole = async (targetRole: Role) => {
    if (targetRole === role || switchingRole) return;
    setSwitchingRole(targetRole);
    try {
      const ok = await switchDemoRole(targetRole);
      if (ok) {
        setShowMenu(false);
      }
    } finally {
      setSwitchingRole(null);
    }
  };

  return (
    <>
      <header className="h-16 shrink-0 bg-white/85 backdrop-blur-md border-b border-jkn-border/80 flex items-center justify-between px-3 sm:px-6 sticky top-0 z-20 print:hidden gap-3">
        {/* Left: Sidebar Toggle, Route Context & Command Search */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {onOpenMobileMenu && (
            <button
              onClick={onOpenMobileMenu}
              aria-label="Buka menu navigasi"
              className="lg:hidden h-9 w-9 inline-flex items-center justify-center rounded-xl text-jkn-muted hover:text-jkn-text hover:bg-surface-secondary border border-jkn-border/80 transition-colors shrink-0"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}
          {onToggleSidebarCollapse && (
            <button
              onClick={onToggleSidebarCollapse}
              aria-label={isSidebarCollapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
              title={isSidebarCollapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
              className="hidden lg:inline-flex h-9 w-9 items-center justify-center rounded-xl text-jkn-muted hover:text-jkn-text hover:bg-surface-secondary/80 transition-colors shrink-0"
            >
              {isSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          )}

          {/* Active Workspace Context Breadcrumb */}
          <div className="hidden md:flex items-center gap-1.5 text-xs pr-2 border-r border-jkn-divider shrink-0">
            <span className="text-jkn-dim font-medium">{routeCtx.section}</span>
            <ChevronRight className="w-3.5 h-3.5 text-jkn-dim/60" />
            <span className="font-semibold text-jkn-text">{routeCtx.title}</span>
          </div>

          <button
            onClick={onOpenSearch}
            className="flex-1 max-w-md h-9 flex items-center justify-between px-3 rounded-xl bg-surface-subtle/90 border border-jkn-border/90 text-xs text-jkn-muted hover:border-bpjs/50 hover:bg-white hover:shadow-subtle transition-all group min-w-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Search className="w-3.5 h-3.5 text-jkn-dim group-hover:text-bpjs transition-colors shrink-0" />
              <span className="truncate">Cari klaim (CLM-10293), faskes, atau ICD-10...</span>
            </div>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white border border-jkn-border rounded-md text-jkn-dim shadow-2xs shrink-0 ml-2">
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Reset Demo Data Button (hanya Admin) */}
          {can("admin.reset_demo") && (
            <button
              onClick={handleResetDemo}
              disabled={isResetting}
              title="Reset seluruh data demonstrasi ke kondisi awal (seed)"
              className="h-9 flex items-center gap-1.5 px-2.5 sm:px-3 rounded-xl border border-jkn-border/90 bg-white text-xs font-semibold text-jkn-text hover:bg-surface-secondary hover:text-bpjs shadow-2xs transition-all disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? "animate-spin text-bpjs" : ""}`} />
              <span className="hidden sm:inline">{resetSuccess ? "Reset Berhasil!" : "Reset Demo"}</span>
            </button>
          )}

          {/* Notifications Button */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setShowNotifications((prev) => !prev);
                setShowMenu(false);
              }}
              aria-label={`Sinyal emergen${unreadCount > 0 ? `, ${unreadCount} baru` : ""}`}
              aria-expanded={showNotifications}
              className="relative h-9 w-9 inline-flex items-center justify-center rounded-xl border border-transparent hover:border-jkn-border/80 text-jkn-muted hover:text-jkn-text hover:bg-surface-secondary/70 transition-all"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-risk-critical ring-2 ring-white" />
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-24px)] bg-surface rounded-2xl border border-jkn-border shadow-elevated p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-jkn-divider">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-jkn-text">Sinyal Risiko Baru</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-bpjs-soft text-bpjs-dark border border-bpjs-border font-semibold tabular-nums">
                      {unreadCount} prioritas
                    </span>
                  </div>
                  <button
                    onClick={() => setShowNotifications(false)}
                    aria-label="Tutup"
                    className="text-jkn-dim hover:text-jkn-text"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5 max-h-72 overflow-y-auto custom-scrollbar">
                  {notifications.length === 0 && (
                    <p className="text-[11px] text-jkn-muted p-2">Belum ada sinyal risiko baru.</p>
                  )}
                  {notifications.map((n) => (
                    <Link
                      key={n.id}
                      href={n.link}
                      onClick={() => setShowNotifications(false)}
                      className="block p-2 rounded-xl hover:bg-surface-secondary transition-colors text-left"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-jkn-text truncate">{n.title}</span>
                        <span className="text-[10px] text-jkn-dim shrink-0 tabular-nums">{formatRelativeTime(n.time)}</span>
                      </div>
                      <p className="text-[11px] text-jkn-muted line-clamp-2 mt-0.5">{n.desc}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="h-5 w-px bg-jkn-divider mx-0.5 hidden sm:block" />

          {/* User Profile & 1-Click Demo Role Switcher */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => {
                setShowMenu((prev) => !prev);
                setShowNotifications(false);
              }}
              aria-label="Menu pengguna"
              aria-expanded={showMenu}
              className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1 rounded-xl border border-jkn-border/80 bg-surface-subtle/60 hover:bg-white hover:border-bpjs/40 transition-all text-left shadow-2xs"
            >
              <div className="w-7 h-7 rounded-lg bg-[#071A12] text-[#6EE7B7] font-bold text-[11px] flex items-center justify-center border border-[#00A859]/40 shrink-0">
                {(user?.name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
              </div>
              <div className="hidden lg:block">
                <div className="text-xs font-semibold text-jkn-text leading-tight">{user?.name || "-"}</div>
                <div className="text-[10px] text-bpjs font-semibold">{role ? ROLE_LABEL[role] : ""}</div>
              </div>
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-24px)] bg-surface rounded-xl border border-jkn-border shadow-elevated p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-2 border-b border-jkn-divider mb-2">
                  <div className="text-xs font-bold text-jkn-text truncate">{user?.name}</div>
                  <div className="text-[11px] text-jkn-muted truncate">{user?.email}</div>
                  <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-bpjs-soft text-bpjs-dark font-semibold border border-bpjs-border">
                    {role ? ROLE_LABEL[role] : ""}
                  </span>
                </div>

                {/* 1-Click Demo Role Switcher */}
                <div className="px-1.5 py-1 mb-2 border-b border-jkn-divider">
                  <div className="flex items-center gap-1.5 px-1 mb-1.5 text-[10px] font-bold text-jkn-dim uppercase tracking-wider">
                    <UserCheck className="w-3 h-3 text-bpjs" />
                    <span>Ganti Peran Demo Cepat</span>
                  </div>
                  <div className="space-y-1">
                    {DEMO_ROLES.map((item) => {
                      const active = role === item.role;
                      const busy = switchingRole === item.role;
                      return (
                        <button
                          key={item.role}
                          onClick={() => handleSwitchRole(item.role)}
                          disabled={active || Boolean(switchingRole)}
                          className={cn(
                            "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors",
                            active
                              ? "bg-bpjs-soft text-bpjs-dark border border-bpjs-border font-semibold cursor-default"
                              : "hover:bg-surface-secondary text-jkn-text"
                          )}
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-semibold truncate">{item.label}</div>
                            <div className="text-[10px] text-jkn-muted truncate">{item.desc}</div>
                          </div>
                          {active ? (
                            <Check className="w-3.5 h-3.5 text-bpjs shrink-0 ml-2" />
                          ) : busy ? (
                            <span className="text-[10px] text-bpjs font-semibold shrink-0 ml-2">...</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-risk-critical hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" /> Keluar Sesi
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
};

