import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guard } from "@/lib/auth/guard";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession } from "@/lib/auth/session";
import { getStore, recordAudit } from "@/lib/data/store";

const Body = z.object({
  role: z.enum(["INVESTIGATOR", "SUPERVISOR", "ADMIN"]),
});

const DEMO_FALLBACK_ACCOUNTS: Record<"INVESTIGATOR" | "SUPERVISOR" | "ADMIN", { uid: string; email: string; name: string }> = {
  INVESTIGATOR: { uid: "USR-001", email: "investigator@arsa.id", name: "dr. Rina Kartika, AAK" },
  SUPERVISOR: { uid: "USR-002", email: "supervisor@arsa.id", name: "dr. Hendra Wijaya, M.Kes" },
  ADMIN: { uid: "USR-003", email: "admin@arsa.id", name: "Budi Santoso, S.Kom" },
};

/** Ganti peran akun demo 1-klik untuk kelancaran demonstrasi langsung. Dinonaktifkan pada mode produksi ketat. */
export async function POST(req: NextRequest) {
  if (process.env.ARSA_DISABLE_DEMO === "1" || process.env.ARSA_STRICT_PRODUCTION === "1") {
    return NextResponse.json({ error: "Fitur ganti peran demo cepat dinonaktifkan pada mode produksi ketat." }, { status: 403 });
  }

  const g = await guard(req);
  if (g.error) return g.error;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Peran target tidak valid." }, { status: 400 });
  }

  const targetRole = parsed.data.role;
  const store = getStore();
  const targetLocal = store.users.find((u) => u.role === targetRole && u.active);
  const targetUser = targetLocal
    ? { uid: targetLocal.user_id, email: targetLocal.email, name: targetLocal.name, role: targetLocal.role }
    : { ...DEMO_FALLBACK_ACCOUNTS[targetRole], role: targetRole };

  const token = await signSession(targetUser);
  recordAudit({
    claim_id: "AUTH",
    actor: `${g.user.name} -> ${targetUser.name}`,
    actor_role: `${g.user.role} -> ${targetUser.role}`,
    action: "DEMO_ROLE_SWITCH",
    previous_status: g.user.role,
    new_status: targetUser.role,
    justification: `Peralihan cepat peran demo dari ${g.user.role} ke ${targetUser.role}`,
  });

  const res = NextResponse.json({ user: targetUser });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
