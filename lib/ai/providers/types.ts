export type ProviderId = "gemini" | "openai" | "anthropic";

export type CredentialSource = "env-json" | "project-file" | "api-key" | "ambient-adc" | "workload-identity" | "base-url" | "none";

export interface GenerateOptions {
  system?: string;
  temperature?: number;
  timeoutMs?: number;
  maxOutputTokens?: number;
}

/**
 * Kontrak provider LLM. Semua fitur AI (Copilot, penjelasan, briefing, mapping, embedding)
 * hanya bergantung pada kontrak ini — mengganti provider cukup mengubah env `LLM_PROVIDER`.
 */
export interface LLMProvider {
  readonly id: ProviderId;
  readonly label: string;
  readonly model: string;
  readonly embeddingModel: string | null; // null = provider tidak menyediakan embedding (memakai embedding lokal)
  readonly location?: string;
  readonly project?: string;

  /** Apakah kredensial/konfigurasi untuk provider ini tersedia (belum tentu valid). */
  configured(): boolean;
  credentialSource(): CredentialSource;
  /** Panggilan kecil untuk memastikan kredensial benar-benar bekerja. Melempar bila gagal. */
  ping(): Promise<void>;
  generateText(prompt: string, opts?: GenerateOptions): Promise<string>;
  /** Mengembalikan teks JSON mentah (divalidasi zod oleh fasad). */
  generateJsonText(prompt: string, opts?: GenerateOptions, retryHint?: string): Promise<string>;
  streamText(prompt: string, opts?: GenerateOptions): AsyncGenerator<string>;
  embed?(texts: string[]): Promise<number[][]>;
}

export function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timeout ${ms}ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

export function shortError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.replace(/\s+/g, " ").replace(/(sk-|key=)[A-Za-z0-9_-]{8,}/g, "$1***").slice(0, 220);
}

export function extractJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // beberapa model menambahkan teks di sekitar JSON: ambil objek terluar
    const a = cleaned.indexOf("{");
    const b = cleaned.lastIndexOf("}");
    if (a >= 0 && b > a) return JSON.parse(cleaned.slice(a, b + 1));
    throw new SyntaxError("Keluaran bukan JSON");
  }
}

/** fetch dengan timeout (AbortController) — dipakai adapter berbasis HTTP. */
export async function fetchJson(url: string, init: RequestInit, timeoutMs: number): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    return JSON.parse(text);
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw new Error(`request timeout ${timeoutMs}ms`);
    throw e;
  } finally {
    clearTimeout(t);
  }
}

/** Parser SSE sederhana: menghasilkan payload `data:` per event. */
export async function* sseData(res: Response): AsyncGenerator<string> {
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).replace(/\r$/, "");
      buf = buf.slice(idx + 1);
      if (line.startsWith("data:")) {
        const d = line.slice(5).trim();
        if (d) yield d;
      }
    }
  }
}
