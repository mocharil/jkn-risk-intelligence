import { describe, expect, it } from "vitest";
import { evaluate } from "@/lib/eval/evaluate";
import type { CanonicalClaim } from "@/types/claim";

const claim = (id: string, signals: string[]) =>
  ({ claim_id: id, claim_amount: 100, approved_tariff: 100, risk_findings: signals.map((t) => ({ risk_type: t, evidence: [] })), medical_evidence: [] }) as unknown as CanonicalClaim;

describe("evaluasi detektor", () => {
  it("rerata makro hanya atas detektor yang punya kasus berlabel", () => {
    const claims = [claim("A", ["UPCODING"]), claim("B", []), claim("C", ["UPCODING"])];
    const labels = { A: ["UPCODING"], B: [], C: ["UPCODING"] } as never;
    const rep = evaluate(claims, labels);
    expect(rep.per_detector.find((d) => d.risk_type === "UPCODING")!.f1).toBe(1);
    // 7 detektor lain tanpa positif tidak boleh menurunkan rerata
    expect(rep.macro.f1).toBe(1);
  });
});
