"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useSession } from "@/lib/auth/client";
import { ROLE_LABEL, Role } from "@/lib/auth/types";
import { formatRelativeTime } from "@/lib/formatting/date";
import { AuditEntry } from "@/lib/audit/chain";
import {
  ArrowUpRight,
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileCheck2,
  History,
  Lock,
  Plus,
  RefreshCw,
  Save,
  Search,
  Shield,
  ShieldCheck,
  Sliders,
  Sparkles,
  UserPlus,
  Users,
  X,
} from "lucide-react";

interface GovernancePolicy {
  copilot_mode: "HYBRID_CITATION" | "DETERMINISTIC_ONLY";
  privacy_redaction: boolean;
  mask_pii_display: boolean;
  require_decision_justification: boolean;
  queue_min_score: number;
  sla_target_hours: number;
  updated_at: string;
}

interface SystemStatus {
  ai: {
    available: boolean;
    provider_label: string;
    model: string;
  };
  audit: {
    valid: boolean;
    length: number;
    broken_at_seq?: number;
    head_hash: string;
  };
  governance?: GovernancePolicy;
}

interface UserRow {
  user_id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
}

function maskHash(hash: string, showFull: boolean) {
  if (!hash) return "—";
  if (showFull || hash.length <= 22) return hash;
  return `${hash.slice(0, 12)}••••••••••••••••${hash.slice(-10)}`;
}

function maskEmail(email: string, maskActive: boolean) {
  if (!maskActive) return email;
  const [local, domain] = email.split("@");
  if (!domain) return "••••••@arsa.id";
  const prefix = local.slice(0, 2);
  return `${prefix}••••••@${domain}`;
}

type AuditCategory = "GOVERNANCE" | "AUTH" | "CLAIM" | "SYSTEM";

function auditCategory(action: string): AuditCategory {
  const a = action.toUpperCase();
  if (a.startsWith("POLICY") || a.startsWith("USER_")) return "GOVERNANCE";
  if (a.startsWith("LOGIN") || a === "LOGOUT" || a.startsWith("DEMO_ROLE")) return "AUTH";
  if (["INVESTIGATE", "NOTE_ADDED", "REPORT_EXPORTED", "CLAIMS_EXPORTED", "COPILOT_QUERY"].includes(a) || a.includes("DECISION")) return "CLAIM";
  return "SYSTEM";
}

function getActionBadgeStyle(action: string) {
  switch (auditCategory(action)) {
    case "GOVERNANCE":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "AUTH":
      return "bg-sky-50 text-sky-800 border-sky-200";
    case "CLAIM":
      return "bg-amber-50 text-amber-800 border-amber-200";
    default:
      return "bg-violet-50 text-violet-800 border-violet-200";
  }
}

