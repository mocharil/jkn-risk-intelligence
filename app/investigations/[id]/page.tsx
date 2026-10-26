"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { RiskPill } from "@/components/ui/RiskPill";
import { PageLoader } from "@/components/ui/PageLoader";
import { Investigation, InvestigationStatus } from "@/types/investigation";
import { CanonicalClaim } from "@/types/claim";
import { formatRupiah, formatNumber } from "@/lib/formatting/currency";
import { formatDate, formatRelativeTime } from "@/lib/formatting/date";
import { FacilityMark, PersonAvatar } from "@/components/ui/Avatar";
import { useSession } from "@/lib/auth/client";
import { AuditEntry } from "@/lib/audit/chain";
import { NetworkGraphView } from "@/components/network/NetworkGraphView";
import { renderCitedText, ModeBadge } from "@/components/ai/CitedAnswer";
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileQuestion,
  FileText,
  Clock,
  Send,
  Building2,
  User,
  Calendar,
  Layers,
  Copy,
  Activity,
  History,
  Check,
  Download,
  ShieldAlert,
  ChevronRight,
  Lock,
  ShieldCheck,
  X,
} from "lucide-react";

export default function InvestigationWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "EVIDENCE" | "TIMELINE" | "SIMILAR" | "NETWORK" | "NOTES">("OVERVIEW");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiResponse, setAiResponse] = useState<{ text: string; mode?: "llm" | "deterministic"; provider?: string; model?: string; reason?: string; citations: Array<{ ref: number; evidence_id: string; title: string; excerpt: string; status: string }> } | null>(null);
  const { can, role } = useSession();
  const [actionError, setActionError] = useState("");
  const [decisionModal, setDecisionModal] = useState<null | "CONFIRMED_RISK" | "FALSE_POSITIVE">(null);
  const [decisionText, setDecisionText] = useState("");
  const [explaining, setExplaining] = useState(false);
  const [explainInfo, setExplainInfo] = useState<{ mode: "llm" | "deterministic"; reason?: string } | null>(null);
  const [audit, setAudit] = useState<{ entries: AuditEntry[]; valid: boolean; length: number; reason?: string; head?: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [highlightedEvidenceId, setHighlightedEvidenceId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setInvestigation(null);
    fetch(`/api/investigations/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.data) {
          setInvestigation(data.data);
        } else {
          setNotFound(true);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setNotFound(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const patchInvestigation = async (body: Record<string, unknown>) => {
    setUpdatingStatus(true);
    setActionError("");
    try {
      const res = await fetch(`/api/investigations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Aksi gagal");
      setInvestigation(data.data);
      loadAudit();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("arsa:store-updated"));
      }
      return true;
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Aksi gagal");
      return false;
    } finally {
      setUpdatingStatus(false);
    }
  };

  useEffect(() => {
    if (investigation && activeTab === "NOTES") loadAudit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, investigation?.investigation_id]);

  const handleStatusChange = (newStatus: InvestigationStatus, note?: string) => patchInvestigation({ status: newStatus, note });

  const submitDecision = async () => {
    if (!decisionModal || decisionText.trim().length < 3) return;
    const ok = await patchInvestigation({ determination: { verdict: decisionModal, rationale: decisionText.trim() } });
    if (ok) {
      setDecisionModal(null);
      setDecisionText("");
    }
  };

  const loadAudit = async () => {
    try {
      const claimId = investigation?.claim_id;
      if (!claimId) return;
      const res = await fetch(`/api/audit?claim_id=${encodeURIComponent(claimId)}&limit=50`);
      if (!res.ok) return;
      const j = await res.json();
      setAudit({ entries: j.data, valid: j.verification.valid, length: j.verification.length, reason: j.verification.reason, head: j.verification.head_hash });
    } catch {
      /* ignore */
    }
  };

  const explain = async (force = false) => {
    if (!investigation) return;
    setExplaining(true);
    try {
      const res = await fetch(`/api/claims/${investigation.claim_id}/explain${force ? "?force=1" : ""}`, { method: "POST" });
      const j = await res.json();
      if (res.ok) {
        setInvestigation((cur) => (cur ? { ...cur, claim: j.data } : cur));
        setExplainInfo({ mode: j.explanation_mode, reason: j.fallback_reason });
      }
    } finally {
      setExplaining(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    try {
      const res = await fetch(`/api/investigations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: newNoteText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan catatan");
      setInvestigation(data.data);
      setNewNoteText("");
      loadAudit();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Gagal menyimpan catatan");
    }
  };

  const handleAskAI = async (customPrompt?: string) => {
    const query = customPrompt || aiQuestion;
    if (!query.trim()) return;

    setAiLoading(true);
    setAiQuestion("");

    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: query,
          claim_id: investigation!.claim_id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Permintaan gagal");
      setAiResponse({ text: data.answer, mode: data.mode, provider: data.provider, model: data.model, reason: data.fallback_reason, citations: data.evidence_citations || [] });
    } catch (e) {
      setAiResponse({ text: `Maaf, permintaan gagal: ${e instanceof Error ? e.message : "kesalahan"}`, citations: [] });
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <PageLoader label={`Memuat berkas investigasi kasus ${id}...`} className="h-[60vh]" />
      </DashboardShell>
    );
  }

  if (notFound || !investigation) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center gap-3 h-[60vh] text-center">
          <ShieldAlert className="w-8 h-8 text-jkn-dim" />
          <p className="text-sm font-bold text-jkn-text">Berkas investigasi tidak ditemukan</p>
          <p className="text-xs text-jkn-muted">Tidak ada kasus dengan kode "{id}".</p>
          <Link href="/investigation-queue" className="text-xs font-bold text-bpjs-dark hover:underline">
            Kembali ke Antrean Investigasi
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const { claim } = investigation;
  const approvedTariff = claim.approved_tariff || 0;
  const tariffDiff = claim.tariff_difference || 0;
  const tariffRatioPct = approvedTariff > 0 ? Math.round(((claim.claim_amount - approvedTariff) / approvedTariff) * 100) : 0;
  const maxTariffScale = Math.max(claim.claim_amount, approvedTariff, 1) * 1.12;

  const evidenceDocs = claim.medical_evidence ?? [];
  const supportsCount = evidenceDocs.filter((d) => d.status === "SUPPORTS_CLAIM").length;
  const reviewCount = evidenceDocs.filter((d) => d.status === "NEEDS_REVIEW").length;
  const contradictsCount = evidenceDocs.filter((d) => d.status === "CONTRADICTS_CLAIM").length;
  const totalEvidence = Math.max(evidenceDocs.length, 1);

  return (
    <DashboardShell>
      {/* Top Breadcrumb & Status Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-jkn-border pb-3.5">
        <div className="flex items-center gap-3">
          <Link
            href="/investigation-queue"
            aria-label="Kembali ke antrean investigasi"
            className="p-2 rounded-lg bg-surface-secondary border border-jkn-border text-jkn-dim hover:text-jkn-text transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-jkn-dim tabular-nums">{investigation.investigation_id}</span>
              <span className="text-xs text-jkn-dim">/</span>
              <h1 className="text-lg font-mono font-bold text-jkn-text tracking-tight tabular-nums">{claim.claim_id}</h1>
              <RiskPill score={investigation.risk_score} level={investigation.priority} size="sm" />
            </div>
            <p className="text-xs text-jkn-muted mt-0.5 tabular-nums">
              {claim.patient.name} (<span className="font-mono">{claim.patient.patient_id}</span>) · {claim.provider.name} · <span className="font-mono font-semibold text-jkn-text">{formatRupiah(claim.claim_amount)}</span>
            </p>
          </div>
        </div>

        {/* Current Case Status Badge */}
        <div className="flex items-center gap-2">
          <div className="text-right text-xs">
            <span className="text-[10px] text-jkn-dim block mb-0.5">
              Status Kasus{investigation.assigned_to && investigation.assigned_to.user_id !== "UNASSIGNED" ? ` · ${investigation.assigned_to.name}` : " · Belum Ditugaskan"}
            </span>
            <span className="inline-block font-semibold text-bpjs-dark bg-bpjs-soft px-2.5 py-0.5 rounded-md border border-bpjs-border text-xs">
              {investigation.status === "NEW"
                ? "Kasus Baru"
                : investigation.status === "UNDER_INVESTIGATION"
                ? "Sedang Diinvestigasi"
                : investigation.status === "CONFIRMED_RISK"
                ? "Risiko Terkonfirmasi"
                : investigation.status === "FALSE_POSITIVE"
                ? "Positif Palsu (Layak Bayar)"
                : investigation.status === "NEED_EVIDENCE"
                ? "Menunggu Bukti Tambahan"
                : investigation.status === "ESCALATED"
                ? "Dieskalasi ke Komite Medis"
                : investigation.status}
            </span>
          </div>
        </div>
      </div>

      {/* Main 65/35 Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Evidence Workspace (8 cols / 65%) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Workspace Tabs */}
          <div className="flex items-center gap-1.5 border-b border-jkn-border pb-2 overflow-x-auto">
            {[
              { id: "OVERVIEW", label: "Ringkasan Klaim" },
              { id: "EVIDENCE", label: `Papan Bukti (${claim.medical_evidence.length})` },
              { id: "TIMELINE", label: "Kronologi" },
              { id: "SIMILAR", label: `Klaim Serupa (${(claim.similar_claims ?? []).length})` },
              { id: "NETWORK", label: "Graf Relasi" },
              { id: "NOTES", label: `Catatan & Audit Trail (${(investigation.notes ?? []).length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`h-8 px-3 rounded-lg text-xs font-semibold transition-all shrink-0 border ${
                  activeTab === tab.id
                    ? "bg-bpjs-soft text-bpjs-dark border-bpjs-border font-bold"
                    : "bg-surface text-jkn-muted border-transparent hover:bg-surface-secondary"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === "OVERVIEW" && (
            <div className="space-y-4 animate-in fade-in duration-100">
              {/* Patient & Service Details Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-surface rounded-xl border border-jkn-border p-3.5 shadow-subtle space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-jkn-dim">
                    <User className="w-3.5 h-3.5 text-bpjs" />
                    <span>Profil Peserta (Anonim)</span>
                  </div>
                  <div className="text-xs font-bold text-jkn-text">{claim.patient.name}</div>
                  <div className="text-[11px] text-jkn-muted font-mono tabular-nums">Kartu: {claim.patient.bpjs_card_number}</div>
                  <div className="text-[11px] text-jkn-dim tabular-nums">{claim.patient.age > 0 ? `${claim.patient.age} thn` : "usia tidak tercatat"} · {claim.patient.gender === "L" ? "Laki-laki" : claim.patient.gender === "P" ? "Perempuan" : "jenis kelamin tidak tercatat"}</div>
                </div>

                <div className="bg-surface rounded-xl border border-jkn-border p-3.5 shadow-subtle space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-jkn-dim">
                    <Building2 className="w-3.5 h-3.5 text-bpjs" />
                    <span>Faskes Penagih & DPJP</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <FacilityMark size={32} />
                    <div className="min-w-0">
                      <Link
                        href={`/providers/${claim.provider.provider_id}`}
                        className="text-xs font-bold text-jkn-text hover:text-bpjs truncate block"
                      >
                        {claim.provider.name}
                      </Link>
                      <div className="text-[11px] text-jkn-muted truncate">{claim.provider.city}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-jkn-divider/70">
                    <PersonAvatar name={claim.service.doctor_name} size={24} />
                    <span className="text-[11px] font-medium text-jkn-text truncate">
                      {claim.service.doctor_name}
                    </span>
                  </div>
                </div>

                <div className="bg-surface rounded-xl border border-jkn-border p-3.5 shadow-subtle space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-jkn-dim">
                    <Calendar className="w-3.5 h-3.5 text-bpjs" />
                    <span>Episode Perawatan</span>
                  </div>
                  <div className="text-xs font-bold text-jkn-text tabular-nums">Lama rawat: {claim.service.length_of_stay} hari</div>
                  <div className="text-[11px] text-jkn-muted tabular-nums">Masuk: {formatDate(claim.service.admission_date)}</div>
                  <div className="text-[11px] text-jkn-dim tabular-nums">Keluar: {formatDate(claim.service.discharge_date)}</div>
                </div>
              </div>

              {/* Visual Anatomy of Risk Score & Medical Evidence Verification */}
              <div className="bg-surface rounded-xl border border-jkn-border p-4 shadow-subtle space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-jkn-text">Visualisasi Anatomi Skor Risiko & Bukti Rekam Medis</h3>
                    <p className="text-[11px] text-jkn-muted">Komposisi sinyal detektor aktif terhadap kelengkapan dokumen pendukung klaim</p>
                  </div>
                  <span className="text-[11px] font-mono font-bold tabular-nums px-2.5 py-0.5 rounded-md bg-surface-secondary border border-jkn-border text-jkn-text">
                    Skor Gabungan: {investigation.risk_score}/100
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 items-stretch">
                  {/* Left: Multi-detector bar breakdown */}
                  <div className="space-y-2.5 p-3 rounded-lg bg-surface-secondary/60 border border-jkn-divider">
                    <div className="text-xs font-semibold text-jkn-dim">Kontribusi Sinyal per Detektor</div>
                    {claim.risk_findings.length === 0 ? (
                      <div className="text-xs text-jkn-muted">Tidak ada sinyal anomali.</div>
                    ) : (
                      claim.risk_findings.map((f, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] gap-2">
                            <span className="font-semibold text-jkn-text truncate">{f.title}</span>
                            <span className="font-mono text-[10px] text-jkn-muted tabular-nums shrink-0">
                              Skor <b className="text-risk-critical">{f.risk_score}</b> · Keyakinan <b>{(f.confidence * 100).toFixed(0)}%</b>
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-white border border-jkn-divider overflow-hidden flex">
                            <div
                              className={`h-full rounded-full ${f.risk_score >= 85 ? "bg-risk-critical" : f.risk_score >= 70 ? "bg-risk-high" : "bg-risk-medium"}`}
                              style={{ width: `${Math.min(100, f.risk_score)}%` }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Right: Stacked Document Verification Status + Interactive Document List */}
                  <div className="space-y-2.5 p-3 rounded-lg bg-surface-secondary/60 border border-jkn-divider flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-jkn-dim">
                        <span>Kesesuaian Dokumen Medis ({claim.medical_evidence.length} Dokumen)</span>
                        <button onClick={() => setActiveTab("EVIDENCE")} className="text-bpjs hover:underline font-semibold normal-case">
                          Lihat bukti →
                        </button>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-white border border-jkn-divider overflow-hidden flex">
                        {contradictsCount > 0 && (
                          <div
                            className="h-full bg-risk-critical transition-all"
                            style={{ width: `${(contradictsCount / totalEvidence) * 100}%` }}
                            title={`Tidak mendukung klaim: ${contradictsCount}`}
                          />
                        )}
                        {reviewCount > 0 && (
                          <div
                            className="h-full bg-risk-medium transition-all"
                            style={{ width: `${(reviewCount / totalEvidence) * 100}%` }}
                            title={`Perlu review: ${reviewCount}`}
                          />
                        )}
                        {supportsCount > 0 && (
                          <div
                            className="h-full bg-bpjs transition-all"
                            style={{ width: `${(supportsCount / totalEvidence) * 100}%` }}
                            title={`Mendukung klaim: ${supportsCount}`}
                          />
                        )}
                      </div>

                      {/* Document breakdown list filling the vertical space */}
                      <div className="divide-y divide-jkn-divider border border-jkn-divider rounded-md bg-white overflow-hidden">
                        {claim.medical_evidence.slice(0, 4).map((doc) => (
                          <button
                            key={doc.evidence_id}
                            onClick={() => {
                              setActiveTab("EVIDENCE");
                              setHighlightedEvidenceId(doc.evidence_id);
                            }}
                            className="w-full px-2.5 py-1.5 text-left text-[11px] flex items-center justify-between gap-2 hover:bg-surface-secondary transition-colors"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  doc.status === "CONTRADICTS_CLAIM"
                                    ? "bg-risk-critical"
                                    : doc.status === "NEEDS_REVIEW"
                                    ? "bg-risk-medium"
                                    : "bg-bpjs"
                                }`}
                              />
                              <span className="font-mono text-[10px] text-jkn-dim shrink-0">{doc.evidence_id}</span>
                              <span className="text-jkn-text font-medium truncate">{doc.title}</span>
                            </div>
                            <span
                              className={`text-[10px] font-semibold shrink-0 ${
                                doc.status === "CONTRADICTS_CLAIM"
                                  ? "text-risk-critical"
                                  : doc.status === "NEEDS_REVIEW"
                                  ? "text-risk-medium"
                                  : "text-bpjs-dark"
                              }`}
                            >
                              {doc.status === "CONTRADICTS_CLAIM" ? "Kontradiktif" : doc.status === "NEEDS_REVIEW" ? "Review" : "Sesuai"}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                      <div className="p-1.5 rounded-md bg-risk-critical-bg border border-risk-critical-border text-center">
                        <div className="font-mono font-bold text-risk-critical text-xs tabular-nums">{contradictsCount}</div>
                        <div className="text-risk-critical font-medium">Kontradiktif</div>
                      </div>
                      <div className="p-1.5 rounded-md bg-risk-medium-bg border border-risk-medium-border text-center">
                        <div className="font-mono font-bold text-risk-medium text-xs tabular-nums">{reviewCount}</div>
                        <div className="text-risk-medium font-medium">Perlu Review</div>
                      </div>
                      <div className="p-1.5 rounded-md bg-bpjs-soft border border-bpjs-border text-center">
                        <div className="font-mono font-bold text-bpjs-dark text-xs tabular-nums">{supportsCount}</div>
                        <div className="text-bpjs-dark font-medium">Mendukung</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tariff Comparison Table + Visual Bullet Bar */}
              <div className="bg-surface rounded-xl border border-jkn-border p-4 shadow-subtle space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-xs font-bold text-jkn-text">Rincian Keuangan & Deviasi terhadap Median Peer</h3>
                  <div className="flex items-center gap-2">
                    {tariffRatioPct > 0 && (
                      <span className="text-[10px] font-mono font-bold tabular-nums px-2 py-0.5 rounded-md bg-risk-critical-bg text-risk-critical border border-risk-critical-border">
                        +{tariffRatioPct}% di atas median peer
                      </span>
                    )}
                    <span className="text-xs font-mono font-bold text-risk-critical tabular-nums">
                      Selisih: +{formatRupiah(tariffDiff)}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-surface-secondary/70 border border-jkn-divider text-xs">
                  <div>
                    <span className="text-[10px] text-jkn-dim font-medium block">Nilai Tagihan Faskes</span>
                    <span className="text-sm font-mono font-bold text-jkn-text tabular-nums">{formatRupiah(claim.claim_amount)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-jkn-dim font-medium block">Median peer (diagnosis dan kelas setara)</span>
                    <span className="text-sm font-mono font-bold text-bpjs-dark tabular-nums">{formatRupiah(approvedTariff)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-jkn-dim font-medium block">Potensi Eksposur</span>
                    <span className="text-sm font-mono font-bold text-risk-critical tabular-nums">{formatRupiah(tariffDiff)}</span>
                  </div>
                </div>

                {/* Visual Bullet Comparison Bar */}
                <div className="space-y-2 pt-0.5">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-jkn-muted">
                      <span className="font-medium text-jkn-text">Tagihan Klaim Ini ({claim.diagnoses[0]?.code || claim.service.treatment_class})</span>
                      <span className="font-mono font-bold text-risk-critical tabular-nums">{formatRupiah(claim.claim_amount)}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-surface-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full bg-risk-critical"
                        style={{ width: `${Math.min(100, (claim.claim_amount / maxTariffScale) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-jkn-muted">
                      <span className="font-medium text-bpjs-dark">Acuan Tarif Median Peer Setara</span>
                      <span className="font-mono font-bold text-bpjs-dark tabular-nums">{formatRupiah(approvedTariff)}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-surface-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full bg-bpjs"
                        style={{ width: `${Math.min(100, (approvedTariff / maxTariffScale) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Posisi terhadap statistik resmi BPJS */}
              {claim.national && claim.national.cost_ref > 0 && (
                <div className="bg-surface rounded-xl border border-jkn-border p-4 shadow-subtle space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-sm font-bold text-jkn-text">Dibanding statistik resmi BPJS {claim.national.year}</h3>
                    <Link href="/acuan-nasional" className="text-xs font-semibold text-bpjs hover:underline">
                      Lihat acuan nasional
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs tabular-nums">
                    <div className="p-3 rounded-lg bg-surface-secondary/70 border border-jkn-divider">
                      <span className="text-jkn-dim block">Rerata {claim.national.class_label.toLowerCase()} {claim.national.level === "INAP" ? "per admisi" : "per kunjungan"}</span>
                      <span className="text-sm font-mono font-bold text-jkn-text block mt-1">{formatRupiah(claim.national.cost_ref)}</span>
                      <span className={`font-mono font-semibold ${(claim.national.cost_ratio ?? 0) >= 2 ? "text-risk-critical" : (claim.national.cost_ratio ?? 0) >= 1.35 ? "text-risk-high" : "text-jkn-muted"}`}>
                        klaim ini {claim.national.cost_ratio?.toLocaleString("id-ID", { maximumFractionDigits: 1 }) ?? "-"}x
                      </span>
                    </div>
                    {claim.national.province_cost ? (
                      <div className="p-3 rounded-lg bg-surface-secondary/70 border border-jkn-divider">
                        <span className="text-jkn-dim block">Rerata {claim.national.province_name}</span>
                        <span className="text-sm font-mono font-bold text-jkn-text block mt-1">{formatRupiah(claim.national.province_cost)}</span>
                        <span className="font-mono font-semibold text-jkn-muted">klaim ini {(claim.national.province_ratio || 0).toLocaleString("id-ID", { maximumFractionDigits: 1 })}x</span>
                      </div>
                    ) : null}
                    {claim.national.los_ref ? (
                      <div className="p-3 rounded-lg bg-surface-secondary/70 border border-jkn-divider">
                        <span className="text-jkn-dim block">Lama rawat rerata kelas</span>
                        <span className="text-sm font-mono font-bold text-jkn-text block mt-1">{claim.national.los_ref.toLocaleString("id-ID")} hari</span>
                        <span className={`font-mono font-semibold ${(claim.national.los_ratio || 0) >= 2 ? "text-risk-critical" : "text-jkn-muted"}`}>klaim ini {claim.service.length_of_stay} hari</span>
                      </div>
                    ) : null}
                  </div>
                  <p className="text-xs text-jkn-muted leading-relaxed">
                    {claim.national.dx
                      ? `Diagnosis ${claim.national.dx.code} berada di peringkat ${claim.national.dx.rank} nasional dengan ${claim.national.dx.admissions.toLocaleString("id-ID")} ${claim.national.level === "INAP" ? "admisi rawat inap" : "kunjungan rawat jalan"} pada ${claim.national.year}.`
                      : `Diagnosis ini tidak termasuk 100 diagnosis ${claim.national.level === "INAP" ? "rawat inap" : "rawat jalan"} terbanyak nasional ${claim.national.year}.`}{" "}
                    Rerata nasional mencakup seluruh jenis kasus, jadi dipakai sebagai konteks kewajaran. Pembanding utama tetap median peer pada diagnosis yang sama.
                  </p>
                </div>
              )}

              {/* Detected Risk Findings Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-jkn-text">Analisis Multi-Detektor</h3>
                  <button onClick={() => explain(false)} disabled={explaining || claim.risk_findings.length === 0} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bpjs text-white text-[11px] font-semibold hover:bg-bpjs-deep disabled:opacity-50 transition-colors">
                    <Sparkles className={`w-3.5 h-3.5 ${explaining ? "animate-spin" : ""}`} />
                    {explaining ? "Menyusun penjelasan…" : claim.risk_findings.some((f) => f.ai_explanation) ? "Perbarui penjelasan AI" : "Jelaskan dengan AI"}
                  </button>
                </div>
                {explainInfo && explainInfo.mode === "deterministic" && explainInfo.reason && (
                  <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">LLM tidak dipakai: {explainInfo.reason}. Penjelasan disusun deterministik dari bukti yang sama.</div>
                )}
                {claim.risk_findings.length === 0 && <div className="text-xs text-jkn-muted p-4 rounded-xl bg-surface-secondary border border-jkn-border">Tidak ada temuan dari detektor untuk klaim ini.</div>}
                {claim.risk_findings.map((finding, idx) => (
                  <div key={idx} className="bg-surface rounded-xl border border-jkn-border p-4 shadow-subtle border-l-[3px] border-l-risk-critical space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RiskPill type={finding.risk_type} size="sm" />
                        <h4 className="text-xs font-bold text-jkn-text">{finding.title}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-jkn-dim tabular-nums" title="Keyakinan detektor dihitung dari jumlah sinyal independen & kelengkapan bukti">Keyakinan {(finding.confidence * 100).toFixed(0)}%</span>
                        <RiskPill score={finding.risk_score} level={finding.verdict} size="sm" />
                      </div>
                    </div>

                    <p className="text-xs text-jkn-muted leading-relaxed">{finding.summary}</p>
                    {finding.rule_id && <div className="text-[10px] font-mono text-jkn-dim">Aturan: {finding.rule_id}</div>}

                    {/* Bukti terkutip (verbatim dari dokumen) */}
                    {finding.evidence.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-xs font-semibold text-jkn-dim">Bukti Terkutip</span>
                        {finding.evidence.map((ev, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              if (ev.source_claim_id) return;
                              setActiveTab("EVIDENCE");
                              setHighlightedEvidenceId(ev.evidence_id);
                            }}
                            className={`w-full text-left p-2.5 rounded-lg border text-[11px] ${ev.supports_finding ? "bg-risk-critical-bg/50 border-risk-critical-border" : "bg-bpjs-soft/50 border-bpjs-border"} hover:ring-1 hover:ring-bpjs transition-all`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-xs font-semibold text-jkn-dim">{ev.evidence_id}</span>
                              <span className={`text-[10px] font-semibold ${ev.supports_finding ? "text-risk-critical" : "text-bpjs-dark"}`}>{ev.supports_finding ? "Mendukung temuan" : "Membantah temuan"}</span>
                            </div>
                            <div className="text-jkn-text font-medium mt-0.5">{ev.claim_statement}</div>
                            {ev.excerpt && <div className="italic text-jkn-muted mt-0.5">"{ev.excerpt}"</div>}
                          </button>
                        ))}
                      </div>
                    )}
                    {finding.missing_evidence.length > 0 && (
                      <div className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                        <b>Bukti yang belum tersedia:</b> {finding.missing_evidence.join("; ")}
                      </div>
                    )}

                    {/* Penjelasan AI */}
                    {finding.ai_explanation && (
                      <div className="p-2.5 rounded-lg bg-intel-light/60 border border-intel-border text-[11px] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-intel-deep">Penjelasan Analitik</span>
                          <ModeBadge mode={finding.ai_explanation.source === "llm" ? "llm" : "deterministic"} provider={finding.ai_explanation.provider} model={finding.ai_explanation.model} />
                        </div>
                        <p className="text-jkn-text leading-relaxed">{finding.ai_explanation.text}</p>
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {finding.ai_explanation.cited_evidence_ids.map((cid) => (
                            <button key={cid} onClick={() => { setActiveTab("EVIDENCE"); setHighlightedEvidenceId(cid); }} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-intel-border text-intel-deep hover:bg-intel-light">{cid}</button>
                          ))}
                        </div>
                      </div>
                    )}

                    {finding.recommended_actions.length > 0 && (
                      <div className="p-2.5 rounded-lg bg-bpjs-soft/40 border border-bpjs-border/60 text-[11px] text-jkn-text space-y-1">
                        <span className="font-bold text-bpjs-dark block">Tindakan yang Disarankan:</span>
                        <ul className="list-disc list-inside space-y-0.5 text-jkn-muted">
                          {finding.recommended_actions.map((act, i) => (
                            <li key={i}>{act}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {finding.limitations.length > 0 && <div className="text-[10px] text-jkn-dim">Keterbatasan: {finding.limitations.join(" ")}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: EVIDENCE BOARD */}
          {activeTab === "EVIDENCE" && (
            <div className="space-y-3 animate-in fade-in duration-100">
              <div className="p-3 rounded-xl bg-surface-secondary border border-jkn-border text-xs text-jkn-muted flex items-center justify-between">
                <span>Dokumen rekam medis teranonimkan. Status ditentukan dari bagaimana dokumen dipakai oleh temuan.</span>
                <span className="font-mono font-bold text-bpjs tabular-nums">{claim.medical_evidence.length} dokumen</span>
              </div>

              <div className="space-y-3">
                {claim.medical_evidence.map((doc) => {
                  const isHighlighted = highlightedEvidenceId === doc.evidence_id;
                  return (
                    <div
                      key={doc.evidence_id}
                      id={doc.evidence_id}
                      className={`bg-surface rounded-xl border p-4 shadow-subtle transition-all ${
                        isHighlighted
                          ? "ring-2 ring-bpjs border-bpjs bg-bpjs-soft/20 shadow-card"
                          : doc.status === "CONTRADICTS_CLAIM"
                          ? "border-l-[3px] border-l-risk-critical border-jkn-border"
                          : doc.status === "NEEDS_REVIEW"
                          ? "border-l-[3px] border-l-risk-medium border-jkn-border"
                          : "border-l-[3px] border-l-bpjs border-jkn-border"
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-jkn-divider">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-bpjs" />
                          <span className="text-xs font-bold text-jkn-text">{doc.title}</span>
                          <span className="text-[10px] text-jkn-dim font-mono">({doc.evidence_id})</span>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${
                            doc.status === "CONTRADICTS_CLAIM"
                              ? "bg-risk-critical-bg text-risk-critical border-risk-critical-border"
                              : doc.status === "NEEDS_REVIEW"
                              ? "bg-risk-medium-bg text-risk-medium border-risk-medium-border"
                              : "bg-bpjs-soft text-bpjs-dark border-bpjs-border"
                          }`}
                        >
                          {doc.status === "CONTRADICTS_CLAIM"
                            ? "Tidak mendukung klaim"
                            : doc.status === "NEEDS_REVIEW"
                            ? "Perlu review"
                            : "Mendukung klaim"}
                        </span>
                      </div>

                      <div className="py-2 space-y-2">
                        <div className="p-2.5 rounded-lg bg-surface-secondary/70 text-xs font-medium text-jkn-text leading-relaxed italic border border-jkn-divider">
                          "{doc.excerpt}"
                        </div>
                        <p className="text-xs text-jkn-muted leading-relaxed">{doc.content}</p>
                      </div>

                      <div className="pt-2 border-t border-jkn-divider flex items-center justify-between text-[11px] text-jkn-dim tabular-nums">
                        <span>Tanggal dokumen: {formatDate(doc.date)}</span>
                        {doc.attached_file_name && (
                          <span className="text-bpjs font-mono font-medium flex items-center gap-1">
                            <Download className="w-3.5 h-3.5" />
                            {doc.attached_file_name}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: TIMELINE */}
          {activeTab === "TIMELINE" && (
            <div className="bg-surface rounded-xl border border-jkn-border p-5 shadow-subtle space-y-4 animate-in fade-in duration-100">
              <h3 className="text-xs font-bold text-jkn-text">
                Kronologi Klinis & Anomali Waktu
              </h3>
              <div className="relative pl-6 space-y-5 border-l-2 border-bpjs-border ml-2">
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-bpjs border-2 border-white" />
                  <div className="text-xs font-bold text-jkn-text tabular-nums">{formatDate(claim.service.admission_date)} — Pasien Masuk</div>
                  <p className="text-xs text-jkn-muted mt-0.5">
                    Dirawat di bawah DPJP {claim.service.doctor_name} ({claim.service.doctor_specialty}) dengan diagnosis awal {claim.diagnoses[0]?.description || "evaluasi klinis"}.
                  </p>
                </div>

                {claim.risk_findings.map((finding, idx) => {
                  const isSevere = finding.verdict === "CRITICAL" || finding.verdict === "HIGH";
                  return (
                    <div
                      key={idx}
                      className={
                        isSevere
                          ? "relative p-3 rounded-lg bg-risk-critical-bg border border-risk-critical-border"
                          : "relative p-3 rounded-lg bg-risk-medium-bg border border-risk-medium-border"
                      }
                    >
                      <div
                        className={
                          isSevere
                            ? "absolute -left-[31px] top-3 w-3.5 h-3.5 rounded-full bg-risk-critical border-2 border-white"
                            : "absolute -left-[31px] top-3 w-3.5 h-3.5 rounded-full bg-risk-medium border-2 border-white"
                        }
                      />
                      <div className={`text-xs font-bold flex items-center gap-1.5 ${isSevere ? "text-risk-critical" : "text-risk-medium"}`}>
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{finding.title}</span>
                      </div>
                      <p className={`text-xs mt-1 leading-relaxed ${isSevere ? "text-risk-critical/90" : "text-amber-900"}`}>
                        {finding.summary}
                      </p>
                    </div>
                  );
                })}

                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-bpjs border-2 border-white" />
                  <div className="text-xs font-bold text-jkn-text tabular-nums">{formatDate(claim.service.discharge_date)} — Pasien Keluar</div>
                  <p className="text-xs text-jkn-muted mt-0.5 tabular-nums">Lama rawat: {claim.service.length_of_stay} hari.</p>
                </div>

                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-bpjs-dark border-2 border-white" />
                  <div className="text-xs font-bold text-jkn-text tabular-nums">{formatDate(claim.service.submission_date)} — Klaim Diajukan</div>
                  <p className="text-xs text-jkn-muted mt-0.5 tabular-nums">
                    Resume medis pulang diterbitkan dengan total tagihan klaim sebesar <span className="font-mono font-semibold text-jkn-text">{formatRupiah(claim.claim_amount)}</span>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SIMILAR CLAIMS */}
          {activeTab === "SIMILAR" && (
            <div className="space-y-3 animate-in fade-in duration-100">
              <div className="p-3 rounded-xl bg-surface-secondary border border-jkn-border text-xs text-jkn-muted">
                Kemiripan semantik narasi medis (embedding vektor, cosine similarity) dipadukan gerbang deterministik tumpang-tindih frasa. Kemiripan tinggi bukan bukti kecurangan; verifikasi manusia tetap diperlukan.
              </div>

              {claim.similar_claims.length === 0 && <div className="text-xs text-jkn-muted p-4 rounded-xl bg-surface-secondary border border-jkn-border">Tidak ada klaim dengan kemiripan di atas ambang pencarian (0,80).</div>}
              {claim.similar_claims.map((sim) => (
                <div
                  key={sim.claim_id}
                  className="bg-surface rounded-xl border border-jkn-border p-4 shadow-subtle space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Copy className="w-4 h-4 text-intel" />
                      <Link href={`/investigations/${sim.claim_id}`} className="text-xs font-mono font-bold text-jkn-text hover:text-bpjs hover:underline">
                        {sim.claim_id}
                      </Link>
                      <span className="text-xs text-jkn-muted">· {sim.provider_name}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-intel-deep bg-intel-light px-2.5 py-0.5 rounded-md border border-intel-border tabular-nums">
                      {(sim.similarity_score * 100).toFixed(1)}% mirip{sim.lexical_overlap !== undefined ? ` · ${(sim.lexical_overlap * 100).toFixed(0)}% frasa sama` : ""}
                    </span>
                  </div>

                  {/* Dual Similarity Progress Meters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-2.5 rounded-lg bg-surface-secondary/50 border border-jkn-divider text-[11px]">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-jkn-muted">Kemiripan Semantik (Cosine Vektor)</span>
                        <span className="font-mono font-bold text-intel-deep tabular-nums">{(sim.similarity_score * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white border border-jkn-divider overflow-hidden">
                        <div className="h-full bg-intel rounded-full" style={{ width: `${Math.min(100, sim.similarity_score * 100)}%` }} />
                      </div>
                    </div>
                    {sim.lexical_overlap !== undefined && (
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-jkn-muted">Tumpang Tindih Leksikal (Frasa Identik)</span>
                          <span className="font-mono font-bold text-risk-medium tabular-nums">{(sim.lexical_overlap * 100).toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white border border-jkn-divider overflow-hidden">
                          <div className="h-full bg-risk-medium rounded-full" style={{ width: `${Math.min(100, sim.lexical_overlap * 100)}%` }} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-2.5 rounded-lg bg-surface-secondary/70 border border-jkn-divider text-xs space-y-1">
                    <div className="font-bold text-jkn-text">Faktor kemiripan:</div>
                    <ul className="list-disc list-inside text-jkn-muted space-y-0.5 text-[11px]">
                      {sim.similarity_reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 tabular-nums">
                    <span className="text-jkn-dim">Nilai klaim pembanding: <span className="font-mono font-semibold text-jkn-text">{formatRupiah(sim.claim_amount)}</span></span>
                    <RiskPill score={sim.risk_score} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 5: NETWORK */}
          {activeTab === "NETWORK" && (
            <div className="animate-in fade-in duration-100">
              <NetworkGraphView claimId={claim.claim_id} />
            </div>
          )}

          {/* TAB 6: NOTES & AUDIT */}
          {activeTab === "NOTES" && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div className="bg-surface rounded-xl border border-jkn-border p-4 shadow-subtle space-y-3">
                <h3 className="text-xs font-bold text-jkn-text">Catatan Investigator</h3>
                <form onSubmit={handleAddNote} className="space-y-2">
                  <textarea value={newNoteText} onChange={(e) => setNewNoteText(e.target.value)} placeholder="Tambahkan temuan, hasil wawancara komite medik, dsb..." rows={3} className="w-full text-xs p-3 rounded-lg bg-surface-secondary border border-jkn-border text-jkn-text outline-hidden focus:border-bpjs focus:bg-white transition-colors" />
                  <button type="submit" disabled={!newNoteText.trim()} className="px-4 py-1.5 rounded-lg bg-bpjs text-white text-xs font-semibold hover:bg-bpjs-deep transition-colors disabled:opacity-50">Simpan Catatan</button>
                </form>
                <div className="divide-y divide-jkn-divider pt-2">
                  {investigation.notes.map((note) => (
                    <div key={note.note_id} className="py-3 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-jkn-text">{note.author}</span>
                          <span className="text-[10px] text-jkn-dim">({note.role})</span>
                        </div>
                        <span className="text-[10px] text-jkn-dim tabular-nums">{formatRelativeTime(note.created_at)}</span>
                      </div>
                      <p className="text-xs text-jkn-muted leading-relaxed">{note.content}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-surface rounded-xl border border-jkn-border p-4 shadow-subtle space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-jkn-text flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-bpjs" /> Audit Trail Append-Only (Hash Chain SHA-256)</h3>
                  {audit && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 border ${audit.valid ? "bg-bpjs-soft text-bpjs-dark border-bpjs-border" : "bg-risk-critical-bg text-risk-critical border-risk-critical-border"}`}>
                      <ShieldCheck className="w-3 h-3" /> {audit.valid ? `Rantai Valid (${audit.length} Entri)` : `RANTAI RUSAK: ${audit.reason}`}
                    </span>
                  )}
                </div>
                {audit?.head && <div className="text-[10px] font-mono text-jkn-dim break-all">head: {audit.head}</div>}
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {(audit?.entries || []).map((e) => (
                    <div key={e.seq} className="p-2.5 rounded-lg bg-surface-secondary/70 border border-jkn-divider text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-jkn-text">#{e.seq} · {e.action}</span>
                        <span className="text-[10px] text-jkn-dim tabular-nums">{formatRelativeTime(e.timestamp)}</span>
                      </div>
                      <div className="text-jkn-muted">{e.actor} ({e.actor_role}){e.previous_status || e.new_status ? ` · ${e.previous_status ?? "—"} → ${e.new_status ?? "—"}` : ""}</div>
                      {e.justification && e.justification !== "—" && <div className="text-jkn-muted italic">"{e.justification}"</div>}
                      <div className="font-mono text-[9px] text-jkn-dim break-all mt-0.5">sha256: {e.hash}</div>
                    </div>
                  ))}
                  {audit && audit.entries.length === 0 && <p className="text-[11px] text-jkn-muted">Belum ada entri audit untuk klaim ini.</p>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: AI Investigator Panel (4 cols / 35%) */}
        <div className="lg:col-span-4 bg-surface rounded-xl border border-jkn-border p-4 shadow-subtle space-y-4 sticky top-20">
          <div className="flex items-center justify-between pb-3 border-b border-jkn-divider">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-bpjs text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-jkn-text">Arsa Copilot</h3>
                <p className="text-[10px] text-jkn-muted">Penalaran bersitasi atas klaim ini</p>
              </div>
            </div>
            <ModeBadge mode={aiResponse?.mode} provider={aiResponse?.provider} model={aiResponse?.model} reason={aiResponse?.reason} />
          </div>

          {/* AI Output Box */}
          <div className="p-3 rounded-lg bg-surface-secondary/80 border border-jkn-divider text-xs text-jkn-text space-y-2.5 max-h-80 overflow-y-auto">
            {aiLoading ? (
              <div className="flex items-center gap-2 text-jkn-muted py-4">
                <Sparkles className="w-4 h-4 text-bpjs animate-spin" />
                <span>Mengambil konteks & memvalidasi sitasi...</span>
              </div>
            ) : aiResponse ? (
              <div className="space-y-2">
                <div className="leading-relaxed text-xs">{renderCitedText(aiResponse.text, "inv-ai")}</div>
                {aiResponse.citations.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-jkn-divider">
                    {aiResponse.citations.map((c) => (
                      <div key={c.evidence_id} id={`inv-ai-ref-${c.ref}`} className="text-[10px] p-1.5 rounded bg-white border border-bpjs-border/50 scroll-mt-20">
                        <span className="inline-flex items-center justify-center min-w-[14px] h-3.5 px-1 mr-1 rounded bg-bpjs text-white text-[9px] font-bold">{c.ref}</span>
                        <b>{c.title}</b> <span className="font-mono text-jkn-dim">{c.evidence_id}</span>
                        <div className="italic text-jkn-muted">"{c.excerpt}"</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="leading-relaxed text-jkn-muted text-[11px]">
                  Klik pertanyaan di bawah atau tulis pertanyaan sendiri. Jawaban hanya berasal dari data klaim ini (temuan, dokumen, klaim serupa) dan setiap pernyataan harus bersitasi.
                </p>
                <div className="p-2 rounded-md bg-white border border-bpjs-border/60 text-[11px] text-bpjs-dark font-medium tabular-nums">
                  {claim.risk_findings.length} temuan · {claim.medical_evidence.length} dokumen · {claim.similar_claims.length} klaim serupa tersedia sebagai konteks.
                </div>
              </div>
            )}
          </div>

          {/* Interactive Evidence Chips */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-jkn-dim block">
              Dokumen Klaim (Klik untuk Membuka)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {claim.medical_evidence.map((doc) => (
                <button
                  key={doc.evidence_id}
                  onClick={() => {
                    setActiveTab("EVIDENCE");
                    setHighlightedEvidenceId(doc.evidence_id);
                  }}
                  className={`px-2 py-1 rounded-md text-[10px] font-mono font-semibold border transition-all ${
                    highlightedEvidenceId === doc.evidence_id
                      ? "bg-bpjs text-white border-bpjs shadow-subtle"
                      : "bg-surface-secondary text-jkn-text border-jkn-border hover:border-bpjs hover:bg-bpjs-soft"
                  }`}
                >
                  {doc.evidence_id} · {doc.document_type.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Prompts */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-jkn-dim block">
              Pertanyaan yang Disarankan
            </span>
            <div className="space-y-1">
              {[
                "Mengapa klaim ini berisiko tinggi?",
                "Dokumen mana yang membantah klaim ini?",
                "Bagaimana perbandingannya dengan faskes dan klaim serupa?",
              ].map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAskAI(prompt)}
                  className="w-full text-left p-2 rounded-lg bg-white border border-jkn-border hover:border-bpjs hover:bg-bpjs-soft/30 text-[11px] text-jkn-text transition-colors flex items-center justify-between group"
                >
                  <span className="truncate">{prompt}</span>
                  <ChevronRight className="w-3 h-3 text-jkn-dim group-hover:text-bpjs shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Input Prompt */}
          <div className="flex items-center gap-2 pt-2 border-t border-jkn-divider">
            <input
              type="text"
              placeholder="Tanya Arsa Copilot tentang klaim ini..."
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAskAI()}
              className="w-full h-9 text-xs px-3 rounded-lg bg-surface-secondary border border-jkn-border text-jkn-text outline-hidden focus:border-bpjs focus:bg-white transition-colors"
            />
            <button
              onClick={() => handleAskAI()}
              aria-label="Kirim pertanyaan"
              disabled={aiLoading || !aiQuestion.trim()}
              className="h-9 w-9 flex items-center justify-center rounded-lg bg-bpjs text-white hover:bg-bpjs-deep disabled:opacity-50 transition-colors shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Persistent Bottom Action Bar */}
      <div className="sticky bottom-3 bg-surface/95 backdrop-blur-md border border-jkn-border rounded-xl px-4 py-2.5 shadow-elevated z-30 space-y-2 mt-4">
        {actionError && <div role="alert" className="text-[11px] text-risk-critical bg-risk-critical-bg border border-risk-critical-border rounded-lg px-3 py-1.5">{actionError}</div>}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          <div className="text-xs min-w-0">
            <span className="text-jkn-dim font-medium">Disposisi Kasus:</span>{" "}
            <span className="font-semibold text-jkn-text">Tetapkan status verifikasi berdasarkan bukti rekam medis.</span>
            {!can("case.final_decision") && <div className="text-[10px] text-amber-700 flex items-center gap-1 mt-0.5"><Lock className="w-3 h-3" /> Peran {role} dapat meminta bukti & mencatat; keputusan akhir oleh Supervisor/Admin.</div>}
          </div>

          <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap shrink-0">
            <button onClick={() => handleStatusChange("UNDER_INVESTIGATION")} disabled={updatingStatus || investigation.status === "UNDER_INVESTIGATION"} className="h-8 px-3 rounded-lg border border-bpjs-border bg-bpjs-soft text-bpjs-dark text-xs font-semibold hover:bg-bpjs-light disabled:opacity-50 transition-colors whitespace-nowrap">
              Mulai Investigasi
            </button>
            <button onClick={() => handleStatusChange("NEED_EVIDENCE")} disabled={updatingStatus} className="h-8 px-3 rounded-lg border border-risk-medium-border bg-risk-medium-bg text-risk-medium text-xs font-semibold hover:bg-amber-100 transition-colors whitespace-nowrap">
              Minta Bukti
            </button>
            <button onClick={() => setDecisionModal("FALSE_POSITIVE")} disabled={updatingStatus || !can("case.final_decision")} title={can("case.final_decision") ? "" : "Hanya Supervisor/Admin"} className="h-8 px-3 rounded-lg border border-jkn-border bg-white text-jkn-text text-xs font-semibold hover:bg-surface-secondary transition-colors disabled:opacity-50 whitespace-nowrap">
              Positif Palsu
            </button>
            <button onClick={() => setDecisionModal("CONFIRMED_RISK")} disabled={updatingStatus || !can("case.final_decision")} title={can("case.final_decision") ? "" : "Hanya Supervisor/Admin"} className="h-8 px-3.5 rounded-lg bg-risk-critical text-white text-xs font-semibold hover:bg-red-700 transition-all shadow-subtle flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Konfirmasi Risiko</span>
            </button>
            <Link href={`/reports/${investigation.investigation_id}`} className="h-8 px-3 rounded-lg bg-bpjs text-white text-xs font-semibold hover:bg-bpjs-deep transition-all shadow-subtle flex items-center gap-1.5 whitespace-nowrap">
              <FileText className="w-3.5 h-3.5" />
              <span>Laporan</span>
            </Link>
          </div>
        </div>
      </div>

      {decisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" role="dialog" aria-modal="true" aria-label="Keputusan investigasi" onKeyDown={(e) => e.key === "Escape" && setDecisionModal(null)}>
          <div className="bg-surface w-full max-w-md rounded-xl border border-jkn-border shadow-elevated p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-jkn-text">{decisionModal === "CONFIRMED_RISK" ? "Konfirmasi Risiko Klaim" : "Tandai Positif Palsu (Layak Bayar)"}</h3>
              <button onClick={() => setDecisionModal(null)} aria-label="Tutup" className="p-1 rounded-lg hover:bg-surface-secondary"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-[11px] text-jkn-muted">Keputusan ini tercatat permanen di audit trail ber-hash atas nama Anda. Tuliskan dasar keputusan (wajib).</p>
            <textarea autoFocus aria-label="Dasar keputusan" value={decisionText} onChange={(e) => setDecisionText(e.target.value)} rows={4} placeholder="Dasar keputusan, merujuk bukti (mis. DOC-...)" className="w-full text-xs p-3 rounded-lg bg-surface-secondary border border-jkn-border outline-hidden focus:border-bpjs focus:bg-white transition-colors" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setDecisionModal(null)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-jkn-muted hover:bg-surface-secondary">Batal</button>
              <button onClick={submitDecision} disabled={updatingStatus || decisionText.trim().length < 3} className="px-4 py-1.5 rounded-lg bg-bpjs text-white text-xs font-semibold hover:bg-bpjs-deep disabled:opacity-50">Simpan Keputusan</button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
