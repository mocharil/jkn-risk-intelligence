import { CanonicalClaim } from "@/types/claim";
import { Investigation, InvestigationStatus } from "@/types/investigation";
import { Provider } from "@/types/provider";
import { DashboardKPIs, EmergingSignal, ProvinceRiskData } from "@/types/risk";
import { Dataset } from "@/types/dataset";
import { computeDashboardKPIs, computeEmergingSignals, computeProvinceRisk } from "../analytics/aggregates";
import { withAiBriefing } from "../ai/briefing";
import { Actor, getStore, memoized, updateInvestigation } from "../data/store";

/**
 * Lapisan akses data. Sumber kebenaran = store hasil analisis (data sintetis bawaan + dataset yang di-ingest).
 * Supabase hanya opsional (cermin/persistensi); semua angka & profil berasal dari data nyata, bukan konstanta.
 */

export interface ClaimQuery {
  search?: string;
  risk_type?: string;
  risk_level?: string;
  provider_id?: string;
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
  limit?: number;
  offset?: number;
  lite?: boolean;
}

export function liteClaim(c: CanonicalClaim): CanonicalClaim {
  return {
    ...c,
    medical_evidence: c.medical_evidence.map((e) => ({ ...e, content: "" })),
    risk_findings: c.risk_findings.map((f) => ({ ...f, ai_explanation: undefined })),
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

    const sortFn = (a: CanonicalClaim, b: CanonicalClaim) => b.risk_score - a.risk_score || a.claim_id.localeCompare(b.claim_id);
    const sorted = list === store.claims ? memoized("claims.sorted", () => [...store.claims].sort(sortFn)) : [...list].sort(sortFn);
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
    let list = store.investigations;
    if (options.status && options.status !== "ALL") list = list.filter((i) => i.status === options.status);
    if (options.priority && options.priority !== "ALL") list = list.filter((i) => i.priority === options.priority);
    if (options.risk_type && options.risk_type !== "ALL") list = list.filter((i) => i.primary_risk_signals.includes(options.risk_type as never));
    if (options.search) {
      const s = options.search.toLowerCase();
      list = list.filter((i) => i.investigation_id.toLowerCase().includes(s) || i.claim_id.toLowerCase().includes(s) || i.claim.provider.name.toLowerCase().includes(s) || i.assigned_to.name.toLowerCase().includes(s));
    }
    const sortInv = (a: Investigation, b: Investigation) => b.risk_score - a.risk_score || a.investigation_id.localeCompare(b.investigation_id);
    const sorted = list === store.investigations ? memoized("inv.sorted", () => [...store.investigations].sort(sortInv)) : [...list].sort(sortInv);
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
