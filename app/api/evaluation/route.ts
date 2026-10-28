import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/auth/guard";
import { getStore } from "@/lib/data/store";
import { evaluate } from "@/lib/eval/evaluate";
import { loadBpjsSampleLabels } from "@/lib/eval/bpjs-labels";

/** Precision/recall/F1 per detector terhadap label kebenaran dataset sintetis bawaan. */
export async function GET(request: NextRequest) {
  const g = await guard(request);
  if (g.error) return g.error;
  const store = getStore();
  const report = evaluate(store.claims, store.labels);
  const bpjsLabels = loadBpjsSampleLabels();
  const bpjsClaims = bpjsLabels ? store.claims.filter((c) => store.ingestedClaimIds.has(c.claim_id) && bpjsLabels[c.claim_id] !== undefined) : [];
  const bpjsReport = bpjsClaims.length > 0 && bpjsLabels ? evaluate(bpjsClaims, bpjsLabels) : null;

  // Instrumentasi waktu penanganan nyata dari audit log: dari mulai investigasi hingga keputusan akhir (jam).
  const starts = new Map<string, number>();
  const durations: number[] = [];
  for (const e of store.auditLog) {
    const t = new Date(e.timestamp).getTime();
    if (e.action === "STATUS_CHANGED_TO_UNDER_INVESTIGATION" && !starts.has(e.claim_id)) starts.set(e.claim_id, t);
    if ((e.new_status === "CONFIRMED_RISK" || e.new_status === "FALSE_POSITIVE") && starts.has(e.claim_id)) {
      durations.push((t - (starts.get(e.claim_id) as number)) / 3_600_000);
      starts.delete(e.claim_id);
    }
  }
  durations.sort((a, b) => a - b);
  const handling = { cases_measured: durations.length, median_hours: durations.length ? Number(durations[Math.floor(durations.length / 2)].toFixed(2)) : null };
  return NextResponse.json({
    data: report,
    bpjs_sample: bpjsReport,
    handling_time: handling,
    embedding_model: store.meta.embedding_model,
    disclaimer:
      "Metrik dihitung pada data SINTETIS berlabel. Penyimpangan disisipkan dengan prevalensi realistis (±6-7%), sebagian sengaja tipis, dan ada klaim sah yang tampak janggal serta klaim tanpa dokumen, sehingga hasilnya tidak sempurna. Angka ini bukan akurasi pada klaim riil BPJS, yang memerlukan validasi dengan label investigasi nyata. Detektor dengan sedikit kasus berlabel (di bawah 10) hanya indikatif.",
  });
}
