"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Loader2,
  ArrowRight,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Registrasi gagal");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registrasi gagal");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#F4F7F5] flex flex-col items-center justify-center p-4 sm:p-6 font-sans overflow-hidden">
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
        <div className="text-center space-y-2.5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white border border-jkn-border shadow-card p-2">
            <img src="/arsa_logo.png" alt="ARSA AI" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-jkn-text tracking-tight">
              Registrasi Investigator
            </h1>
            <p className="text-xs text-jkn-muted mt-0.5">
              Otorisasi peran Supervisor/Admin ditetapkan oleh Administrator
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-jkn-border/90 shadow-elevated overflow-hidden">
          {done ? (
            <div className="p-7 text-center space-y-3.5">
              <div className="w-11 h-11 rounded-2xl bg-bpjs-light border border-bpjs-border flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-5 h-5 text-bpjs" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-jkn-text">Akun Investigator Berhasil Dibuat</p>
                <p className="text-xs text-jkn-muted">
                  Silakan masuk menggunakan kredensial yang baru didaftarkan.
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B291C] hover:bg-bpjs text-white text-xs font-semibold transition-all"
              >
                <span>Lanjutkan ke Halaman Masuk</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <>
              <form onSubmit={submit} className="p-6 sm:p-7 space-y-4">
                <label className="block">
                  <span className="text-xs font-semibold text-jkn-text">Nama Lengkap & Gelar</span>
                  <div className="mt-1.5 relative">
                    <User className="w-4 h-4 text-jkn-dim absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      required
                      minLength={3}
                      placeholder="dr. Siti Rahmawati, M.KM"
                      className="w-full h-10 pl-10 pr-3.5 rounded-xl border border-jkn-border bg-[#F9FBFA] focus:bg-white text-xs text-jkn-text transition-all focus:outline-none focus:ring-2 focus:ring-bpjs/15 focus:border-bpjs"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="text-xs font-semibold text-jkn-text">Alamat Email Instansi</span>
                  <div className="mt-1.5 relative">
                    <Mail className="w-4 h-4 text-jkn-dim absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      placeholder="nama@bpjs-kesehatan.go.id"
                      className="w-full h-10 pl-10 pr-3.5 rounded-xl border border-jkn-border bg-[#F9FBFA] focus:bg-white text-xs text-jkn-text transition-all focus:outline-none focus:ring-2 focus:ring-bpjs/15 focus:border-bpjs"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="text-xs font-semibold text-jkn-text">
                    Kata Sandi (min. 8 karakter)
                  </span>
                  <div className="mt-1.5 relative">
                    <Lock className="w-4 h-4 text-jkn-dim absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      placeholder="••••••••••••"
                      className="w-full h-10 pl-10 pr-10 rounded-xl border border-jkn-border bg-[#F9FBFA] focus:bg-white text-xs text-jkn-text transition-all focus:outline-none focus:ring-2 focus:ring-bpjs/15 focus:border-bpjs"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
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
                  <span>Daftarkan Akun</span>
                  {!busy && (
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  )}
                </button>
              </form>

              <div className="px-6 py-3.5 bg-[#F9FBFA] border-t border-jkn-divider flex items-center justify-between text-xs text-jkn-muted">
                <span>Sudah memiliki akun?</span>
                <Link
                  href="/login"
                  className="text-bpjs font-semibold hover:text-bpjs-deep hover:underline"
                >
                  Masuk →
                </Link>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 text-[11px] text-jkn-dim">
          <ShieldCheck className="w-3.5 h-3.5 text-bpjs" />
          <span>Dilindungi Anonimisasi UU PDP & Jejak Audit SHA-256</span>
        </div>
      </div>
    </div>
  );
}
