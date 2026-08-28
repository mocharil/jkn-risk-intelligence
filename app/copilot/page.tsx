"use client";

import React, { useState } from "react";
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
} from "lucide-react";

interface Message {
  id: string;
  sender: "USER" | "AI";
  text: string;
  confidence?: number;
  evidence_citations?: Array<{
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

export default function AICopilotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg-1",
      sender: "AI",
      text: "Hello Aril, I am your **JKN Risk Intelligence Co-Pilot**. I can assist in evaluating digital electronic medical records, auditing INA-CBG tariff deviations, examining provider/DPJP historical performance, and detecting clinical narrative duplication.\n\nWhat case or risk signal would you like to investigate today?",
      confidence: 0.98,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const quickPrompts = [
    "Why is claim CLM-10293 categorized as CRITICAL?",
    "Show anomaly pattern summary for RS Sehat Sentosa",
    "Compare regional risk distribution between DKI Jakarta and East Java",
    "Explain contradicting evidence for surgical procedure 44.95",
    "Identify providers with clinical summary template duplication",
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

    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: "AI",
        text: data.answer,
        confidence: data.confidence,
        evidence_citations: data.evidence_citations,
        entity_links: data.entity_links,
        suggested_followups: data.suggested_followups,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardShell>
      {/* Title */}
      <div className="flex items-center justify-between border-b border-jkn-border pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-bpjs text-white shadow-sm shadow-bpjs/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-jkn-text tracking-tight">AI Copilot Intelligence Workspace</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-bpjs-light text-bpjs-dark font-bold border border-bpjs-border">
                Neural Reasoning Engine
              </span>
            </div>
            <p className="text-xs text-jkn-muted mt-0.5">
              Query clinical findings, compare peer facility benchmarks, or verify electronic medical records
            </p>
          </div>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="bg-surface rounded-2xl border border-jkn-border shadow-sm flex flex-col h-[70vh] overflow-hidden">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${
                msg.sender === "USER" ? "ml-auto flex-row-reverse" : "mr-auto"
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  msg.sender === "USER"
                    ? "bg-jkn-text text-white"
                    : "bg-bpjs text-white shadow-xs"
                }`}
              >
                {msg.sender === "USER" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div className="space-y-3">
                <div
                  className={`p-4 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === "USER"
                      ? "bg-bpjs text-white rounded-tr-none font-medium shadow-xs"
                      : "bg-surface-secondary/80 border border-jkn-border text-jkn-text rounded-tl-none space-y-2.5 shadow-2xs"
                  }`}
                >
                  <div className="whitespace-pre-line leading-relaxed">{msg.text}</div>

                  {/* Confidence */}
                  {msg.confidence && (
                    <div className="flex items-center gap-2 pt-2 border-t border-jkn-divider text-[10px] text-jkn-dim font-bold">
                      <CheckCircle2 className="w-3 h-3 text-bpjs" />
                      <span>Model Confidence: {(msg.confidence * 100).toFixed(0)}%</span>
                    </div>
                  )}
                </div>

                {/* Evidence Citations */}
                {msg.evidence_citations && msg.evidence_citations.length > 0 && (
                  <div className="p-3 rounded-xl bg-white border border-bpjs-border/60 text-xs space-y-1.5 shadow-2xs">
                    <span className="text-[10px] font-bold text-bpjs uppercase tracking-wider block">
                      Cited Medical Evidence:
                    </span>
                    <div className="space-y-1">
                      {msg.evidence_citations.map((ev) => (
                        <div
                          key={ev.evidence_id}
                          className="p-2 rounded-lg bg-bpjs-soft/30 border border-bpjs-border/40 text-[11px]"
                        >
                          <div className="font-bold text-jkn-text">{ev.title}</div>
                          <p className="text-jkn-muted text-[10px] italic mt-0.5">"{ev.excerpt}"</p>
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
                            : link.type === "PROVIDER"
                            ? `/providers/${link.id}`
                            : link.type === "QUEUE"
                            ? `/investigation-queue`
                            : `/risk-intelligence`
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-bpjs-border hover:border-bpjs hover:bg-bpjs-soft/50 text-xs font-bold text-bpjs-dark transition-all shadow-2xs group"
                      >
                        <span>{link.label}</span>
                        {link.risk_score && (
                          <span className="px-1.5 py-0.2 rounded-full bg-risk-critical-bg text-risk-critical text-[10px] font-bold">
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
                      Continue Investigation:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.suggested_followups.map((sug, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(sug)}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-surface-secondary border border-jkn-border hover:border-bpjs hover:bg-bpjs-soft text-jkn-text font-medium transition-colors text-left"
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

          {loading && (
            <div className="flex items-center gap-2 text-xs text-jkn-muted p-4 bg-surface-secondary/50 rounded-2xl w-fit">
              <Sparkles className="w-4 h-4 text-bpjs animate-spin" />
              <span>AI Engine is retrieving medical records and INA-CBG knowledge base...</span>
            </div>
          )}
        </div>

        {/* Quick Prompts Bar if low message count */}
        {messages.length <= 2 && (
          <div className="px-6 py-2 border-t border-jkn-divider bg-surface-secondary/40">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-jkn-dim uppercase mb-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-bpjs" />
              <span>Quick Investigation Prompts:</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(p)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-jkn-border hover:border-bpjs hover:bg-bpjs-soft text-[11px] text-jkn-text shrink-0 font-medium transition-colors shadow-2xs"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-jkn-divider bg-surface flex items-center gap-3">
          <input
            type="text"
            placeholder="Type your investigative query (e.g. 'Why is claim CLM-10293 high risk?')..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="flex-1 text-xs px-4 py-2.5 rounded-xl bg-surface-secondary border border-jkn-border text-jkn-text outline-hidden focus:border-bpjs"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 rounded-xl bg-bpjs text-white text-xs font-bold hover:bg-bpjs-deep disabled:opacity-50 transition-all shadow-sm flex items-center gap-1.5"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </DashboardShell>
  );
}
