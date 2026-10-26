import React from "react";
import { Building2 } from "lucide-react";

const TINTS = [
  "bg-emerald-100 text-emerald-900",
  "bg-teal-100 text-teal-900",
  "bg-sky-100 text-sky-900",
  "bg-lime-100 text-lime-900",
  "bg-stone-200 text-stone-800",
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** "dr. Hendra Prasetyo, Sp.OT" -> "HP". Gelar dan spesialisasi dilewati. */
export function initialsOf(name: string): string {
  const parts = name
    .split(",")[0]
    .replace(/\b(dr|drg|prof|ir|h|hj)\b\.?/gi, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  return ((parts[0][0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/**
 * Penanda inisial untuk orang. Sengaja bukan foto: aplikasi tidak memiliki foto dokter, dan foto stok pada profil yang
 * memuat skor risiko akan menempelkan wajah orang asing pada klaim/dokter yang diperiksa.
 */
export function PersonAvatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center rounded-full font-semibold shrink-0 ${TINTS[hash(name) % TINTS.length]}`}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.38)) }}
    >
      {initialsOf(name)}
    </span>
  );
}

/** Penanda faskes: ikon gedung berwarna menurut tingkat risiko. */
export function FacilityMark({ level, size = 36 }: { level?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"; size?: number }) {
  const tone =
    level === "CRITICAL" ? "bg-risk-critical-bg text-risk-critical" : level === "HIGH" ? "bg-risk-high-bg text-risk-high" : level === "MEDIUM" ? "bg-risk-medium-bg text-risk-medium" : "bg-bpjs-soft text-bpjs-dark";
  return (
    <span aria-hidden="true" className={`inline-flex items-center justify-center rounded-lg shrink-0 ${tone}`} style={{ width: size, height: size }}>
      <Building2 style={{ width: size * 0.5, height: size * 0.5 }} />
    </span>
  );
}
