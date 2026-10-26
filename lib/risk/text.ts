import { EvidenceItem, Procedure } from "@/types/claim";
import { procedureRef } from "./reference";

/**
 * Analisis teks deterministik atas dokumen medis. Tidak ada LLM di sini:
 * semua keputusan dapat ditelusuri ke kata/kalimat yang tercantum pada dokumen.
 */

const MILD = [
  "stabil", "ringan", "membaik", "pulih", "tanpa komplikasi", "tidak ada komplikasi", "keadaan umum baik", "gejala hilang",
  "stable", "mild", "improved", "recovery", "recovered", "no complication", "symptom-free", "clinically stable", "moderate general condition",
];

const SEVERE = [
  "sepsis", "syok", "shock", "icu", "komplikasi", "perburukan", "memburuk", "ventilator", "intubasi", "gagal napas", "gagal ginjal",
  "asidosis", "acidosis", "deteriorat", "critical condition", "kondisi kritis", "dialisis", "hipotensi berat", "respiratory failure",
];

const NEGATION_BEFORE_SEVERE = /\b(?:no|without|tanpa|tidak ada|tidak|bukan|absence of)\s+(?:\w+\s+){0,3}?(?:severe|berat|sepsis|syok|shock|komplikasi|complications?|deteriorat\w*|perburukan|acidosis|asidosis)/gi;

function norm(s: string) {
  return s.toLowerCase();
}

function countMarkers(text: string, markers: string[]): number {
  const t = norm(text);
  let n = 0;
  // Batas kata di depan penanda agar "icu" tidak cocok dengan "difficult" atau "ringan" dengan "keringanan".
  for (const m of markers) if (new RegExp(`(?<![a-z0-9])${m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(t)) n++;
  return n;
}

export function docText(doc: EvidenceItem): string {
  return `${doc.title}. ${doc.excerpt}. ${doc.content}`;
}

export interface SeveritySignal {
  mild: number;
  severe: number;
}

export function severitySignal(doc: EvidenceItem): SeveritySignal {
  const text = docText(doc);
  const withoutNegated = text.replace(NEGATION_BEFORE_SEVERE, " ");
  return { mild: countMarkers(text, MILD), severe: countMarkers(withoutNegated, SEVERE) };
}

/** True bila dokumen secara tekstual menggambarkan kondisi ringan/stabil tanpa indikasi berat. */
export function documentIndicatesMild(doc: EvidenceItem): boolean {
  const s = severitySignal(doc);
  return s.mild > 0 && s.severe === 0;
}

export function documentIndicatesSevere(doc: EvidenceItem): boolean {
  return severitySignal(doc).severe > 0;
}

const NEG_BEFORE = /(?:tidak ada|tidak tercatat|tidak ditemukan|belum ada|\bno|without|tanpa|absent|not found)\b[^.;]*$/i;
const NEG_AFTER = /^[^.;]{0,40}?(?:tidak dilakukan|not performed|tidak tercatat|tidak ditemukan|not found|tidak ada catatan)/i;

function sentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+|\n/).filter(Boolean);
}

/** Negasi hanya dihitung bila terkait langsung dengan penyebutan tindakan (bukan "tidak ada penyulit" di kalimat yang sama). */
function mentionIsNegated(sentence: string, mentionIdx: number): boolean {
  const before = sentence.slice(Math.max(0, mentionIdx - 80), mentionIdx);
  const after = sentence.slice(mentionIdx);
  return NEG_BEFORE.test(before) || NEG_AFTER.test(after);
}

export type ProcedureSupport = "SUPPORTS" | "CONTRADICTS" | "NONE";

/** Apakah dokumen ini menyebut tindakan, dan apakah menyebutnya sebagai dilakukan atau tidak ada? */
export function procedureSupportInDoc(doc: EvidenceItem, proc: Procedure): ProcedureSupport {
  const ref = procedureRef(proc.code);
  const keywords = [...(ref?.keywords || []), ...proc.description.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 6)];
  const code = proc.code.toLowerCase();
  const text = docText(doc);
  const sents = sentences(text);

  let mentioned = false;
  for (const s of sents) {
    const sl = norm(s);
    const codeIdx = sl.indexOf(code);
    const kwHits = keywords.filter((k) => sl.includes(k));
    if (codeIdx >= 0 || new Set(kwHits).size >= 2) {
      mentioned = true;
      const idx = codeIdx >= 0 ? codeIdx : sl.indexOf(kwHits[0]);
      if (mentionIsNegated(sl, idx)) return "CONTRADICTS";
    }
  }
  return mentioned ? "SUPPORTS" : "NONE";
}

/** Cari dokumen yang secara eksplisit membantah tindakan (mis. "tidak ada catatan operasi"). */
export function procedureVerdict(docs: EvidenceItem[], proc: Procedure): { verdict: ProcedureSupport; doc?: EvidenceItem } {
  let supporting: EvidenceItem | undefined;
  for (const d of docs) {
    if (d.document_type === "BUKTI_BILLING") continue; // tagihan = klaim itu sendiri, bukan bukti pelayanan
    const r = procedureSupportInDoc(d, proc);
    if (r === "CONTRADICTS") return { verdict: "CONTRADICTS", doc: d };
    if (r === "SUPPORTS" && !supporting) supporting = d;
  }
  return supporting ? { verdict: "SUPPORTS", doc: supporting } : { verdict: "NONE" };
}

export function shingles(text: string, n = 3): Set<string> {
  const toks = norm(text).replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + n <= toks.length; i++) out.add(toks.slice(i, i + n).join(" "));
  return out;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  a.forEach((x) => {
    if (b.has(x)) inter++;
  });
  return inter / (a.size + b.size - inter);
}
