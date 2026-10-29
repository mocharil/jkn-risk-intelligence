"use client";

import { useEffect, useMemo, useState } from "react";
import { POLY_GROUPS } from "@/lib/geo/poly-groups";
import { formatNumber } from "@/lib/formatting/currency";
import type { PublicStats } from "./stats";

type Ring = number[][];
interface Feature { properties: { name: string }; geometry: { type: "Polygon" | "MultiPolygon"; coordinates: Ring[] | Ring[][] } }

const BOX = { w0: 94.5, w1: 141.5, s: -11.2, n: 6.4 };
const W = 940;
const H = Math.round((W * (BOX.n - BOX.s)) / (BOX.w1 - BOX.w0));
const FROM = [0xdc, 0xfc, 0xe7];
const TO = [0x14, 0x53, 0x2d];

const shade = (t: number) => {
  const k = 0.1 + 0.9 * Math.pow(Math.max(0, Math.min(1, t)), 0.6);
  return `rgb(${FROM.map((v, i) => Math.round(v + (TO[i] - v) * k)).join(",")})`;
};
const px = (lon: number, lat: number) => `${(((lon - BOX.w0) / (BOX.w1 - BOX.w0)) * W).toFixed(1)},${(((BOX.n - lat) / (BOX.n - BOX.s)) * H).toFixed(1)}`;
const pathOf = (g: Feature["geometry"]) => {
  const polys = (g.type === "Polygon" ? [g.coordinates as Ring[]] : (g.coordinates as Ring[][]));
  return polys.map((poly) => poly.map((ring) => "M" + ring.map(([x, y]) => px(x, y)).join("L") + "Z").join("")).join("");
};

/** Peta panas poligon provinsi (putih ke hijau pekat menurut skor risiko), sama dengan peta Command Center. Tanpa tile dan tanpa interaksi geser. */
export default function HeroRiskMap({ provinces }: { provinces: PublicStats["province_map"] }) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/geo/indonesia-provinces.json")
      .then((r) => r.json())
      .then((j) => live && setFeatures(j.features ?? []))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const shapes = useMemo(() => {
    const byCode = new Map(provinces.map((p) => [p.code, p]));
    const rows = features.map((f) => {
      const ds = (POLY_GROUPS[f.properties.name] ?? []).map((c) => byCode.get(c)).filter((d): d is (typeof provinces)[number] => !!d && d.claims > 0);
      const claims = ds.reduce((a, d) => a + d.claims, 0);
      const high = ds.reduce((a, d) => a + d.high, 0);
      const score = claims ? ds.reduce((a, d) => a + d.score * d.claims, 0) / claims : null;
      return { name: ds[0]?.name ?? f.properties.name, d: pathOf(f.geometry), score, claims, high };
    });
    const sc = rows.map((r) => r.score).filter((s): s is number => s !== null);
    const lo = Math.min(...sc), hi = Math.max(...sc);
    return rows.map((r) => ({ ...r, fill: r.score === null ? "#F3F4F6" : shade(hi > lo ? (r.score - lo) / (hi - lo) : 0) }));
  }, [features, provinces]);

  const cur = shapes.find((s) => s.name === hover);
  return (
    <div className="relative w-full h-full bg-white">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Peta panas risiko klaim per provinsi">
        {shapes.map((s, i) => (
          <path key={i} d={s.d} fill={s.fill} stroke={s.score === null ? "#D1D5DB" : "#FFFFFF"} strokeWidth={hover === s.name ? 2 : 0.8} onMouseEnter={() => setHover(s.name)} onMouseLeave={() => setHover(null)} />
        ))}
      </svg>
      {cur && (
        <div className="absolute right-2 top-2 rounded-lg bg-white border border-stone-200 shadow-md px-2.5 py-1.5 text-[11px] text-stone-700 pointer-events-none">
          <div className="font-bold">{cur.name}</div>
          <div>Skor risiko {cur.score === null ? "—" : Math.round(cur.score)}</div>
          <div>
            {formatNumber(cur.high)} dari {formatNumber(cur.claims)} klaim berisiko tinggi
          </div>
        </div>
      )}
    </div>
  );
}
