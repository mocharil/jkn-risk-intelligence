import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { actorOf, guard } from "@/lib/auth/guard";
import { roleFromSupabaseUser, supabaseAuthEnabled } from "@/lib/auth/supabase-auth";
import { getStore, persist, recordAudit } from "@/lib/data/store";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const g = await guard(request, "admin.users");
  if (g.error) return g.error;

  if (supabaseAuthEnabled()) {
    const admin = createAdminClient();
    if (admin) {
      const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
      if (!error && data?.users) {
        return NextResponse.json({
          data: data.users.map((u) => ({
            user_id: u.id,
            email: u.email || "—",
            name: u.user_metadata?.name || u.user_metadata?.full_name || (u.email || "user").split("@")[0],
            role: roleFromSupabaseUser(u),
            active: !u.banned_until || new Date(u.banned_until).getTime() <= Date.now(),
            created_at: u.created_at,
          })),
        });
      }
    }
  }

  const users = getStore().users.map(({ password_hash, ...u }) => u);
  return NextResponse.json({ data: users });
}

const Patch = z.object({ user_id: z.string(), role: z.enum(["INVESTIGATOR", "SUPERVISOR", "ADMIN"]).optional(), active: z.boolean().optional() });

export async function PATCH(request: NextRequest) {
  const g = await guard(request, "admin.users");
  if (g.error) return g.error;
  const parsed = Patch.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  if (parsed.data.user_id === g.user.uid && (parsed.data.role || parsed.data.active === false)) {
    return NextResponse.json({ error: "Tidak dapat mengubah peran / menonaktifkan akun sendiri" }, { status: 400 });
  }

  if (supabaseAuthEnabled()) {
    const admin = createAdminClient();
    if (admin) {
      const { data: existing } = await admin.auth.admin.getUserById(parsed.data.user_id);
      if (existing?.user) {
        const prevRole = roleFromSupabaseUser(existing.user);
        const prevActive = !existing.user.banned_until || new Date(existing.user.banned_until).getTime() <= Date.now();
        const nextRole = parsed.data.role || prevRole;
        const nextActive = parsed.data.active !== undefined ? parsed.data.active : prevActive;
        const { data: updated, error } = await admin.auth.admin.updateUserById(parsed.data.user_id, {
          app_metadata: { ...existing.user.app_metadata, role: nextRole },
          ban_duration: nextActive ? "none" : "876000h",
        });
        if (error || !updated.user) return NextResponse.json({ error: error?.message || "Gagal memperbarui pengguna Supabase" }, { status: 500 });
        recordAudit({
          claim_id: "AUTH",
          actor: actorOf(g.user).name,
          actor_role: g.user.role,
          action: "USER_UPDATED",
          previous_status: `${prevRole}/${prevActive ? "aktif" : "nonaktif"}`,
          new_status: `${nextRole}/${nextActive ? "aktif" : "nonaktif"}`,
          justification: `Akun ${updated.user.email} (Supabase Auth)`,
        });
        return NextResponse.json({
          data: {
            user_id: updated.user.id,
            email: updated.user.email || "—",
            name: updated.user.user_metadata?.name || (updated.user.email || "user").split("@")[0],
            role: nextRole,
            active: nextActive,
            created_at: updated.user.created_at,
          },
        });
      }
    }
  }

  const store = getStore();
  const u = store.users.find((x) => x.user_id === parsed.data.user_id);
  if (!u) return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
  const before = `${u.role}/${u.active ? "aktif" : "nonaktif"}`;
  if (parsed.data.role) u.role = parsed.data.role;
  if (parsed.data.active !== undefined) u.active = parsed.data.active;
  recordAudit({ claim_id: "AUTH", actor: actorOf(g.user).name, actor_role: g.user.role, action: "USER_UPDATED", previous_status: before, new_status: `${u.role}/${u.active ? "aktif" : "nonaktif"}`, justification: `Akun ${u.email}` });
  persist();
  const { password_hash, ...safe } = u;
  return NextResponse.json({ data: safe });
}
