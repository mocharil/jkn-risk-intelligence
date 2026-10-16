import fs from "fs";
import path from "path";
import { Pool } from "pg";

/**
 * Koneksi Postgres langsung (Supabase atau Postgres+pgvector biasa) lewat DATABASE_URL.
 * Dipakai untuk: (1) pencarian kemiripan pgvector, (2) cermin audit trail append-only di level database.
 * Tanpa DATABASE_URL seluruh fitur tetap berjalan in-process.
 */
const g = globalThis as unknown as { __arsaPg?: { url: string; pool: Pool } };

export function dbUrl(): string | null {
  return process.env.DATABASE_URL || null;
}

export function getPool(): Pool | null {
  const url = dbUrl();
  if (!url) return null;
  if (!g.__arsaPg || g.__arsaPg.url !== url) {
    g.__arsaPg?.pool.end().catch(() => {});
    const useSsl = (/supabase\.(co|com)|sslmode=require/.test(url) || process.env.DATABASE_SSL === "1") && process.env.DATABASE_SSL !== "0";
    const maxConnections = Math.max(1, Math.min(50, Number(process.env.DB_POOL_MAX) || 10));
    const rejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "1" || Boolean(process.env.DATABASE_CA_CERT);
    const sslConfig = useSsl
      ? { rejectUnauthorized, ...(process.env.DATABASE_CA_CERT ? { ca: process.env.DATABASE_CA_CERT } : {}) }
      : undefined;
    g.__arsaPg = {
      url,
      pool: new Pool({
        connectionString: url,
        max: maxConnections,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30_000,
        ...(sslConfig ? { ssl: sslConfig } : {}),
      }),
    };
  }
  return g.__arsaPg.pool;
}

export async function closePool() {
  await g.__arsaPg?.pool.end().catch(() => {});
  g.__arsaPg = undefined;
}

/** Terapkan migrasi arsa (idempoten). Dipakai script `npm run db:migrate` dan test. */
export async function applyArsaMigration(pool: Pool): Promise<void> {
  const file = path.join(process.cwd(), "supabase", "migrations", "20261002_arsa_pgvector_audit.sql");
  await pool.query(fs.readFileSync(file, "utf8"));
}

export async function dbHealth(): Promise<{ configured: boolean; ok: boolean; pgvector?: boolean; audit_rows?: number; vector_rows?: number; error?: string }> {
  const pool = getPool();
  if (!pool) return { configured: false, ok: false };
  try {
    const ext = await pool.query("select exists(select 1 from pg_extension where extname='vector') as v");
    const tables = await pool.query("select to_regclass('arsa_claim_vectors') is not null as vec, to_regclass('arsa_audit_log') is not null as aud");
    if (!tables.rows[0].vec || !tables.rows[0].aud) return { configured: true, ok: false, pgvector: ext.rows[0].v, error: "Migrasi belum diterapkan (jalankan npm run db:migrate)" };
    const c = await pool.query("select (select count(*) from arsa_claim_vectors)::int as v, (select count(*) from arsa_audit_log)::int as a");
    return { configured: true, ok: true, pgvector: ext.rows[0].v, vector_rows: c.rows[0].v, audit_rows: c.rows[0].a };
  } catch (e) {
    return { configured: true, ok: false, error: (e instanceof Error ? e.message : String(e)).slice(0, 200) };
  }
}
