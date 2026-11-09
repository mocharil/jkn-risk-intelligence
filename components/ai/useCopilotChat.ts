"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CopilotVisual } from "./CopilotVisuals";
import { focusClaimFor } from "@/lib/ai/chat-focus";

export interface ChatMessage {
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
  visuals?: CopilotVisual[];
  suggested_followups?: string[];
  timestamp: string;
}

/** Selama aliran, sitasi mentah ([id]) disembunyikan; versi bernomor menyusul setelah jawaban divalidasi. */
const cleanStreamingPreview = (s: string) => s.replace(/\[[^\]\n]{2,120}\]/g, "").replace(/\[[^\]\n]{0,80}$/, "");

const loadSaved = (key: string): ChatMessage[] => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) || "null") as ChatMessage[] | null;
    // "msg-1" adalah sapaan lama yang tidak pernah ditampilkan; dibuang agar tidak dihitung sebagai percakapan.
    if (Array.isArray(saved)) return saved.filter((m) => m.id !== "msg-1").map((m) => ({ ...m, streaming: false }));
  } catch {
    /* penyimpanan tidak tersedia */
  }
  return [];
};

/**
 * Satu logika percakapan Copilot untuk semua tempat yang menampilkannya (halaman Copilot dan panel di halaman investigasi):
 * aliran respons (SSE) dengan tombol hentikan, riwayat per sesi, dan klaim yang sedang dibahas.
 * `claimId` mengunci percakapan ke satu klaim; tanpa itu, "klaim ini" merujuk klaim yang terakhir dibahas.
 */
export function useCopilotChat({ storageKey, claimId }: { storageKey: string; claimId?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const busyRef = useRef(false);
  const loadedKey = useRef<string | null>(null);
  messagesRef.current = messages;

  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    busyRef.current = false;
    setLoading(false);
    setMessages(loadSaved(storageKey));
    loadedKey.current = storageKey;
  }, [storageKey]);

  useEffect(() => {
    if (loadedKey.current !== storageKey || messages.length === 0) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(messages.filter((m) => !m.streaming).slice(-40)));
    } catch {
      /* abaikan */
    }
  }, [messages, storageKey]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const newChat = useCallback(() => {
    const prev = abortRef.current;
    abortRef.current = null;
    prev?.abort();
    busyRef.current = false;
    setMessages([]);
    setLoading(false);
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* abaikan */
    }
  }, [storageKey]);

  const send = useCallback(
    async (queryText: string) => {
      const q = queryText.trim();
      if (!q || busyRef.current) return;
      busyRef.current = true;
      const stamp = Date.now();
      const focus = claimId ?? focusClaimFor(q, messagesRef.current);
      setMessages((prev) => [...prev, { id: `usr-${stamp}`, sender: "USER", text: q, timestamp: new Date().toISOString() }]);
      setLoading(true);

      const aiId = `ai-${stamp}`;
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const upsert = (patch: Partial<ChatMessage>) =>
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
          body: JSON.stringify({ question: q, claim_id: focus }),
          signal: ctrl.signal,
        });
        if (res.status === 429) throw new Error("Terlalu banyak pertanyaan dalam waktu singkat. Tunggu sebentar lalu coba lagi.");
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
              upsert({ text: "", mode: ev.mode, provider: ev.provider, model: ev.model, streaming: true });
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
                visuals: d.visuals,
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
          busyRef.current = false;
          abortRef.current = null;
        }
      }
    },
    [claimId]
  );

  const busy = loading || messages.some((m) => m.streaming);
  return { messages, loading, busy, send, stop, newChat };
}
