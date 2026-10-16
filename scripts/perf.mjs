// Ukur latensi API (p50/p95) terhadap server yang sedang berjalan.
//   BASE=http://localhost:3000 node scripts/perf.mjs      (login memakai akun supervisor demo)
const BASE = process.env.BASE || "http://localhost:3000";
const N = Number(process.env.N || 40);
const CONC = Number(process.env.CONC || 4);
// Rate limit bawaan (600/mnt) cukup untuk skrip ini; atur RATE_LIMIT_API lebih tinggi bila N besar.

const login = await fetch(`${BASE}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "supervisor@arsa.id", password: process.env.DEMO_PASSWORD || "Arsa#2026" }) });
const cookie = (login.headers.get("set-cookie") || "").split(";")[0];
if (!cookie) { console.error("login gagal"); process.exit(1); }

const targets = [
  ["GET /api/dashboard", "/api/dashboard"],
  ["GET /api/claims?limit=10", "/api/claims?limit=10"],
  ["GET /api/claims (filter+cari)", "/api/claims?limit=10&risk_level=CRITICAL&search=A09"],
  ["GET /api/investigations?limit=9", "/api/investigations?limit=9"],
  ["GET /api/providers", "/api/providers"],
  ["GET /api/graph", "/api/graph"],
  ["GET /api/claims/CLM-10293", "/api/claims/CLM-10293"],
  ["GET /api/system/status", "/api/system/status"],
  ["GET /api/evaluation", "/api/evaluation"],
];

const pct = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(arr.length * p))];
const rows = [];
for (const [name, path] of targets) {
  await fetch(BASE + path, { headers: { cookie } }); // pemanasan
  const times = [];
  let idx = 0;
  const worker = async () => {
    while (idx < N) {
      idx++;
      const t0 = performance.now();
      const r = await fetch(BASE + path, { headers: { cookie } });
      await r.arrayBuffer();
      times.push(performance.now() - t0);
      if (r.status !== 200) console.error(`  ${name}: HTTP ${r.status}`);
    }
  };
  await Promise.all(Array.from({ length: CONC }, worker));
  times.sort((a, b) => a - b);
  rows.push({ endpoint: name, "p50 ms": +pct(times, 0.5).toFixed(1), "p95 ms": +pct(times, 0.95).toFixed(1), "max ms": +times[times.length - 1].toFixed(1) });
}
console.table(rows);
const worst = Math.max(...rows.map((r) => r["p95 ms"]));
console.log(`p95 terburuk: ${worst} ms (target < 500 ms, di luar LLM) -> ${worst < 500 ? "LULUS" : "GAGAL"}`);
process.exit(worst < 500 ? 0 : 1);
