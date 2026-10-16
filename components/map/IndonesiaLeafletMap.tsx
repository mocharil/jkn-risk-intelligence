"use client";

import React, { useEffect, useState, useRef } from "react";
import { ProvinceRiskData, RiskType } from "@/types/risk";
import { INDONESIA_PROVINCES } from "@/lib/data/indonesia-provinces";
import { formatRupiah, formatNumber } from "@/lib/formatting/currency";
import { RiskPill } from "../ui/RiskPill";
import { Building2, MapPin, ArrowRight, X, ZoomIn, ZoomOut, Navigation } from "lucide-react";
import Link from "next/link";
import "leaflet/dist/leaflet.css";

// Dynamic import Leaflet components inside useEffect or direct Leaflet API to avoid SSR window issues
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";

interface IndonesiaLeafletMapProps {
  provinceData: ProvinceRiskData[];
  selectedRiskType?: RiskType | "ALL";
  onSelectProvince?: (provinceCode: string) => void;
  className?: string;
}

// Controller component to zoom to regions
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.2 });
  }, [center, zoom, map]);
  return null;
}

export const IndonesiaLeafletMap: React.FC<IndonesiaLeafletMapProps> = ({
  provinceData,
  selectedRiskType = "ALL",
  onSelectProvince,
  className,
}) => {
  const [selectedProvince, setSelectedProvince] = useState<ProvinceRiskData | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-2.5, 118.0]);
  const [mapZoom, setMapZoom] = useState<number>(5);
  const [activeRegion, setActiveRegion] = useState<string>("ALL");

  const getProvinceData = (code: string) => {
    return provinceData.find((p) => p.province_code === code);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "CRITICAL":
        return { color: "#D92D20", fillColor: "#D92D20", fillOpacity: 0.85, radius: 16 };
      case "HIGH":
        return { color: "#F04438", fillColor: "#F04438", fillOpacity: 0.75, radius: 13 };
      case "MEDIUM":
        return { color: "#F79009", fillColor: "#F79009", fillOpacity: 0.7, radius: 10 };
      case "LOW":
      default:
        return { color: "#12B76A", fillColor: "#12B76A", fillOpacity: 0.6, radius: 8 };
    }
  };

  const regions = [
    { key: "ALL", label: "Nasional", center: [-2.5, 118.0] as [number, number], zoom: 5 },
    { key: "JAWA", label: "Jawa & DKI", center: [-7.0, 110.0] as [number, number], zoom: 7 },
    { key: "SUMATERA", label: "Sumatera", center: [0.5, 101.5] as [number, number], zoom: 6 },
    { key: "KALIMANTAN", label: "Kalimantan", center: [-0.5, 114.0] as [number, number], zoom: 6 },
    { key: "SULAWESI", label: "Sulawesi", center: [-2.0, 121.0] as [number, number], zoom: 6 },
    { key: "EAST", label: "Bali & Indonesia Timur", center: [-5.0, 130.0] as [number, number], zoom: 5 },
  ];

  const handleRegionClick = (reg: typeof regions[0]) => {
    setActiveRegion(reg.key);
    setMapCenter(reg.center);
    setMapZoom(reg.zoom);
  };

  return (
    <div className={`relative bg-surface rounded-xl border border-jkn-border p-4 sm:p-5 shadow-subtle overflow-hidden flex flex-col ${className || ""}`}>
      {/* Map Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-bold text-jkn-text">Sebaran Geospasial Risiko Klaim Nasional</h3>
          <p className="text-xs text-jkn-muted mt-0.5">
            Pemetaan klaster anomali dan potensi eksposur finansial di 34 provinsi Indonesia
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-jkn-muted bg-surface-secondary px-3 py-1.5 rounded-md border border-jkn-border shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-risk-critical" />
            <span>Kritis (&ge;100)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-risk-high" />
            <span>Tinggi (50–99)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-risk-medium" />
            <span>Sedang (20–49)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-risk-low" />
            <span>Rendah (&lt;20)</span>
          </div>
        </div>
      </div>

      {/* Region Quick Jump Bar */}
      <div className="flex items-center gap-1.5 mb-2.5 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] text-jkn-dim font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 mr-1">
          <Navigation className="w-3 h-3 text-bpjs" />
          Wilayah:
        </span>
        {regions.map((reg) => (
          <button
            key={reg.key}
            onClick={() => handleRegionClick(reg)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors shrink-0 ${
              activeRegion === reg.key
                ? "bg-bpjs text-white border-bpjs font-semibold"
                : "bg-surface-secondary text-jkn-text border-jkn-border hover:border-bpjs/50 hover:bg-bpjs-soft"
            }`}
          >
            {reg.label}
          </button>
        ))}
      </div>

      {/* Interactive Leaflet Map Container */}
      <div className="relative w-full h-[400px] rounded-lg border border-jkn-divider overflow-hidden z-0">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          minZoom={4}
          maxZoom={9}
          scrollWheelZoom={true}
          style={{ width: "100%", height: "100%", background: "#EEF3F0" }}
        >
          <MapController center={mapCenter} zoom={mapZoom} />

          {/* CartoDB Positron Light Tiles */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> '
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* 34 Province Hotspots */}
          {INDONESIA_PROVINCES.map((geo) => {
            const data = getProvinceData(geo.code);
            const level = data?.risk_level || "LOW";
            const visual = getRiskColor(level);
            const isSelected = selectedProvince?.province_code === geo.code;

            return (
              <React.Fragment key={geo.code}>
                {/* Outer Ring for Critical & High Risk */}
                {(level === "CRITICAL" || level === "HIGH") && (
                  <CircleMarker
                    center={[geo.lat, geo.lng]}
                    radius={visual.radius + 8}
                    pathOptions={{
                      color: visual.color,
                      fillColor: visual.fillColor,
                      fillOpacity: 0.15,
                      weight: 1.5,
                      dashArray: "3 3",
                    }}
                  />
                )}

                {/* Main Province Node Circle */}
                <CircleMarker
                  center={[geo.lat, geo.lng]}
                  radius={visual.radius}
                  pathOptions={{
                    color: isSelected ? "#007A3A" : "#FFFFFF",
                    fillColor: visual.fillColor,
                    fillOpacity: visual.fillOpacity,
                    weight: isSelected ? 3 : 2,
                  }}
                  eventHandlers={{
                    click: () => {
                      setSelectedProvince(data || null);
                      if (onSelectProvince) onSelectProvince(geo.code);
                    },
                  }}
                >
                  {/* Tooltip on Hover */}
                  <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                    <div className="p-1 text-xs font-sans space-y-1 min-w-[160px] tabular-nums">
                      <div className="font-bold text-jkn-text flex items-center justify-between gap-2 border-b border-jkn-divider pb-1">
                        <span>{geo.name}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            level === "CRITICAL"
                              ? "bg-risk-critical-bg text-red-900"
                              : level === "HIGH"
                              ? "bg-risk-high-bg text-rose-900"
                              : level === "MEDIUM"
                              ? "bg-risk-medium-bg text-amber-900"
                              : "bg-risk-low-bg text-emerald-900"
                          }`}
                        >
                          {level === "CRITICAL" ? "Kritis" : level === "HIGH" ? "Tinggi" : level === "MEDIUM" ? "Sedang" : "Rendah"}
                        </span>
                      </div>
                      <div className="text-[11px] text-jkn-muted space-y-0.5 pt-0.5">
                        <div className="flex justify-between gap-3">
                          <span>Klaim Berisiko:</span>
                          <span className="font-mono font-bold text-risk-critical">
                            {formatNumber(data?.high_risk_claims || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span>Potensi Eksposur:</span>
                          <span className="font-mono font-bold text-jkn-text">
                            {formatRupiah(data?.potential_exposure || 0, true)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span>Pola Dominan:</span>
                          <span className="font-semibold text-bpjs-dark">
                            {data?.dominant_risk_type}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Tooltip>
                </CircleMarker>
              </React.Fragment>
            );
          })}
        </MapContainer>

        {/* Selected Province Inspector Drawer (Inside Map) */}
        {selectedProvince && (
          <div className="absolute bottom-3 right-3 left-3 md:left-auto md:w-80 bg-white/95 backdrop-blur-md border border-jkn-border rounded-xl p-4 shadow-elevated z-[1000] animate-in slide-in-from-bottom-3 duration-150 tabular-nums">
            <div className="flex items-center justify-between pb-2.5 border-b border-jkn-divider">
              <div>
                <h4 className="text-xs font-bold text-jkn-text flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-bpjs" />
                  {selectedProvince.province_name}
                </h4>
                <p className="text-[10px] text-jkn-muted">Ringkasan Risiko Provinsi</p>
              </div>
              <button
                onClick={() => setSelectedProvince(null)}
                aria-label="Tutup detail provinsi"
                className="text-jkn-dim hover:text-jkn-text p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-2.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-jkn-muted">Tingkat Risiko:</span>
                <RiskPill level={selectedProvince.risk_level} size="sm" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-jkn-muted">Estimasi Eksposur:</span>
                <span className="font-mono font-bold text-risk-critical">
                  {formatRupiah(selectedProvince.potential_exposure)}
                </span>
              </div>
              {selectedProvince.top_providers.length > 0 && (
                <div>
                  <span className="text-[11px] text-jkn-dim font-medium">Faskes Prioritas Pengawasan:</span>
                  <div className="mt-1 space-y-1">
                    {selectedProvince.top_providers.map((tp) => (
                      <div
                        key={tp}
                        className="text-[11px] font-semibold text-bpjs-dark bg-bpjs-soft px-2 py-1 rounded border border-bpjs-border/60"
                      >
                        {tp}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Link
              href={`/claims?risk_level=${selectedProvince.risk_level}`}
              className="w-full mt-2 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-bpjs text-white text-xs font-semibold hover:bg-bpjs-deep transition-colors"
            >
              <span>Telusuri Klaim Wilayah Ini</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
