"use client";

import React, { useCallback, useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useSession } from "@/lib/auth/client";
import { ROLE_LABEL, Role } from "@/lib/auth/types";
import { formatRelativeTime } from "@/lib/formatting/date";
import { AuditEntry } from "@/lib/audit/chain";
import { AlertTriangle, BadgeCheck, Cpu, History, Lock, RefreshCw, ShieldCheck, Users, Sliders } from "lucide-react";

interface SystemStatus {
  ai: { available: boolean; provider: string; provider_label: string; mode: string; credential_source: string; model: string; embedding_model: string | null; embedding_available: boolean; location?: string; project?: string; reason?: string; checked_at: string };
  embedding: { model?: string; analyzed_at?: string };
  data: { claims: number; providers: number; investigations: number; datasets: number; ingested_claims: number };
  last_analysis?: { claims_analyzed: number; findings_total: number; flagged_claims: number; investigations_created: number; embedding_model: string; similarity_threshold: number; duration_ms: number };
  audit: { valid: boolean; length: number; reason?: string; broken_at_seq?: number; head_hash: string };
  thresholds: Record<string, number>;
  database?: { configured: boolean; ok: boolean; pgvector?: boolean; vector_rows?: number; audit_rows?: number; error?: string; vector_backend: string; audit_mirror: { enabled: boolean; written: number; last_error?: string }; audit_db_verification: { valid: boolean; length: number; broken_at_seq?: number; reason?: string } | null };
  supabase_configured: boolean;
  warnings: string[];
}

interface UserRow {
  user_id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
}

const SOURCE_LABEL: Record<string, string> = {
  "project-file": "File service account proyek (gemini_sa.json)",
  "env-json": "Variabel VERTEX_SA_JSON",
  "api-key": "API key (env)",
  "base-url": "OPENAI_BASE_URL (server lokal / kompatibel)",
  "ambient-adc": "Kredensial ambient mesin (opt-in)",
  none: "Tidak ada",
};

const THRESHOLD_LABEL: Record<string, string> = {
  clone_semantic: "Kemiripan semantik klon (cosine)",
  clone_lexical_overlap: "Tumpang tindih frasa klon (Jaccard 3-kata)",
  clone_semantic_only: "Ambang semantik saja (parafrase)",
  similarity_floor: "Batas bawah pencarian kemiripan",
  los_ratio: "Rasio lama rawat vs median peer",
  inflated_total_ratio: "Rasio total tagihan vs median (Inflated)",
  inflated_line_ratio: "Rasio komponen vs harga acuan (Inflated)",
  queue_min_score: "Skor minimum masuk antrean investigasi",
};

