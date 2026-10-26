import fs from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { CredentialSource, GenerateOptions, LLMProvider, withTimeout } from "./types";

/**
 * Gemini. Urutan kredensial (hanya yang diberikan UNTUK PROYEK INI):
 *  1. VERTEX_SA_JSON  2. VERTEX_SA_PATH / ./gemini_sa.json  3. GEMINI_API_KEY
 *  4. GOOGLE_APPLICATION_CREDENTIALS (ambient) — HANYA bila ARSA_ALLOW_AMBIENT_CREDENTIALS=1
 *  5. Cloud Run (K_SERVICE) + GOOGLE_CLOUD_PROJECT: identitas akun layanan lewat metadata server, tanpa kunci
 */
interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

const LOCATION = process.env.VERTEX_LOCATION || "us-central1";
// Model embedding tidak tersedia di lokasi "global"; pakai wilayah regional terpisah.
const EMBED_LOCATION = process.env.VERTEX_EMBED_LOCATION || (LOCATION === "global" ? "us-central1" : LOCATION);

function readProjectSA(): { sa: ServiceAccount; source: CredentialSource } | null {
  try {
    const inline = process.env.VERTEX_SA_JSON;
    if (inline) {
      const text = inline.trim().startsWith("{") ? inline : Buffer.from(inline, "base64").toString("utf8");
      return { sa: JSON.parse(text), source: "env-json" };
    }
    for (const p of [process.env.VERTEX_SA_PATH, path.join(process.cwd(), "gemini_sa.json")].filter(Boolean) as string[]) {
      if (fs.existsSync(p)) return { sa: JSON.parse(fs.readFileSync(p, "utf8")), source: "project-file" };
    }
  } catch {
    /* dianggap tidak ada kredensial */
  }
  return null;
}

function readAmbientSA(): ServiceAccount | null {
  if (process.env.ARSA_ALLOW_AMBIENT_CREDENTIALS !== "1") return null;
  try {
    const p = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (p && fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    /* ignore */
  }
  return null;
}

type Built = { ai: GoogleGenAI; source: CredentialSource; project?: string; embedAi?: GoogleGenAI };
let built: Built | null | undefined;

function build(): Built | null {
  if (built !== undefined) return built;
  const proj = readProjectSA();
  if (proj?.sa?.project_id && proj.sa.private_key) {
    built = { source: proj.source, project: proj.sa.project_id, ai: vertexClient(proj.sa) };
    return built;
  }
  if (process.env.GEMINI_API_KEY) {
    built = { source: "api-key", ai: new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) };
    return built;
  }
  const amb = readAmbientSA();
  if (amb?.project_id && amb.private_key) {
    built = { source: "ambient-adc", project: amb.project_id, ai: vertexClient(amb) };
    return built;
  }
  // Cloud Run / GCE: akun layanan bawaan lewat metadata server (tanpa file kunci). Hanya aktif bila GOOGLE_CLOUD_PROJECT diisi.
  if (process.env.K_SERVICE && process.env.GOOGLE_CLOUD_PROJECT) {
    const mk = (location: string) => new GoogleGenAI({ vertexai: true, project: process.env.GOOGLE_CLOUD_PROJECT, location, googleAuthOptions: { scopes: ["https://www.googleapis.com/auth/cloud-platform"] } });
    built = { source: "workload-identity", project: process.env.GOOGLE_CLOUD_PROJECT, ai: mk(LOCATION), embedAi: EMBED_LOCATION === LOCATION ? undefined : mk(EMBED_LOCATION) };
    return built;
  }
  built = null;
  return built;
}

function vertexClient(sa: ServiceAccount) {
  return new GoogleGenAI({ vertexai: true, project: sa.project_id, location: LOCATION, googleAuthOptions: { credentials: sa as never, scopes: ["https://www.googleapis.com/auth/cloud-platform"] } });
}

const MODEL = process.env.GEMINI_MODEL || process.env.LLM_MODEL || "gemini-3.8-flash";
const FALLBACK_ENDPOINT_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-2.5-flash";
const EMBED = process.env.EMBEDDING_MODEL || "text-embedding-004";

let activeEndpointModel = MODEL;

/**
 * Thinking budget Gemini Flash. Default 0 (nonaktif): token "berpikir" ikut dihitung dalam maxOutputTokens sehingga
 * JSON bisa terpotong, dan menambah latensi ~10 detik. Seluruh penalaran di Arsa sudah dibatasi konteks + validator.
 * Set GEMINI_THINKING_BUDGET=-1 (dinamis) atau angka >0 untuk mengaktifkan.
 */
