import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { askCopilot, askCopilotStream } from "@/lib/ai/copilot";
import { guard } from "@/lib/auth/guard";
import { getStore, recordAudit } from "@/lib/data/store";

export const dynamic = "force-dynamic";

const Body = z.object({
  question: z.string().min(2).max(1000),
  claim_id: z.string().max(40).optional(),
  provider_id: z.string().max(40).optional(),
});

export async function POST(request: NextRequest) {
  const g = await guard(request);
  if (g.error) return g.error;

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pertanyaan tidak valid" }, { status: 400 });

  const audit = (mode: string, valid: number) =>
    recordAudit({
      claim_id: parsed.data.claim_id || "COPILOT",
      actor: g.user.name,
      actor_role: g.user.role,
      action: "COPILOT_QUERY",
      previous_status: null,
      new_status: mode.toUpperCase(),
      justification: `Q: ${parsed.data.question.slice(0, 160)} | sitasi valid: ${valid}`,
    });

  // Streaming (Server-Sent Events): start -> delta* -> final (jawaban tervalidasi)
  if (request.nextUrl.searchParams.get("stream") === "1") {
    const enc = new TextEncoder();
    const iter = askCopilotStream(getStore(), parsed.data)[Symbol.asyncIterator]();
    const body = new ReadableStream({
      async pull(controller) {
        try {
          const { value: ev, done } = await iter.next();
          if (done) {
            controller.close();
            return;
          }
          controller.enqueue(enc.encode(`data: ${JSON.stringify(ev)}\n\n`));
          if (ev.type === "final") {
            audit(ev.response.mode, ev.response.grounding.valid_citations);
            controller.close();
          }
        } catch (e) {
          controller.enqueue(
            enc.encode(`data: ${JSON.stringify({ type: "error", error: e instanceof Error ? e.message.slice(0, 160) : "error" })}\n\n`)
          );
          controller.close();
        }
      },
      async cancel() {
        await iter.return?.(undefined);
      },
    });
    return new Response(body, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-store, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  }

  try {
    const res = await askCopilot(getStore(), parsed.data);
    recordAudit({
      claim_id: parsed.data.claim_id || "COPILOT",
      actor: g.user.name,
      actor_role: g.user.role,
      action: "COPILOT_QUERY",
      previous_status: null,
      new_status: res.mode.toUpperCase(),
      justification: `Q: ${parsed.data.question.slice(0, 160)} | sitasi valid: ${res.grounding.valid_citations}`,
    });
    return NextResponse.json(res);
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal memproses analisis Copilot.", detail: e instanceof Error ? e.message.slice(0, 160) : undefined },
      { status: 500 }
    );
  }
}
