import path from "path";

/** Direktori data runtime (snapshot, cache embedding, upload ternomalisasi). Dapat dialihkan dengan ARSA_DATA_DIR (mis. untuk E2E). */
export function dataDir(): string {
  return process.env.ARSA_DATA_DIR || path.join(process.cwd(), ".data");
}
