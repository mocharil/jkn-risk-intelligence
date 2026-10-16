import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/guard";
import { PERMISSIONS, can } from "@/lib/auth/types";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  const permissions = (Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[]).filter((p) => can(user.role, p));
  return NextResponse.json({ user, permissions });
}
