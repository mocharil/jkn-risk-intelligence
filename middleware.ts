import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

/**
 * Semua halaman & API dilindungi kecuali: landing, login, registrasi, endpoint auth, dan aset statis.
 * Pemeriksaan peran per-aksi dilakukan di route handler (lib/auth/guard.ts).
 * Rate limit: jendela 60 detik per IP (memori per instance — untuk multi-instance gunakan gateway/Redis).
 */
const PUBLIC_PAGES = ["/landing", "/login", "/register"];
const PUBLIC_API = ["/api/auth/login", "/api/auth/register", "/api/auth/logout", "/api/public/stats"];

const WINDOW_MS = 60_000;
const buckets = new Map<string, { n: number; t: number }>();

function limitFor(pathname: string, method: string): { group: string; max: number } {
  if (pathname === "/api/copilot" || pathname.endsWith("/explain")) return { group: "ai", max: Number(process.env.RATE_LIMIT_AI) || 30 };
  if (pathname.startsWith("/api/datasets") && method !== "GET") return { group: "upload", max: Number(process.env.RATE_LIMIT_UPLOAD) || 12 };
  if (pathname.startsWith("/api/auth/")) return { group: "auth", max: Number(process.env.RATE_LIMIT_AUTH) || 20 };
  return { group: "api", max: Number(process.env.RATE_LIMIT_API) || 600 };
}

function rateLimited(ip: string, pathname: string, method: string): number | null {
  const { group, max } = limitFor(pathname, method);
  const key = `${ip}|${group}`;
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now - b.t >= WINDOW_MS) {
    buckets.set(key, { n: 1, t: now });
    if (buckets.size > 5000) buckets.forEach((v, k) => now - v.t >= WINDOW_MS && buckets.delete(k));
    return null;
  }
  b.n++;
  return b.n > max ? Math.ceil((WINDOW_MS - (now - b.t)) / 1000) : null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
    const retry = rateLimited(ip, pathname, req.method);
    if (retry !== null) return NextResponse.json({ error: "Terlalu banyak permintaan. Coba lagi sebentar.", code: "RATE_LIMITED" }, { status: 429, headers: { "Retry-After": String(retry) } });
  }

  if (PUBLIC_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) || PUBLIC_API.includes(pathname)) return NextResponse.next();

  const user = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (user) return NextResponse.next();

  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Belum login", code: "UNAUTHENTICATED" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname + req.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|arsa_logo.png|samples/|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|css|js|map|csv)$).*)"],
};
