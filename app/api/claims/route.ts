import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/auth/guard";
import { DatabaseService } from "@/lib/supabase/db-service";
import { recordAudit } from "@/lib/data/store";

function intParam(v: string | null, def?: number): number | undefined {
  if (v === null) return def;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? Math.min(Math.max(n, def === 0 ? 0 : 1), 1000) : def;
}

/** Cegah formula spreadsheet (CSV injection) pada sel yang diawali = + - @. */
function cell(v: unknown): string {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const CSV_MAX_ROWS = 5000;

export async function GET(request: NextRequest) {
  const g = await guard(request);
  if (g.error) return g.error;

  const sp = request.nextUrl.searchParams;
  const filters = {
    search: sp.get("search") || undefined,
    risk_type: sp.get("risk_type") || undefined,
    risk_level: sp.get("risk_level") || undefined,
    provider_id: sp.get("provider_id") || undefined,
    province: sp.get("province") || undefined,
    treatment_class: sp.get("treatment_class") || undefined,
    sort: sp.get("sort") || undefined,
    status: sp.get("status") || undefined,
  };

  if (sp.get("format") === "csv") {
    const { data, total_count } = await DatabaseService.getClaims({ ...filters, limit: CSV_MAX_ROWS, lite: true });
    const header = ["claim_id", "sep", "peserta_pseudonim", "provinsi", "faskes", "icd10", "diagnosis", "severity", "kelas_rawat", "lama_rawat_hari", "tagihan_rp", "tarif_acuan_peer_rp", "selisih_rp", "rasio_vs_rata_nasional", "skor_risiko", "tingkat_risiko", "sinyal", "status"];
    const lines = [header.join(",")];
    for (const c of data) {
      const d = c.diagnoses.find((x) => x.is_primary) || c.diagnoses[0];
      lines.push(
        [
          c.claim_id, c.sep_number, c.patient.patient_id, c.provider.province_code, c.provider.name, d?.code, d?.description, d?.severity,
          c.service.treatment_class, c.service.length_of_stay, c.claim_amount, c.approved_tariff ?? "", c.tariff_difference ?? "",
          c.national?.cost_ratio != null ? c.national.cost_ratio.toFixed(2) : "", c.risk_score, c.risk_level, c.risk_signals.join("|"), c.status,
        ].map(cell).join(",")
      );
    }
    recordAudit({
      claim_id: "SYSTEM",
      actor: g.user.name,
      actor_role: g.user.role,
      action: "CLAIMS_EXPORTED",
      previous_status: null,
      new_status: null,
      justification: `Ekspor CSV ${data.length} dari ${total_count} klaim (tanpa nama/NIK; peserta berupa pseudonim). Filter: ${JSON.stringify(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)))}`,
    });
    return new NextResponse("\uFEFF" + lines.join("\n") + "\n", {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="klaim-arsa-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
        "X-Total-Count": String(total_count),
      },
    });
  }

  const result = await DatabaseService.getClaims({
    ...filters,
    limit: intParam(sp.get("limit")),
    offset: intParam(sp.get("offset"), 0),
    lite: sp.get("full") !== "1",
  });

  return NextResponse.json({ data: result.data, total_count: result.total_count, is_supabase_connected: DatabaseService.isSupabaseConfigured() });
}
