"use client";

import React from "react";
import dynamic from "next/dynamic";
import { ProvinceRiskData, RiskType } from "@/types/risk";
import { MapPin } from "lucide-react";

// Dynamic import Leaflet map with ssr: false to prevent window is undefined errors
const LeafletMapComponent = dynamic(
  () => import("./IndonesiaLeafletMap").then((mod) => mod.IndonesiaLeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="relative bg-surface rounded-2xl border border-jkn-border p-4 shadow-sm h-[480px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-xs text-jkn-muted">
          <div className="w-8 h-8 border-2 border-bpjs border-t-transparent rounded-full animate-spin" />
          <p className="font-semibold">Memuat Peta Geografis Indonesia...</p>
        </div>
      </div>
    ),
  }
);

interface IndonesiaRiskMapProps {
  provinceData: ProvinceRiskData[];
  selectedRiskType?: RiskType | "ALL";
  onSelectProvince?: (provinceCode: string) => void;
  className?: string;
}

export const IndonesiaRiskMap: React.FC<IndonesiaRiskMapProps> = (props) => {
  return <LeafletMapComponent {...props} />;
};