const THINKING = process.env.GEMINI_THINKING_BUDGET === undefined ? 0 : Number(process.env.GEMINI_THINKING_BUDGET);
const thinking = (targetModel: string) => (/gemini-(2\.5|3)/.test(targetModel) && Number.isFinite(THINKING) ? { thinkingConfig: { thinkingBudget: THINKING } } : {});

function isModelNotFoundError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /404|NOT_FOUND|not found|was not found/i.test(msg);
}

async function generateWithFallback(c: Built, contents: string, config?: Record<string, unknown>) {
  try {
    return await c.ai.models.generateContent({
      model: activeEndpointModel,
      contents,
      config: config ? { ...config, ...thinking(activeEndpointModel) } : undefined,
    });
  } catch (err) {
    if (activeEndpointModel !== FALLBACK_ENDPOINT_MODEL && isModelNotFoundError(err)) {
      activeEndpointModel = FALLBACK_ENDPOINT_MODEL;
      return await c.ai.models.generateContent({
        model: activeEndpointModel,
        contents,
        config: config ? { ...config, ...thinking(activeEndpointModel) } : undefined,
      });
    }
    throw err;
  }
}

async function streamWithFallback(c: Built, contents: string, config?: Record<string, unknown>) {
  try {
    return await c.ai.models.generateContentStream({
      model: activeEndpointModel,
      contents,
      config: config ? { ...config, ...thinking(activeEndpointModel) } : undefined,
    });
  } catch (err) {
    if (activeEndpointModel !== FALLBACK_ENDPOINT_MODEL && isModelNotFoundError(err)) {
      activeEndpointModel = FALLBACK_ENDPOINT_MODEL;
      return await c.ai.models.generateContentStream({
        model: activeEndpointModel,
        contents,
        config: config ? { ...config, ...thinking(activeEndpointModel) } : undefined,
      });
    }
    throw err;
  }
}

export const geminiProvider: LLMProvider = {
  id: "gemini",
  label: "Google Gemini",
  model: MODEL,
  embeddingModel: EMBED,
  get location() {
    return build()?.source === "api-key" ? undefined : LOCATION;
  },
  get project() {
    return build()?.project;
  },
  configured: () => build() !== null,
  credentialSource: () => build()?.source ?? "none",

  async ping() {
    const c = build();
    if (!c) throw new Error("Tidak ada kredensial Gemini");
    await withTimeout(generateWithFallback(c, "ping"), 12_000, "ping");
  },

  async generateText(prompt, opts: GenerateOptions = {}) {
    const c = build()!;
    const res = await withTimeout(
      generateWithFallback(c, prompt, { systemInstruction: opts.system, temperature: opts.temperature ?? 0.2, maxOutputTokens: opts.maxOutputTokens ?? 2048 }),
      opts.timeoutMs ?? 25_000,
      "generate"
    );
    return res.text ?? "";
  },

  async generateJsonText(prompt, opts: GenerateOptions = {}, retryHint) {
    const c = build()!;
    const res = await withTimeout(
      generateWithFallback(c, retryHint ? `${prompt}\n\n${retryHint}` : prompt, {
        systemInstruction: opts.system,
        temperature: opts.temperature ?? 0.1,
        maxOutputTokens: opts.maxOutputTokens ?? 3072,
        responseMimeType: "application/json",
      }),
      opts.timeoutMs ?? 30_000,
      "generateJson"
    );
    return res.text ?? "";
  },

  async *streamText(prompt, opts: GenerateOptions = {}) {
    const c = build()!;
    const stream = await withTimeout(
      streamWithFallback(c, prompt, { systemInstruction: opts.system, temperature: opts.temperature ?? 0.1, maxOutputTokens: opts.maxOutputTokens ?? 2048 }),
      opts.timeoutMs ?? 30_000,
      "stream"
    );
    for await (const chunk of stream) if (chunk.text) yield chunk.text;
  },

  async embed(texts) {
    const c = build()!;
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += 16) {
      const res = await withTimeout((c.embedAi ?? c.ai).models.embedContent({ model: EMBED, contents: texts.slice(i, i + 16), config: { outputDimensionality: 768, taskType: "SEMANTIC_SIMILARITY" } }), 30_000, "embed");
      for (const e of res.embeddings ?? []) out.push((e.values ?? []) as number[]);
    }
    return out;
  },
};
