// Render video penjelasan Arsa AI (scripts/video/explainer.html) menjadi MP4 + poster.
//
// Prasyarat: Google Chrome/Edge terpasang, ffmpeg di PATH, dan puppeteer-core
// (tidak dimasukkan ke dependency proyek):
//   npm i --no-save puppeteer-core
//   node scripts/video/render.mjs                 # render penuh -> public/video/
//   node scripts/video/render.mjs --stills 9,24   # hanya tangkapan layar detik tertentu
// Opsi: --fps 30  --chrome "<path chrome.exe>"  --out public/video
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith("--") ? [...acc, [a.slice(2), all[i + 1]?.startsWith("--") ? "1" : all[i + 1] ?? "1"]] : acc), [])
);

const load = (from) => {
  try { return createRequire(from)("puppeteer-core"); } catch { return null; }
};
const puppeteer = load(path.join(process.cwd(), "noop.js")) || load(path.join(root, "noop.js"));
if (!puppeteer) {
  console.error("puppeteer-core tidak ditemukan. Jalankan: npm i --no-save puppeteer-core");
  process.exit(1);
}

const CHROME_CANDIDATES = [
  args.chrome,
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);
const executablePath = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
if (!executablePath) {
  console.error("Chrome/Edge tidak ditemukan; berikan --chrome <path>.");
  process.exit(1);
}

const fps = Number(args.fps || 30);
const outDir = path.resolve(root, args.out || "public/video");
fs.mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ["--hide-scrollbars", "--force-device-scale-factor=1", "--allow-file-access-from-files", "--font-render-hinting=none"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(here, "explainer.html")).href, { waitUntil: "networkidle0" });
await page.evaluate(() => window.__ready);
const duration = await page.evaluate(() => window.DURATION);

const shot = async (t, type = "jpeg") => {
  await page.evaluate((s) => window.seek(s), t);
  return page.screenshot({ type, quality: type === "jpeg" ? 95 : undefined, optimizeForSpeed: true });
};

if (args.stills) {
  const dir = path.resolve(args.stillsDir || path.join(root, ".data", "video-stills"));
  fs.mkdirSync(dir, { recursive: true });
  for (const s of String(args.stills).split(",").map(Number)) {
    // Jalankan timeline dari awal agar status yang bergantung urutan (sitasi) konsisten.
    for (let t = Math.max(0, s - 3); t < s; t += 0.25) await page.evaluate((x) => window.seek(x), t);
    const file = path.join(dir, `still-${String(s).replace(".", "_")}.png`);
    fs.writeFileSync(file, await shot(s, "png"));
    console.log(file);
  }
  await browser.close();
  process.exit(0);
}

const mp4 = path.join(outDir, "arsa-explainer.mp4");
const ff = spawn("ffmpeg", [
  "-y", "-loglevel", "error",
  "-f", "image2pipe", "-c:v", "mjpeg", "-framerate", String(fps), "-i", "-",
  "-c:v", "libx264", "-preset", "slow", "-crf", "23", "-tune", "animation",
  "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4,
], { stdio: ["pipe", "inherit", "inherit"] });

const total = Math.round(duration * fps);
const started = Date.now();
for (let i = 0; i < total; i++) {
  const buf = await shot(i / fps);
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if (i % (fps * 5) === 0) process.stdout.write(`frame ${i}/${total} (${((Date.now() - started) / 1000).toFixed(0)} dtk)\n`);
}
ff.stdin.end();
await new Promise((r, j) => ff.on("close", (code) => (code === 0 ? r() : j(new Error("ffmpeg gagal: " + code)))));

// Poster: momen sitasi (jawaban Copilot dengan bukti tersorot).
for (let t = 44; t < 52.4; t += 0.25) await page.evaluate((x) => window.seek(x), t);
fs.writeFileSync(path.join(outDir, "arsa-explainer-poster.jpg"), await shot(52.4));
await browser.close();
console.log("selesai:", mp4);
