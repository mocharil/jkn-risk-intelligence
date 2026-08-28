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
import { NetworkGraphView } from "@/components/network/NetworkGraphView";
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
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [highlightedEvidenceId, setHighlightedEvidenceId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    fetch(`/api/investigations/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.data) {
          setInvestigation(data.data);
        } else {
          setNotFound(true);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setNotFound(true);
        setLoading(false);
      });
  }, [id]);

  const handleStatusChange = async (newStatus: InvestigationStatus) => {
    try {
      setUpdatingStatus(true);
      const res = await fetch(`/api/investigations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.data) {
        setInvestigation(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingStatus(false);
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
      if (data.data && investigation) {
        setInvestigation({
          ...investigation,
          notes: [data.data, ...investigation.notes],
        });
        setNewNoteText("");
      }
    } catch (e) {
      console.error(e);
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
      setAiResponse(data.answer);
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <PageLoader label={`Loading investigation case dossier for ${id}...`} className="h-[60vh]" />
      </DashboardShell>
    );
  }

  if (notFound || !investigation) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center gap-3 h-[60vh] text-center">
          <ShieldAlert className="w-8 h-8 text-jkn-dim" />
          <p className="text-sm font-bold text-jkn-text">Investigation not found</p>
          <p className="text-xs text-jkn-muted">No case dossier matches "{id}".</p>
          <Link href="/investigation-queue" className="text-xs font-bold text-bpjs-dark hover:underline">
            Back to Investigation Queue
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const { claim } = investigation;

  return (
    <DashboardShell>
      {/* Top Breadcrumb & Status Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-jkn-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/investigation-queue"
            className="p-2 rounded-xl bg-surface-secondary border border-jkn-border text-jkn-dim hover:text-jkn-text transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-jkn-dim">{investigation.investigation_id}</span>
              <span className="text-xs text-jkn-dim">/</span>
              <h1 className="text-lg font-black text-jkn-text tracking-tight">{claim.claim_id}</h1>
              <RiskPill score={investigation.risk_score} level={investigation.priority} size="sm" />
            </div>
            <p className="text-xs text-jkn-muted mt-0.5">
              {claim.patient.name} ({claim.patient.patient_id}) · {claim.provider.name} · {formatRupiah(claim.claim_amount)}
            </p>
          </div>
        </div>

        {/* Current Case Status Badge */}
        <div className="flex items-center gap-2">
          <div className="text-right text-xs">
            <span className="text-[10px] text-jkn-dim block">Investigation Status</span>
            <span className="font-bold text-bpjs-dark bg-bpjs-soft px-2.5 py-0.5 rounded-full border border-bpjs-border text-xs">
              {investigation.status === "UNDER_INVESTIGATION"
                ? "Under Investigation"
                : investigation.status === "CONFIRMED_RISK"
                ? "Confirmed Risk"
                : investigation.status === "FALSE_POSITIVE"
                ? "False Positive (Approved)"
                : investigation.status === "NEED_EVIDENCE"
                ? "Need Evidence"
                : investigation.status}
            </span>
          </div>
        </div>
      </div>

      {/* Main 65/35 Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Evidence Workspace (8 cols / 65%) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Workspace Tabs */}
          <div className="flex items-center gap-1.5 border-b border-jkn-border pb-1 overflow-x-auto">
            {[
              { id: "OVERVIEW", label: "Claim Overview" },
              { id: "EVIDENCE", label: `Evidence Board (${claim.medical_evidence.length})` },
              { id: "TIMELINE", label: "Timeline & CPPT" },
              { id: "SIMILAR", label: `Similar Claims (${claim.similar_claims.length})` },
              { id: "NETWORK", label: "Relation Graph" },
              { id: "NOTES", label: `Notes & Audit Trail (${investigation.notes.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 border ${
                  activeTab === tab.id
                    ? "bg-bpjs-soft text-bpjs-dark border-bpjs-border shadow-2xs font-bold"
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
                <div className="bg-surface rounded-2xl border border-jkn-border p-3.5 shadow-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-jkn-dim uppercase">
                    <User className="w-3.5 h-3.5 text-bpjs" />
                    <span>Participant Profile</span>
                  </div>
                  <div className="text-xs font-bold text-jkn-text">{claim.patient.name}</div>
                  <div className="text-[11px] text-jkn-muted">BPJS: {claim.patient.bpjs_card_number}</div>
                  <div className="text-[11px] text-jkn-dim">{claim.patient.age} yo · {claim.patient.gender === "L" ? "Male" : "Female"}</div>
                </div>

                <div className="bg-surface rounded-2xl border border-jkn-border p-3.5 shadow-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-jkn-dim uppercase">
                    <Building2 className="w-3.5 h-3.5 text-bpjs" />
                    <span>Invoicing Provider</span>
                  </div>
                  <div className="text-xs font-bold text-jkn-text">{claim.provider.name}</div>
                  <div className="text-[11px] text-jkn-muted">{claim.provider.city}</div>
                  <div className="text-[11px] text-jkn-dim">Physician: {claim.service.doctor_name}</div>
                </div>

                <div className="bg-surface rounded-2xl border border-jkn-border p-3.5 shadow-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-jkn-dim uppercase">
                    <Calendar className="w-3.5 h-3.5 text-bpjs" />
                    <span>Care Episode</span>
                  </div>
                  <div className="text-xs font-bold text-jkn-text">Length of Stay: {claim.service.length_of_stay} Days</div>
                  <div className="text-[11px] text-jkn-muted">Admitted: {formatDate(claim.service.admission_date)}</div>
                  <div className="text-[11px] text-jkn-dim">Discharged: {formatDate(claim.service.discharge_date)}</div>
                </div>
              </div>

              {/* Tariff Comparison Table */}
              <div className="bg-surface rounded-2xl border border-jkn-border p-4 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-jkn-text">Financial Breakdown & INA-CBG Tariff Deviation</h3>
                  <span className="text-xs font-bold text-risk-critical">
                    Variance: +{formatRupiah(claim.tariff_difference || 0)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-surface-secondary/70 border border-jkn-divider text-xs">
                  <div>
                    <span className="text-[10px] text-jkn-dim font-medium block">Hospital Invoiced Amount:</span>
                    <span className="text-sm font-black text-jkn-text">{formatRupiah(claim.claim_amount)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-jkn-dim font-medium block">Standard INA-CBG Tariff:</span>
                    <span className="text-sm font-black text-bpjs-dark">{formatRupiah(claim.approved_tariff || 0)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-jkn-dim font-medium block">Potential Exposure:</span>
                    <span className="text-sm font-black text-risk-critical">{formatRupiah(claim.tariff_difference || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Detected Risk Findings Cards */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-jkn-text uppercase tracking-wider">
                  Multi-Detector Anomaly Analysis
                </h3>
                {claim.risk_findings.map((finding, idx) => (
                  <div
                    key={idx}
                    className="bg-surface rounded-2xl border border-jkn-border p-4 shadow-xs border-l-4 border-l-risk-critical space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RiskPill type={finding.risk_type} size="sm" />
                        <h4 className="text-xs font-bold text-jkn-text">{finding.title}</h4>
                      </div>
                      <RiskPill score={finding.risk_score} level={finding.verdict} size="sm" />
                    </div>

                    <p className="text-xs text-jkn-muted leading-relaxed">{finding.summary}</p>

                    {/* Recommendations */}
                    {finding.recommended_actions.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-bpjs-soft/40 border border-bpjs-border/50 text-[11px] text-jkn-text space-y-1">
                        <span className="font-bold text-bpjs-dark block">Recommended Actions:</span>
                        <ul className="list-disc list-inside space-y-0.5 text-jkn-muted">
                          {finding.recommended_actions.map((act, i) => (
                            <li key={i}>{act}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: EVIDENCE BOARD */}
          {activeTab === "EVIDENCE" && (
            <div className="space-y-3 animate-in fade-in duration-100">
              <div className="p-3 rounded-xl bg-surface-secondary border border-jkn-border text-xs text-jkn-muted flex items-center justify-between">
                <span>Extracted and cross-verified electronic medical records.</span>
                <span className="font-bold text-bpjs">{claim.medical_evidence.length} Documents Available</span>
              </div>

              <div className="space-y-3">
                {claim.medical_evidence.map((doc) => {
                  const isHighlighted = highlightedEvidenceId === doc.evidence_id;
                  return (
                    <div
                      key={doc.evidence_id}
                      id={doc.evidence_id}
                      className={`bg-surface rounded-2xl border p-4 shadow-xs transition-all ${
                        isHighlighted
                          ? "ring-2 ring-bpjs border-bpjs bg-bpjs-soft/20 shadow-md"
                          : doc.status === "CONTRADICTS_CLAIM"
                          ? "border-l-4 border-l-risk-critical border-jkn-border"
                          : doc.status === "NEEDS_REVIEW"
                          ? "border-l-4 border-l-amber-500 border-jkn-border"
                          : "border-l-4 border-l-bpjs border-jkn-border"
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-jkn-divider">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-bpjs" />
                          <span className="text-xs font-bold text-jkn-text">{doc.title}</span>
                          <span className="text-[10px] text-jkn-dim font-mono">({doc.evidence_id})</span>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            doc.status === "CONTRADICTS_CLAIM"
                              ? "bg-risk-critical-bg text-risk-critical"
                              : doc.status === "NEEDS_REVIEW"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {doc.status === "CONTRADICTS_CLAIM"
                            ? "Contradicts Claim"
                            : doc.status === "NEEDS_REVIEW"
                            ? "Requires Review"
                            : "Supports Claim"}
                        </span>
                      </div>

                      <div className="py-2 space-y-2">
                        <div className="p-2.5 rounded-xl bg-surface-secondary/70 text-xs font-medium text-jkn-text leading-relaxed italic border border-jkn-divider">
                          "{doc.excerpt}"
                        </div>
                        <p className="text-xs text-jkn-muted leading-relaxed">{doc.content}</p>
                      </div>

                      <div className="pt-2 border-t border-jkn-divider flex items-center justify-between text-[11px] text-jkn-dim">
                        <span>Document Date: {formatDate(doc.date)}</span>
                        {doc.attached_file_name && (
                          <span className="text-bpjs font-medium flex items-center gap-1">
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
            <div className="bg-surface rounded-2xl border border-jkn-border p-5 shadow-xs space-y-4 animate-in fade-in duration-100">
              <h3 className="text-xs font-bold text-jkn-text uppercase tracking-wider">
                Clinical Chronology & Temporal Anomalies (CPPT)
              </h3>
              <div className="relative pl-6 space-y-6 border-l-2 border-bpjs-border ml-2">
                <div className="relative">
                  <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-bpjs border-2 border-white" />
                  <div className="text-xs font-bold text-jkn-text">{formatDate(claim.service.admission_date)} - Patient Admission</div>
                  <p className="text-xs text-jkn-muted mt-0.5">
                    Admitted under {claim.service.doctor_name} ({claim.service.doctor_specialty}) for {claim.diagnoses[0]?.description || "evaluation"}.
                  </p>
                </div>

                {claim.risk_findings.map((finding, idx) => {
                  const isSevere = finding.verdict === "CRITICAL" || finding.verdict === "HIGH";
                  return (
                    <div
                      key={idx}
                      className={
                        isSevere
                          ? "relative p-3 rounded-xl bg-risk-critical-bg border border-risk-critical-border"
                          : "relative p-3 rounded-xl bg-amber-50 border border-amber-200"
                      }
                    >
                      <div
                        className={
                          isSevere
                            ? "absolute -left-[31px] top-3 w-4 h-4 rounded-full bg-risk-critical border-2 border-white animate-ping-slow"
                            : "absolute -left-[31px] top-3 w-4 h-4 rounded-full bg-amber-500 border-2 border-white"
                        }
                      />
                      <div className={`text-xs font-bold flex items-center gap-1.5 ${isSevere ? "text-risk-critical" : "text-amber-800"}`}>
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
                  <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-emerald-600 border-2 border-white" />
                  <div className="text-xs font-bold text-jkn-text">{formatDate(claim.service.discharge_date)} - Discharge</div>
                  <p className="text-xs text-jkn-muted mt-0.5">Length of stay: {claim.service.length_of_stay} days.</p>
                </div>

                <div className="relative">
                  <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-bpjs-dark border-2 border-white" />
                  <div className="text-xs font-bold text-jkn-text">{formatDate(claim.service.submission_date)} - Claim Submitted</div>
                  <p className="text-xs text-jkn-muted mt-0.5">
                    Discharge certificate issued with total invoiced amount of {formatRupiah(claim.claim_amount)}.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SIMILAR CLAIMS */}
          {activeTab === "SIMILAR" && (
            <div className="space-y-3 animate-in fade-in duration-100">
              <div className="p-3 rounded-xl bg-surface-secondary border border-jkn-border text-xs text-jkn-muted">
                Semantic similarity matching utilizing clinical narrative embeddings via pgvector.
              </div>

              {claim.similar_claims.map((sim) => (
                <div
                  key={sim.claim_id}
                  className="bg-surface rounded-2xl border border-jkn-border p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Copy className="w-4 h-4 text-intel" />
                      <span className="text-xs font-bold text-jkn-text">{sim.claim_id}</span>
                      <span className="text-xs text-jkn-muted">· {sim.provider_name}</span>
                    </div>
                    <span className="text-xs font-bold text-intel bg-intel-light px-2.5 py-0.5 rounded-full border border-intel/30">
                      {(sim.similarity_score * 100).toFixed(0)}% Semantic Match
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-surface-secondary/70 border border-jkn-divider text-xs space-y-1">
                    <div className="font-bold text-jkn-text">Similarity Factors Identified:</div>
                    <ul className="list-disc list-inside text-jkn-muted space-y-0.5 text-[11px]">
                      {sim.similarity_reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-jkn-dim">Benchmark Claim Amount: {formatRupiah(sim.claim_amount)}</span>
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
            <div className="bg-surface rounded-2xl border border-jkn-border p-5 shadow-xs space-y-4 animate-in fade-in duration-100">
              <h3 className="text-xs font-bold text-jkn-text uppercase tracking-wider">
                Investigator Notes & Append-Only Audit Trail
              </h3>

              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="space-y-2">
                <textarea
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Add investigative findings note or medical committee interview outcomes..."
                  rows={3}
                  className="w-full text-xs p-3 rounded-xl bg-surface-secondary border border-jkn-border text-jkn-text outline-hidden focus:border-bpjs"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-bpjs text-white text-xs font-bold hover:bg-bpjs-deep transition-colors"
                >
                  Save Note
                </button>
              </form>

              {/* Notes List */}
              <div className="divide-y divide-jkn-divider pt-2">
                {investigation.notes.map((note) => (
                  <div key={note.note_id} className="py-3 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-jkn-text">{note.author}</span>
                        <span className="text-[10px] text-jkn-dim">({note.role})</span>
                      </div>
                      <span className="text-[10px] text-jkn-dim">{formatRelativeTime(note.created_at)}</span>
                    </div>
                    <p className="text-xs text-jkn-muted leading-relaxed">{note.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: AI Investigator Panel (4 cols / 35%) */}
        <div className="lg:col-span-4 bg-surface rounded-2xl border border-bpjs-border p-4 shadow-sm space-y-4 sticky top-20">
          <div className="flex items-center justify-between pb-3 border-b border-bpjs-border/60">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-bpjs text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-jkn-text">AI Investigator Co-Pilot</h3>
                <p className="text-[10px] text-jkn-muted">Evidence-Grounded Clinical Reasoning</p>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-bpjs-light text-bpjs-dark font-bold">
              96% Grounded
            </span>
          </div>

          {/* AI Output Box */}
          <div className="p-3.5 rounded-xl bg-surface-secondary/80 border border-jkn-divider text-xs text-jkn-text space-y-2.5 max-h-80 overflow-y-auto">
            {aiLoading ? (
              <div className="flex items-center gap-2 text-jkn-muted py-4">
                <Sparkles className="w-4 h-4 text-bpjs animate-spin" />
                <span>AI system is cross-verifying medical evidence...</span>
              </div>
            ) : aiResponse ? (
              <div className="whitespace-pre-line leading-relaxed text-xs">
                {aiResponse}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="leading-relaxed">
                  <strong>AI Analysis Summary:</strong> Claim <span className="font-mono font-bold text-bpjs-dark">{claim.claim_id}</span>{" "}
                  {claim.risk_findings.length > 0 ? (
                    <>
                      demonstrates confirmed indicators of{" "}
                      {claim.risk_findings.map((f, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && (i === claim.risk_findings.length - 1 ? " and " : ", ")}
                          <strong>{f.title}</strong>
                        </React.Fragment>
                      ))}
                      {claim.tariff_difference ? ` amounting to ${formatRupiah(claim.tariff_difference)}.` : "."}
                    </>
                  ) : (
                    "has no confirmed risk indicators from the automated detectors yet."
                  )}
                </p>
                <div className="p-2 rounded bg-white border border-bpjs-border/60 text-[11px] text-bpjs-dark font-medium">
                  ✦ All findings verified against {claim.medical_evidence.length} attached electronic medical record{claim.medical_evidence.length === 1 ? "" : "s"}.
                </div>
              </div>
            )}
          </div>

          {/* Interactive Evidence Chips */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-jkn-dim uppercase tracking-wider block">
              Cited Clinical Evidence (Click to highlight):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {claim.medical_evidence.map((doc) => (
                <button
                  key={doc.evidence_id}
                  onClick={() => {
                    setActiveTab("EVIDENCE");
                    setHighlightedEvidenceId(doc.evidence_id);
                  }}
                  className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                    highlightedEvidenceId === doc.evidence_id
                      ? "bg-bpjs text-white border-bpjs shadow-xs"
                      : "bg-surface-secondary text-jkn-text border-jkn-border hover:border-bpjs hover:bg-bpjs-soft"
                  }`}
                >
                  {doc.evidence_id} - {doc.document_type.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Prompts */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-jkn-dim uppercase tracking-wider block">
              Suggested Investigative Prompts:
            </span>
            <div className="space-y-1">
              {[
                "Why is this claim categorized as CRITICAL?",
                "Compare against 10 similar claims at RS Sehat Sentosa",
                "Verify operating room log for procedure code 44.95",
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
              placeholder="Ask AI Intelligence Assistant..."
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAskAI()}
              className="w-full text-xs px-3 py-1.5 rounded-xl bg-surface-secondary border border-jkn-border text-jkn-text outline-hidden focus:border-bpjs"
            />
            <button
              onClick={() => handleAskAI()}
              disabled={aiLoading || !aiQuestion.trim()}
              className="p-2 rounded-xl bg-bpjs text-white hover:bg-bpjs-deep disabled:opacity-50 transition-colors shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Persistent Bottom Action Bar */}
      <div className="sticky bottom-4 bg-surface/95 backdrop-blur-md border border-jkn-border rounded-2xl p-4 shadow-elevated z-30 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs">
          <span className="text-jkn-dim">Investigator Verdict:</span>{" "}
          <span className="font-bold text-jkn-text">
            Determine case disposition based on verified clinical evidence.
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleStatusChange("NEED_EVIDENCE")}
            disabled={updatingStatus}
            className="px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-xs font-bold hover:bg-amber-100 transition-colors shadow-2xs"
          >
            Request Evidence
          </button>

          <button
            onClick={() => handleStatusChange("FALSE_POSITIVE")}
            disabled={updatingStatus}
            className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors shadow-2xs"
          >
            Mark False Positive
          </button>

          <button
            onClick={() => handleStatusChange("CONFIRMED_RISK")}
            disabled={updatingStatus}
            className="px-4 py-1.5 rounded-xl bg-risk-critical text-white text-xs font-bold hover:bg-rose-700 transition-all shadow-sm flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm Risk Anomaly</span>
          </button>

          <Link
            href={`/reports/REP-${investigation.investigation_id}`}
            className="px-3 py-1.5 rounded-xl bg-bpjs text-white text-xs font-bold hover:bg-bpjs-deep transition-all shadow-sm flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" />
            <span>Generate Report</span>
          </Link>
        </div>
      </div>
    </DashboardShell>
  );
}
