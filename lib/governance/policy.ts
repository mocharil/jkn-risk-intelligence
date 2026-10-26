/**
 * Kebijakan tata kelola yang dapat diatur di halaman Pengaturan. Satu sumber kebenaran untuk seluruh aplikasi:
 * modul lain membaca kebijakan dari sini, bukan menyalin nilainya.
 */
export interface GovernancePolicy {
  copilot_mode: "HYBRID_CITATION" | "DETERMINISTIC_ONLY";
  privacy_redaction: boolean;
  mask_pii_display: boolean;
  require_decision_justification: boolean;
  queue_min_score: number;
  sla_target_hours: number;
  updated_at: string;
}

const g = globalThis as unknown as { __arsaGovernancePolicy?: GovernancePolicy };

export function defaultPolicy(): GovernancePolicy {
  return {
    copilot_mode: "HYBRID_CITATION",
    privacy_redaction: true,
    mask_pii_display: true,
    require_decision_justification: true,
    queue_min_score: 75,
    sla_target_hours: 48,
    updated_at: new Date(0).toISOString(),
  };
}

export function getGovernancePolicy(): GovernancePolicy {
  if (!g.__arsaGovernancePolicy) g.__arsaGovernancePolicy = defaultPolicy();
  return g.__arsaGovernancePolicy;
}

export function setGovernancePolicy(next: GovernancePolicy): GovernancePolicy {
  g.__arsaGovernancePolicy = next;
  return next;
}

/** True bila kebijakan melarang pemakaian LLM (jawaban hanya disusun deterministik dari data). */
export function llmForbiddenByPolicy(): boolean {
  return getGovernancePolicy().copilot_mode === "DETERMINISTIC_ONLY";
}
