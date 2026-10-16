import { Role, SessionUser } from "./types";

/**
 * Sesi stateless: cookie HttpOnly berisi payload + HMAC-SHA256 (Web Crypto → jalan di Edge middleware & Node).
 * Secret: AUTH_SECRET. Tanpa env, memakai secret dev (dilaporkan di /api/system/status).
 */
export const SESSION_COOKIE = "arsa_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8;
const DEV_SECRET = "arsa-dev-auth-secret-change-me";

export function strictProductionMode(): boolean {
  return process.env.ARSA_STRICT_PRODUCTION === "1";
}

export function authSecret(): string {
  if (!process.env.AUTH_SECRET && strictProductionMode()) {
    throw new Error("AUTH_SECRET wajib diatur saat ARSA_STRICT_PRODUCTION=1");
  }
  return process.env.AUTH_SECRET || DEV_SECRET;
}
export function usingDevAuthSecret(): boolean {
  return !process.env.AUTH_SECRET;
}

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  arr.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(authSecret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

interface Payload extends SessionUser {
  exp: number;
}

export async function signSession(user: SessionUser, ttl = SESSION_TTL_SECONDS): Promise<string> {
  const payload: Payload = { ...user, exp: Math.floor(Date.now() / 1000) + ttl };
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(), new TextEncoder().encode(body));
  return `${body}.${b64url(sig)}`;
}

export async function verifySession(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await hmacKey(), fromB64url(sig) as BufferSource, new TextEncoder().encode(body));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body))) as Payload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { uid: payload.uid, email: payload.email, name: payload.name, role: payload.role as Role };
  } catch {
    return null;
  }
}
