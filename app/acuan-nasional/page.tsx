"use client";

import React, { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { formatNumber, formatRupiah } from "@/lib/formatting/currency";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { ProvinceExplorer } from "@/components/map/ProvinceExplorer";
import { ProvenanceCatalog } from "@/components/ui/ProvenanceCatalog";
import { INDONESIA_PROVINCES } from "@/lib/data/indonesia-provinces";
import type { ProvinceRiskData } from "@/types/risk";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

interface National {
  source: { name: string; url: string; scope: string };
  years: string[];
  latest_year: string;
  kpi: { admissions: number; participants: number; cost_per_admission: number; los_days: number; fkrtl_count: number; death_pct: number; recovered_pct: number; referred_pct: number };
  cost_trend: Array<{ year: string; total: number; kelas_1: number; kelas_2: number; kelas_3: number; los: number; admissions: number }>;
  cost_by_class: Record<string, number>;
  los_by_class: Record<string, number>;
  class_share: Record<string, number>;
  cost_by_age_sex: Array<{ age: string; L: number; P: number; T: number }>;
  top_diagnoses: Array<{ code: string; description: string; admisi: Record<string, number> }>;
  provinces: Array<{ code: string; name: string; participants: number; admission_rate_per_10k: number; admissions_est: number; cost_per_admission: number; cost_index: number; fkrtl_count: number; fkrtl_per_100k: number }>;
}

interface Comparison {
  claims: number;
  clean_claims: number;
  mean_amount_clean: number;
  mean_los_clean: number;
  by_class: Record<string, { n: number; mean_amount: number; mean_los: number }>;
  class_share: Record<string, number>;
  diagnoses: Array<{ code: string; description: string; dataset_share: number; national_admissions: number; in_national_top100: boolean }>;
  provinces: Array<{ code: string; dataset_share: number; national_share: number }>;
  data_mode: "sintetis" | "campuran";
}

const pct = (v: number, d = 1) => `${(v * 100).toLocaleString("id-ID", { maximumFractionDigits: d })}%`;
const juta = (v: number) => `Rp ${(v / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} jt`;
const tooltipStyle = { backgroundColor: "#FFFFFF", borderRadius: 12, border: "1px solid #D5E0DA", fontSize: 12 };

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="p-5 flex flex-col justify-between">
      <span className="text-sm font-medium text-jkn-muted">{label}</span>
      <div className="mt-2">
        <div className="text-2xl font-bold text-jkn-text tracking-tight leading-none">{value}</div>
        {hint && <div className="mt-2 text-xs text-jkn-muted">{hint}</div>}
      </div>
    </div>
  );
}

/** Selisih relatif dataset terhadap acuan; dalam ±15% dianggap sejalan. */
function Gap({ ours, against: nat }: { ours: number; against: number }) {
  if (!nat || !ours) return <span className="text-jkn-muted">-</span>;
  const d = ours / nat - 1;
  const ok = Math.abs(d) <= 0.15;
  return (
    <span className={`font-mono font-semibold ${ok ? "text-bpjs-dark" : "text-risk-high"}`}>
      {d > 0 ? "+" : ""}
      {(d * 100).toLocaleString("id-ID", { maximumFractionDigits: 0 })}%
    </span>
  );
}

