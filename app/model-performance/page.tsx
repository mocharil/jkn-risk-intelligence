"use client";

import React, { useCallback, useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { RiskPill } from "@/components/ui/RiskPill";
import { useSession } from "@/lib/auth/client";
import type { EvaluationReport } from "@/lib/eval/evaluate";
import Link from "next/link";
import { AlertTriangle, Info, Lock, RefreshCw, Sliders } from "lucide-react";

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
        `Evaluasi ulang selesai: ${j.data.claims_analyzed} klaim dianalisis, ${j.data.findings_total} temuan, model embedding ${j.data.embedding_model} (${j.data.duration_ms} ms).`
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

  return (
    <DashboardShell>
      {/* Page Title Header + Direct Rerun Calibration Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-jkn-border pb-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold text-jkn-text tracking-tight">
              Evaluasi &amp; Kalibrasi Detektor
            </h1>
            <span className="px-2 py-0.5 rounded bg-bpjs-soft text-bpjs-dark text-[11px] font-semibold border border-bpjs-border">
              {r.evaluated_claims.toLocaleString("id-ID")} Klaim Berlabel
            </span>
          </div>
          <p className="text-xs text-jkn-muted mt-1">
            Pengukuran langsung Precision, Recall, F1-Score, kelengkapan sitasi bukti, serta parameter ambang batas {p.data.per_detector.length} detektor aktif.
          </p>
        </div>

        {/* Rerun Pipeline Controls (Consolidated from Settings) */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {can("analysis.run") ? (
            <>
              <button
                onClick={() => rerunAnalysis(true)}
                disabled={!!busy}
                className="h-9 px-3 rounded-lg border border-jkn-border bg-white text-xs font-semibold text-jkn-text hover:bg-surface-secondary disabled:opacity-50 transition-colors"
              >
                {busy === "local" ? "Menghitung..." : "Uji Embedding Lokal"}
              </button>
              <button
                onClick={() => rerunAnalysis(false)}
                disabled={!!busy}
                className="h-9 inline-flex items-center gap-1.5 px-3.5 rounded-lg bg-bpjs text-white text-xs font-semibold hover:bg-bpjs-deep disabled:opacity-50 transition-colors shadow-subtle"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${busy === "ai" ? "animate-spin" : ""}`} />
                <span>{busy === "ai" ? "Menganalisis Ulang..." : "Jalankan Ulang Pipeline Detektor"}</span>
              </button>
            </>
          ) : (
            <div className="text-[11px] text-jkn-muted flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-secondary border border-jkn-border">
              <Lock className="w-3.5 h-3.5" />
              <span>Anda tidak memiliki izin menjalankan ulang detektor</span>
            </div>
          )}
        </div>
      </div>

      {msg && (
        <div
          role="status"
          className="text-xs rounded-xl px-4 py-2.5 border bg-bpjs-soft border-bpjs-border text-bpjs-dark font-medium"
        >
          {msg}
        </div>
      )}

      {/* Pemilih dataset evaluasi */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-jkn-muted">Data berlabel yang diukur:</span>
        <div className="inline-flex rounded-xl bg-surface-secondary p-1 border border-jkn-divider">
          {([
            ["seed", "Dataset sintetis bawaan"],
            ["bpjs", "Sampel BPJS (tanpa resume medis)"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSource(key)}
              disabled={key === "bpjs" && !bpjsAvailable}
              title={key === "bpjs" && !bpjsAvailable ? "Muat Data Sampel BPJS di Manajemen Dataset terlebih dahulu" : undefined}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-40 ${
                (key === "bpjs") === useBpjs ? "bg-white text-bpjs-dark shadow-2xs border border-jkn-border" : "text-jkn-muted hover:text-jkn-text"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {!bpjsAvailable && (
          <Link href="/data-management" className="font-semibold text-bpjs-dark hover:underline">
            Muat Data Sampel BPJS untuk mengukur detektor pada data berbentuk BPJS
          </Link>
        )}
      </div>

      {/* Methodological Disclaimer Banner */}
      <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-900">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
        <span className="leading-relaxed">
          <strong className="font-semibold">Catatan Metodologi Evaluasi:</strong>{" "}
          {useBpjs
            ? "Metrik dihitung pada Data Sampel BPJS sintetis (bentuk data FKRTL, kalibrasi statistik BPJS 2018) dengan anomali yang disisipkan dan berlabel. Data ini tidak punya resume medis, sehingga detektor kloning dan klaim fiktif memang tidak berlaku. Ini bukan akurasi pada klaim riil."
            : p.disclaimer}
        </span>
      </div>

      {/* Unified Summary Telemetry Strip */}
      <div className="bg-surface rounded-xl border border-jkn-border shadow-subtle grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-jkn-divider tabular-nums">
        {[
          [
            "Skor F1 Makro (Lintas Detektor)",
            pct(r.macro.f1),
            "Rerata F1 detektor yang punya kasus berlabel",
          ],
          [
            "Precision Mikro",
            pct(r.micro.precision),
            "Proporsi temuan valid terhadap total sinyal",
          ],
          [
            "Recall Mikro",
            pct(r.micro.recall),
            "Cakupan anomali aktual yang tertangkap",
          ],
          [
            "Rasio Positif Palsu (Klaim Normal)",
            pct(r.claim_level.false_positive_rate),
            "Klaim normal yang ikut ditandai",
          ],
        ].map(([k, v, sub]) => (
          <div key={k} className="p-4 sm:p-5 flex flex-col justify-between">
            <span className="text-xs font-bold text-jkn-muted">
              {k}
            </span>
            <div className="mt-2">
              <div className="text-2xl font-mono font-bold text-jkn-text tracking-tight">
                {v}
              </div>
              <div className="text-[11px] text-jkn-muted mt-1">{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Per-Detector Confusion Matrix & Precision/Recall Table */}
      <div className="bg-surface rounded-xl border border-jkn-border shadow-subtle overflow-hidden tabular-nums">
        <div className="px-5 py-3.5 border-b border-jkn-divider flex items-center justify-between">
          <h2 className="text-sm font-bold text-jkn-text">
            Matriks Evaluasi Per Detektor (Confusion Matrix &amp; Skor F1)
          </h2>
          <span className="text-[11px] font-mono text-jkn-muted">
            Satu sinyal detektor = satu penandaan
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-secondary border-b border-jkn-border text-jkn-muted font-bold text-[11px]">
                <th className="py-2.5 px-4">Detektor</th>
                <th className="py-2.5 px-3 text-right">Positif Aktual</th>
                <th className="py-2.5 px-3 text-right">TP</th>
                <th className="py-2.5 px-3 text-right">FP</th>
                <th className="py-2.5 px-3 text-right">FN</th>
                <th className="py-2.5 px-4 w-44">Precision</th>
                <th className="py-2.5 px-4 w-44">Recall</th>
                <th className="py-2.5 px-4 text-right">Skor F1</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-jkn-divider">
              {r.per_detector.map((m) => (
                <tr key={m.risk_type} className="hover:bg-surface-subtle transition-colors">
                  <td className="py-2.5 px-4">
                    <RiskPill type={m.risk_type} size="sm" />
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-jkn-text">
                    {m.positives}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-bpjs-dark">
                    {m.tp}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-risk-critical">
                    {m.fp}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-amber-700">
                    {m.fn}
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className="w-12 font-mono font-semibold text-jkn-text">
                        {pct(m.precision)}
                      </span>
                      <Bar value={m.precision} tone="bg-bpjs" />
                    </div>
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className="w-12 font-mono font-semibold text-jkn-text">
                        {pct(m.recall)}
                      </span>
                      <Bar value={m.recall} tone="bg-intel" />
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-jkn-text">
                    {m.f1.toFixed(3)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detector Thresholds & Pipeline Telemetry Panel (Consolidated from Settings) */}
      {sys && (
        <div className="bg-surface rounded-xl border border-jkn-border shadow-subtle overflow-hidden tabular-nums">
          <div className="px-5 py-3.5 border-b border-jkn-divider flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-bpjs" />
              <h2 className="text-sm font-bold text-jkn-text">
                Parameter Ambang Batas Detektor (Kalibrasi Aktif)
              </h2>
            </div>
            {sys.last_analysis && (
              <span className="text-[11px] font-mono text-jkn-muted">
                Eksekusi terakhir: {sys.last_analysis.claims_analyzed.toLocaleString("id-ID")} klaim ·{" "}
                {sys.last_analysis.findings_total.toLocaleString("id-ID")} sinyal ·{" "}
                {sys.last_analysis.duration_ms} ms
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-jkn-divider">
            {Object.entries(sys.thresholds).map(([key, val]) => {
              const meta = THRESHOLD_LABEL[key] || {
                label: key,
                desc: "Parameter konfigurasi detektor aktif.",
              };
              return (
                <div key={key} className="p-4 flex flex-col justify-between border-b border-jkn-divider">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-jkn-text leading-snug">
                        {meta.label}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-bpjs-soft text-bpjs-dark border border-bpjs-border font-mono text-xs font-bold shrink-0">
                        {val}
                      </span>
                    </div>
                    <p className="text-[11px] text-jkn-muted leading-relaxed mt-1.5">
                      {meta.desc}
                    </p>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-jkn-divider/60 flex items-center justify-between text-[10px] font-mono text-jkn-dim">
                    <span>Kunci parameter</span>
                    <span>{key}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-5 py-2.5 bg-surface-secondary/50 border-t border-jkn-divider text-[11px] text-jkn-muted flex flex-wrap items-center justify-between gap-2">
            <span>
              Parameter dikunci secara deterministik agar hasil audit dapat direproduksi; ubah nilai melalui variabel lingkungan (<code className="font-mono text-jkn-text">CLONE_SIM_THRESHOLD</code>, <code className="font-mono text-jkn-text">CLONE_LEXICAL_THRESHOLD</code>) lalu klik <strong>Jalankan Ulang Pipeline Detektor</strong>.
            </span>
          </div>
        </div>
      )}

      {/* Unified 3-Column Benchmark & Audit Verification Ledger */}
      <div className="bg-surface rounded-xl border border-jkn-border shadow-subtle grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-jkn-divider tabular-nums">
        {/* Column 1: Detection vs Baseline */}
        <div className="p-5 space-y-3">
          <h3 className="text-sm font-bold text-jkn-text">
            1. Komparasi terhadap Ambang Tunggal
          </h3>
          <p className="text-[11px] text-jkn-muted leading-relaxed">
            Perbandingan F1 tingkat klaim antara kombinasi {r.per_detector.length} detektor ARSA dengan penyaringan ambang tunggal ({r.baseline.name}).
          </p>
          <div className="divide-y divide-jkn-divider border-t border-b border-jkn-divider text-xs">
            <div className="py-2 flex justify-between">
              <span className="text-jkn-muted">Skor F1 Tingkat Klaim — ARSA</span>
              <strong className="font-mono text-jkn-text">{r.uplift.claim_f1_arsa.toFixed(3)}</strong>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-jkn-muted">Skor F1 Tingkat Klaim — Baseline</span>
              <strong className="font-mono text-jkn-text">{r.uplift.claim_f1_baseline.toFixed(3)}</strong>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-jkn-muted">Peningkatan Relatif</span>
              <strong className="font-mono text-bpjs-dark">
                {r.uplift.relative_pct >= 0 ? "+" : ""}
                {r.uplift.relative_pct}%
              </strong>
            </div>
          </div>
          <div className="text-[11px] text-jkn-dim">
            Baseline: precision {pct(r.baseline.precision)}, recall {pct(r.baseline.recall)} ({r.baseline.flagged} klaim ditandai).
          </div>
        </div>

        {/* Column 2: Evidence Completeness */}
        <div className="p-5 space-y-3">
          <h3 className="text-sm font-bold text-jkn-text">
            2. Kelengkapan Sitasi Bukti
          </h3>
          <p className="text-[11px] text-jkn-muted leading-relaxed">
            Proporsi temuan detektor yang berhasil menautkan minimal satu ID bukti valid (dokumen klinis, rincian tagihan, atau klaim pembanding).
          </p>
          <div className="space-y-3 pt-1 text-xs">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-jkn-muted">Temuan dengan sitasi bukti valid</span>
                <strong className="font-mono text-jkn-text">{r.evidence_completeness.pct}%</strong>
              </div>
              <Bar value={r.evidence_completeness.pct / 100} tone="bg-bpjs" />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-jkn-muted">Temuan bersitasi dokumen rekam medis</span>
                <strong className="font-mono text-jkn-text">
                  {r.evidence_completeness.document_pct}%
                </strong>
              </div>
              <Bar value={r.evidence_completeness.document_pct / 100} tone="bg-intel" />
            </div>
            <div className="text-[11px] text-jkn-dim pt-1">
              Terverifikasi pada {r.evidence_completeness.with_valid_citation} dari{" "}
              {r.evidence_completeness.findings} total temuan.
            </div>
          </div>
        </div>

        {/* Column 3: Investigation Turnaround Instrumentation */}
        <div className="p-5 space-y-3">
          <h3 className="text-sm font-bold text-jkn-text">
            3. Instrumentasi Waktu Penyelesaian
          </h3>
          <p className="text-[11px] text-jkn-muted leading-relaxed">
            Durasi aktual dari pembukaan berkas hingga penetapan keputusan akhir yang tercatat pada rantai audit (append-only log).
          </p>
          <div className="divide-y divide-jkn-divider border-t border-b border-jkn-divider text-xs">
            <div className="py-2 flex justify-between">
              <span className="text-jkn-muted">Kasus Selesai Terukur</span>
              <strong className="font-mono text-jkn-text">{p.handling_time.cases_measured} berkas</strong>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-jkn-muted">Median Waktu Penanganan</span>
              <strong className="font-mono text-jkn-text">
                {p.handling_time.median_hours === null
                  ? "Belum ada sampel selesai"
                  : `${p.handling_time.median_hours} jam`}
              </strong>
            </div>
          </div>
          <div className="flex items-start gap-1.5 text-[11px] text-jkn-dim">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              Model embedding aktif: <code className="font-mono">{p.embedding_model || "-"}</code>
            </span>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
