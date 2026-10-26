import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { can } from "@/lib/auth/types";
import { getStore, persist } from "@/lib/data/store";
import * as policyMod from "@/lib/governance/policy";

const g = globalThis as unknown as { __arsaStore?: unknown; __arsaGovernancePolicy?: unknown };
let dir = "";

async function boot() {
  delete g.__arsaStore;
  delete g.__arsaGovernancePolicy;
  const store = getStore();
  return { store, policy: policyMod };
}

describe("kebijakan tata kelola", () => {
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "arsa-policy-"));
    process.env.ARSA_DATA_DIR = dir;
  });
  afterEach(async () => {
    await new Promise((r) => setTimeout(r, 500));
    delete g.__arsaStore;
    delete g.__arsaGovernancePolicy;
    delete process.env.ARSA_DATA_DIR;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("hanya Administrator yang boleh mengubah kebijakan", () => {
    expect(can("ADMIN", "admin.policy")).toBe(true);
    expect(can("SUPERVISOR", "admin.policy")).toBe(false);
    expect(can("INVESTIGATOR", "admin.policy")).toBe(false);
  });

  it("kebijakan tersimpan di snapshot dan dipulihkan setelah restart", async () => {
    const first = await boot();
    first.policy.setGovernancePolicy({ ...first.policy.getGovernancePolicy(), queue_min_score: 85, sla_target_hours: 72 });
    persist();
    await new Promise((r) => setTimeout(r, 600));

    const saved = JSON.parse(fs.readFileSync(path.join(dir, "arsa-state.json"), "utf8"));
    expect(saved.governance_policy.queue_min_score).toBe(85);

    const second = await boot();
    expect(second.policy.getGovernancePolicy().queue_min_score).toBe(85);
    expect(second.policy.getGovernancePolicy().sla_target_hours).toBe(72);
  });

  it("skor minimum antrean menentukan klaim yang menjadi kasus", async () => {
    const standard = await boot();
    const n75 = standard.store.investigations.length;
    expect(standard.store.investigations.every((i) => i.risk_score >= 75)).toBe(true);

    delete g.__arsaStore;
    g.__arsaGovernancePolicy = { ...policyMod.defaultPolicy(), queue_min_score: 90 };
    const strict = getStore();
    expect(strict.investigations.length).toBeLessThan(n75);
    expect(strict.investigations.every((i) => i.risk_score >= 90)).toBe(true);
  });
});
