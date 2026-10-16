import { AuditEntry, GENESIS_HASH } from "../audit/chain";
import { getPool } from "./pg";

/**
 * Cermin audit trail ke Postgres (tabel arsa_audit_log: append-only + trigger rantai hash di database).
 * Penulisan berurutan lewat antrean (rantai tidak boleh bercabang). Kegagalan tidak menghentikan aplikasi:
 * dicatat pada status dan dicoba ulang pada penulisan berikutnya.
 */
export function auditMirrorEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL) && process.env.AUDIT_DB_MIRROR !== "0";
}

const g = globalThis as unknown as { __arsaMirror?: { chain: Promise<void>; lastError?: string; written: number } };
function state() {
  return (g.__arsaMirror ??= { chain: Promise.resolve(), written: 0 });
}

export function mirrorStatus() {
  const s = state();
  return { enabled: auditMirrorEnabled(), written: s.written, last_error: s.lastError };
}

async function writeMissing(entries: AuditEntry[]) {
  const pool = getPool();
  if (!pool) return;
  const res = await pool.query("select coalesce(max(seq),0)::int as m from arsa_audit_log");
  const dbMax = res.rows[0].m as number;
  for (const e of entries.filter((x) => x.seq > dbMax)) {
    await pool.query(
      `insert into arsa_audit_log (seq, log_id, ts, claim_id, actor, actor_role, action, previous_status, new_status, justification, previous_hash, hash)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [e.seq, e.log_id, e.timestamp, e.claim_id, e.actor, e.actor_role, e.action, e.previous_status, e.new_status, e.justification, e.previous_hash || GENESIS_HASH, e.hash]
    );
    state().written++;
  }
}

/** Jadwalkan penyalinan semua entri yang belum ada di database (idempoten). */
export function mirrorAudit(entries: AuditEntry[]): Promise<void> {
  if (!auditMirrorEnabled()) return Promise.resolve();
  const s = state();
  s.chain = s.chain
    .then(() => writeMissing(entries))
    .then(() => {
      s.lastError = undefined;
    })
    .catch((e) => {
      s.lastError = (e instanceof Error ? e.message : String(e)).slice(0, 200);
    });
  return s.chain;
}

/** Verifikasi rantai di sisi database (fungsi arsa_audit_verify). */
export async function verifyAuditInDb(): Promise<{ valid: boolean; length: number; broken_at_seq?: number; reason?: string } | null> {
  const pool = getPool();
  if (!pool || !auditMirrorEnabled()) return null;
  try {
    const r = await pool.query("select * from arsa_audit_verify()");
    const row = r.rows[0];
    return { valid: row.valid, length: Number(row.length), broken_at_seq: row.broken_at_seq ? Number(row.broken_at_seq) : undefined, reason: row.reason ?? undefined };
  } catch {
    return null;
  }
}
