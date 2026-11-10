import fs from "fs";
import os from "os";
import path from "path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getStore } from "@/lib/data/store";
import { DatabaseService } from "@/lib/supabase/db-service";
import { computeDashboardKPIs, computeQueueByType } from "@/lib/analytics/aggregates";
import { getGovernancePolicy } from "@/lib/governance/policy";
import { ALL_RISK_TYPES } from "@/types/risk";

/** Chip "Sinyal dalam antrean": angkanya harus sama dengan jumlah baris antrean setelah chip itu diklik. */

let dir = "";
beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "arsa-queue-"));
  process.env.ARSA_DATA_DIR = dir;
});
afterAll(() => {
  delete process.env.ARSA_DATA_DIR;
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("hitungan sinyal di antrean", () => {
  it("sama dengan jumlah baris antrean untuk tiap jenis sinyal", async () => {
    const store = getStore();
    const counts = computeQueueByType(store.investigations, getGovernancePolicy().queue_min_score);
    expect(counts.map((c) => c.risk_type)).toEqual(ALL_RISK_TYPES);
    for (const c of counts) {
      const filtered = await DatabaseService.getInvestigations({ risk_type: c.risk_type });
      expect(c.count, c.risk_type).toBe(filtered.total_count);
    }
  });

  it("berbeda dari hitungan seluruh dataset (risk_by_type) bila ada sinyal di klaim yang tidak masuk antrean", () => {
    const store = getStore();
    const queue = computeQueueByType(store.investigations, getGovernancePolicy().queue_min_score);
    const all = new Map((computeDashboardKPIs(store).risk_by_type ?? []).map((t) => [t.risk_type, t.claim_count]));
    // Klaim ditandai > klaim di antrean: tidak ada jenis sinyal yang antreannya melebihi jumlah seluruh klaim bertanda itu.
    queue.forEach((c) => expect(c.count).toBeLessThanOrEqual(all.get(c.risk_type) ?? 0));
    expect(queue.some((c) => c.count < (all.get(c.risk_type) ?? 0))).toBe(true);
  });

  it("kasus baru di bawah skor minimum kebijakan tidak dihitung", () => {
    const inv = [
      { status: "NEW", risk_score: 60, primary_risk_signals: ["UPCODING" as const], potential_exposure: 100 },
      { status: "NEW", risk_score: 80, primary_risk_signals: ["UPCODING" as const], potential_exposure: 200 },
      { status: "UNDER_INVESTIGATION", risk_score: 60, primary_risk_signals: ["UPCODING" as const], potential_exposure: 300 },
    ];
    const up = computeQueueByType(inv, 75).find((c) => c.risk_type === "UPCODING")!;
    expect(up.count).toBe(2);
    expect(up.potential_exposure).toBe(500);
  });
});
