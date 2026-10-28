import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getStore } from "@/lib/data/store";
import { SEED_VERSION } from "@/lib/data/synthetic-seed";

const g = globalThis as unknown as { __arsaStore?: unknown };
let dir = "";

function snapshot(ids: { claim: string; inv: string }, seedVersion?: string) {
  const assigned = { user_id: "USR-002", name: "Supervisor Uji", avatar: "SU", role: "SUPERVISOR" };
  return {
    version: 1,
    ...(seedVersion ? { seed_version: seedVersion } : {}),
    datasets: [],
    ingested_claims: [],
    investigation_overrides: { [ids.inv]: { status: "CONFIRMED_RISK", notes: [], decision: undefined, assigned_to: assigned, updated_at: "2026-10-01T00:00:00Z" } },
    claim_status: { [ids.claim]: "CONFIRMED_RISK" },
    audit_log: [],
    users: [],
  };
}

/** ID klaim/kasus pertama pada dataset bawaan (deterministik): dibaca dari store kosong, bukan ditulis tangan. */
async function probeIds() {
  const store = await boot();
  const inv = store.investigations[0];
  delete g.__arsaStore;
  return { claim: inv.claim_id, inv: inv.investigation_id };
}

async function boot() {
  delete g.__arsaStore;
  return getStore();
}

describe("versi dataset bawaan pada snapshot", () => {
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "arsa-seed-"));
    process.env.ARSA_DATA_DIR = dir;
  });
  afterEach(async () => {
    // Penyimpanan snapshot tertunda 250 ms; biarkan selesai ke direktori sementara sebelum env dikembalikan.
    await new Promise((r) => setTimeout(r, 500));
    delete g.__arsaStore;
    delete process.env.ARSA_DATA_DIR;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("snapshot tanpa/berbeda versi: status kasus lama tidak diterapkan, dicatat di audit", async () => {
    const ids = await probeIds();
    fs.writeFileSync(path.join(dir, "arsa-state.json"), JSON.stringify(snapshot(ids)));
    const store = await boot();
    const claim = store.claims.find((c) => c.claim_id === ids.claim)!;
    expect(claim.status).not.toBe("CONFIRMED_RISK");
    expect(store.investigations.find((i) => i.claim_id === ids.claim)!.status).toBe("NEW");
    expect(store.auditLog.some((e) => e.action === "SEED_REFRESHED")).toBe(true);
  });

  it("snapshot berversi sama: status kasus pengguna dipulihkan", async () => {
    const ids = await probeIds();
    fs.writeFileSync(path.join(dir, "arsa-state.json"), JSON.stringify(snapshot(ids, SEED_VERSION)));
    const store = await boot();
    expect(store.claims.find((c) => c.claim_id === ids.claim)!.status).toBe("CONFIRMED_RISK");
    expect(store.investigations.find((i) => i.claim_id === ids.claim)!.status).toBe("CONFIRMED_RISK");
    expect(store.auditLog.some((e) => e.action === "SEED_REFRESHED")).toBe(false);
  });
});
