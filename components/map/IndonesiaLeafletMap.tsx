"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapContainer, TileLayer, CircleMarker, GeoJSON, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Building2, ArrowRight, Navigation, X } from "lucide-react";
import { ProvinceRiskData, RiskLevel, RiskType } from "@/types/risk";
import { INDONESIA_PROVINCES } from "@/lib/data/indonesia-provinces";
import { formatRupiah, formatNumber } from "@/lib/formatting/currency";
import { RiskPill } from "../ui/RiskPill";
import { POLY_GROUPS } from "@/lib/geo/poly-groups";

interface IndonesiaLeafletMapProps {
  provinceData: ProvinceRiskData[];
  selectedRiskType?: RiskType | "ALL";
  onSelectProvince?: (provinceCode: string) => void;
  /** Pilih & dekati provinsi dari luar (mis. dari tabel). */
  focusProvince?: string;
  className?: string;
  /** Peta lebih tinggi agar sejajar dengan kartu di sebelahnya. */
  tall?: boolean;
  /** Peta sematkan tanpa kontrol dan legenda (mis. di dalam jawaban Copilot); tampilan menyesuaikan provinsi berdata. */
  bare?: boolean;
  /** Lapisan risiko digambar sebagai peta panas hijau (makin pekat = skor risiko provinsi makin tinggi). */
  heat?: boolean;
  /** Hanya tampilkan lapisan statistik BPJS (biaya, akses, FKRTL). */
  nationalOnly?: boolean;
  /** Lapisan dikendalikan dari luar (menyembunyikan header & pemilih lapisan bawaan). */
  metric?: "NAT_COST" | "NAT_ACCESS" | "NAT_FKRTL";
}

type Metric = "RISK" | "EXPOSURE" | "COST_RATIO" | "NAT_COST" | "NAT_ACCESS" | "NAT_FKRTL";

const METRICS: { key: Metric; label: string; group: "Dataset klaim" | "Statistik BPJS 2018"; unit: string; hint: string }[] = [
  { key: "RISK", label: "Tingkat risiko", group: "Dataset klaim", unit: "", hint: "Warna menurut skor risiko provinsi; ukuran menurut jumlah klaim berisiko tinggi." },
  { key: "EXPOSURE", label: "Eksposur", group: "Dataset klaim", unit: "Rp", hint: "Selisih tarif klaim terflag terhadap median peer." },
  { key: "COST_RATIO", label: "Biaya klaim vs rerata nasional", group: "Dataset klaim", unit: "x", hint: "Tagihan dibagi rerata nasional BPJS untuk campuran kelas rawat yang sama." },
  { key: "NAT_COST", label: "Biaya per admisi", group: "Statistik BPJS 2018", unit: "Rp", hint: "Rerata biaya klaim per admisi rawat inap tingkat lanjut (RITL), data resmi BPJS." },
  { key: "NAT_ACCESS", label: "Admisi per 10.000 peserta", group: "Statistik BPJS 2018", unit: "", hint: "Seberapa sering peserta dirawat inap; cerminan akses layanan." },
  { key: "NAT_FKRTL", label: "FKRTL per 100 ribu peserta", group: "Statistik BPJS 2018", unit: "", hint: "Rasio rumah sakit/fasilitas rujukan yang bekerja sama dengan BPJS." },
];

const LEVEL_COLOR: Record<RiskLevel, string> = { CRITICAL: "#B91C1C", HIGH: "#EA580C", MEDIUM: "#CA8A04", LOW: "#059669" };
const LEVEL_LABEL: Record<RiskLevel, string> = { CRITICAL: "Kritis", HIGH: "Tinggi", MEDIUM: "Sedang", LOW: "Rendah" };
const NO_DATA = "#9CA3AF";

/**
 * Batas wilayah pada /geo/indonesia-provinces.json berasal dari peta dasar lama (32 provinsi), jadi beberapa poligon
 * mencakup lebih dari satu provinsi saat ini. Nilainya digabung berbobot jumlah klaim.
 */

/** Zoom nasional untuk peta panas: seluruh kepulauan terlihat utuh tanpa terpotong. */
const HEAT_ZOOM = 4.2;
const HEAT_FROM = "#DCFCE7";
const HEAT_TO = "#14532D";

