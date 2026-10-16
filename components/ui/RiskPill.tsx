import React from "react";
import { RiskLevel, RiskType } from "@/types/risk";
import { AlertTriangle, AlertCircle, ShieldAlert, ShieldCheck, Activity, Copy, FileQuestion, Clock, Layers, TrendingUp, Repeat, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface RiskPillProps {
  score?: number;
  level?: RiskLevel;
  type?: RiskType;
  size?: "sm" | "md" | "lg";
  className?: string;
  showIcon?: boolean;
}

export const RiskPill: React.FC<RiskPillProps> = ({
  score,
  level,
  type,
  size = "md",
  className,
  showIcon = true,
}) => {
  // Infer level if score is provided without level
  const resolvedLevel: RiskLevel =
    level ||
    (score !== undefined
      ? score >= 90
        ? "CRITICAL"
        : score >= 75
        ? "HIGH"
        : score >= 50
        ? "MEDIUM"
        : "LOW"
      : "LOW");

  const levelConfigs = {
    CRITICAL: {
      bg: "bg-risk-critical-bg text-red-900 border-risk-critical-border",
      badgeBg: "bg-risk-critical text-white",
      label: "Kritis",
      icon: ShieldAlert,
    },
    HIGH: {
      bg: "bg-risk-high-bg text-rose-900 border-risk-high-border",
      badgeBg: "bg-risk-high text-white",
      label: "Tinggi",
      icon: AlertTriangle,
    },
    MEDIUM: {
      bg: "bg-risk-medium-bg text-amber-900 border-risk-medium-border",
      badgeBg: "bg-amber-600 text-white",
      label: "Sedang",
      icon: AlertCircle,
    },
    LOW: {
      bg: "bg-risk-low-bg text-emerald-900 border-risk-low-border",
      badgeBg: "bg-risk-low text-white",
      label: "Rendah",
      icon: ShieldCheck,
    },
  };

  const typeConfigs: Record<RiskType, { label: string; icon: React.ElementType; color: string }> = {
    UPCODING: { label: "Upcoding", icon: Activity, color: "bg-surface-secondary text-jkn-text border-jkn-border" },
    CLONING: { label: "Cloning", icon: Copy, color: "bg-surface-secondary text-jkn-text border-jkn-border" },
    PHANTOM_BILLING: { label: "Phantom Billing", icon: FileQuestion, color: "bg-surface-secondary text-jkn-text border-jkn-border" },
    ABNORMAL_LOS: { label: "LOS Anomali", icon: Clock, color: "bg-surface-secondary text-jkn-text border-jkn-border" },
    UNBUNDLING: { label: "Unbundling", icon: Layers, color: "bg-surface-secondary text-jkn-text border-jkn-border" },
    INFLATED_BILLS: { label: "Inflasi Tagihan", icon: TrendingUp, color: "bg-surface-secondary text-jkn-text border-jkn-border" },
    REPEAT_BILLING: { label: "Tagihan Berulang", icon: Repeat, color: "bg-surface-secondary text-jkn-text border-jkn-border" },
    READMISSION: { label: "Readmisi Dini", icon: RotateCcw, color: "bg-surface-secondary text-jkn-text border-jkn-border" },
  };

  if (type) {
    const config = typeConfigs[type] || typeConfigs.UPCODING;
    const Icon = config.icon;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 font-medium rounded-md border px-2 py-0.5 text-[11px] leading-tight",
          config.color,
          className
        )}
      >
        {showIcon && <Icon className="w-3 h-3 text-jkn-muted shrink-0" />}
        <span>{config.label}</span>
      </span>
    );
  }

  const current = levelConfigs[resolvedLevel];
  const Icon = current.icon;

  const sizeClasses = {
    sm: "text-[11px] px-2 py-0.5 gap-1.5",
    md: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-xs px-3 py-1.5 gap-2 font-semibold",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold rounded-md border transition-colors whitespace-nowrap",
        current.bg,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={cn(size === "lg" ? "w-3.5 h-3.5" : "w-3 h-3", "shrink-0")} />}
      {score !== undefined && (
        <span className={cn("px-1.5 py-0.2 rounded font-mono tabular-nums text-[11px] font-bold leading-snug", current.badgeBg)}>
          {score}
        </span>
      )}
      <span className="tracking-wide uppercase text-[10px] font-bold">{current.label}</span>
    </span>
  );
};
