import { NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/lib/supabase/db-service";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const providerId = params.id;
  const provider = await DatabaseService.getProviderById(providerId);

  if (!provider) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  const claimsResult = await DatabaseService.getClaims({ provider_id: providerId, limit: 10 });

  return NextResponse.json({
    data: {
      ...provider,
      recent_claims: claimsResult.data,
    },
  });
}
