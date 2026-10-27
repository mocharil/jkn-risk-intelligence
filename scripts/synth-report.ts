/** Ringkasan dataset sintetis + kualitas deteksi (tanpa server). npx tsx scripts/synth-report.ts */
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
process.env.ARSA_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "arsa-report-"));
import { getStore } from "../lib/data/store";
import { evaluate } from "../lib/eval/evaluate";

const store = getStore();
const claims = store.claims;
const labelsN = Object.values(store.labels).filter((l) => l.length > 0).length;
const pct = (n: number, d: number) => `${((100 * n) / d).toFixed(1)}%`;
console.log(`klaim ${claims.length}, faskes ${store.providers.length}, dokter ${store.doctors.length}`);
console.log(`berlabel anomali: ${labelsN} (${pct(labelsN, claims.length)})`);
const lv = (l: string) => claims.filter((c) => c.risk_level === l).length;
console.log(`risiko: kritis ${lv("CRITICAL")}, tinggi ${lv("HIGH")}, sedang ${lv("MEDIUM")}, rendah ${lv("LOW")} | skor>=75: ${pct(claims.filter((c) => c.risk_score >= 75).length, claims.length)}, >=50: ${pct(claims.filter((c) => c.risk_score >= 50).length, claims.length)}`);
const rep = evaluate(claims, store.labels);
console.log(`makro F1 ${rep.macro.f1}, mikro P ${rep.micro.precision} R ${rep.micro.recall}, FPR klaim normal ${rep.claim_level.false_positive_rate}, recall klaim anomali ${rep.claim_level.recall}`);
for (const d of rep.per_detector) console.log(`  ${d.risk_type.padEnd(16)} positif ${String(d.positives).padStart(3)} TP ${String(d.tp).padStart(3)} FP ${String(d.fp).padStart(3)} FN ${String(d.fn).padStart(3)} P ${d.precision} R ${d.recall} F1 ${d.f1}`);
const byProv = store.providers.slice().sort((a, b) => b.risk_score - a.risk_score);
console.log("faskes teratas:", byProv.slice(0, 5).map((p) => `${p.name} (${p.high_risk_claims}/${p.total_claims}, skor ${p.risk_score})`).join("; "));
console.log("faskes berisiko (HIGH/CRIT):", store.providers.filter((p) => p.risk_level === "HIGH" || p.risk_level === "CRITICAL").length, "dari", store.providers.length);
const sizes = store.providers.map((p) => p.total_claims).sort((a, b) => a - b);
console.log("klaim/faskes min/median/maks:", sizes[0], sizes[Math.floor(sizes.length / 2)], sizes[sizes.length - 1]);
process.exit(0);
