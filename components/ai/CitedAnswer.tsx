"use client";

import React from "react";
import { AlertTriangle, BadgeCheck } from "lucide-react";

/** Render **tebal** dan penanda sitasi [n] sebagai lencana yang melompat ke daftar bukti ber-id `${anchor}-ref-${n}`. */
export function renderCitedText(text: string, anchor: string) {
  return text.split(/(\*\*[^*]+\*\*|\[\d+\])/g).map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i}>{part.slice(2, -2)}</strong>;
    const ref = part.match(/^\[(\d+)\]$/);
    if (ref)
      return (
        <a key={i} href={`#${anchor}-ref-${ref[1]}`} className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 mx-0.5 rounded bg-bpjs-light text-bpjs-dark text-[9px] font-bold align-super hover:bg-bpjs hover:text-white transition-colors no-underline">
          {ref[1]}
        </a>
      );
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export function ModeBadge({ mode, provider, model, reason }: { mode?: "llm" | "deterministic"; provider?: string; model?: string; reason?: string }) {
  if (!mode) return null;
  return mode === "llm" ? (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-intel-deep">
      <BadgeCheck className="w-3.5 h-3.5 shrink-0" /> {provider || "LLM"}{model ? ` (${model})` : ""} · sitasi tervalidasi
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800" title={reason}>
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Mode deterministik (tanpa LLM)
    </span>
  );
}
