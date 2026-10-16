"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/auth/client";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { RiskPill } from "@/components/ui/RiskPill";
import {
  Bot,
  Sparkles,
  Send,
  User,
  ArrowRight,
  ShieldAlert,
  FileText,
  Building2,
  Copy,
  ChevronRight,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  BadgeCheck,
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
  evidence_citations?: Array<{
    ref?: number;
    evidence_id: string;
    title: string;
    excerpt: string;
    status: string;
  }>;
  entity_links?: Array<{
    type: string;
    id: string;
    label: string;
    risk_score?: number;
  }>;
  suggested_followups?: string[];
  timestamp: string;
}

/** Render **tebal** dan penanda sitasi [n] sebagai lencana yang melompat ke daftar bukti. */
function renderAnswer(text: string, msgId: string) {
  return text.split(/(\*\*[^*]+\*\*|\[\d+\])/g).map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i}>{part.slice(2, -2)}</strong>;
    const ref = part.match(/^\[(\d+)\]$/);
    if (ref)
      return (
        <a key={i} href={`#${msgId}-ref-${ref[1]}`} className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 mx-0.5 rounded bg-bpjs-light text-bpjs-dark text-[9px] font-bold align-super hover:bg-bpjs hover:text-white transition-colors no-underline">
          {ref[1]}
        </a>
      );
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export default function AICopilotPage() {
  const { user } = useSession();
  const firstName = user?.name?.split(" ")[0] || "Investigator";
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages((prev) =>
      prev.length > 0
        ? prev
        : [
            {
              id: "msg-1",
              sender: "AI",
              text: `Halo ${firstName}, saya **Arsa Copilot**. Saya menjawab hanya dari data klaim yang sudah dianonimkan dan **selalu mengutip sumbernya** (finding, dokumen, klaim serupa) agar Anda dapat memverifikasi buktinya, bukan sekadar memercayai skor. Keputusan akhir tetap pada investigator.\n\nKlaim atau pola risiko apa yang ingin Anda telusuri?`,
              timestamp: new Date().toISOString(),
            },
          ]
    );
  }, [firstName]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, loading]);

  const quickPrompts = [
    "Mengapa klaim CLM-10293 dianggap kritis?",
    "Faskes mana yang paling berisiko dan apa polanya?",
    "Bandingkan risiko DKI Jakarta dan Jawa Timur",
    "Apa sinyal emergen minggu ini?",
    "Tampilkan klaim dengan indikasi cloning narasi medis",
  ];

  const handleSend = async (queryText?: string) => {
    const q = queryText || input;
    if (!q.trim() || loading) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: "USER",
      text: q,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const aiId = `ai-${Date.now()}`;
    try {
      const res = await fetch("/api/copilot?stream=1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Permintaan gagal");
      }

      // Server-Sent Events: start -> delta* -> final (jawaban tervalidasi menggantikan teks yang dialirkan)
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let raw = "";
      let started = false;
      const upsert = (patch: Partial<Message>) =>
        setMessages((prev) => (prev.some((m) => m.id === aiId) ? prev.map((m) => (m.id === aiId ? { ...m, ...patch } : m)) : [...prev, { id: aiId, sender: "AI", text: "", timestamp: new Date().toISOString(), ...patch }]));

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
            upsert({ text: ev.mode === "llm" ? "" : "Menyusun jawaban deterministik…", mode: ev.mode, provider: ev.provider, model: ev.model, streaming: true });
          } else if (ev.type === "delta") {
            raw += ev.text;
            // sembunyikan penanda sitasi mentah selama streaming; angka sitasi muncul setelah validasi
            upsert({ text: raw.replace(/\[[^\]\n]{2,120}\]/g, ""), streaming: true });
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
      setMessages((prev) => [...prev, { id: `err-${Date.now()}`, sender: "AI", text: `Maaf, permintaan gagal: ${e instanceof Error ? e.message : "kesalahan tidak diketahui"}`, timestamp: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardShell>
      {/* Title */}
      <div className="flex items-center justify-between border-b border-jkn-border pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-bpjs text-white shadow-subtle">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-jkn-text tracking-tight">Ruang Kerja Intelijen AI Copilot</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-intel-light text-intel-deep font-semibold border border-intel-border">
                Jawaban Bersitasi
              </span>
            </div>
            <p className="text-xs text-jkn-muted mt-0.5">
              Tanyakan temuan klinis, bandingkan benchmark faskes sejawat, atau telusuri bukti rekam medis
            </p>
          </div>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="bg-surface rounded-xl border border-jkn-border shadow-subtle flex flex-col h-[70vh] overflow-hidden">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${
                msg.sender === "USER" ? "ml-auto flex-row-reverse" : "mr-auto"
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                  msg.sender === "USER"
                    ? "bg-jkn-text text-white"
                    : "bg-bpjs text-white shadow-subtle"
                }`}
              >
                {msg.sender === "USER" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div className="space-y-2.5">
                <div
                  className={`p-3.5 rounded-xl text-xs leading-relaxed ${
                    msg.sender === "USER"
                      ? "bg-bpjs text-white rounded-tr-none font-medium shadow-subtle"
                      : "bg-surface-secondary/80 border border-jkn-border text-jkn-text rounded-tl-none space-y-2 shadow-subtle"
                  }`}
                >
                  <div className="whitespace-pre-line leading-relaxed" aria-live={msg.streaming ? "polite" : "off"}>{msg.sender === "AI" ? renderAnswer(msg.text, msg.id) : msg.text}{msg.streaming && <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-bpjs animate-pulse align-middle" aria-hidden="true" />}</div>

                  {/* Mode & grounding: selalu jujur apakah ini LLM atau deterministik */}
                  {msg.mode && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 border-t border-jkn-divider text-[10px] font-semibold">
                      {msg.mode === "llm" ? (
                        <span className="flex items-center gap-1 text-intel-deep"><BadgeCheck className="w-3 h-3" /> {msg.provider || "LLM"} ({msg.model}) · sitasi tervalidasi</span>
                      ) : (
                        <span className="flex items-center gap-1 text-risk-medium" title={msg.fallback_reason}><AlertTriangle className="w-3 h-3" /> Mode deterministik (tanpa LLM)</span>
                      )}
                      {msg.grounding && <span className="text-jkn-dim tabular-nums">{msg.grounding.valid_citations} sitasi valid{msg.grounding.removed_invalid_citations > 0 ? ` · ${msg.grounding.removed_invalid_citations} sitasi tidak valid dibuang` : ""}</span>}
                      {msg.confidence !== undefined && <span className="text-jkn-dim flex items-center gap-1 tabular-nums"><CheckCircle2 className="w-3 h-3 text-bpjs" /> Keyakinan {(msg.confidence * 100).toFixed(0)}%</span>}
                    </div>
                  )}
                  {msg.mode === "deterministic" && msg.fallback_reason && <div className="text-[10px] text-risk-medium/80">Alasan: {msg.fallback_reason}</div>}
                </div>

                {/* Evidence Citations */}
                {msg.evidence_citations && msg.evidence_citations.length > 0 && (
                  <div className="p-3 rounded-lg bg-white border border-jkn-border text-xs space-y-1.5 shadow-subtle">
                    <span className="text-[10px] font-bold text-bpjs uppercase tracking-wider block">
                      Bukti yang dikutip:
                    </span>
                    <div className="divide-y divide-jkn-divider">
                      {msg.evidence_citations.map((ev) => (
                        <div
                          key={ev.evidence_id}
                          id={`${msg.id}-ref-${ev.ref}`}
                          className="py-2 first:pt-1 last:pb-0 text-[11px] scroll-mt-20 target:ring-2 target:ring-bpjs rounded"
                        >
                          <div className="font-bold text-jkn-text flex items-center gap-1.5">
                            <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded bg-bpjs text-white text-[9px] font-mono tabular-nums">{ev.ref}</span>
                            {ev.title}
                            <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded-md font-semibold ${ev.status === "CONTRADICTS_CLAIM" ? "bg-risk-critical-bg text-risk-critical border border-risk-critical-border" : ev.status === "SUPPORTS_CLAIM" ? "bg-risk-low-bg text-risk-low border border-risk-low-border" : "bg-risk-medium-bg text-risk-medium border border-risk-medium-border"}`}>{ev.status === "CONTRADICTS_CLAIM" ? "Tidak mendukung klaim" : ev.status === "SUPPORTS_CLAIM" ? "Mendukung klaim" : "Perlu review"}</span>
                          </div>
                          <div className="text-[9px] font-mono text-jkn-dim mt-0.5">{ev.evidence_id}</div>
                          <p className="text-jkn-muted text-[10px] italic mt-0.5">&ldquo;{ev.excerpt}&rdquo;</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Entity Navigation Cards */}
                {msg.entity_links && msg.entity_links.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {msg.entity_links.map((link, idx) => (
                      <Link
                        key={idx}
                        href={
                          link.type === "CLAIM"
                            ? `/investigations/${link.id}`
                            : link.type === "SIMILAR_CLAIM"
                            ? `/claims?search=${encodeURIComponent(link.id)}`
                            : link.type === "PROVIDER"
                            ? `/providers/${link.id}`
                            : link.type === "QUEUE"
                            ? `/investigation-queue`
                            : `/risk-intelligence`
                        }
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-surface border border-bpjs-border hover:border-bpjs hover:bg-bpjs-soft/50 text-xs font-semibold text-bpjs-dark transition-all shadow-subtle group"
                      >
                        <span>{link.label}</span>
                        {link.risk_score && (
                          <span className="px-1.5 py-0.5 rounded-md bg-risk-critical-bg text-risk-critical text-[10px] font-bold font-mono tabular-nums">
                            {link.risk_score}
                          </span>
                        )}
                        <ArrowRight className="w-3.5 h-3.5 text-bpjs group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    ))}
                  </div>
                )}

                {/* Suggested Followups */}
                {msg.suggested_followups && msg.suggested_followups.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] font-bold text-jkn-dim uppercase tracking-wider block">
                      Lanjutkan penelusuran:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.suggested_followups.map((sug, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(sug)}
                          className="text-[11px] px-2.5 py-1 rounded-md bg-surface-secondary border border-jkn-border hover:border-bpjs hover:bg-bpjs-soft text-jkn-text font-medium transition-colors text-left"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          <div ref={endRef} />
          {loading && (
            <div className="flex items-center gap-2 text-xs text-jkn-muted p-3.5 bg-surface-secondary/50 rounded-xl w-fit border border-jkn-border">
              <Sparkles className="w-4 h-4 text-bpjs animate-spin" />
              <span>Mengambil konteks klaim & memvalidasi sitasi...</span>
            </div>
          )}
        </div>

        {/* Quick Prompts Bar if low message count */}
        {messages.length <= 2 && (
          <div className="px-5 py-2.5 border-t border-jkn-divider bg-surface-secondary/40">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-jkn-dim uppercase mb-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-bpjs" />
              <span>Contoh pertanyaan:</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(p)}
                  className="px-2.5 py-1 rounded-md bg-white border border-jkn-border hover:border-bpjs hover:bg-bpjs-soft text-[11px] text-jkn-text shrink-0 font-medium transition-colors shadow-subtle"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-3.5 border-t border-jkn-divider bg-surface flex items-center gap-2.5">
          <input
            type="text"
            placeholder="Tulis pertanyaan investigasi (mis. 'Mengapa klaim CLM-10293 berisiko tinggi?')..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="flex-1 h-9 text-xs px-3.5 rounded-lg bg-surface-secondary border border-jkn-border text-jkn-text outline-hidden focus:border-bpjs focus:bg-white transition-colors"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="h-9 px-4 rounded-lg bg-bpjs text-white text-xs font-semibold hover:bg-bpjs-deep disabled:opacity-50 transition-all shadow-subtle flex items-center gap-1.5"
          >
            <span>Kirim</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </DashboardShell>
  );
}
