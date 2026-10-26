"use client";

import { BrandLoader } from "@/components/ui/BrandLoader";

import React from "react";
import dynamic from "next/dynamic";

const DynamicVisNetwork = dynamic(
  () => import("./VisNetworkGraph").then((mod) => mod.VisNetworkGraph),
  {
    ssr: false,
    loading: () => <BrandLoader label="Menyiapkan Graf Relasi Entitas..." className="h-[480px] rounded-xl border border-jkn-border bg-surface py-0" />,
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
