import { CanonicalClaim } from "@/types/claim";
import { Dataset } from "@/types/dataset";
import { Investigation, InvestigationNote, InvestigationStatus } from "@/types/investigation";
import { Doctor, Provider } from "@/types/provider";
import { appendEntry, AuditEntry, AuditInput } from "../audit/chain";
import { seedDefaultUsers } from "../auth/users";
import { UserRecord } from "../auth/types";
import { computeProviderStats } from "../analytics/aggregates";
import { analyzeLocal, AnalysisSummary } from "../risk/engine";
import { defaultPolicy, getGovernancePolicy, setGovernancePolicy } from "../governance/policy";
import { deleteState, loadState, PersistedState, scheduleSave } from "./persistence";
import { generateSyntheticDataset, GroundTruth, SEED_VERSION } from "./synthetic-seed";
import { mirrorAudit } from "../db/audit-mirror";

/**
 * Store utama (singleton di globalThis agar tahan HMR Next dev).
 * Data bawaan = dataset sintetis deterministik; data hasil ingest + perubahan pengguna dipersistenkan
 * ke .data/arsa-state.json sehingga bertahan antar restart.
 */
export interface DataStore {
  claims: CanonicalClaim[];
  investigations: Investigation[];
  providers: Provider[];
  doctors: Doctor[];
  datasets: Dataset[];
  auditLog: AuditEntry[];
  users: UserRecord[];
  labels: GroundTruth;
  ingestedClaimIds: Set<string>;
  embeddings: Map<string, { model: string; vector: number[] }>;
  meta: { analyzed_at?: string; embedding_model?: string; last_analysis?: AnalysisSummary; booted_at: string };
}

const g = globalThis as unknown as { __arsaStore?: DataStore };

