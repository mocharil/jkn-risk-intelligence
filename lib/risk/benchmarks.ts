import { CanonicalClaim } from "@/types/claim";
import { referenceFor } from "./reference";
import { classCostFactor, provinceCostIndex } from "../data/bpjs-national";

export interface Benchmark {
  code: string;
  expected_severity: 1 | 2 | 3;
  expected_los: number;
  expected_tariff: number;
  sample_size: number;
  source: "peer" | "reference";
  /** Simpangan robust (MAD x 1,4826) dari ln(lama rawat) pada peer; tersedia hanya untuk source=peer. */
  los_log_sigma?: number;
  /** Simpangan robust ln(nilai klaim yang dinormalisasi kelas) pada peer. */
  amount_log_sigma?: number;
}

const CLASS_FACTOR = classCostFactor();

/** Faktor biaya kelas rawat terhadap rata-rata nasional (BPJS RITL 2018): kelas 1 > 1, kelas 3 < 1. Kelas lain/tak dikenal = 1. */
export function classFactorOf(treatmentClass?: string): number {
  const k = (treatmentClass || "").replace(/\D/g, "");
  return CLASS_FACTOR[k] ?? 1;
}

/** Indeks biaya provinsi terhadap nasional (BPJS RITL 2018, Sample/66); provinsi tak dikenal = 1. */
export function provinceFactorOf(provinceCode?: string): number {
  return provinceCode ? provinceCostIndex(provinceCode) || 1 : 1;
}

/** Rawat jalan memiliki biaya & lama rawat yang berbeda jauh; dibandingkan hanya dengan sesama rawat jalan. */
function bucketOf(treatmentClass?: string): "RJ" | "RI" {
  return treatmentClass === "RAWAT_JALAN" ? "RJ" : "RI";
}

export interface Benchmarks {
  /** Tarif ekspektasi disesuaikan kelas rawat: median peer yang dinormalisasi kelas, dikalikan faktor kelas klaim ini. */
  get(code: string, treatmentClass?: string, provinceCode?: string): Benchmark;
  peerCount(code: string, treatmentClass?: string): number;
}

export const MIN_PEER_SAMPLE = 8;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Simpangan robust skala-log: 1,4826 x MAD dari ln(x); dibatasi bawah agar sebaran sempit tidak membuat ambang terlalu sensitif. */
function robustLogSigma(values: number[], floor: number): number {
  const logs = values.filter((v) => v > 0).map((v) => Math.log(v));
  if (logs.length < 3) return floor;
  const med = median(logs);
  const mad = median(logs.map((x) => Math.abs(x - med)));
  return Math.max(floor, 1.4826 * mad);
}

function mode(values: number[]): number {
  const m = new Map<number, number>();
  values.forEach((v) => m.set(v, (m.get(v) || 0) + 1));
  let best = values[0];
  let bestN = 0;
  m.forEach((n, v) => {
    if (n > bestN || (n === bestN && v < best)) {
      best = v;
      bestN = n;
    }
  });
  return best;
}

/**
 * Benchmark dihitung dari data peer sebenarnya (median robust terhadap outlier).
 * Bila peer < MIN_PEER_SAMPLE, jatuh ke tabel referensi.
 */
export function computeBenchmarks(claims: CanonicalClaim[]): Benchmarks {
  const groups = new Map<string, CanonicalClaim[]>();
  for (const c of claims) {
    const d = c.diagnoses.find((x) => x.is_primary) || c.diagnoses[0];
    if (!d) continue;
    const key = `${d.code}|${bucketOf(c.service.treatment_class)}`;
    const arr = groups.get(key) || [];
    arr.push(c);
    groups.set(key, arr);
  }

  const cache = new Map<string, Benchmark>();
  return {
    peerCount: (code, treatmentClass) => groups.get(`${code}|${bucketOf(treatmentClass)}`)?.length || 0,
    get(code: string, treatmentClass?: string, provinceCode?: string): Benchmark {
      const factor = classFactorOf(treatmentClass) * provinceFactorOf(provinceCode);
      const key = `${code}|${factor}`;
      const hit = cache.get(key);
      if (hit) return hit;
      const peers = groups.get(`${code}|${bucketOf(treatmentClass)}`) || [];
      const ref = referenceFor(code);
      let b: Benchmark;
      if (peers.length >= MIN_PEER_SAMPLE) {
        const sevs = peers.map((p) => (p.diagnoses.find((d) => d.is_primary) || p.diagnoses[0]).severity as number);
        b = {
          code,
          expected_severity: Math.min(3, Math.max(1, mode(sevs))) as 1 | 2 | 3,
          expected_los: median(peers.map((p) => p.service.length_of_stay)) || ref.expected_los,
          expected_tariff: (median(peers.map((p) => p.claim_amount / (classFactorOf(p.service.treatment_class) * provinceFactorOf(p.provider.province_code)))) || ref.expected_tariff) * factor,
          sample_size: peers.length,
          source: "peer",
          los_log_sigma: robustLogSigma(peers.map((p) => p.service.length_of_stay), 0.2),
          amount_log_sigma: robustLogSigma(peers.map((p) => p.claim_amount / (classFactorOf(p.service.treatment_class) * provinceFactorOf(p.provider.province_code))), 0.1),
        };
      } else {
        b = { code, expected_severity: ref.expected_severity, expected_los: ref.expected_los, expected_tariff: ref.expected_tariff * factor, sample_size: peers.length, source: "reference" };
      }
      cache.set(key, b);
      return b;
    },
  };
}
