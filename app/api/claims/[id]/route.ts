import { NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/lib/supabase/db-service";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const claimId = params.id;
  const claim = await DatabaseService.getClaimById(claimId);

  if (!claim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  return NextResponse.json({ data: claim });
}
