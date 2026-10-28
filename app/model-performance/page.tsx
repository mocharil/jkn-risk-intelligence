"use client";

import React, { useCallback, useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { RiskPill } from "@/components/ui/RiskPill";
import { useSession } from "@/lib/auth/client";
import type { EvaluationReport } from "@/lib/eval/evaluate";
import Link from "next/link";
import { Lock, RefreshCw, Sliders } from "lucide-react";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, LabelList, ReferenceLine } from "recharts";

interface Payload {
  data: EvaluationReport;
  bpjs_sample?: EvaluationReport | null;
  handling_time: { cases_measured: number; median_hours: number | null };
  embedding_model?: string;
  disclaimer: string;
}

interface SystemThresholdStatus {
  thresholds: Record<string, number>;
  last_analysis?: {
    claims_analyzed: number;
    findings_total: number;
    flagged_claims: number;
    investigations_created: number;
    embedding_model: string;
    similarity_threshold: number;
    duration_ms: number;
  };
}

const THRESHOLD_LABEL: Record<string, { label: string; desc: string }> = {
  clone_semantic: {
    label: "Kemiripan semantik klon (cosine)",
    desc: "Ambang kemiripan vektor ringkasan pulang untuk mendeteksi duplikasi narasi lintas klaim.",
  },
  clone_lexical_overlap: {
    label: "Tumpang tindih frasa klon (Jaccard 3-kata)",
    desc: "Rasio kesamaan urutan n-gram untuk membedakan template normal vs salin-tempel.",
  },
  clone_semantic_only: {
    label: "Ambang semantik murni (parafrase)",
    desc: "Batas atas kemiripan makna ketika struktur kalimat telah diparafrase.",
  },
  similarity_floor: {
    label: "Batas bawah kandidat pencarian vektor",
    desc: "Ambang minimum indeks kemiripan yang disimpan ke matriks tetangga terdekat.",
  },
  los_ratio: {
    label: "Rasio lama rawat vs median diagnosis",
    desc: "Kelipatan minimum hari rawat terhadap median diagnosis yang sama (RJTL/RITL dipisah).",
  },
  los_sigma_gate: {
    label: "Gerbang sebaran lama rawat (σ log)",
    desc: "Lama rawat juga harus melewati sekian simpangan baku robust (MAD) dari sebaran peer; mencegah salah tandai pada diagnosis yang lama rawatnya memang menyebar lebar.",
  },
  inflated_total_ratio: {
    label: "Rasio total tagihan vs acuan (Inflated)",
    desc: "Kelipatan minimum nilai klaim terhadap acuan diagnosis, sudah dinormalkan per kelas rawat BPJS.",
  },
  inflated_sigma_gate: {
    label: "Gerbang sebaran biaya (σ log)",
    desc: "Biaya juga harus melewati sekian simpangan baku robust dari sebaran peer pada diagnosis dan kelas yang sama.",
  },
  inflated_line_ratio: {
    label: "Rasio komponen vs harga acuan (Inflated)",
    desc: "Kelipatan rincian tarif obat/alkes terhadap harga e-Katalog / Fornas.",
  },
  queue_min_score: {
    label: "Skor minimum masuk antrean investigasi",
    desc: "Batas skor komposit (0–100) agar klaim otomatis membuka berkas investigasi (INV-...).",
  },
};

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

function Bar({ value, tone = "bg-bpjs" }: { value: number; tone?: string }) {
  return (
    <div className="w-full h-1.5 rounded-full bg-surface-secondary overflow-hidden">
      <div
        className={`h-full rounded-full ${tone}`}
        style={{ width: `${Math.min(100, value * 100)}%` }}
      />
    </div>
  );
}

