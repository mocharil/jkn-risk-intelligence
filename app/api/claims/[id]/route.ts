import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/auth/guard";
import { DatabaseService } from "@/lib/supabase/db-service";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const g = await guard(request);
  if (g.error) return g.error;
  const claim = await DatabaseService.getClaimById(params.id);
  if (!claim) return NextResponse.json({ error: "Klaim tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ data: claim });
}
