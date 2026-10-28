"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { ProvenanceCatalog } from "@/components/ui/ProvenanceCatalog";
import { Dataset, FieldMapping } from "@/types/dataset";
import { CANONICAL_FIELDS, REQUIRED_FIELDS, missingRequiredFields } from "@/lib/ingest/canonical";
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
  Database,
  Sparkles,
  Play,
  SlidersHorizontal,
  Check,
  FileCheck2,
  EyeOff,
  Activity,
  HelpCircle,
  Layers,
} from "lucide-react";

const PII_LABEL: Record<string, { label: string; badgeClass: string }> = {
  PSEUDONYMIZED: {
    label: "Token HMAC-SHA256",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  INITIALS_ONLY: {
    label: "Inisial Saja",
    badgeClass: "bg-sky-50 text-sky-800 border-sky-200",
  },
  DROPPED: {
    label: "Kolom Dihapus",
    badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
  },
  SCRUBBED: {
    label: "Teks Disensor",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
  },
};

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  string: { label: "TEKS", cls: "bg-slate-100 text-slate-700 border-slate-200" },
  number: { label: "ANGKA", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  date: { label: "TANGGAL", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  boolean: { label: "BOOL", cls: "bg-purple-50 text-purple-700 border-purple-200" },
};

const SAMPLES = [
  {
    file: "bpjs_sampel_fkrtl.csv",
    shortTitle: "Data Sampel BPJS (FKRTL)",
    title: "Skema Data Sampel BPJS Kesehatan (file FKRTL)",
    rows: "1.500 baris",
    tag: "Skema BPJS resmi",
    desc: "Kode variabel resmi FKL02, FKL18, FKL47, PSTV01 · tanpa resume medis (deteksi angka & riwayat) · sintetis, dikalibrasi statistik BPJS 2018",
  },
];

export default function DataManagementPage() {
  const { can } = useSession();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selected, setSelected] = useState<Dataset | null>(null);
  const [mapping, setMapping] = useState<FieldMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [normalizing, setNormalizing] = useState(false);
  const [quickLoadingSample, setQuickLoadingSample] = useState<string | null>(null);
  const [isEditingMapping, setIsEditingMapping] = useState(false);
  const [filterMode, setFilterMode] = useState<"ALL" | "REQUIRED" | "PII" | "UNMAPPED">("REQUIRED");
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

  const loadSeq = useRef(0);
  const load = async (selectId?: string) => {
    const seq = ++loadSeq.current;
    setLoading(true);
    try {
      const res = await fetch("/api/datasets");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Gagal memuat daftar dataset");
      if (seq !== loadSeq.current) return; // respons usang: abaikan
      const list: Dataset[] = Array.isArray(json.data) ? json.data : [];
      setDatasets(list);
      const pick = list.find((d) => d.dataset_id === selectId) || list[0] || null;
      setSelected(pick);
      setMapping(pick?.mappings || []);
      setIsEditingMapping(pick ? pick.status !== "READY" : false);
    } catch (e) {
      setMessage({ kind: "err", text: e instanceof Error ? e.message : "Gagal memuat daftar dataset" });
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
    setIsEditingMapping(d.status !== "READY");
    setFilterMode("ALL");
    setMessage(null);
  };

  const canonicalLookup = useMemo(() => {
    const map = new Map<string, (typeof CANONICAL_FIELDS)[number]>();
    CANONICAL_FIELDS.forEach((f) => map.set(f.id, f));
    return map;
  }, []);

  const mappedRequired = useMemo(() => {
    const mapped = new Set(mapping.filter((m) => m.canonical_field).map((m) => m.canonical_field));
    const missing = missingRequiredFields(mapped as Set<string>);
    return {
      missing,
      mappedCount: REQUIRED_FIELDS.length - REQUIRED_FIELDS.filter((f) => missing.includes(f)).length,
      totalRequired: REQUIRED_FIELDS.length,
    };
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
            reason: canonical ? "Dipetakan manual oleh pengguna" : "Kolom diabaikan",
          };
        if (canonical && m.canonical_field === canonical)
          return {
            ...m,
            canonical_field: "",
            confidence: 0,
            status: "UNMAPPED",
            reason: "Digantikan oleh kolom lain",
          };
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
      const json = await res.json().catch(() => ({} as Record<string, any>)); // eslint-disable-line @typescript-eslint/no-explicit-any
      if (!res.ok) throw new Error(json.error || "Normalisasi gagal");
      const d: Dataset = json.data;
      if (d.status === "ERROR") {
        setMessage({ kind: "err", text: d.error_message || "Tidak ada baris valid" });
      } else {
        setMessage({
          kind: "ok",
          text: `Berhasil! ${formatNumber(d.result?.claims_ingested || 0)} klaim telah dinormalisasi ke skema JKN dan dianalisis oleh 8 detektor (${formatNumber(d.result?.flagged_claims || 0)} klaim berisiko ditandai).`,
        });
        setIsEditingMapping(false);
      }
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
      const json = await res.json().catch(() => ({} as Record<string, any>)); // eslint-disable-line @typescript-eslint/no-explicit-any
      if (!res.ok) throw new Error(json.error || "Upload gagal");
      setIsUploadOpen(false);
      setFile(null);
      await load(json.data.dataset_id);
      setIsEditingMapping(true);
      setMessage({
        kind: "ok",
        text: `Berkas "${f.name}" (${formatNumber(json.data.row_count)} baris) berhasil diekstrak & dianonimkan di memori. Silakan tinjau pemetaan kolom di bawah lalu klik "Konfirmasi & Jalankan Analisis".`,
      });
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload gagal");
    } finally {
      setIsUploading(false);
    }
  };

  const discard = async (d: Dataset) => {
    if (!window.confirm(`Buang dataset "${d.name}"? Baris anonim yang tersimpan akan dihapus.`)) return;
    try {
      const res = await fetch(`/api/datasets/${d.dataset_id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({} as Record<string, any>)); // eslint-disable-line @typescript-eslint/no-explicit-any
      if (!res.ok) throw new Error(json.error || "Gagal membuang dataset");
      setMessage({ kind: "ok", text: `Dataset "${d.name}" dibuang.` });
      await load();
    } catch (e) {
      setMessage({ kind: "err", text: e instanceof Error ? e.message : "Gagal membuang dataset" });
    }
  };

  const quickIngestSample = async (sampleFile: string, sampleTitle: string) => {
    if (!canUpload || quickLoadingSample) return;
    setQuickLoadingSample(sampleFile);
    setMessage(null);
    try {
      const resp = await fetch(`/samples/${sampleFile}`);
      if (!resp.ok) throw new Error("Berkas sampel tidak ditemukan");
      const blob = await resp.blob();
      const sampleFileObj = new File([blob], sampleFile, { type: "text/csv" });
      const form = new FormData();
      form.append("file", sampleFileObj);
      const res = await fetch("/api/datasets", { method: "POST", body: form });
      const json = await res.json().catch(() => ({} as Record<string, any>)); // eslint-disable-line @typescript-eslint/no-explicit-any
      if (!res.ok) throw new Error(json.error || "Gagal memuat sampel");
      await load(json.data.dataset_id);
      setIsEditingMapping(true);
      setMessage({
        kind: "ok",
        text: `Sampel "${sampleTitle}" (${formatNumber(json.data.row_count)} baris) berhasil dimuat & dianonimkan! Tinjau usulan pemetaan kolom AI pada Langkah 03 di bawah, lalu klik "Konfirmasi & Jalankan 8 Detektor".`,
      });
    } catch (e) {
      setMessage({
        kind: "err",
        text: e instanceof Error ? e.message : "Gagal memuat sampel konektor RS",
      });
    } finally {
      setQuickLoadingSample(null);
    }
  };

  const useSampleInModal = async (name: string) => {
    try {
      const r = await fetch(`/samples/${name}`);
      if (!r.ok) throw new Error("Berkas sampel tidak ditemukan");
      setFile(new File([await r.blob()], name, { type: "text/csv" }));
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Gagal memuat sampel");
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
  };

  const colInfo = (name: string) => selected?.columns.find((c) => c.name === name);
  const isSeed = selected?.dataset_id === "DS-SEED";
  const q = selected?.quality_summary;
  const editable = Boolean(
    selected && !isSeed && canConfirm && (selected.status !== "READY" || isEditingMapping)
  );

  const filteredMappings = useMemo(() => {
    return mapping.filter((m) => {
      const col = selected?.columns.find((c) => c.name === m.source_field);
      const canon = m.canonical_field ? canonicalLookup.get(m.canonical_field) : undefined;
      if (filterMode === "REQUIRED") return Boolean(canon?.required);
      if (filterMode === "PII") return Boolean(col?.pii_treatment);
      if (filterMode === "UNMAPPED") return !m.canonical_field;
      return true;
    });
  }, [mapping, filterMode, selected, canonicalLookup]);

  const totalMapped = mapping.filter((m) => m.canonical_field).length;
  const totalPiiCols = selected?.columns.filter((c) => c.pii_treatment).length || 0;

  return (
    <DashboardShell>
      {/* Judul bagian */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-jkn-text">Dataset</h1>
          <p className="mt-1 text-sm text-jkn-muted max-w-2xl">
            Unggah ekspor klaim, petakan kolomnya, lalu 8 detektor memeriksanya. Identitas pasien disamarkan otomatis.
          </p>
        </div>
        <div className="shrink-0">
          {canUpload ? (
            <button
              onClick={() => setIsUploadOpen(true)}
              className="h-8 inline-flex items-center gap-2 px-3.5 rounded-md bg-[#1d1f20] text-white text-sm font-medium hover:bg-black"
            >
              <Upload className="w-3.5 h-3.5" aria-hidden />
              <span>Unggah berkas (CSV, XLSX, JSON)</span>
            </button>
          ) : (
            <span className="h-8 inline-flex items-center gap-1.5 px-3 rounded-md border border-jkn-border text-sm text-jkn-muted">
              <Lock className="w-3.5 h-3.5" aria-hidden /> Mode baca saja
            </span>
          )}
        </div>
      </div>

      {/* STATUS MESSAGE BANNER */}
      {message && (
        <div
          role="status"
          className={`flex items-start justify-between gap-3 text-xs rounded-xl px-4 py-3.5 border shadow-subtle ${
            message.kind === "ok"
              ? "bg-emerald-50 border-emerald-200 text-emerald-950"
              : message.kind === "warn"
              ? "bg-amber-50 border-amber-200 text-amber-900"
              : "bg-risk-critical-bg border-risk-critical-border text-risk-critical"
          }`}
        >
          <div className="flex items-start gap-2.5">
            {message.kind === "ok" ? (
              <CheckCircle2 className="w-4 h-4 text-bpjs shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span className="font-medium leading-relaxed">{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="text-jkn-muted hover:text-jkn-text p-0.5"
            aria-label="Tutup pesan"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. DATASET SWITCHER + 1-CLICK SIMRS CONNECTOR SIMULATOR */}
      {loading && datasets.length === 0 ? (
        <PageLoader label="Memuat daftar dataset..." />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* Left: Active Datasets List */}
          <div className="xl:col-span-7 bg-surface rounded-2xl border border-jkn-border p-4 shadow-subtle flex flex-col space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-bpjs" />
                <h2 className="text-sm font-bold text-jkn-text">
                  Dataset ({datasets.length})
                </h2>
              </div>
              <span className="text-[11px] text-jkn-muted">
                Klik untuk membuka
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1 tabular-nums content-start">
              {datasets.map((d) => {
                const active = selected?.dataset_id === d.dataset_id;
                const isReady = d.status === "READY";
                const isErr = d.status === "ERROR";
                return (
                  <button
                    key={d.dataset_id}
                    onClick={() => select(d)}
                    className={`p-3.5 rounded-xl border text-left transition-all relative ${
                      active
                        ? "bg-bpjs-soft/70 border-bpjs ring-2 ring-bpjs/15 shadow-xs"
                        : "bg-surface hover:bg-surface-secondary border-jkn-border"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-semibold text-jkn-dim">
                        {d.dataset_id} · {d.source_format}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          isReady
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : isErr
                            ? "bg-risk-critical-bg text-risk-critical border-risk-critical-border"
                            : "bg-amber-50 text-amber-800 border-amber-300 animate-pulse"
                        }`}
                      >
                        {isReady
                          ? "Aktif & Dianalisis"
                          : isErr
                          ? "Gagal Validasi"
                          : "Perlu Konfirmasi"}
                      </span>
                    </div>
                    <div className="font-bold text-xs text-jkn-text truncate mt-1.5" title={d.name}>
                      {d.name}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-jkn-muted mt-2 pt-2 border-t border-jkn-divider/70">
                      <span>
                        <strong className="text-jkn-text">{formatNumber(d.row_count)}</strong> baris
                        · {d.columns.length} kolom
                      </span>
                      <span>{formatDate(d.created_at)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: 1-Click Hospital SIMRS / E-Klaim Sample Connectors */}
          <div className="xl:col-span-5 bg-surface rounded-2xl border border-jkn-border p-4 shadow-subtle flex flex-col space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-bpjs" />
                <h2 className="text-sm font-bold text-jkn-text">
                  Sampel resmi BPJS
                </h2>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-bpjs-soft text-bpjs-dark border border-bpjs-border">
                Sumber: panitia
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-1 gap-2">
              {SAMPLES.map((s) => {
                const busy = quickLoadingSample === s.file;
                return (
                  <button
                    key={s.file}
                    type="button"
                    disabled={!canUpload || Boolean(quickLoadingSample)}
                    onClick={() => quickIngestSample(s.file, s.shortTitle)}
                    className="group p-2.5 rounded-xl border border-jkn-border hover:border-bpjs bg-surface-subtle/50 hover:bg-bpjs-soft/40 text-left transition-all flex flex-col justify-between disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white border border-jkn-border text-jkn-muted whitespace-nowrap">
                        {s.tag}
                      </span>
                      <span className="text-[10px] font-mono text-bpjs-dark font-bold flex items-center gap-1 whitespace-nowrap">
                        {busy ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" /> Memuat...
                          </>
                        ) : (
                          <>
                            <Play className="w-2.5 h-2.5 fill-current" /> Muat {s.rows}
                          </>
                        )}
                      </span>
                    </div>
                    <div className="font-bold text-xs text-jkn-text mt-1.5 group-hover:text-bpjs-dark truncate">
                      {s.shortTitle}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. SELECTED DATASET WORKSPACE */}
      {selected && (
        <div className="space-y-5 tabular-nums">
          {/* Interactive 4-Stage Pipeline Progress Bar */}
          <div className="bg-surface rounded-2xl border border-jkn-border shadow-subtle overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-jkn-divider">
              {[
                {
                  step: "01",
                  title: "Ekstraksi & Profil Kolom",
                  desc: `${formatNumber(selected.row_count)} baris · ${selected.columns.length} kolom berhasil dibaca`,
                  state: "DONE" as const,
                },
                {
                  step: "02",
                  title: "Anonimisasi UU PDP (Di Memori)",
                  desc: selected.anonymization
                    ? `${selected.anonymization.columns_pseudonymized.length} HMAC · ${selected.anonymization.columns_initials.length} inisial · ${selected.anonymization.columns_scrubbed.length} teks`
                    : `${totalPiiCols} kolom PII terdeteksi & disensor`,
                  state: "DONE" as const,
                },
                {
                  step: "03",
                  title: "Pemetaan Skema Kanonik JKN",
                  desc:
                    mappedRequired.missing.length === 0
                      ? `${totalMapped}/${mapping.length} kolom terpetakan (${REQUIRED_FIELDS.length}/${REQUIRED_FIELDS.length} wajib lengkap)`
                      : `Kurang field wajib: ${mappedRequired.missing.join(", ")}`,
                  state:
                    selected.status === "READY" && !isEditingMapping
                      ? ("DONE" as const)
                      : ("ACTIVE" as const),
                },
                {
                  step: "04",
                  title: "Analisis 8 Detektor & Vektor",
                  desc: selected.result
                    ? `${formatNumber(selected.result.flagged_claims)} klaim berisiko · ${formatNumber(selected.result.findings_total)} temuan`
                    : "Klik 'Konfirmasi & Jalankan Analisis' pada Langkah 03",
                  state: selected.status === "READY" ? ("DONE" as const) : ("WAITING" as const),
                },
              ].map((s) => (
                <div
                  key={s.step}
                  className={`p-4 flex items-start gap-3 transition-colors ${
                    s.state === "ACTIVE" ? "bg-amber-50/50" : ""
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg font-mono text-xs font-bold flex items-center justify-center border shrink-0 mt-0.5 ${
                      s.state === "DONE"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : s.state === "ACTIVE"
                        ? "bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-200"
                        : "bg-surface-secondary text-jkn-muted border-jkn-border"
                    }`}
                  >
                    {s.state === "DONE" ? <Check className="w-4 h-4 text-bpjs" /> : s.step}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] text-jkn-muted">Langkah {Number(s.step)}</span>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                          s.state === "DONE"
                            ? "text-emerald-700 bg-emerald-50"
                            : s.state === "ACTIVE"
                            ? "text-amber-800 bg-amber-100"
                            : "text-jkn-dim bg-surface-secondary"
                        }`}
                      >
                        {s.state === "DONE"
                          ? "Selesai"
                          : s.state === "ACTIVE"
                          ? "Tinjau Sekarang"
                          : "Menunggu"}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-jkn-text mt-0.5">{s.title}</div>
                    <div className="text-[11px] text-jkn-muted mt-0.5 leading-snug truncate" title={s.desc}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MAIN 2-COLUMN WORKSPACE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* LEFT 8 COLS: SCHEMA MAPPING WORKBENCH */}
            <div className="lg:col-span-8 space-y-5">
              <div className="bg-surface rounded-2xl border border-jkn-border shadow-subtle overflow-hidden">
                {/* Workbench Header & Action Bar */}
                <div className="p-5 border-b border-jkn-divider bg-surface-subtle/40 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-bpjs" />
                        <h2 className="text-sm font-bold text-jkn-text">
                          Pemetaan kolom
                        </h2>
                      </div>
                      <p className="text-xs text-jkn-muted mt-1">Tanda <span className="text-rose-600 font-bold">*</span> = {REQUIRED_FIELDS.length} field wajib untuk deteksi.</p>
                    </div>

                    {/* Action Button in Header so User Immediately Sees It */}
                    <div className="flex items-center gap-2 shrink-0">
                      {editable && (
                        <button
                          type="button"
                          onClick={confirm}
                          disabled={normalizing || mappedRequired.missing.length > 0}
                          className="h-9 flex items-center gap-2 px-4 rounded-xl bg-bpjs text-white text-xs font-bold hover:bg-bpjs-deep disabled:opacity-50 transition-all shadow-xs"
                        >
                          {normalizing ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Menganalisis Klaim…</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-4 h-4" />
                              <span>Konfirmasi & Jalankan 8 Detektor</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Helper / Status Contextual Callout inside Workbench */}
                  {isSeed ? (
                    <div className="rounded-xl bg-emerald-50/80 border border-emerald-200 px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-950">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-bpjs shrink-0" />
                        <span>
                          <strong>Dataset Sintetis Bawaan (siap pakai):</strong> sintetis, dikalibrasi
                          dengan statistik resmi BPJS 2018 (bukan data klaim asli). Seluruh 9 kolom
                          inti sudah terpetakan dan dianalisis. Untuk mencoba pemetaan kolom, muat
                          sampel di atas atau unggah berkas Anda.
                        </span>
                      </div>
                    </div>
                  ) : selected.status !== "READY" || isEditingMapping ? (
                    <div
                      className={`rounded-xl border px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                        mappedRequired.missing.length > 0
                          ? "bg-amber-50 border-amber-300 text-amber-950"
                          : "bg-bpjs-soft border-bpjs-border text-bpjs-dark"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {mappedRequired.missing.length > 0 ? (
                          <>
                            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                            <span>
                              <strong>Perhatian:</strong> Masih ada field wajib JKN yang belum
                              dipetakan:{" "}
                              <code className="font-mono font-bold">
                                {mappedRequired.missing.join(", ")}
                              </code>
                            </span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-bpjs shrink-0" />
                            <span>
                              <strong>Siap Dinormalisasi!</strong> Seluruh{" "}
                              {mappedRequired.totalRequired}/{mappedRequired.totalRequired} field
                              wajib JKN telah terpetakan. Anda dapat menyesuaikan dropdown di bawah
                              atau langsung klik{" "}
                              <strong>&ldquo;Konfirmasi & Jalankan 8 Detektor&rdquo;</strong>.
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {/* Filter Tabs + Required Checklist Pill */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="inline-flex items-center rounded-xl bg-surface-secondary p-1 border border-jkn-border text-xs">
                      {[
                        { id: "ALL", label: `Semua Kolom (${mapping.length})` },
                        {
                          id: "REQUIRED",
                          label: `Field Wajib JKN (${mappedRequired.mappedCount}/${mappedRequired.totalRequired})`,
                        },
                        { id: "PII", label: `Sensor UU PDP (${totalPiiCols})` },
                        {
                          id: "UNMAPPED",
                          label: `Diabaikan (${mapping.length - totalMapped})`,
                        },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setFilterMode(t.id as typeof filterMode)}
                          className={`px-2.5 py-1 rounded-lg font-semibold transition-all text-[11px] ${
                            filterMode === t.id
                              ? "bg-white text-bpjs-dark shadow-2xs border border-jkn-border/60"
                              : "text-jkn-muted hover:text-jkn-text"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>

                    <div className="text-[11px] text-jkn-muted flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-jkn-dim" />
                      <span>
                        {editable
                          ? "Mode Interaktif: Pilih dropdown untuk mengganti sasaran kolom"
                          : "Mode Terkunci: Pemetaan telah dikonfirmasi"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mapping Table Rows */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-surface-secondary border-b border-jkn-border text-[11px] font-bold text-jkn-muted">
                        <th className="py-3 px-4 w-[44%]">
                          1. Kolom Asli Berkas RS & Contoh Data
                        </th>
                        <th className="py-3 px-3 text-center w-[16%]">Keyakinan AI</th>
                        <th className="py-3 px-4 w-[40%]">
                          2. Target Field Standar JKN (INA-CBG)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-jkn-divider">
                      {filteredMappings.map((m) => {
                        const col = colInfo(m.source_field);
                        const canon = m.canonical_field
                          ? canonicalLookup.get(m.canonical_field)
                          : undefined;
                        const typeMeta = TYPE_BADGE[col?.detected_type || "string"];
                        const piiMeta = col?.pii_treatment
                          ? PII_LABEL[col.pii_treatment]
                          : undefined;
                        const pct = Math.round((m.confidence || 0) * 100);

                        return (
                          <tr
                            key={m.source_field}
                            className={`transition-colors ${
                              m.canonical_field
                                ? "hover:bg-surface-subtle"
                                : "bg-surface-secondary/30 hover:bg-surface-secondary/60"
                            }`}
                          >
                            {/* Source Column + Data Type + Sample Chips + UU PDP Badge */}
                            <td className="py-3.5 px-4 align-top space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-xs text-jkn-text bg-surface-secondary px-2 py-0.5 rounded border border-jkn-border">
                                  {m.source_field}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${typeMeta.cls}`}
                                >
                                  {typeMeta.label}
                                </span>
                                {piiMeta && (
                                  <span
                                    className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${piiMeta.badgeClass}`}
                                  >
                                    <EyeOff className="w-2.5 h-2.5" />
                                    {piiMeta.label}
                                  </span>
                                )}
                              </div>

                              {/* Sample Values from Dataset */}
                              {col?.sample_values && col.sample_values.length > 0 ? (
                                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                  <span className="text-[10px] text-jkn-dim">Contoh:</span>
                                  {col.sample_values.slice(0, 2).map((sv, idx) => (
                                    <code
                                      key={idx}
                                      className="text-[10px] font-mono bg-surface-subtle text-jkn-muted px-1.5 py-0.5 rounded border border-jkn-divider max-w-[220px] truncate"
                                      title={sv}
                                    >
                                      {sv}
                                    </code>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-[10px] text-jkn-dim italic">
                                  Tidak ada nilai sampel pada kolom ini
                                </div>
                              )}
                            </td>

                            {/* AI Confidence & Origin */}
                            <td className="py-3.5 px-3 align-top text-center">
                              <div className="inline-flex flex-col items-center gap-1 w-full max-w-[110px]">
                                <div className="flex items-center justify-between w-full text-[11px]">
                                  <span className="text-[10px] font-semibold text-jkn-muted">
                                    {m.suggested_by === "llm"
                                      ? "AI"
                                      : m.suggested_by === "manual"
                                      ? "Manual"
                                      : "Heuristik"}
                                  </span>
                                  <span
                                    className={`font-mono font-bold ${
                                      pct >= 85
                                        ? "text-bpjs-dark"
                                        : pct >= 50
                                        ? "text-amber-700"
                                        : "text-jkn-dim"
                                    }`}
                                  >
                                    {pct}%
                                  </span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-surface-secondary overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      pct >= 85
                                        ? "bg-bpjs"
                                        : pct >= 50
                                        ? "bg-amber-500"
                                        : "bg-slate-300"
                                    }`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* Target Canonical Field Selector */}
                            <td className="py-3.5 px-4 align-top">
                              <div className="space-y-1.5">
                                <select
                                  aria-label={`Field kanonik untuk kolom ${m.source_field}`}
                                  disabled={!editable}
                                  value={m.canonical_field}
                                  onChange={(e) => changeMapping(m.source_field, e.target.value)}
                                  className={`w-full h-9 font-mono text-xs px-2.5 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-bpjs/20 focus:border-bpjs ${
                                    !m.canonical_field
                                      ? "border-dashed border-jkn-border bg-surface-secondary/50 text-jkn-muted"
                                      : canon?.required
                                      ? "border-bpjs/50 bg-bpjs-soft/25 text-jkn-text font-semibold"
                                      : "border-jkn-border bg-white text-jkn-text"
                                  } disabled:opacity-80 disabled:cursor-not-allowed`}
                                >
                                  <option value="">— Abaikan kolom ini (Tidak dipetakan) —</option>
                                  <optgroup label="Field Wajib Standar JKN (7 Kolom Inti)">
                                    {CANONICAL_FIELDS.filter((f) => f.required).map((f) => (
                                      <option key={f.id} value={f.id}>
                                        ★ {f.label} ({f.id})
                                      </option>
                                    ))}
                                  </optgroup>
                                  <optgroup label="Field Opsional & Bukti Medis Pendukung">
                                    {CANONICAL_FIELDS.filter((f) => !f.required).map((f) => (
                                      <option key={f.id} value={f.id}>
                                        {f.label} ({f.id})
                                      </option>
                                    ))}
                                  </optgroup>
                                </select>

                                {/* Friendly Description & Mapping Rationale */}
                                <div className="flex items-center justify-between gap-2 text-[11px]">
                                  {canon ? (
                                    <span className="text-jkn-muted flex items-center gap-1 truncate">
                                      <span
                                        className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                                          canon.required ? "bg-bpjs" : "bg-slate-400"
                                        }`}
                                      />
                                      <strong className="text-jkn-text">{canon.label}</strong>
                                      {canon.required ? (
                                        <span className="text-[10px] text-bpjs-dark font-semibold">
                                          (Wajib)
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-jkn-dim">(Opsional)</span>
                                      )}
                                    </span>
                                  ) : (
                                    <span className="text-jkn-dim italic">
                                      Kolom tidak digunakan dalam analisis
                                    </span>
                                  )}
                                  {m.reason && (
                                    <span
                                      className="text-[10px] text-jkn-dim truncate max-w-[190px]"
                                      title={m.reason}
                                    >
                                      {m.reason}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Workbench Footer Bar */}
                <div className="px-5 py-4 border-t border-jkn-divider bg-surface-subtle/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs">
                    {isSeed ? (
                      <span className="text-jkn-muted flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-bpjs" />
                        Dataset sensus bawaan telah dinormalisasi ke skema kanonik JKN.
                      </span>
                    ) : selected.status === "READY" && !isEditingMapping ? (
                      <span className="text-bpjs-dark font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        Pemetaan skema telah dikonfirmasi & dianalisis oleh 8 detektor.
                      </span>
                    ) : mappedRequired.missing.length > 0 ? (
                      <span className="text-amber-800 font-medium flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        Lengkapi field wajib sebelum konfirmasi: {mappedRequired.missing.join(", ")}
                      </span>
                    ) : (
                      <span className="text-bpjs-dark font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        Semua {REQUIRED_FIELDS.length} field wajib JKN telah terpetakan dengan lengkap.
                      </span>
                    )}
                  </div>

                  {editable && (
                    <div className="flex items-center gap-2">
                      {selected.status === "READY" && isEditingMapping && (
                        <button
                          type="button"
                          onClick={() => {
                            setMapping(selected.mappings || []);
                            setIsEditingMapping(false);
                          }}
                          className="h-9 px-3.5 rounded-xl border border-jkn-border bg-white text-xs font-semibold text-jkn-muted hover:text-jkn-text"
                        >
                          Batal
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={confirm}
                        disabled={normalizing || mappedRequired.missing.length > 0}
                        className="h-9 flex items-center gap-2 px-4 rounded-xl bg-bpjs text-white text-xs font-bold hover:bg-bpjs-deep disabled:opacity-50 transition-colors shadow-xs"
                      >
                        {normalizing ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Menormalisasi & Menganalisis…</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4" />
                            <span>Konfirmasi & Jalankan 8 Detektor</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT 4 COLS: ANALYSIS RESULT, PRIVACY SHIELD, AND DATA QUALITY */}
            <div className="lg:col-span-4 space-y-5">
              {/* Card 1: Detector Analysis Summary */}
              <div className="bg-surface rounded-2xl border border-bpjs-border p-5 shadow-subtle space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-jkn-divider">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-bpjs" />
                    <h3 className="font-bold text-jkn-text text-sm">
                      Hasil Analisis 8 Detektor
                    </h3>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      selected.result
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}
                  >
                    {selected.result ? "Selesai Dianalisis" : selected.status === "ERROR" ? "Gagal" : "Menunggu Konfirmasi"}
                  </span>
                </div>

                {selected.result ? (
                  <>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-3 rounded-xl bg-surface-subtle border border-jkn-divider">
                        <div className="text-[11px] text-jkn-muted">Klaim Masuk</div>
                        <div className="text-lg font-semibold text-jkn-text mt-0.5">
                          {formatNumber(selected.result.claims_ingested)}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-risk-critical-bg/60 border border-risk-critical-border">
                        <div className="text-[11px] text-risk-critical font-medium">
                          Klaim Berisiko
                        </div>
                        <div className="text-lg font-semibold text-risk-critical mt-0.5">
                          {formatNumber(selected.result.flagged_claims)}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-surface-subtle border border-jkn-divider">
                        <div className="text-[11px] text-jkn-muted">Temuan Detektor</div>
                        <div className="text-base font-semibold text-jkn-text mt-0.5">
                          {formatNumber(selected.result.findings_total)}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-bpjs-soft/60 border border-bpjs-border">
                        <div className="text-[11px] text-bpjs-dark font-medium">
                          Berkas Investigasi
                        </div>
                        <div className="text-base font-semibold text-bpjs-dark mt-0.5">
                          {formatNumber(selected.result.investigations_created)}
                        </div>
                      </div>
                    </div>


                    <Link
                      href="/investigation-queue"
                      className="w-full h-9 rounded-xl bg-bpjs text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-bpjs-deep transition-colors"
                    >
                      <span>Buka Antrean Investigasi Klaim</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </>
                ) : (
                  selected.status === "ERROR" ? (
                    <div role="alert" className="rounded-xl bg-risk-critical-bg/70 border border-risk-critical-border p-3.5 text-xs text-risk-critical space-y-2">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Dataset tidak dapat diproses</span>
                      </div>
                      <p className="leading-relaxed">{selected.error_message || "Proses gagal. Periksa berkas lalu unggah ulang."}</p>
                    </div>
                  ) : (
                  <div className="rounded-xl bg-amber-50/70 border border-amber-200 p-3.5 text-xs text-amber-950 space-y-2">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>Belum Dianalisis oleh Detektor</span>
                    </div>
                    <p className="text-[11px] text-amber-900/85 leading-relaxed">
                      Periksa usulan pemetaan kolom di sebelah kiri, lalu klik tombol{" "}
                      <strong>&ldquo;Konfirmasi & Jalankan 8 Detektor&rdquo;</strong> untuk
                      memasukkan klaim ke dalam antrean investigasi.
                    </p>
                  </div>
                  )
                )}
                {canUpload && selected.status !== "READY" && selected.status !== "NORMALIZING" && selected.dataset_id !== "DS-SEED" && (
                  <button type="button" onClick={() => discard(selected)} className="w-full h-8 rounded-md border border-jkn-border text-sm font-medium text-risk-critical hover:bg-risk-critical-bg transition-colors">
                    Buang dataset ini
                  </button>
                )}
              </div>

              {/* Card 2: UU PDP Privacy Shield Ledger */}
              {selected.anonymization && (
                <details className="group bg-surface rounded-2xl border border-jkn-border p-5 space-y-3.5">
                  <summary className="list-none cursor-pointer flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-bpjs" />
                      <h3 className="text-sm font-bold text-jkn-text">
                        Perisai Privasi UU PDP
                      </h3>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      0 PII Mentah Disimpan
                    </span>
                  </summary>
                  <p className="text-[11px] text-jkn-muted leading-relaxed">
                    Transformasi kriptografis diterapkan langsung di memori saat file dibaca. Data
                    pribadi asli pasien tidak pernah ditulis ke database maupun dikirim ke AI:
                  </p>
                  <div className="space-y-2 text-xs">
                    {[
                      {
                        title: "Tokenisasi HMAC-SHA256",
                        badge: "Pseudonim",
                        cls: "bg-emerald-50 text-emerald-800 border-emerald-200",
                        cols: selected.anonymization.columns_pseudonymized,
                      },
                      {
                        title: "Konversi Hanya Inisial",
                        badge: "Inisial",
                        cls: "bg-sky-50 text-sky-800 border-sky-200",
                        cols: selected.anonymization.columns_initials,
                      },
                      {
                        title: "Kolom Identitas Dihapus",
                        badge: "Dibuang",
                        cls: "bg-rose-50 text-rose-800 border-rose-200",
                        cols: selected.anonymization.columns_dropped,
                      },
                      {
                        title: "Sensor Regex Teks Medis",
                        badge: "Disensor",
                        cls: "bg-amber-50 text-amber-800 border-amber-200",
                        cols: selected.anonymization.columns_scrubbed,
                      },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className="p-2.5 rounded-xl bg-surface-subtle border border-jkn-divider flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-jkn-text">{item.title}</span>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${item.cls}`}
                          >
                            {item.badge}
                          </span>
                        </div>
                        <div className="font-mono text-[11px] text-jkn-muted break-words">
                          {item.cols.length > 0 ? item.cols.join(", ") : "Tidak ditemukan di file"}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {/* Card 3: Data Quality Metrics */}
              <div className="bg-surface rounded-2xl border border-jkn-border p-5 shadow-subtle space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-jkn-divider">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-bpjs" />
                    <h3 className="text-sm font-bold text-jkn-text">
                      Skor Kualitas & Validitas Data
                    </h3>
                  </div>
                  {q && (
                    <span className="text-xs font-mono font-bold text-bpjs-dark bg-bpjs-soft px-2 py-0.5 rounded border border-bpjs-border">
                      {q.validity_score}% Valid
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
                        <div className="w-full h-2 rounded-full bg-surface-secondary overflow-hidden">
                          <div
                            className="h-full bg-bpjs rounded-full transition-all"
                            style={{ width: `${v}%` }}
                          />
                        </div>
                      </div>
                    ))}

                    <details className="pt-2 border-t border-jkn-divider text-[11px] text-jkn-muted"><summary className="cursor-pointer list-none text-bpjs font-medium">Rincian baris</summary><div className="divide-y divide-jkn-divider mt-1">
                      <div className="py-1.5 flex justify-between">
                        <span>Total Baris Dibaca</span>
                        <strong className="font-mono text-jkn-text">
                          {formatNumber(q.total_rows)}
                        </strong>
                      </div>
                      <div className="py-1.5 flex justify-between">
                        <span>Baris Valid & Tersimpan</span>
                        <strong className="font-mono text-bpjs-dark">
                          {formatNumber(q.valid_rows)}
                        </strong>
                      </div>
                      <div className="py-1.5 flex justify-between">
                        <span>Baris Ditolak (Format Rusak)</span>
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
                    </div></details>
                  </div>
                ) : (
                  <p className="text-xs text-jkn-muted leading-relaxed">
                    Skor kelengkapan & validitas baris akan dihitung secara otomatis saat pemetaan
                    skema dikonfirmasi.
                  </p>
                )}

                {selected.rejected_rows && selected.rejected_rows.length > 0 && (
                  <div className="pt-2 border-t border-jkn-divider">
                    <div className="text-[11px] font-bold text-risk-critical mb-1.5 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Log Baris Ditolak ({selected.rejected_rows.length} baris)</span>
                    </div>
                    <ul className="space-y-1 max-h-40 overflow-y-auto text-[11px] bg-risk-critical-bg/40 p-2.5 rounded-xl border border-risk-critical-border">
                      {selected.rejected_rows.map((r, i) => (
                        <li key={i} className="text-jkn-text">
                          <span className="font-mono font-bold text-risk-critical">
                            Baris #{r.row}
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

      {/* MODAL UPLOAD FILE */}
      {isUploadOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label="Unggah dataset"
          onKeyDown={(e) =>
            e.key === "Escape" && (setIsUploadOpen(false), setFile(null), setUploadError(""))
          }
        >
          <div className="bg-surface w-full max-w-lg rounded-2xl border border-jkn-border shadow-modal p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-jkn-divider">
              <div>
                <h3 className="text-sm font-bold text-jkn-text">
                  Unggah Berkas Ekspor Klaim / SIMRS
                </h3>
                <p className="text-xs text-jkn-muted mt-0.5">
                  Format didukung: CSV · TSV · XLSX · JSON (maks. 20 MB / 50.000 baris)
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
                  <CheckCircle2 className="w-6 h-6 text-bpjs mx-auto mb-1.5" />
                  <div className="font-bold text-xs text-jkn-text">{file.name}</div>
                  <div className="text-[11px] font-mono text-bpjs-dark mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB siap dianonimkan & dipetakan
                  </div>
                </div>
              ) : (
                <div>
                  <Upload className="w-6 h-6 text-bpjs mx-auto mb-1.5" />
                  <div className="font-semibold text-xs text-jkn-text">
                    Seret & lepas berkas di sini, atau klik untuk memilih dari komputer
                  </div>
                  <div className="text-[11px] text-jkn-muted mt-1">
                    PII (NIK, Nama, Alamat, No. HP) akan disensor otomatis di memori
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-bold text-jkn-muted">
                Atau gunakan berkas sampel resmi BPJS:
              </div>
              <div className="divide-y divide-jkn-divider border border-jkn-border rounded-xl overflow-hidden">
                {SAMPLES.map((s) => (
                  <div
                    key={s.file}
                    className={`p-2.5 text-xs flex items-center justify-between gap-2 ${
                      file?.name === s.file ? "bg-bpjs-soft" : "bg-surface hover:bg-surface-subtle"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => useSampleInModal(s.file)}
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
                      title="Unduh file CSV sampel"
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
                className="h-9 px-4 rounded-xl text-xs font-semibold text-jkn-muted hover:bg-surface-secondary"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!file || isUploading}
                onClick={() => file && upload(file)}
                className="h-9 flex items-center gap-2 px-4 rounded-xl bg-bpjs text-white font-bold text-xs hover:bg-bpjs-deep disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menganonimkan & Memetakan…</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Proses & Anonimkan Dataset</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      <details className="group rounded-2xl border border-jkn-border/80 bg-surface">
        <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between text-base font-semibold text-jkn-text">
          <span>Asal data: resmi dan sintetis</span>
          <span className="text-xs font-medium text-bpjs group-open:hidden">Tampilkan</span>
          <span className="text-xs font-medium text-bpjs hidden group-open:inline">Sembunyikan</span>
        </summary>
        <div className="px-1 pb-3"><ProvenanceCatalog compact /></div>
      </details>
    </DashboardShell>
  );
}