const REGIONS = [
  { key: "ALL", label: "Nasional", center: [-2.5, 118.0] as [number, number], zoom: 5 },
  { key: "JAWA", label: "Jawa", center: [-7.0, 110.0] as [number, number], zoom: 7 },
  { key: "SUMATERA", label: "Sumatera", center: [0.5, 101.5] as [number, number], zoom: 6 },
  { key: "KALIMANTAN", label: "Kalimantan", center: [-0.5, 114.0] as [number, number], zoom: 6 },
  { key: "SULAWESI", label: "Sulawesi", center: [-2.0, 121.0] as [number, number], zoom: 6 },
  { key: "EAST", label: "Bali dan timur", center: [-5.0, 130.0] as [number, number], zoom: 5 },
];

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.0 });
  }, [center, zoom, map]);
  return null;
}

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function lerpColor(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hex(a);
  const [r2, g2, b2] = hex(b);
  const k = Math.max(0, Math.min(1, t));
  return `rgb(${Math.round(r1 + (r2 - r1) * k)}, ${Math.round(g1 + (g2 - g1) * k)}, ${Math.round(b1 + (b2 - b1) * k)})`;
}

/** Nilai metrik per provinsi; null = tidak ada data. */
function valueOf(m: Metric, d?: ProvinceRiskData): number | null {
  if (!d) return null;
  const n = d.national;
  switch (m) {
    case "RISK":
      return d.total_claims > 0 ? d.risk_score ?? 0 : null;
    case "EXPOSURE":
      return d.total_claims > 0 ? d.potential_exposure : null;
    case "COST_RATIO":
      return n?.cost_ratio ?? null;
    case "NAT_COST":
      return n ? n.cost_per_admission : null;
    case "NAT_ACCESS":
      return n ? n.admission_rate_per_10k : null;
    case "NAT_FKRTL":
      return n ? n.fkrtl_per_100k : null;
  }
}

function formatMetric(m: Metric, v: number | null): string {
  if (v === null) return "tidak ada data";
  if (m === "RISK") return `skor ${v}`;
  if (m === "EXPOSURE" || m === "NAT_COST") return formatRupiah(v, true);
  if (m === "COST_RATIO") return `${v.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}x`;
  return v.toLocaleString("id-ID", { maximumFractionDigits: 1 });
}

