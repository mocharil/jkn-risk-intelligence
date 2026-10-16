import { getStore } from "../lib/data/store";
import { evaluate } from "../lib/eval/evaluate";

const t0 = Date.now();
const store = getStore();
console.log(`boot+analyze: ${Date.now() - t0}ms | claims=${store.claims.length} providers=${store.providers.length} investigations=${store.investigations.length}`);
console.log("analysis:", JSON.stringify(store.meta.last_analysis));
const rep = evaluate(store.claims, store.labels);
console.table(rep.per_detector.map((m) => ({ type: m.risk_type, pos: m.positives, tp: m.tp, fp: m.fp, fn: m.fn, P: m.precision, R: m.recall, F1: m.f1 })));
console.log("macro", rep.macro, "micro", rep.micro);
console.log("claim-level", rep.claim_level, "evidence", rep.evidence_completeness);
const hero = store.claims.find((c) => c.claim_id === "CLM-10293")!;
console.log("HERO", hero.risk_score, hero.risk_level, hero.risk_findings.map((f) => `${f.risk_type}:${f.risk_score}/${f.confidence}`).join(" | "));
console.log("HERO similar", hero.similar_claims.map((s) => `${s.claim_id}:${s.similarity_score}`).join(", "));