function seedDataset(store: DataStore): Dataset {
  const n = store.claims.length;
  const sampleClaims = store.claims.slice(0, 3);
  const colMeta: Array<{
    name: string;
    detected_type: "string" | "number" | "date";
    sample: string[];
    pii?: "NIK" | "CARD" | "PATIENT_ID" | "NAME" | "ADDRESS" | "PHONE" | "EMAIL" | "FREE_TEXT";
    pii_treatment?: "PSEUDONYMIZED" | "INITIALS_ONLY" | "DROPPED" | "SCRUBBED";
    reason: string;
  }> = [
    {
      name: "claim_id",
      detected_type: "string",
      sample: sampleClaims.map((c) => c.claim_id),
      reason: "Kunci utama klaim (SEP / Nomor Klaim JKN)",
    },
    {
      name: "patient_id",
      detected_type: "string",
      sample: sampleClaims.map((c) => c.patient.patient_id),
      pii: "PATIENT_ID",
      pii_treatment: "PSEUDONYMIZED",
      reason: "Token HMAC-SHA256 satu arah dari NIK/No. Kartu JKN (UU PDP)",
    },
    {
      name: "provider_id",
      detected_type: "string",
      sample: sampleClaims.map((c) => `${c.provider.provider_id} (${c.provider.name})`),
      reason: "Kode Faskes & Nama Rumah Sakit Mitra BPJS",
    },
    {
      name: "primary_diagnosis",
      detected_type: "string",
      sample: sampleClaims.map((c) => {
        const primary = c.diagnoses.find((d) => d.is_primary) || c.diagnoses[0];
        return primary ? `${primary.code} — ${primary.description}` : "—";
      }),
      reason: "Kode diagnosis utama ICD-10 beserta deskripsi klinis",
    },
    {
      name: "severity_level",
      detected_type: "number",
      sample: sampleClaims.map((c) => {
        const primary = c.diagnoses.find((d) => d.is_primary) || c.diagnoses[0];
        return `Tingkat ${primary?.severity ?? 1}`;
      }),
      reason: "Tingkat keparahan INA-CBG (Severity Level I / II / III)",
    },
    {
      name: "length_of_stay",
      detected_type: "number",
      sample: sampleClaims.map((c) => `${c.service.length_of_stay} hari`),
      reason: "Lama hari rawat inap (LOS) pasien",
    },
    {
      name: "claim_amount",
      detected_type: "number",
      sample: sampleClaims.map((c) => `Rp ${c.claim_amount.toLocaleString("id-ID")}`),
      reason: "Total nilai tagihan klaim INA-CBG yang diajukan faskes",
    },
    {
      name: "admission_date",
      detected_type: "date",
      sample: sampleClaims.map((c) => c.service.admission_date),
      reason: "Tanggal masuk perawatan (format ISO YYYY-MM-DD)",
    },
    {
      name: "discharge_date",
      detected_type: "date",
      sample: sampleClaims.map((c) => c.service.discharge_date),
      reason: "Tanggal pulang / selesai perawatan (format ISO YYYY-MM-DD)",
    },
  ];

  const analysis = store.meta.last_analysis;
  const flaggedCount = store.claims.filter((c) => c.risk_score >= 40).length;

  return {
    dataset_id: "DS-SEED",
    name: "Dataset Sintetis Bawaan (dikalibrasi statistik BPJS 2018)",
    source_format: "CSV",
    file_size_bytes: n * 1800,
    row_count: n,
    status: "READY",
    columns: colMeta.map((c) => ({
      name: c.name,
      detected_type: c.detected_type,
      sample_values: c.sample,
      null_count: 0,
      total_count: n,
      distinct_count: c.name === "severity_level" ? 3 : c.name === "provider_id" ? store.providers.length : n,
      pii: c.pii,
      pii_treatment: c.pii_treatment,
    })),
    mappings: colMeta.map((c) => ({
      source_field: c.name,
      canonical_field: c.name,
      confidence: 1,
      is_ai_suggested: false,
      suggested_by: "heuristic" as const,
      reason: c.reason,
      status: "CONFIRMED" as const,
    })),
    quality_summary: {
      total_rows: n,
      valid_rows: n,
      invalid_rows: 0,
      duplicate_rows: 0,
      completeness_score: 100,
      validity_score: 100,
      missing_required_fields: [],
    },
    anonymization: {
      columns_pseudonymized: ["patient_id (NIK/BPJS -> Token HMAC-SHA256)"],
      columns_initials: ["patient_initials (Nama Pasien -> Inisial)"],
      columns_dropped: ["alamat_ktp", "no_telepon"],
      columns_scrubbed: ["clinical_summary_text", "lab_summary_text"],
    },
    result: {
      claims_ingested: n,
      findings_total: analysis?.findings_total ?? store.claims.reduce((s, c) => s + (c.risk_findings?.length ?? 0), 0),
      flagged_claims: analysis?.flagged_claims ?? flaggedCount,
      investigations_created: analysis?.investigations_created ?? store.investigations.length,
      embedding_model: store.meta.embedding_model || "hash-384 (lokal deterministik)",
    },
    created_at: "2026-09-30T00:00:00Z",
    updated_at: "2026-09-30T00:00:00Z",
  };
}

function snapshot(store: DataStore): PersistedState {
  const overrides: PersistedState["investigation_overrides"] = {};
  store.investigations.forEach((i) => {
    overrides[i.investigation_id] = { status: i.status, notes: i.notes, decision: i.decision, assigned_to: i.assigned_to, updated_at: i.updated_at };
  });
  const claimStatus: PersistedState["claim_status"] = {};
  store.claims.forEach((c) => {
    if (c.status === "CONFIRMED_RISK" || c.status === "FALSE_POSITIVE" || c.status === "IN_INVESTIGATION") claimStatus[c.claim_id] = c.status;
  });
  return {
    version: 1,
    seed_version: SEED_VERSION,
    datasets: store.datasets.filter((d) => d.dataset_id !== "DS-SEED"),
    ingested_claims: store.claims.filter((c) => store.ingestedClaimIds.has(c.claim_id)),
    investigation_overrides: overrides,
    claim_status: claimStatus,
    audit_log: store.auditLog,
    users: store.users,
    governance_policy: getGovernancePolicy(),
  };
}

// Memoisasi hasil turunan (agregasi, daftar terurut). Dibuang otomatis pada setiap mutasi (persist) / rebuild store.
const memo = new Map<string, unknown>();
export function memoized<T>(key: string, fn: () => T): T {
  if (memo.has(key)) return memo.get(key) as T;
  const v = fn();
  memo.set(key, v);
  return v;
}

