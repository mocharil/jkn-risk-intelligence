"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth/client";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ArsaGlyph, CopilotMessages } from "@/components/ai/CopilotMessages";
import { useCopilotChat } from "@/components/ai/useCopilotChat";
import { useChatAutoScroll } from "@/components/ai/useChatAutoScroll";
import { formatRupiah } from "@/lib/formatting/currency";
import { ArrowRight, RotateCcw, Square } from "lucide-react";

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

type InspectorTab = "claims" | "providers";

const STORAGE_KEY = "arsa.copilot.v1";

/* ============================================================================
 * Ikon vektor geometris untuk kartu pertanyaan awal
 * ============================================================================ */

function ForensicCrosshairIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="10" cy="10" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="10" r="2.25" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 1.75V4.5M10 15.5V18.25M1.75 10H4.5M15.5 10H18.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function FacilityMatrixIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <rect x="2.5" y="3.5" width="6.5" height="13" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="7.5" width="6.5" height="9" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.75 6.5H6.75M4.75 9.5H6.75M4.75 12.5H6.75M13.25 10.5H15.25M13.25 13.5H15.25" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M9 10H11" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.5" />
    </svg>
  );
}

function BenchmarkDeltaIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M2.5 16.5H17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="4" y="9.5" width="3" height="7" rx="0.75" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.4" />
      <rect x="8.5" y="5.5" width="3" height="11" rx="0.75" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.4" />
      <rect x="13" y="3.5" width="3" height="13" rx="0.75" fill="currentColor" fillOpacity="0.35" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.5 7.5H17.5" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2" strokeOpacity="0.6" />
    </svg>
  );
}

function GeoGridIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M3 5.2L7.8 3.2L12.2 5.2L17 3.2V14.8L12.2 16.8L7.8 14.8L3 16.8V5.2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7.8 3.2V14.8M12.2 5.2V16.8" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.55" />
    </svg>
  );
}

function TransmitArrowIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AICopilotPage() {
  const { user } = useSession();
  const firstName = user?.name?.split(" ")[0] || "Investigator";

  const { messages, loading, busy, send, stop, newChat } = useCopilotChat({ storageKey: STORAGE_KEY });
  const [input, setInput] = useState("");
  const [activeTab, setActiveTab] = useState<InspectorTab>("claims");
  const [live, setLive] = useState<{
    claim?: string;
    p1?: string;
    p2?: string;
    topClaims: TopClaimItem[];
    topProviders: TopProviderItem[];
  }>({ topClaims: [], topProviders: [] });

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  useChatAutoScroll(scrollContainerRef, messages, loading);

  useEffect(() => {
    Promise.all([
      fetch("/api/claims?sort_by=risk_score&limit=5").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/dashboard").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([c, d]) => {
        const topProvs = [...(d?.province_risk || [])]
          .filter((p: { total_claims: number }) => p.total_claims > 0)
          .sort((a: { potential_exposure: number }, b: { potential_exposure: number }) => b.potential_exposure - a.potential_exposure);
        const topClaimsList = Array.isArray(c?.data) ? [...(c.data as TopClaimItem[])].sort((a, b) => b.risk_score - a.risk_score) : [];
        const topProvidersList = Array.isArray(d?.top_providers) ? (d.top_providers as TopProviderItem[]).slice(0, 5) : [];
        setLive({
          claim: topClaimsList[0]?.claim_id,
          p1: topProvs[0]?.province_name,
          p2: topProvs[1]?.province_name,
          topClaims: topClaimsList.slice(0, 5),
          topProviders: topProvidersList,
        });
      })
      .catch(() => {});
  }, []);

  const starterCards = useMemo(() => {
    const cId = live.claim || "klaim teratas";
    const prov1 = live.p1 || "provinsi risiko tertinggi";
    const prov2 = live.p2 || "provinsi lain";
    return [
      {
        index: "01",
        icon: ForensicCrosshairIcon,
        title: `Mengapa klaim ${cId} berisiko?`,
        prompt: `Mengapa klaim ${cId} dianggap berisiko?`,
      },
      {
        index: "02",
        icon: FacilityMatrixIcon,
        title: "Faskes paling berisiko dan polanya",
        prompt: "Faskes mana yang paling berisiko dan apa polanya?",
      },
      {
        index: "03",
        icon: BenchmarkDeltaIcon,
        title: `Wajarkah biaya klaim ${cId}?`,
        prompt: `Apakah biaya klaim ${cId} wajar dibanding rerata nasional BPJS?`,
      },
      {
        index: "04",
        icon: GeoGridIcon,
        title: `${prov1} dibanding ${prov2}`,
        prompt: `Bandingkan risiko ${prov1} dan ${prov2}`,
      },
    ];
  }, [live.claim, live.p1, live.p2]);

  const ask = (q: string) => {
    if (busy) return;
    send(q);
  };

  const submit = () => {
    const q = input.trim();
    if (!q || busy) return;
    setInput("");
    send(q);
  };

  const isWelcomeState = messages.length === 0 && !loading;

  return (
    <DashboardShell>
      <h1 className="sr-only">Arsa Copilot</h1>

      {/* Main 2-Column Intelligence Workspace — Equal Locked Height on Desktop (Zero Blank Space) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:h-[calc(100vh-8.5rem)] lg:min-h-[600px] items-stretch">
        {/* Left/Center Column: Conversation & Forensic Canvas (8 cols) */}
        <div className="lg:col-span-8 xl:col-span-8 2xl:col-span-9 relative bg-white rounded-2xl border border-jkn-border/70 flex flex-col h-[640px] lg:h-full min-h-0 overflow-hidden">
          {!isWelcomeState && (
            <div className="flex justify-end px-4 pt-2 shrink-0">
              <button type="button" onClick={newChat} className="h-8 px-3 rounded-full text-xs font-medium text-jkn-muted hover:text-jkn-text hover:bg-frame inline-flex items-center gap-1.5 transition-colors">
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Percakapan baru</span>
              </button>
            </div>
          )}
          {/* Scrollable Message & Welcome Area */}
          <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 pb-4 sm:pb-6 pt-4 sm:pt-6" role="log" aria-label="Percakapan dengan Arsa Copilot" aria-live="polite">
            {isWelcomeState ? (
              <div className="h-full min-h-[420px] flex flex-col items-center justify-center text-center max-w-2xl mx-auto gap-9 py-6 animate-in fade-in duration-150">
                <div className="space-y-3">
                  <span className="mx-auto w-12 h-12 rounded-full bg-[#0B291C] text-teal-300 grid place-items-center" aria-hidden="true">
                    <ArsaGlyph className="w-6 h-6" />
                  </span>
                  <h2 className="text-3xl font-semibold text-jkn-text">Halo, {firstName}</h2>
                  <p className="text-base text-jkn-muted">Apa yang ingin Anda periksa hari ini?</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                  {starterCards.map((card) => {
                    const Icon = card.icon;
                    return (
                      <button
                        key={card.index}
                        type="button"
                        onClick={() => ask(card.prompt)}
                        disabled={busy}
                        className="group flex items-center gap-3 text-left rounded-2xl border border-jkn-border/70 px-4 py-3.5 hover:border-bpjs/50 hover:bg-frame/50 transition-colors disabled:opacity-50"
                      >
                        <span className="w-9 h-9 rounded-xl bg-frame text-bpjs-dark grid place-items-center shrink-0 group-hover:bg-white transition-colors">
                          <Icon className="w-[18px] h-[18px]" />
                        </span>
                        <span className="text-sm font-medium text-jkn-text leading-snug">{card.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <CopilotMessages messages={messages} loading={loading} busy={busy} onAsk={ask} />
            )}
          </div>

          {/* Composer */}
          <form
            className="px-4 pb-4 pt-2 bg-white shrink-0"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <label htmlFor="copilot-input" className="sr-only">
              Pertanyaan investigasi
            </label>
            <div className="max-w-3xl mx-auto flex items-center gap-2 rounded-full border border-jkn-border bg-white pl-5 pr-2 h-12 focus-within:border-bpjs focus-within:ring-4 focus-within:ring-bpjs/10 transition-all">
              <input
                id="copilot-input"
                type="text"
                maxLength={1000}
                placeholder={live.claim ? `Tanyakan sesuatu, misalnya mengapa klaim ${live.claim} berisiko` : "Tanyakan klaim, faskes, atau provinsi"}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 min-w-0 h-full text-sm bg-transparent text-jkn-text outline-none focus:outline-none focus-visible:outline-none placeholder:text-jkn-dim"
              />
              {busy ? (
                <button type="button" onClick={stop} aria-label="Hentikan" className="w-9 h-9 rounded-full bg-risk-critical-bg text-risk-critical grid place-items-center shrink-0 hover:bg-red-100 transition-colors">
                  <Square className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              ) : (
                <button type="submit" disabled={!input.trim()} aria-label="Kirim" className="w-9 h-9 rounded-full bg-[#0B291C] text-white grid place-items-center shrink-0 hover:bg-bpjs-dark disabled:opacity-30 transition-all">
                  <TransmitArrowIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right Column: Clean 2-Tab Context Panel (Klaim & Faskes) */}
        <div className="lg:col-span-4 xl:col-span-4 2xl:col-span-3 bg-white rounded-2xl border border-jkn-border/70 flex flex-col h-[520px] lg:h-full min-h-0 overflow-hidden">
          {/* Inspector Header & Segmented Switcher */}
          <div className="px-4 pt-4 pb-3 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-jkn-text">Prioritas audit</h2>
              <span className="text-[11px] text-jkn-dim">Klik untuk bertanya</span>
            </div>

            {/* Segmented Tab Controls (2 Tabs: Klaim & Faskes) */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-surface-secondary border border-jkn-divider text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("claims")}
                className={`py-1.5 px-2.5 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "claims" ? "bg-white text-jkn-text shadow-subtle border border-jkn-border/60" : "text-jkn-muted hover:text-jkn-text"
                }`}
              >
                <span>Klaim Kritis</span>
                {live.topClaims.length > 0 && <span className="px-1.5 py-0.2 rounded bg-risk-critical-bg text-risk-critical font-mono text-[10px]">{live.topClaims.length}</span>}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("providers")}
                className={`py-1.5 px-2.5 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "providers" ? "bg-white text-jkn-text shadow-subtle border border-jkn-border/60" : "text-jkn-muted hover:text-jkn-text"
                }`}
              >
                <span>Faskes</span>
                {live.topProviders.length > 0 && <span className="px-1.5 py-0.2 rounded bg-bpjs-soft text-bpjs-dark font-mono text-[10px]">{live.topProviders.length}</span>}
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
                  <div className="text-xs text-jkn-dim py-6 text-center bg-surface-secondary/50 rounded-lg">Memuat daftar klaim...</div>
                ) : (
                  <ul className="divide-y divide-jkn-divider -mx-1">
                    {live.topClaims.map((c) => (
                      <li key={c.claim_id} className="group flex items-center gap-3 px-1 py-2.5">
                        <button
                          type="button"
                          onClick={() => ask(`Mengapa klaim ${c.claim_id} dianggap berisiko?`)}
                          disabled={busy}
                          className="min-w-0 flex-1 text-left disabled:opacity-50"
                          title="Tanyakan Copilot mengapa klaim ini berisiko"
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-jkn-text group-hover:text-bpjs-dark tabular-nums">{c.claim_id}</span>
                            <span className="text-[11px] font-semibold text-risk-critical tabular-nums">{c.risk_score}</span>
                          </span>
                          <span className="block text-xs text-jkn-muted truncate">{c.provider.name}</span>
                        </button>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-semibold tabular-nums text-jkn-text">
                            {(c.tariff_difference || 0) > 0 ? formatRupiah(c.tariff_difference || 0, true) : <span className="font-normal text-jkn-dim">tanpa selisih</span>}
                          </div>
                          <Link
                            href={c.investigation_id ? `/investigations/${c.investigation_id}` : `/investigations/${c.claim_id}`}
                            title={`Buka berkas investigasi ${c.claim_id}`}
                            className="text-[11px] text-bpjs hover:underline"
                          >
                            Buka berkas
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
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
                    onClick={() => ask(`Bagaimana profil risiko dan pola klaim di ${p.name}?`)}
                    disabled={busy}
                    className="w-full text-left p-3 rounded-lg bg-surface-secondary/60 hover:bg-bpjs-soft/30 border border-jkn-divider hover:border-bpjs-border transition-all space-y-1.5 group disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-jkn-text group-hover:text-bpjs-dark truncate">{p.name}</span>
                      <span className="px-1.5 py-0.5 rounded bg-risk-high-bg text-risk-high border border-risk-high-border font-mono text-[10px] font-bold shrink-0 tabular-nums">{p.risk_score}</span>
                    </div>
                    <div className="text-[11px] text-jkn-muted">
                      {p.province_name} · {p.high_risk_claims}/{p.total_claims} klaim tinggi
                    </div>
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-jkn-divider/60">
                      <span className="font-mono text-jkn-text font-semibold tabular-nums">{formatRupiah(p.potential_exposure || 0)}</span>
                      <span className="font-semibold text-bpjs-dark group-hover:underline inline-flex items-center gap-1">
                        <span>Analisis</span>
                        <ArrowRight className="w-3 h-3" aria-hidden="true" />
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
