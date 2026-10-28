"use client";

import React from "react";
import { AlertTriangle, BadgeCheck } from "lucide-react";

const RISK_ENUM_LABELS: Record<string, string> = {
  UPCODING: "Upcoding (Peningkatan Keparahan Diagnosis)",
  CLONING: "Cloning (Duplikasi Narasi Klinis)",
  PHANTOM_BILLING: "Phantom Billing (Tindakan Tanpa Bukti Dokumen)",
  ABNORMAL_LOS: "Abnormal LOS (Lama Rawat Tidak Wajar)",
  UNBUNDLING: "Unbundling (Pemecahan Tagihan Paket)",
  REPEAT_BILLING: "Repeat Billing (Penagihan Berulang)",
  READMISSION: "Readmission (Rawat Ulang Dini)",
  INFLATED_BILLS: "Inflated Bills (Penggelembungan Tagihan Obat/Alkes)",
};

function cleanSpacingAndEnums(raw: string): string {
  return raw
    // Rapikan spasi sebelum tanda baca setelah sitasi, mis. "[1] ." -> "[1]."
    .replace(/(\[\d+\])\s+([.,;:!?])/g, "$1$2")
    // Ubah kode enum mentah yang berdiri sendiri menjadi label yang mudah dibaca
    .replace(
      /\b(UPCODING|CLONING|PHANTOM_BILLING|ABNORMAL_LOS|UNBUNDLING|REPEAT_BILLING|READMISSION|INFLATED_BILLS)\b/g,
      (m) => RISK_ENUM_LABELS[m] || m
    );
}

function renderInline(text: string, anchor: string, badgeSize: "sm" | "md" = "sm"): React.ReactNode[] {
  const cleaned = cleanSpacingAndEnums(text);
  const badgeClass =
    badgeSize === "md"
      ? "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 mx-0.5 rounded bg-bpjs-light text-bpjs-dark text-[11px] font-bold align-super hover:bg-bpjs hover:text-white transition-colors no-underline"
      : "inline-flex items-center justify-center min-w-[16px] h-4 px-1 mx-0.5 rounded bg-bpjs-light text-bpjs-dark text-[9px] font-bold align-super hover:bg-bpjs hover:text-white transition-colors no-underline";

  return cleaned.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`\n]+`|\[\d+\])/g).map((part, i) => {
    if (!part) return null;
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return (
        <strong key={i} className="font-semibold text-jkn-text">
          {renderInline(part.slice(2, -2), anchor, badgeSize)}
        </strong>
      );
    }
    if (/^\*[^*\n]+\*$/.test(part)) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (/^`[^`\n]+`$/.test(part)) {
      return (
        <code key={i} className="px-1 py-0.5 rounded bg-surface-secondary border border-jkn-divider font-mono text-[0.92em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    const ref = part.match(/^\[(\d+)\]$/);
    if (ref) {
      return (
        <a key={i} href={`#${anchor}-ref-${ref[1]}`} aria-label={`Sitasi ${ref[1]}`} className={badgeClass}>
          {ref[1]}
        </a>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

/**
 * Render jawaban Markdown (paragraf, daftar poin `*`/`-`/`•`, daftar bernomor `1.`, subjudul `###`,
 * teks **tebal**, *miring*, `kode`, serta lencana sitasi `[n]`) secara rapi.
 */
export function renderCitedText(text: string, anchor: string, badgeSize: "sm" | "md" = "sm") {
  if (!text) return null;
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];

  let i = 0;
  let keySeq = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Heading (#, ##, ###, ####)
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      blocks.push(
        <div key={`h-${keySeq++}`} className="font-bold text-jkn-text pt-1">
          {renderInline(headingMatch[2], anchor, badgeSize)}
        </div>
      );
      i++;
      continue;
    }

    // Unordered list (* item, - item, • item, + item)
    if (/^([*\-•+])\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length) {
        const l = lines[i].trim();
        const m = l.match(/^([*\-•+])\s+(.+)$/);
        if (m) {
          items.push(m[2]);
          i++;
        } else if (l && !/^(\d+[.)]|#{1,4})\s+/.test(l) && /^\s{2,}/.test(lines[i]) && items.length > 0) {
          // Baris lanjutan yang menjorok ke dalam pada item poin yang sama
          items[items.length - 1] += ` ${l}`;
          i++;
        } else {
          break;
        }
      }
      blocks.push(
        <ul key={`ul-${keySeq++}`} className="list-disc pl-5 space-y-1.5 my-1 marker:text-bpjs">
          {items.map((item, idx) => (
            <li key={idx} className="leading-relaxed pl-0.5">
              {renderInline(item, anchor, badgeSize)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list (1. item, 2) item)
    if (/^\d+[.)]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length) {
        const l = lines[i].trim();
        const m = l.match(/^\d+[.)]\s+(.+)$/);
        if (m) {
          items.push(m[1]);
          i++;
        } else if (l && !/^([*\-•+]|#{1,4})\s+/.test(l) && /^\s{2,}/.test(lines[i]) && items.length > 0) {
          items[items.length - 1] += ` ${l}`;
          i++;
        } else {
          break;
        }
      }
      blocks.push(
        <ol key={`ol-${keySeq++}`} className="list-decimal pl-5 space-y-1.5 my-1 marker:font-semibold marker:text-bpjs-dark">
          {items.map((item, idx) => (
            <li key={idx} className="leading-relaxed pl-0.5">
              {renderInline(item, anchor, badgeSize)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Paragraf biasa (gabungkan baris berurutan yang bukan list/heading/kosong)
    const paraLines: string[] = [];
    while (i < lines.length) {
      const l = lines[i].trim();
      if (!l || /^([*\-•+]|\d+[.)]|#{1,4})\s+/.test(l)) break;
      paraLines.push(l);
      i++;
    }
    blocks.push(
      <p key={`p-${keySeq++}`} className="leading-relaxed">
        {renderInline(paraLines.join(" "), anchor, badgeSize)}
      </p>
    );
  }

  return <div className="space-y-2">{blocks}</div>;
}

export function ModeBadge({ mode, provider, model, reason }: { mode?: "llm" | "deterministic"; provider?: string; model?: string; reason?: string }) {
  if (!mode) return null;
  return mode === "llm" ? (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-intel-deep">
      <BadgeCheck className="w-3.5 h-3.5 shrink-0" /> AI · sitasi tervalidasi
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Mode aturan (tanpa AI)
    </span>
  );
}
