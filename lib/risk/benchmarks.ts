import { CanonicalClaim } from "@/types/claim";
import { referenceFor } from "./reference";

export interface Benchmark {
  code: string;
  expected_severity: 1 | 2 | 3;
  expected_los: number;
  expected_tariff: number;
  sample_size: number;
  source: "peer" | "reference";
}

export interface Benchmarks {
  get(code: string): Benchmark;
  peerCount(code: string): number;
}

export const MIN_PEER_SAMPLE = 8;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
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
    const arr = groups.get(d.code) || [];
    arr.push(c);
    groups.set(d.code, arr);
  }

  const cache = new Map<string, Benchmark>();
  return {
    peerCount: (code) => groups.get(code)?.length || 0,
    get(code: string): Benchmark {
      const hit = cache.get(code);
      if (hit) return hit;
      const peers = groups.get(code) || [];
      const ref = referenceFor(code);
      let b: Benchmark;
      if (peers.length >= MIN_PEER_SAMPLE) {
        const sevs = peers.map((p) => (p.diagnoses.find((d) => d.is_primary) || p.diagnoses[0]).severity as number);
        b = {
          code,
          expected_severity: Math.min(3, Math.max(1, mode(sevs))) as 1 | 2 | 3,
          expected_los: median(peers.map((p) => p.service.length_of_stay)) || ref.expected_los,
          expected_tariff: median(peers.map((p) => p.claim_amount)) || ref.expected_tariff,
          sample_size: peers.length,
          source: "peer",
        };
      } else {
        b = { code, expected_severity: ref.expected_severity, expected_los: ref.expected_los, expected_tariff: ref.expected_tariff, sample_size: peers.length, source: "reference" };
      }
      cache.set(code, b);
      return b;
    },
  };
}
