"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Loader2,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  Check,
  ShieldCheck,
} from "lucide-react";
import { resetSessionCache } from "@/lib/auth/client";

const DEMO = [
  {
    role: "Investigator",
    email: "investigator@arsa.id",
    note: "Pemeriksaan bukti, catatan & status kerja",
  },
  {
    role: "Supervisor",
    email: "supervisor@arsa.id",
    note: "Keputusan akhir & unggah dataset SIMRS",
  },
  {
    role: "Admin",
    email: "admin@arsa.id",
    note: "Konfigurasi sistem, RBAC & reset demo",
  },
];

const DEMO_PASS = process.env.NEXT_PUBLIC_DEMO_PASSWORD || "Arsa#2026";

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [email, setEmail] = useState("investigator@arsa.id");
  const [password, setPassword] = useState(DEMO_PASS);
  const [showPassword, setShowPassword] = useState(false);
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

  const selectedDemo = DEMO.find((d) => d.email === email);

  return (
    <div className="relative min-h-screen bg-[#F4F7F5] flex flex-col items-center justify-center p-4 sm:p-6 font-sans overflow-hidden">
      {/* Subtle Ambient Background Texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: "radial-gradient(#C2DFCE 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[560px] h-[320px] rounded-full bg-bpjs/10 blur-3xl"
      />

      <div className="relative z-10 w-full max-w-[400px] space-y-6">
        {/* Minimalist Brand Header */}
        <div className="text-center space-y-2.5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white border border-jkn-border shadow-card p-2">
            <img src="/arsa_logo.png" alt="ARSA AI" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-jkn-text tracking-tight">
              JKN Risk Intelligence
            </h1>
            <p className="text-xs text-jkn-muted mt-0.5">
              Otorisasi Verifikator & Auditor Klaim INA-CBG
            </p>
          </div>
        </div>

        {/* Clean Elevated Card */}
        <div className="bg-white rounded-2xl border border-jkn-border/90 shadow-elevated overflow-hidden">
          <form onSubmit={submit} className="p-6 sm:p-7 space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-jkn-text">Alamat Email Instansi</span>
              <div className="mt-1.5 relative">
                <Mail className="w-4 h-4 text-jkn-dim absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 pl-10 pr-3.5 rounded-xl border border-jkn-border bg-[#F9FBFA] focus:bg-white text-xs text-jkn-text transition-all focus:outline-none focus:ring-2 focus:ring-bpjs/15 focus:border-bpjs"
                  placeholder="nama@bpjs-kesehatan.go.id"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-jkn-text">Kata Sandi</span>
              <div className="mt-1.5 relative">
                <Lock className="w-4 h-4 text-jkn-dim absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full h-10 pl-10 pr-10 rounded-xl border border-jkn-border bg-[#F9FBFA] focus:bg-white text-xs text-jkn-text transition-all focus:outline-none focus:ring-2 focus:ring-bpjs/15 focus:border-bpjs"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-jkn-dim hover:text-jkn-text transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </label>

            {error && (
              <div
                role="alert"
                className="text-xs text-risk-critical bg-risk-critical-bg border border-risk-critical-border rounded-xl px-3.5 py-2.5"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-[#0B291C] hover:bg-bpjs text-white text-xs font-semibold shadow-subtle transition-all disabled:opacity-60 group"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>Masuk ke Ruang Kerja</span>
              {!busy && (
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              )}
            </button>

            {/* Sleek Integrated Role Selector */}
            <div className="pt-4 border-t border-jkn-divider space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-jkn-dim">
                  Simulasi Peran (RBAC)
                </span>
                <span className="font-mono text-[10px] text-jkn-dim">Sandi: {DEMO_PASS}</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {DEMO.map((d) => {
                  const active = email === d.email;
                  return (
                    <button
                      key={d.email}
                      type="button"
                      onClick={() => {
                        setEmail(d.email);
                        setPassword(DEMO_PASS);
                        setError("");
                      }}
                      className={`px-2.5 py-2 rounded-xl border text-left transition-all ${
                        active
                          ? "bg-bpjs-soft border-bpjs text-bpjs-dark shadow-subtle"
                          : "bg-[#F9FBFA] border-jkn-border/80 text-jkn-text hover:border-bpjs/50 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-bold truncate">{d.role}</span>
                        {active && <Check className="w-3 h-3 text-bpjs shrink-0" />}
                      </div>
                      <div className="font-mono text-[9px] text-jkn-dim truncate mt-0.5">
                        {d.email.split("@")[0]}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedDemo && (
                <p className="text-[11px] text-jkn-muted text-center bg-surface-subtle rounded-lg py-1.5 px-2.5 border border-jkn-divider">
                  {selectedDemo.note}
                </p>
              )}
            </div>
          </form>

          {/* Card Footer */}
          <div className="px-6 py-3.5 bg-[#F9FBFA] border-t border-jkn-divider flex items-center justify-between text-xs text-jkn-muted">
            <span>Belum memiliki akses?</span>
            <Link
              href="/register"
              className="text-bpjs font-semibold hover:text-bpjs-deep hover:underline"
            >
              Registrasi Investigator →
            </Link>
          </div>
        </div>

        {/* Subtle Trust Footer */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-jkn-dim">
          <ShieldCheck className="w-3.5 h-3.5 text-bpjs" />
          <span>Dilindungi Anonimisasi UU PDP & Jejak Audit SHA-256</span>
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
