import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { dataDir } from "../data/paths";
import { embedWithProvider, getAIStatus } from "./llm";

export const EMBEDDING_DIM = 768;
export const LOCAL_MODEL = "local-hash-v1";

export interface Embedded {
  vectors: number[][];
  model: string; // model_version yang disimpan bersama vektor
}

// ---------------------------------------------------------------------------
// Embedding lokal (deterministik, tanpa jaringan): hashing trick atas unigram,
// bigram kata, dan 4-gram karakter, bobot sublinear, L2-normalized.
// Dipakai saat Vertex tidak tersedia. Model_version-nya berbeda sehingga vektor
// lokal & Vertex tidak pernah dibandingkan satu sama lain.
// ---------------------------------------------------------------------------
function fnv1a(str: string, seed = 2166136261): number {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9À-ɏ\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

export function localEmbed(text: string): number[] {
  const vec = new Float64Array(EMBEDDING_DIM);
  const counts = new Map<string, number>();
  const toks = tokenize(text);
  const add = (feat: string, w: number) => counts.set(feat, (counts.get(feat) || 0) + w);

  for (let i = 0; i < toks.length; i++) {
    add(`w:${toks[i]}`, 1);
    if (i + 1 < toks.length) add(`b:${toks[i]}_${toks[i + 1]}`, 1.5);
  }
  const joined = ` ${toks.join(" ")} `;
  for (let i = 0; i + 4 <= joined.length; i++) add(`c:${joined.slice(i, i + 4)}`, 0.5);

  counts.forEach((c, feat) => {
    const h = fnv1a(feat);
    const idx = h % EMBEDDING_DIM;
    const sign = fnv1a(feat, 0x9e3779b1) & 1 ? 1 : -1;
    vec[idx] += sign * (1 + Math.log(c));
  });

  let norm = 0;
  for (let i = 0; i < EMBEDDING_DIM; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;
  return Array.from(vec, (v) => Number((v / norm).toFixed(6)));
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0,
    na = 0,
    nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

/**
 * Adaptasi vektor dari model eksternal (mis. 384, 1024, 1536 dimensi) menjadi tepat `EMBEDDING_DIM` (768)
 * melalui proyeksi lipat deterministik + normalisasi L2, agar kompatibel dengan kolom `vector(768)` pgvector.
 */
export function normalizeVectorDim(vec: number[], dim = EMBEDDING_DIM): number[] {
  if (vec.length === 0) return new Array(dim).fill(0);
  if (vec.length === dim) return vec.map((x) => Number(x.toFixed(5)));
  const out = new Float64Array(dim);
  for (let i = 0; i < vec.length; i++) {
    const sign = (i / dim) & 1 ? -1 : 1;
    out[i % dim] += sign * vec[i];
  }
  let norm = 0;
  for (let i = 0; i < dim; i++) norm += out[i] * out[i];
  norm = Math.sqrt(norm) || 1;
  return Array.from(out, (v) => Number((v / norm).toFixed(5)));
}

// ---------------------------------------------------------------------------
// Cache embedding di disk (hindari panggilan API berulang saat restart).
// ---------------------------------------------------------------------------
const cacheFile = () => path.join(dataDir(), "embedding-cache.json");
const MAX_CACHE_ENTRIES = 5000;
type Cache = Record<string, number[]>;
let cacheMem: Cache | null = null;
let cacheDirty = false;

function loadCache(): Cache {
  if (cacheMem) return cacheMem;
  try {
    cacheMem = JSON.parse(fs.readFileSync(cacheFile(), "utf8"));
  } catch {
    cacheMem = {};
  }
  return cacheMem!;
}

function flushCache() {
  if (!cacheDirty || !cacheMem) return;
  try {
    const keys = Object.keys(cacheMem);
    if (keys.length > MAX_CACHE_ENTRIES) {
      for (const k of keys.slice(0, keys.length - MAX_CACHE_ENTRIES)) delete cacheMem[k];
    }
    fs.mkdirSync(path.dirname(cacheFile()), { recursive: true });
    fs.writeFileSync(cacheFile(), JSON.stringify(cacheMem));
    cacheDirty = false;
  } catch {
    /* filesystem read-only (mis. serverless) — cache hanya di memori */
  }
}

function keyOf(model: string, text: string) {
  return `${model}:${createHash("sha1").update(text).digest("hex")}`;
}

/**
 * Embed teks memakai embedding provider LLM aktif bila tersedia, jika tidak, embedding lokal.
 * `model` (mis. "gemini:text-embedding-004") adalah satu-satunya label yang boleh dibandingkan antar vektor.
 */
export async function embedTexts(texts: string[], opts: { forceLocal?: boolean } = {}): Promise<Embedded> {
  const status = opts.forceLocal ? null : await getAIStatus();
  const useRemote = Boolean(status?.available && status.embedding_available && status.embedding_model);
  const model = useRemote ? `${status!.provider}:${status!.embedding_model}` : LOCAL_MODEL;

  if (!useRemote) return { model, vectors: texts.map(localEmbed) };

  const cache = loadCache();
  const vectors: number[][] = new Array(texts.length);
  const missing: number[] = [];
  texts.forEach((t, i) => {
    const hit = cache[keyOf(model, t)];
    if (hit && hit.length === EMBEDDING_DIM) vectors[i] = hit;
    else missing.push(i);
  });

  if (missing.length > 0) {
    try {
      const fresh = await embedWithProvider(missing.map((i) => texts[i]));
      missing.forEach((i, j) => {
        const v = normalizeVectorDim(fresh[j], EMBEDDING_DIM);
        vectors[i] = v;
        cache[keyOf(model, texts[i])] = v;
      });
      cacheDirty = true;
      flushCache();
    } catch {
      // Provider gagal di tengah jalan -> seluruh batch memakai lokal agar model konsisten.
      return { model: LOCAL_MODEL, vectors: texts.map(localEmbed) };
    }
  }
  return { model, vectors };
}
