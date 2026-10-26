// Uji LIVE jalur LLM terhadap provider sungguhan (kredensial dari .env.local / gemini_sa.json).
//   node scripts/live-llm.mjs   (server harus berjalan di BASE, default http://localhost:3103)
import fs from "fs";
const BASE = process.env.BASE || "http://localhost:3103";
let cookie = "";
let passed = 0;
const fails = [];
const check = (n, c, d = "") => (c ? (passed++, console.log("  ok  ", n)) : (fails.push(n), console.log("  FAIL", n, d)));
const call = async (p, init = {}) => {
  const r = await fetch(BASE + p, { ...init, headers: { ...(init.headers || {}), cookie } });
  const sc = r.headers.get("set-cookie");
  if (sc) cookie = sc.split(";")[0];
  return r;
};
const post = async (p, b) => (await call(p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) })).json();

await post("/api/auth/login", { email: "supervisor@arsa.id", password: "Arsa#2026" });
const st = await (await call("/api/system/status?refresh=1")).json();
console.log("AI:", st.ai.provider, st.ai.model, "| available:", st.ai.available, st.ai.reason || "");
check("provider tersedia", st.ai.available);

console.log("\n[Copilot]");
const c1 = await post("/api/copilot", { question: "Mengapa klaim CLM-10293 dianggap kritis? Jelaskan singkat." });
console.log("  jawaban:", c1.answer.slice(0, 300).replace(/\n/g, " "), "...");
check("mode llm", c1.mode === "llm", c1.fallback_reason);
check("sitasi valid >= 2", c1.grounding.valid_citations >= 2, JSON.stringify(c1.grounding));
check("tidak ada sitasi dibuang", c1.grounding.removed_invalid_citations === 0, String(c1.grounding.removed_invalid_citations));

console.log("\n[Streaming]");
const sr = await call("/api/copilot?stream=1", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: "Faskes mana yang paling berisiko dan apa polanya?" }) });
const evs = (await sr.text()).split("\n\n").filter((l) => l.startsWith("data:")).map((l) => JSON.parse(l.slice(5)));
const deltas = evs.filter((e) => e.type === "delta").length;
const fin = evs[evs.length - 1];
console.log("  delta events:", deltas, "| final mode:", fin.response?.mode, "| sitasi:", fin.response?.grounding?.valid_citations);
check("streaming: banyak potongan + final", deltas >= 2 && fin.type === "final");
check("streaming: final llm bersitasi", fin.response.mode === "llm" && fin.response.grounding.valid_citations >= 1, fin.response.fallback_reason);

console.log("\n[Penjelasan temuan]");
const ex = await (await call("/api/claims/CLM-10293/explain?force=1", { method: "POST" })).json();
const f0 = ex.data.risk_findings[0];
console.log("  ", f0.risk_type + ":", (f0.ai_explanation?.text || "").slice(0, 220));
check("penjelasan oleh LLM", ex.explanation_mode === "llm", ex.fallback_reason);
check("semua temuan bersumber llm", ex.data.risk_findings.every((f) => f.ai_explanation?.source === "llm"));

console.log("\n[Briefing]");
const t0 = Date.now();
const dash = await (await call("/api/dashboard")).json();
const dms = Date.now() - t0;
console.log("  dashboard:", dms + "ms", "| pending:", dash.kpis.ai_briefing.pending);
check("dashboard tampil < 2 dtk (tidak menunggu LLM)", dms < 2000, `${dms}ms`);
const t1 = Date.now();
const br = await (await call("/api/dashboard/briefing")).json();
console.log("  ", br.ai_briefing.source, `${Date.now() - t1}ms`, "|", br.ai_briefing.summary.slice(0, 200));
check("briefing oleh LLM", br.ai_briefing.source === "llm");

console.log("\n[AI mapping + embedding Vertex pada analisis]");
const form = new FormData();
form.append("file", new Blob([fs.readFileSync("scripts/fixtures/pii-uji/simrs_rs_b.csv")], { type: "text/csv" }), "simrs_rs_b.csv");
const up = await (await call("/api/datasets", { method: "POST", body: form })).json();
console.log("  engine:", up.mapping_engine, "|", (up.note || "").slice(0, 100));
check("mapping oleh LLM+heuristik", up.mapping_engine === "llm+heuristic", up.note);
console.log("  dipetakan:", up.data.mappings.filter((m) => m.canonical_field).map((m) => `${m.source_field}->${m.canonical_field}(${m.suggested_by})`).join(", "));
const conf = await post(`/api/datasets/${up.data.dataset_id}/mapping`, { mappings: up.data.mappings });
console.log("  hasil:", JSON.stringify(conf.data?.result), conf.error || "");
check("normalisasi sukses", conf.data?.status === "READY");
check("analisis memakai embedding Vertex (bukan lokal)", String(conf.data?.result?.embedding_model).startsWith("gemini:"), conf.data?.result?.embedding_model);

console.log(`\n${passed} lulus, ${fails.length} gagal`);
process.exit(fails.length ? 1 : 0);
