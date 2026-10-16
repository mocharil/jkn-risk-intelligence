import { fetchJson, GenerateOptions, LLMProvider, sseData } from "./types";

/**
 * Adapter Anthropic (Messages API). Env: ANTHROPIC_API_KEY, ANTHROPIC_MODEL / LLM_MODEL, ANTHROPIC_BASE_URL.
 * Anthropic tidak menyediakan embedding → analisis memakai embedding lokal (atau provider embedding lain bila ditambahkan).
 */
const BASE = () => (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/+$/, "");
const MODEL = process.env.ANTHROPIC_MODEL || process.env.LLM_MODEL || "claude-sonnet-5-5";

function headers() {
  return { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01" };
}

function body(prompt: string, opts: GenerateOptions, extra: Record<string, unknown> = {}) {
  return JSON.stringify({ model: MODEL, max_tokens: opts.maxOutputTokens ?? 2048, temperature: opts.temperature ?? 0.2, ...(opts.system ? { system: opts.system } : {}), messages: [{ role: "user", content: prompt }], ...extra });
}

function textOf(j: any): string {
  return (j.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
}

export const anthropicProvider: LLMProvider = {
  id: "anthropic",
  label: "Anthropic Claude",
  model: MODEL,
  embeddingModel: null,
  configured: () => Boolean(process.env.ANTHROPIC_API_KEY),
  credentialSource: () => (process.env.ANTHROPIC_API_KEY ? "api-key" : "none"),

  async ping() {
    await fetchJson(`${BASE()}/v1/messages`, { method: "POST", headers: headers(), body: body("ping", { maxOutputTokens: 4 }) }, 12_000);
  },

  async generateText(prompt, opts: GenerateOptions = {}) {
    return textOf(await fetchJson(`${BASE()}/v1/messages`, { method: "POST", headers: headers(), body: body(prompt, opts) }, opts.timeoutMs ?? 25_000));
  },

  async generateJsonText(prompt, opts: GenerateOptions = {}, retryHint) {
    const o = { ...opts, temperature: opts.temperature ?? 0.1, maxOutputTokens: opts.maxOutputTokens ?? 3072, system: `${opts.system ?? ""}\nJawab HANYA dengan satu objek JSON valid, tanpa teks lain.`.trim() };
    return textOf(await fetchJson(`${BASE()}/v1/messages`, { method: "POST", headers: headers(), body: body(retryHint ? `${prompt}\n\n${retryHint}` : prompt, o) }, opts.timeoutMs ?? 30_000));
  },

  async *streamText(prompt, opts: GenerateOptions = {}) {
    const res = await fetch(`${BASE()}/v1/messages`, { method: "POST", headers: headers(), body: body(prompt, { ...opts, temperature: opts.temperature ?? 0.1 }, { stream: true }) });
    for await (const d of sseData(res)) {
      try {
        const ev = JSON.parse(d);
        if (ev.type === "content_block_delta" && ev.delta?.text) yield ev.delta.text as string;
      } catch {
        /* abaikan */
      }
    }
  },
};
