import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/users";
import { getStore, recordAudit } from "@/lib/data/store";
import { signInWithSupabase, supabaseAuthEnabled } from "@/lib/auth/supabase-auth";

const Body = z.object({ email: z.string().email().max(120), password: z.string().min(1).max(200) });

// Pembatas laju sederhana per IP+email (memori) — cegah brute force dengan batas memori aman.
const attempts = new Map<string, { n: number; first: number }>();
const WINDOW = 10 * 60_000;
const MAX_ATTEMPTS = 8;
const MAX_TRACKED_KEYS = 2000;

function pruneAttempts(now: number) {
  if (attempts.size <= MAX_TRACKED_KEYS) return;
  attempts.forEach((v, k) => {
    if (now - v.first >= WINDOW) attempts.delete(k);
  });
  if (attempts.size > MAX_TRACKED_KEYS) {
    const oldest = attempts.keys().next().value;
    if (oldest) attempts.delete(oldest);
  }
}

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Email dan kata sandi wajib diisi" }, { status: 400 });
  const email = parsed.data.email.trim().toLowerCase();
  const { password } = parsed.data;

  const now = Date.now();
  pruneAttempts(now);
  const clientIp = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim() || "local";
  const key = `${clientIp}|${email}`;
  const rec = attempts.get(key);
  if (rec && now - rec.first < WINDOW && rec.n >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi." }, { status: 429 });
  }

  const store = getStore();
  let user: { uid: string; email: string; name: string; role: "INVESTIGATOR" | "SUPERVISOR" | "ADMIN" } | null = null;
  if (supabaseAuthEnabled()) {
    user = await signInWithSupabase(email, password).catch(() => null);
  } else {
    const local = store.users.find((u) => u.email.toLowerCase() === email && u.active);
    if (local && verifyPassword(password, local.password_hash)) user = { uid: local.user_id, email: local.email, name: local.name, role: local.role };
  }
  if (!user) {
    const fresh = rec && now - rec.first < WINDOW ? rec : { n: 0, first: now };
    fresh.n++;
    attempts.set(key, fresh);
    recordAudit({ claim_id: "AUTH", actor: email, actor_role: "—", action: "LOGIN_FAILED", previous_status: null, new_status: null, justification: "Kredensial salah" });
    return NextResponse.json({ error: "Email atau kata sandi salah" }, { status: 401 });
  }

  attempts.delete(key);
  const token = await signSession({ uid: user.uid, email: user.email, name: user.name, role: user.role });
  recordAudit({ claim_id: "AUTH", actor: user.name, actor_role: user.role, action: "LOGIN", previous_status: null, new_status: null, justification: "Login berhasil" });

  const res = NextResponse.json({ user: { uid: user.uid, email: user.email, name: user.name, role: user.role } });
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_TTL_SECONDS });
  return res;
}
