import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateSyntheticClaims, SYNTHETIC_PROVIDERS } from "@/lib/data/synthetic-seed";
import { INDONESIA_PROVINCES } from "@/lib/data/indonesia-provinces";

export async function POST() {
  const admin = createAdminClient();

  if (!admin) {
    return NextResponse.json(
      {
        success: false,
        message: "Supabase credentials are not configured in .env.local yet. Please provide NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 400 }
    );
  }

  try {
    // 1. Seed 34 Provinces
    const provinceRows = INDONESIA_PROVINCES.map((p) => ({
      province_code: p.code,
      name: p.name,
      latitude: p.lat,
      longitude: p.lng,
      island_group: p.island,
    }));
    await admin.from("provinces").upsert(provinceRows, { onConflict: "province_code" });

    // 2. Seed Providers
    const providerRows = SYNTHETIC_PROVIDERS.map((p) => ({
      provider_id: p.provider_id,
      name: p.name,
      type: p.type,
      province_code: p.province_code,
      total_claims: p.total_claims,
      high_risk_claims: p.high_risk_claims,
      risk_score: p.risk_score,
      potential_exposure: p.potential_exposure,
      dominant_risk_type: p.dominant_risk_type,
    }));
    await admin.from("providers").upsert(providerRows, { onConflict: "provider_id" });

    // 3. Generate and Seed Claims & Investigations
    const { claims, investigations } = generateSyntheticClaims();

    const claimRows = claims.map((c) => ({
      claim_id: c.claim_id,
      sep_number: c.sep_number,
      patient_id: c.patient.patient_id,
      patient_name: c.patient.name,
      patient_age: c.patient.age,
      patient_gender: c.patient.gender,
      provider_id: c.provider.provider_id,
      service_date: c.service.submission_date || c.service.admission_date,
      admission_date: c.service.admission_date,
      discharge_date: c.service.discharge_date,
      length_of_stay: c.service.length_of_stay,
      inacbg_code: c.diagnoses[0]?.code || "A09",
      inacbg_description: c.diagnoses[0]?.description || "Clinical diagnosis",
      tariff: c.claim_amount,
      standard_tariff: c.approved_tariff || Math.round(c.claim_amount * 0.75),
      potential_exposure: c.tariff_difference || 0,
      severity_level: c.diagnoses[0]?.severity || 1,
      status: c.status,
      risk_score: c.risk_score,
      risk_level: c.risk_level,
      risk_signals: c.risk_signals,
      clinical_summary: c.medical_evidence[0]?.content || "Clinical evidence summary",
    }));
    await admin.from("claims").upsert(claimRows, { onConflict: "claim_id" });

    // 4. Seed Investigations
    const investigationRows = investigations.map((inv) => ({
      investigation_id: inv.investigation_id,
      claim_id: inv.claim_id,
      provider_id: inv.claim.provider.provider_id,
      status: inv.status,
      assigned_to: inv.assigned_to.name,
      risk_score: inv.risk_score,
      potential_exposure: inv.potential_exposure,
      determination: inv.decision ? { ...inv.decision } : null,
      findings: inv.claim.risk_findings || [],
      documents: inv.claim.medical_evidence || [],
      similar_cases: inv.claim.similar_claims || [],
      created_at: inv.created_at,
      updated_at: inv.updated_at,
    }));
    await admin.from("investigations").upsert(investigationRows, { onConflict: "investigation_id" });

    return NextResponse.json({
      success: true,
      message: "Successfully seeded Supabase database with provinces, providers, claims, and investigations.",
      counts: {
        provinces: provinceRows.length,
        providers: providerRows.length,
        claims: claimRows.length,
        investigations: investigationRows.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
