// Smoke test semua halaman & API terhadap server yang sudah berjalan.
//   node scripts/smoke-all.mjs [http://localhost:3000]
// Variabel env: SMOKE_PASSWORD (sandi akun demo), SMOKE_USERS (email dipisah koma).
const BASE = process.argv[2] || "http://localhost:3000";
const PASSWORD = process.env.SMOKE_PASSWORD || process.env.DEMO_PASSWORD || "Arsa#2026";
const USERS = (process.env.SMOKE_USERS || "investigator@arsa.id,supervisor@arsa.id,admin@arsa.id").split(",").filter(Boolean);

const pagesFor = ({ claim, provider }) => [
  "/",
  "/landing",
  "/login",
  "/register",
  "/risk-intelligence",
  "/investigation-queue",
  "/claims",
  `/investigations/${claim}`,
  "/reports",
  `/reports/${claim}`,
  "/providers",
  `/providers/${provider}`,
  "/copilot",
  "/data-management",
  "/model-performance",
  "/acuan-nasional",
  "/settings",
];
const apisFor = ({ claim, provider }) => [
  "/api/dashboard",
  "/api/claims?limit=5",
  `/api/claims/${claim}`,
  "/api/investigations?limit=5",
  `/api/investigations/${claim}`,
  "/api/providers",
  `/api/providers/${provider}`,
  "/api/graph",
  "/api/reference/national",
  "/api/evaluation",
  "/api/system/status",
  "/api/audit",
  "/api/public/stats",
  "/api/datasets",
  "/api/users",
  `/api/reports/${claim}/pdf`,
];

let fail = 0;
const log = (ok, msg) => { if (!ok) fail++; console.log(`${ok ? "ok  " : "FAIL"} ${msg}`); };

async function login(email) {
  const r = await fetch(`${BASE}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password: PASSWORD }) });
  const cookie = (r.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]).join("; ");
  return { status: r.status, cookie };
}

async function targetsFor(cookie) {
  if (!cookie) return { claim: "CLM-0", provider: "FKL-000" };
  const get = async (u) => (await (await fetch(BASE + u, { headers: { cookie } })).json()).data?.[0];
  return { claim: (await get("/api/claims?limit=1"))?.claim_id ?? "CLM-0", provider: (await get("/api/providers?limit=1"))?.provider_id ?? "FKL-000" };
}

async function run(label, cookie) {
  console.log(`\n== ${label} ==`);
  const t = await targetsFor(cookie);
  const PAGES = pagesFor(t);
  const APIS = apisFor(t);
  for (const p of PAGES) {
    const r = await fetch(BASE + p, { headers: { cookie }, redirect: "manual" });
    log(r.status === 200 || r.status === 307 || r.status === 302, `GET ${p} -> ${r.status}`);
  }
  for (const a of APIS) {
    const r = await fetch(BASE + a, { headers: { cookie } });
    const isPdf = a.endsWith("/pdf");
    const text = isPdf ? "" : await r.text();
    const bad = !isPdf && /\bNaN\b|\bundefined\b|Infinity/.test(text);
    const expected = cookie
      ? (a === "/api/users" && label !== "admin@arsa.id" ? r.status === 403 : r.status === 200)
      : (a === "/api/public/stats" ? r.status === 200 : r.status === 401);
    log(expected && !bad, `GET ${a} -> ${r.status}${bad ? " (berisi NaN/undefined/Infinity)" : ""}`);
  }
}

console.log("Anonim");
await run("anonim", "");
for (const email of USERS) {
  const { status, cookie } = await login(email);
  if (status !== 200) { log(false, `login ${email} -> ${status}`); continue; }
  await run(email, cookie);
  const sw = await fetch(`${BASE}/api/demo/switch-role`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ role: "SUPERVISOR" }),
  });
  log(sw.status === 200, `POST /api/demo/switch-role (${email} -> SUPERVISOR) -> ${sw.status}`);
}
console.log(`\n${fail === 0 ? "SEMUA LULUS" : fail + " GAGAL"}`);
process.exit(fail ? 1 : 0);
