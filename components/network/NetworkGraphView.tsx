"use client";

import React from "react";
import dynamic from "next/dynamic";

const DynamicVisNetwork = dynamic(
  () => import("./VisNetworkGraph").then((mod) => mod.VisNetworkGraph),
  {
    ssr: false,
    loading: () => (
      <div className="relative bg-surface rounded-2xl border border-jkn-border p-4 shadow-sm h-[480px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-xs text-jkn-muted">
          <div className="w-8 h-8 border-2 border-bpjs border-t-transparent rounded-full animate-spin" />
          <p className="font-semibold">Menyiapkan Graf Relasi Entitas...</p>
        </div>
      </div>
    ),
  }
);

interface NetworkGraphViewProps {
  claimId?: string;
  providerId?: string;
  className?: string;
}

export const NetworkGraphView: React.FC<NetworkGraphViewProps> = (props) => {
  return <DynamicVisNetwork {...props} />;
};
