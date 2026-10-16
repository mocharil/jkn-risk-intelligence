import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { Role, UserRecord } from "./types";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "Arsa#2026";

export function seedDefaultUsers(): UserRecord[] {
  const now = new Date().toISOString();
  const mk = (id: string, email: string, name: string, role: Role): UserRecord => ({
    user_id: id,
    email,
    name,
    role,
    password_hash: hashPassword(DEMO_PASSWORD),
    active: true,
    created_at: now,
  });
  return [
    mk("USR-001", "investigator@arsa.id", "Aril Indra Permana", "INVESTIGATOR"),
    mk("USR-002", "supervisor@arsa.id", "Salfarisa Fitria", "SUPERVISOR"),
    mk("USR-003", "admin@arsa.id", "Administrator Arsa", "ADMIN"),
  ];
}
