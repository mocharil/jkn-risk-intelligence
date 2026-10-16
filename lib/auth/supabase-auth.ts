import { Role, SessionUser } from "./types";

/**
 * Autentikasi via Supabase Auth (GoTrue) — aktif bila AUTH_PROVIDER=supabase dan NEXT_PUBLIC_SUPABASE_URL/ANON_KEY terisi.
 * Setelah kredensial diverifikasi Supabase, aplikasi menerbitkan cookie sesi HMAC yang sama seperti mode lokal,
 * sehingga middleware & RBAC tidak berubah. Peran dibaca dari `app_metadata.role` (hanya dapat diubah server/admin);
 * tanpa peran -> INVESTIGATOR (hak paling rendah). `user_metadata` sengaja TIDAK dipakai untuk peran (dapat diubah pengguna).
 */
export function supabaseAuthEnabled(): boolean {
  return process.env.AUTH_PROVIDER === "supabase" && Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

const ROLES: Role[] = ["INVESTIGATOR", "SUPERVISOR", "ADMIN"];

function base() {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL as string).replace(/\/+$/, "");
}
const headers = () => ({ "Content-Type": "application/json", apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string });

export function roleFromSupabaseUser(u: { app_metadata?: Record<string, unknown> }): Role {
  const r = String(u.app_metadata?.role || "").toUpperCase() as Role;
  return ROLES.includes(r) ? r : "INVESTIGATOR";
}

export async function signInWithSupabase(email: string, password: string): Promise<SessionUser | null> {
  const res = await fetch(`${base()}/auth/v1/token?grant_type=password`, { method: "POST", headers: headers(), body: JSON.stringify({ email, password }) });
  if (!res.ok) return null;
  const j = await res.json();
  const u = j.user;
  if (!u?.id) return null;
  return { uid: u.id, email: u.email || email, name: u.user_metadata?.name || u.user_metadata?.full_name || (u.email || email).split("@")[0], role: roleFromSupabaseUser(u) };
}

export async function signUpWithSupabase(name: string, email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${base()}/auth/v1/signup`, { method: "POST", headers: headers(), body: JSON.stringify({ email, password, data: { name } }) });
  if (res.ok) return { ok: true };
  const j = await res.json().catch(() => ({}));
  return { ok: false, error: j.msg || j.error_description || "Registrasi gagal" };
}
