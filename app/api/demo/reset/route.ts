import { NextResponse } from "next/server";
import { resetDemoStore } from "@/lib/data/store";

export async function POST() {
  const store = resetDemoStore();
  return NextResponse.json({
    message: "Data demo berhasil direset ke kondisi awal.",
    total_claims: store.claims.length,
    total_investigations: store.investigations.length,
    hero_claim_status: store.claims.find((c) => c.claim_id === "CLM-10293")?.status,
  });
}
