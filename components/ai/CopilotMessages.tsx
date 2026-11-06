"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy } from "lucide-react";
import { ModeBadge, renderCitedText } from "./CitedAnswer";
import { CopilotVisuals } from "./CopilotVisuals";
import type { ChatMessage } from "./useCopilotChat";

export function ArsaGlyph({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 2.5L20.5 7.25V16.75L12 21.5L3.5 16.75V7.25L12 2.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 6.5L16.8 9.25V14.75L12 17.5L7.2 14.75V9.25L12 6.5Z" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.55" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <path d="M12 2.5V6.5M20.5 7.25L16.8 9.25M20.5 16.75L16.8 14.75M12 21.5V17.5M3.5 16.75L7.2 14.75M3.5 7.25L7.2 9.25" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.45" />
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

type EntityLink = NonNullable<ChatMessage["entity_links"]>[number];

const linkHref = (l: EntityLink) =>
  l.href ||
  (l.type === "PROVIDER"
    ? `/providers/${l.id}`
    : l.type === "MAP"
    ? `/risk-intelligence?tab=peta&province=${l.id}`
    : l.type === "QUEUE"
    ? "/investigation-queue"
    : `/investigation-queue?mode=CLAIMS&search=${encodeURIComponent(l.id)}`);

function plainAnswer(m: ChatMessage): string {
  const cites = (m.evidence_citations || []).map((c) => `[${c.ref}] ${c.title} (${c.evidence_id}): ${c.excerpt}`);
  return [m.text, cites.length ? `\nBukti yang dikutip:\n${cites.join("\n")}` : ""].join("\n").trim();
}

function Dots({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`} aria-label={label}>
      <span className="w-1.5 h-1.5 rounded-full bg-jkn-dim animate-bounce [animation-delay:-0.3s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-jkn-dim animate-bounce [animation-delay:-0.15s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-jkn-dim animate-bounce" />
    </div>
  );
}

function AiMessage({ msg, isLast, busy, compact, onAsk }: { msg: ChatMessage; isLast: boolean; busy: boolean; compact: boolean; onAsk: (q: string) => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(plainAnswer(msg));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard tidak tersedia */
    }
  };

  return (
    <div data-msg-id={msg.id} className={`flex ${compact ? "gap-2" : "gap-3 max-w-3xl"}`}>
      <span className={`${compact ? "w-6 h-6" : "w-7 h-7"} rounded-full bg-[#0B291C] text-teal-300 grid place-items-center shrink-0 mt-0.5`} aria-hidden="true">
        <ArsaGlyph className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
      </span>
      <div className="min-w-0 flex-1 space-y-3">
        {msg.streaming && !msg.text ? (
          <Dots label="Menyusun jawaban" className="py-2" />
        ) : (
          <div className={compact ? "text-[13px] leading-6 text-jkn-text" : "text-[15px] leading-7 text-jkn-text"}>
            {renderCitedText(msg.text, msg.id, compact ? "sm" : "md")}
            {msg.streaming && msg.text && <span className="inline-block w-1.5 h-4 ml-1 bg-bpjs animate-pulse align-middle rounded-sm" aria-hidden="true" />}
          </div>
        )}

        {!msg.streaming && (
          <div className="flex items-center gap-3 flex-wrap text-xs text-jkn-dim">
            <span title={msg.mode === "deterministic" ? msg.fallback_reason : undefined}>
              <ModeBadge mode={msg.mode} />
            </span>
            {msg.grounding && msg.grounding.valid_citations > 0 && <span className="tabular-nums">{msg.grounding.valid_citations} sumber</span>}
            <button type="button" onClick={copy} className="inline-flex items-center gap-1 hover:text-jkn-text transition-colors" aria-label="Salin jawaban beserta sumbernya">
              {copied ? <Check className="w-3.5 h-3.5 text-bpjs" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
              <span>{copied ? "Tersalin" : "Salin"}</span>
            </button>
          </div>
        )}

        {!msg.streaming && msg.visuals && msg.visuals.length > 0 && <CopilotVisuals visuals={msg.visuals} compact={compact} />}

        {msg.evidence_citations && msg.evidence_citations.length > 0 && (
          // Panel sempit memang dipakai untuk menelaah bukti klaim, jadi sumber langsung terbuka di sana.
          <details open={compact} className="group rounded-2xl border border-jkn-border/70">
            <summary className="cursor-pointer list-none px-4 py-2.5 flex items-center justify-between text-sm text-jkn-muted hover:text-jkn-text">
              <span className="inline-flex items-center gap-2">
                <EvidenceDocIcon className="w-4 h-4 text-bpjs" />
                <span>Sumber ({msg.evidence_citations.length})</span>
              </span>
              <span className="text-xs group-open:hidden">Tampilkan</span>
              <span className="text-xs hidden group-open:inline">Sembunyikan</span>
            </summary>
            <ol className="px-4 pb-3 space-y-2.5">
              {msg.evidence_citations.map((ev) => (
                <li key={ev.evidence_id} id={`${msg.id}-ref-${ev.ref}`} className="flex gap-3 scroll-mt-20 target:bg-bpjs-soft/50 rounded-lg -mx-2 px-2 py-1 transition-colors">
                  <span className="w-5 h-5 rounded-full bg-frame text-jkn-text text-[11px] font-semibold grid place-items-center shrink-0 mt-0.5 tabular-nums">{ev.ref}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-jkn-text">{ev.title}</span>
                      <span className={`text-[11px] ${ev.status === "CONTRADICTS_CLAIM" ? "text-risk-critical" : ev.status === "SUPPORTS_CLAIM" ? "text-bpjs-dark" : "text-jkn-dim"}`}>
                        {ev.status === "CONTRADICTS_CLAIM" ? "kontradiksi" : ev.status === "SUPPORTS_CLAIM" ? "mendukung" : "acuan"}
                      </span>
                    </div>
                    <p className="text-xs text-jkn-muted leading-relaxed line-clamp-2" title={ev.excerpt}>
                      {ev.excerpt}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </details>
        )}

        {msg.entity_links && msg.entity_links.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {msg.entity_links.map((link, idx) => (
              <Link
                key={idx}
                href={linkHref(link)}
                className="inline-flex items-center gap-2 h-8 px-3.5 rounded-full border border-jkn-border/80 hover:border-bpjs/60 hover:bg-frame/60 text-xs font-medium text-jkn-text transition-colors group"
              >
                <span>{link.label}</span>
                {link.risk_score !== undefined && <span className="text-risk-critical font-semibold tabular-nums">{link.risk_score}</span>}
                <ArrowRight className="w-3 h-3 text-jkn-dim group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
              </Link>
            ))}
          </div>
        )}

        {isLast && msg.suggested_followups && msg.suggested_followups.length > 0 && !msg.streaming && (
          <div className="flex flex-wrap gap-2 pt-1">
            {msg.suggested_followups.map((sug, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onAsk(sug)}
                disabled={busy}
                className="text-xs px-3.5 py-1.5 rounded-full bg-frame/70 hover:bg-frame text-jkn-text transition-colors text-left disabled:opacity-50"
              >
                {sug}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Daftar percakapan Copilot: pertanyaan, jawaban bersitasi, visual, tautan, dan saran lanjutan, sama di semua tempat. */
export function CopilotMessages({ messages, loading, busy, onAsk, compact = false }: { messages: ChatMessage[]; loading: boolean; busy: boolean; onAsk: (q: string) => void; compact?: boolean }) {
  return (
    <div className={compact ? "space-y-4" : "space-y-5"}>
      {messages.map((msg, idx) =>
        msg.sender === "USER" ? (
          <div key={msg.id} className="flex justify-end">
            <div className={`max-w-[85%] rounded-2xl rounded-br-md bg-[#0B291C] text-white px-4 py-2.5 leading-relaxed whitespace-pre-line ${compact ? "text-xs" : "text-sm"}`}>{msg.text}</div>
          </div>
        ) : (
          <AiMessage key={msg.id} msg={msg} isLast={idx === messages.length - 1} busy={busy} compact={compact} onAsk={onAsk} />
        )
      )}
      {loading && <Dots label="Memeriksa data" className={compact ? "pl-8 py-1" : "pl-10 py-1"} />}
    </div>
  );
}
