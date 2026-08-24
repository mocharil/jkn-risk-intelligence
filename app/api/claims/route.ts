import { NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/lib/supabase/db-service";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const search = searchParams.get("search") || undefined;
  const risk_type = searchParams.get("risk_type") || undefined;
  const risk_level = searchParams.get("risk_level") || undefined;
  const provider_id = searchParams.get("provider_id") || undefined;
  const status = searchParams.get("status") || undefined;

  const result = await DatabaseService.getClaims({
    search,
    risk_type,
    risk_level,
    provider_id,
    status,
  });

  return NextResponse.json({
    data: result.data,
    total_count: result.total_count,
    is_supabase_connected: DatabaseService.isSupabaseConfigured(),
  });
}
