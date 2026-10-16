import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/auth/guard";
import { getStore, recordAudit } from "@/lib/data/store";
import { buildInvestigationPdf } from "@/lib/reports/pdf";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const g = await guard(request);
  if (g.error) return g.error;

  const id = params.id.replace(/^REP-/, "");
  const store = getStore();
  const inv = store.investigations.find((i) => i.investigation_id === id || i.claim_id === id);
  if (!inv) return NextResponse.json({ error: "Investigasi tidak ditemukan" }, { status: 404 });

  const claimAudit = store.auditLog.filter((e) => e.claim_id === inv.claim_id);
  const bytes = await buildInvestigationPdf(inv, claimAudit, store.auditLog);
  recordAudit({ claim_id: inv.claim_id, actor: g.user.name, actor_role: g.user.role, action: "REPORT_EXPORTED", previous_status: inv.status, new_status: inv.status, justification: `Laporan PDF REP-${inv.investigation_id}` });

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="REP-${inv.investigation_id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
