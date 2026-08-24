"use client";

import React from "react";
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
  ChevronRight,
  ShieldCheck,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  queueCount?: number;
  onOpenCopilot?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ queueCount = 47, onOpenCopilot }) => {
  const pathname = usePathname();

  const navGroups = [
    {
      group: "COMMAND",
      items: [
        {
          name: "Command Center",
          href: "/",
          icon: LayoutDashboard,
          badge: "Live",
          badgeColor: "bg-emerald-100 text-emerald-800",
        },
        {
          name: "Landing Page Portal",
          href: "/landing",
          icon: Sparkles,
        },
      ],
    },
    {
      group: "INVESTIGATION",
      items: [
        {
          name: "Investigation Queue",
          href: "/investigation-queue",
          icon: ShieldAlert,
          badge: queueCount.toString(),
          badgeColor: "bg-risk-critical text-white font-bold",
        },
        {
          name: "Claims Intelligence",
          href: "/claims",
          icon: FileText,
        },
        {
          name: "Provider Profiles",
          href: "/providers",
          icon: Building2,
        },
      ],
    },
    {
      group: "INTELLIGENCE",
      items: [
        {
          name: "Risk Intelligence",
          href: "/risk-intelligence",
          icon: Network,
        },
        {
          name: "AI Copilot",
          href: "/copilot",
          icon: Bot,
          badge: "AI",
          badgeColor: "bg-indigo-100 text-indigo-700 font-semibold",
        },
      ],
    },
    {
      group: "DATA ONBOARDING",
      items: [
        {
          name: "Data Management",
          href: "/data-management",
          icon: Database,
        },
      ],
    },
    {
      group: "OUTPUT & AUDIT",
      items: [
        {
          name: "Audit Reports & Dossiers",
          href: "/reports",
          icon: FileSpreadsheet,
        },
        {
          name: "Settings & Audit Trail",
          href: "/settings",
          icon: Settings,
        },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-surface border-r border-jkn-border flex flex-col shrink-0 h-screen sticky top-0 select-none z-30 print:hidden">
      {/* Brand Header */}
      <div className="p-4 border-b border-jkn-divider flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white border border-bpjs-border flex items-center justify-center shadow-xs overflow-hidden p-1 shrink-0">
          <img src="/arsa_logo.png" alt="ARSA JKN Risk Intelligence" className="w-full h-full object-contain" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm tracking-tight text-jkn-text">JKN RISK</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-bpjs-light text-bpjs-dark font-bold tracking-wider uppercase">
              PRO
            </span>
          </div>
          <p className="text-[11px] text-jkn-muted font-medium">BPJS Intelligence Suite</p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar">
        {navGroups.map((group) => (
          <div key={group.group} className="space-y-1">
            <h4 className="px-3 text-[10px] font-bold text-jkn-dim tracking-wider uppercase">
              {group.group}
            </h4>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group",
                      isActive
                        ? "bg-bpjs-soft text-bpjs-dark font-semibold border border-bpjs-border shadow-xs"
                        : "text-jkn-text hover:bg-surface-secondary hover:text-jkn-text"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={cn(
                          "w-4 h-4 transition-colors",
                          isActive
                            ? "text-bpjs"
                            : "text-jkn-muted group-hover:text-jkn-text"
                        )}
                      />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.2 rounded-full",
                          item.badgeColor || "bg-surface-secondary text-jkn-muted"
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* System Status Footer */}
      <div className="p-3 border-t border-jkn-divider bg-surface-secondary/40">
        <div className="flex items-center justify-between px-2 py-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-bpjs animate-pulse" />
            <span className="text-[11px] font-semibold text-jkn-muted">ARSA Engine v2.4</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-jkn-border text-jkn-dim font-mono">
            Active
          </span>
        </div>
      </div>
    </aside>
  );
};
