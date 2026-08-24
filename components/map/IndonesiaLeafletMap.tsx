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
    { key: "ALL", label: "National (All)", center: [-2.5, 118.0] as [number, number], zoom: 5 },
    { key: "JAWA", label: "Java & Jakarta", center: [-7.0, 110.0] as [number, number], zoom: 7 },
    { key: "SUMATERA", label: "Sumatra", center: [0.5, 101.5] as [number, number], zoom: 6 },
    { key: "KALIMANTAN", label: "Kalimantan", center: [-0.5, 114.0] as [number, number], zoom: 6 },
    { key: "SULAWESI", label: "Sulawesi", center: [-2.0, 121.0] as [number, number], zoom: 6 },
    { key: "EAST", label: "Bali & Eastern Indonesia", center: [-5.0, 130.0] as [number, number], zoom: 5 },
  ];

  const handleRegionClick = (reg: typeof regions[0]) => {
    setActiveRegion(reg.key);
    setMapCenter(reg.center);
    setMapZoom(reg.zoom);
  };

  return (
    <div className={`relative bg-surface rounded-2xl border border-jkn-border p-4 shadow-sm overflow-hidden flex flex-col ${className || ""}`}>
      {/* Map Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-bpjs animate-pulse" />
            <h3 className="text-sm font-bold text-jkn-text">Geospatial National Risk Heatmap</h3>
          </div>
          <p className="text-[11px] text-jkn-muted mt-0.5">
            Interactive Leaflet mapping of 34 Indonesian provinces, anomaly clusters & financial risk exposure
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px] font-medium text-jkn-dim bg-surface-secondary px-3 py-1.5 rounded-lg border border-jkn-border shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-risk-critical" />
            <span>Critical (&ge; 100 Claims)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-risk-high" />
            <span>High (50 - 99)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-risk-medium" />
            <span>Medium (20 - 49)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-risk-low" />
            <span>Low (&lt; 20)</span>
          </div>
        </div>
      </div>

      {/* Region Quick Jump Bar */}
      <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] text-jkn-dim font-bold uppercase flex items-center gap-1 shrink-0 mr-1">
          <Navigation className="w-3.5 h-3.5 text-bpjs" />
          Focus Region:
        </span>
        {regions.map((reg) => (
          <button
            key={reg.key}
            onClick={() => handleRegionClick(reg)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all shrink-0 ${
              activeRegion === reg.key
                ? "bg-bpjs text-white border-bpjs shadow-xs"
                : "bg-surface-secondary text-jkn-text border-jkn-border hover:border-bpjs/50 hover:bg-bpjs-soft"
            }`}
          >
            {reg.label}
          </button>
        ))}
      </div>

      {/* Interactive Leaflet Map Container */}
      <div className="relative w-full h-[400px] rounded-xl border border-jkn-divider overflow-hidden shadow-inner z-0">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          minZoom={4}
          maxZoom={9}
          scrollWheelZoom={true}
          style={{ width: "100%", height: "100%", background: "#F2F8F5" }}
        >
          <MapController center={mapCenter} zoom={mapZoom} />

          {/* CartoDB Positron Light Tiles */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
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
                    color: isSelected ? "#00A651" : "#FFFFFF",
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
                    <div className="p-1 text-xs font-sans space-y-1 min-w-[150px]">
                      <div className="font-bold text-jkn-text flex items-center justify-between gap-2 border-b border-jkn-divider pb-1">
                        <span>{geo.name}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                            level === "CRITICAL"
                              ? "bg-rose-100 text-rose-800"
                              : level === "HIGH"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {level}
                        </span>
                      </div>
                      <div className="text-[10px] text-jkn-muted space-y-0.5 pt-0.5">
                        <div className="flex justify-between">
                          <span>Anomaly Claims:</span>
                          <span className="font-bold text-risk-critical">
                            {formatNumber(data?.high_risk_claims || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Potential Exposure:</span>
                          <span className="font-bold text-jkn-text">
                            {formatRupiah(data?.potential_exposure || 0, true)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Dominant Pattern:</span>
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
          <div className="absolute bottom-3 right-3 left-3 md:left-auto md:w-80 bg-white/95 backdrop-blur-md border border-bpjs-border rounded-xl p-4 shadow-elevated z-[1000] animate-in slide-in-from-bottom-3 duration-150">
            <div className="flex items-center justify-between pb-2.5 border-b border-jkn-divider">
              <div>
                <h4 className="text-xs font-bold text-jkn-text flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-bpjs" />
                  {selectedProvince.province_name}
                </h4>
                <p className="text-[10px] text-jkn-muted">Regional Intelligence Hotspot</p>
              </div>
              <button
                onClick={() => setSelectedProvince(null)}
                className="text-jkn-dim hover:text-jkn-text p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-2.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-jkn-muted">Risk Tier:</span>
                <RiskPill level={selectedProvince.risk_level} size="sm" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-jkn-muted">Estimated Exposure:</span>
                <span className="font-bold text-risk-critical">
                  {formatRupiah(selectedProvince.potential_exposure)}
                </span>
              </div>
              {selectedProvince.top_providers.length > 0 && (
                <div>
                  <span className="text-[11px] text-jkn-dim font-medium">Priority Oversight Facilities:</span>
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
              className="w-full mt-2 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-bpjs text-white text-xs font-bold hover:bg-bpjs-deep transition-all shadow-xs"
            >
              <span>Explore Claims in this Region</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
