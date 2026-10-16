import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStore } from "@/lib/data/store";
import { INDONESIA_PROVINCES } from "@/lib/data/indonesia-provinces";

/**
 * Cerminkan data hasil analisis ke Supabase (opsional). Data sudah teranonimkan:
 * tidak ada nama pasien / NIK / nomor kartu mentah yang dikirim.
 */
export async function POST(request: NextRequest) {
  if (process.env.ARSA_DISABLE_DEMO === "1" || process.env.ARSA_STRICT_PRODUCTION === "1") {
    return NextResponse.json({ success: false, message: "Endpoint seed demo dinonaktifkan pada mode produksi ketat." }, { status: 403 });
  }
  const g = await guard(request, "admin.reset_demo");
  if (g.error) return g.error;

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ success: false, message: "Supabase belum dikonfigurasi di .env.local (NEXT_PUBLIC_SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY)." }, { status: 400 });
  }

  try {
    const store = getStore();
    await admin.from("provinces").upsert(
      INDONESIA_PROVINCES.map((p) => ({ province_code: p.code, name: p.name, latitude: p.lat, longitude: p.lng, island_group: p.island })),
      { onConflict: "province_code" }
    );
    await admin.from("providers").upsert(
      store.providers.map((p) => ({
        provider_id: p.provider_id,
        name: p.name,
        type: p.type,
        province_code: p.province_code,
        total_claims: p.total_claims,
        high_risk_claims: p.high_risk_claims,
        risk_score: p.risk_score,
        potential_exposure: p.potential_exposure,
        dominant_risk_type: p.dominant_risk_type,
      })),
      { onConflict: "provider_id" }
    );
    const claimRows = store.claims.map((c) => ({
      claim_id: c.claim_id,
      sep_number: c.sep_number,
      patient_id: c.patient.patient_id,
      patient_name: c.patient.name,
      patient_age: c.patient.age,
      patient_gender: c.patient.gender,
      provider_id: c.provider.provider_id,
      service_date: c.service.submission_date,
      admission_date: c.service.admission_date,
      discharge_date: c.service.discharge_date,
      length_of_stay: c.service.length_of_stay,
      inacbg_code: c.diagnoses[0]?.code,
      inacbg_description: c.diagnoses[0]?.description,
      tariff: c.claim_amount,
      standard_tariff: c.approved_tariff || 0,
      potential_exposure: c.tariff_difference || 0,
      severity_level: c.diagnoses[0]?.severity || 1,
      status: c.status,
      risk_score: c.risk_score,
      risk_level: c.risk_level,
      risk_signals: c.risk_signals,
      clinical_summary: c.medical_evidence.find((e) => e.document_type === "RINGKASAN_MEDIS")?.content || "",
    }));
    for (let i = 0; i < claimRows.length; i += 200) await admin.from("claims").upsert(claimRows.slice(i, i + 200), { onConflict: "claim_id" });

    return NextResponse.json({ success: true, counts: { providers: store.providers.length, claims: claimRows.length } });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Gagal mirror ke Supabase" }, { status: 500 });
  }
}
