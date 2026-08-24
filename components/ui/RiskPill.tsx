import React from "react";
import { RiskLevel, RiskType } from "@/types/risk";
import { AlertTriangle, AlertCircle, ShieldAlert, ShieldCheck, Activity, Copy, FileQuestion, Clock } from "lucide-react";
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
      bg: "bg-risk-critical-bg text-risk-critical border-risk-critical-border",
      badgeBg: "bg-risk-critical text-white",
      label: "Critical",
      icon: ShieldAlert,
    },
    HIGH: {
      bg: "bg-risk-high-bg text-risk-high border-risk-high-border",
      badgeBg: "bg-risk-high text-white",
      label: "High Risk",
      icon: AlertTriangle,
    },
    MEDIUM: {
      bg: "bg-risk-medium-bg text-amber-800 border-risk-medium-border",
      badgeBg: "bg-risk-medium text-white",
      label: "Medium",
      icon: AlertCircle,
    },
    LOW: {
      bg: "bg-risk-low-bg text-emerald-800 border-risk-low-border",
      badgeBg: "bg-risk-low text-white",
      label: "Low Risk",
      icon: ShieldCheck,
    },
  };

  const typeConfigs: Record<RiskType, { label: string; icon: React.ElementType; color: string }> = {
    UPCODING: { label: "Upcoding", icon: Activity, color: "bg-rose-50 text-rose-700 border-rose-200" },
    CLONING: { label: "Cloning", icon: Copy, color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    PHANTOM_BILLING: { label: "Phantom Billing", icon: FileQuestion, color: "bg-amber-50 text-amber-800 border-amber-200" },
    ABNORMAL_LOS: { label: "Abnormal LOS", icon: Clock, color: "bg-cyan-50 text-cyan-800 border-cyan-200" },
  };

  if (type) {
    const config = typeConfigs[type] || typeConfigs.UPCODING;
    const Icon = config.icon;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 font-medium rounded-full border px-2.5 py-0.5 text-xs",
          config.color,
          className
        )}
      >
        {showIcon && <Icon className="w-3.5 h-3.5 shrink-0" />}
        <span>{config.label}</span>
      </span>
    );
  }

  const current = levelConfigs[resolvedLevel];
  const Icon = current.icon;

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-sm px-3.5 py-1.5 gap-2 font-semibold",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full border shadow-sm transition-all",
        current.bg,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={cn(size === "lg" ? "w-4 h-4" : "w-3.5 h-3.5", "shrink-0")} />}
      {score !== undefined && (
        <span className={cn("px-1.5 py-0.2 rounded-full text-[11px] font-bold", current.badgeBg)}>
          {score}
        </span>
      )}
      <span className="tracking-wide uppercase text-[11px]">{current.label}</span>
    </span>
  );
};
