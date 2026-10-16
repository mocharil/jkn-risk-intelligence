import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { appendEntry, AuditEntry } from "@/lib/audit/chain";
import { generateSyntheticDataset } from "@/lib/data/synthetic-seed";
import { analyzeAll, narrativeText, SIMILARITY_FLOOR } from "@/lib/risk/engine";
import { localEmbed, LOCAL_MODEL } from "@/lib/ai/embeddings";
import { applyArsaMigration, closePool } from "@/lib/db/pg";
import { matchAll, upsertVectors } from "@/lib/db/vector-store";
import { mirrorAudit, verifyAuditInDb } from "@/lib/db/audit-mirror";

/** Uji terhadap Postgres + pgvector SUNGGUHAN. Dilewati bila PG_TEST_URL tidak diatur (lihat `npm run test:db`). */
const URL = process.env.PG_TEST_URL;
const d = URL ? describe : describe.skip;

d("pgvector & audit append-only di Postgres", () => {
  let pool: Pool;

  beforeAll(async () => {
    process.env.DATABASE_URL = URL;
    pool = new Pool({ connectionString: URL });
    await pool.query("drop table if exists arsa_claim_vectors cascade; drop table if exists arsa_audit_log cascade;");
    await applyArsaMigration(pool);
    await applyArsaMigration(pool); // idempoten
  });
  afterAll(async () => {
    await pool?.end();
    await closePool();
  });

  it("pgvector terpasang & tabel ada", async () => {
    const r = await pool.query("select extname from pg_extension where extname in ('vector','pgcrypto') order by 1");
    expect(r.rows.map((x) => x.extname)).toEqual(["pgcrypto", "vector"]);
  });

  it("pencarian tetangga di DB sama dengan pencarian in-process (klon terdeteksi)", async () => {
    const ds = generateSyntheticDataset();
    const rows = ds.claims.map((c) => ({ claim_id: c.claim_id, provider_id: c.provider.provider_id, primary_dx: c.diagnoses[0].code, vector: localEmbed(narrativeText(c)) }));
    await upsertVectors(pool, LOCAL_MODEL, rows);
    const n = await matchAll(pool, LOCAL_MODEL, SIMILARITY_FLOOR, 5);
    // klaim hero: tetangga teratas adalah pasangan klonnya
    expect(n.get("CLM-10293")![0].other_id).toBe("CLM-09283");
    expect(n.get("CLM-10293")![0].similarity).toBeGreaterThan(0.95);
    // setiap klaim berlabel CLONING punya tetangga sangat mirip di DB
    const cloned = Object.entries(ds.labels).filter(([, l]) => l.includes("CLONING")).map(([id]) => id);
    const hit = cloned.filter((id) => (n.get(id)?.[0]?.similarity ?? 0) >= 0.9).length;
    expect(hit / cloned.length).toBeGreaterThan(0.95);
  });

  it("analyzeAll dengan VECTOR_BACKEND=pgvector menghasilkan temuan cloning yang sama dengan in-process", async () => {
    const run = async (backend?: string) => {
      if (backend) process.env.VECTOR_BACKEND = backend;
      else delete process.env.VECTOR_BACKEND;
      const ds = generateSyntheticDataset();
      const store = { claims: ds.claims, investigations: [], embeddings: new Map(), meta: {} } as never;
      const summary = await analyzeAll(store, { forceLocal: true });
      const cloning = new Set(ds.claims.filter((c) => c.risk_findings.some((f) => f.risk_type === "CLONING")).map((c) => c.claim_id));
      return { summary, cloning };
    };
    const inproc = await run();
    const pg = await run("pgvector");
    expect(inproc.summary.vector_backend).toBe("in-process");
    expect(pg.summary.vector_backend).toBe("pgvector");
    const diff = Array.from(inproc.cloning).filter((x) => !pg.cloning.has(x)).length + Array.from(pg.cloning).filter((x) => !inproc.cloning.has(x)).length;
    expect(diff).toBeLessThanOrEqual(Math.ceil(inproc.cloning.size * 0.02)); // HNSW aproksimatif: selisih <= 2%
    delete process.env.VECTOR_BACKEND;
  });

  it("backend pgvector gagal -> kembali ke in-process dengan catatan (tidak melempar)", async () => {
    process.env.VECTOR_BACKEND = "pgvector";
    process.env.DATABASE_URL = "postgres://postgres:salah@localhost:1/none";
    await closePool();
    const ds = generateSyntheticDataset();
    const store = { claims: ds.claims.slice(0, 50), investigations: [], embeddings: new Map(), meta: {} } as never;
    const s = await analyzeAll(store, { forceLocal: true });
    expect(s.vector_backend).toBe("in-process");
    expect(s.vector_backend_note).toMatch(/pgvector gagal/);
    process.env.DATABASE_URL = URL;
    delete process.env.VECTOR_BACKEND;
    await closePool();
  });

  describe("audit trail", () => {
    const chain: AuditEntry[] = [];
    const add = (action: string, justification = "uji") => appendEntry(chain, { claim_id: "CLM-1", actor: "Aril", actor_role: "SUPERVISOR", action, previous_status: "NEW", new_status: "CONFIRMED_RISK", justification });

    it("mirror menulis rantai; verifikasi di DB valid; hash JS = hash SQL (termasuk unicode & tanda kutip)", async () => {
      add("A1");
      add("A2", 'Dasar: "operasi tidak tercatat" — \\ garis miring / unicode: éñ 日本');
      add("A3", "baris\nbaru\tdan tab");
      await mirrorAudit(chain);
      const v = await verifyAuditInDb();
      expect(v).toEqual({ valid: true, length: 3, broken_at_seq: undefined, reason: undefined });
      add("A4");
      await mirrorAudit(chain); // hanya entri baru yang ditulis
      expect((await verifyAuditInDb())!.length).toBe(4);
    });

    it("UPDATE / DELETE / TRUNCATE ditolak oleh trigger", async () => {
      await expect(pool.query("update arsa_audit_log set justification='x' where seq=1")).rejects.toThrow(/append-only/);
      await expect(pool.query("delete from arsa_audit_log where seq=1")).rejects.toThrow(/append-only/);
      await expect(pool.query("truncate arsa_audit_log")).rejects.toThrow(/append-only/);
    });

    it("INSERT yang tidak menyambung rantai ditolak (seq loncat, previous_hash salah, hash palsu)", async () => {
      const ins = (seq: number, prev: string, hash: string) =>
        pool.query("insert into arsa_audit_log (seq,log_id,ts,claim_id,actor,actor_role,action,previous_status,new_status,justification,previous_hash,hash) values ($1,'L','2026-10-02T00:00:00Z','C','a','r','x',null,null,'j',$2,$3)", [seq, prev, hash]);
      const last = chain[chain.length - 1];
      await expect(ins(99, last.hash, "0".repeat(64))).rejects.toThrow(/seq audit harus/);
      await expect(ins(5, "f".repeat(64), "0".repeat(64))).rejects.toThrow(/previous_hash/);
      await expect(ins(5, last.hash, "0".repeat(64))).rejects.toThrow(/hash tidak sesuai/);
    });

    it("superuser yang menonaktifkan trigger lalu mengubah data -> arsa_audit_verify mendeteksi", async () => {
      await pool.query("alter table arsa_audit_log disable trigger arsa_audit_no_update");
      await pool.query("update arsa_audit_log set justification='dimanipulasi' where seq=2");
      await pool.query("alter table arsa_audit_log enable trigger arsa_audit_no_update");
      const v = await verifyAuditInDb();
      expect(v?.valid).toBe(false);
      expect(v?.broken_at_seq).toBe(2);
    });
  });
});