export function persist() {
  memo.clear();
  const s = g.__arsaStore;
  if (s) scheduleSave(() => snapshot(s));
}

function build(opts: { keepUsers?: UserRecord[]; keepAudit?: AuditEntry[]; ignorePersisted?: boolean } = {}): DataStore {
  const seed = generateSyntheticDataset();
  const persisted = opts.ignorePersisted ? null : loadState();
  if (persisted?.governance_policy) setGovernancePolicy({ ...defaultPolicy(), ...persisted.governance_policy });
  // Snapshot dari versi dataset bawaan yang lain: ID klaim bisa merujuk klaim berbeda, jadi override status tidak diterapkan.
  const staleOverrides = Boolean(persisted && persisted.seed_version !== SEED_VERSION);

  const store: DataStore = {
    claims: seed.claims,
    investigations: [],
    providers: seed.providers,
    doctors: seed.doctors,
    datasets: [],
    auditLog: opts.keepAudit ?? persisted?.audit_log ?? [],
    users: opts.keepUsers ?? (persisted?.users?.length ? persisted.users : seedDefaultUsers()),
    labels: seed.labels,
    ingestedClaimIds: new Set(),
    embeddings: new Map(),
    meta: { booted_at: new Date().toISOString() },
  };

  if (persisted) {
    persisted.ingested_claims.forEach((c) => {
      store.claims.push(c);
      store.ingestedClaimIds.add(c.claim_id);
    });
    // Proses normalisasi yang terputus (server dimuat ulang di tengah jalan) tidak boleh tertahan selamanya pada NORMALIZING.
    store.datasets = persisted.datasets.map((d) =>
      d.status === "NORMALIZING"
        ? { ...d, status: "ERROR" as const, error_message: "Proses terputus karena server dimuat ulang sebelum selesai. Unggah ulang berkas untuk memprosesnya lagi." }
        : d
    );
    if (!staleOverrides) {
      store.claims.forEach((c) => {
        const st = persisted.claim_status[c.claim_id];
        if (st) c.status = st;
      });
    }
  }

  store.meta.last_analysis = analyzeLocal(store);
  store.datasets.unshift(seedDataset(store));

  if (persisted && !staleOverrides) {
    store.investigations.forEach((inv) => {
      const o = persisted.investigation_overrides[inv.investigation_id];
      if (o) {
        inv.status = o.status;
        inv.notes = o.notes;
        inv.decision = o.decision;
        inv.assigned_to = o.assigned_to;
        inv.updated_at = o.updated_at;
      }
    });
  }
  computeProviderStats(store);
  memo.clear();
  if (staleOverrides && persisted) {
    const dropped = Object.keys(persisted.investigation_overrides).length + Object.keys(persisted.claim_status).length;
    appendEntry(store.auditLog, {
      claim_id: "SYSTEM",
      actor: "Sistem",
      actor_role: "SYSTEM",
      action: "SEED_REFRESHED",
      previous_status: null,
      new_status: null,
      justification: `Dataset bawaan diperbarui (${persisted.seed_version ?? "versi lama"} -> ${SEED_VERSION}). ${dropped} penanda status kasus versi lama tidak diterapkan karena ID klaim kini merujuk data berbeda. Dataset unggahan, pengguna, dan jejak audit dipertahankan.`,
    });
    scheduleSave(() => snapshot(store));
  }
  return store;
}

export function getStore(): DataStore {
  if (!g.__arsaStore) {
    g.__arsaStore = build();
  } else {
    // Pastikan DS-SEED pada instance HMR memiliki profil sampel, anonimisasi, dan hasil analisis lengkap
    const idx = g.__arsaStore.datasets.findIndex((d) => d.dataset_id === "DS-SEED");
    if (idx !== -1 && (!g.__arsaStore.datasets[idx].anonymization || !g.__arsaStore.datasets[idx].result)) {
      g.__arsaStore.datasets[idx] = seedDataset(g.__arsaStore);
    }
  }
  return g.__arsaStore;
}