export default function SettingsPage() {
  const { can, role } = useSession();
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async (refresh = false) => {
    const [s, a] = await Promise.all([fetch(`/api/system/status${refresh ? "?refresh=1" : ""}`), fetch("/api/audit?limit=60")]);
    if (s.ok) setStatus(await s.json());
    if (a.ok) setAudit((await a.json()).data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (can("admin.users")) fetch("/api/users").then((r) => (r.ok ? r.json() : null)).then((j) => j && setUsers(j.data));
  }, [can, role]);

  const rerun = async (local: boolean) => {
    setBusy(local ? "local" : "ai");
    setMsg("");
    try {
      const res = await fetch("/api/analysis/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ local }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Gagal");
      setMsg(`Analisis selesai: ${j.data.claims_analyzed} klaim, ${j.data.findings_total} temuan, embedding ${j.data.embedding_model}, ${j.data.duration_ms} ms.`);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Gagal");
    } finally {
      setBusy("");
    }
  };

  const updateUser = async (u: UserRow, patch: Partial<UserRow>) => {
    const res = await fetch("/api/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: u.user_id, ...patch }) });
    const j = await res.json();
    if (!res.ok) return setMsg(j.error || "Gagal memperbarui pengguna");
    setUsers((prev) => prev.map((x) => (x.user_id === u.user_id ? j.data : x)));
    load();
  };

  return (
    <DashboardShell>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-jkn-border pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold text-jkn-text tracking-tight">Pengaturan Sistem & Audit Trail</h1>
            <span className="px-2 py-0.5 rounded-md bg-bpjs-light text-bpjs-dark text-[11px] font-semibold border border-bpjs-border">Tata Kelola AI</span>
          </div>
          <p className="text-xs text-jkn-muted mt-1">Status AI nyata, parameter detektor aktif, jejak audit ber-hash, dan manajemen akses (RBAC).</p>
        </div>
        <button onClick={() => load(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-jkn-border bg-white text-xs font-semibold text-jkn-text hover:bg-surface-secondary">
          <RefreshCw className="w-3.5 h-3.5" /> Periksa Ulang
        </button>
      </div>

      {msg && <div role="status" className="text-xs rounded-xl px-4 py-2.5 border bg-bpjs-soft border-bpjs-border text-bpjs-dark">{msg}</div>}

      {status && status.warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-1">
          {status.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px] text-amber-900"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {w}</div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-6 space-y-5">
          {/* AI */}
          <div className="bg-surface rounded-xl border border-jkn-border p-4 shadow-subtle space-y-3">
            <div className="flex items-center gap-2 pb-2.5 border-b border-jkn-divider">
              <Cpu className="w-4 h-4 text-bpjs" />
              <h3 className="text-xs font-bold text-jkn-text uppercase tracking-wider">Mesin AI</h3>
              {status && (
                <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 ${status.ai.available ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-amber-50 text-amber-800 border border-amber-200"}`}>
                  {status.ai.available ? <BadgeCheck className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />} {status.ai.available ? `${status.ai.provider_label} aktif` : "Mode deterministik"}
                </span>
              )}
            </div>
            {status && (
              <dl className="text-xs space-y-1.5">
                {[
                  ["Provider", status.ai.provider_label],
                  ["Sumber kredensial", SOURCE_LABEL[status.ai.credential_source] || status.ai.credential_source],
                  ["Model generatif", status.ai.model],
                  ["Model embedding", status.ai.embedding_available ? (status.ai.embedding_model as string) : "tidak tersedia pada provider ini (embedding lokal)"],
                  ["Embedding yang dipakai analisis", status.embedding.model || "-"],
                  ["Lokasi / proyek", `${status.ai.location || "-"} / ${status.ai.project || "-"}`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3"><dt className="text-jkn-muted">{k}</dt><dd className="font-mono text-[11px] text-jkn-text text-right break-all">{v}</dd></div>
                ))}
                {!status.ai.available && status.ai.reason && <div className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2 break-words">Alasan: {status.ai.reason}</div>}
              </dl>
            )}
            <div className="text-[10px] text-jkn-dim">Tanpa LLM, Copilot / penjelasan / briefing / mapping memakai mode deterministik yang selalu diberi label. Pilih provider dengan <span className="font-mono">LLM_PROVIDER</span> = gemini | openai | anthropic, lalu isi kredensialnya (lihat <span className="font-mono">.env.local.example</span>).</div>
          </div>

          {/* Database / pgvector */}
          <div className="bg-surface rounded-xl border border-jkn-border p-4 shadow-subtle space-y-3">
            <div className="flex items-center gap-2 pb-2.5 border-b border-jkn-divider">
              <Cpu className="w-4 h-4 text-bpjs" />
              <h3 className="text-xs font-bold text-jkn-text uppercase tracking-wider">Database & Pencarian Vektor</h3>
              {status?.database && (
                <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-md font-semibold ${status.database.ok ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-surface-secondary text-jkn-muted border border-jkn-border"}`}>
                  {status.database.ok ? "Postgres terhubung" : status.database.configured ? "Perlu perhatian" : "Tidak dikonfigurasi"}
                </span>
              )}
            </div>
            {status?.database && (
              <dl className="text-xs space-y-1.5">
                <div className="flex justify-between gap-3"><dt className="text-jkn-muted">Backend kemiripan</dt><dd className="font-mono text-[11px] text-jkn-text">{status.last_analysis && (status.last_analysis as { vector_backend?: string }).vector_backend ? (status.last_analysis as { vector_backend?: string }).vector_backend : status.database.vector_backend}</dd></div>
                {status.database.ok && (
                  <>
                    <div className="flex justify-between gap-3"><dt className="text-jkn-muted">Vektor tersimpan (pgvector)</dt><dd className="font-mono text-[11px]">{status.database.vector_rows}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-jkn-muted">Entri audit di DB</dt><dd className="font-mono text-[11px]">{status.database.audit_rows}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-jkn-muted">Verifikasi rantai di DB</dt><dd className={`font-bold text-[11px] ${status.database.audit_db_verification?.valid ? "text-emerald-700" : "text-red-700"}`}>{status.database.audit_db_verification ? (status.database.audit_db_verification.valid ? "valid" : `rusak #${status.database.audit_db_verification.broken_at_seq}`) : "-"}</dd></div>
                  </>
                )}
                {status.database.error && <div className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2 break-words">{status.database.error}</div>}
                {status.database.audit_mirror.last_error && <div className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2 break-words">Cermin audit: {status.database.audit_mirror.last_error}</div>}
              </dl>
            )}
            <p className="text-[10px] text-jkn-dim">Aktifkan dengan <span className="font-mono">DATABASE_URL</span> + <span className="font-mono">VECTOR_BACKEND=pgvector</span>, lalu <span className="font-mono">npm run db:migrate</span>. Tanpa itu, kemiripan dihitung in-process dan audit hanya disimpan lokal.</p>
          </div>

          {/* Kalibrasi Detektor (dipusatkan ke Evaluasi & Kalibrasi) */}
          <div className="bg-surface rounded-xl border border-jkn-border p-4 shadow-subtle space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-jkn-divider">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-bpjs" />
                <h3 className="text-xs font-bold text-jkn-text uppercase tracking-wider">Parameter &amp; Kalibrasi Detektor</h3>
              </div>
              <a
                href="/model-performance"
                className="text-[11px] font-semibold text-bpjs-dark hover:text-bpjs underline underline-offset-2"
              >
                Buka Evaluasi &amp; Kalibrasi →
              </a>
            </div>
            <p className="text-xs text-jkn-muted leading-relaxed">
              Pengaturan ambang batas 8 detektor (<span className="font-mono text-[11px]">clone_semantic</span>, <span className="font-mono text-[11px]">los_ratio</span>, <span className="font-mono text-[11px]">queue_min_score</span>) serta tombol eksekusi ulang pipeline kini dipusatkan di halaman <strong>Evaluasi &amp; Kalibrasi</strong> bersama matriks Precision, Recall, dan F1-Score.
            </p>
          </div>
        </div>

        <div className="lg:col-span-6 space-y-5">
          {/* Audit */}
          <div className="bg-surface rounded-xl border border-jkn-border p-4 shadow-subtle space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-jkn-divider">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-bpjs" />
                <h3 className="text-xs font-bold text-jkn-text uppercase tracking-wider">Audit Trail Append-Only</h3>
              </div>
              {status && (
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 ${status.audit.valid ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                  <ShieldCheck className="w-3 h-3" /> {status.audit.valid ? `Rantai valid · ${status.audit.length} entri` : `RUSAK #${status.audit.broken_at_seq}`}
                </span>
              )}
            </div>
            {status && <div className="text-[10px] font-mono text-jkn-dim break-all">head: {status.audit.head_hash}</div>}
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {audit.map((e) => (
                <div key={e.seq} className="p-2.5 rounded-lg bg-surface-secondary/70 border border-jkn-divider text-[11px]">
                  <div className="flex justify-between"><b className="text-jkn-text">#{e.seq} {e.action}</b><span className="text-[10px] text-jkn-dim">{formatRelativeTime(e.timestamp)}</span></div>
                  <div className="text-jkn-muted">{e.actor} ({e.actor_role}) · {e.claim_id}</div>
                  {e.justification && e.justification !== "—" && <div className="italic text-jkn-muted line-clamp-2">"{e.justification}"</div>}
                  <div className="font-mono text-[9px] text-jkn-dim break-all">{e.hash}</div>
                </div>
              ))}
              {audit.length === 0 && <p className="text-[11px] text-jkn-muted">Belum ada entri.</p>}
            </div>
          </div>

          {/* Users */}
          {can("admin.users") && (
            <div className="bg-surface rounded-xl border border-jkn-border p-4 shadow-subtle space-y-3">
              <div className="flex items-center gap-2 pb-2.5 border-b border-jkn-divider">
                <Users className="w-4 h-4 text-bpjs" />
                <h3 className="text-xs font-bold text-jkn-text uppercase tracking-wider">Pengguna & Peran (RBAC)</h3>
              </div>
              <div className="divide-y divide-jkn-divider">
                {users.map((u) => (
                  <div key={u.user_id} className="py-2 flex items-center gap-3 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-jkn-text truncate">{u.name}</div>
                      <div className="text-[10px] text-jkn-muted truncate">{u.email}</div>
                    </div>
                    <select value={u.role} onChange={(e) => updateUser(u, { role: e.target.value as Role })} className="text-[11px] px-2 py-1 rounded-lg border border-jkn-border bg-white">
                      {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                        <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1 text-[11px] text-jkn-muted"><input type="checkbox" checked={u.active} onChange={(e) => updateUser(u, { active: e.target.checked })} /> aktif</label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
