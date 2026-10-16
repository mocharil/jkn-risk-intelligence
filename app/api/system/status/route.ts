import { NextRequest, NextResponse } from "next/server";
import { getAIStatus } from "@/lib/ai/llm";
import { verifyChain } from "@/lib/audit/chain";
import { guard } from "@/lib/auth/guard";
import { usingDevAuthSecret } from "@/lib/auth/session";
import { getStore } from "@/lib/data/store";
import { isUsingDevSecret } from "@/lib/pii/anonymize";
import { DatabaseService } from "@/lib/supabase/db-service";
import { dbHealth } from "@/lib/db/pg";
import { mirrorStatus, verifyAuditInDb } from "@/lib/db/audit-mirror";
import { pgvectorEnabled } from "@/lib/db/vector-store";
import { cloneThresholdFor, LEXICAL_THRESHOLD, SEMANTIC_ONLY_THRESHOLD, SIMILARITY_FLOOR } from "@/lib/risk/engine";

/** Status sistem untuk halaman Pengaturan: AI, embedding, data, audit, dan peringatan keamanan konfigurasi. */
export async function GET(request: NextRequest) {
  const g = await guard(request);
  if (g.error) return g.error;
  const store = getStore();
  const ai = await getAIStatus({ force: request.nextUrl.searchParams.get("refresh") === "1" });

  const warnings: string[] = [];
  if (usingDevAuthSecret()) warnings.push("AUTH_SECRET belum diatur — memakai secret dev. Wajib diatur di produksi.");
  if (isUsingDevSecret()) warnings.push("PII_HMAC_SECRET belum diatur — pseudonim memakai secret dev. Wajib diatur di produksi.");
  if (!ai.available) warnings.push(`LLM (${ai.provider_label}) tidak aktif: ${ai.reason}`);
  if (process.env.NODE_ENV === "production" && process.env.ARSA_STRICT_PRODUCTION !== "1") {
    warnings.push("Mode demo masih aktif (set ARSA_STRICT_PRODUCTION=1 di produksi untuk mengunci endpoint demo & registrasi mandiri).");
  }

  return NextResponse.json({
    ai,
    embedding: { model: store.meta.embedding_model, analyzed_at: store.meta.analyzed_at },
    data: { claims: store.claims.length, providers: store.providers.length, investigations: store.investigations.length, datasets: store.datasets.length, ingested_claims: store.ingestedClaimIds.size },
    last_analysis: store.meta.last_analysis,
    audit: verifyChain(store.auditLog),
    thresholds: {
      clone_semantic: cloneThresholdFor(store.meta.embedding_model || "local-hash-v1"),
      clone_lexical_overlap: LEXICAL_THRESHOLD,
      clone_semantic_only: SEMANTIC_ONLY_THRESHOLD,
      similarity_floor: SIMILARITY_FLOOR,
      los_ratio: 1.75,
      inflated_total_ratio: 1.6,
      inflated_line_ratio: 1.8,
      queue_min_score: 75,
    },
    database: { ...(await dbHealth()), vector_backend: pgvectorEnabled() ? "pgvector" : "in-process", audit_mirror: mirrorStatus(), audit_db_verification: await verifyAuditInDb() },
    supabase_configured: DatabaseService.isSupabaseConfigured(),
    warnings,
  });
}
