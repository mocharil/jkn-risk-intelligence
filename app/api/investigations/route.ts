import { NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/lib/supabase/db-service";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status") || undefined;
  const search = searchParams.get("search") || undefined;

  const investigations = await DatabaseService.getInvestigations({ status, search });

  return NextResponse.json({
    data: investigations,
    total_count: investigations.length,
    is_supabase_connected: DatabaseService.isSupabaseConfigured(),
  });
}