export default function AcuanNasionalPage() {
  const [data, setData] = useState<{ national: National; comparison: Comparison } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAllDx, setShowAllDx] = useState(false);

  useEffect(() => {
    fetch("/api/reference/national")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  const mapData = useMemo<ProvinceRiskData[]>(() => {
    if (!data) return [];
    const cmp = new Map(data.comparison.provinces.map((p) => [p.code, p]));
    return data.national.provinces.flatMap((p) => {
      const g = INDONESIA_PROVINCES.find((x) => x.code === p.code);
      if (!g) return [];
      const c = cmp.get(p.code);
      return [{
        province_code: p.code, province_name: p.name, island_group: g.island, latitude: g.lat, longitude: g.lng,
        total_claims: 0, high_risk_claims: 0, potential_exposure: 0, dominant_risk_type: "INFLATED_BILLS", risk_level: "LOW", top_providers: [],
        national: { ...p, dataset_share: c?.dataset_share ?? 0, national_share: c?.national_share ?? 0, cost_ratio: null, small_sample: false },
      } as ProvinceRiskData];
    });
  }, [data]);

  if (error)    return (
      <DashboardShell>
        <div className="bg-surface rounded-xl border border-jkn-border p-8 text-center max-w-md mx-auto my-16 space-y-3">
          <AlertTriangle className="w-6 h-6 text-risk-critical mx-auto" />
          <p className="text-sm text-jkn-muted">Acuan nasional belum bisa dimuat ({error}).</p>
        </div>
      </DashboardShell>
    );
  if (!data)
    return (
      <DashboardShell>
        <PageLoader label="Memuat acuan nasional..." className="h-[60vh]" />
      </DashboardShell>
    );

  const { national: n, comparison: c } = data;
  const y = n.latest_year;
  const maxCostIdx = Math.max(1, ...n.provinces.map((p) => p.cost_index));
  const maxDx = Math.max(1, ...n.top_diagnoses.map((d) => d.admisi[y] ?? 0));

  return (
    <DashboardShell>
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-semibold text-jkn-text">Acuan nasional BPJS</h1>
          <p className="text-sm text-jkn-muted mt-1">
            Statistik resmi rawat inap tingkat lanjut {n.years[0]} sampai {y}. Pembanding kewajaran angka klaim, bukan bukti kecurangan.
          </p>
        </div>
        <a
          href={n.source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-jkn-border text-sm font-medium text-jkn-text hover:bg-frame transition-colors"
        >
          <span>Portal data BPJS</span>
          <ExternalLink className="w-3.5 h-3.5" aria-hidden />
        </a>
      </div>

      <div className="bg-surface rounded-2xl border border-jkn-border/90 shadow-card overflow-hidden grid grid-cols-2 lg:grid-cols-6 divide-x divide-y lg:divide-y-0 divide-jkn-divider tabular-nums">
        <Stat label={`Admisi RITL ${y}`} value={formatNumber(n.kpi.admissions)} hint={`${formatNumber(n.kpi.participants)} peserta JKN`} />
        <Stat label="Biaya klaim per admisi" value={juta(n.kpi.cost_per_admission)} hint={`kelas 1 ${juta(n.cost_by_class["1"])}, kelas 3 ${juta(n.cost_by_class["3"])}`} />
        <Stat label="Rerata lama rawat" value={`${n.kpi.los_days.toLocaleString("id-ID")} hari`} hint={`kelas 1 ${n.los_by_class["1"]}, kelas 3 ${n.los_by_class["3"]} hari`} />
        <Stat label="FKRTL bekerja sama" value={formatNumber(n.kpi.fkrtl_count)} hint="rumah sakit dan fasilitas rujukan" />
        <Stat label="Pulang sembuh" value={pct(n.kpi.recovered_pct, 0)} hint={`rujuk ${pct(n.kpi.referred_pct, 0)}`} />
        <Stat label="Meninggal" value={pct(n.kpi.death_pct, 0)} hint="dari seluruh admisi RITL" />
      </div>

      {/* Posisi dataset */}
      <section className="bg-surface rounded-2xl border border-jkn-border/90 p-5 shadow-card">
        <h2 className="text-lg font-semibold text-jkn-text">Posisi dataset terhadap acuan</h2>
        <p className="text-xs text-jkn-muted mt-0.5 max-w-3xl">
          {formatNumber(c.claims)} klaim; dibandingkan memakai {formatNumber(c.clean_claims)} klaim yang tidak ditandai agar anomali tidak menggeser rata-rata.
        </p>
        {(() => {
          const items: Array<{ label: string; ours: number; nat: number; fmt: (v: number) => string; sub?: boolean }> = [
            { label: "Biaya klaim per admisi", ours: c.mean_amount_clean, nat: n.kpi.cost_per_admission, fmt: juta },
            { label: "Rerata lama rawat", ours: c.mean_los_clean, nat: n.kpi.los_days, fmt: (v) => `${v.toLocaleString("id-ID")} hari` },
            ...(["1", "2", "3"] as const).flatMap((k) => [
              { label: `Biaya per admisi, kelas ${k}`, ours: c.by_class[k]?.mean_amount || 0, nat: n.cost_by_class[k], fmt: juta },
              { label: `Pangsa admisi, kelas ${k}`, ours: c.class_share[k] || 0, nat: n.class_share[k], fmt: (v: number) => pct(v, 0), sub: true },
            ]),
          ];
          return (
            <ul className="mt-4 divide-y divide-jkn-divider tabular-nums">
              {items.map((it) => {
                const d = it.nat && it.ours ? it.ours / it.nat - 1 : null;
                const ok = d !== null && Math.abs(d) <= 0.15;
                const w = d === null ? 0 : Math.min(50, (Math.abs(d) / 0.3) * 50);
                return (
                  <li key={it.label} className={`grid grid-cols-[minmax(0,1.4fr)_96px_96px_minmax(160px,1fr)_56px] gap-4 items-center py-2.5 text-sm ${it.sub ? "text-jkn-muted" : ""}`}>
                    <span className={it.sub ? "" : "font-medium text-jkn-text"}>{it.label}</span>
                    <span className="text-right text-jkn-text">{it.ours ? it.fmt(it.ours) : "-"}</span>
                    <span className="text-right text-jkn-muted">{it.fmt(it.nat)}</span>
                    <span className="relative h-2 rounded-full bg-frame" aria-hidden>
                      <span className="absolute top-[-2px] bottom-[-2px] left-1/2 w-px bg-jkn-dim/50" />
                      {d !== null && (
                        <span
                          className="absolute top-0 bottom-0 rounded-full"
                          style={{ backgroundColor: ok ? "#007A3A" : "#EA580C", width: `${w}%`, left: d >= 0 ? "50%" : `${50 - w}%` }}
                        />
                      )}
                    </span>
                    <span className="text-right"><Gap ours={it.ours} against={it.nat} /></span>
                  </li>
                );
              })}
            </ul>
          );
        })()}
        <div className="mt-1 grid grid-cols-[minmax(0,1.4fr)_96px_96px_minmax(160px,1fr)_56px] gap-4 text-[11px] text-jkn-dim">
          <span />
          <span className="text-right">Dataset</span>
          <span className="text-right">Nasional {y}</span>
          <span className="text-center">selisih, hijau bila dalam 15%</span>
          <span />
        </div>
      </section>

      {/* Tren */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 tabular-nums">
        <section className="bg-surface rounded-2xl border border-jkn-border/90 p-5 shadow-card">
          <h2 className="text-base font-bold text-jkn-text">Biaya klaim per admisi menurut kelas</h2>
          <p className="text-xs text-jkn-muted mt-0.5">Rupiah, {n.years[0]} sampai {y}</p>
          <div className="h-48 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={n.cost_trend} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid stroke="#E4ECE8" vertical={false} />
                <XAxis dataKey="year" stroke="#61756D" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#61756D" fontSize={12} tickLine={false} axisLine={false} domain={[3_500_000, "auto"]} tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(1)} jt`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [formatRupiah(v), name]} />
                <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="kelas_1" name="Kelas 1" stroke="#B91C1C" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="kelas_2" name="Kelas 2" stroke="#CA8A04" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="kelas_3" name="Kelas 3" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="total" name="Seluruh kelas" stroke="#11241D" strokeWidth={2} strokeDasharray="5 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="bg-surface rounded-2xl border border-jkn-border/90 p-5 shadow-card">
          <h2 className="text-base font-bold text-jkn-text">Biaya per admisi menurut usia dan jenis kelamin</h2>
          <p className="text-xs text-jkn-muted mt-0.5">Rupiah, {y}. Biaya laki-laki melampaui perempuan pada usia produktif.</p>
          <div className="h-48 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={n.cost_by_age_sex} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid stroke="#E4ECE8" vertical={false} />
                <XAxis dataKey="age" stroke="#61756D" fontSize={11} tickLine={false} axisLine={false} interval={1} />
                <YAxis stroke="#61756D" fontSize={12} tickLine={false} axisLine={false} domain={[3_000_000, "auto"]} tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(1)} jt`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [formatRupiah(v), name]} />
                <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="L" name="Laki-laki" stroke="#0E7490" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="P" name="Perempuan" stroke="#BE185D" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Diagnosis */}
      <section className="bg-surface rounded-2xl border border-jkn-border/90 shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-jkn-divider">
          <h2 className="text-base font-bold text-jkn-text">Diagnosis rawat inap terbanyak {y}</h2>
          <p className="text-xs text-jkn-muted mt-0.5">Admisi per kode ICD-10 primer. Tren antar tahun tidak ditampilkan karena sistem pengkodean dan cakupan peserta berubah.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="bg-surface-subtle text-left text-xs font-semibold text-jkn-muted border-b border-jkn-border">
                <th className="py-2.5 px-4">Diagnosis</th>
                <th className="py-2.5 px-3 text-right">Admisi {y}</th>
                <th className="py-2.5 px-3 text-right">Pangsa admisi nasional</th>
                <th className="py-2.5 px-4 w-56">Proporsi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-jkn-divider">
              {(showAllDx ? n.top_diagnoses : n.top_diagnoses.slice(0, 6)).map((d) => {
                return (
                  <tr key={d.code}>
                    <td className="py-2.5 px-4">
                      <span className="font-semibold text-jkn-text">{d.code}</span>
                      <span className="text-jkn-muted ml-2">{d.description}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold">{formatNumber(d.admisi[y])}</td>
                    <td className="py-2.5 px-3 text-right">{pct(d.admisi[y] / n.kpi.admissions, 1)}</td>
                    <td className="py-2.5 px-4">
                      <div className="h-2 rounded-full bg-surface-secondary overflow-hidden">
                        <div className="h-full rounded-full bg-bpjs" style={{ width: `${(d.admisi[y] / maxDx) * 100}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {n.top_diagnoses.length > 6 && (
          <button type="button" onClick={() => setShowAllDx((v) => !v)} className="w-full py-2.5 text-sm font-medium text-bpjs hover:bg-frame/60 border-t border-jkn-divider transition-colors">
            {showAllDx ? "Tampilkan 6 teratas" : `Tampilkan ${n.top_diagnoses.length} diagnosis dan perbandingan dengan dataset`}
          </button>
        )}
        {showAllDx && (
        <div className="px-5 py-4 border-t border-jkn-divider">
          <h3 className="text-sm font-semibold text-jkn-text">Diagnosis di dataset Anda</h3>
          <p className="text-xs text-jkn-muted mt-0.5 mb-2">Apakah kode terbanyak di dataset juga termasuk 100 teratas nasional, beserta admisi nasionalnya.</p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
            {c.diagnoses.map((d) => (
              <li key={d.code} className="flex items-baseline justify-between gap-3 border-b border-jkn-divider/70 py-1">
                <span className="truncate">
                  <span className="font-semibold">{d.code}</span> <span className="text-jkn-muted">{d.description}</span>
                </span>
                <span className="text-xs shrink-0">
                  {pct(d.dataset_share, 0)} dataset,{" "}
                  {d.in_national_top100 ? <span className="text-bpjs-dark">{formatNumber(d.national_admissions)} nasional</span> : <span className="text-risk-high">di luar 100 teratas</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
        )}
      </section>

      {/* Provinsi */}
      <ProvinceExplorer mapData={mapData} year={y} nationalCost={n.kpi.cost_per_admission} nationalFkrtl={n.kpi.fkrtl_count} />

      <p className="text-xs text-jkn-muted pb-2">
        Sumber: {n.source.name}, {n.source.url}. {n.source.scope} Rerata lama rawat dihitung dari hari rawat dibagi admisi per kelas. Data mikro klaim memerlukan akun peneliti terdaftar pada portal yang sama.
      </p>
      <details className="group rounded-2xl border border-jkn-border/80 bg-surface">
        <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between text-base font-semibold text-jkn-text">
          <span>Asal data: resmi dan sintetis</span>
          <span className="text-xs font-medium text-bpjs group-open:hidden">Tampilkan</span>
          <span className="text-xs font-medium text-bpjs hidden group-open:inline">Sembunyikan</span>
        </summary>
        <div className="px-1 pb-3"><ProvenanceCatalog /></div>
      </details>
    </DashboardShell>
  );
}