import { getGovernancePolicy } from "@/lib/governance/policy";
import { CanonicalClaim } from "@/types/claim";
import { Investigation, InvestigationStatus } from "@/types/investigation";
import { Provider } from "@/types/provider";
import { DashboardKPIs, EmergingSignal, ProvinceRiskData } from "@/types/risk";
import { Dataset } from "@/types/dataset";
import { computeDashboardKPIs, computeEmergingSignals, computeProvinceRisk } from "../analytics/aggregates";
import { withAiBriefing } from "../ai/briefing";
import { Actor, getStore, memoized, updateInvestigation } from "../data/store";
import { nationalContext } from "../data/bpjs-national";

/**
 * Lapisan akses data. Sumber kebenaran = store hasil analisis (data sintetis bawaan + dataset yang di-ingest).
 * Supabase hanya opsional (cermin/persistensi); semua angka & profil berasal dari data nyata, bukan konstanta.
 */

export interface ClaimQuery {
  search?: string;
  risk_type?: string;
  risk_level?: string;
  provider_id?: string;
  /** Kode provinsi faskes (ID-XX). */
  province?: string;
  /** KELAS_1 | KELAS_2 | KELAS_3 | RAWAT_JALAN | TIDAK_DIKETAHUI */
  treatment_class?: string;
  /** risk (default) | amount | exposure | date */
  sort?: string;
  status?: string;
  limit?: number;
  offset?: number;
  /** Buang isi dokumen (hanya kutipan) agar payload daftar ringan. */
  lite?: boolean;
}

export interface InvestigationQuery {
  status?: string;
  search?: string;
  priority?: string;
  risk_type?: string;
  province?: string;
  /** risk (default) | exposure | amount | date */
  sort?: string;
  limit?: number;
  offset?: number;
  lite?: boolean;
}

export function liteClaim(c: CanonicalClaim): CanonicalClaim {
  return {
    ...c,
    medical_evidence: c.medical_evidence.map((e) => ({ ...e, content: "" })),
    risk_findings: c.risk_findings.map((f) => ({ ...f, ai_explanation: undefined })),
    national: nationalContext(c),
  };
}

export class DatabaseService {
  public static isSupabaseConfigured(): boolean {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return Boolean(url && key && !url.includes("your-project-ref") && !url.includes("project-ref"));
  }

  // ---- Claims ------------------------------------------------------------
  public static async getClaims(options: ClaimQuery = {}): Promise<{ data: CanonicalClaim[]; total_count: number }> {
    const store = getStore();
    let list = store.claims;

    if (options.search) {
      const s = options.search.toLowerCase();
      list = list.filter(
        (c) =>
          c.claim_id.toLowerCase().includes(s) ||
          c.patient.patient_id.toLowerCase().includes(s) ||
          c.patient.name.toLowerCase().includes(s) ||
          c.provider.name.toLowerCase().includes(s) ||
          c.service.doctor_name.toLowerCase().includes(s) ||
          c.diagnoses.some((d) => d.code.toLowerCase().includes(s) || d.description.toLowerCase().includes(s))
      );
    }
    if (options.risk_type && options.risk_type !== "ALL") list = list.filter((c) => c.risk_signals.includes(options.risk_type as never));
    if (options.risk_level && options.risk_level !== "ALL") list = list.filter((c) => c.risk_level === options.risk_level);
    if (options.provider_id) list = list.filter((c) => c.provider.provider_id === options.provider_id);
    if (options.status && options.status !== "ALL") list = list.filter((c) => c.status === options.status);
    if (options.province && options.province !== "ALL") list = list.filter((c) => c.provider.province_code === options.province);
    if (options.treatment_class && options.treatment_class !== "ALL") list = list.filter((c) => c.service.treatment_class === options.treatment_class);

    const byRisk = (a: CanonicalClaim, b: CanonicalClaim) => b.risk_score - a.risk_score || a.claim_id.localeCompare(b.claim_id);
    const sortFn =
      options.sort === "amount"
        ? (a: CanonicalClaim, b: CanonicalClaim) => b.claim_amount - a.claim_amount || byRisk(a, b)
        : options.sort === "exposure"
        ? (a: CanonicalClaim, b: CanonicalClaim) => (b.tariff_difference || 0) - (a.tariff_difference || 0) || byRisk(a, b)
        : options.sort === "date"
        ? (a: CanonicalClaim, b: CanonicalClaim) => b.service.submission_date.localeCompare(a.service.submission_date) || byRisk(a, b)
        : byRisk;
    const sorted = list === store.claims && sortFn === byRisk ? memoized("claims.sorted", () => [...store.claims].sort(byRisk)) : [...list].sort(sortFn);
    const total = sorted.length;
    const from = options.offset ?? 0;
    const page = options.limit ? sorted.slice(from, from + options.limit) : sorted;
    return { data: options.lite ? page.map(liteClaim) : page, total_count: total };
  }

