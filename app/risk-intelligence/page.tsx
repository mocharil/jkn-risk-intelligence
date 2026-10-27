"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { IndonesiaRiskMap } from "@/components/map/IndonesiaRiskMap";
import { NetworkGraphView } from "@/components/network/NetworkGraphView";
import { RiskPill } from "@/components/ui/RiskPill";
import { PageLoader } from "@/components/ui/PageLoader";
import { ProvinceRiskData, EmergingSignal, RiskType } from "@/types/risk";
import { formatRupiah, formatNumber } from "@/lib/formatting/currency";
import { formatDate } from "@/lib/formatting/date";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from "recharts";
import { AlertTriangle, ChevronRight, Layers, MapPin, TrendingUp } from "lucide-react";

type RiskTab = "OVERVIEW" | "MAP" | "GRAPH" | "PATTERNS";

const TYPE_LABEL: Record<RiskType, string> = {
  UPCODING: "Upcoding",
  CLONING: "Kloning narasi",
  PHANTOM_BILLING: "Tagihan fiktif",
  ABNORMAL_LOS: "Lama rawat",
  UNBUNDLING: "Unbundling",
  INFLATED_BILLS: "Tagihan membengkak",
  REPEAT_BILLING: "Tagihan berulang",
  READMISSION: "Readmisi dini",
};

const SEVERITY_LABEL = { CRITICAL: "Kritis", HIGH: "Tinggi", MEDIUM: "Sedang", LOW: "Rendah" } as const;

type SortKey = "exposure" | "score" | "claims" | "cost_ratio" | "access" | "fkrtl";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "exposure", label: "Eksposur" },
  { key: "score", label: "Skor risiko" },
  { key: "claims", label: "Jumlah klaim" },
  { key: "cost_ratio", label: "Biaya vs rerata nasional" },
  { key: "access", label: "Admisi per 10.000 peserta" },
  { key: "fkrtl", label: "FKRTL per 100 ribu peserta" },
];

const tooltipStyle = { backgroundColor: "#FFFFFF", borderRadius: 12, border: "1px solid #D5E0DA", fontSize: 12 };
const ratio = (r?: number | null) => (r === null || r === undefined ? "-" : `${r.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}x`);

