"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Search,
  Bell,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/formatting/date";

interface TopHeaderProps {
  onOpenSearch?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onOpenSearch }) => {
  const [isResetting, setIsResetting] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const notifications = [
    {
      id: "N-1",
      title: "Critical Upcoding Surge",
      desc: "Claim CLM-10293 and 6 network hospitals in South Jakarta exhibit severity inflation.",
      time: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
      unread: true,
      link: "/investigations/INV-2026-010293",
      type: "CRITICAL",
    },
    {
      id: "N-2",
      title: "Medical Narrative Duplication",
      desc: "Cluster CLUSTER-42 identified 96.4% semantic match in clinical summaries at RS Medika Utama.",
      time: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      unread: true,
      link: "/risk-intelligence",
      type: "WARNING",
    },
    {
      id: "N-3",
      title: "Executive Audit Ready",
      desc: "AI Intelligence Executive Briefing updated with Rp 824.6 Billion potential risk exposure.",
      time: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      unread: false,
      link: "/reports",
      type: "INFO",
    },
  ];

  const unreadCount = notifications.filter((n) => n.unread).length;

  const handleResetDemo = async () => {
    try {
      setIsResetting(true);
      const res = await fetch("/api/demo/reset", { method: "POST" });
      if (res.ok) {
        setResetSuccess(true);
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

  return (
    <>
      <header className="h-16 bg-surface border-b border-jkn-border flex items-center justify-between px-6 sticky top-0 z-20 shadow-xs print:hidden">
        {/* Global Search Bar */}
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          <button
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg bg-surface-secondary border border-jkn-border text-xs text-jkn-muted hover:border-bpjs/50 hover:bg-white transition-all shadow-2xs group"
          >
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-jkn-dim group-hover:text-bpjs transition-colors" />
              <span>Search SEP number, Patient ID (P-10842), Hospital, or ICD-10...</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-jkn-border rounded text-jkn-dim shadow-2xs">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Reset Demo Data Button */}
          <button
            onClick={handleResetDemo}
            disabled={isResetting}
            title="Reset demonstration data to initial seed state"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-jkn-border bg-white text-xs font-medium text-jkn-text hover:bg-surface-secondary hover:text-bpjs transition-all shadow-2xs active:scale-95 disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? "animate-spin text-bpjs" : ""}`} />
            <span>{resetSuccess ? "Reset Successful!" : "Reset Demo"}</span>
          </button>

          <div className="h-5 w-px bg-jkn-divider mx-1" />

          {/* Notifications Button */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg text-jkn-muted hover:text-jkn-text hover:bg-surface-secondary transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-risk-critical animate-pulse" />
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-surface rounded-2xl border border-jkn-border shadow-elevated p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-jkn-divider">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-jkn-text">Notifications</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-bpjs-light text-bpjs-dark font-semibold">
                      {unreadCount} New
                    </span>
                  </div>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-jkn-dim hover:text-jkn-text"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {notifications.map((n) => (
                    <Link
                      key={n.id}
                      href={n.link}
                      onClick={() => setShowNotifications(false)}
                      className="block p-2 rounded-lg hover:bg-surface-secondary transition-colors text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-jkn-text">{n.title}</span>
                        <span className="text-[10px] text-jkn-dim">{formatRelativeTime(n.time)}</span>
                      </div>
                      <p className="text-[11px] text-jkn-muted line-clamp-2 mt-0.5">{n.desc}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-2.5 pl-2">
            <div className="w-8 h-8 rounded-full bg-bpjs-light text-bpjs-dark font-bold text-xs flex items-center justify-center border border-bpjs-border">
              AI
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-bold text-jkn-text leading-tight">Aril Indra Permana</div>
              <div className="text-[10px] text-bpjs font-medium">Senior Investigator</div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
};
