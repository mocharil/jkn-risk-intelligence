"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { Dataset, FieldMapping } from "@/types/dataset";
import { CANONICAL_FIELDS, REQUIRED_FIELDS } from "@/lib/ingest/canonical";
import { useSession } from "@/lib/auth/client";
import { formatNumber } from "@/lib/formatting/currency";
import { formatDate } from "@/lib/formatting/date";
import {
  Upload,
  CheckCircle2,
  ShieldCheck,
  Plus,
  X,
  FileSpreadsheet,
  RefreshCw,
  AlertTriangle,
  Lock,
  Download,
  ArrowRight,
} from "lucide-react";

const PII_LABEL: Record<string, string> = {
  PSEUDONYMIZED: "Dipseudonimkan (HMAC)",
  INITIALS_ONLY: "Hanya inisial",
  DROPPED: "Dihapus",
  SCRUBBED: "Identifier dikaburkan",
};

const SAMPLES = [
  {
    file: "eklaim_kemenkes_v5.csv",
    title: "E-Klaim Kemenkes v5.x (Data Center)",
    desc: "95 baris · standar TXT/CSV Kemenkes (DIAGLIST & PROCLIST '#', kode INACBG J-1-20-III, SEX 1/2)",
  },
  {
    file: "simrs_khanza_bridging.csv",
    title: "SIMRS Khanza (bridging_sep SQL)",
    desc: "80 baris · skema tabel bridging_sep + reg_periksa · delimiter ';' · RS Jawa Timur & Jawa Tengah",
  },
  {
    file: "simrs_rs_a.csv",
    title: "SIMRS RS Kasih Bunda",
    desc: "151 baris · header Indonesia · delimiter ';' · berisi PII palsu & klon tertanam",
  },
  {
    file: "simrs_rs_b.csv",
    title: "SIMRS RS Tiga Benua",
    desc: "120 baris · header berbeda (English) · dd/mm/yyyy · 4 baris sengaja rusak",
  },
];

