import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { roleFromSupabaseUser, signInWithSupabase, signUpWithSupabase, supabaseAuthEnabled } from "@/lib/auth/supabase-auth";

const KEYS = ["AUTH_PROVIDER", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
let saved: Record<string, string | undefined> = {};
beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  process.env.AUTH_PROVIDER = "supabase";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proj.supabase.co/";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
});
afterEach(() => {
  KEYS.forEach((k) => (saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k])));
  vi.unstubAllGlobals();
});

describe("Supabase Auth (GoTrue) – dengan fetch palsu", () => {
  it("aktif hanya bila AUTH_PROVIDER=supabase dan URL/key ada", () => {
    expect(supabaseAuthEnabled()).toBe(true);
    delete process.env.AUTH_PROVIDER;
    expect(supabaseAuthEnabled()).toBe(false);
  });

  it("login sukses: request benar, peran dari app_metadata", async () => {
    let seen: { url: string; init: RequestInit } | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        seen = { url, init };
        return new Response(JSON.stringify({ access_token: "t", user: { id: "u-1", email: "s@arsa.id", user_metadata: { name: "Siti" }, app_metadata: { role: "supervisor" } } }), { status: 200 });
      })
    );
    const u = await signInWithSupabase("s@arsa.id", "pw");
    expect(u).toEqual({ uid: "u-1", email: "s@arsa.id", name: "Siti", role: "SUPERVISOR" });
    expect(seen!.url).toBe("https://proj.supabase.co/auth/v1/token?grant_type=password");
    expect((seen!.init.headers as Record<string, string>).apikey).toBe("anon");
  });

  it("peran TIDAK diambil dari user_metadata (dapat diubah pengguna) -> INVESTIGATOR", () => {
    expect(roleFromSupabaseUser({ app_metadata: {} })).toBe("INVESTIGATOR");
    expect(roleFromSupabaseUser({ app_metadata: { role: "root" } })).toBe("INVESTIGATOR");
    expect(roleFromSupabaseUser({ app_metadata: { role: "ADMIN" } })).toBe("ADMIN");
  });

  it("kredensial salah -> null; signup membawa nama", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 })));
    expect(await signInWithSupabase("a@b.id", "x")).toBeNull();
    let body: any;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_u: string, init: RequestInit) => {
        body = JSON.parse(String(init.body));
        return new Response("{}", { status: 200 });
      })
    );
    expect((await signUpWithSupabase("Budi", "b@b.id", "password1")).ok).toBe(true);
    expect(body.data.name).toBe("Budi");
  });
});