/** Reset ke dataset sintetis awal. Pengguna & audit log dipertahankan (audit bersifat append-only). */
export function resetDemoStore(actor?: { name: string; role: string }): DataStore {
  const prev = g.__arsaStore;
  deleteState();
  const store = build({ keepUsers: prev?.users, keepAudit: prev?.auditLog, ignorePersisted: true });
  g.__arsaStore = store;
  appendEntry(store.auditLog, {
    claim_id: "SYSTEM",
    actor: actor?.name || "Sistem",
    actor_role: actor?.role || "SYSTEM",
    action: "DEMO_RESET",
    previous_status: null,
    new_status: null,
    justification: "Data demo direset ke dataset sintetis awal.",
  });
  persist();
  return store;
}

/** Hitung ulang agregasi setelah analisis ulang / ingest. */
export function refreshAggregates(store: DataStore = getStore()) {
  computeProviderStats(store);
  persist();
}

export function recordAudit(input: AuditInput): AuditEntry {
  const store = getStore();
  const entry = appendEntry(store.auditLog, input);
  persist();
  void mirrorAudit(store.auditLog); // cermin ke Postgres (append-only + hash chain di DB) bila DATABASE_URL tersedia
  return entry;
}

// ---------------------------------------------------------------------------
// Mutasi investigasi (selalu menulis jejak audit ber-hash)
// ---------------------------------------------------------------------------
export interface Actor {
  uid: string;
  name: string;
  role: string;
}

const STATUS_LABEL: Record<InvestigationStatus, string> = {
  NEW: "Baru",
  UNDER_INVESTIGATION: "Dalam Investigasi",
  NEED_EVIDENCE: "Membutuhkan Bukti Tambahan",
  CONFIRMED_RISK: "Risiko Terkonfirmasi",
  FALSE_POSITIVE: "False Positive (Klaim Wajar)",
  ESCALATED: "Dieskalasi ke Komite Medis",
  CLOSED: "Ditutup",
};

export function updateInvestigation(
  idOrClaim: string,
  update: { status?: InvestigationStatus; note?: string; decision?: Investigation["decision"]; action?: string },
  actor: Actor
): Investigation | null {
  const store = getStore();
  const inv = store.investigations.find((i) => i.investigation_id === idOrClaim || i.claim_id === idOrClaim);
  if (!inv) return null;
  const now = new Date().toISOString();
  const previous = inv.status;

  if (inv.assigned_to.user_id === "UNASSIGNED") {
    inv.assigned_to = { user_id: actor.uid, name: actor.name, avatar: actor.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase(), role: actor.role };
  }

  if (update.status && update.status !== inv.status) {
    inv.status = update.status;
    const claim = inv.claim;
    if (update.status === "CONFIRMED_RISK") claim.status = "CONFIRMED_RISK";
    else if (update.status === "FALSE_POSITIVE") claim.status = "FALSE_POSITIVE";
    else if (update.status === "UNDER_INVESTIGATION" || update.status === "NEED_EVIDENCE") claim.status = "IN_INVESTIGATION";
    claim.updated_at = now;
    inv.notes.unshift({
      note_id: `NOT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      author: actor.name,
      role: actor.role,
      content: `Status diubah dari "${STATUS_LABEL[previous]}" menjadi "${STATUS_LABEL[update.status]}".${update.note ? ` Catatan: ${update.note}` : ""}`,
      created_at: now,
      type: "SYSTEM_AUDIT",
    });
  } else if (update.note) {
    inv.notes.unshift({ note_id: `NOT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, author: actor.name, role: actor.role, content: update.note, created_at: now, type: "USER_NOTE" });
  }

  if (update.decision) inv.decision = { ...update.decision, decided_by: actor.name, decided_at: now };
  inv.updated_at = now;

  recordAudit({
    claim_id: inv.claim_id,
    actor: actor.name,
    actor_role: actor.role,
    action: update.action || (update.status ? `STATUS_CHANGED_TO_${update.status}` : "NOTE_ADDED"),
    previous_status: previous,
    new_status: inv.status,
    justification: update.decision?.rationale || update.note || "—",
  });
  return inv;
}

export function addInvestigationNote(investigationId: string, content: string, actor: Actor): InvestigationNote | null {
  const inv = updateInvestigation(investigationId, { note: content, action: "NOTE_ADDED" }, actor);
  return inv ? inv.notes[0] : null;
}
