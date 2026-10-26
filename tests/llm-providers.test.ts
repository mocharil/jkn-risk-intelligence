import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

/** Adapter diuji dengan fetch palsu: bentuk request dan parsing response harus benar tanpa kunci asli. */

const ENV_KEYS = ["LLM_PROVIDER", "OPENAI_API_KEY", "OPENAI_BASE_URL", "OPENAI_MODEL", "OPENAI_EMBEDDING_MODEL", "OPENAI_JSON_MODE", "ANTHROPIC_API_KEY", "GEMINI_API_KEY", "VERTEX_SA_JSON", "VERTEX_SA_PATH"];
let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  ENV_KEYS.forEach((k) => delete process.env[k]);
  (globalThis as any).__arsaAIStatus = undefined;
  (globalThis as any).__arsaAIStatusPromise = undefined;
  vi.resetModules();
});
afterEach(() => {
  ENV_KEYS.forEach((k) => (saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k])));
  vi.unstubAllGlobals();
});

const jsonRes = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
function sse(lines: string[]) {
  const enc = new TextEncoder();
  return new Response(new ReadableStream({ start(c) { lines.forEach((l) => c.enqueue(enc.encode(`${l}\n\n`))); c.close(); } }), { status: 200 });
}

describe("pemilihan provider", () => {
  it("tanpa kredensial -> tidak ada provider (mode deterministik)", async () => {
    const { selectProvider, getAIStatus } = await import("@/lib/ai/llm");
    // gemini_sa.json mungkin ada di mesin dev; paksa tidak ada dengan VERTEX_SA_PATH kosong tidak cukup, jadi cek hanya bila memang null
    const p = selectProvider();
    if (p === null) {
      const st = await getAIStatus({ force: true });
      expect(st.available).toBe(false);
      expect(st.provider).toBe("none");
    }
  });
  it("LLM_PROVIDER eksplisit menang, alias dikenali", async () => {
    process.env.LLM_PROVIDER = "ollama";
    const { selectProvider } = await import("@/lib/ai/llm");
    expect(selectProvider()?.id).toBe("openai");
    vi.resetModules();
    process.env.LLM_PROVIDER = "claude";
    expect((await import("@/lib/ai/llm")).selectProvider()?.id).toBe("anthropic");
  });
  it("LLM_PROVIDER tidak dikenal -> null dengan alasan jelas", async () => {
    process.env.LLM_PROVIDER = "foo";
    const { selectProvider, getAIStatus } = await import("@/lib/ai/llm");
    expect(selectProvider()).toBeNull();
    expect((await getAIStatus({ force: true })).reason).toMatch(/tidak (dikenal|terdaftar)/);
  });
  it("otomatis memilih provider yang kredensialnya ada", async () => {
    process.env.ANTHROPIC_API_KEY = "x";
    const { selectProvider } = await import("@/lib/ai/llm");
    const id = selectProvider()?.id;
    expect(["gemini", "anthropic"]).toContain(id); // gemini lebih dulu bila gemini_sa.json ada di mesin
  });
});

describe("adapter OpenAI-compatible", () => {
  beforeEach(() => {
    process.env.LLM_PROVIDER = "openai";
    process.env.OPENAI_API_KEY = "sk-test-123456789";
    process.env.OPENAI_BASE_URL = "http://llm.local/v1";
    process.env.OPENAI_MODEL = "my-model";
    process.env.OPENAI_EMBEDDING_MODEL = "my-embed";
  });

  it("ping, generateJson (validasi zod), header & body sesuai", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      const body = JSON.parse(String(init.body));
      return jsonRes({ choices: [{ message: { content: body.max_tokens === 4 ? "pong" : '```json\n{"a": 5}\n```' } }] });
    }));
    const { generateJson, getAIStatus } = await import("@/lib/ai/llm");
    const st = await getAIStatus({ force: true });
    expect(st.available).toBe(true);
    expect(st.provider).toBe("openai");
    expect(st.model).toBe("my-model");
    const out = await generateJson("hai", z.object({ a: z.number() }), { system: "SYS" });
    expect(out).toEqual({ a: 5 });
    const last = calls[calls.length - 1];
    expect(last.url).toBe("http://llm.local/v1/chat/completions");
    expect((last.init.headers as Record<string, string>).Authorization).toBe("Bearer sk-test-123456789");
    const sent = JSON.parse(String(last.init.body));
    expect(sent.model).toBe("my-model");
    expect(sent.messages[0].role).toBe("system");
    expect(sent.response_format).toEqual({ type: "json_object" });
  });

  it("OPENAI_JSON_MODE=0 tidak mengirim response_format", async () => {
    process.env.OPENAI_JSON_MODE = "0";
    let sent: any;
    vi.stubGlobal("fetch", vi.fn(async (_u: string, init: RequestInit) => { sent = JSON.parse(String(init.body)); return jsonRes({ choices: [{ message: { content: '{"a":1}' } }] }); }));
    const { generateJson } = await import("@/lib/ai/llm");
    await generateJson("x", z.object({ a: z.number() }));
    expect(sent.response_format).toBeUndefined();
  });

  it("JSON tidak valid -> retry sekali lalu berhasil", async () => {
    let n = 0;
    vi.stubGlobal("fetch", vi.fn(async (_u: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      if (body.max_tokens === 4) return jsonRes({ choices: [{ message: { content: "pong" } }] });
      n++;
      return jsonRes({ choices: [{ message: { content: n === 1 ? "bukan json" : '{"a":2}' } }] });
    }));
    const { generateJson } = await import("@/lib/ai/llm");
    expect(await generateJson("x", z.object({ a: z.number() }))).toEqual({ a: 2 });
    expect(n).toBe(2);
  });

  it("embedding: dimensi 768 untuk text-embedding-3, urutan terjaga", async () => {
    process.env.OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";
    let sent: any;
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
      if (url.endsWith("/embeddings")) { sent = JSON.parse(String(init.body)); return jsonRes({ data: sent.input.map((_: string, i: number) => ({ embedding: [i, i + 1] })) }); }
      return jsonRes({ choices: [{ message: { content: "pong" } }] });
    }));
    const { embedWithProvider } = await import("@/lib/ai/llm");
    const out = await embedWithProvider(["a", "b", "c"]);
    expect(out).toEqual([[0, 1], [1, 2], [2, 3]]);
    expect(sent.dimensions).toBe(768);
  });

  it("streaming SSE menghasilkan potongan teks berurutan", async () => {
    vi.stubGlobal("fetch", vi.fn(async (_u: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      if (body.stream) return sse(['data: {"choices":[{"delta":{"content":"Ha"}}]}', 'data: {"choices":[{"delta":{"content":"lo"}}]}', "data: [DONE]"]);
      return jsonRes({ choices: [{ message: { content: "pong" } }] });
    }));
    const { streamText } = await import("@/lib/ai/llm");
    let all = "";
    for await (const c of streamText("x")) all += c;
    expect(all).toBe("Halo");
  });

  it("kegagalan HTTP -> status turun ke tidak tersedia dengan alasan (kunci disamarkan)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonRes({ error: { message: "bad key sk-test-123456789" } }, 401)));
    const { getAIStatus } = await import("@/lib/ai/llm");
    const st = await getAIStatus({ force: true });
    expect(st.available).toBe(false);
    expect(st.reason).toMatch(/HTTP 401/);
    expect(st.reason).not.toContain("sk-test-123456789");
  });
});

