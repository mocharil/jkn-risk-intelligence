import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { actorOf, guard } from "@/lib/auth/guard";
import { CANONICAL_IDS } from "@/lib/ingest/canonical";
import { confirmMappingAndIngest } from "@/lib/ingest/service";

const Body = z.object({
  mappings: z.array(
    z.object({
      source_field: z.string().max(200),
      canonical_field: z.string().max(60),
      confidence: z.number().min(0).max(1).default(1),
      is_ai_suggested: z.boolean().default(false),
      suggested_by: z.enum(["llm", "heuristic", "manual"]).optional(),
      reason: z.string().max(300).optional(),
      transformation_rule: z.string().max(300).optional(),
      status: z.enum(["CONFIRMED", "SUGGESTED", "UNMAPPED"]).default("CONFIRMED"),
    })
  ),
});

/** Konfirmasi mapping oleh manusia → normalisasi ke klaim kanonik → analisis risiko. */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const g = await guard(request, "dataset.confirm_mapping");
  if (g.error) return g.error;

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Mapping tidak valid" }, { status: 400 });
  const bad = parsed.data.mappings.find((m) => m.canonical_field && !CANONICAL_IDS.has(m.canonical_field));
  if (bad) return NextResponse.json({ error: `Field kanonik tidak dikenal: ${bad.canonical_field}` }, { status: 400 });

  try {
    const dataset = await confirmMappingAndIngest(params.id, parsed.data.mappings, actorOf(g.user));
    return NextResponse.json({ status: dataset.status, data: dataset });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Gagal normalisasi" }, { status: 422 });
  }
}