export default function ModelPerformancePage() {
  const { can } = useSession();
  const [p, setP] = useState<Payload | null>(null);
  const [sys, setSys] = useState<SystemThresholdStatus | null>(null);
  const [busy, setBusy] = useState<"" | "ai" | "local">("");
  const [msg, setMsg] = useState("");
  const [source, setSource] = useState<"seed" | "bpjs">("seed");
  const [loadError, setLoadError] = useState("");

  const loadAll = useCallback(async () => {
    const [evalRes, sysRes] = await Promise.all([
      fetch("/api/evaluation"),
      fetch("/api/system/status"),
    ]);
    if (evalRes.ok) { setP(await evalRes.json()); setLoadError(""); } else setLoadError(`Metrik evaluasi belum bisa dimuat (HTTP ${evalRes.status}).`);
    if (sysRes.ok) setSys(await sysRes.json());
  }, []);

  useEffect(() => {
    loadAll().catch(() => setLoadError("Metrik evaluasi belum bisa dimuat. Periksa koneksi lalu coba lagi."));
  }, [loadAll]);

  const rerunAnalysis = async (local: boolean) => {
    setBusy(local ? "local" : "ai");
    setMsg("");
    try {
      const res = await fetch("/api/analysis/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ local }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Gagal menjalankan analisis ulang");
      setMsg(
        `Evaluasi ulang selesai: ${j.data.claims_analyzed} klaim dianalisis, ${j.data.findings_total} temuan (${j.data.duration_ms} ms).`
      );
      await loadAll();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Gagal menjalankan ulang analisis");
    } finally {
      setBusy("");
    }
  };

  if (!p) {
    return (
      <DashboardShell>
        <PageLoader label="Menghitung metrik evaluasi & parameter detektor..." className="h-[50vh]" />
      </DashboardShell>
    );
  }
  const bpjsAvailable = Boolean(p.bpjs_sample);
  const useBpjs = source === "bpjs" && bpjsAvailable;
  const r = useBpjs ? (p.bpjs_sample as EvaluationReport) : p.data;

  const TYPE_NAME: Record<string, string> = {
    UPCODING: "Upcoding",
    CLONING: "Cloning",
    PHANTOM_BILLING: "Phantom billing",
    ABNORMAL_LOS: "LOS anomali",
    UNBUNDLING: "Unbundling",
    INFLATED_BILLS: "Inflasi tagihan",
    REPEAT_BILLING: "Tagihan berulang",
    READMISSION: "Rawat ulang dini",
  };
  const f1Tone = (v: number) => (v >= 0.85 ? "#059669" : v >= 0.6 ? "#CA8A04" : "#B91C1C");
  const circ = 2 * Math.PI * 52;
  const scatter = r.per_detector.map((m) => ({ x: Math.round(m.recall * 100), y: Math.round(m.precision * 100), z: Math.max(m.positives, 3), small: m.positives < 10, name: TYPE_NAME[m.risk_type] || m.risk_type, f1: m.f1 }));
  const ev = r.evidence_completeness;

  return (
    <DashboardShell>
      {/* Judul dan aksi */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-jkn-text">Evaluasi &amp; kalibrasi</h1>
          <p className="mt-1 text-sm text-jkn-muted tabular-nums">
            {r.evaluated_claims.toLocaleString("id-ID")} klaim berlabel, {p.data.per_detector.length} detektor aktif.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {can("analysis.run") ? (
            <>
              <button onClick={() => rerunAnalysis(true)} disabled={!!busy} className="h-8 px-3 rounded-md border border-jkn-border text-sm font-medium text-jkn-text hover:bg-frame disabled:opacity-50 transition-colors">
                {busy === "local" ? "Menghitung" : "Uji embedding lokal"}
              </button>
              <button onClick={() => rerunAnalysis(false)} disabled={!!busy} className="h-8 inline-flex items-center gap-1.5 px-3.5 rounded-md bg-[#1d1f20] text-white text-sm font-medium hover:bg-black disabled:opacity-50 transition-colors">
                <RefreshCw className={`w-3.5 h-3.5 ${busy === "ai" ? "animate-spin" : ""}`} aria-hidden />
                <span>{busy === "ai" ? "Menganalisis ulang" : "Jalankan ulang detektor"}</span>
              </button>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-jkn-muted px-3 py-1.5 rounded-md border border-jkn-border">
              <Lock className="w-3.5 h-3.5" aria-hidden /> Tanpa izin menjalankan ulang detektor
            </span>
          )}
        </div>
      </div>

      {msg && (
        <div role="status" className="text-sm rounded-lg px-4 py-2.5 bg-bpjs-soft border border-bpjs-border text-bpjs-dark">
          {msg}
        </div>
      )}

      {/* Sumber data dan catatan metodologi (dilipat) */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <div className="inline-flex rounded-lg bg-frame p-0.5">
          {([
            ["seed", "Dataset bawaan"],
            ["bpjs", "Sampel BPJS"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSource(key)}
              disabled={key === "bpjs" && !bpjsAvailable}
              title={key === "bpjs" && !bpjsAvailable ? "Muat Data Sampel BPJS di Dataset terlebih dahulu" : undefined}
              className={`h-8 px-3 rounded-md font-medium transition-colors disabled:opacity-40 ${(key === "bpjs") === useBpjs ? "bg-white text-jkn-text" : "text-jkn-muted hover:text-jkn-text"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {!bpjsAvailable && (
          <Link href="/data-management" className="text-sm font-medium text-bpjs hover:underline">
            Muat sampel BPJS
          </Link>
        )}
      </div>

      {/* Batas klaim: selalu terlihat, tidak dilipat */}
      <div role="note" className="rounded-xl border border-risk-medium-border bg-risk-medium-bg px-4 py-3 text-sm text-risk-medium">
        <p className="font-medium">
          {useBpjs ? "Diukur pada data sampel BPJS sintetis berlabel; belum divalidasi pada klaim riil." : "Diukur pada data sintetis berlabel buatan kami; belum divalidasi pada klaim riil."}
        </p>
        <details className="mt-1 text-xs leading-relaxed">
          <summary className="cursor-pointer list-none underline underline-offset-2">Baca batasannya</summary>
          <p className="mt-1.5">
            {useBpjs
              ? "Data ini tidak punya resume medis, sehingga detektor kloning dan klaim fiktif tidak berlaku. Anomali disisipkan oleh generator kami, jadi angka ini mengukur kemampuan menemukan anomali yang kami tanam, bukan akurasi pada klaim sebenarnya."
              : p.disclaimer}{" "}
            Detektor dengan kurang dari 10 kasus berlabel hanya indikatif. Hasil sempurna pada detektor itu tidak boleh dibaca sebagai bukti.
          </p>
        </details>
      </div>

      {/* Ringkasan: F1 makro sebagai cincin, tiga metrik pendukung */}
      <div className="rounded-2xl border border-jkn-border/80 bg-surface grid grid-cols-1 md:grid-cols-[220px_1fr] tabular-nums overflow-hidden">
        <div className="p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-jkn-divider">
          <div className="relative w-32 h-32">
            <svg viewBox="0 0 120 120" className="w-32 h-32" role="img" aria-label={`Skor F1 makro ${pct(r.macro.f1)}`}>
              <circle cx="60" cy="60" r="52" fill="none" stroke="#E4ECE8" strokeWidth="9" />
              <circle cx="60" cy="60" r="52" fill="none" stroke={f1Tone(r.macro.f1)} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${r.macro.f1 * circ} ${circ}`} transform="rotate(-90 60 60)" />
            </svg>
            <span className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-semibold text-jkn-text leading-none">{(r.macro.f1 * 100).toFixed(1)}</span>
              <span className="text-xs text-jkn-muted mt-1">F1 makro</span>
            </span>
          </div>
          <p className="mt-3 text-xs text-jkn-muted text-center">Rerata F1 pada data sintetis berlabel</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-jkn-divider">
          {[
            { k: "Precision mikro", v: r.micro.precision, hint: "temuan yang benar dari semua sinyal", tone: "#007A3A" },
            { k: "Recall mikro", v: r.micro.recall, hint: "anomali nyata yang tertangkap", tone: "#0E7490" },
            { k: "Positif palsu", v: r.claim_level.false_positive_rate, hint: "klaim normal yang ikut ditandai", tone: "#B91C1C", low: true },
          ].map((m) => (
            <div key={m.k} className="p-6 flex flex-col justify-center">
              <span className="text-sm text-jkn-muted">{m.k}</span>
              <span className="mt-1 text-3xl font-semibold text-jkn-text">{pct(m.v)}</span>
              <div className="mt-3 h-1.5 rounded-full bg-frame overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, m.v * 100)}%`, backgroundColor: m.tone }} />
              </div>
              <span className="mt-2 text-xs text-jkn-muted">{m.hint}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Per detektor: daftar dan peta precision-recall */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-6 tabular-nums">
        <section className="rounded-2xl border border-jkn-border/80 bg-surface" aria-labelledby="h-det">
          <div className="px-6 pt-5 pb-3">
            <h2 id="h-det" className="text-lg font-semibold text-jkn-text">Kinerja per detektor</h2>
            <p className="text-sm text-jkn-muted mt-0.5">TP, FP, FN dihitung per penandaan; satu sinyal detektor satu penandaan.</p>
          </div>
          <div className="grid grid-cols-[minmax(0,1.5fr)_44px_minmax(0,1fr)_minmax(0,1fr)_76px] gap-3 px-6 pb-2 text-[11px] text-jkn-dim border-b border-jkn-divider">
            <span>Detektor</span>
            <span className="text-right">F1</span>
            <span>Precision</span>
            <span>Recall</span>
            <span className="text-right">TP / FP / FN</span>
          </div>
          <ul>
            {[...r.per_detector].sort((a, b) => b.f1 - a.f1).map((m) => (
              <li key={m.risk_type} className="grid grid-cols-[minmax(0,1.5fr)_44px_minmax(0,1fr)_minmax(0,1fr)_76px] gap-3 px-6 py-3 items-center hover:bg-frame/50 transition-colors">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-jkn-text truncate">{TYPE_NAME[m.risk_type] || m.risk_type}</div>
                  <div className="text-[11px] text-jkn-muted">
                    {m.positives} kasus berlabel
                    {m.positives < 10 && (
                      <span className="ml-1.5 whitespace-nowrap text-[11px] font-medium px-1.5 py-0.5 rounded bg-risk-medium-bg text-risk-medium border border-risk-medium-border" title="Kurang dari 10 kasus berlabel; angka hanya indikatif">
                        sampel kecil
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-sm font-semibold text-right" style={{ color: m.positives < 10 ? "#94A3B8" : f1Tone(m.f1) }} title={m.positives < 10 ? "Indikatif: sampel kecil" : undefined}>{m.f1.toFixed(2)}</span>
                <div>
                  <div className="text-xs text-jkn-text mb-1">{pct(m.precision)}</div>
                  <div className="h-1.5 rounded-full bg-frame overflow-hidden"><div className="h-full rounded-full bg-bpjs" style={{ width: `${m.precision * 100}%` }} /></div>
                </div>
                <div>
                  <div className="text-xs text-jkn-text mb-1">{pct(m.recall)}</div>
                  <div className="h-1.5 rounded-full bg-frame overflow-hidden"><div className="h-full rounded-full bg-intel" style={{ width: `${m.recall * 100}%` }} /></div>
                </div>
                <span className="text-xs text-right text-jkn-muted">
                  <span className="text-bpjs-dark font-medium">{m.tp}</span> / <span className={m.fp > 0 ? "text-risk-critical font-medium" : ""}>{m.fp}</span> / <span className={m.fn > 0 ? "text-risk-medium font-medium" : ""}>{m.fn}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-jkn-border/80 bg-surface p-6 flex flex-col" aria-labelledby="h-pr">
          <h2 id="h-pr" className="text-lg font-semibold text-jkn-text">Peta precision dan recall</h2>
          <p className="text-sm text-jkn-muted mt-0.5">Makin ke kanan atas makin baik. Ukuran titik menurut jumlah kasus berlabel; titik abu-abu putus-putus berarti sampel kecil (indikatif).</p>
          <div className="flex-1 min-h-[320px] mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 12, right: 28, bottom: 16, left: 0 }}>
                <CartesianGrid stroke="#E4ECE8" />
                <XAxis type="number" dataKey="x" name="Recall" unit="%" domain={[0, 112]} ticks={[0, 25, 50, 75, 100]} stroke="#61756D" fontSize={12} tickLine={false} label={{ value: "Recall", position: "insideBottom", offset: -8, fontSize: 12, fill: "#61756D" }} />
                <YAxis type="number" dataKey="y" name="Precision" unit="%" domain={[0, 112]} ticks={[0, 25, 50, 75, 100]} stroke="#61756D" fontSize={12} tickLine={false} />
                <ZAxis type="number" dataKey="z" range={[60, 360]} />
                <ReferenceLine x={80} stroke="#CBD5E1" strokeDasharray="4 4" />
                <ReferenceLine y={80} stroke="#CBD5E1" strokeDasharray="4 4" />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  contentStyle={{ backgroundColor: "#FFFFFF", borderRadius: 8, border: "1px solid #D5E0DA", fontSize: 12 }}
                  formatter={(v: number, n: string) => [`${v}%`, n]}
                  labelFormatter={() => ""}
                />
                <Scatter data={scatter} fill="#007A3A" fillOpacity={0.75} shape={(props: { cx?: number; cy?: number; payload?: { z: number; small: boolean } }) => <circle cx={props.cx} cy={props.cy} r={props.payload ? 4 + Math.min(8, props.payload.z / 4) : 5} fill={props.payload?.small ? "#94A3B8" : "#007A3A"} fillOpacity={props.payload?.small ? 0.55 : 0.8} stroke={props.payload?.small ? "#64748B" : "none"} strokeDasharray={props.payload?.small ? "2 2" : undefined} />}>
                  <LabelList dataKey="name" position="top" fontSize={11} fill="#475B53" />
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Pembanding, sitasi, waktu penanganan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 tabular-nums">
        <section className="rounded-2xl border border-jkn-border/80 bg-surface p-6">
          <h2 className="text-base font-semibold text-jkn-text">Dibanding ambang tunggal</h2>
          <p className="text-xs text-jkn-muted mt-0.5">F1 tingkat klaim, {r.per_detector.length} detektor ARSA melawan {r.baseline.name}.</p>
          <div className="mt-4 space-y-3">
            {[
              ["ARSA", r.uplift.claim_f1_arsa, "#007A3A"],
              ["Ambang tunggal", r.uplift.claim_f1_baseline, "#94A3B8"],
            ].map(([k, v, c]) => (
              <div key={k as string}>
                <div className="flex justify-between text-sm mb-1"><span className="text-jkn-muted">{k as string}</span><span className="font-semibold text-jkn-text">{(v as number).toFixed(3)}</span></div>
                <div className="h-2 rounded-full bg-frame overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(v as number) * 100}%`, backgroundColor: c as string }} /></div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-jkn-text">
            <span className="text-lg font-semibold text-bpjs-dark">{r.uplift.relative_pct >= 0 ? "+" : ""}{r.uplift.relative_pct}%</span> <span className="text-jkn-muted">peningkatan relatif</span>
          </p>
          <p className="mt-1 text-xs text-jkn-dim">Baseline: precision {pct(r.baseline.precision)}, recall {pct(r.baseline.recall)}, {r.baseline.flagged} klaim ditandai.</p>
        </section>

        <section className="rounded-2xl border border-jkn-border/80 bg-surface p-6">
          <h2 className="text-base font-semibold text-jkn-text">Kelengkapan sitasi bukti</h2>
          <p className="text-xs text-jkn-muted mt-0.5">Temuan yang menautkan minimal satu bukti valid.</p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {[
              ["Bukti valid", ev.pct, "#007A3A"],
              ["Dokumen medis", ev.document_pct, "#0E7490"],
            ].map(([k, v, c]) => {
              const cc = 2 * Math.PI * 30;
              return (
                <div key={k as string} className="flex flex-col items-center">
                  <div className="relative w-20 h-20">
                    <svg viewBox="0 0 72 72" className="w-20 h-20" role="img" aria-label={`${k}: ${(v as number).toFixed(1)}%`}>
                      <circle cx="36" cy="36" r="30" fill="none" stroke="#E4ECE8" strokeWidth="6" />
                      <circle cx="36" cy="36" r="30" fill="none" stroke={c as string} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${((v as number) / 100) * cc} ${cc}`} transform="rotate(-90 36 36)" />
                    </svg>
                    <span className="absolute inset-0 grid place-items-center text-sm font-semibold text-jkn-text">{(v as number).toFixed(0)}%</span>
                  </div>
                  <span className="mt-1.5 text-xs text-jkn-muted">{k as string}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-jkn-dim text-center">{ev.with_valid_citation} dari {ev.findings} temuan terverifikasi</p>
        </section>

        <section className="rounded-2xl border border-jkn-border/80 bg-surface p-6 flex flex-col">
          <h2 className="text-base font-semibold text-jkn-text">Waktu penyelesaian</h2>
          <p className="text-xs text-jkn-muted mt-0.5">Dari berkas dibuka sampai keputusan akhir pada rantai audit.</p>
          <div className="mt-4 flex-1 flex flex-col justify-center">
            <div className="text-3xl font-semibold text-jkn-text">{p.handling_time.median_hours === null ? "-" : `${p.handling_time.median_hours} jam`}</div>
            <div className="text-sm text-jkn-muted mt-1">
              {p.handling_time.median_hours === null ? "Belum ada kasus yang diselesaikan" : `median dari ${p.handling_time.cases_measured} kasus selesai`}
            </div>
          </div>
        </section>
      </div>

      {/* Parameter ambang aktif: dilipat */}
      {sys && (
        <details className="group rounded-2xl border border-jkn-border/80 bg-surface tabular-nums">
          <summary className="cursor-pointer list-none px-6 py-4 flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-base font-semibold text-jkn-text">
              <Sliders className="w-4 h-4 text-bpjs" aria-hidden /> Parameter ambang aktif ({Object.keys(sys.thresholds).length})
            </span>
            <span className="text-xs text-jkn-muted">
              {sys.last_analysis ? `Terakhir ${sys.last_analysis.claims_analyzed.toLocaleString("id-ID")} klaim, ${sys.last_analysis.findings_total.toLocaleString("id-ID")} sinyal, ${sys.last_analysis.duration_ms} ms` : ""}
              <span className="ml-3 text-bpjs font-medium group-open:hidden">Tampilkan</span>
              <span className="ml-3 text-bpjs font-medium hidden group-open:inline">Sembunyikan</span>
            </span>
          </summary>
          <div className="border-t border-jkn-divider grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1 px-6 py-4">
            {Object.entries(sys.thresholds).map(([key, val]) => {
              const meta = THRESHOLD_LABEL[key] || { label: key, desc: "Parameter konfigurasi detektor aktif." };
              return (
                <div key={key} className="flex items-start justify-between gap-3 py-2 border-b border-jkn-divider/60" title={meta.desc}>
                  <span className="text-sm text-jkn-text leading-snug">{meta.label}</span>
                  <span className="text-sm font-semibold text-bpjs-dark shrink-0">{val}</span>
                </div>
              );
            })}
          </div>
          <p className="px-6 pb-4 text-xs text-jkn-muted">Parameter dikunci agar hasil audit dapat direproduksi. Arahkan kursor ke baris untuk melihat penjelasannya; ubah lewat variabel lingkungan lalu jalankan ulang detektor.</p>
        </details>
      )}
    </DashboardShell>
  );
}
