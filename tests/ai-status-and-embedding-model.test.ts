import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Dua jaminan untuk demo: (1) permintaan pengguna tidak menunggu ping ke penyedia AI (cold start dan TTL),
 * (2) analisis lanjutan tidak memindahkan data ke model embedding lain tanpa diminta, karena itu menggeser seluruh angka.
 */

const ENV_KEYS = ["LLM_PROVIDER", "OPENAI_API_KEY", "OPENAI_BASE_URL", "OPENAI_MODEL", "OPENAI_EMBEDDING_MODEL", "OPENAI_JSON_MODE", "ANTHROPIC_API_KEY", "GEMINI_API_KEY", "VERTEX_SA_JSON", "VERTEX_SA_PATH"];
let saved: Record<string, string | undefined> = {};
const g = globalThis as any;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const jsonRes = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
const PONG = { choices: [{ message: { content: "pong" } }] };

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  ENV_KEYS.forEach((k) => delete process.env[k]);
  g.__arsaAIStatus = undefined;
  g.__arsaAIStatusPromise = undefined;
  g.__arsaBriefing = undefined;
  g.__arsaBriefingInflight = undefined;
  vi.resetModules();
});
afterEach(() => {
  ENV_KEYS.forEach((k) => (saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k])));
  vi.unstubAllGlobals();
});

/** Penyedia OpenAI-compatible palsu yang lambat menjawab ping (300 ms), dan menghitung berapa kali dipanggil. */
function slowProvider() {
  process.env.LLM_PROVIDER = "openai";
  process.env.OPENAI_API_KEY = "x";
  process.env.OPENAI_BASE_URL = "http://llm.test/v1";
  const state = { pings: 0 };
  vi.stubGlobal("fetch", async () => {
    state.pings++;
    await sleep(300);
    return jsonRes(PONG);
  });
  return state;
}

describe("status AI tidak memblokir permintaan pengguna", () => {
  it("pemeriksaan pertama menunggu satu kali; setelah itu seketika", async () => {
    const st = slowProvider();
    const { getAIStatus, peekAIStatus } = await import("@/lib/ai/llm");
    expect(peekAIStatus()).toBeNull(); // belum pernah diperiksa; pemeriksaan dimulai di latar belakang
    const first = await getAIStatus();
    expect(first.available).toBe(true);
    const t = Date.now();
    await getAIStatus();
    expect(Date.now() - t).toBeLessThan(50);
    expect(st.pings).toBe(1);
  });

  it("status yang kedaluwarsa dikembalikan seketika dan disegarkan satu kali di latar belakang", async () => {
    const st = slowProvider();
    const { getAIStatus } = await import("@/lib/ai/llm");
    const first = await getAIStatus();
    const stale = { ...first, checked_at: new Date(Date.now() - 10 * 60_000).toISOString() };
    g.__arsaAIStatus = stale;
    const t = Date.now();
    const got = await Promise.all([getAIStatus(), getAIStatus(), getAIStatus()]);
    expect(Date.now() - t).toBeLessThan(100);
    got.forEach((x) => expect(x).toBe(stale));
    await sleep(600);
    expect(g.__arsaAIStatus.checked_at > stale.checked_at).toBe(true);
    expect(st.pings).toBe(2); // satu pemeriksaan awal + satu penyegaran bersama
  });

  it("force tetap menunggu hasil terbaru", async () => {
    slowProvider();
    const { getAIStatus } = await import("@/lib/ai/llm");
    await getAIStatus();
    const t = Date.now();
    await getAIStatus({ force: true });
    expect(Date.now() - t).toBeGreaterThanOrEqual(250);
  });

  it("briefing dashboard tampil seketika dengan penanda sementara selagi status diperiksa", async () => {
    slowProvider();
    const { getStore } = await import("@/lib/data/store");
    const { computeDashboardKPIs } = await import("@/lib/analytics/aggregates");
    const { withAiBriefing } = await import("@/lib/ai/briefing");
    const store = getStore();
    const t = Date.now();
    const out = await withAiBriefing(store, computeDashboardKPIs(store));
    expect(Date.now() - t).toBeLessThan(150);
    expect(out.ai_briefing.pending).toBe(true);
  });
});

describe("analisis lanjutan mengikuti model embedding data aktif", () => {
  async function run(meta: { embedding_model?: string }, opts: { forceLocal?: boolean } = {}) {
    const emb = await import("@/lib/ai/embeddings");
    const spy = vi.spyOn(emb, "embedTexts");
    const { getStore } = await import("@/lib/data/store");
    const { analyzeAll } = await import("@/lib/risk/engine");
    const claims = getStore().claims.slice(0, 40);
    await analyzeAll({ claims, investigations: [], embeddings: new Map(), meta } as never, opts);
    const arg = spy.mock.calls[0][1] as { forceLocal?: boolean };
    spy.mockRestore();
    return arg.forceLocal;
  }

  it("data yang memakai embedding lokal tetap lokal (mis. setelah unggahan dataset)", async () => {
    expect(await run({ embedding_model: "local-hash-v1" })).toBe(true);
    expect(await run({})).toBe(true);
  });

  it("data yang sudah memakai embedding penyedia tetap memakainya", async () => {
    expect(await run({ embedding_model: "gemini:text-embedding-004" })).toBe(false);
  });

  it("pilihan eksplisit mengalahkan model saat ini", async () => {
    expect(await run({ embedding_model: "local-hash-v1" }, { forceLocal: false })).toBe(false);
    expect(await run({ embedding_model: "gemini:text-embedding-004" }, { forceLocal: true })).toBe(true);
  });
});

describe("izin analisis ulang", () => {
  it("hanya administrator yang boleh menjalankan analisis ulang seluruh dataset", async () => {
    const { PERMISSIONS } = await import("@/lib/auth/types");
    expect(PERMISSIONS["analysis.run"]).toEqual(["ADMIN"]);
  });
});
