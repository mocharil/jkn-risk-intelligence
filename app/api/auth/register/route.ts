import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword } from "@/lib/auth/users";
import { getStore, persist, recordAudit } from "@/lib/data/store";
import { signUpWithSupabase, supabaseAuthEnabled } from "@/lib/auth/supabase-auth";

const Body = z.object({
  name: z.string().min(3).max(80),
  email: z.string().email().max(120),
  password: z.string().min(8, "Kata sandi minimal 8 karakter").max(200),
});

/** Registrasi mandiri hanya membuat akun INVESTIGATOR. Peran lebih tinggi hanya dapat diberikan ADMIN. */
export async function POST(req: NextRequest) {
  if (process.env.ALLOW_SELF_REGISTER === "0" || process.env.ARSA_STRICT_PRODUCTION === "1") {
    return NextResponse.json({ error: "Registrasi mandiri dinonaktifkan. Hubungi Administrator untuk pembuatan akun." }, { status: 403 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Data tidak valid" }, { status: 400 });
  const name = parsed.data.name.trim();
  const email = parsed.data.email.trim().toLowerCase();
  const { password } = parsed.data;
  if (supabaseAuthEnabled()) {
    const r = await signUpWithSupabase(name, email, password);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    recordAudit({ claim_id: "AUTH", actor: name, actor_role: "INVESTIGATOR", action: "USER_REGISTERED", previous_status: null, new_status: null, justification: `Akun baru ${email} (Supabase Auth)` });
    return NextResponse.json({ ok: true }, { status: 201 });
  }
  const store = getStore();
  if (store.users.some((u) => u.email.toLowerCase() === email)) return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });
  const nextSeq = store.users.reduce((max, u) => Math.max(max, Number(u.user_id.replace(/\D/g, "")) || 0), 0) + 1;
  store.users.push({ user_id: `USR-${String(nextSeq).padStart(3, "0")}`, email, name, role: "INVESTIGATOR", password_hash: hashPassword(password), active: true, created_at: new Date().toISOString() });
  recordAudit({ claim_id: "AUTH", actor: name, actor_role: "INVESTIGATOR", action: "USER_REGISTERED", previous_status: null, new_status: null, justification: `Akun baru ${email}` });
  persist();
  return NextResponse.json({ ok: true }, { status: 201 });
}
