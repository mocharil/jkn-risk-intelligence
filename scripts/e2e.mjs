// E2E HTTP: membangun alur lengkap terhadap `next start` + server LLM tiruan.
//   npm run build && npm run test:e2e
import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const APP = 3101;
const LLM = 4011;
const BASE = `http://localhost:${APP}`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "arsa-e2e-"));

let passed = 0;
const failures = [];
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok   ${name}`); }
  else { failures.push(name); console.log(`  FAIL ${name} ${detail}`); }
};

const procs = [];
function start(cmd, args, env) {
  const p = spawn(cmd, args, { shell: false, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  p.stdout.on("data", () => {});
  p.stderr.on("data", (d) => { if (process.env.DEBUG_E2E) process.stderr.write(d); });
  procs.push(p);
  return p;
}
async function waitFor(url, ms = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { const r = await fetch(url); if (r.status < 500) return; } catch {} await new Promise((r) => setTimeout(r, 400)); }
  throw new Error(`timeout menunggu ${url}`);
}

class Client {
  constructor() { this.cookie = ""; }
  async req(p, init = {}) {
    const r = await fetch(BASE + p, { ...init, redirect: "manual", headers: { ...(init.headers || {}), cookie: this.cookie } });
    const sc = r.headers.get("set-cookie");
    if (sc) this.cookie = sc.split(";")[0];
    return r;
  }
  async json(p, init) { const r = await this.req(p, init); return { status: r.status, body: await r.json().catch(() => null) }; }
  post(p, body) { return this.json(p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); }
  patch(p, body) { return this.json(p, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); }
  async login(email) { const r = await this.post("/api/auth/login", { email, password: "Arsa#2026" }); return r; }
}

async function main() {
  console.log("Menjalankan server LLM tiruan & aplikasi...");
  const distDir = process.env.NEXT_DIST_DIR || (fs.existsSync(".next/routes-manifest.json") ? ".next" : fs.existsSync(".next-prod/routes-manifest.json") ? ".next-prod" : ".next");
  start(process.execPath, ["scripts/mock-llm.mjs", String(LLM)], {});
  start(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(APP)], {
    NEXT_DIST_DIR: distDir,
    ARSA_DATA_DIR: dataDir,
    AUTH_SECRET: "e2e-secret",
    PII_HMAC_SECRET: "e2e-pii",
    LLM_PROVIDER: "openai",
    OPENAI_BASE_URL: `http://localhost:${LLM}/v1`,
    OPENAI_API_KEY: "e2e",
    OPENAI_MODEL: "mock-model",
    OPENAI_EMBEDDING_MODEL: "mock-embed",
    NEXT_PUBLIC_SUPABASE_URL: "",
  });
  await waitFor(`${BASE}/login`);
  await waitFor(`http://localhost:${LLM}/v1/x`).catch(() => {});

  const anon = new Client();
  console.log("\n[1] Proteksi akses");
  check("halaman tanpa login -> redirect ke /login", (await anon.req("/")).status === 307);
  check("API tanpa login -> 401", (await anon.json("/api/claims")).status === 401);
  check("login salah -> 401", (await anon.post("/api/auth/login", { email: "investigator@arsa.id", password: "salah" })).status === 401);

  const inv = new Client();
  const sup = new Client();
  const adm = new Client();
  check("login investigator", (await inv.login("investigator@arsa.id")).status === 200);
  check("login supervisor", (await sup.login("supervisor@arsa.id")).status === 200);
  check("login admin", (await adm.login("admin@arsa.id")).status === 200);

  console.log("\n[2] Status AI (provider OpenAI-compatible tiruan)");
  const st = (await inv.json("/api/system/status")).body;
  check("provider = openai & tersedia", st.ai.provider === "openai" && st.ai.available === true, JSON.stringify(st.ai));
  check("embedding tersedia dari provider", st.ai.embedding_available === true);

  console.log("\n[3] RBAC");
  const fin = { determination: { verdict: "CONFIRMED_RISK", rationale: "Registri IBS tidak memuat tindakan (DOC-10293-04)" } };
  check("investigator ditolak keputusan final (403)", (await inv.patch("/api/investigations/INV-2026-010293", fin)).status === 403);
  const ok = await sup.patch("/api/investigations/INV-2026-010293", fin);
  check("supervisor boleh keputusan final", ok.status === 200 && ok.body.data.status === "CONFIRMED_RISK");
  check("investigator boleh upload dataset (izin dataset.upload); permintaan kosong ditolak 400, bukan 403", (await inv.req("/api/datasets", { method: "POST" })).status === 400);
  check("non-admin ditolak reset demo (403)", (await sup.post("/api/demo/reset", {})).status === 403);

  console.log("\n[4] Copilot via LLM: sitasi tervalidasi");
  const c1 = (await inv.post("/api/copilot", { question: "Mengapa klaim CLM-10293 dianggap kritis?" })).body;
  check("mode llm dengan sitasi valid", c1.mode === "llm" && c1.grounding.valid_citations >= 1, JSON.stringify(c1.grounding));
  check("sitasi dinomori [n] dan punya bukti", /\[1\]/.test(c1.answer) && c1.evidence_citations.length >= 1);
  const c2 = (await inv.post("/api/copilot", { question: "HALUSINASI tolong" })).body;
  check("sitasi karangan ditolak -> fallback deterministik", c2.mode === "deterministic" && /sitasi/i.test(c2.fallback_reason || ""), JSON.stringify({ m: c2.mode, r: c2.fallback_reason }));

  console.log("\n[5] Copilot streaming (SSE)");
  const sr = await inv.req("/api/copilot?stream=1", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: "Mengapa klaim CLM-10293 dianggap kritis?" }) });
  const raw = await sr.text();
  const events = raw.split("\n\n").filter((l) => l.startsWith("data:")).map((l) => JSON.parse(l.slice(5)));
  check("urutan event start -> delta+ -> final", events[0]?.type === "start" && events.some((e) => e.type === "delta") && events[events.length - 1]?.type === "final");
  check("final tervalidasi (mode llm, sitasi valid)", events[events.length - 1].response.mode === "llm" && events[events.length - 1].response.grounding.valid_citations >= 1);
  const sh = await inv.req("/api/copilot?stream=1", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: "HALUSINASI tolong" }) });
  const sev = (await sh.text()).split("\n\n").filter((l) => l.startsWith("data:")).map((l) => JSON.parse(l.slice(5)));
  check("streaming: jawaban halusinasi diganti deterministik pada final", sev[sev.length - 1].response.mode === "deterministic");

  console.log("\n[6] Penjelasan temuan & briefing");
  const ex = (await inv.json("/api/claims/CLM-10293/explain", { method: "POST" })).body;
  check("penjelasan oleh LLM bersitasi dokumen", ex.explanation_mode === "llm" && ex.data.risk_findings.every((f) => f.ai_explanation?.source === "llm"), JSON.stringify(ex.fallback_reason));
  const t0 = Date.now();
  const dash = (await inv.json("/api/dashboard")).body;
  check("dashboard tidak menunggu LLM (briefing pending, < 2 dtk)", Date.now() - t0 < 2000 && (dash.kpis.ai_briefing.pending === true || dash.kpis.ai_briefing.source === "llm"), `${Date.now() - t0}ms`);
  const br = (await inv.json("/api/dashboard/briefing")).body;
  check("briefing dashboard oleh LLM", br.ai_briefing.source === "llm");

  console.log("\n[7] Ingest nyata + anonimisasi");
  const csv = fs.readFileSync("scripts/fixtures/pii-uji/simrs_rs_a.csv");
  const form = new FormData();
  form.append("file", new Blob([csv], { type: "text/csv" }), "simrs_rs_a.csv");
  const up = await sup.json("/api/datasets", { method: "POST", body: form });
  check("upload -> MAPPING_REQUIRED, mapping engine llm+heuristic", up.status === 200 && up.body.data.status === "MAPPING_REQUIRED" && up.body.mapping_engine === "llm+heuristic", JSON.stringify(up.body?.error || up.body?.mapping_engine));
  check("kolom PII ditangani (NIK dipseudonim, alamat/HP dihapus)", up.body.data.anonymization.columns_dropped.includes("ALAMAT") && up.body.data.anonymization.columns_pseudonymized.includes("NIK"));
  const conf = await sup.post(`/api/datasets/${up.body.data.dataset_id}/mapping`, { mappings: up.body.data.mappings });
  check("konfirmasi mapping -> READY, 151 klaim", conf.body?.data?.status === "READY" && conf.body.data.result.claims_ingested === 151, JSON.stringify(conf.body?.error || conf.body?.data?.result));
  check("analisis memakai embedding provider (bukan lokal)", conf.body.data.result.embedding_model.startsWith("openai:"), conf.body?.data?.result?.embedding_model);
  const ing = (await sup.json("/api/claims?full=1&limit=1000&search=SIMRS-A")).body;
  const blob = JSON.stringify(ing.data);
  check("tidak ada NIK 16 digit / nomor HP mentah pada klaim tersimpan", !/(?<!\d)\d{16}(?!\d)/.test(blob) && !/(?<!\d)08\d{8,11}/.test(blob));
  const files = fs.readdirSync(path.join(dataDir, "uploads"));
  const disk = files.map((f) => fs.readFileSync(path.join(dataDir, "uploads", f), "utf8")).join("");
  check("tidak ada PII mentah di disk", !/(?<!\d)\d{16}(?!\d)/.test(disk) && !/Jl\. Mawar/.test(disk));

  console.log("\n[3b] Aksi admin");
  check("admin dapat reset demo", (await adm.post("/api/demo/reset", {})).status === 200);

  console.log("\n[8] Audit, laporan, metrik");
  const au = (await sup.json("/api/audit?limit=5")).body;
  check("hash chain valid", au.verification.valid === true && au.total > 3);
  const pdf = await sup.req("/api/reports/INV-2026-010293/pdf");
  const bytes = Buffer.from(await pdf.arrayBuffer());
  check("PDF laporan valid (header %PDF)", pdf.status === 200 && bytes.slice(0, 4).toString() === "%PDF");
  const ev = (await sup.json("/api/evaluation")).body;
  check("metrik evaluasi tersedia (F1 makro >= 0.9)", ev.data.macro.f1 >= 0.9, String(ev.data.macro.f1));

  console.log("\n[9] Halaman utama merender (tanpa error server)");
  for (const pth of ["/", "/claims", "/investigation-queue", "/copilot", "/data-management", "/settings", "/model-performance", "/acuan-nasional", "/risk-intelligence", "/reports", "/providers"]) {
    const r = await sup.req(pth);
    check(`GET ${pth} -> 200`, r.status === 200, String(r.status));
  }
}

main()
  .catch((e) => { failures.push(`fatal: ${e.message}`); console.error(e); })
  .finally(() => {
    procs.forEach((p) => {
      try {
        if (process.platform === "win32") spawn("taskkill", ["/PID", String(p.pid), "/T", "/F"], { shell: true, stdio: "ignore" });
        else p.kill();
      } catch {}
    });
    try { fs.rmSync(dataDir, { recursive: true, force: true }); } catch {}
    console.log(`\n${passed} lulus, ${failures.length} gagal`);
    if (failures.length) { console.log("Gagal:\n - " + failures.join("\n - ")); setTimeout(() => process.exit(1), 500); }
    else setTimeout(() => process.exit(0), 500);
  });
