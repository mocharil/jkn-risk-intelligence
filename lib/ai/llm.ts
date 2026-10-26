import { z } from "zod";
import { anthropicProvider } from "./providers/anthropic";
import { geminiProvider } from "./providers/gemini";
import { openaiProvider } from "./providers/openai";
import { CredentialSource, extractJson, GenerateOptions, LLMProvider, ProviderId, shortError, withTimeout } from "./providers/types";

export type { GenerateOptions, ProviderId, CredentialSource };

/**
 * Fasad LLM yang tidak bergantung pada provider tertentu.
 * Pilihan provider: env LLM_PROVIDER = gemini | openai (alias: openai-compatible, azure, ollama, vllm) | anthropic (alias: claude).
 * Bila kosong: otomatis memakai provider pertama yang kredensialnya tersedia (gemini → openai → anthropic).
 * Bila tidak ada yang bekerja, seluruh fitur AI turun ke mode deterministik yang selalu diberi label di UI.
 */
const REGISTRY: Record<ProviderId, LLMProvider> = { gemini: geminiProvider, openai: openaiProvider, anthropic: anthropicProvider };
const ORDER: ProviderId[] = ["gemini", "openai", "anthropic"];

const ALIAS: Record<string, ProviderId> = {
  gemini: "gemini",
  vertex: "gemini",
  google: "gemini",
  openai: "openai",
  "openai-compatible": "openai",
  azure: "openai",
  ollama: "openai",
  vllm: "openai",
  openrouter: "openai",
  anthropic: "anthropic",
  claude: "anthropic",
};

export function selectProvider(): LLMProvider | null {
  const forced = (process.env.LLM_PROVIDER || "").trim().toLowerCase();
  if (forced) {
    const id = ALIAS[forced];
    return id ? REGISTRY[id] : null;
  }
  for (const id of ORDER) if (REGISTRY[id].configured()) return REGISTRY[id];
  return null;
}

export interface AIStatus {
  available: boolean;
  provider: ProviderId | "none";
  provider_label: string;
  /** Kompatibilitas UI lama: sama dengan provider. */
  mode: string;
  model: string;
  embedding_model: string | null;
  embedding_available: boolean;
  credential_source: CredentialSource;
  location?: string;
  project?: string;
  reason?: string;
  checked_at: string;
}

const g = globalThis as unknown as { __arsaAIStatus?: AIStatus; __arsaAIStatusPromise?: Promise<AIStatus> };
const OK_TTL = 5 * 60_000;
const FAIL_TTL = 60_000;

function baseStatus(p: LLMProvider | null): Omit<AIStatus, "available" | "reason" | "checked_at"> {
  if (!p) return { provider: "none", provider_label: "Tidak ada", mode: "none", model: "-", embedding_model: null, embedding_available: false, credential_source: "none" };
  return {
    provider: p.id,
    provider_label: p.label,
    mode: p.id,
    model: p.model,
    embedding_model: p.embeddingModel,
    embedding_available: Boolean(p.embed && p.embeddingModel),
    credential_source: p.credentialSource(),
    location: p.location,
    project: p.project,
  };
}

export async function getAIStatus(opts: { force?: boolean } = {}): Promise<AIStatus> {
  const provider = selectProvider();
  const cached = g.__arsaAIStatus;
  if (cached && !opts.force && cached.provider === (provider?.id ?? "none")) {
    const age = Date.now() - new Date(cached.checked_at).getTime();
    if (age < (cached.available ? OK_TTL : FAIL_TTL)) return cached;
  }
  if (g.__arsaAIStatusPromise && !opts.force) return g.__arsaAIStatusPromise;

  g.__arsaAIStatusPromise = (async () => {
    const base = baseStatus(provider);
    let status: AIStatus;
    if (!provider) {
      const forced = process.env.LLM_PROVIDER;
      status = { ...base, available: false, reason: forced ? `Provider LLM "${forced}" tidak terdaftar.` : "Kredensial penyedia layanan LLM belum diaktifkan.", checked_at: new Date().toISOString() };
    } else if (!provider.configured()) {
      status = { ...base, available: false, reason: `Provider ${provider.label} dipilih tetapi kredensialnya belum diatur.`, checked_at: new Date().toISOString() };
    } else {
      try {
        await withTimeout(provider.ping(), 15_000, "ping");
        status = { ...base, available: true, checked_at: new Date().toISOString() };
      } catch (e) {
        status = { ...base, available: false, reason: shortError(e), checked_at: new Date().toISOString() };
      }
    }
    g.__arsaAIStatus = status;
    return status;
  })();
  try {
    return await g.__arsaAIStatusPromise;
  } finally {
    g.__arsaAIStatusPromise = undefined;
  }
}

export async function isAIAvailable(): Promise<boolean> {
  return (await getAIStatus()).available;
}

function markFailed(e: unknown) {
  const p = selectProvider();
  g.__arsaAIStatus = { ...baseStatus(p), available: false, reason: shortError(e), checked_at: new Date().toISOString() };
}

async function active(): Promise<LLMProvider> {
  const p = selectProvider();
  if (!p || !(await isAIAvailable())) throw new Error("AI tidak tersedia");
  return p;
}

export async function generateText(prompt: string, opts: GenerateOptions = {}): Promise<string> {
  const p = await active();
  try {
    return await p.generateText(prompt, opts);
  } catch (e) {
    markFailed(e);
    throw e;
  }
}

/** Output terstruktur: JSON dari provider, divalidasi zod; satu kali retry bila tidak valid. */
export async function generateJson<T>(prompt: string, schema: z.ZodType<T>, opts: GenerateOptions = {}): Promise<T> {
  const p = await active();
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await p.generateJsonText(prompt, opts, attempt === 0 ? undefined : "PERBAIKAN: keluaran sebelumnya bukan JSON valid sesuai skema. Kembalikan HANYA JSON valid.");
      return schema.parse(extractJson(raw));
    } catch (e) {
      lastErr = e;
      if (e instanceof z.ZodError || e instanceof SyntaxError) continue;
      markFailed(e);
      throw e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("generateJson gagal");
}

/** Streaming teks. Jika provider gagal di tengah jalan, status ditandai gagal dan error dilempar ke pemanggil. */
export async function* streamText(prompt: string, opts: GenerateOptions = {}): AsyncGenerator<string> {
  const p = await active();
  try {
    for await (const chunk of p.streamText(prompt, opts)) yield chunk;
  } catch (e) {
    markFailed(e);
    throw e;
  }
}

export async function embedWithProvider(texts: string[]): Promise<number[][]> {
  const p = await active();
  if (!p.embed || !p.embeddingModel) throw new Error(`Provider ${p.label} tidak menyediakan embedding`);
  try {
    const out = await p.embed(texts);
    if (out.length !== texts.length) throw new Error("Jumlah embedding tidak sesuai");
    return out;
  } catch (e) {
    markFailed(e);
    throw e;
  }
}
