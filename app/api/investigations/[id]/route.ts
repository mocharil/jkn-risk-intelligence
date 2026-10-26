import { getGovernancePolicy } from "@/lib/governance/policy";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { actorOf, guard } from "@/lib/auth/guard";
import { can } from "@/lib/auth/types";
import { DatabaseService } from "@/lib/supabase/db-service";
import { nationalContext } from "@/lib/data/bpjs-national";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const g = await guard(request);
  if (g.error) return g.error;
  const investigation = await DatabaseService.getInvestigationById(params.id);
  if (!investigation) return NextResponse.json({ error: "Investigasi tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ data: { ...investigation, claim: { ...investigation.claim, national: nationalContext(investigation.claim) } } });
}

const Patch = z.object({
  status: z.enum(["NEW", "UNDER_INVESTIGATION", "NEED_EVIDENCE", "CONFIRMED_RISK", "FALSE_POSITIVE", "ESCALATED", "CLOSED"]).optional(),
  note: z.union([z.string().max(4000), z.object({ content: z.string().max(4000) }).passthrough()]).optional(),
  determination: z
    .object({
      verdict: z.enum(["CONFIRMED_RISK", "FALSE_POSITIVE", "NEED_EVIDENCE"]),
      rationale: z.string().min(3).max(4000),
      recommended_recovery_amount: z.number().nonnegative().optional(),
    })
    .optional(),
  action: z.string().max(80).optional(),
});

const FINAL = new Set(["CONFIRMED_RISK", "FALSE_POSITIVE", "CLOSED"]);

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const g = await guard(request, "case.annotate");
  if (g.error) return g.error;

  const parsed = Patch.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Data tidak valid" }, { status: 400 });
  const { status, note, determination, action } = parsed.data;

  // Keputusan akhir hanya SUPERVISOR/ADMIN (human-in-the-loop berjenjang).
  const isFinal = (status && FINAL.has(status)) || (determination && determination.verdict !== "NEED_EVIDENCE");
  if (isFinal && !can(g.user.role, "case.final_decision")) {
    return NextResponse.json({ error: "Keputusan akhir (terkonfirmasi / false positive / tutup) hanya dapat ditetapkan Supervisor atau Admin.", code: "FORBIDDEN", required: "case.final_decision" }, { status: 403 });
  }

  const noteText = typeof note === "string" ? note : note?.content;
  if (isFinal && getGovernancePolicy().require_decision_justification) {
    const why = (determination?.rationale ?? noteText ?? "").trim();
    if (why.length < 15) {
      return NextResponse.json({ error: "Kebijakan tata kelola mewajibkan alasan tertulis (minimal 15 karakter) untuk keputusan akhir.", code: "JUSTIFICATION_REQUIRED" }, { status: 422 });
    }
  }
  const existing = await DatabaseService.getInvestigationById(params.id);
  const updated = await DatabaseService.updateInvestigation(
    params.id,
    {
      status: status ?? (determination ? determination.verdict : undefined),
      note: noteText,
      decision: determination
        ? { verdict: determination.verdict, rationale: determination.rationale, recommended_recovery_amount: determination.recommended_recovery_amount ?? existing?.potential_exposure, decided_by: g.user.name, decided_at: new Date().toISOString() }
        : undefined,
      action,
    },
    actorOf(g.user)
  );
  if (!updated) return NextResponse.json({ error: "Investigasi tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ data: updated });
}
