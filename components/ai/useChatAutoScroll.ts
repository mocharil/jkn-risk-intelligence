"use client";

import { RefObject, useEffect } from "react";
import type { ChatMessage } from "./useCopilotChat";

/**
 * Gulir percakapan: selama jawaban mengalir, ikuti teks terbaru; setelah selesai, jawaban yang lebih tinggi dari area baca
 * (visual, sumber, dan saran lanjutan menambah tinggi) ditampilkan dari awalnya, bukan dari ujung bawahnya.
 */
export function useChatAutoScroll(ref: RefObject<HTMLElement | null>, messages: ChatMessage[], loading: boolean) {
  const streaming = messages.some((m) => m.streaming);
  const last = messages[messages.length - 1];

  useEffect(() => {
    const el = ref.current;
    if (!el || (messages.length === 0 && !loading)) return;
    if (streaming) {
      el.scrollTop = el.scrollHeight;
      return;
    }
    const node = last?.sender === "AI" ? el.querySelector<HTMLElement>(`[data-msg-id="${last.id}"]`) : null;
    if (node && node.offsetHeight > el.clientHeight * 0.85) {
      const delta = node.getBoundingClientRect().top - el.getBoundingClientRect().top;
      el.scrollTo({ top: el.scrollTop + delta - 8, behavior: "smooth" });
    } else {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [ref, messages, loading, streaming, last]);
}