describe("adapter Anthropic", () => {
  beforeEach(() => {
    process.env.LLM_PROVIDER = "anthropic";
    process.env.ANTHROPIC_API_KEY = "ak-test";
  });

  it("request Messages API benar & tanpa embedding (fallback lokal)", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => { calls.push({ url, init }); return jsonRes({ content: [{ type: "text", text: '{"ok": true}' }] }); }));
    const { generateJson, getAIStatus } = await import("@/lib/ai/llm");
    const st = await getAIStatus({ force: true });
    expect(st.available).toBe(true);
    expect(st.embedding_available).toBe(false);
    expect(await generateJson("x", z.object({ ok: z.boolean() }), { system: "S" })).toEqual({ ok: true });
    const last = calls[calls.length - 1];
    expect(last.url).toBe("https://api.anthropic.com/v1/messages");
    const h = last.init.headers as Record<string, string>;
    expect(h["x-api-key"]).toBe("ak-test");
    expect(h["anthropic-version"]).toBe("2023-06-01");
    const sent = JSON.parse(String(last.init.body));
    expect(sent.system).toContain("S");
    expect(sent.messages[0]).toEqual({ role: "user", content: "x" });
  });

  it("streaming content_block_delta", async () => {
    vi.stubGlobal("fetch", vi.fn(async (_u: string, init: RequestInit) => {
      const b = JSON.parse(String(init.body));
      if (b.stream) return sse(['data: {"type":"content_block_delta","delta":{"text":"Ba"}}', 'data: {"type":"content_block_delta","delta":{"text":"ik"}}', 'data: {"type":"message_stop"}']);
      return jsonRes({ content: [{ type: "text", text: "pong" }] });
    }));
    const { streamText } = await import("@/lib/ai/llm");
    let all = "";
    for await (const c of streamText("x")) all += c;
    expect(all).toBe("Baik");
  });
});

describe("embedTexts memilih embedding sesuai provider", () => {
  it("provider tanpa embedding (Anthropic) -> embedding lokal", async () => {
    process.env.LLM_PROVIDER = "anthropic";
    process.env.ANTHROPIC_API_KEY = "ak-test";
    vi.stubGlobal("fetch", vi.fn(async () => jsonRes({ content: [{ type: "text", text: "pong" }] })));
    const { embedTexts, LOCAL_MODEL } = await import("@/lib/ai/embeddings");
    const r = await embedTexts(["halo dunia"]);
    expect(r.model).toBe(LOCAL_MODEL);
    expect(r.vectors[0]).toHaveLength(768);
  });
  it("provider dengan embedding -> label model berawalan provider", async () => {
    process.env.LLM_PROVIDER = "openai";
    process.env.OPENAI_API_KEY = "k";
    process.env.OPENAI_BASE_URL = "http://x/v1";
    process.env.OPENAI_EMBEDDING_MODEL = "e1";
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
      if (url.endsWith("/embeddings")) { const b = JSON.parse(String(init.body)); return jsonRes({ data: b.input.map(() => ({ embedding: new Array(768).fill(0.01) })) }); }
      return jsonRes({ choices: [{ message: { content: "pong" } }] });
    }));
    const { embedTexts } = await import("@/lib/ai/embeddings");
    const r = await embedTexts([`unik-${Math.random()}`]);
    expect(r.model).toBe("openai:e1");
  });
});
