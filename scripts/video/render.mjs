// Render video Arsa AI (scripts/video/teaser.html atau screencast.html) menjadi MP4 1080p.
// Halaman yang memuat window.VO (screencast) otomatis diberi suara narasi dan berkas subtitle .srt.
//
// Prasyarat: Chrome/Edge, ffmpeg di PATH, dan puppeteer-core (bukan dependency proyek):
//   npm i --no-save puppeteer-core
//   node scripts/video/render.mjs                    # render penuh -> out/arsa-teaser.mp4
//   node scripts/video/render.mjs --stills 5,47,110  # hanya gambar diam detik tertentu
//   node scripts/video/render.mjs --page screencast.html --name arsa-screencast.mp4
// Opsi: --fps 30  --from 0 --to 180  --chrome "<path>"  --out out  --page teaser.html
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
const executablePath = [args.chrome, process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome"]
  .filter(Boolean)
  .find((p) => fs.existsSync(p));
if (!executablePath) {
  console.error("Chrome/Edge tidak ditemukan; berikan --chrome <path>.");
  process.exit(1);
}

const fps = Number(args.fps || 30);
const outDir = path.resolve(root, args.out || "out");
fs.mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({ executablePath, headless: true, args: ["--hide-scrollbars", "--force-device-scale-factor=1", "--allow-file-access-from-files", "--font-render-hinting=none"] });
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
page.on("console", (m) => m.type() === "error" && console.error("[halaman]", m.text()));
page.on("pageerror", (e) => console.error("[halaman]", e.message));
await page.goto(pathToFileURL(path.join(here, args.page || "teaser.html")).href, { waitUntil: "networkidle0", timeout: 120000 });
await page.evaluate(() => window.__ready);
const duration = await page.evaluate(() => window.DURATION);
const shot = async (t, type = "jpeg") => {
  await page.evaluate((s) => window.seek(s), t);
  return page.screenshot({ type, quality: type === "jpeg" ? 92 : undefined, optimizeForSpeed: true });
};

if (args.stills) {
  const dir = path.join(outDir, "stills");
  fs.mkdirSync(dir, { recursive: true });
  for (const s of String(args.stills).split(",").map(Number)) {
    const file = path.join(dir, `still-${String(s).replace(".", "_")}.png`);
    fs.writeFileSync(file, await shot(s, "png"));
    console.log(file);
  }
  await browser.close();
  process.exit(0);
}

const from = Number(args.from || 0), to = Math.min(Number(args.to || duration), duration);
const mp4 = path.join(outDir, args.name || "arsa-teaser.mp4");
// --mux-only: lewati render frame dan hanya pasang ulang narasi ke MP4 yang sudah ada.
if (!args["mux-only"]) {
  const ff = spawn("ffmpeg", ["-y", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4], { stdio: ["pipe", "ignore", "inherit"] });
  const total = Math.round((to - from) * fps);
  const t0 = Date.now();
  for (let i = 0; i < total; i++) {
    const buf = await shot(from + i / fps);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (i % (fps * 10) === 0) console.log(`frame ${i}/${total} (${Math.round((Date.now() - t0) / 1000)} dtk)`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
}
const vo = await page.evaluate(() => window.VO || null);
await browser.close();

if (vo && from === 0) {
  // Gabungkan narasi: setiap cue ditunda ke waktu mulainya, lalu dicampur tanpa normalisasi volume.
  const inputs = vo.cues.flatMap((c) => ["-i", path.join(root, c.audio)]);
  const delays = vo.cues.map((c, i) => `[${i + 1}:a]adelay=${Math.round(c.start * 1000)}|${Math.round(c.start * 1000)}[a${i}]`);
  const mix = `${delays.join(";")};${vo.cues.map((_, i) => `[a${i}]`).join("")}amix=inputs=${vo.cues.length}:normalize=0:duration=longest[aout]`;
  const final = mp4.replace(/\.mp4$/, "-vo.mp4");
  await new Promise((resolve, reject) => {
    const p = spawn("ffmpeg", ["-y", "-i", mp4, ...inputs, "-filter_complex", mix, "-map", "0:v", "-map", "[aout]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", String(duration), "-movflags", "+faststart", final], { stdio: ["ignore", "ignore", "inherit"] });
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error("ffmpeg mux gagal: " + code))));
  });
  fs.renameSync(final, mp4);
  const ts = (s) => { const ms = Math.round(s * 1000); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`; };
  const lines = vo.cues.flatMap((c) => c.subs.map((s, i) => [c.start + s.t0, c.start + (c.subs[i + 1] ? c.subs[i + 1].t0 : c.voice + 0.35), s.text]));
  fs.writeFileSync(mp4.replace(/\.mp4$/, ".srt"), lines.map(([a, b, x], i) => `${i + 1}\n${ts(a)} --> ${ts(b)}\n${x}\n`).join("\n"));
}
console.log("selesai:", mp4);
