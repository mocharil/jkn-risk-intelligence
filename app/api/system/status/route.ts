import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAIStatus } from "@/lib/ai/llm";
import { verifyChain } from "@/lib/audit/chain";
import { actorOf, guard } from "@/lib/auth/guard";
import { usingDevAuthSecret } from "@/lib/auth/session";
import { getStore, persist, recordAudit } from "@/lib/data/store";
import { isUsingDevSecret } from "@/lib/pii/anonymize";
import { DatabaseService } from "@/lib/supabase/db-service";
import { dbHealth } from "@/lib/db/pg";
import { mirrorStatus, verifyAuditInDb } from "@/lib/db/audit-mirror";
import { pgvectorEnabled } from "@/lib/db/vector-store";
import { getGovernancePolicy, setGovernancePolicy, type GovernancePolicy } from "@/lib/governance/policy";
import { DETECTOR_REGISTRY, AMOUNT_RATIO_MIN, AMOUNT_Z_MIN, LINE_RATIO_MIN, LOS_RATIO_MIN, LOS_Z_MIN } from "@/lib/risk/detectors";
import { analyzeLocal, cloneThresholdFor, LEXICAL_THRESHOLD, SEMANTIC_ONLY_THRESHOLD, SIMILARITY_FLOOR } from "@/lib/risk/engine";


/** Status sistem untuk halaman Pengaturan: AI, embedding, data, audit, dan kebijakan tata kelola. */
export async function GET(request: NextRequest) {
  const g = await guard(request);
  if (g.error) return g.error;
  const store = getStore();
  const ai = await getAIStatus({ force: request.nextUrl.searchParams.get("refresh") === "1" });
  const policy = getGovernancePolicy();

  const warnings: string[] = [];
  if (!ai.available && ai.reason) {
    warnings.push(`Layanan LLM (${ai.provider_label}) sedang dalam mode siaga deterministik.`);
  }

  const sanitizedAi = {
    ...ai,
    project: ai.project ? "••••••••••••" : undefined,
    location: ai.location ? "Regional Terisolasi" : undefined,
  };

  return NextResponse.json({
    ai: sanitizedAi,
    embedding: { model: store.meta.embedding_model, analyzed_at: store.meta.analyzed_at },
    data: { claims: store.claims.length, providers: store.providers.length, investigations: store.investigations.length, datasets: store.datasets.length, ingested_claims: store.ingestedClaimIds.size },
    last_analysis: store.meta.last_analysis,
    audit: verifyChain(store.auditLog),
    thresholds: {
      clone_semantic: cloneThresholdFor(store.meta.embedding_model || "local-hash-v1"),
      clone_lexical_overlap: LEXICAL_THRESHOLD,
      clone_semantic_only: SEMANTIC_ONLY_THRESHOLD,
      similarity_floor: SIMILARITY_FLOOR,
      los_ratio: LOS_RATIO_MIN,
      los_sigma_gate: LOS_Z_MIN,
      inflated_total_ratio: AMOUNT_RATIO_MIN,
      inflated_sigma_gate: AMOUNT_Z_MIN,
      inflated_line_ratio: LINE_RATIO_MIN,
      queue_min_score: policy.queue_min_score,
    },
    detector_count: DETECTOR_REGISTRY.length,
    governance: policy,
    database: { ...(await dbHealth()), vector_backend: pgvectorEnabled() ? "pgvector" : "in-process", audit_mirror: mirrorStatus(), audit_db_verification: await verifyAuditInDb() },
    supabase_configured: DatabaseService.isSupabaseConfigured(),
    security: {
      auth_vault_active: true,
      pii_hmac_active: true,
      zero_raw_pii: true,
      strict_mode: process.env.ARSA_STRICT_PRODUCTION === "1" || !usingDevAuthSecret() || !isUsingDevSecret(),
    },
    warnings,
  });
}

const PolicyPatchSchema = z.object({
  copilot_mode: z.enum(["HYBRID_CITATION", "DETERMINISTIC_ONLY"]).optional(),
  privacy_redaction: z.boolean().optional(),
  mask_pii_display: z.boolean().optional(),
  require_decision_justification: z.boolean().optional(),
  queue_min_score: z.number().min(50).max(95).optional(),
  sla_target_hours: z.number().min(12).max(168).optional(),
});

export async function PATCH(request: NextRequest) {
  const g = await guard(request, "admin.policy");
  if (g.error) return g.error;

  const parsed = PolicyPatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Parameter kebijakan tidak valid" }, { status: 400 });
  }

  const store = getStore();
  const current = getGovernancePolicy();
  const beforeSummary = `mode=${current.copilot_mode}, minScore=${current.queue_min_score}, sla=${current.sla_target_hours}j`;
  const updated: GovernancePolicy = {
    ...current,
    ...parsed.data,
    updated_at: new Date().toISOString(),
  };
  setGovernancePolicy(updated);
  if (updated.queue_min_score !== current.queue_min_score) store.meta.last_analysis = analyzeLocal(store);

  const afterSummary = `mode=${updated.copilot_mode}, minScore=${updated.queue_min_score}, sla=${updated.sla_target_hours}j`;

  recordAudit({
    claim_id: "SYSTEM",
    actor: actorOf(g.user).name,
    actor_role: g.user.role,
    action: "POLICY_UPDATED",
    previous_status: beforeSummary,
    new_status: afterSummary,
    justification: `Pembaruan kebijakan tata kelola audit (Mode: ${updated.copilot_mode === "HYBRID_CITATION" ? "AI + Sitasi" : "Deterministik"}, Skor Antrean ≥ ${updated.queue_min_score}, Target SLA ${updated.sla_target_hours} jam, Masking UU PDP: ${updated.mask_pii_display ? "Aktif" : "Nonaktif"})`,
  });
  persist();

  return NextResponse.json({ data: updated });
}
