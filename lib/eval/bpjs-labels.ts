import fs from "node:fs";
import path from "node:path";
import type { RiskType } from "@/types/risk";

let cache: Record<string, RiskType[]> | null | undefined;

/**
 * Label anomali untuk Data Sampel BPJS (FKRTL) sintetis. Hanya tersedia bila berkasnya ada di repositori;
 * dipakai untuk mengukur detektor pada data berbentuk BPJS (tanpa narasi klinis), bukan data klaim riil.
 */
export function loadBpjsSampleLabels(): Record<string, RiskType[]> | null {
  if (cache !== undefined) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(path.join(process.cwd(), "scripts", "fixtures", "bpjs_sampel_fkrtl.labels.json"), "utf8"));
  } catch {
    cache = null;
  }
  return cache ?? null;
}
