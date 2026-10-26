import { z } from "zod";
import { CanonicalClaim } from "@/types/claim";
import { RiskFinding } from "@/types/risk";
import { generateJson, getAIStatus } from "./llm";
import { llmForbiddenByPolicy } from "../governance/policy";
import { claimItems, ContextItem } from "./context";

const LlmSchema = z.object({
  explanations: z.array(
    z.object({
      risk_type: z.string(),
      text: z.string().min(10),
      cited_evidence_ids: z.array(z.string()).min(1),
    })
  ),
});

function deterministic(f: RiskFinding): NonNullable<RiskFinding["ai_explanation"]> {
  const cited = f.evidence.map((e) => e.evidence_id);
  const lines = [f.summary, ...f.evidence.filter((e) => e.supports_finding).map((e) => `${e.claim_statement}${e.excerpt ? ` Kutipan: "${e.excerpt}"` : ""} [${e.evidence_id}]`)];
  if (f.missing_evidence.length) lines.push(`Bukti yang belum tersedia: ${f.missing_evidence.join("; ")}.`);
  return { text: lines.join(" "), source: "deterministic", cited_evidence_ids: cited };
}

/**
 * Menghasilkan penjelasan per temuan. LLM hanya boleh mengutip evidence_id yang ADA pada klaim
 * (dokumen / klaim mirip); id lain ditolak -> penjelasan kembali ke versi deterministik.
 */
export async function explainClaimFindings(claim: CanonicalClaim, opts: { force?: boolean } = {}): Promise<{ mode: "llm" | "deterministic"; reason?: string }> {
  if (!opts.force && claim.risk_findings.every((f) => f.ai_explanation)) {
    return { mode: claim.risk_findings.some((f) => f.ai_explanation?.source === "llm") ? "llm" : "deterministic" };
  }

  const items: ContextItem[] = claimItems(claim);
  const validIds = new Set<string>([...claim.medical_evidence.map((e) => e.evidence_id), ...items.filter((i) => i.kind === "SIMILAR" || i.kind === "FINDING").map((i) => i.id)]);
  const status = await getAIStatus();

  const applyDeterministic = (reason: string) => {
    claim.risk_findings.forEach((f) => (f.ai_explanation = deterministic(f)));
    return { mode: "deterministic" as const, reason };
  };
  if (claim.risk_findings.length === 0) return { mode: "deterministic" };
  if (llmForbiddenByPolicy()) return applyDeterministic("Kebijakan tata kelola: mode deterministik (tanpa LLM).");
  if (!status.available) return applyDeterministic(status.reason || "LLM tidak tersedia");

  const context = items.map((i) => `[${i.id}] ${i.title}\n${i.text}`).join("\n\n");
  const prompt = `Jelaskan untuk investigator, per jenis risiko, MENGAPA klaim ini mencurigakan dan bukti apa yang mendukung. Gunakan HANYA konteks. Setiap penjelasan harus mengutip id bukti (DOC-..., sim:..., finding:...) pada "cited_evidence_ids" dan menulis penanda [id] di dalam teks.

KONTEKS:
${context}

Jenis risiko yang harus dijelaskan: ${claim.risk_findings.map((f) => f.risk_type).join(", ")}.
Kembalikan JSON: {"explanations":[{"risk_type":"UPCODING","text":"... [DOC-..]","cited_evidence_ids":["DOC-.."]}]}`;

  try {
    const res = await generateJson(prompt, LlmSchema, {
      system: "Anda analis klaim JKN. Jawab Bahasa Indonesia, ringkas, faktual, tanpa mengarang. Jangan menyebut identitas pasien. Keputusan akhir ada pada investigator.",
      temperature: 0.1,
      timeoutMs: 40_000,
    });
    let anyValid = false;
    for (const f of claim.risk_findings) {
      const e = res.explanations.find((x) => x.risk_type === f.risk_type);
      const cited = (e?.cited_evidence_ids ?? []).filter((id) => validIds.has(id));
      const invalid = (e?.cited_evidence_ids ?? []).length - cited.length;
      if (e && cited.length > 0 && invalid === 0) {
        f.ai_explanation = { text: e.text, source: "llm", provider: status.provider_label, model: status.model, cited_evidence_ids: cited };
        anyValid = true;
      } else {
        f.ai_explanation = deterministic(f); // ditolak validator
      }
    }
    return anyValid ? { mode: "llm" } : { mode: "deterministic", reason: "Sitasi LLM tidak lolos validasi" };
  } catch (e) {
    return applyDeterministic(e instanceof Error ? e.message.slice(0, 160) : "LLM error");
  }
}
