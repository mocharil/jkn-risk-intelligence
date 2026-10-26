export type Role = "INVESTIGATOR" | "SUPERVISOR" | "ADMIN";

export const ROLE_LABEL: Record<Role, string> = {
  INVESTIGATOR: "Investigator",
  SUPERVISOR: "Supervisor",
  ADMIN: "Administrator",
};

export interface UserRecord {
  user_id: string;
  email: string;
  name: string;
  role: Role;
  /** scrypt: "salt:hash" (hex) */
  password_hash: string;
  active: boolean;
  created_at: string;
}

export interface SessionUser {
  uid: string;
  email: string;
  name: string;
  role: Role;
}

/** Izin per aksi. Satu sumber kebenaran untuk server & UI. */
export const PERMISSIONS = {
  "case.annotate": ["INVESTIGATOR", "SUPERVISOR", "ADMIN"],
  "case.set_working_status": ["INVESTIGATOR", "SUPERVISOR", "ADMIN"],
  "case.final_decision": ["SUPERVISOR", "ADMIN"],
  "dataset.upload": ["INVESTIGATOR", "SUPERVISOR", "ADMIN"],
  "dataset.confirm_mapping": ["INVESTIGATOR", "SUPERVISOR", "ADMIN"],
  "analysis.run": ["INVESTIGATOR", "SUPERVISOR", "ADMIN"],
  "admin.users": ["ADMIN"],
  "admin.policy": ["ADMIN"],
  "admin.reset_demo": ["ADMIN"],
  "audit.verify": ["INVESTIGATOR", "SUPERVISOR", "ADMIN"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role | undefined, perm: Permission): boolean {
  return !!role && (PERMISSIONS[perm] as readonly Role[]).includes(role);
}
