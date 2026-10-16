"use client";

import { useCallback, useEffect, useState } from "react";
import { Permission, Role, SessionUser } from "./types";

interface SessionState {
  user: SessionUser | null;
  permissions: Permission[];
  loading: boolean;
}

let cache: { user: SessionUser | null; permissions: Permission[] } | null = null;
const listeners = new Set<(s: { user: SessionUser | null; permissions: Permission[] }) => void>();

async function load(): Promise<{ user: SessionUser | null; permissions: Permission[] }> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    if (!res.ok) return { user: null, permissions: [] };
    const j = await res.json();
    return { user: j.user ?? null, permissions: j.permissions ?? [] };
  } catch {
    return { user: null, permissions: [] };
  }
}

/** Sesi pengguna saat ini + pemeriksaan izin (selaras dengan lib/auth/types.ts). */
export function useSession() {
  const [state, setState] = useState<SessionState>({ user: cache?.user ?? null, permissions: cache?.permissions ?? [], loading: !cache });

  useEffect(() => {
    const onChange = (s: { user: SessionUser | null; permissions: Permission[] }) => setState({ ...s, loading: false });
    listeners.add(onChange);
    if (!cache) {
      load().then((s) => {
        cache = s;
        listeners.forEach((l) => l(s));
      });
    }
    return () => {
      listeners.delete(onChange);
    };
  }, []);

  const can = useCallback((p: Permission) => state.permissions.includes(p), [state.permissions]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    cache = null;
    window.location.href = "/login";
  }, []);

  const refreshSession = useCallback(async () => {
    const s = await load();
    cache = s;
    listeners.forEach((l) => l(s));
    return s;
  }, []);

  const switchDemoRole = useCallback(async (targetRole: Role) => {
    const res = await fetch("/api/demo/switch-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: targetRole }),
    });
    if (!res.ok) return false;
    const s = await load();
    cache = s;
    listeners.forEach((l) => l(s));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("arsa:store-updated"));
    }
    return true;
  }, []);

  return { user: state.user, role: state.user?.role as Role | undefined, loading: state.loading, can, logout, refreshSession, switchDemoRole };
}

export function resetSessionCache() {
  cache = null;
}