function csvCell(v: unknown) {
  const t = String(v ?? "");
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

export default function SettingsPage() {
  const { role, user } = useSession();
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const isAdmin = role === "ADMIN";
  const [revealHash, setRevealHash] = useState(false);
  const [auditTotal, setAuditTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: "ok" | "err" } | null>(null);

  // Editable Governance Policy State
  const [copilotMode, setCopilotMode] = useState<"HYBRID_CITATION" | "DETERMINISTIC_ONLY">("HYBRID_CITATION");
  const [privacyRedaction, setPrivacyRedaction] = useState(true);
  const [maskPiiDisplay, setMaskPiiDisplay] = useState(true);
  const [requireJustification, setRequireJustification] = useState(true);
  const [queueMinScore, setQueueMinScore] = useState(75);
  const [slaTargetHours, setSlaTargetHours] = useState(48);

  // Add New User Form State
  const [showAddUser, setShowAddUser] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<Role>("INVESTIGATOR");
  const [addingUser, setAddingUser] = useState(false);

  // Audit Trail UI State
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [auditQuery, setAuditQuery] = useState("");
  const [auditFilter, setAuditFilter] = useState<"ALL" | AuditCategory>("ALL");

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    try {
      const [sRes, aRes, uRes] = await Promise.all([
        fetch(`/api/system/status${refresh ? "?refresh=1" : ""}`),
        fetch("/api/audit?limit=60"),
        isAdmin ? fetch("/api/users") : Promise.resolve(null),
      ]);
      if (sRes.ok) {
        const sData: SystemStatus = await sRes.json();
        setStatus(sData);
        if (sData.governance) {
          setCopilotMode(sData.governance.copilot_mode);
          setPrivacyRedaction(sData.governance.privacy_redaction);
          setMaskPiiDisplay(sData.governance.mask_pii_display);
          setRequireJustification(sData.governance.require_decision_justification);
          setQueueMinScore(sData.governance.queue_min_score);
          setSlaTargetHours(sData.governance.sla_target_hours);
        }
      }
      if (aRes.ok) {
        const aj = await aRes.json();
        const rows: AuditEntry[] = Array.isArray(aj.data) ? aj.data : [];
        setAudit(rows);
        setAuditTotal(aj.total ?? rows.length);
      }
      if (uRes) {
        if (uRes.ok) {
          const uj = await uRes.json();
          setUsers(Array.isArray(uj.data) ? uj.data : []);
        } else if (uRes.status === 403 || uRes.status === 401) {
          // Bukan admin (atau sesi berubah): kosongkan daftar, jangan rusak halaman
          setUsers([]);
        } else {
          setMsg({ text: "Gagal memuat daftar personel", tone: "err" });
        }
      } else {
        setUsers([]);
      }
      if (!sRes.ok || !aRes.ok) {
        setMsg({ text: "Sebagian data pengaturan gagal dimuat. Coba muat ulang.", tone: "err" });
      }
    } catch {
      setMsg({ text: "Gagal memuat data pengaturan. Periksa koneksi Anda.", tone: "err" });
    } finally {
      if (refresh) setRefreshing(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const saveGovernancePolicy = async () => {
    setSavingPolicy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/system/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          copilot_mode: copilotMode,
          privacy_redaction: privacyRedaction,
          mask_pii_display: maskPiiDisplay,
          require_decision_justification: requireJustification,
          queue_min_score: queueMinScore,
          sla_target_hours: slaTargetHours,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Gagal menyimpan kebijakan");
      setMsg({
        text: "Kebijakan tata kelola berhasil disimpan dan disegel ke dalam rantai Audit Trail SHA-256.",
        tone: "ok",
      });
      await load();
    } catch (e) {
      setMsg({
        text: e instanceof Error ? e.message : "Gagal menyimpan pengaturan",
        tone: "err",
      });
    } finally {
      setSavingPolicy(false);
    }
  };

  const updateUser = async (u: UserRow, patch: Partial<UserRow>) => {
    setMsg(null);
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: u.user_id, ...patch }),
    });
    const j = await res.json();
    if (!res.ok) {
      setMsg({ text: j.error || "Gagal memperbarui personel", tone: "err" });
      return;
    }
    setUsers((prev) => prev.map((x) => (x.user_id === u.user_id ? j.data : x)));
    setMsg({
      text: `Hak akses personel ${u.name} berhasil diperbarui dan tercatat di Audit Trail.`,
      tone: "ok",
    });
    load();
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;
    setAddingUser(true);
    setMsg(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim(),
          role: newRole,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Gagal menambahkan personel");
      setUsers((prev) => [...prev, j.data]);
      setNewName("");
      setNewEmail("");
      setNewRole("INVESTIGATOR");
      setShowAddUser(false);
      setMsg({
        text: `Personel baru ${j.data.name} (${ROLE_LABEL[j.data.role as Role]}) berhasil ditambahkan.`,
        tone: "ok",
      });
      await load();
    } catch (err) {
      setMsg({
        text: err instanceof Error ? err.message : "Gagal menambahkan personel",
        tone: "err",
      });
    } finally {
      setAddingUser(false);
    }
  };

  const exportAudit = async () => {
    const res = await fetch("/api/audit?limit=500");
    if (!res.ok) {
      setMsg({ text: "Gagal mengekspor jejak audit", tone: "err" });
      return;
    }
    const rows: AuditEntry[] = (await res.json()).data;
    const head = ["seq", "timestamp", "actor", "actor_role", "action", "claim_id", "previous_status", "new_status", "justification", "hash", "previous_hash"];
    const csv = [head.join(","), ...rows.map((r) => head.map((h) => csvCell((r as unknown as Record<string, unknown>)[h])).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `jejak-audit-arsa-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 1800);
  };

  const filteredAudit = useMemo(() => {
    const q = auditQuery.trim().toLowerCase();
    return audit.filter((entry) => {
      if (auditFilter !== "ALL" && auditCategory(entry.action) !== auditFilter) return false;
      if (!q) return true;
      return (
        entry.action.toLowerCase().includes(q) ||
        entry.actor.toLowerCase().includes(q) ||
        entry.claim_id.toLowerCase().includes(q) ||
        (entry.justification && entry.justification.toLowerCase().includes(q))
      );
    });
  }, [audit, auditFilter, auditQuery]);

  return (
    <DashboardShell>
      {/* Top Executive Governance Header */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-900/15 bg-gradient-to-br from-[#071A12] via-[#0B271B] to-[#0E3323] p-5 md:p-6 text-white shadow-sm">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 85% 20%, rgba(52,211,153,0.35), transparent 45%), radial-gradient(circle at 15% 80%, rgba(16,185,129,0.2), transparent 40%)",
          }}
        />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[11px] font-semibold tracking-wide">
                <Shield className="w-3 h-3" /> Tata Kelola &amp; Otorisasi Audit
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-emerald-100 text-[11px] font-medium">
                <Lock className="w-3 h-3 text-emerald-300" /> UU PDP No. 27/2022 Patuh
              </span>
            </div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-white">
              Pengaturan Kebijakan, Hak Akses (RBAC) &amp; Audit Trail
            </h1>
            <p className="text-xs text-emerald-100/75 max-w-2xl leading-relaxed">
              Atur parameter kebijakan operasional audit klaim, kelola peran dan akses personel
              verifikator/auditor, serta pantau jejak audit berantai SHA-256 yang tidak dapat
              dimanipulasi (*append-only*).
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setRevealHash((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/15 bg-white/10 hover:bg-white/15 text-xs font-medium text-emerald-50 transition-colors"
            >
              {!revealHash ? (
                <>
                  <Eye className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Tampilkan Hash Penuh</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Samarkan Hash</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => load(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00A859] hover:bg-[#00924d] text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>{refreshing ? "Memuat..." : "Muat Ulang"}</span>
            </button>
          </div>
        </div>

        {/* 3 Focused KPI Strip */}
        <div className="relative mt-5 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl bg-white/[0.06] border border-white/10 px-4 py-3">
            <div className="flex items-center justify-between text-[11px] text-emerald-100/70">
              <span>Kebijakan Operasional Aktif</span>
              <Sliders className="w-3.5 h-3.5 text-emerald-300" />
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              <span className="text-sm font-bold text-white">
                Skor Antrean ≥ {queueMinScore} · SLA {slaTargetHours} Jam
              </span>
            </div>
            <div className="mt-0.5 text-[11px] text-emerald-200/65">
              Mode:{" "}
              {copilotMode === "HYBRID_CITATION"
                ? "AI Hibrida + Sitasi Verbatim"
                : "Deterministik Murni"}
            </div>
          </div>

          <div className="rounded-xl bg-white/[0.06] border border-white/10 px-4 py-3">
            <div className="flex items-center justify-between text-[11px] text-emerald-100/70">
              <span>Personel &amp; Otorisasi (RBAC)</span>
              <Users className="w-3.5 h-3.5 text-emerald-300" />
            </div>
            <div className="mt-1 text-sm font-bold text-white">
              {isAdmin ? `${users.filter((u) => u.active).length} Personel Aktif (${users.length} Terdaftar)` : "Hanya Administrator"}
            </div>
            <div className="mt-0.5 text-[11px] text-emerald-200/65">
              Sesi Anda: {user?.name || "Auditor"} ({role ? ROLE_LABEL[role] : "Investigator"})
            </div>
          </div>

          <div className="rounded-xl bg-white/[0.06] border border-white/10 px-4 py-3">
            <div className="flex items-center justify-between text-[11px] text-emerald-100/70">
              <span>Integritas Jejak Audit SHA-256</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  status?.audit.valid !== false
                    ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                    : "bg-rose-400"
                }`}
              />
              <span className="text-sm font-bold text-white">
                {status
                  ? status.audit.valid
                    ? `Rantai Valid · ${status.audit.length} Entri`
                    : `Rusak pada #${status.audit.broken_at_seq}`
                  : "Memverifikasi..."}
              </span>
            </div>
            <div className="mt-0.5 text-[11px] text-emerald-200/65">
              Catatan Kriptografis Append-Only
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {msg && (
        <div
          role="status"
          className={`text-xs rounded-xl px-4 py-3 border flex items-center justify-between ${
            msg.tone === "ok"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>{msg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMsg(null)}
            className="text-[11px] font-semibold underline ml-3"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Main Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Editable Governance Policies & Editable RBAC Users */}
        <div className="lg:col-span-6 space-y-5">
          {/* 1. EDITABLE GOVERNANCE & PRIVACY SETTINGS */}
          <div className="bg-surface rounded-2xl border border-jkn-border p-5 shadow-subtle space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-jkn-divider">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-bpjs-light border border-bpjs-border flex items-center justify-center text-bpjs-dark">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-jkn-text">
                    Kebijakan Operasional &amp; Privasi Audit
                  </h3>
                  <p className="text-[11px] text-jkn-muted">
                    Pengaturan interaktif; setiap perubahan otomatis tercatat di Audit Trail
                  </p>
                </div>
              </div>
              <Link
                href="/model-performance"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-bpjs-dark hover:text-bpjs"
              >
                <span>Kalibrasi 8 Detektor</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {!isAdmin && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] px-3 py-2">
                Anda masuk sebagai {role ? ROLE_LABEL[role] : "pengguna"}. Kebijakan dan personel hanya dapat diubah oleh Administrator; bagian ini tampil baca-saja.
              </div>
            )}
            <fieldset disabled={!isAdmin} className="space-y-5 min-w-0 border-0 p-0 m-0 disabled:opacity-80">
            {/* A. Mode Kerja AI Copilot */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-jkn-text">
                1. Mode Kerja Asisten AI Copilot &amp; Penjelasan Bukti
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setCopilotMode("HYBRID_CITATION")}
                  className={`text-left rounded-xl p-3 border transition-all ${
                    copilotMode === "HYBRID_CITATION"
                      ? "bg-bpjs-soft/70 border-bpjs ring-1 ring-bpjs/30"
                      : "bg-surface-secondary/50 border-jkn-divider hover:bg-surface-secondary"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-jkn-text flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-bpjs" />
                      AI Hibrida + Sitasi
                    </span>
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        copilotMode === "HYBRID_CITATION"
                          ? "border-bpjs bg-bpjs text-white"
                          : "border-jkn-border bg-white"
                      }`}
                    >
                      {copilotMode === "HYBRID_CITATION" && <Check className="w-2.5 h-2.5" />}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-jkn-muted leading-snug">
                    Menggunakan penalaran LLM dengan validasi kutipan rekam medis verbatim.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setCopilotMode("DETERMINISTIC_ONLY")}
                  className={`text-left rounded-xl p-3 border transition-all ${
                    copilotMode === "DETERMINISTIC_ONLY"
                      ? "bg-bpjs-soft/70 border-bpjs ring-1 ring-bpjs/30"
                      : "bg-surface-secondary/50 border-jkn-divider hover:bg-surface-secondary"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-jkn-text flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-bpjs-dark" />
                      Deterministik Murni
                    </span>
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        copilotMode === "DETERMINISTIC_ONLY"
                          ? "border-bpjs bg-bpjs text-white"
                          : "border-jkn-border bg-white"
                      }`}
                    >
                      {copilotMode === "DETERMINISTIC_ONLY" && <Check className="w-2.5 h-2.5" />}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-jkn-muted leading-snug">
                    Tanpa panggilan AI eksternal; 100% aturan klinis INA-CBG &amp; vektor lokal.
                  </p>
                </button>
              </div>
            </div>

            {/* B. Ambang Skor Antrean & Target SLA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="rounded-xl bg-surface-secondary/60 border border-jkn-divider p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-jkn-text">
                    2. Skor Minimum Antrean
                  </label>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-bpjs text-white">
                    ≥ {queueMinScore} / 100
                  </span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={95}
                  step={5}
                  value={queueMinScore}
                  onChange={(e) => setQueueMinScore(Number(e.target.value))}
                  className="w-full accent-bpjs cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-jkn-muted">
                  <span>50 (Sensitif)</span>
                  <span>75 (Standar)</span>
                  <span>95 (Ketat)</span>
                </div>
              </div>

              <div className="rounded-xl bg-surface-secondary/60 border border-jkn-divider p-3.5 space-y-2">
                <label className="block text-xs font-bold text-jkn-text">
                  3. Target SLA Penyelesaian Audit
                </label>
                <select
                  value={slaTargetHours}
                  onChange={(e) => setSlaTargetHours(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-jkn-border bg-white text-xs font-semibold text-jkn-text focus:outline-none focus:border-bpjs"
                >
                  <option value={24}>24 Jam (Prioritas Cepat)</option>
                  <option value={48}>48 Jam (Standar Nasional JKN)</option>
                  <option value={72}>72 Jam (Investigasi Kompleks)</option>
                  <option value={120}>5 Hari Kerja (Komite Medis)</option>
                </select>
                <p className="text-[10px] text-jkn-muted">
                  Digunakan sebagai batas peringatan waktu tunggu pada antrean klaim.
                </p>
              </div>
            </div>

            {/* C. Toggle Kebijakan Privasi UU PDP & Kepatuhan */}
            <div className="space-y-2.5 pt-1">
              <div className="text-xs font-bold text-jkn-text">
                4. Perlindungan Data Sensitif (UU PDP) &amp; Kepatuhan
              </div>

              <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-secondary/50 border border-jkn-divider cursor-pointer hover:bg-surface-secondary transition-colors">
                <div>
                  <div className="text-xs font-semibold text-jkn-text">
                    Samarkan Email Personel &amp; Identitas Pasien (Masking PII)
                  </div>
                  <div className="text-[11px] text-jkn-muted">
                    Menyembunyikan karakter tengah email dan menjaga anonimisasi HMAC-SHA256
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={maskPiiDisplay}
                  onChange={(e) => setMaskPiiDisplay(e.target.checked)}
                  className="w-4 h-4 accent-bpjs rounded cursor-pointer shrink-0"
                />
              </label>

              <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-secondary/50 border border-jkn-divider cursor-pointer hover:bg-surface-secondary transition-colors">
                <div>
                  <div className="text-xs font-semibold text-jkn-text">
                    Sembunyikan Kredensial Cloud &amp; Ringkas Hash Kriptografis
                  </div>
                  <div className="text-[11px] text-jkn-muted">
                    Mencegah eksposur nama proyek internal dan kunci layanan di layar presentasi
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={privacyRedaction}
                  onChange={(e) => setPrivacyRedaction(e.target.checked)}
                  className="w-4 h-4 accent-bpjs rounded cursor-pointer shrink-0"
                />
              </label>

              <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-secondary/50 border border-jkn-divider cursor-pointer hover:bg-surface-secondary transition-colors">
                <div>
                  <div className="text-xs font-semibold text-jkn-text">
                    Wajibkan Alasan Tertulis pada Setiap Keputusan Klaim
                  </div>
                  <div className="text-[11px] text-jkn-muted">
                    Supervisor wajib mencantumkan catatan bukti sebelum menyetujui/menolak klaim
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={requireJustification}
                  onChange={(e) => setRequireJustification(e.target.checked)}
                  className="w-4 h-4 accent-bpjs rounded cursor-pointer shrink-0"
                />
              </label>
            </div>

            </fieldset>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={saveGovernancePolicy}
                disabled={savingPolicy || !isAdmin}
                title={isAdmin ? undefined : "Hanya Administrator yang dapat mengubah kebijakan"}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-bpjs hover:bg-bpjs-dark text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                <Save className="w-3.5 h-3.5" />
                <span>
                  {savingPolicy
                    ? "Menyimpan & Menyegel Hash..."
                    : "Simpan Kebijakan & Catat ke Audit Trail"}
                </span>
              </button>
            </div>
          </div>

          {/* 2. EDITABLE USER & RBAC MANAGEMENT */}
          <div className="bg-surface rounded-2xl border border-jkn-border p-5 shadow-subtle space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-jkn-divider">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-bpjs-light border border-bpjs-border flex items-center justify-center text-bpjs-dark">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-jkn-text">
                    Manajemen Personel &amp; Peran (RBAC)
                  </h3>
                  <p className="text-[11px] text-jkn-muted">
                    Ubah peran otorisasi, status aktif, atau tambahkan personel auditor baru
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUser((v) => !v)}
                disabled={!isAdmin}
                title={isAdmin ? undefined : "Hanya Administrator yang dapat mengelola personel"}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bpjs-light hover:bg-bpjs hover:text-white text-bpjs-dark border border-bpjs-border text-xs font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                {showAddUser ? (
                  <>
                    <X className="w-3.5 h-3.5" /> Batal
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" /> Tambah Personel
                  </>
                )}
              </button>
            </div>

            {/* Inline Form to Add New Personnel */}
            {showAddUser && (
              <form
                onSubmit={handleAddUser}
                className="rounded-xl bg-bpjs-soft/40 border border-bpjs-border p-4 space-y-3"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-bpjs-dark">
                  <UserPlus className="w-4 h-4" />
                  <span>Registrasi Personel Audit Baru</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nama lengkap & gelar..."
                    className="px-3 py-2 rounded-xl border border-jkn-border bg-white text-xs text-jkn-text focus:outline-none focus:border-bpjs"
                  />
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="email@arsa.id"
                    className="px-3 py-2 rounded-xl border border-jkn-border bg-white text-xs text-jkn-text focus:outline-none focus:border-bpjs"
                  />
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as Role)}
                    className="px-3 py-2 rounded-xl border border-jkn-border bg-white text-xs font-semibold text-jkn-text focus:outline-none focus:border-bpjs"
                  >
                    {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={addingUser}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-bpjs hover:bg-bpjs-dark text-white text-xs font-bold transition-colors disabled:opacity-60"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{addingUser ? "Menambahkan..." : "Simpan Personel Baru"}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Editable Personnel Directory */}
            <div className="divide-y divide-jkn-divider">
              {!isAdmin && (<div className="px-5 py-6 text-xs text-jkn-muted text-center">Daftar personel hanya dapat dilihat oleh Administrator.</div>)}
              {users.map((u) => {
                const isSelf = user?.uid === u.user_id || user?.email === u.email;
                return (
                  <div
                    key={u.user_id}
                    className="py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 border ${
                          u.active
                            ? "bg-bpjs-light border-bpjs-border text-bpjs-dark"
                            : "bg-slate-100 border-slate-200 text-slate-400"
                        }`}
                      >
                        {u.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-jkn-text truncate">{u.name}</span>
                          {isSelf && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Anda
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-jkn-muted truncate font-mono">
                          {maskEmail(u.email, maskPiiDisplay)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 ml-auto">
                      <select
                        value={u.role}
                        onChange={(e) => updateUser(u, { role: e.target.value as Role })}
                        aria-label={`Peran untuk ${u.name}`}
                        disabled={!isAdmin}
                        className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-jkn-border bg-white text-jkn-text hover:border-bpjs focus:outline-none focus:border-bpjs cursor-pointer"
                      >
                        {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </option>
                        ))}
                      </select>

                      <label
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold cursor-pointer transition-colors ${
                          u.active
                            ? "bg-emerald-50/70 border-emerald-200 text-emerald-800"
                            : "bg-slate-100 border-slate-200 text-slate-500"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={u.active}
                          disabled={isSelf || !isAdmin}
                          onChange={(e) => updateUser(u, { active: e.target.checked })}
                          className="accent-bpjs rounded cursor-pointer"
                        />
                        <span>{u.active ? "Aktif" : "Nonaktif"}</span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Compact Role Capabilities Summary */}
            <div className="rounded-xl bg-surface-secondary/60 border border-jkn-divider p-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
              <div>
                <div className="font-bold text-jkn-text">Investigator</div>
                <div className="text-jkn-muted leading-snug">
                  Bedah bukti medis, graf relasi, &amp; konsultasi AI Copilot.
                </div>
              </div>
              <div>
                <div className="font-bold text-jkn-text">Supervisor</div>
                <div className="text-jkn-muted leading-snug">
                  Otorisasi keputusan klaim, kalibrasi detektor, &amp; dosier PDF.
                </div>
              </div>
              <div>
                <div className="font-bold text-jkn-text">Administrator</div>
                <div className="text-jkn-muted leading-snug">
                  Manajemen personel RBAC, kebijakan sistem, &amp; verifikasi audit.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Forensic Audit Trail (SHA-256 Append-Only) */}
        <div className="lg:col-span-6 space-y-5">
          <div className="bg-surface rounded-2xl border border-jkn-border p-5 shadow-subtle space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-jkn-divider">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-bpjs-light border border-bpjs-border flex items-center justify-center text-bpjs-dark">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-jkn-text">
                    Jejak Audit Kriptografis (SHA-256)
                  </h3>
                  <p className="text-[11px] text-jkn-muted">
                    Bukti hukum &amp; forensik atas setiap keputusan klaim dan perubahan kebijakan
                  </p>
                </div>
              </div>
              {status && (
                <span
                  className={`text-[11px] px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5 ${
                    status.audit.valid
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  {status.audit.valid
                    ? `Rantai Valid · ${status.audit.length} Entri`
                    : `RUSAK #${status.audit.broken_at_seq}`}
                </span>
              )}
            </div>

            {/* Cryptographic Head Hash Banner */}
            {status && (
              <div className="rounded-xl bg-[#071A12] text-emerald-50 p-3.5 border border-emerald-900/30 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                    <FileCheck2 className="w-3 h-3" /> Segel Rantai Terkini (Head Hash SHA-256)
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-emerald-100/90 break-all">
                    {maskHash(status.audit.head_hash, revealHash || !privacyRedaction)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(status.audit.head_hash, "head")}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-[11px] font-medium text-white shrink-0 transition-colors"
                >
                  {copiedHash === "head" ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-300" /> Tersalin
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-emerald-300" /> Salin
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="inline-flex rounded-xl bg-surface-secondary p-1 border border-jkn-divider">
                {(
                  [
                    ["ALL", "Semua"],
                    ["GOVERNANCE", "Kebijakan & RBAC"],
                    ["CLAIM", "Aktivitas Klaim"],
                    ["AUTH", "Akses"],
                    ["SYSTEM", "Sistem & Data"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setAuditFilter(key)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                      auditFilter === key
                        ? "bg-white text-bpjs-dark shadow-2xs border border-jkn-border"
                        : "text-jkn-muted hover:text-jkn-text"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={exportAudit}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-jkn-border bg-white hover:bg-surface-secondary text-[11px] font-semibold text-bpjs-dark shrink-0"
              >
                <Download className="w-3.5 h-3.5" /> Ekspor CSV
              </button>
              <div className="relative flex-1 sm:max-w-[210px]">
                <Search className="w-3.5 h-3.5 text-jkn-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={auditQuery}
                  onChange={(e) => setAuditQuery(e.target.value)}
                  placeholder="Cari aktor, klaim, aksi..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-jkn-border bg-white text-xs text-jkn-text placeholder:text-jkn-dim focus:outline-none focus:border-bpjs"
                />
              </div>
            </div>

            <div className="text-[11px] text-jkn-muted">
              Menampilkan {filteredAudit.length} dari {audit.length} entri terbaru ({auditTotal} total dalam rantai).
            </div>
            {/* Audit Entries Timeline */}
            <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
              {filteredAudit.map((e) => (
                <div
                  key={e.seq}
                  className="p-3.5 rounded-xl bg-surface-secondary/60 hover:bg-surface-secondary border border-jkn-divider transition-colors text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] font-bold text-jkn-muted">
                        #{e.seq}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getActionBadgeStyle(
                          e.action
                        )}`}
                      >
                        {e.action}
                      </span>
                      {e.claim_id && e.claim_id !== "—" && (
                        <span className="font-mono text-[11px] font-semibold text-bpjs-dark bg-white px-2 py-0.5 rounded border border-jkn-border">
                          {e.claim_id}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-jkn-dim shrink-0">
                      {formatRelativeTime(e.timestamp)}
                    </span>
                  </div>

                  <div className="text-[11px] text-jkn-text font-medium">
                    Oleh: <span className="font-bold">{e.actor}</span>{" "}
                    <span className="text-jkn-muted font-normal">
                      ({ROLE_LABEL[e.actor_role as Role] || e.actor_role})
                    </span>
                  </div>

                  {e.justification && e.justification !== "—" && (
                    <div className="text-[11px] italic text-jkn-muted bg-white/90 rounded-lg px-2.5 py-1.5 border border-jkn-divider">
                      &ldquo;{e.justification}&rdquo;
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <span className="font-mono text-[10px] text-jkn-dim truncate">
                      sha256: {maskHash(e.hash, revealHash || !privacyRedaction)}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(e.hash, `seq-${e.seq}`)}
                      className="text-[10px] text-bpjs-dark hover:underline shrink-0 font-semibold"
                    >
                      {copiedHash === `seq-${e.seq}` ? "Tersalin" : "Salin Hash"}
                    </button>
                  </div>
                </div>
              ))}
              {filteredAudit.length === 0 && (
                <div className="py-10 text-center text-xs text-jkn-muted bg-surface-secondary/40 rounded-xl border border-dashed border-jkn-border">
                  Tidak ada entri audit yang sesuai dengan filter.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
