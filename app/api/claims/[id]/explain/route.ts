import { NextRequest, NextResponse } from "next/server";
import { explainClaimFindings } from "@/lib/ai/explain";
import { guard } from "@/lib/auth/guard";
import { DatabaseService } from "@/lib/supabase/db-service";

/** Menghasilkan penjelasan per temuan (LLM bersitasi tervalidasi; fallback deterministik berlabel). */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const g = await guard(request);
  if (g.error) return g.error;
  const claim = await DatabaseService.getClaimById(params.id);
  if (!claim) return NextResponse.json({ error: "Klaim tidak ditemukan" }, { status: 404 });
  const force = request.nextUrl.searchParams.get("force") === "1";
  const result = await explainClaimFindings(claim, { force });
  return NextResponse.json({ data: claim, explanation_mode: result.mode, fallback_reason: result.reason });
}
