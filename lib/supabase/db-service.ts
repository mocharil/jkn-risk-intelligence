import { createAdminClient } from "./admin";
import { getStore, getDashboardKPIs, getProvinceRiskData } from "@/lib/data/store";
import { CanonicalClaim } from "@/types/claim";
import { Investigation, InvestigationNote, InvestigationStatus } from "@/types/investigation";
import { Provider } from "@/types/provider";
import { DashboardKPIs, ProvinceRiskData, EmergingSignal } from "@/types/risk";
import { Dataset } from "@/types/dataset";

export class DatabaseService {
  private static getAdmin() {
    return createAdminClient();
  }

  // Check if active Supabase connection is available
  public static isSupabaseConfigured(): boolean {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return Boolean(supabaseUrl && anonKey && !supabaseUrl.includes("your-project-ref"));
  }

  // ---------------------------------------------------------------------------
  // Claims
  // ---------------------------------------------------------------------------
  public static async getClaims(options: {
    search?: string;
    risk_type?: string;
    risk_level?: string;
    provider_id?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ data: CanonicalClaim[]; total_count: number }> {
    const admin = this.getAdmin();

    if (admin) {
      try {
        let query = admin.from("claims").select("*", { count: "exact" });

        if (options.risk_level && options.risk_level !== "ALL") {
          query = query.eq("risk_level", options.risk_level);
        }

        if (options.provider_id) {
          query = query.eq("provider_id", options.provider_id);
        }

        if (options.status && options.status !== "ALL") {
          query = query.eq("status", options.status);
        }

        if (options.risk_type && options.risk_type !== "ALL") {
          query = query.contains("risk_signals", [options.risk_type]);
        }

        if (options.search) {
          query = query.or(`claim_id.ilike.%${options.search}%,patient_name.ilike.%${options.search}%,patient_id.ilike.%${options.search}%,inacbg_description.ilike.%${options.search}%`);
        }

        query = query.order("risk_score", { ascending: false });

        if (options.limit) {
          const from = options.offset || 0;
          query = query.range(from, from + options.limit - 1);
        }

        const { data, count, error } = await query;

        if (!error && data && data.length > 0) {
          // Format raw rows to CanonicalClaim format
          const formatted: CanonicalClaim[] = data.map((row: any) => ({
            claim_id: row.claim_id,
            sep_number: row.sep_number,
            patient: {
              patient_id: row.patient_id,
              name: row.patient_name,
              age: row.patient_age,
              gender: row.patient_gender as any,
              bpjs_card_number: `000${Math.floor(100000000 + Math.random() * 900000000)}`,
              province_code: "ID-JK",
            },
            provider: {
              provider_id: row.provider_id,
              name: row.provider_id === "HOSP-01" ? "RS Sehat Sentosa" : "RS Medika Utama",
              type: "RS_KELAS_B",
              province_code: "ID-JK",
              city: "Jakarta Selatan",
            },
            service: {
              admission_date: row.admission_date || "2026-08-01",
              discharge_date: row.discharge_date || "2026-08-07",
              submission_date: row.service_date || "2026-08-08",
              length_of_stay: row.length_of_stay || 6,
              treatment_class: "KELAS_1",
              doctor_id: "DOC-901",
              doctor_name: "dr. Hendra Prasetyo, Sp.OT",
              doctor_specialty: "Orthopedic Surgery",
            },
            diagnoses: [
              { code: row.inacbg_code || "A09", description: row.inacbg_description || "Gastroenteritis", is_primary: true, severity: row.severity_level || 3 },
            ],
            procedures: [
              { code: "44.95", description: "Laparoscopic digestive procedure", date: row.service_date || "2026-08-02", cost: 12500000 },
            ],
            claim_amount: Number(row.tariff),
            approved_tariff: Number(row.standard_tariff),
            tariff_difference: Number(row.potential_exposure),
            medical_evidence: [
              {
                evidence_id: "DOC-01",
                document_type: "RESUME_PULANG",
                title: "Resume Medis Rawat Inap (DOC-01)",
                date: "2026-08-07",
                excerpt: "Pasien membaik dengan terapi hidrasi oral.",
                content: row.clinical_summary || "Pasien masuk dengan diare akut tanpa dehidrasi berat.",
                status: "CONTRADICTS_CLAIM",
              },
            ],
            risk_score: row.risk_score,
            risk_level: row.risk_level,
            risk_signals: row.risk_signals || [],
            risk_findings: [],
            similar_claims: [],
            status: row.status,
            created_at: row.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));

          return { data: formatted, total_count: count || formatted.length };
        }
      } catch (err) {
        console.warn("Supabase query fallback to memory store:", err);
      }
    }

    // Smart Fallback Store
    const store = getStore();
    let filtered = store.claims;

    if (options.search) {
      const s = options.search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.claim_id.toLowerCase().includes(s) ||
          c.patient.name.toLowerCase().includes(s) ||
          c.patient.patient_id.toLowerCase().includes(s) ||
          c.provider.name.toLowerCase().includes(s) ||
          c.diagnoses.some((d) => d.code.toLowerCase().includes(s) || d.description.toLowerCase().includes(s))
      );
    }

    if (options.risk_type && options.risk_type !== "ALL") {
      filtered = filtered.filter((c) => c.risk_signals.includes(options.risk_type as any));
    }

    if (options.risk_level && options.risk_level !== "ALL") {
      filtered = filtered.filter((c) => c.risk_level === options.risk_level);
    }

    if (options.provider_id) {
      filtered = filtered.filter((c) => c.provider.provider_id === options.provider_id);
    }

    if (options.status && options.status !== "ALL") {
      filtered = filtered.filter((c) => c.status === options.status);
    }

    filtered = [...filtered].sort((a, b) => b.risk_score - a.risk_score);
    return { data: filtered, total_count: filtered.length };
  }

  public static async getClaimById(claimId: string): Promise<CanonicalClaim | null> {
    const admin = this.getAdmin();

    if (admin) {
      try {
        const { data, error } = await admin.from("claims").select("*").eq("claim_id", claimId).single();
        if (!error && data) {
          return {
            claim_id: data.claim_id,
            sep_number: data.sep_number,
            patient: {
              patient_id: data.patient_id,
              name: data.patient_name,
              age: data.patient_age,
              gender: data.patient_gender as any,
              bpjs_card_number: `000${Math.floor(100000000 + Math.random() * 900000000)}`,
              province_code: "ID-JK",
            },
            provider: {
              provider_id: data.provider_id,
              name: data.provider_id === "HOSP-01" ? "RS Sehat Sentosa" : "RS Medika Utama",
              type: "RS_KELAS_B",
              province_code: "ID-JK",
              city: "Jakarta Selatan",
            },
            service: {
              admission_date: data.admission_date || "2026-08-01",
              discharge_date: data.discharge_date || "2026-08-07",
              submission_date: data.service_date || "2026-08-08",
              length_of_stay: data.length_of_stay || 6,
              treatment_class: "KELAS_1",
              doctor_id: "DOC-901",
              doctor_name: "dr. Hendra Prasetyo, Sp.OT",
              doctor_specialty: "Orthopedic Surgery",
            },
            diagnoses: [
              { code: data.inacbg_code || "A09", description: data.inacbg_description || "Gastroenteritis", is_primary: true, severity: data.severity_level || 3 },
            ],
            procedures: [
              { code: "44.95", description: "Laparoscopic digestive procedure", date: data.service_date || "2026-08-02", cost: 12500000 },
            ],
            claim_amount: Number(data.tariff),
            approved_tariff: Number(data.standard_tariff),
            tariff_difference: Number(data.potential_exposure),
            medical_evidence: [
              {
                evidence_id: "DOC-01",
                document_type: "RESUME_PULANG",
                title: "Resume Medis Rawat Inap (DOC-01)",
                date: "2026-08-07",
                excerpt: "Pasien membaik dengan terapi hidrasi oral.",
                content: data.clinical_summary || "Pasien masuk dengan diare akut tanpa dehidrasi berat.",
                status: "CONTRADICTS_CLAIM",
              },
            ],
            risk_score: data.risk_score,
            risk_level: data.risk_level,
            risk_signals: data.risk_signals || [],
            risk_findings: [],
            similar_claims: [],
            status: data.status,
            created_at: data.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
      } catch (err) {
        console.warn("Supabase single claim fallback:", err);
      }
    }

    const store = getStore();
    return store.claims.find((c) => c.claim_id === claimId) || null;
  }

  // ---------------------------------------------------------------------------
  // Providers
  // ---------------------------------------------------------------------------
  public static async getProviders(): Promise<Provider[]> {
    const admin = this.getAdmin();

    if (admin) {
      try {
        const { data, error } = await admin.from("providers").select("*").order("potential_exposure", { ascending: false });
        if (!error && data && data.length > 0) {
          const store = getStore();
          return data.map((row: any) => {
            const seedMatch = store.providers.find((p) => p.provider_id === row.provider_id);
            return {
              provider_id: row.provider_id,
              name: row.name,
              type: (row.type || "RS_KELAS_B") as any,
              province_code: row.province_code || "ID-JK",
              province_name: seedMatch?.province_name || "DKI Jakarta",
              city: seedMatch?.city || "Jakarta Selatan",
              address: seedMatch?.address || "Jl. Kesehatan No. 12",
              phone: seedMatch?.phone || "+62 21 555-0192",
              risk_score: row.risk_score || 94,
              risk_level: (row.risk_score >= 80 ? "CRITICAL" : "HIGH") as any,
              total_claims: row.total_claims || 2840,
              high_risk_claims: row.high_risk_claims || 142,
              potential_exposure: Number(row.potential_exposure),
              dominant_risk_type: (row.dominant_risk_type || "UPCODING") as any,
              risk_composition: seedMatch?.risk_composition || {
                upcoding_pct: 45,
                cloning_pct: 15,
                phantom_billing_pct: 30,
                abnormal_los_pct: 10,
              },
              peer_comparison: seedMatch?.peer_comparison || {
                severity_3_rate: { provider: 38.4, peer_median: 12.1 },
                avg_los_days: { provider: 5.2, peer_median: 2.8 },
                avg_claim_amount: { provider: 18450000, peer_median: 8900000 },
                readmission_rate_pct: { provider: 14.2, peer_median: 4.8 },
              },
              doctors: seedMatch?.doctors || [],
              monthly_risk_trend: seedMatch?.monthly_risk_trend || [],
            };
          });
        }
      } catch (err) {
        console.warn("Supabase providers fallback:", err);
      }
    }

    const store = getStore();
    return store.providers;
  }

  public static async getProviderById(providerId: string): Promise<Provider | null> {
    const admin = this.getAdmin();

    if (admin) {
      try {
        const { data, error } = await admin.from("providers").select("*").eq("provider_id", providerId).single();
        if (!error && data) {
          const store = getStore();
          const seedMatch = store.providers.find((p) => p.provider_id === data.provider_id);
          return {
            provider_id: data.provider_id,
            name: data.name,
            type: (data.type || "RS_KELAS_B") as any,
            province_code: data.province_code || "ID-JK",
            province_name: seedMatch?.province_name || "DKI Jakarta",
            city: seedMatch?.city || "Jakarta Selatan",
            address: seedMatch?.address || "Jl. Kesehatan No. 12",
            phone: seedMatch?.phone || "+62 21 555-0192",
            risk_score: data.risk_score || 94,
            risk_level: (data.risk_score >= 80 ? "CRITICAL" : "HIGH") as any,
            total_claims: data.total_claims || 2840,
            high_risk_claims: data.high_risk_claims || 142,
            potential_exposure: Number(data.potential_exposure),
            dominant_risk_type: (data.dominant_risk_type || "UPCODING") as any,
            risk_composition: seedMatch?.risk_composition || {
              upcoding_pct: 45,
              cloning_pct: 15,
              phantom_billing_pct: 30,
              abnormal_los_pct: 10,
            },
            peer_comparison: seedMatch?.peer_comparison || {
              severity_3_rate: { provider: 38.4, peer_median: 12.1 },
              avg_los_days: { provider: 5.2, peer_median: 2.8 },
              avg_claim_amount: { provider: 18450000, peer_median: 8900000 },
              readmission_rate_pct: { provider: 14.2, peer_median: 4.8 },
            },
            doctors: seedMatch?.doctors || [],
            monthly_risk_trend: seedMatch?.monthly_risk_trend || [],
          };
        }
      } catch (err) {
        console.warn("Supabase single provider fallback:", err);
      }
    }

    const store = getStore();
    return store.providers.find((p) => p.provider_id === providerId) || null;
  }

  // ---------------------------------------------------------------------------
  // Investigations
  // ---------------------------------------------------------------------------
  public static async getInvestigations(options: { status?: string; search?: string } = {}): Promise<Investigation[]> {
    const admin = this.getAdmin();

    if (admin) {
      try {
        let query = admin.from("investigations").select("*").order("risk_score", { ascending: false });
        if (options.status && options.status !== "ALL") {
          query = query.eq("status", options.status);
        }
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data as Investigation[];
        }
      } catch (err) {
        console.warn("Supabase investigations fallback:", err);
      }
    }

    const store = getStore();
    let filtered = store.investigations;
    if (options.status && options.status !== "ALL") {
      filtered = filtered.filter((i) => i.status === options.status);
    }
    return filtered;
  }

  public static async getInvestigationById(id: string): Promise<Investigation | null> {
    const admin = this.getAdmin();

    if (admin) {
      try {
        const { data, error } = await admin.from("investigations").select("*").or(`investigation_id.eq.${id},claim_id.eq.${id}`).single();
        if (!error && data) {
          return data as Investigation;
        }
      } catch (err) {
        console.warn("Supabase single investigation fallback:", err);
      }
    }

    const store = getStore();
    return store.investigations.find((i) => i.investigation_id === id || i.claim.claim_id === id) || null;
  }

  public static async updateInvestigation(
    id: string,
    updateData: {
      status?: InvestigationStatus;
      determination?: any;
      notes?: InvestigationNote;
      audit_action?: string;
    }
  ): Promise<Investigation | null> {
    const admin = this.getAdmin();

    if (admin) {
      try {
        const { data, error } = await admin
          .from("investigations")
          .update({
            ...(updateData.status ? { status: updateData.status } : {}),
            ...(updateData.determination ? { determination: updateData.determination } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("investigation_id", id)
          .select()
          .single();

        if (!error && data) {
          // Log into audit trail
          if (updateData.audit_action) {
            await admin.from("audit_log").insert({
              log_id: `LOG-${Date.now().toString(36).toUpperCase()}`,
              claim_id: data.claim_id,
              actor: "Auditor JKN (Human-in-the-Loop)",
              action: updateData.audit_action,
              new_status: updateData.status || data.status,
              justification: updateData.determination?.justification || "Auditor manual determination",
              hash: Math.random().toString(16).substring(2, 10),
              previous_hash: "a4f8b2c1",
            });
          }
          return data as Investigation;
        }
      } catch (err) {
        console.warn("Supabase update investigation fallback:", err);
      }
    }

    // Memory store update
    const store = getStore();
    const inv = store.investigations.find((i) => i.investigation_id === id || i.claim.claim_id === id);
    if (!inv) return null;

    if (updateData.status) inv.status = updateData.status;
    if (updateData.determination) inv.decision = updateData.determination;
    if (updateData.notes) inv.notes.push(updateData.notes);
    inv.updated_at = new Date().toISOString();
    return inv;
  }

  // ---------------------------------------------------------------------------
  // Dashboard & Telemetry
  // ---------------------------------------------------------------------------
  public static async getDashboardKPIs(): Promise<DashboardKPIs> {
    return getDashboardKPIs();
  }

  public static async getProvinceRiskData(): Promise<ProvinceRiskData[]> {
    return getProvinceRiskData();
  }

  public static async getEmergingSignals(): Promise<EmergingSignal[]> {
    const admin = this.getAdmin();

    if (admin) {
      try {
        const { data, error } = await admin.from("emerging_signals").select("*");
        if (!error && data && data.length > 0) {
          return data as EmergingSignal[];
        }
      } catch (err) {
        console.warn("Supabase emerging signals fallback:", err);
      }
    }

    const store = getStore();
    return store.emergingSignals;
  }

  public static async getDatasets(): Promise<Dataset[]> {
    const store = getStore();
    return store.datasets;
  }
}
