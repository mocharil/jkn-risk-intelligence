import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "./session";
import { supabaseAuthEnabled } from "./supabase-auth";
import { can, Permission, SessionUser } from "./types";
import { getStore } from "../data/store";

export async function getSessionUser(req: NextRequest | Request): Promise<SessionUser | null> {
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.split(/;\s*/).find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  const token = match ? decodeURIComponent(match.slice(SESSION_COOKIE.length + 1)) : null;
  const session = await verifySession(token);
  if (!session) return null;

  // Sinkronisasi langsung dengan store lokal agar penonaktifan akun / perubahan peran berlaku seketika tanpa menunggu cookie kedaluwarsa.
  if (!supabaseAuthEnabled()) {
    const local = getStore().users.find((u) => u.user_id === session.uid);
    if (local) {
      if (!local.active) return null;
      return { uid: local.user_id, email: local.email, name: local.name, role: local.role };
    }
  }
  return session;
}

export type Guard = { user: SessionUser; error?: undefined } | { user?: undefined; error: NextResponse };

/** Wajib login; bila `perm` diberikan, peran harus berizin. 401 = belum login, 403 = tidak berizin. */
export async function guard(req: NextRequest | Request, perm?: Permission): Promise<Guard> {
  const user = await getSessionUser(req);
  if (!user) return { error: NextResponse.json({ error: "Belum login", code: "UNAUTHENTICATED" }, { status: 401 }) };
  if (perm && !can(user.role, perm)) {
    return { error: NextResponse.json({ error: `Peran ${user.role} tidak berizin untuk aksi ini (${perm})`, code: "FORBIDDEN", required: perm }, { status: 403 }) };
  }
  return { user };
}

export function actorOf(user: SessionUser) {
  return { uid: user.uid, name: user.name, role: user.role };
}
