"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
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
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Registrasi gagal");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registrasi gagal");
    } finally {
      setBusy(false);
    }
  };

  const input =
    "w-full h-9 px-3 rounded-lg border border-jkn-border bg-white text-xs text-jkn-text focus:outline-none focus:ring-2 focus:ring-bpjs/20 focus:border-bpjs";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-[420px] bg-surface rounded-xl border border-jkn-border shadow-subtle overflow-hidden">
        <div className="px-6 py-5 border-b border-jkn-divider bg-surface-subtle/60 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white border border-jkn-border p-1.5 shrink-0 flex items-center justify-center">
            <img src="/arsa_logo.png" alt="ARSA AI" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-base font-bold text-jkn-text tracking-tight">
              Registrasi Investigator Audit
            </h1>
            <p className="text-[11px] text-jkn-muted">
              Otorisasi peran Supervisor/Admin ditetapkan oleh Administrator.
            </p>
          </div>
        </div>

        <div className="p-6">
          {done ? (
            <div className="text-center py-4 space-y-3">
              <CheckCircle2 className="w-8 h-8 text-bpjs mx-auto" />
              <p className="text-sm font-bold text-jkn-text">Akun Investigator Berhasil Dibuat</p>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-bpjs text-white text-xs font-semibold hover:bg-bpjs-deep transition-colors"
              >
                <span>Lanjutkan ke Halaman Masuk</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3.5">
              <label className="block">
                <span className="text-xs font-semibold text-jkn-text">Nama Lengkap & Gelar</span>
                <input
                  required
                  minLength={3}
                  className={`${input} mt-1.5`}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-jkn-text">Alamat Email Instansi</span>
                <input
                  type="email"
                  required
                  className={`${input} mt-1.5`}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-jkn-text">
                  Kata Sandi (min. 8 karakter)
                </span>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className={`${input} mt-1.5`}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
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
                className="w-full h-9 flex items-center justify-center gap-2 rounded-lg bg-bpjs text-white text-xs font-semibold hover:bg-bpjs-deep disabled:opacity-60 transition-colors"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Daftarkan Akun</span>
              </button>
              <div className="pt-2 border-t border-jkn-divider flex items-center justify-between text-[11px] text-jkn-muted">
                <span>Sudah memiliki akun?</span>
                <Link href="/login" className="text-bpjs font-semibold hover:underline">
                  Masuk →
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