  public static async getClaimById(claimId: string): Promise<CanonicalClaim | null> {
    return getStore().claims.find((c) => c.claim_id === claimId) || null;
  }

  // ---- Providers ---------------------------------------------------------
  public static async getProviders(): Promise<Provider[]> {
    const store = getStore();
    return memoized("providers.sorted", () => [...store.providers].sort((a, b) => b.potential_exposure - a.potential_exposure));
  }

  public static async getProviderById(providerId: string): Promise<Provider | null> {
    return getStore().providers.find((p) => p.provider_id === providerId) || null;
  }

  // ---- Investigations ----------------------------------------------------
  public static async getInvestigations(options: InvestigationQuery = {}): Promise<{ data: Investigation[]; total_count: number }> {
    const store = getStore();
    const minScore = getGovernancePolicy().queue_min_score;
    // Kasus baru di bawah skor minimum kebijakan tidak masuk antrean; kasus yang sudah ditangani tetap tampil.
    let list = store.investigations.filter((i) => i.status !== "NEW" || i.risk_score >= minScore);
    if (options.status && options.status !== "ALL") list = list.filter((i) => i.status === options.status);
    if (options.priority && options.priority !== "ALL") list = list.filter((i) => i.priority === options.priority);
    if (options.risk_type && options.risk_type !== "ALL") list = list.filter((i) => i.primary_risk_signals.includes(options.risk_type as never));
    if (options.search) {
      const s = options.search.toLowerCase();
      list = list.filter((i) => i.investigation_id.toLowerCase().includes(s) || i.claim_id.toLowerCase().includes(s) || i.claim.provider.name.toLowerCase().includes(s) || (i.assigned_to?.name ?? "").toLowerCase().includes(s));
    }
    if (options.province && options.province !== "ALL") list = list.filter((i) => i.claim.provider.province_code === options.province);
    const byRisk = (a: Investigation, b: Investigation) => b.risk_score - a.risk_score || a.investigation_id.localeCompare(b.investigation_id);
    const sortInv =
      options.sort === "exposure"
        ? (a: Investigation, b: Investigation) => b.potential_exposure - a.potential_exposure || byRisk(a, b)
        : options.sort === "amount"
        ? (a: Investigation, b: Investigation) => b.claim.claim_amount - a.claim.claim_amount || byRisk(a, b)
        : options.sort === "date"
        ? (a: Investigation, b: Investigation) => b.claim.service.submission_date.localeCompare(a.claim.service.submission_date) || byRisk(a, b)
        : byRisk;
    const sorted = list === store.investigations && sortInv === byRisk ? memoized("inv.sorted", () => [...store.investigations].sort(byRisk)) : [...list].sort(sortInv);
    const from = options.offset ?? 0;
    const page = options.limit ? sorted.slice(from, from + options.limit) : sorted;
    return {
      data: options.lite ? page.map((i) => ({ ...i, claim: liteClaim(i.claim) })) : page,
      total_count: sorted.length,
    };
  }

  public static async getInvestigationById(id: string): Promise<Investigation | null> {
    return getStore().investigations.find((i) => i.investigation_id === id || i.claim_id === id) || null;
  }

  public static async updateInvestigation(
    id: string,
    update: { status?: InvestigationStatus; note?: string; decision?: Investigation["decision"]; action?: string },
    actor: Actor
  ): Promise<Investigation | null> {
    return updateInvestigation(id, update, actor);
  }

  // ---- Dashboard & telemetri --------------------------------------------
  public static async getDashboardKPIs(opts: { waitForBriefing?: boolean } = {}): Promise<DashboardKPIs> {
    const store = getStore();
    return withAiBriefing(store, memoized("kpis", () => computeDashboardKPIs(store)), { wait: opts.waitForBriefing });
  }

  public static async getProvinceRiskData(): Promise<ProvinceRiskData[]> {
    const store = getStore();
    return memoized("province", () => computeProvinceRisk(store));
  }

  public static async getEmergingSignals(): Promise<EmergingSignal[]> {
    const store = getStore();
    return memoized("signals", () => computeEmergingSignals(store));
  }

  public static async getDatasets(): Promise<Dataset[]> {
    return getStore().datasets;
  }
}
