import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/guard";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { recordAudit } from "@/lib/data/store";

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (user) recordAudit({ claim_id: "AUTH", actor: user.name, actor_role: user.role, action: "LOGOUT", previous_status: null, new_status: null, justification: "Logout" });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
