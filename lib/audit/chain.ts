import { createHash } from "crypto";

/**
 * Audit trail append-only dengan hash chain SHA-256.
 * hash_n = SHA256(hash_{n-1} || canonical_json(payload_n))
 * Mengubah / menghapus / menyisipkan satu entri apa pun membuat verifikasi gagal.
 */

export const GENESIS_HASH = "0".repeat(64);

export interface AuditEntry {
  seq: number;
  log_id: string;
  timestamp: string;
  claim_id: string;
  actor: string;
  actor_role: string;
  action: string;
  previous_status: string | null;
  new_status: string | null;
  justification: string;
  previous_hash: string;
  hash: string;
}

export type AuditInput = Omit<AuditEntry, "seq" | "log_id" | "timestamp" | "previous_hash" | "hash"> & {
  timestamp?: string;
};

type Payload = Omit<AuditEntry, "previous_hash" | "hash">;

function canonical(payload: Payload): string {
  // Urutan kunci tetap agar hash deterministik.
  return JSON.stringify([
    payload.seq,
    payload.log_id,
    payload.timestamp,
    payload.claim_id,
    payload.actor,
    payload.actor_role,
    payload.action,
    payload.previous_status,
    payload.new_status,
    payload.justification,
  ]);
}

export function computeHash(previousHash: string, payload: Payload): string {
  return createHash("sha256").update(previousHash).update(canonical(payload)).digest("hex");
}

export function appendEntry(chain: AuditEntry[], input: AuditInput): AuditEntry {
  const prev = chain.length > 0 ? chain[chain.length - 1] : null;
  const seq = prev ? prev.seq + 1 : 1;
  const payload: Payload = {
    seq,
    log_id: `LOG-${String(seq).padStart(6, "0")}`,
    timestamp: input.timestamp || new Date().toISOString(),
    claim_id: input.claim_id,
    actor: input.actor,
    actor_role: input.actor_role,
    action: input.action,
    previous_status: input.previous_status,
    new_status: input.new_status,
    justification: input.justification,
  };
  const previous_hash = prev ? prev.hash : GENESIS_HASH;
  const entry: AuditEntry = { ...payload, previous_hash, hash: computeHash(previous_hash, payload) };
  chain.push(entry);
  return entry;
}

export interface ChainVerification {
  valid: boolean;
  length: number;
  broken_at_seq?: number;
  reason?: string;
  head_hash: string;
}

export function verifyChain(chain: AuditEntry[]): ChainVerification {
  let prevHash = GENESIS_HASH;
  for (let i = 0; i < chain.length; i++) {
    const e = chain[i];
    if (e.seq !== i + 1) {
      return { valid: false, length: chain.length, broken_at_seq: e.seq, reason: "Urutan seq tidak berurutan (entri hilang/disisipkan)", head_hash: prevHash };
    }
    if (e.previous_hash !== prevHash) {
      return { valid: false, length: chain.length, broken_at_seq: e.seq, reason: "previous_hash tidak cocok dengan entri sebelumnya", head_hash: prevHash };
    }
    const { previous_hash, hash, ...payload } = e;
    if (computeHash(previous_hash, payload) !== hash) {
      return { valid: false, length: chain.length, broken_at_seq: e.seq, reason: "Isi entri telah diubah (hash tidak cocok)", head_hash: prevHash };
    }
    prevHash = e.hash;
  }
  return { valid: true, length: chain.length, head_hash: prevHash };
}
