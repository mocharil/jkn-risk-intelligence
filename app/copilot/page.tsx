"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth/client";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { renderCitedText } from "@/components/ai/CitedAnswer";
import { formatRupiah } from "@/lib/formatting/currency";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  RotateCcw,
  Square,
} from "lucide-react";

interface Message {
  id: string;
  sender: "USER" | "AI";
  text: string;
  confidence?: number;
  streaming?: boolean;
  mode?: "llm" | "deterministic";
  provider?: string;
  model?: string;
  fallback_reason?: string;
  grounding?: { valid_citations: number; removed_invalid_citations: number; context_items: number };
  evidence_citations?: Array<{ ref?: number; evidence_id: string; title: string; excerpt: string; status: string }>;
  entity_links?: Array<{ type: string; id: string; label: string; risk_score?: number; href?: string }>;
  suggested_followups?: string[];
  timestamp: string;
}

interface TopClaimItem {
  claim_id: string;
  investigation_id?: string;
  risk_score: number;
  risk_level: string;
  claim_amount: number;
  tariff_difference?: number;
  risk_signals: string[];
  provider: { provider_id: string; name: string; province_name?: string };
}

interface TopProviderItem {
  provider_id: string;
  name: string;
  province_name: string;
  risk_score: number;
  high_risk_claims: number;
  total_claims: number;
  potential_exposure: number;
  dominant_risk_type: string;
}

type InspectorTab = "claims" | "providers" | "system";

const STORAGE_KEY = "arsa.copilot.v1";

function renderAnswer(text: string, msgId: string) {
  return renderCitedText(text, msgId, "md");
}

const linkHref = (l: NonNullable<Message["entity_links"]>[number]) =>
  l.href ||
  (l.type === "PROVIDER"
    ? `/providers/${l.id}`
    : l.type === "MAP"
    ? `/risk-intelligence?tab=peta&province=${l.id}`
    : l.type === "QUEUE"
    ? "/investigation-queue"
    : `/investigation-queue?mode=CLAIMS&search=${encodeURIComponent(l.id)}`);

function plainAnswer(m: Message): string {
  const cites = (m.evidence_citations || []).map((c) => `[${c.ref}] ${c.title} (${c.evidence_id}): ${c.excerpt}`);
  return [m.text, cites.length ? `\nBukti yang dikutip:\n${cites.join("\n")}` : ""].join("\n").trim();
}

/* ============================================================================
 * Bespoke Precision Forensic SVG Icons (Anti-AI-Slop Geometric Vector Marks)
 * ============================================================================ */

function ArsaGlyph({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 2.5L20.5 7.25V16.75L12 21.5L3.5 16.75V7.25L12 2.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M12 6.5L16.8 9.25V14.75L12 17.5L7.2 14.75V9.25L12 6.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeOpacity="0.55"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <path
        d="M12 2.5V6.5M20.5 7.25L16.8 9.25M20.5 16.75L16.8 14.75M12 21.5V17.5M3.5 16.75L7.2 14.75M3.5 7.25L7.2 9.25"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeOpacity="0.45"
      />
    </svg>
  );
}

function ForensicCrosshairIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="10" cy="10" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="10" r="2.25" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M10 1.75V4.5M10 15.5V18.25M1.75 10H4.5M15.5 10H18.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FacilityMatrixIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <rect x="2.5" y="3.5" width="6.5" height="13" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="7.5" width="6.5" height="9" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4.75 6.5H6.75M4.75 9.5H6.75M4.75 12.5H6.75M13.25 10.5H15.25M13.25 13.5H15.25"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path d="M9 10H11" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.5" />
    </svg>
  );
}

function BenchmarkDeltaIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M2.5 16.5H17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect
        x="4"
        y="9.5"
        width="3"
        height="7"
        rx="0.75"
        fill="currentColor"
        fillOpacity="0.18"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <rect
        x="8.5"
        y="5.5"
        width="3"
        height="11"
        rx="0.75"
        fill="currentColor"
        fillOpacity="0.18"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <rect
        x="13"
        y="3.5"
        width="3"
        height="13"
        rx="0.75"
        fill="currentColor"
        fillOpacity="0.35"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M2.5 7.5H17.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeDasharray="2 2"
        strokeOpacity="0.6"
      />
    </svg>
  );
}

function GeoGridIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M3 5.2L7.8 3.2L12.2 5.2L17 3.2V14.8L12.2 16.8L7.8 14.8L3 16.8V5.2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M7.8 3.2V14.8M12.2 5.2V16.8" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.55" />
    </svg>
  );
}

function CitationSealIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path
        d="M8 1.5L13.5 3.75V7.75C13.5 11.15 11.15 13.65 8 14.5C4.85 13.65 2.5 11.15 2.5 7.75V3.75L8 1.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M5.75 8.1L7.25 9.6L10.5 6.35"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CommandPromptIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" fill="none" className={className} aria-hidden="true">
      <path
        d="M4.5 6L8.25 9L4.5 12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9.75 12H13.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function TransmitArrowIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path
        d="M3 8H13M13 8L9 4M13 8L9 12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EvidenceDocIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <rect x="2.5" y="2" width="11" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.25 5.5H10.75M5.25 8H10.75M5.25 10.5H8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export default function AICopilotPage() {
  const { user } = useSession();
  const firstName = user?.name?.split(" ")[0] || "Investigator";
  const userInitials = useMemo(() => {
    const parts = (user?.name || "Investigator").trim().split(/\s+/);
    return parts.length > 1
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }, [user?.name]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<InspectorTab>("claims");
  const [ai, setAi] = useState<{
    available: boolean;
    label?: string;
    model?: string;
    embeddingModel?: string;
    reason?: string;
    policy?: boolean;
  } | null>(null);
  const [live, setLive] = useState<{
    claim?: string;
    p1?: string;
    p2?: string;
    topClaims: TopClaimItem[];
    topProviders: TopProviderItem[];
    totalClaims?: number;
    highRiskClaims?: number;
    totalExposure?: number;
  }>({ topClaims: [], topProviders: [] });

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const hydrated = useRef(false);

  const greeting = useCallback(
    (): Message => ({
      id: "msg-1",
      sender: "AI",
      text: `Halo ${firstName}, saya **Arsa Copilot**. Saya menganalisis data klaim JKN yang telah dianonimkan serta acuan resmi BPJS 2018, dan **selalu mengutip bukti sumber** agar setiap temuan dapat diverifikasi secara audit oleh investigator.\n\nKlaim, fasilitas kesehatan, provinsi, atau pola anomali apa yang ingin Anda bedah?`,
      timestamp: new Date().toISOString(),
    }),
    [firstName]
  );

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null") as Message[] | null;
      if (Array.isArray(saved) && saved.length > 0) {
        setMessages(saved.map((m) => ({ ...m, streaming: false })));
        return;
      }
    } catch {
      /* penyimpanan tidak tersedia */
    }
    setMessages([greeting()]);
  }, [greeting]);

  useEffect(() => {
    if (!hydrated.current || messages.length === 0) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.filter((m) => !m.streaming).slice(-40)));
    } catch {
      /* abaikan */
    }
  }, [messages]);

  const isStreamingNow = useMemo(() => messages.some((m) => m.streaming), [messages]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    if (messages.length > 1 || loading) {
      if (isStreamingNow) {
        el.scrollTop = el.scrollHeight;
      } else {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      }
    }
  }, [messages, loading, isStreamingNow]);

  useEffect(() => {
    fetch("/api/system/status")
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (j) =>
          j?.ai &&
          setAi({
            available: j.ai.available && j.governance?.copilot_mode !== "DETERMINISTIC_ONLY",
            label: j.ai.provider_label,
            model: j.ai.model,
            embeddingModel: j.embedding?.model || j.ai.embedding_model,
            reason:
              j.governance?.copilot_mode === "DETERMINISTIC_ONLY"
                ? "Kebijakan tata kelola: mode deterministik (tanpa LLM)."
                : j.ai.reason,
            policy: j.governance?.copilot_mode === "DETERMINISTIC_ONLY",
          })
      )
      .catch(() => {});

    Promise.all([
      fetch("/api/claims?sort_by=risk_score&limit=5").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/dashboard").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([c, d]) => {
        const topProvs = [...(d?.province_risk || [])]
          .filter((p: { total_claims: number }) => p.total_claims > 0)
          .sort(
            (a: { potential_exposure: number }, b: { potential_exposure: number }) =>
              b.potential_exposure - a.potential_exposure
          );
        const topClaimsList = Array.isArray(c?.data)
          ? [...(c.data as TopClaimItem[])].sort((a, b) => b.risk_score - a.risk_score)
          : [];
        const topProvidersList = Array.isArray(d?.top_providers)
          ? (d.top_providers as TopProviderItem[]).slice(0, 5)
          : [];
        setLive({
          claim: topClaimsList[0]?.claim_id,
          p1: topProvs[0]?.province_name,
          p2: topProvs[1]?.province_name,
          topClaims: topClaimsList.slice(0, 5),
          topProviders: topProvidersList,
          totalClaims: d?.kpis?.total_claims_analyzed,
          highRiskClaims: d?.kpis?.high_risk_claims,
          totalExposure: d?.kpis?.potential_exposure,
        });
      })
      .catch(() => {});
  }, []);

  const starterCards = useMemo(() => {
    const cId = live.claim || "CLM-10293";
    const prov1 = live.p1 || "DKI Jakarta";
    const prov2 = live.p2 || "Jawa Barat";
    return [
      {
        index: "01",
        category: "Forensik Klaim Kritis",
        badge: cId,
        badgeColor: "bg-risk-critical-bg text-risk-critical border-risk-critical-border",
        icon: ForensicCrosshairIcon,
        accent: "text-risk-critical border-risk-critical/25 bg-risk-critical-bg/60",
        title: `Bedah Temuan & Bukti Klaim ${cId}`,
        prompt: `Mengapa klaim ${cId} dianggap berisiko?`,
        desc: "Telusuri sinyal detektor, kontradiksi dokumen rekam medis, dan selisih tarif terhadap peer.",
      },
      {
        index: "02",
        category: "Audit Fasilitas Kesehatan",
        badge: "Profil Faskes",
        badgeColor: "bg-bpjs-soft text-bpjs-dark border-bpjs-border",
        icon: FacilityMatrixIcon,
        accent: "text-bpjs-dark border-bpjs-border bg-bpjs-soft/70",
        title: "Faskes Paling Berisiko & Polanya",
        prompt: "Faskes mana yang paling berisiko dan apa polanya?",
        desc: "Identifikasi rumah sakit dengan rasio klaim risiko tinggi, severity-3, dan eksposur terbesar.",
      },
      {
        index: "03",
        category: "Komparasi Kewajaran Nasional",
        badge: "Acuan BPJS 2018",
        badgeColor: "bg-intel-light text-intel-deep border-intel-border",
        icon: BenchmarkDeltaIcon,
        accent: "text-intel-deep border-intel-border bg-intel-light/70",
        title: `Uji Kewajaran Biaya Klaim ${cId}`,
        prompt: `Apakah biaya klaim ${cId} wajar dibanding rerata nasional BPJS?`,
        desc: "Bandingkan nilai tagihan dan lama rawat (LOS) dengan agregat resmi Portal Data BPJS.",
      },
      {
        index: "04",
        category: "Intelijen Geospasial",
        badge: `${prov1} vs ${prov2}`,
        badgeColor: "bg-risk-medium-bg text-risk-medium border-risk-medium-border",
        icon: GeoGridIcon,
        accent: "text-risk-medium border-risk-medium-border bg-risk-medium-bg/70",
        title: `Bandingkan Risiko ${prov1} & ${prov2}`,
        prompt: `Bandingkan risiko ${prov1} dan ${prov2}`,
        desc: "Komparasi volume klaim berisiko tinggi, eksposur rupiah, serta modus dominan antarprovinsi.",
      },
    ];
  }, [live.claim, live.p1, live.p2]);

  const newChat = () => {
    const prevCtrl = abortRef.current;
    abortRef.current = null;
    prevCtrl?.abort();
    setMessages([greeting()]);
    setLoading(false);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* abaikan */
    }
  };

  const stop = () => abortRef.current?.abort();

  const cleanStreamingPreview = (s: string) =>
    s
      .replace(/\[[^\]\n]{2,120}\]/g, "")
      .replace(/\[[^\]\n]{0,80}$/, "");

  const handleSend = async (queryText?: string) => {
    const q = (queryText || input).trim();
    if (!q || loading || isStreamingNow) return;
    const stamp = Date.now();
    setMessages((prev) => [
      ...prev,
      { id: `usr-${stamp}`, sender: "USER", text: q, timestamp: new Date().toISOString() },
    ]);
    setInput("");
    setLoading(true);

    const aiId = `ai-${stamp}`;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const upsert = (patch: Partial<Message>) =>
      setMessages((prev) =>
        prev.some((m) => m.id === aiId)
          ? prev.map((m) => (m.id === aiId ? { ...m, ...patch } : m))
          : [...prev, { id: aiId, sender: "AI", text: "", timestamp: new Date().toISOString(), ...patch }]
      );
    let raw = "";
    try {
      const res = await fetch("/api/copilot?stream=1", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ question: q }),
        signal: ctrl.signal,
      });
      if (res.status === 429)
        throw new Error("Terlalu banyak pertanyaan dalam waktu singkat. Tunggu sebentar lalu coba lagi.");
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Permintaan gagal");
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let started = false;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n\n")) >= 0) {
          const line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 2);
          if (!line.startsWith("data:")) continue;
          const ev = JSON.parse(line.slice(5).trim());
          if (ev.type === "start") {
            setLoading(false);
            started = true;
            upsert({
              text: "",
              mode: ev.mode,
              provider: ev.provider,
              model: ev.model,
              streaming: true,
            });
          } else if (ev.type === "delta") {
            raw += ev.text;
            upsert({ text: cleanStreamingPreview(raw), streaming: true });
          } else if (ev.type === "final") {
            const d = ev.response;
            upsert({
              text: d.answer,
              mode: d.mode,
              provider: d.provider,
              model: d.model,
              fallback_reason: d.fallback_reason,
              grounding: d.grounding,
              confidence: d.confidence,
              evidence_citations: d.evidence_citations,
              entity_links: d.entity_links,
              suggested_followups: d.suggested_followups,
              streaming: false,
            });
          } else if (ev.type === "error") {
            throw new Error(ev.error);
          }
        }
      }
      if (!started) throw new Error("Tidak ada respons dari server");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        if (abortRef.current !== ctrl) return;
        upsert({
          text: `${cleanStreamingPreview(raw).trim() || "(dihentikan)"}\n\n*Aliran respons dihentikan oleh pengguna sebelum sitasi divalidasi penuh.*`,
          streaming: false,
          evidence_citations: [],
          grounding: undefined,
          confidence: undefined,
        });
      } else {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== aiId || m.text),
          {
            id: `err-${Date.now()}`,
            sender: "AI",
            text: `Permintaan gagal: ${e instanceof Error ? e.message : "kesalahan tidak diketahui"}`,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } finally {
      if (abortRef.current === ctrl) {
        setLoading(false);
        abortRef.current = null;
      }
    }
  };

  const copy = async (m: Message) => {
    try {
      await navigator.clipboard.writeText(plainAnswer(m));
      setCopiedId(m.id);
      setTimeout(() => setCopiedId((c) => (c === m.id ? null : c)), 1800);
    } catch {
      /* clipboard tidak tersedia */
    }
  };

  const busy = loading || isStreamingNow;
  const isWelcomeState = messages.length <= 1 && !loading;

  return (
    <DashboardShell>
      {/* Top Workspace Header — Simple & Clean */}
      <div className="flex items-center justify-between gap-3 bg-surface rounded-xl border border-jkn-border px-4 py-3 shadow-subtle">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-xl bg-slate-900 text-teal-400 border border-slate-800 shadow-subtle flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <ArsaGlyph className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-jkn-text tracking-tight">Arsa Copilot</h1>
            <p className="text-xs text-jkn-muted truncate">
              Asisten investigasi klaim &amp; fasilitas kesehatan JKN berbasis bukti.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={newChat}
          className="h-9 px-3.5 rounded-lg border border-jkn-border bg-white text-xs font-semibold text-jkn-text hover:border-bpjs hover:text-bpjs-dark hover:bg-bpjs-soft/40 inline-flex items-center gap-1.5 transition-all shadow-subtle shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Percakapan Baru</span>
        </button>
      </div>

      {/* Main 2-Column Intelligence Workspace — Equal Locked Height on Desktop (Zero Blank Space) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:h-[calc(100vh-11.5rem)] lg:min-h-[600px] items-stretch">
        {/* Left/Center Column: Conversation & Forensic Canvas (8 cols) */}
        <div className="lg:col-span-8 xl:col-span-8 2xl:col-span-9 bg-surface rounded-xl border border-jkn-border shadow-card flex flex-col h-[640px] lg:h-full min-h-0 overflow-hidden">
          {/* Scrollable Message & Welcome Area */}
          <div
            ref={scrollContainerRef}
            className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5"
            role="log"
            aria-label="Percakapan dengan Arsa Copilot"
            aria-live="polite"
          >
            {isWelcomeState ? (
              <div className="max-w-3xl mx-auto space-y-5 py-1 animate-in fade-in duration-150">
                {/* Clean Welcome Card */}
                <div className="rounded-xl border border-jkn-border bg-surface-secondary/60 p-5 shadow-subtle">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-teal-400 flex items-center justify-center shrink-0">
                      <ArsaGlyph className="w-5 h-5" />
                    </div>
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="text-sm text-jkn-text leading-relaxed">
                        {renderAnswer(messages[0]?.text || greeting().text, "msg-1")}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2x2 Categorized Forensic Starter Cards */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-jkn-text uppercase tracking-wider">
                      Mulai Investigasi
                    </span>
                    <span className="text-[11px] text-jkn-dim">Pilih topik atau ketik pertanyaan di bawah</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {starterCards.map((card) => {
                      const Icon = card.icon;
                      return (
                        <button
                          key={card.index}
                          type="button"
                          onClick={() => handleSend(card.prompt)}
                          disabled={busy}
                          className="group text-left p-4 rounded-xl bg-white border border-jkn-border hover:border-bpjs hover:bg-bpjs-soft/15 transition-all shadow-subtle hover:shadow-card flex flex-col justify-between gap-3 disabled:opacity-50"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-7 h-7 rounded-lg border flex items-center justify-center ${card.accent}`}
                                >
                                  <Icon className="w-4 h-4" />
                                </span>
                                <span className="text-[11px] font-bold text-jkn-muted">{card.category}</span>
                              </div>
                              <span
                                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${card.badgeColor}`}
                              >
                                {card.badge}
                              </span>
                            </div>
                            <div className="text-sm font-bold text-jkn-text group-hover:text-bpjs-dark transition-colors">
                              {card.title}
                            </div>
                            <p className="text-xs text-jkn-muted leading-relaxed line-clamp-2">{card.desc}</p>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-jkn-divider text-xs font-semibold text-bpjs-dark">
                            <span className="truncate pr-2">{card.prompt}</span>
                            <ArrowRight
                              className="w-3.5 h-3.5 shrink-0 group-hover:translate-x-1 transition-transform"
                              aria-hidden="true"
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg, msgIdx) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${
                    msg.sender === "USER" ? "max-w-2xl ml-auto flex-row-reverse" : "max-w-3xl mr-auto"
                  }`}
                >
                  {/* Precision Avatar Badge */}
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 font-mono text-xs font-bold ${
                      msg.sender === "USER"
                        ? "bg-slate-800 text-white border border-slate-700"
                        : "bg-slate-900 text-teal-400 border border-slate-800 shadow-subtle"
                    }`}
                    aria-hidden="true"
                  >
                    {msg.sender === "USER" ? userInitials : <ArsaGlyph className="w-4 h-4" />}
                  </div>

                  <div className="space-y-2.5 min-w-0 flex-1">
                    <div
                      className={`rounded-xl text-sm leading-relaxed ${
                        msg.sender === "USER"
                          ? "p-3.5 bg-slate-900 text-white rounded-tr-none font-medium shadow-subtle"
                          : "bg-white border border-jkn-border text-jkn-text rounded-tl-none shadow-subtle overflow-hidden"
                      }`}
                    >
                      {/* AI Card Header Bar — Simple */}
                      {msg.sender === "AI" && msg.id !== "msg-1" && (
                        <div className="flex items-center justify-between gap-2 px-4 py-2 bg-surface-secondary/60 border-b border-jkn-divider text-xs">
                          {msg.streaming ? (
                            <span className="inline-flex items-center gap-2 text-bpjs-dark font-semibold">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-bpjs opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-bpjs" />
                              </span>
                              <span>Menyusun analisis...</span>
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-jkn-text">Hasil Analisis</span>
                              {msg.grounding && msg.grounding.valid_citations > 0 && (
                                <span className="px-2 py-0.5 rounded bg-bpjs-soft text-bpjs-dark border border-bpjs-border text-[11px] font-medium tabular-nums">
                                  {msg.grounding.valid_citations} bukti rujukan
                                </span>
                              )}
                            </div>
                          )}

                          {!msg.streaming && (
                            <button
                              type="button"
                              onClick={() => copy(msg)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white text-jkn-muted hover:text-jkn-text transition-colors"
                              aria-label="Salin jawaban beserta buktinya"
                            >
                              {copiedId === msg.id ? (
                                <Check className="w-3.5 h-3.5 text-bpjs" aria-hidden="true" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                              )}
                              <span>{copiedId === msg.id ? "Tersalin" : "Salin"}</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* Message Content */}
                      <div className={msg.sender === "AI" ? "p-4" : "whitespace-pre-line"}>
                        {msg.sender === "AI" ? (
                          msg.streaming && !msg.text ? (
                            <div className="flex items-center gap-2 text-xs text-jkn-muted py-1">
                              <span className="w-2 h-2 rounded-full bg-bpjs animate-ping" />
                              <span>Menyusun analisis &amp; memeriksa rujukan bukti...</span>
                            </div>
                          ) : (
                            renderAnswer(msg.text, msg.id)
                          )
                        ) : (
                          msg.text
                        )}
                        {msg.streaming && msg.text && (
                          <span
                            className="inline-block w-2 h-4 ml-1 bg-bpjs animate-pulse align-middle rounded-xs"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                    </div>

                    {/* Cited Evidence Cards */}
                    {msg.evidence_citations && msg.evidence_citations.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-surface-secondary/50 border border-jkn-border text-sm space-y-2 shadow-subtle">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-bpjs-dark flex items-center gap-1.5">
                            <EvidenceDocIcon className="w-3.5 h-3.5 text-bpjs" />
                            <span>Bukti &amp; Referensi ({msg.evidence_citations.length})</span>
                          </span>
                          <span className="text-[11px] text-jkn-dim">Klik angka [n] di teks untuk sorot bukti</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {msg.evidence_citations.map((ev) => (
                            <div
                              key={ev.evidence_id}
                              id={`${msg.id}-ref-${ev.ref}`}
                              className={`p-2.5 rounded-lg bg-white border border-jkn-divider border-l-[3px] scroll-mt-20 target:ring-2 target:ring-bpjs transition-all ${
                                ev.status === "CONTRADICTS_CLAIM"
                                  ? "border-l-risk-critical"
                                  : ev.status === "SUPPORTS_CLAIM"
                                  ? "border-l-bpjs"
                                  : "border-l-risk-medium"
                              }`}
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded bg-slate-900 text-teal-300 text-[11px] font-bold font-mono tabular-nums">
                                  {ev.ref}
                                </span>
                                <span className="text-xs font-bold text-jkn-text">{ev.title}</span>
                                <span className="text-[11px] font-mono text-jkn-dim px-1.5 py-0.5 rounded bg-surface-secondary">
                                  {ev.evidence_id}
                                </span>
                                <span
                                  className={`ml-auto text-[10px] px-2 py-0.5 rounded font-semibold ${
                                    ev.status === "CONTRADICTS_CLAIM"
                                      ? "bg-risk-critical-bg text-risk-critical border border-risk-critical-border"
                                      : ev.status === "SUPPORTS_CLAIM"
                                      ? "bg-risk-low-bg text-risk-low border border-risk-low-border"
                                      : "bg-risk-medium-bg text-risk-medium border border-risk-medium-border"
                                  }`}
                                >
                                  {ev.status === "CONTRADICTS_CLAIM"
                                    ? "Kontradiksi Klaim"
                                    : ev.status === "SUPPORTS_CLAIM"
                                    ? "Mendukung Klaim"
                                    : "Konteks Acuan"}
                                </span>
                              </div>
                              <p className="text-jkn-muted text-xs leading-relaxed mt-1.5 pl-7">
                                &ldquo;{ev.excerpt}&rdquo;
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Entity Action Links */}
                    {msg.entity_links && msg.entity_links.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {msg.entity_links.map((link, idx) => (
                          <Link
                            key={idx}
                            href={linkHref(link)}
                            className="inline-flex items-center gap-2 h-8 px-3 rounded-lg bg-white border border-bpjs-border hover:border-bpjs hover:bg-bpjs-soft/60 text-xs font-semibold text-bpjs-dark transition-all shadow-subtle group"
                          >
                            <span>{link.label}</span>
                            {link.risk_score !== undefined && (
                              <span className="px-1.5 py-0.5 rounded bg-risk-critical-bg text-risk-critical text-[11px] font-bold font-mono tabular-nums">
                                {link.risk_score}
                              </span>
                            )}
                            <ArrowRight
                              className="w-3.5 h-3.5 text-bpjs group-hover:translate-x-0.5 transition-transform"
                              aria-hidden="true"
                            />
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* Suggested Follow-ups (hanya pada pesan AI terbaru agar tidak menumpuk) */}
                    {msgIdx === messages.length - 1 &&
                      msg.suggested_followups &&
                      msg.suggested_followups.length > 0 &&
                      !msg.streaming && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[11px] font-semibold text-jkn-dim block">
                            Tindak Lanjut Investigasi:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.suggested_followups.map((sug, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => handleSend(sug)}
                                disabled={busy}
                                className="text-xs px-3 py-1.5 rounded-lg bg-surface-secondary/80 border border-jkn-border hover:border-bpjs hover:bg-bpjs-soft text-jkn-text font-medium transition-colors text-left inline-flex items-center gap-1.5 disabled:opacity-50"
                              >
                                <span className="font-mono text-bpjs font-bold">&gt;</span>
                                <span>{sug}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div className="flex items-center gap-3 text-xs font-medium text-jkn-muted p-3.5 bg-surface-secondary/70 rounded-xl w-fit border border-jkn-border shadow-subtle">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-bpjs opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-bpjs" />
                </span>
                <span>Memeriksa data klaim &amp; menyusun analisis...</span>
              </div>
            )}
          </div>

          {/* Bottom Composer Form */}
          <form
            className="p-3.5 border-t border-jkn-border bg-white flex items-center gap-2.5 shrink-0"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <label htmlFor="copilot-input" className="sr-only">
              Pertanyaan investigasi
            </label>
            <div className="relative flex-1">
              <CommandPromptIcon className="w-4 h-4 text-bpjs absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="copilot-input"
                type="text"
                maxLength={1000}
                placeholder={
                  live.claim
                    ? `Tanyakan klaim (mis. mengapa klaim ${live.claim} berisiko?), faskes, atau provinsi...`
                    : "Tulis pertanyaan investigasi klaim, faskes, atau provinsi..."
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full h-11 text-sm pl-10 pr-4 rounded-xl bg-surface-secondary/70 border border-jkn-border text-jkn-text outline-hidden focus:border-bpjs focus:bg-white focus:ring-2 focus:ring-bpjs/15 transition-all"
              />
            </div>
            {busy ? (
              <button
                type="button"
                onClick={stop}
                className="h-11 px-4 rounded-xl border border-risk-critical-border bg-risk-critical-bg text-xs font-bold text-risk-critical hover:bg-red-100 transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Square className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Hentikan</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="h-11 px-5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-bpjs-dark disabled:opacity-40 transition-all shadow-subtle flex items-center gap-2 shrink-0"
              >
                <span>Kirim</span>
                <TransmitArrowIcon className="w-3.5 h-3.5 text-teal-400" />
              </button>
            )}
          </form>
        </div>

        {/* Right Column: Clean 2-Tab Context Panel (Klaim & Faskes) */}
        <div className="lg:col-span-4 xl:col-span-4 2xl:col-span-3 bg-surface rounded-xl border border-jkn-border shadow-card flex flex-col h-[520px] lg:h-full min-h-0 overflow-hidden">
          {/* Inspector Header & Segmented Switcher */}
          <div className="p-3.5 border-b border-jkn-divider bg-surface-secondary/40 space-y-2.5 shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-jkn-text uppercase tracking-wider">Prioritas Audit</h2>
              <span className="text-[11px] text-jkn-dim">Klik untuk analisis</span>
            </div>

            {/* Segmented Tab Controls (2 Tabs: Klaim & Faskes) */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-surface-secondary border border-jkn-divider text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("claims")}
                className={`py-1.5 px-2.5 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "claims"
                    ? "bg-white text-jkn-text shadow-subtle border border-jkn-border/60"
                    : "text-jkn-muted hover:text-jkn-text"
                }`}
              >
                <span>Klaim Kritis</span>
                {live.topClaims.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded bg-risk-critical-bg text-risk-critical font-mono text-[10px]">
                    {live.topClaims.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("providers")}
                className={`py-1.5 px-2.5 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "providers"
                    ? "bg-white text-jkn-text shadow-subtle border border-jkn-border/60"
                    : "text-jkn-muted hover:text-jkn-text"
                }`}
              >
                <span>Faskes</span>
                {live.topProviders.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded bg-bpjs-soft text-bpjs-dark font-mono text-[10px]">
                    {live.topProviders.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Scrollable Inspector Body */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-2.5">
            {activeTab === "claims" ? (
              <>
                <div className="flex items-center justify-between text-[11px] text-jkn-muted pb-0.5">
                  <span>Klaim skor tertinggi:</span>
                  <Link href="/investigation-queue" className="font-semibold text-bpjs hover:underline">
                    Semua →
                  </Link>
                </div>
                {live.topClaims.length === 0 ? (
                  <div className="text-xs text-jkn-dim py-6 text-center bg-surface-secondary/50 rounded-lg">
                    Memuat daftar klaim...
                  </div>
                ) : (
                  live.topClaims.map((c) => (
                    <div
                      key={c.claim_id}
                      className="p-3 rounded-lg bg-surface-secondary/60 hover:bg-bpjs-soft/30 border border-jkn-divider hover:border-bpjs-border transition-all space-y-1.5 group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleSend(`Mengapa klaim ${c.claim_id} dianggap berisiko?`)}
                          disabled={busy}
                          className="font-mono text-xs font-bold text-jkn-text group-hover:text-bpjs-dark flex items-center gap-1.5 text-left"
                        >
                          <span>{c.claim_id}</span>
                          <span className="px-1.5 py-0.5 rounded bg-risk-critical-bg text-risk-critical border border-risk-critical-border text-[10px] tabular-nums">
                            {c.risk_score}
                          </span>
                        </button>
                        <Link
                          href={
                            c.investigation_id
                              ? `/investigations/${c.investigation_id}`
                              : `/investigations/${c.claim_id}`
                          }
                          title={`Buka berkas investigasi ${c.claim_id}`}
                          className="p-1 rounded hover:bg-white text-jkn-dim hover:text-bpjs transition-colors"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                      <div className="text-[11px] text-jkn-muted truncate">{c.provider.name}</div>
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-jkn-divider/60">
                        <span className="font-mono text-risk-critical font-semibold tabular-nums">
                          +{formatRupiah(c.tariff_difference || 0)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSend(`Mengapa klaim ${c.claim_id} dianggap berisiko?`)}
                          disabled={busy}
                          className="text-[11px] font-semibold text-bpjs-dark hover:underline inline-flex items-center gap-1 disabled:opacity-50"
                        >
                          <span>Analisis</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between text-[11px] text-jkn-muted pb-0.5">
                  <span>Faskes risiko tertinggi:</span>
                  <Link href="/providers" className="font-semibold text-bpjs hover:underline">
                    Semua →
                  </Link>
                </div>
                {live.topProviders.map((p) => (
                  <button
                    key={p.provider_id}
                    type="button"
                    onClick={() => handleSend(`Bagaimana profil risiko dan pola klaim di ${p.name}?`)}
                    disabled={busy}
                    className="w-full text-left p-3 rounded-lg bg-surface-secondary/60 hover:bg-bpjs-soft/30 border border-jkn-divider hover:border-bpjs-border transition-all space-y-1.5 group disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-jkn-text group-hover:text-bpjs-dark truncate">
                        {p.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-risk-high-bg text-risk-high border border-risk-high-border font-mono text-[10px] font-bold shrink-0 tabular-nums">
                        {p.risk_score}
                      </span>
                    </div>
                    <div className="text-[11px] text-jkn-muted">
                      {p.province_name} · {p.high_risk_claims}/{p.total_claims} klaim tinggi
                    </div>
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-jkn-divider/60">
                      <span className="font-mono text-jkn-text font-semibold tabular-nums">
                        {formatRupiah(p.potential_exposure || 0)}
                      </span>
                      <span className="font-semibold text-bpjs-dark group-hover:underline inline-flex items-center gap-1">
                        <span>Analisis</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