export const IndonesiaLeafletMap: React.FC<IndonesiaLeafletMapProps> = ({ provinceData, onSelectProvince, focusProvince, className, tall, bare, heat, nationalOnly, metric: controlledMetric }) => {
  const [selected, setSelected] = useState<ProvinceRiskData | null>(null);
  const [view, setView] = useState<{ center: [number, number]; zoom: number }>(() => {
    if (bare) {
      const pts = provinceData.filter((p) => p.total_claims > 0).map((p) => INDONESIA_PROVINCES.find((g) => g.code === p.province_code)).filter((g): g is NonNullable<typeof g> => !!g);
      if (pts.length > 0) {
        const lat = pts.reduce((a, g) => a + g.lat, 0) / pts.length;
        const lng = pts.reduce((a, g) => a + g.lng, 0) / pts.length;
        const latSpan = Math.max(...pts.map((g) => g.lat)) - Math.min(...pts.map((g) => g.lat));
        const lngSpan = Math.max(...pts.map((g) => g.lng)) - Math.min(...pts.map((g) => g.lng));
        // Zoom yang memuat semua provinsi dibahas pada kanvas sekitar 420 x 260 px, dengan ruang di tepi.
        const z = Math.log2((360 / 256) * Math.min(420 / (lngSpan * 1.7 + 4), 260 / (latSpan * 1.7 + 3)));
        return { center: [lat, lng], zoom: Math.max(4.2, Math.min(7.2, z)) };
      }
    }
    return { center: [-2.5, 118.0], zoom: heat ? HEAT_ZOOM : 5 };
  });
  const [activeRegion, setActiveRegion] = useState("ALL");
  const [geo, setGeo] = useState<GeoJSON.FeatureCollection | null>(null);
  const [innerMetric, setMetric] = useState<Metric>(nationalOnly ? "NAT_COST" : "RISK");
  const metric: Metric = controlledMetric ?? innerMetric;

  useEffect(() => {
    if (!heat || geo) return;
    fetch("/geo/indonesia-provinces.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setGeo(j))
      .catch(() => {});
  }, [heat, geo]);

  const byCode = useMemo(() => new Map(provinceData.map((p) => [p.province_code, p])), [provinceData]);

  // Skala min-maks untuk metrik numerik (diambil dari provinsi yang punya data).
  const range = useMemo(() => {
    const vals = INDONESIA_PROVINCES.map((g) => valueOf(metric, byCode.get(g.code))).filter((v): v is number => v !== null);
    return { min: Math.min(...vals, Infinity), max: Math.max(...vals, -Infinity) };
  }, [metric, byCode]);

  // Nilai per poligon (gabungan provinsi yang berbagi batas lama), untuk peta panas.
  const isNat = metric === "NAT_COST" || metric === "NAT_ACCESS" || metric === "NAT_FKRTL";
  const heatOn = !!heat && (metric === "RISK" || isNat);
  const polyStats = useMemo(() => {
    const out = new Map<string, { score: number | null; claims: number; high: number; names: string[]; rep: ProvinceRiskData | null }>();
    for (const [name, codes] of Object.entries(POLY_GROUPS)) {
      const all = codes.map((c) => byCode.get(c)).filter((d): d is ProvinceRiskData => !!d);
      const ds = isNat ? all.filter((d) => d.national) : all.filter((d) => d.total_claims > 0);
      const claims = ds.reduce((a, d) => a + d.total_claims, 0);
      const high = ds.reduce((a, d) => a + d.high_risk_claims, 0);
      const score = isNat
        ? ds.length > 0 ? ds.reduce((a, d) => a + (valueOf(metric, d) ?? 0), 0) / ds.length : null
        : claims > 0 ? ds.reduce((a, d) => a + (d.risk_score ?? 0) * d.total_claims, 0) / claims : null;
      const rep = [...ds].sort((a, b) => b.total_claims - a.total_claims)[0] ?? ds[0] ?? null;
      out.set(name, { score, claims, high, names: codes.map((c) => INDONESIA_PROVINCES.find((g) => g.code === c)?.name ?? c), rep });
    }
    return out;
  }, [byCode, isNat, metric]);

  const heatRange = useMemo(() => {
    const vals = Array.from(polyStats.values()).map((v) => v.score).filter((v): v is number => v !== null);
    return { min: Math.min(...vals, Infinity), max: Math.max(...vals, -Infinity) };
  }, [polyStats]);

  useEffect(() => {
    if (!focusProvince) return;
    const geo = INDONESIA_PROVINCES.find((g) => g.code === focusProvince);
    if (!geo) return;
    setSelected(byCode.get(focusProvince) || null);
    setView({ center: [geo.lat, geo.lng], zoom: 7 });
    setActiveRegion("");
  }, [focusProvince, byCode]);

  const styleFor = (code: string) => {
    const d = byCode.get(code);
    const v = valueOf(metric, d);
    if (v === null || !d) return { fill: NO_DATA, radius: 6, opacity: 0.55 };
    const span = Math.max(1e-9, range.max - range.min);
    const t = (v - range.min) / span;
    switch (metric) {
      case "RISK":
        if (heat) return { fill: lerpColor("#86EFAC", "#064E3B", t), radius: 5 + Math.min(6, Math.sqrt(d.high_risk_claims)), opacity: 0.95 };
        return { fill: LEVEL_COLOR[d.risk_level], radius: 7 + Math.min(15, Math.sqrt(d.high_risk_claims) * 2), opacity: 0.8 };
      case "EXPOSURE":
        return { fill: lerpColor("#FCA5A5", "#7F1D1D", t), radius: 6 + Math.sqrt(t) * 16, opacity: 0.85 };
      case "COST_RATIO":
        return { fill: v >= 1.5 ? "#B91C1C" : v >= 1.25 ? "#EA580C" : v >= 1.05 ? "#CA8A04" : "#059669", radius: 7 + Math.min(14, Math.sqrt(d.total_claims)), opacity: 0.8 };
      default:
        return { fill: lerpColor("#BBF7D0", "#064E3B", t), radius: 11, opacity: 0.85 };
    }
  };

  const meta = METRICS.find((m) => m.key === metric)!;
  const focusRegion = (r: (typeof REGIONS)[number]) => {
    setActiveRegion(r.key);
    setView({ center: r.center, zoom: heat && r.key === "ALL" ? HEAT_ZOOM : r.zoom });
  };

  const nat = selected?.national;

  return (
    <div className={`relative bg-surface rounded-xl border border-jkn-border p-4 sm:p-5 shadow-subtle overflow-hidden flex flex-col ${className || ""}`}>
      {!controlledMetric && !bare && <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-jkn-text">{nationalOnly ? "Biaya dan akses layanan per provinsi" : "Sebaran risiko klaim per provinsi"}</h3>
          <p className="text-xs text-jkn-muted mt-0.5 max-w-xl">{meta.hint}</p>
        </div>
        <label className="flex items-center gap-2 text-sm shrink-0">
          <span className="text-jkn-muted">Lapisan</span>
          <select
            aria-label="Lapisan peta"
            value={metric}
            onChange={(e) => setMetric(e.target.value as Metric)}
            className="h-9 px-3 rounded-xl border border-jkn-border bg-surface-subtle text-sm text-jkn-text focus:outline-none focus:border-bpjs"
          >
            {(nationalOnly ? (["Statistik BPJS 2018"] as const) : (["Dataset klaim", "Statistik BPJS 2018"] as const)).map((g) => (
              <optgroup key={g} label={g}>
                {METRICS.filter((m) => m.group === g).map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </div>}

      {!bare && (
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-xs text-jkn-dim font-semibold flex items-center gap-1 shrink-0 mr-1">
            <Navigation className="w-3 h-3 text-bpjs" aria-hidden />
            Wilayah
          </span>
          {REGIONS.map((r) => (
            <button
              key={r.key}
              type="button"
              aria-pressed={activeRegion === r.key}
              onClick={() => focusRegion(r)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors shrink-0 ${activeRegion === r.key ? "bg-bpjs text-white border-bpjs font-semibold" : "bg-surface-secondary text-jkn-text border-jkn-border hover:border-bpjs/50 hover:bg-bpjs-soft"}`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Legenda sesuai lapisan */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-jkn-muted bg-surface-secondary px-3 py-1.5 rounded-md border border-jkn-border">
          {heatOn ? (
            <span className="inline-flex items-center gap-2">
              <span>{isNat ? (Number.isFinite(heatRange.min) ? formatMetric(metric, heatRange.min) : "-") : `Skor ${Number.isFinite(heatRange.min) ? Math.round(heatRange.min) : "-"}`}</span>
              <span className="inline-block w-28 h-2.5 rounded-full border border-jkn-border" style={{ background: `linear-gradient(90deg,${HEAT_FROM},${HEAT_TO})` }} aria-hidden />
              <span>{isNat ? (Number.isFinite(heatRange.max) ? formatMetric(metric, heatRange.max) : "-") : `Skor ${Number.isFinite(heatRange.max) ? Math.round(heatRange.max) : "-"}`}</span>
            </span>
          ) : metric === "RISK" ? (
            <>
              {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as RiskLevel[]).map((l) => (
                <span key={l} className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: LEVEL_COLOR[l] }} aria-hidden />
                  {LEVEL_LABEL[l]} {l === "CRITICAL" ? "(90+)" : l === "HIGH" ? "(75-89)" : l === "MEDIUM" ? "(50-74)" : "(<50)"}
                </span>
              ))}
            </>
          ) : metric === "COST_RATIO" ? (
            <>
              {[
                ["#059669", "di bawah 1,05x"],
                ["#CA8A04", "1,05-1,25x"],
                ["#EA580C", "1,25-1,5x"],
                ["#B91C1C", "1,5x ke atas"],
              ].map(([c, l]) => (
                <span key={l} className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} aria-hidden />
                  {l}
                </span>
              ))}
            </>
          ) : (
            <span className="inline-flex items-center gap-2">
              <span>{formatMetric(metric, Number.isFinite(range.min) ? range.min : null)}</span>
              <span
                className="inline-block w-24 h-2.5 rounded-full"
                style={{ background: metric === "EXPOSURE" ? "linear-gradient(90deg,#FCA5A5,#7F1D1D)" : "linear-gradient(90deg,#BBF7D0,#064E3B)" }}
                aria-hidden
              />
              <span>{formatMetric(metric, Number.isFinite(range.max) ? range.max : null)}</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: NO_DATA }} aria-hidden />
            tanpa data
          </span>
        </div>
      </div>

      )}

      <div className={`relative w-full ${bare ? "h-[260px]" : tall || (heat && controlledMetric) ? "aspect-video" : controlledMetric ? "h-[460px]" : "h-[500px]"} rounded-lg border border-jkn-divider overflow-hidden z-0`}>
        <MapContainer center={view.center} zoom={view.zoom} minZoom={4} maxZoom={9} zoomSnap={heat || bare ? 0.1 : 1} scrollWheelZoom style={{ width: "100%", height: "100%", background: heatOn ? "#FFFFFF" : "#EEF3F0" }}>
          <MapController center={view.center} zoom={view.zoom} />
          {!heatOn && <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />}

          {/* Peta panas: poligon provinsi diwarnai putih ke hijau menurut skor risiko */}
          {heatOn && geo && (
            <GeoJSON
              key={`heat-${metric}-${polyStats.size}-${heatRange.min}-${heatRange.max}-${Array.from(polyStats.values()).reduce((a, v) => a + v.claims, 0)}`}
              data={geo}
              style={(f) => {
                const st = polyStats.get(f?.properties?.name);
                if (!st || st.score === null) return { color: "#D1D5DB", weight: 0.8, fillColor: "#F3F4F6", fillOpacity: 1 };
                const t = heatRange.max > heatRange.min ? (st.score - heatRange.min) / (heatRange.max - heatRange.min) : 1;
                return { color: "#FFFFFF", weight: 1, fillColor: lerpColor(HEAT_FROM, HEAT_TO, 0.1 + 0.9 * Math.pow(Math.max(0, t), 0.6)), fillOpacity: 1 };
              }}
              onEachFeature={(f, layer) => {
                const st = polyStats.get(f.properties?.name);
                const label = st ? st.names.join(" + ") : String(f.properties?.name);
                layer.bindTooltip(
                  `<div style="font-size:12px;min-width:170px"><strong>${label}</strong><br/>` +
                    (st && st.score !== null
                      ? isNat
                        ? `${meta.label}: ${formatMetric(metric, st.score)}`
                        : `Skor risiko ${Math.round(st.score)}<br/>${st.high.toLocaleString("id-ID")} dari ${st.claims.toLocaleString("id-ID")} klaim berisiko tinggi`
                      : isNat ? "Tidak ada data" : "Belum ada klaim pada data ini") +
                    "</div>",
                  { sticky: true }
                );
                layer.on("click", () => {
                  if (st?.rep) {
                    setSelected(st.rep);
                    onSelectProvince?.(st.rep.province_code);
                  }
                });
                layer.on("mouseover", () => (layer as unknown as { setStyle: (o: object) => void }).setStyle({ color: "#064E3B", weight: 2 }));
                layer.on("mouseout", () => (layer as unknown as { setStyle: (o: object) => void }).setStyle({ color: st && st.score !== null ? "#FFFFFF" : "#D1D5DB", weight: st && st.score !== null ? 1 : 0.8 }));
              }}
            />
          )}

          {/* Mode sematan: tandai provinsi yang dibahas agar terlihat meski wilayahnya kecil */}
          {bare &&
            heat &&
            provinceData
              .filter((p) => p.total_claims > 0)
              .map((p) => {
                const g = INDONESIA_PROVINCES.find((x) => x.code === p.province_code);
                if (!g) return null;
                return (
                  <CircleMarker key={`pin-${p.province_code}`} center={[g.lat, g.lng]} radius={7} pathOptions={{ color: "#FFFFFF", weight: 2, fillColor: LEVEL_COLOR[p.risk_level], fillOpacity: 1 }}>
                    <Tooltip direction="top" offset={[0, -6]} permanent>
                      <span className="text-xs font-semibold">{g.name}</span>
                    </Tooltip>
                  </CircleMarker>
                );
              })}

          {!heatOn && INDONESIA_PROVINCES.map((geo) => {
            const d = byCode.get(geo.code);
            const st = styleFor(geo.code);
            const isSel = selected?.province_code === geo.code;
            const v = valueOf(metric, d);
            return (
              <CircleMarker
                key={geo.code}
                center={[geo.lat, geo.lng]}
                radius={st.radius}
                pathOptions={{ color: isSel ? "#071A12" : "#FFFFFF", fillColor: st.fill, fillOpacity: st.opacity, weight: isSel ? 3 : 1.5 }}
                eventHandlers={{
                  click: () => {
                    setSelected(d || null);
                    onSelectProvince?.(geo.code);
                  },
                }}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={0.97}>
                  <div className="text-xs font-sans space-y-0.5 min-w-[180px] tabular-nums">
                    <div className="font-bold text-jkn-text border-b border-jkn-divider pb-1">{geo.name}</div>
                    <div className="flex justify-between gap-3">
                      <span>{meta.label}</span>
                      <span className="font-mono font-bold">{formatMetric(metric, v)}</span>
                    </div>
                    {d && d.total_claims > 0 && (
                      <div className="flex justify-between gap-3 text-jkn-muted">
                        <span>Klaim berisiko</span>
                        <span className="font-mono">
                          {formatNumber(d.high_risk_claims)} dari {formatNumber(d.total_claims)}
                        </span>
                      </div>
                    )}
                    {d?.total_claims === 0 && <div className="text-jkn-muted">Belum ada klaim pada data ini</div>}
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {selected && !controlledMetric && !bare && (
          <div className="absolute bottom-3 right-3 left-3 md:left-auto md:w-96 max-h-[476px] overflow-y-auto bg-white border border-jkn-border rounded-xl p-4 shadow-elevated z-[1000] tabular-nums" role="dialog" aria-label={`Ringkasan ${selected.province_name}`}>
            <div className="flex items-start justify-between pb-2.5 border-b border-jkn-divider">
              <div>
                <h4 className="text-sm font-bold text-jkn-text flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-bpjs" aria-hidden />
                  {selected.province_name}
                </h4>
                <p className="text-xs text-jkn-muted">{selected.island_group}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} aria-label="Tutup ringkasan provinsi" className="text-jkn-dim hover:text-jkn-text p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2.5">
              <Link href={`/investigation-queue?mode=CLAIMS&province=${selected.province_code}`} className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-bpjs text-white text-sm font-semibold hover:bg-bpjs-deep transition-colors">
                <span>Klaim</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden />
              </Link>
              <Link href={`/providers?province=${selected.province_code}`} className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-jkn-border bg-white text-sm font-semibold text-jkn-text hover:bg-surface-secondary transition-colors">
                <span>Faskes</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden />
              </Link>
            </div>

            <div className="py-2.5 space-y-3 text-sm">
              {selected.total_claims > 0 ? (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-jkn-dim">Data klaim</div>
                  <div className="flex items-center justify-between">
                    <span className="text-jkn-muted">Tingkat risiko</span>
                    <RiskPill score={selected.risk_score} level={selected.risk_level} size="sm" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-jkn-muted">Klaim berisiko</span>
                    <span className="font-mono font-semibold">
                      {formatNumber(selected.high_risk_claims)} dari {formatNumber(selected.total_claims)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-jkn-muted">Eksposur</span>
                    <span className="font-mono font-bold text-risk-critical">{formatRupiah(selected.potential_exposure)}</span>
                  </div>
                  {nat?.cost_ratio != null && (
                    <div className="flex items-center justify-between">
                      <span className="text-jkn-muted">Biaya vs rerata nasional</span>
                      <span className="font-mono font-semibold">{formatMetric("COST_RATIO", nat.cost_ratio)}</span>
                    </div>
                  )}
                  {nat?.small_sample && <p className="text-xs text-risk-medium">Baru {selected.total_claims} klaim di provinsi ini; skor belum dapat disimpulkan.</p>}
                </div>
              ) : (
                <p className="text-sm text-jkn-muted">Belum ada klaim dari provinsi ini pada data yang dianalisis.</p>
              )}

              {nat && (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-jkn-dim">Statistik BPJS 2018</div>
                  <div className="flex items-center justify-between">
                    <span className="text-jkn-muted">Peserta JKN</span>
                    <span className="font-mono font-semibold">{formatNumber(nat.participants)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-jkn-muted">Biaya per admisi</span>
                    <span className="font-mono font-semibold">
                      {formatRupiah(nat.cost_per_admission, true)} ({nat.cost_index.toLocaleString("id-ID", { maximumFractionDigits: 2 })}x nasional)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-jkn-muted">Admisi per 10.000 peserta</span>
                    <span className="font-mono font-semibold">{nat.admission_rate_per_10k.toLocaleString("id-ID", { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-jkn-muted">FKRTL bekerja sama</span>
                    <span className="font-mono font-semibold">
                      {formatNumber(nat.fkrtl_count)} ({nat.fkrtl_per_100k.toLocaleString("id-ID")} per 100 ribu)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-jkn-muted">Pangsa klaim data / admisi nasional</span>
                    <span className="font-mono font-semibold">
                      {(nat.dataset_share * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}% / {(nat.national_share * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%
                    </span>
                  </div>
                </div>
              )}

              {selected.top_providers.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-jkn-dim mb-1">Faskes dengan eksposur terbesar</div>
                  <ul className="space-y-1">
                    {selected.top_providers.map((tp) => (
                      <li key={tp} className="text-xs font-medium text-bpjs-dark bg-bpjs-soft px-2 py-1 rounded border border-bpjs-border/60">
                        {tp}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
};
