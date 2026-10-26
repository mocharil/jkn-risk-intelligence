import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/auth/guard";
import { DatabaseService } from "@/lib/supabase/db-service";
import { getStore, memoized } from "@/lib/data/store";
import { computeProviderNational } from "@/lib/analytics/provider-national";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const g = await guard(request);
  if (g.error) return g.error;
  const provider = await DatabaseService.getProviderById(params.id);
  if (!provider) return NextResponse.json({ error: "Faskes tidak ditemukan" }, { status: 404 });
  const claimsResult = await DatabaseService.getClaims({ provider_id: params.id, limit: 10, lite: true });
  const store = getStore();
  const national = memoized("providers.national", () => computeProviderNational(store));
  return NextResponse.json({ data: { ...provider, national: national.get(params.id), recent_claims: claimsResult.data } });
}