export default function RiskIntelligencePage() {
  const [activeTab, setActiveTab] = useState<RiskTab>("OVERVIEW");
  const [provinceData, setProvinceData] = useState<ProvinceRiskData[]>([]);
  const [signals, setSignals] = useState<EmergingSignal[]>([]);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [dataMode, setDataMode] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [graphProvider, setGraphProvider] = useState("");
  const [claimInput, setClaimInput] = useState("");
  const [graphClaim, setGraphClaim] = useState("");
  const [providerOptions, setProviderOptions] = useState<Array<{ provider_id: string; name: string; risk_score: number }>>([]);
  const [focusProvince, setFocusProvince] = useState<string | undefined>();
  const [sortKey, setSortKey] = useState<SortKey>("exposure");
  const mapRef = useRef<HTMLDivElement>(null);

  // Tautan dalam (?tab=graph&claim=<id klaim>, ?tab=peta&province=ID-JK) dibaca sekali saat halaman dibuka.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const tab = (sp.get("tab") || "").toLowerCase();
    if (tab === "peta" || tab === "map") setActiveTab("MAP");
    else if (tab === "graf" || tab === "graph") setActiveTab("GRAPH");
    else if (tab === "pola" || tab === "patterns") setActiveTab("PATTERNS");
    if (sp.get("province")) setFocusProvince(sp.get("province") as string);
    const claim = sp.get("claim");
    if (claim) {
      setGraphClaim(claim);
      setClaimInput(claim);
      setActiveTab("GRAPH");
    }
    if (sp.get("provider")) {
      setGraphProvider(sp.get("provider") as string);
      setActiveTab("GRAPH");
    }
  }, []);

  const load = useCallback(() => {
    Promise.all([
      fetch("/api/dashboard").then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))),
      fetch("/api/providers").then((r) => (r.ok ? r.json() : { data: [] })),
    ])
      .then(([d, p]) => {
        setProvinceData(d.province_risk || []);
        setSignals(d.emerging_signals || []);
        setAsOf(d.kpis?.as_of || null);
        setDataMode(d.meta?.data_mode || "");
        setProviderOptions((p.data || []).slice(0, 80));
        setError(null);
      })
      .catch((e) => setError(`Gagal memuat data peta (${e.message}).`))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    window.addEventListener("arsa:store-updated", load);
    return () => window.removeEventListener("arsa:store-updated", load);
  }, [load]);

  const islandGroupStats = useMemo(() => {
    const groups = new Map<string, { island: string; total_claims: number; high_risk_claims: number; potential_exposure: number; active_provinces: number; fkrtl: number; participants: number }>();
    for (const p of provinceData) {
      const cur = groups.get(p.island_group) || { island: p.island_group, total_claims: 0, high_risk_claims: 0, potential_exposure: 0, active_provinces: 0, fkrtl: 0, participants: 0 };
      cur.total_claims += p.total_claims;
      cur.high_risk_claims += p.high_risk_claims;
      cur.potential_exposure += p.potential_exposure;
      cur.fkrtl += p.national?.fkrtl_count ?? 0;
      cur.participants += p.national?.participants ?? 0;
      if (p.total_claims > 0) cur.active_provinces += 1;
      groups.set(p.island_group, cur);
    }
    return Array.from(groups.values()).sort((a, b) => b.potential_exposure - a.potential_exposure);
  }, [provinceData]);

  const topProvinces = useMemo(
    () =>
      [...provinceData]
        .filter((p) => p.total_claims > 0)
        .sort((a, b) => b.potential_exposure - a.potential_exposure)
        .slice(0, 8),
    [provinceData]
  );

  const tableRows = useMemo(() => {
    const val = (p: ProvinceRiskData) =>
      sortKey === "exposure" ? p.potential_exposure : sortKey === "score" ? p.risk_score ?? 0 : sortKey === "claims" ? p.total_claims : sortKey === "cost_ratio" ? p.national?.cost_ratio ?? -1 : sortKey === "access" ? p.national?.admission_rate_per_10k ?? 0 : p.national?.fkrtl_per_100k ?? 0;
    return [...provinceData].sort((a, b) => val(b) - val(a) || a.province_name.localeCompare(b.province_name, "id"));
  }, [provinceData, sortKey]);

  const totals = useMemo(() => {
    const withClaims = provinceData.filter((p) => p.total_claims > 0).length;
    const total = provinceData.reduce((a, p) => a + p.total_claims, 0);
    return { withClaims, total };
  }, [provinceData]);

  const tabs: { id: RiskTab; label: string }[] = [
    { id: "OVERVIEW", label: "Ringkasan" },
    { id: "MAP", label: `Peta dan tabel provinsi` },
    { id: "GRAPH", label: "Graf relasi" },
    { id: "PATTERNS", label: "Pola yang naik" },
  ];

  const showOnMap = (code: string) => {
    setFocusProvince(code);
    mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <DashboardShell>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div className="max-w-3xl">
          <h1 className="text-xl sm:text-2xl font-bold text-jkn-text tracking-tight">Peta risiko dan graf relasi</h1>
          <p className="text-sm text-jkn-muted mt-1.5 leading-relaxed">
            Di mana klaim berisiko menumpuk, dan siapa saja yang terhubung. Setiap provinsi dibandingkan dengan statistik resmi BPJS 2018.
          </p>
          {!loading && (
            <p className="text-xs text-jkn-dim mt-1.5">
              {formatNumber(totals.total)} klaim dari {totals.withClaims} provinsi{asOf ? `, sampai ${formatDate(asOf)}` : ""}
              {dataMode === "sintetis" ? ", dataset sintetis berlabel" : dataMode === "campuran" ? ", sintetis dan unggahan" : ""}.
            </p>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-risk-critical-border bg-risk-critical-bg px-4 py-2.5 text-sm text-risk-critical">
          <span>{error}</span>
          <button onClick={load} className="font-semibold underline underline-offset-2 shrink-0">
            Coba lagi
          </button>
        </div>
      )}

      <div role="tablist" aria-label="Bagian halaman" className="flex items-center gap-1.5 border-b border-jkn-border pb-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`h-9 px-3.5 rounded-lg text-sm font-semibold transition-colors shrink-0 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bpjs ${
              activeTab === tab.id ? "bg-bpjs-soft text-bpjs-dark border-bpjs-border" : "bg-surface text-jkn-muted border-transparent hover:bg-surface-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <PageLoader label="Memuat peta risiko..." />
      ) : activeTab === "OVERVIEW" ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8">
              <IndonesiaRiskMap provinceData={provinceData} />
            </div>
            <div className="lg:col-span-4">
              <div className="bg-surface rounded-xl border border-jkn-border p-4 shadow-subtle space-y-3 h-full">
                <h2 className="text-base font-bold text-jkn-text">Pola yang sedang naik</h2>
                <p className="text-xs text-jkn-muted">14 hari terakhir dibanding 14 hari sebelumnya</p>
                <div className="space-y-2.5">
                  {signals.length === 0 && <p className="text-sm text-jkn-muted">Belum ada pola dengan minimal 3 klaim pada periode ini.</p>}
                  {signals.slice(0, 3).map((sig) => (
                    <Link
                      key={sig.signal_id}
                      href={`/investigation-queue?risk_type=${sig.risk_type}`}
                      className={`block p-3 rounded-lg border text-sm space-y-1 transition-shadow hover:shadow-subtle ${
                        sig.severity === "CRITICAL" ? "bg-risk-critical-bg border-risk-critical-border" : sig.severity === "HIGH" ? "bg-risk-high-bg border-risk-high-border" : "bg-risk-medium-bg border-risk-medium-border"
                      }`}
                    >
                      <div className="flex justify-between gap-2 font-bold text-jkn-text">
                        <span>{sig.title}</span>
                        <span className="text-xs shrink-0">{SEVERITY_LABEL[sig.severity]}</span>
                      </div>
                      <p className="text-xs text-jkn-muted leading-relaxed">{sig.description}</p>
                      <div className="flex items-center justify-between pt-1 text-xs font-semibold font-mono tabular-nums">
                        <span className="text-bpjs-dark">Keyakinan {(sig.confidence * 100).toFixed(0)}%</span>
                        <span className="text-risk-critical">{formatRupiah(sig.potential_exposure, true)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-6 bg-surface rounded-xl border border-jkn-border p-4 shadow-subtle space-y-3">
              <div>
                <h2 className="text-base font-bold text-jkn-text flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-bpjs" aria-hidden />
                  <span>Provinsi dengan eksposur terbesar</span>
                </h2>
                <p className="text-xs text-jkn-muted mt-0.5">Delapan provinsi dengan selisih tagihan tertinggi. Warna menurut tingkat risiko provinsi.</p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProvinces} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid stroke="#E4ECE8" horizontal={false} />
                    <XAxis type="number" stroke="#61756D" fontSize={12} tickFormatter={(v: number) => formatRupiah(v, true)} />
                    <YAxis dataKey="province_name" type="category" stroke="#61756D" fontSize={12} width={125} />
                    <Tooltip formatter={(v: number) => [formatRupiah(v), "Eksposur"]} contentStyle={tooltipStyle} />
                    <Bar dataKey="potential_exposure" name="Eksposur" radius={[0, 4, 4, 0]}>
                      {topProvinces.map((e) => (
                        <Cell key={e.province_code} fill={e.risk_level === "CRITICAL" ? "#B91C1C" : e.risk_level === "HIGH" ? "#EA580C" : e.risk_level === "MEDIUM" ? "#CA8A04" : "#059669"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-6 bg-surface rounded-xl border border-jkn-border p-4 shadow-subtle space-y-3">
              <div>
                <h2 className="text-base font-bold text-jkn-text flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-bpjs" aria-hidden />
                  <span>Per gugus kepulauan</span>
                </h2>
                <p className="text-xs text-jkn-muted mt-0.5">Volume klaim, rasio klaim berisiko tinggi, eksposur, dan jumlah FKRTL BPJS di wilayah itu.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {islandGroupStats.map((g) => {
                  const highPct = g.total_claims > 0 ? Math.round((g.high_risk_claims / g.total_claims) * 100) : 0;
                  return (
                    <div key={g.island} className="p-3 rounded-lg bg-surface-secondary/60 border border-jkn-divider space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-jkn-text">{g.island}</span>
                        <span className="text-sm font-bold text-risk-critical font-mono tabular-nums">{formatRupiah(g.potential_exposure, true)}</span>
                      </div>
                      <div className="text-xs text-jkn-muted tabular-nums space-y-0.5">
                        <div>
                          {formatNumber(g.total_claims)} klaim, {formatNumber(g.high_risk_claims)} berisiko tinggi ({highPct}%)
                        </div>
                        <div>
                          {g.active_provinces} provinsi berklaim, {formatNumber(g.fkrtl)} FKRTL BPJS
                        </div>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-surface-secondary overflow-hidden">
                        <div className={`h-full rounded-full ${highPct >= 40 ? "bg-risk-critical" : highPct >= 25 ? "bg-risk-medium" : "bg-bpjs"}`} style={{ width: `${Math.min(100, Math.max(4, highPct))}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <NetworkGraphView />
        </div>
      ) : activeTab === "MAP" ? (
        <div className="space-y-5">
          <div ref={mapRef} className="scroll-mt-4">
            <IndonesiaRiskMap provinceData={provinceData} focusProvince={focusProvince} className="min-h-[500px]" />
          </div>

          <section className="bg-surface rounded-xl border border-jkn-border shadow-subtle overflow-hidden">
            <div className="px-5 py-4 border-b border-jkn-divider flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-jkn-text">{provinceData.length} provinsi dalam tabel</h2>
                <p className="text-xs text-jkn-muted mt-0.5 max-w-2xl">
                  Data klaim berdampingan dengan statistik resmi BPJS 2018. Pangsa klaim dibandingkan pangsa admisi rawat inap nasional supaya terlihat seberapa mewakili datanya. Provinsi dengan klaim kurang dari 20 ditandai.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm shrink-0">
                <span className="text-jkn-muted">Urutkan</span>
                <select aria-label="Urutkan provinsi" value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="h-9 px-3 rounded-xl border border-jkn-border bg-surface-subtle text-sm focus:outline-none focus:border-bpjs">
                  {SORTS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
              <table className="w-full text-left text-sm tabular-nums">
                <thead className="sticky top-0 bg-surface-subtle z-10">
                  <tr className="text-xs font-semibold text-jkn-muted border-b border-jkn-border">
                    <th scope="col" className="py-2.5 px-4">Provinsi</th>
                    <th scope="col" className="py-2.5 px-3 text-right">Klaim</th>
                    <th scope="col" className="py-2.5 px-3 text-right">Berisiko</th>
                    <th scope="col" className="py-2.5 px-3">Skor</th>
                    <th scope="col" className="py-2.5 px-3 text-right">Eksposur</th>
                    <th scope="col" className="py-2.5 px-3 text-right">Biaya vs nasional</th>
                    <th scope="col" className="py-2.5 px-3 text-right">Admisi / 10.000</th>
                    <th scope="col" className="py-2.5 px-3 text-right">FKRTL / 100 rb</th>
                    <th scope="col" className="py-2.5 px-3 text-right">Pangsa data / nasional</th>
                    <th scope="col" className="py-2.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-jkn-divider">
                  {tableRows.map((p) => (
                    <tr key={p.province_code} className="hover:bg-surface-subtle/70 transition-colors">
                      <td className="py-2 px-4 font-medium text-jkn-text">
                        {p.province_name}
                        {p.total_claims > 0 && p.national?.small_sample && (
                          <span title="Kurang dari 20 klaim: belum dapat disimpulkan" className="ml-2 inline-flex items-center text-risk-medium">
                            <AlertTriangle className="w-3.5 h-3.5" aria-label="sampel kecil" />
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">{formatNumber(p.total_claims)}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatNumber(p.high_risk_claims)}</td>
                      <td className="py-2 px-3">{p.total_claims > 0 ? <RiskPill score={p.risk_score ?? 0} level={p.risk_level} size="sm" /> : <span className="text-jkn-dim text-xs">tanpa klaim</span>}</td>
                      <td className="py-2 px-3 text-right font-mono font-semibold">{p.total_claims > 0 ? formatRupiah(p.potential_exposure, true) : "-"}</td>
                      <td className={`py-2 px-3 text-right font-mono font-semibold ${(p.national?.cost_ratio ?? 0) >= 1.5 ? "text-risk-critical" : (p.national?.cost_ratio ?? 0) >= 1.25 ? "text-risk-high" : "text-jkn-text"}`}>{ratio(p.national?.cost_ratio)}</td>
                      <td className="py-2 px-3 text-right font-mono">{p.national ? p.national.admission_rate_per_10k.toLocaleString("id-ID", { maximumFractionDigits: 0 }) : "-"}</td>
                      <td className="py-2 px-3 text-right font-mono">{p.national ? p.national.fkrtl_per_100k.toLocaleString("id-ID") : "-"}</td>
                      <td className="py-2 px-3 text-right font-mono text-xs">
                        {p.national ? `${(p.national.dataset_share * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}% / ${(p.national.national_share * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%` : "-"}
                      </td>
                      <td className="py-2 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-3">
                          <button type="button" onClick={() => showOnMap(p.province_code)} className="text-sm font-semibold text-jkn-muted hover:text-jkn-text">
                            Peta
                          </button>
                          <Link href={`/investigation-queue?mode=CLAIMS&province=${p.province_code}`} className="text-sm font-semibold text-bpjs hover:underline">
                            Klaim
                          </Link>
                          <Link href={`/providers?province=${p.province_code}`} className="text-sm font-semibold text-bpjs hover:underline">
                            Faskes
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : activeTab === "GRAPH" ? (
        <div className="space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-end gap-3 text-sm">
            <label className="flex flex-col gap-1">
              <span className="font-semibold text-jkn-text">Fokus faskes</span>
              <select
                id="graph-provider"
                value={graphProvider}
                onChange={(e) => {
                  setGraphProvider(e.target.value);
                  setGraphClaim("");
                  setClaimInput("");
                }}
                className="h-9 px-2.5 rounded-lg border border-jkn-border bg-white text-sm min-w-[260px]"
              >
                <option value="">Faskes berisiko tertinggi (otomatis)</option>
                {providerOptions.map((p) => (
                  <option key={p.provider_id} value={p.provider_id}>
                    {p.name}, skor {p.risk_score}
                  </option>
                ))}
              </select>
            </label>
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setGraphClaim(claimInput.trim());
                if (claimInput.trim()) setGraphProvider("");
              }}
            >
              <label className="flex flex-col gap-1">
                <span className="font-semibold text-jkn-text">Atau fokus ke satu klaim</span>
                <input value={claimInput} onChange={(e) => setClaimInput(e.target.value)} placeholder="ID klaim" className="h-9 px-3 rounded-lg border border-jkn-border bg-white text-sm w-52 font-mono" />
              </label>
              <button type="submit" className="h-9 px-3.5 rounded-lg bg-[#071A12] text-white text-sm font-semibold hover:bg-[#0D2B1E] transition-colors">
                Tampilkan
              </button>
              {graphClaim && (
                <button
                  type="button"
                  onClick={() => {
                    setGraphClaim("");
                    setClaimInput("");
                  }}
                  className="h-9 px-3 rounded-lg border border-jkn-border bg-white text-sm font-semibold text-jkn-muted hover:text-jkn-text"
                >
                  Hapus fokus
                </button>
              )}
            </form>
          </div>
          <NetworkGraphView providerId={graphProvider || undefined} claimId={graphClaim || undefined} className="min-h-[550px]" />
        </div>
      ) : (
        <div className="space-y-5">
          {signals.length === 0 ? (
            <p className="text-sm text-jkn-muted bg-surface rounded-xl border border-jkn-border p-5">Belum ada pola dengan minimal 3 klaim dalam 14 hari terakhir.</p>
          ) : (
            <div className="bg-surface rounded-xl border border-jkn-border p-4 shadow-subtle space-y-3">
              <div>
                <h2 className="text-base font-bold text-jkn-text flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-risk-critical" aria-hidden />
                  <span>Eksposur pola yang sedang naik</span>
                </h2>
                <p className="text-xs text-jkn-muted mt-0.5">Besaran dampak finansial tiap pola dalam 14 hari terakhir</p>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={signals.map((s) => ({ ...s, label: TYPE_LABEL[s.risk_type] || s.risk_type }))}>
                    <CartesianGrid stroke="#E4ECE8" vertical={false} />
                    <XAxis dataKey="label" stroke="#61756D" fontSize={12} />
                    <YAxis stroke="#61756D" fontSize={12} tickFormatter={(v: number) => formatRupiah(v, true)} />
                    <Tooltip formatter={(v: number) => [formatRupiah(v), "Eksposur"]} contentStyle={tooltipStyle} />
                    <Bar dataKey="potential_exposure" name="Eksposur" radius={[4, 4, 0, 0]}>
                      {signals.map((sig) => (
                        <Cell key={sig.signal_id} fill={sig.severity === "CRITICAL" ? "#B91C1C" : sig.severity === "HIGH" ? "#EA580C" : "#CA8A04"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {signals.map((sig) => (
              <div key={sig.signal_id} className="bg-surface rounded-xl border border-jkn-border p-4 shadow-subtle space-y-3 flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <RiskPill type={sig.risk_type} size="sm" />
                    <span className="text-sm font-bold text-risk-critical font-mono tabular-nums">{formatRupiah(sig.potential_exposure, true)}</span>
                  </div>
                  <h3 className="text-base font-bold text-jkn-text">{sig.title}</h3>
                  <p className="text-sm text-jkn-muted leading-relaxed">{sig.description}</p>
                </div>
                <div className="space-y-2 pt-2 border-t border-jkn-divider">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-jkn-dim">Keyakinan detektor</span>
                      <span className="font-bold text-bpjs-dark font-mono tabular-nums">{(sig.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-surface-secondary overflow-hidden">
                      <div className="h-full rounded-full bg-bpjs" style={{ width: `${Math.round(sig.confidence * 100)}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm pt-1">
                    <span className="text-jkn-dim tabular-nums">
                      {sig.affected_providers_count} faskes, {sig.change_percentage >= 0 ? "+" : ""}
                      {sig.change_percentage}% dari {sig.previous_count ?? "-"} ke {sig.recent_count ?? "-"} klaim
                    </span>
                    <Link href={`/investigation-queue?risk_type=${sig.risk_type}`} className="text-sm font-semibold text-bpjs hover:underline inline-flex items-center gap-1">
                      <span>Periksa kasus</span>
                      <ChevronRight className="w-3.5 h-3.5" aria-hidden />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
