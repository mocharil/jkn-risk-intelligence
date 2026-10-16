import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/auth/guard";
import { DatabaseService } from "@/lib/supabase/db-service";

/** Menunggu briefing LLM (dibuat di latar belakang oleh /api/dashboard) lalu mengembalikannya. */
export async function GET(request: NextRequest) {
  const g = await guard(request);
  if (g.error) return g.error;
  const kpis = await DatabaseService.getDashboardKPIs({ waitForBriefing: true });
  return NextResponse.json({ ai_briefing: kpis.ai_briefing });
}
