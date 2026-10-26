"use client";

import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { formatNumber } from "@/lib/formatting/currency";
import type { PublicStats } from "./stats";

const BOUNDS: [[number, number], [number, number]] = [[-10.8, 95], [5.8, 141]];
const colorOf = (score: number, claims: number) => (claims === 0 ? "#9CA3AF" : score >= 90 ? "#DC2626" : score >= 75 ? "#EA580C" : score >= 50 ? "#D97706" : "#059669");

/** Peta sebaran risiko per provinsi (Leaflet, sama dengan peta di aplikasi), tanpa interaksi geser/zoom. */
export default function HeroRiskMap({ provinces }: { provinces: PublicStats["province_map"] }) {
  return (
    <MapContainer
      bounds={BOUNDS}
      boundsOptions={{ padding: [4, 4] }}
      zoomControl={false}
      scrollWheelZoom={false}
      dragging={false}
      doubleClickZoom={false}
      touchZoom={false}
      keyboard={false}
      attributionControl={false}
      style={{ width: "100%", height: "100%", background: "#EEF3F0" }}
    >
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {provinces.map((p) => {
        const c = colorOf(p.score, p.claims);
        return (
          <CircleMarker
            key={p.code}
            center={[p.lat, p.lng]}
            radius={p.claims === 0 ? 4 : 5 + Math.min(11, Math.sqrt(p.high) * 1.6)}
            pathOptions={{ color: "#FFFFFF", fillColor: c, fillOpacity: 0.82, weight: 1.2 }}
          >
            <Tooltip direction="top" offset={[0, -6]}>
              <div className="text-[11px] font-sans">
                <div className="font-bold">{p.name}</div>
                <div>
                  {formatNumber(p.high)} berisiko tinggi dari {formatNumber(p.claims)} klaim
                </div>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