export default function DataManagementPage() {
  const { can } = useSession();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selected, setSelected] = useState<Dataset | null>(null);
  const [mapping, setMapping] = useState<FieldMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [normalizing, setNormalizing] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "warn" | "err"; text: string } | null>(
    null
  );

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canUpload = can("dataset.upload");
  const canConfirm = can("dataset.confirm_mapping");

  const load = async (selectId?: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/datasets");
      const json = await res.json();
      const list: Dataset[] = json.data || [];
      setDatasets(list);
      const pick = list.find((d) => d.dataset_id === selectId) || list[0] || null;
      setSelected(pick);
      setMapping(pick?.mappings || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const select = (d: Dataset) => {
    setSelected(d);
    setMapping(d.mappings || []);
    setMessage(null);
  };

  const mappedRequired = useMemo(() => {
    const mapped = new Set(mapping.filter((m) => m.canonical_field).map((m) => m.canonical_field));
    const missing = REQUIRED_FIELDS.filter((f) => !mapped.has(f));
    const hasDates = mapped.has("admission_date") || mapped.has("discharge_date");
    return { missing: hasDates ? missing : [...missing, "admission_date / discharge_date"] };
  }, [mapping]);

  const changeMapping = (source: string, canonical: string) => {
    setMapping((prev) =>
      prev.map((m) => {
        if (m.source_field === source)
          return {
            ...m,
            canonical_field: canonical,
            confidence: canonical ? 1 : 0,
            suggested_by: "manual",
            is_ai_suggested: false,
            status: canonical ? "CONFIRMED" : "UNMAPPED",
            reason: "Dipilih manual",
          };
        if (canonical && m.canonical_field === canonical)
          return { ...m, canonical_field: "", confidence: 0, status: "UNMAPPED" };
        return m;
      })
    );
  };

  const confirm = async () => {
    if (!selected) return;
    setNormalizing(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/datasets/${selected.dataset_id}/mapping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappings: mapping }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Normalisasi gagal");
      const d: Dataset = json.data;
      if (d.status === "ERROR")
        setMessage({ kind: "err", text: d.error_message || "Tidak ada baris valid" });
      else
        setMessage({
          kind: "ok",
          text: `${d.result?.claims_ingested} klaim berhasil dinormalisasi dan dianalisis.`,
        });
      await load(selected.dataset_id);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("arsa:store-updated"));
      }
    } catch (e) {
      setMessage({ kind: "err", text: e instanceof Error ? e.message : "Normalisasi gagal" });
    } finally {
      setNormalizing(false);
    }
  };

  const upload = async (f: File) => {
    setIsUploading(true);
    setUploadError("");
    try {
      const form = new FormData();
      form.append("file", f);
      const res = await fetch("/api/datasets", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload gagal");
      setIsUploadOpen(false);
      setFile(null);
      await load(json.data.dataset_id);
      setMessage({
        kind: json.mapping_engine === "llm+heuristic" ? "ok" : "warn",
        text: `${json.data.row_count} baris dibaca & dianonimkan. ${
          json.note || "Usulan mapping disusun oleh LLM + heuristik."
        } Periksa mapping lalu konfirmasi.${
          json.truncated ? " (File dipotong pada 50.000 baris.)" : ""
        }`,
      });
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload gagal");
    } finally {
      setIsUploading(false);
    }
  };

  const useSample = async (name: string) => {
    const blob = await (await fetch(`/samples/${name}`)).blob();
    setFile(new File([blob], name, { type: "text/csv" }));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
  };

  const colInfo = (name: string) => selected?.columns.find((c) => c.name === name);
  const isSeed = selected?.dataset_id === "DS-SEED";
  const q = selected?.quality_summary;

  return (
    <DashboardShell>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-jkn-border pb-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold text-jkn-text tracking-tight">
              Manajemen Data & Pemetaan Skema SIMRS
            </h1>
            <span className="px-2 py-0.5 rounded bg-bpjs-soft text-bpjs-dark text-[11px] font-semibold border border-bpjs-border">
              Kepatuhan UU PDP No. 27/2022
            </span>
          </div>
          <p className="text-xs text-jkn-muted mt-1">
            Unggah ekspor SIMRS atau E-Klaim (CSV · XLSX · JSON). Pengenal pribadi dianonimkan di memori sebelum disimpan atau diproses model AI.
          </p>
        </div>
        {canUpload ? (
          <button
            onClick={() => setIsUploadOpen(true)}
            className="h-9 flex items-center gap-2 px-4 rounded-lg bg-bpjs text-white font-semibold text-xs hover:bg-bpjs-deep transition-colors shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Unggah Dataset</span>
          </button>
        ) : (
          <span className="flex items-center gap-1.5 text-[11px] text-jkn-muted px-3 py-1.5 rounded-lg bg-surface-secondary border border-jkn-border">
            <Lock className="w-3.5 h-3.5" /> Unggah khusus Supervisor/Admin
          </span>
        )}
      </div>

      {message && (
        <div
          role="status"
          className={`flex items-start gap-2 text-xs rounded-xl px-4 py-3 border ${
            message.kind === "ok"
              ? "bg-bpjs-soft border-bpjs-border text-bpjs-dark"
              : message.kind === "warn"
              ? "bg-amber-50 border-amber-200 text-amber-900"
              : "bg-risk-critical-bg border-risk-critical-border text-risk-critical"
          }`}
        >
          {message.kind === "ok" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {loading && datasets.length === 0 ? (
        <PageLoader label="Memuat daftar dataset..." />
      ) : (
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 tabular-nums">
          {datasets.map((d) => (
            <button
              key={d.dataset_id}
              onClick={() => select(d)}
              className={`p-3 rounded-xl border text-left transition-colors shrink-0 min-w-[240px] ${
                selected?.dataset_id === d.dataset_id
                  ? "bg-bpjs-soft border-bpjs text-jkn-text"
                  : "bg-surface border-jkn-border hover:bg-surface-secondary"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono text-jkn-dim">{d.dataset_id}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${
                    d.status === "READY"
                      ? "bg-bpjs-soft text-bpjs-dark border-bpjs-border"
                      : d.status === "ERROR"
                      ? "bg-risk-critical-bg text-risk-critical border-risk-critical-border"
                      : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}
                >
                  {d.status === "READY"
                    ? "Ternormalisasi"
                    : d.status === "ERROR"
                    ? "Error"
                    : "Menunggu Mapping"}
                </span>
              </div>
              <div className="font-bold text-xs text-jkn-text truncate mt-1">{d.name}</div>
              <div className="text-[10px] text-jkn-muted mt-0.5">
                {formatNumber(d.row_count)} baris · {formatDate(d.created_at)}
              </div>
            </button>
          ))}
          {canUpload && (
            <button
              onClick={() => setIsUploadOpen(true)}
              className="p-3 rounded-xl border border-dashed border-jkn-border hover:border-bpjs text-jkn-muted hover:text-bpjs bg-surface/50 transition-colors shrink-0 min-w-[140px] flex flex-col items-center justify-center gap-1 text-center"
            >
              <Plus className="w-4 h-4" />
              <span className="text-[11px] font-semibold">Unggahan Baru</span>
            </button>
          )}
        </div>
      )}

      {selected && (
        <div className="space-y-5 tabular-nums">
          {/* Unified 4-Stage Pipeline Strip */}
          <div className="bg-surface rounded-xl border border-jkn-border shadow-subtle overflow-hidden">
            <div className="px-5 py-2.5 bg-surface-secondary border-b border-jkn-border flex items-center justify-between">
              <span className="text-[10px] font-bold text-jkn-muted uppercase tracking-wider">
                Tahapan Pipeline Ingesti & Privasi Data (UU PDP No. 27/2022)
              </span>
              <span className="text-[11px] font-mono text-jkn-muted">
                {selected.dataset_id} · {selected.name}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-jkn-divider">
              {[
                {
                  step: "01",
                  title: "Ekstraksi & Deteksi Skema",
                  desc: `${formatNumber(selected.row_count)} baris · ${selected.columns.length} kolom terdeteksi`,
                  done: true,
                },
                {
                  step: "02",
                  title: "Anonimisasi UU PDP (Di Memori)",
                  desc: selected.anonymization
                    ? `${selected.anonymization.columns_pseudonymized.length} HMAC · ${selected.anonymization.columns_initials.length} inisial · ${selected.anonymization.columns_scrubbed.length} teks`
                    : "PII dipseudonimkan sebelum simpan",
                  done: Boolean(selected.anonymization),
                },
                {
                  step: "03",
                  title: "Pemetaan Skema Kanonik JKN",
                  desc: `${mapping.filter((m) => m.canonical_field).length}/${mapping.length} kolom terpetakan`,
                  done: selected.status === "READY" || mappedRequired.missing.length === 0,
                },
                {
                  step: "04",
                  title: "Analisis 8 Detektor & Vektor",
                  desc: selected.result
                    ? `${selected.result.flagged_claims} klaim ditandai · ${selected.result.findings_total} temuan`
                    : "Menunggu konfirmasi normalisasi",
                  done: selected.status === "READY",
                },
              ].map((s) => (
                <div key={s.step} className="p-4 flex items-start gap-3">
                  <span
                    className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                      s.done
                        ? "bg-bpjs-soft text-bpjs-dark border-bpjs-border"
                        : "bg-surface-secondary text-jkn-muted border-jkn-border"
                    }`}
                  >
                    {s.step}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-jkn-text truncate">{s.title}</div>
                    <div className="text-[11px] text-jkn-muted mt-0.5 truncate">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-8 space-y-5">
              {/* Anonimisasi Ledger */}
              {selected.anonymization && (
                <div className="bg-surface rounded-xl border border-jkn-border shadow-subtle overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-jkn-divider flex items-center justify-between">
                    <div>
                      <h2 className="text-xs font-bold text-jkn-text uppercase tracking-wider">
                        Perlindungan Data Pribadi Saat Input (UU PDP No. 27/2022)
                      </h2>
                      <p className="text-[11px] text-jkn-muted mt-0.5">
                        Diterapkan sebelum data disimpan atau dikirim ke LLM. Data mentah tidak pernah ditulis ke disk.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-jkn-divider text-xs">
                    {[
                      ["Dipseudonimkan (HMAC)", selected.anonymization.columns_pseudonymized],
                      ["Hanya Inisial", selected.anonymization.columns_initials],
                      ["Dihapus", selected.anonymization.columns_dropped],
                      ["Teks Dikaburkan", selected.anonymization.columns_scrubbed],
                    ].map(([label, cols]) => (
                      <div key={label as string} className="p-3.5">
                        <div className="text-[11px] font-bold text-jkn-muted">{label as string}</div>
                        <div className="font-mono text-xs text-jkn-text mt-1 break-words">
                          {(cols as string[]).length ? (cols as string[]).join(", ") : "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Schema Mapping Table */}
              <div className="bg-surface rounded-xl border border-jkn-border shadow-subtle overflow-hidden">
                <div className="px-5 py-3.5 border-b border-jkn-divider flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-jkn-text">
                      Tabel Pemetaan Skema (Human-in-the-Loop)
                    </h2>
                    <p className="text-[11px] text-jkn-muted mt-0.5">
                      Usulan dari LLM + heuristik; verifikator dapat mengubah setiap kolom sebelum konfirmasi.
                    </p>
                  </div>
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-bpjs-soft text-bpjs-dark border border-bpjs-border">
                    {mapping.filter((m) => m.canonical_field).length}/{mapping.length} terpetakan
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-surface-secondary border-b border-jkn-border text-[10px] font-bold text-jkn-muted uppercase tracking-wider">
                        <th className="py-2.5 px-4 w-5/12">Kolom Sumber & Sampel</th>
                        <th className="py-2.5 px-3 text-center w-2/12">Keyakinan</th>
                        <th className="py-2.5 px-4 w-5/12">Field Kanonik JKN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-jkn-divider">
                      {mapping.map((m) => {
                        const col = colInfo(m.source_field);
                        const editable = !isSeed && selected.status !== "READY" && canConfirm;
                        return (
                          <tr key={m.source_field} className="hover:bg-surface-subtle">
                            <td className="py-2.5 px-4 align-top">
                              <div className="font-mono font-bold text-jkn-text">{m.source_field}</div>
                              <div className="text-[11px] text-jkn-muted truncate max-w-xs mt-0.5">
                                {col?.sample_values.slice(0, 2).join(" · ")}
                              </div>
                              {col?.pii_treatment && (
                                <span className="inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-intel-light text-intel-deep border border-intel-border">
                                  {PII_LABEL[col.pii_treatment]}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 align-top text-center">
                              <span className="font-mono font-semibold text-bpjs-dark block">
                                {(m.confidence * 100).toFixed(0)}%
                              </span>
                              <span className="text-[10px] text-jkn-dim">
                                {m.suggested_by === "llm"
                                  ? "LLM"
                                  : m.suggested_by === "manual"
                                  ? "Manual"
                                  : "Heuristik"}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 align-top">
                              <select
                                aria-label={`Field kanonik untuk kolom ${m.source_field}`}
                                disabled={!editable}
                                value={m.canonical_field}
                                onChange={(e) => changeMapping(m.source_field, e.target.value)}
                                className="w-full h-8 font-mono text-[11px] px-2 rounded-lg border border-jkn-border bg-white disabled:opacity-75 focus:outline-none focus:ring-2 focus:ring-bpjs/20 focus:border-bpjs"
                              >
                                <option value="">(abaikan kolom ini)</option>
                                {CANONICAL_FIELDS.map((f) => (
                                  <option key={f.id} value={f.id}>
                                    {f.id}
                                    {f.required ? " *" : ""} — {f.label}
                                  </option>
                                ))}
                              </select>
                              {m.reason && (
                                <div className="text-[10px] text-jkn-dim mt-1 truncate">
                                  {m.reason}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="px-5 py-3.5 border-t border-jkn-divider bg-surface-subtle/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="text-xs">
                    {isSeed ? (
                      <span className="text-jkn-muted">
                        Dataset sintetis bawaan — telah dinormalisasi.
                      </span>
                    ) : selected.status === "READY" ? (
                      <span className="text-bpjs-dark font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> Dataset telah dinormalisasi & dianalisis.
                      </span>
                    ) : mappedRequired.missing.length > 0 ? (
                      <span className="text-amber-800 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" /> Field wajib belum dipetakan:{" "}
                        {mappedRequired.missing.join(", ")}
                      </span>
                    ) : (
                      <span className="text-jkn-muted">Semua field wajib telah terpetakan.</span>
                    )}
                  </div>
                  {!isSeed && selected.status !== "READY" && (
                    <button
                      onClick={confirm}
                      disabled={normalizing || !canConfirm || mappedRequired.missing.length > 0}
                      className="h-9 flex items-center gap-2 px-4 rounded-lg bg-bpjs text-white text-xs font-semibold hover:bg-bpjs-deep disabled:opacity-50 transition-colors"
                    >
                      {normalizing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Menormalisasi & menganalisis…</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Konfirmasi & Normalisasi</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Sidebar: Analysis Summary & Data Quality */}
            <div className="lg:col-span-4 space-y-5">
              {selected.result && (
                <div className="bg-surface rounded-xl border border-bpjs-border p-5 shadow-subtle space-y-3 text-xs">
                  <h3 className="font-bold text-bpjs-dark uppercase tracking-wider text-[11px]">
                    Hasil Ingesti & Analisis Detektor
                  </h3>
                  <div className="divide-y divide-jkn-divider border-t border-b border-jkn-divider">
                    <div className="py-2 flex justify-between">
                      <span className="text-jkn-muted">Klaim Masuk</span>
                      <strong className="font-mono text-jkn-text">
                        {formatNumber(selected.result.claims_ingested)}
                      </strong>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-jkn-muted">Klaim Ditandai Risiko</span>
                      <strong className="font-mono text-risk-critical">
                        {formatNumber(selected.result.flagged_claims)}
                      </strong>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-jkn-muted">Total Temuan Detektor</span>
                      <strong className="font-mono text-jkn-text">
                        {formatNumber(selected.result.findings_total)}
                      </strong>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-jkn-muted">Berkas Baru di Antrean</span>
                      <strong className="font-mono text-jkn-text">
                        {formatNumber(selected.result.investigations_created)}
                      </strong>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-jkn-muted">Model Embedding</span>
                      <strong className="font-mono text-[11px] text-jkn-text">
                        {selected.result.embedding_model}
                      </strong>
                    </div>
                  </div>
                  <Link
                    href="/investigation-queue"
                    className="inline-flex items-center gap-1.5 text-bpjs font-semibold hover:underline"
                  >
                    <span>Buka Antrean Investigasi</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}

              <div className="bg-surface rounded-xl border border-jkn-border p-5 shadow-subtle space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-jkn-divider">
                  <h3 className="text-xs font-bold text-jkn-text uppercase tracking-wider">
                    Metrik Kualitas Data
                  </h3>
                  {q && (
                    <span className="text-xs font-mono font-bold text-bpjs-dark">
                      {q.validity_score}% valid
                    </span>
                  )}
                </div>
                {q ? (
                  <div className="space-y-3 text-xs">
                    {[
                      ["Kelengkapan Field Wajib", q.completeness_score],
                      ["Validitas Skema Baris", q.validity_score],
                    ].map(([label, v]) => (
                      <div key={label as string}>
                        <div className="flex justify-between text-jkn-muted mb-1 text-[11px]">
                          <span>{label as string}</span>
                          <span className="font-mono font-bold text-jkn-text">{v as number}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-surface-secondary overflow-hidden">
                          <div
                            className="h-full bg-bpjs rounded-full"
                            style={{ width: `${v}%` }}
                          />
                        </div>
                      </div>
                    ))}

                    <div className="pt-2 border-t border-jkn-divider text-[11px] text-jkn-muted divide-y divide-jkn-divider">
                      <div className="py-1.5 flex justify-between">
                        <span>Total Baris Dibaca</span>
                        <strong className="font-mono text-jkn-text">
                          {formatNumber(q.total_rows)}
                        </strong>
                      </div>
                      <div className="py-1.5 flex justify-between">
                        <span>Baris Valid</span>
                        <strong className="font-mono text-bpjs-dark">
                          {formatNumber(q.valid_rows)}
                        </strong>
                      </div>
                      <div className="py-1.5 flex justify-between">
                        <span>Baris Ditolak</span>
                        <strong className="font-mono text-risk-critical">
                          {formatNumber(q.invalid_rows)}
                        </strong>
                      </div>
                      <div className="py-1.5 flex justify-between">
                        <span>Baris Duplikat</span>
                        <strong className="font-mono text-jkn-text">
                          {formatNumber(q.duplicate_rows)}
                        </strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-jkn-muted">
                    Kualitas dihitung saat pemetaan skema dikonfirmasi.
                  </p>
                )}
                {selected.rejected_rows && selected.rejected_rows.length > 0 && (
                  <div className="pt-2 border-t border-jkn-divider">
                    <div className="text-[11px] font-bold text-jkn-text mb-1.5">
                      Log Baris Ditolak (maks. 100)
                    </div>
                    <ul className="space-y-1 max-h-40 overflow-y-auto text-[11px]">
                      {selected.rejected_rows.map((r, i) => (
                        <li key={i} className="text-jkn-muted">
                          <span className="font-mono font-semibold text-risk-critical">
                            Baris {r.row}
                          </span>{" "}
                          — {r.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Upload */}
      {isUploadOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label="Unggah dataset"
          onKeyDown={(e) =>
            e.key === "Escape" && (setIsUploadOpen(false), setFile(null), setUploadError(""))
          }
        >
          <div className="bg-surface w-full max-w-lg rounded-xl border border-jkn-border shadow-modal p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-jkn-divider">
              <div>
                <h3 className="text-sm font-bold text-jkn-text">Unggah Dataset Klaim / SIMRS</h3>
                <p className="text-xs text-jkn-muted mt-0.5">
                  Format didukung: CSV · XLSX · JSON (maks. 20 MB / 50.000 baris)
                </p>
              </div>
              <button
                onClick={() => {
                  setIsUploadOpen(false);
                  setFile(null);
                  setUploadError("");
                }}
                aria-label="Tutup"
                className="p-1.5 rounded-lg hover:bg-surface-secondary text-jkn-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              onDragEnter={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 rounded-xl border-2 border-dashed text-center cursor-pointer transition-colors ${
                dragActive
                  ? "border-bpjs bg-bpjs-soft/60"
                  : file
                  ? "border-bpjs bg-bpjs-soft/40"
                  : "border-jkn-border hover:border-bpjs bg-surface-secondary/40"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt,.xlsx,.xls,.json"
                onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
                className="hidden"
              />
              {file ? (
                <div>
                  <CheckCircle2 className="w-5 h-5 text-bpjs mx-auto mb-1.5" />
                  <div className="font-bold text-xs text-jkn-text">{file.name}</div>
                  <div className="text-[11px] font-mono text-bpjs-dark mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB siap diproses
                  </div>
                </div>
              ) : (
                <div>
                  <Upload className="w-5 h-5 text-bpjs mx-auto mb-1.5" />
                  <div className="font-semibold text-xs text-jkn-text">
                    Seret & lepas berkas di sini, atau klik untuk memilih
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-bold text-jkn-muted uppercase tracking-wider">
                Atau Gunakan Sampel Uji Ekspor SIMRS & E-Klaim:
              </div>
              <div className="divide-y divide-jkn-divider border border-jkn-border rounded-lg overflow-hidden">
                {SAMPLES.map((s) => (
                  <div
                    key={s.file}
                    className={`p-2.5 text-xs flex items-center justify-between gap-2 ${
                      file?.name === s.file ? "bg-bpjs-soft" : "bg-surface hover:bg-surface-subtle"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => useSample(s.file)}
                      className="text-left flex-1 min-w-0"
                    >
                      <div className="font-semibold text-xs text-jkn-text flex items-center gap-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-bpjs shrink-0" />
                        <span>{s.title}</span>
                      </div>
                      <div className="text-[11px] text-jkn-muted mt-0.5">{s.desc}</div>
                    </button>
                    <a
                      href={`/samples/${s.file}`}
                      download
                      className="p-1.5 rounded-lg hover:bg-surface-secondary text-jkn-muted"
                      title="Unduh sampel"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {uploadError && (
              <div
                role="alert"
                className="text-xs text-risk-critical bg-risk-critical-bg border border-risk-critical-border rounded-lg px-3 py-2"
              >
                {uploadError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-jkn-divider">
              <button
                type="button"
                onClick={() => {
                  setIsUploadOpen(false);
                  setFile(null);
                  setUploadError("");
                }}
                className="h-9 px-4 rounded-lg text-xs font-semibold text-jkn-muted hover:bg-surface-secondary"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!file || isUploading}
                onClick={() => file && upload(file)}
                className="h-9 flex items-center gap-2 px-4 rounded-lg bg-bpjs text-white font-semibold text-xs hover:bg-bpjs-deep disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menganonimkan & memetakan…</span>
                  </>
                ) : (
                  <span>Unggah & Susun Pemetaan</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
