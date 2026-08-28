import React from "react";

interface PageLoaderProps {
  label: string;
  className?: string;
}

/**
 * Shared in-content loading state for pages fetching data client-side
 * (rendered inside DashboardShell, so the sidebar/header stay visible).
 */
export const PageLoader: React.FC<PageLoaderProps> = ({ label, className }) => (
  <div className={`flex flex-col items-center justify-center gap-3 py-24 ${className || ""}`}>
    <div className="w-9 h-9 rounded-full border-[3px] border-bpjs/25 border-t-bpjs animate-spin" />
    <p className="text-xs font-semibold text-jkn-muted">{label}</p>
  </div>
);
