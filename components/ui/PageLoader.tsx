import React from "react";
import { BrandLoader } from "./BrandLoader";

interface PageLoaderProps {
  label: string;
  className?: string;
}

/** Memuat data di dalam konten halaman (sidebar & header tetap tampil). Memakai tampilan BrandLoader yang sama dengan layar muat penuh. */
export const PageLoader: React.FC<PageLoaderProps> = ({ label, className }) => <BrandLoader variant="inline" label={label} className={className} />;
