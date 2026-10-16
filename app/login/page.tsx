"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, Lock, Mail, ArrowRight } from "lucide-react";
import { resetSessionCache } from "@/lib/auth/client";

const DEMO = [
  { role: "Investigator", email: "investigator@arsa.id", note: "Pemeriksaan bukti, catatan & status kerja" },
  { role: "Supervisor", email: "supervisor@arsa.id", note: "Keputusan akhir & unggah dataset SIMRS" },
  { role: "Admin", email: "admin@arsa.id", note: "Konfigurasi sistem, RBAC & reset demo" },
];

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Autentikasi gagal");
      resetSessionCache();
      window.location.href = next.startsWith("/") ? next : "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Autentikasi gagal");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-[420px] space-y-4">
        <div className="bg-surface rounded-xl border border-jkn-border shadow-subtle overflow-hidden">
          {/* Institutional Header */}
          <div className="px-6 py-5 border-b border-jkn-divider bg-surface-subtle/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white border border-jkn-border p-1.5 shrink-0 flex items-center justify-center">
              <img src="/arsa_logo.png" alt="ARSA AI" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-base font-bold text-jkn-text tracking-tight">
                JKN Risk Intelligence
              </h1>
              <p className="text-[11px] text-jkn-muted">
                Otorisasi Verifikator & Auditor Klaim INA-CBG
              </p>
            </div>
          </div>

          <form onSubmit={submit} className="p-6 space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-jkn-text">Alamat Email Instansi</span>
              <div className="mt-1.5 relative">
                <Mail className="w-4 h-4 text-jkn-dim absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-jkn-border bg-white text-xs text-jkn-text focus:outline-none focus:ring-2 focus:ring-bpjs/20 focus:border-bpjs"
                  placeholder="nama@bpjs-kesehatan.go.id"
                />
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-jkn-text">Kata Sandi</span>
              <div className="mt-1.5 relative">
                <Lock className="w-4 h-4 text-jkn-dim absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-jkn-border bg-white text-xs text-jkn-text focus:outline-none focus:ring-2 focus:ring-bpjs/20 focus:border-bpjs"
                />
              </div>
            </label>
            {error && (
              <div
                role="alert"
                className="text-xs text-risk-critical bg-risk-critical-bg border border-risk-critical-border rounded-lg px-3 py-2"
              >
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full h-9 flex items-center justify-center gap-2 rounded-lg bg-bpjs text-white text-xs font-semibold hover:bg-bpjs-deep transition-colors disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>Masuk ke Ruang Kerja</span>
              {!busy && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
            <div className="pt-2 border-t border-jkn-divider flex items-center justify-between text-[11px] text-jkn-muted">
              <span>Belum memiliki akses?</span>
              <Link href="/register" className="text-bpjs font-semibold hover:underline">
                Registrasi Investigator →
              </Link>
            </div>
          </form>
        </div>

        {/* Demo Credentials Ledger */}
        <div className="bg-surface rounded-xl border border-jkn-border shadow-subtle overflow-hidden">
          <div className="px-4 py-2.5 bg-surface-secondary border-b border-jkn-border flex items-center justify-between">
            <span className="text-[10px] font-bold text-jkn-muted uppercase tracking-wider">
              Kredensial Simulasi Peran (RBAC)
            </span>
            <span className="font-mono text-[10px] text-jkn-dim">Sandi: Arsa#2026</span>
          </div>
          <div className="divide-y divide-jkn-divider">
            {DEMO.map((d) => (
              <button
                key={d.email}
                type="button"
                onClick={() => {
                  setEmail(d.email);
                  setPassword("Arsa#2026");
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-surface-subtle transition-colors flex items-center justify-between gap-2"
              >
                <div>
                  <div className="text-xs font-semibold text-jkn-text">
                    {d.role}{" "}
                    <span className="font-mono font-normal text-jkn-muted">· {d.email}</span>
                  </div>
                  <div className="text-[10px] text-jkn-dim mt-0.5">{d.note}</div>
                </div>
                <span className="text-[10px] font-semibold text-bpjs shrink-0">Isi otomatis</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
