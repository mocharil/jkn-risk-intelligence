/** Frasa yang menunjuk klaim yang sedang dibahas ("klaim ini", "kasus tersebut"), bukan klaim yang disebut dengan ID. */
const REFERS_TO_CURRENT_CLAIM = /\b(klaim|kasus|berkas)\s+(ini|tersebut|itu)\b/i;
const HAS_CLAIM_ID = /CLM[-\s]?\d{3,7}|INV-\d{4}-\d{3,7}/i;

/**
 * Klaim yang menjadi fokus percakapan untuk pertanyaan ini: dipakai agar "Mengapa klaim ini berisiko?" di halaman Copilot
 * dijawab tentang klaim yang baru dibahas, seperti di panel halaman investigasi. Tanpa rujukan seperti itu, tidak ada fokus.
 */
export function focusClaimFor(question: string, history: Array<{ visuals?: Array<{ kind: string; claim_id?: string }> }>): string | undefined {
  if (HAS_CLAIM_ID.test(question) || !REFERS_TO_CURRENT_CLAIM.test(question)) return undefined;
  for (let i = history.length - 1; i >= 0; i--) {
    const v = history[i].visuals?.find((x) => x.kind === "claim" && x.claim_id);
    if (v?.claim_id) return v.claim_id;
  }
  return undefined;
}
