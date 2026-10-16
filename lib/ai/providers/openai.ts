import { CredentialSource, fetchJson, GenerateOptions, LLMProvider, sseData } from "./types";

/**
 * Adapter OpenAI-compatible: OpenAI, Azure OpenAI (via base URL), OpenRouter, Together, vLLM, LM Studio, Ollama (/v1), dsb.
 * Env: OPENAI_API_KEY, OPENAI_BASE_URL (default https://api.openai.com/v1), LLM_MODEL / OPENAI_MODEL,
 *      OPENAI_EMBEDDING_MODEL (kosongkan bila server tidak punya embedding → embedding lokal),
 *      OPENAI_JSON_MODE=0 untuk server yang tidak mendukung response_format.
 */
const BASE = () => (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
const KEY = () => process.env.OPENAI_API_KEY || "";
const MODEL = process.env.OPENAI_MODEL || process.env.LLM_MODEL || "gpt-4o-mini";
const isDefaultBase = () => !process.env.OPENAI_BASE_URL;
const EMBED: string | null = process.env.OPENAI_EMBEDDING_MODEL ?? (isDefaultBase() ? "text-embedding-3-small" : null);

function headers() {
  return { "Content-Type": "application/json", ...(KEY() ? { Authorization: `Bearer ${KEY()}` } : {}) };
}

function messages(prompt: string, system?: string) {
  return [...(system ? [{ role: "system", content: system }] : []), { role: "user", content: prompt }];
}

export const openaiProvider: LLMProvider = {
  id: "openai",
  label: "OpenAI-compatible",
  model: MODEL,
  embeddingModel: EMBED,
  configured: () => Boolean(KEY() || process.env.OPENAI_BASE_URL),
  credentialSource: (): CredentialSource => (KEY() ? "api-key" : process.env.OPENAI_BASE_URL ? "base-url" : "none"),

  async ping() {
    await fetchJson(`${BASE()}/chat/completions`, { method: "POST", headers: headers(), body: JSON.stringify({ model: MODEL, messages: messages("ping"), max_tokens: 4 }) }, 12_000);
  },

  async generateText(prompt, opts: GenerateOptions = {}) {
    const j = await fetchJson(
      `${BASE()}/chat/completions`,
      { method: "POST", headers: headers(), body: JSON.stringify({ model: MODEL, messages: messages(prompt, opts.system), temperature: opts.temperature ?? 0.2, max_tokens: opts.maxOutputTokens ?? 2048 }) },
      opts.timeoutMs ?? 25_000
    );
    return j.choices?.[0]?.message?.content ?? "";
  },

  async generateJsonText(prompt, opts: GenerateOptions = {}, retryHint) {
    const body: Record<string, unknown> = {
      model: MODEL,
      messages: messages(retryHint ? `${prompt}\n\n${retryHint}` : prompt, `${opts.system ?? ""}\nJawab HANYA dengan satu objek JSON valid.`.trim()),
      temperature: opts.temperature ?? 0.1,
      max_tokens: opts.maxOutputTokens ?? 3072,
    };
    if (process.env.OPENAI_JSON_MODE !== "0") body.response_format = { type: "json_object" };
    const j = await fetchJson(`${BASE()}/chat/completions`, { method: "POST", headers: headers(), body: JSON.stringify(body) }, opts.timeoutMs ?? 30_000);
    return j.choices?.[0]?.message?.content ?? "";
  },

  async *streamText(prompt, opts: GenerateOptions = {}) {
    const res = await fetch(`${BASE()}/chat/completions`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ model: MODEL, messages: messages(prompt, opts.system), temperature: opts.temperature ?? 0.1, max_tokens: opts.maxOutputTokens ?? 2048, stream: true }),
    });
    for await (const d of sseData(res)) {
      if (d === "[DONE]") return;
      try {
        const delta = JSON.parse(d).choices?.[0]?.delta?.content;
        if (delta) yield delta as string;
      } catch {
        /* abaikan event non-JSON */
      }
    }
  },

  ...(EMBED
    ? {
        async embed(texts: string[]) {
          const out: number[][] = [];
          for (let i = 0; i < texts.length; i += 64) {
            const body: Record<string, unknown> = { model: EMBED, input: texts.slice(i, i + 64) };
            if (/^text-embedding-3/.test(EMBED)) body.dimensions = 768; // samakan dimensi dengan skema pgvector
            const j = await fetchJson(`${BASE()}/embeddings`, { method: "POST", headers: headers(), body: JSON.stringify(body) }, 30_000);
            for (const d of j.data ?? []) out.push(d.embedding as number[]);
          }
          return out;
        },
      }
    : {}),
};
