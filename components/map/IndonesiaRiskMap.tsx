"use client";

import { BrandLoader } from "@/components/ui/BrandLoader";

import React from "react";
import dynamic from "next/dynamic";
import { ProvinceRiskData, RiskType } from "@/types/risk";
import { MapPin } from "lucide-react";

// Dynamic import Leaflet map with ssr: false to prevent window is undefined errors
const LeafletMapComponent = dynamic(
  () => import("./IndonesiaLeafletMap").then((mod) => mod.IndonesiaLeafletMap),
  {
    ssr: false,
    loading: () => <BrandLoader label="Memuat Peta Geografis Indonesia..." className="h-[480px] rounded-xl border border-jkn-border bg-surface py-0" />,
  }
);

interface IndonesiaRiskMapProps {
  provinceData: ProvinceRiskData[];
  selectedRiskType?: RiskType | "ALL";
  onSelectProvince?: (provinceCode: string) => void;
  focusProvince?: string;
  className?: string;
  /** Peta lebih tinggi agar sejajar dengan kartu di sebelahnya. */
  tall?: boolean;
  bare?: boolean;
  /** Peta panas hijau untuk lapisan risiko. */
  heat?: boolean;
  nationalOnly?: boolean;
  metric?: "NAT_COST" | "NAT_ACCESS" | "NAT_FKRTL";
}

export const IndonesiaRiskMap: React.FC<IndonesiaRiskMapProps> = (props) => {
  return <LeafletMapComponent {...props} />;
};
