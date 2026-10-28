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

const DOCTOR_PHOTOS = [1, 2, 3, 4, 5, 6].map((n) => `/avatars/dr-${n}.jpg`);

/**
 * Foto ilustrasi dokter (stok, dipilih tetap dari nama) hanya untuk nama berawalan "dr."/"drg.";
 * bukan foto dokter sebenarnya. Selain itu, inisial berwarna.
 */
export function PersonAvatar({ name, size = 32 }: { name: string; size?: number }) {
  if (/^\s*drg?[.\s]/i.test(name)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={DOCTOR_PHOTOS[hash(name) % DOCTOR_PHOTOS.length]}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
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

/** Foto ilustrasi gedung dan bangsal; dipilih tetap per faskes dari kodenya (bukan foto faskes sebenarnya). */
const FACILITY_PHOTOS = ["/facility/rs-gedung.jpg", "/facility/rs-bangsal.jpg"];

export function facilityPhotoFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return FACILITY_PHOTOS[h % FACILITY_PHOTOS.length];
}

/** Foto default faskes dengan cincin warna tingkat risiko. */
export function FacilityPhoto({ id, level, size = 40, rounded = "rounded-xl" }: { id: string; level?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"; size?: number; rounded?: string }) {
  const ring = level === "CRITICAL" ? "ring-risk-critical" : level === "HIGH" ? "ring-risk-high" : level === "MEDIUM" ? "ring-risk-medium" : "ring-bpjs-border";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={facilityPhotoFor(id)}
      alt=""
      aria-hidden="true"
      loading="lazy"
      className={`shrink-0 object-cover ring-2 ring-offset-1 ring-offset-white ${ring} ${rounded}`}
      style={{ width: size, height: size }}
    />
  );
}
