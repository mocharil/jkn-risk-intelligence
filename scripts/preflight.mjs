// Pemeriksaan sebelum demo: coaching, rekaman video, dan final.
//   node scripts/preflight.mjs                                  -> http://localhost:3000
//   node scripts/preflight.mjs https://arsa-jkn-hu3kknz2sa-et.a.run.app
//   node scripts/preflight.mjs <url> --ai                       -> sekalian satu pertanyaan Copilot
// Angka acuan = angka pada deck dan video (data sintetis bawaan). Ubah dengan --claims, --queue, --exposure
// bila deck diperbarui. Tidak mengubah data apa pun, tetapi setiap proses mencatat satu LOGIN (dan satu
// COPILOT_QUERY dengan --ai) di jejak audit, jadi jalankan sebelum sesi, bukan berulang-ulang.
const args = process.argv.slice(2);
const flag = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : def;
};
const BASE = (args.find((a) => /^https?:\/\//.test(a)) || process.env.PREFLIGHT_URL || "http://localhost:3000").replace(/\/$/, "");
const WITH_AI = args.includes("--ai");
const EXPECT = { claims: Number(flag("claims", 1503)), queue: Number(flag("queue", 65)), exposure: Number(flag("exposure", 350758145)) };
const EMAIL = process.env.PREFLIGHT_EMAIL || "supervisor@arsa.id";
const PASSWORD = process.env.PREFLIGHT_PASSWORD || "Arsa#2026";
const SLOW_MS = 5000;

const results = [];
const row = (level, name, detail = "") => {
  results.push(level);
  const tag = { ok: "  ok  ", warn: " PERLU", fail: " GAGAL" }[level];
  console.log(`${tag} ${name}${detail ? `  ${detail}` : ""}`);
};
const timed = async (fn) => {
  const t = Date.now();
  const value = await fn();
  return { value, ms: Date.now() - t };
};
const secs = (ms) => `${(ms / 1000).toFixed(1)} dtk`;
const rp = (n) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

let cookie = "";
const api = async (path, init = {}) => {
  const res = await fetch(BASE + path, { ...init, headers: { ...(init.headers || {}), ...(cookie ? { Cookie: cookie } : {}) }, redirect: "manual" });
  return res;
};

console.log(`Pemeriksaan sebelum demo: ${BASE}\n`);

// 1. Halaman publik (sekaligus mengukur cold start)
try {
  const { value: res, ms } = await timed(() => api("/landing"));
  if (res.status !== 200) row("fail", "Halaman landing", `HTTP ${res.status}`);
  else row(ms > SLOW_MS ? "warn" : "ok", "Halaman landing", `${secs(ms)}${ms > SLOW_MS ? " (lambat; kemungkinan instance baru bangun, buka sekali lagi sebelum sesi)" : ""}`);
} catch (e) {
  row("fail", "Halaman landing", `tidak dapat dihubungi: ${e.message}`);
  console.log("\nAlamat tidak dapat dijangkau; pemeriksaan lain dihentikan.");
  process.exit(1);
}

// 2. Login
const { value: login, ms: loginMs } = await timed(() =>
  api("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: EMAIL, password: PASSWORD }) })
);
if (login.status !== 200) {
  row("fail", `Login ${EMAIL}`, `HTTP ${login.status}`);
  console.log("\nTanpa login, pemeriksaan lain tidak dapat dijalankan.");
  process.exit(1);
}
cookie = login.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
row(loginMs > SLOW_MS ? "warn" : "ok", `Login ${EMAIL}`, secs(loginMs));

// 3. Dashboard dan angka acuan deck
const { value: dash, ms: dashMs } = await timed(async () => (await api("/api/dashboard")).json());
const k = dash.kpis;
row(dashMs > SLOW_MS ? "warn" : "ok", "Dashboard (Command Center)", secs(dashMs));
const same = (got, want) => got === want;
row(same(k.total_claims_analyzed, EXPECT.claims) ? "ok" : "warn", "Jumlah klaim", `${k.total_claims_analyzed.toLocaleString("id-ID")} (acuan deck ${EXPECT.claims.toLocaleString("id-ID")})`);
row(same(k.high_risk_claims, EXPECT.queue) ? "ok" : "warn", "Antrean prioritas", `${k.high_risk_claims} (acuan deck ${EXPECT.queue})`);
row(same(Math.round(k.potential_exposure), EXPECT.exposure) ? "ok" : "warn", "Potensi eksposur", `${rp(k.potential_exposure)} (acuan deck ${rp(EXPECT.exposure)})`);
row(dash.meta?.data_mode === "sintetis" ? "ok" : "warn", "Mode data", dash.meta?.data_mode === "sintetis" ? "sintetis bawaan (belum dicampur unggahan)" : `${dash.meta?.data_mode}: angka berbeda dari deck; minta admin menjalankan reset demo`);

// 4. Status sistem
const status = await (await api("/api/system/status")).json();
row(status.ai?.available ? "ok" : "warn", "Penyedia AI", status.ai?.available ? "tersedia" : `tidak tersedia (${status.ai?.reason || "alasan tidak diketahui"}); Copilot jatuh ke mode aturan`);
const emb = status.last_analysis?.embedding_model;
row(emb === "local-hash-v1" ? "ok" : "warn", "Model embedding analisis", `${emb}${emb === "local-hash-v1" ? "" : " (bukan model awal: angka dapat bergeser dari deck)"}`);
row(status.audit?.valid ? "ok" : "fail", "Rantai audit", status.audit?.valid ? `valid, ${status.audit.length} entri` : "TIDAK valid");
if (status.audit?.length > 40) row("warn", "Isi jejak audit", `${status.audit.length} entri; sebagian besar catatan uji akan terlihat mentor dan juri`);
if (Array.isArray(status.warnings) && status.warnings.length) row("warn", "Peringatan sistem", status.warnings.join("; "));
row(status.database?.configured ? (status.database.ok ? "ok" : "fail") : "ok", "Database", status.database?.configured ? (status.database.ok ? "terhubung" : "tidak sehat") : "tidak dipakai");

// 5. Laporan PDF
const top = (await (await api("/api/claims?sort_by=risk_score&limit=1")).json()).data?.[0];
if (top?.investigation_id) {
  const { value: pdf, ms } = await timed(async () => {
    const r = await api(`/api/reports/${top.investigation_id}/pdf`);
    return { status: r.status, head: Buffer.from(await r.arrayBuffer()).subarray(0, 4).toString() };
  });
  row(pdf.status === 200 && pdf.head === "%PDF" ? "ok" : "fail", `Laporan PDF ${top.investigation_id}`, pdf.status === 200 ? secs(ms) : `HTTP ${pdf.status}`);
} else row("warn", "Laporan PDF", "tidak ada kasus untuk diuji");

// 6. Copilot (opsional)
if (WITH_AI) {
  const q = top ? `Mengapa klaim ${top.claim_id} dianggap berisiko?` : "Faskes mana yang paling berisiko?";
  const { value: r, ms } = await timed(async () => (await api("/api/copilot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q }) })).json());
  if (!r.answer) row("fail", "Copilot", JSON.stringify(r).slice(0, 120));
  else {
    const good = r.mode === "llm" && r.grounding?.valid_citations > 0;
    row(good ? (ms > 10000 ? "warn" : "ok") : "warn", "Copilot", `${secs(ms)}, mode ${r.mode === "llm" ? "AI" : "aturan (tanpa AI)"}, ${r.grounding?.valid_citations ?? 0} sumber${r.mode === "llm" ? "" : ` (${r.fallback_reason || "tanpa alasan"})`}`);
  }
} else {
  console.log("  --   Copilot tidak diuji (tambahkan --ai untuk mengujinya)");
}

const fails = results.filter((r) => r === "fail").length;
const warns = results.filter((r) => r === "warn").length;
console.log(`\n${fails ? "ADA YANG GAGAL" : warns ? "SIAP DENGAN CATATAN" : "SIAP"}: ${results.filter((r) => r === "ok").length} ok, ${warns} perlu perhatian, ${fails} gagal.`);
process.exit(fails ? 1 : 0);
