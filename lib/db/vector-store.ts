import { Pool } from "pg";
import { EMBEDDING_DIM, normalizeVectorDim } from "../ai/embeddings";
import { getPool } from "./pg";

/**
 * Backend pgvector: simpan vektor narasi + cari tetangga terdekat di database (indeks HNSW, cosine).
 * Aktif bila VECTOR_BACKEND=pgvector dan DATABASE_URL tersedia; bila gagal, engine kembali ke pencarian in-process.
 */
export function pgvectorEnabled(): boolean {
  return process.env.VECTOR_BACKEND === "pgvector" && Boolean(process.env.DATABASE_URL);
}

export interface VectorRow {
  claim_id: string;
  provider_id: string;
  primary_dx: string;
  vector: number[];
}

const toLiteral = (v: number[]) => `[${v.join(",")}]`;

export async function upsertVectors(pool: Pool, model: string, rows: VectorRow[]): Promise<void> {
  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const params: unknown[] = [];
    const values = slice
      .map((r, k) => {
        if (!r.vector || r.vector.length === 0) throw new Error(`Vektor ${r.claim_id} kosong`);
        const vec = r.vector.length === EMBEDDING_DIM ? r.vector : normalizeVectorDim(r.vector, EMBEDDING_DIM);
        params.push(r.claim_id, r.provider_id, r.primary_dx, model, toLiteral(vec));
        const o = k * 5;
        return `($${o + 1},$${o + 2},$${o + 3},$${o + 4},$${o + 5}::vector)`;
      })
      .join(",");
    await pool.query(
      `insert into arsa_claim_vectors (claim_id, provider_id, primary_dx, model, embedding) values ${values}
       on conflict (claim_id) do update set provider_id = excluded.provider_id, primary_dx = excluded.primary_dx, model = excluded.model, embedding = excluded.embedding, updated_at = now()`,
      params
    );
  }
}

/** claim_id -> [{ other_id, similarity }] (urut turun), dari satu panggilan set-based. */
export async function matchAll(pool: Pool, model: string, threshold: number, limit: number): Promise<Map<string, { other_id: string; similarity: number }[]>> {
  const res = await pool.query("select claim_id, other_id, similarity from arsa_match_all($1, $2, $3)", [model, threshold, limit]);
  const out = new Map<string, { other_id: string; similarity: number }[]>();
  for (const r of res.rows) {
    const arr = out.get(r.claim_id) || [];
    arr.push({ other_id: r.other_id, similarity: Number(r.similarity) });
    out.set(r.claim_id, arr);
  }
  out.forEach((arr) => arr.sort((a, b) => b.similarity - a.similarity));
  return out;
}

/** Sinkronkan vektor store -> DB lalu ambil tetangga untuk seluruh klaim. Mengembalikan null bila tidak aktif / gagal. */
export async function searchViaPgvector(
  rows: VectorRow[],
  model: string,
  threshold: number,
  limit = 5
): Promise<{ neighbors: Map<string, { other_id: string; similarity: number }[]>; error?: undefined } | { neighbors: null; error: string } | null> {
  if (!pgvectorEnabled()) return null;
  const pool = getPool();
  if (!pool) return null;
  try {
    await upsertVectors(pool, model, rows);
    // Buang vektor klaim yang sudah tidak ada (mis. setelah reset demo).
    await pool.query("delete from arsa_claim_vectors where claim_id <> all($1::text[])", [rows.map((r) => r.claim_id)]);
    return { neighbors: await matchAll(pool, model, threshold, limit) };
  } catch (e) {
    return { neighbors: null, error: (e instanceof Error ? e.message : String(e)).slice(0, 200) };
  }
}
