import { CanonicalClaim, Patient, ProviderRef, Diagnosis, Procedure, EvidenceItem, SimilarClaimRef } from "@/types/claim";
import { Provider, Doctor } from "@/types/provider";
import { Investigation } from "@/types/investigation";
import { INDONESIA_PROVINCES } from "./indonesia-provinces";
import { detectUpcoding, detectCloning, detectPhantomBilling, detectAbnormalLOS, calculateCompositeRisk } from "../risk/detectors";

// 20 Indonesian Hospitals & Clinics
export const SYNTHETIC_PROVIDERS: Provider[] = [
  {
    provider_id: "HOSP-01",
    name: "RS Sehat Sentosa",
    type: "RS_KELAS_B",
    province_code: "ID-JK",
    province_name: "DKI Jakarta",
    city: "Jakarta Selatan",
    address: "Jl. Jenderal Sudirman No. 45, Kebayoran Baru",
    phone: "(021) 7289-1000",
    risk_score: 94,
    risk_level: "CRITICAL",
    total_claims: 1248,
    high_risk_claims: 184,
    potential_exposure: 18450000000, // Rp 18,45 M
    dominant_risk_type: "UPCODING",
    risk_composition: {
      upcoding_pct: 48.6,
      phantom_billing_pct: 24.2,
      cloning_pct: 15.8,
      abnormal_los_pct: 11.4,
    },
    peer_comparison: {
      severity_3_rate: { provider: 44.5, peer_median: 18.2 },
      avg_los_days: { provider: 5.6, peer_median: 3.1 },
      avg_claim_amount: { provider: 22400000, peer_median: 14200000 },
      readmission_rate_pct: { provider: 8.4, peer_median: 3.2 },
    },
    doctors: [],
    monthly_risk_trend: [
      { month: "Apr 2026", risk_score: 72, claim_count: 310 },
      { month: "May 2026", risk_score: 78, claim_count: 345 },
      { month: "Jun 2026", risk_score: 85, claim_count: 380 },
      { month: "Jul 2026", risk_score: 91, claim_count: 412 },
      { month: "Aug 2026", risk_score: 94, claim_count: 428 },
    ],
  },
  {
    provider_id: "HOSP-02",
    name: "RS Medika Utama",
    type: "RS_KELAS_B",
    province_code: "ID-JB",
    province_name: "Jawa Barat",
    city: "Kota Bandung",
    address: "Jl. Pasteur No. 120, Sukajadi",
    phone: "(022) 203-4567",
    risk_score: 82,
    risk_level: "HIGH",
    total_claims: 980,
    high_risk_claims: 88,
    potential_exposure: 9240000000,
    dominant_risk_type: "CLONING",
    risk_composition: { upcoding_pct: 32.0, cloning_pct: 44.0, phantom_billing_pct: 14.0, abnormal_los_pct: 10.0 },
    peer_comparison: {
      severity_3_rate: { provider: 28.1, peer_median: 18.2 },
      avg_los_days: { provider: 4.2, peer_median: 3.1 },
      avg_claim_amount: { provider: 16800000, peer_median: 14200000 },
      readmission_rate_pct: { provider: 5.1, peer_median: 3.2 },
    },
    doctors: [],
    monthly_risk_trend: [
      { month: "Apr 2026", risk_score: 65, claim_count: 240 },
      { month: "Mei 2026", risk_score: 70, claim_count: 260 },
      { month: "Jun 2026", risk_score: 75, claim_count: 290 },
      { month: "Jul 2026", risk_score: 80, claim_count: 310 },
      { month: "Agu 2026", risk_score: 82, claim_count: 325 },
    ],
  },
  {
    provider_id: "HOSP-03",
    name: "RS Mitra Kasih Surabaya",
    type: "RS_KELAS_A",
    province_code: "ID-JI",
    province_name: "Jawa Timur",
    city: "Kota Surabaya",
    address: "Jl. Raya Darmo No. 88, Wonokromo",
    phone: "(031) 567-8901",
    risk_score: 76,
    risk_level: "HIGH",
    total_claims: 1420,
    high_risk_claims: 92,
    potential_exposure: 11200000000,
    dominant_risk_type: "PHANTOM_BILLING",
    risk_composition: { upcoding_pct: 22.0, cloning_pct: 18.0, phantom_billing_pct: 48.0, abnormal_los_pct: 12.0 },
    peer_comparison: {
      severity_3_rate: { provider: 24.5, peer_median: 20.1 },
      avg_los_days: { provider: 4.8, peer_median: 3.5 },
      avg_claim_amount: { provider: 19500000, peer_median: 16200000 },
      readmission_rate_pct: { provider: 4.8, peer_median: 3.2 },
    },
    doctors: [],
    monthly_risk_trend: [
      { month: "Apr 2026", risk_score: 60, claim_count: 320 },
      { month: "Mei 2026", risk_score: 66, claim_count: 350 },
      { month: "Jun 2026", risk_score: 71, claim_count: 370 },
      { month: "Jul 2026", risk_score: 74, claim_count: 390 },
      { month: "Agu 2026", risk_score: 76, claim_count: 410 },
    ],
  },
  {
    provider_id: "HOSP-04",
    name: "RS Graha Medika Semarang",
    type: "RS_KELAS_B",
    province_code: "ID-JT",
    province_name: "Jawa Tengah",
    city: "Kota Semarang",
    address: "Jl. Pandanaran No. 56",
    phone: "(024) 841-2345",
    risk_score: 58,
    risk_level: "MEDIUM",
    total_claims: 860,
    high_risk_claims: 32,
    potential_exposure: 3400000000,
    dominant_risk_type: "ABNORMAL_LOS",
    risk_composition: { upcoding_pct: 25.0, cloning_pct: 15.0, phantom_billing_pct: 20.0, abnormal_los_pct: 40.0 },
    peer_comparison: {
      severity_3_rate: { provider: 19.8, peer_median: 18.2 },
      avg_los_days: { provider: 5.1, peer_median: 3.1 },
      avg_claim_amount: { provider: 14900000, peer_median: 14200000 },
      readmission_rate_pct: { provider: 3.8, peer_median: 3.2 },
    },
    doctors: [],
    monthly_risk_trend: [
      { month: "Apr 2026", risk_score: 52, claim_count: 200 },
      { month: "Mei 2026", risk_score: 55, claim_count: 220 },
      { month: "Jun 2026", risk_score: 56, claim_count: 240 },
      { month: "Jul 2026", risk_score: 57, claim_count: 260 },
      { month: "Agu 2026", risk_score: 58, claim_count: 280 },
    ],
  },
  {
    provider_id: "HOSP-05",
    name: "RS Prima Husada Medan",
    type: "RS_KELAS_B",
    province_code: "ID-SU",
    province_name: "Sumatera Utara",
    city: "Kota Medan",
    address: "Jl. S. Parman No. 102",
    phone: "(061) 456-7890",
    risk_score: 88,
    risk_level: "HIGH",
    total_claims: 740,
    high_risk_claims: 72,
    potential_exposure: 7800000000,
    dominant_risk_type: "UPCODING",
    risk_composition: { upcoding_pct: 55.0, cloning_pct: 18.0, phantom_billing_pct: 15.0, abnormal_los_pct: 12.0 },
    peer_comparison: {
      severity_3_rate: { provider: 38.2, peer_median: 18.2 },
      avg_los_days: { provider: 4.9, peer_median: 3.1 },
      avg_claim_amount: { provider: 20100000, peer_median: 14200000 },
      readmission_rate_pct: { provider: 6.2, peer_median: 3.2 },
    },
    doctors: [],
    monthly_risk_trend: [
      { month: "Apr 2026", risk_score: 70, claim_count: 180 },
      { month: "Mei 2026", risk_score: 75, claim_count: 200 },
      { month: "Jun 2026", risk_score: 82, claim_count: 220 },
      { month: "Jul 2026", risk_score: 86, claim_count: 240 },
      { month: "Agu 2026", risk_score: 88, claim_count: 260 },
    ],
  },
  {
    provider_id: "HOSP-06",
    name: "RS Bintang Kasih Makassar",
    type: "RS_KELAS_B",
    province_code: "ID-SN",
    province_name: "Sulawesi Selatan",
    city: "Kota Makassar",
    address: "Jl. Perintis Kemerdekaan KM 11",
    phone: "(0411) 587-1234",
    risk_score: 64,
    risk_level: "MEDIUM",
    total_claims: 620,
    high_risk_claims: 28,
    potential_exposure: 2900000000,
    dominant_risk_type: "PHANTOM_BILLING",
    risk_composition: { upcoding_pct: 20.0, cloning_pct: 15.0, phantom_billing_pct: 45.0, abnormal_los_pct: 20.0 },
    peer_comparison: {
      severity_3_rate: { provider: 21.0, peer_median: 18.2 },
      avg_los_days: { provider: 3.8, peer_median: 3.1 },
      avg_claim_amount: { provider: 15200000, peer_median: 14200000 },
      readmission_rate_pct: { provider: 3.9, peer_median: 3.2 },
    },
    doctors: [],
    monthly_risk_trend: [
      { month: "Apr 2026", risk_score: 55, claim_count: 150 },
      { month: "Mei 2026", risk_score: 58, claim_count: 165 },
      { month: "Jun 2026", risk_score: 60, claim_count: 180 },
      { month: "Jul 2026", risk_score: 62, claim_count: 195 },
      { month: "Agu 2026", risk_score: 64, claim_count: 210 },
    ],
  },
  {
    provider_id: "KLIN-01",
    name: "Klinik Utama Sehat Bersama",
    type: "KLINIK_UTAMA",
    province_code: "ID-JK",
    province_name: "DKI Jakarta",
    city: "Jakarta Timur",
    address: "Jl. Pemuda No. 78, Rawamangun",
    phone: "(021) 478-9012",
    risk_score: 79,
    risk_level: "HIGH",
    total_claims: 510,
    high_risk_claims: 46,
    potential_exposure: 3100000000,
    dominant_risk_type: "CLONING",
    risk_composition: { upcoding_pct: 15.0, cloning_pct: 65.0, phantom_billing_pct: 10.0, abnormal_los_pct: 10.0 },
    peer_comparison: {
      severity_3_rate: { provider: 12.0, peer_median: 8.5 },
      avg_los_days: { provider: 1.2, peer_median: 1.0 },
      avg_claim_amount: { provider: 4800000, peer_median: 3200000 },
      readmission_rate_pct: { provider: 6.8, peer_median: 2.1 },
    },
    doctors: [],
    monthly_risk_trend: [
      { month: "Apr 2026", risk_score: 62, claim_count: 110 },
      { month: "Mei 2026", risk_score: 68, claim_count: 130 },
      { month: "Jun 2026", risk_score: 72, claim_count: 145 },
      { month: "Jul 2026", risk_score: 77, claim_count: 160 },
      { month: "Agu 2026", risk_score: 79, claim_count: 175 },
    ],
  },
  {
    provider_id: "HOSP-07",
    name: "RS Surya Husada Bali",
    type: "RS_KELAS_B",
    province_code: "ID-BA",
    province_name: "Bali",
    city: "Kota Denpasar",
    address: "Jl. Pulau Seram No. 1",
    phone: "(0361) 223-789",
    risk_score: 34,
    risk_level: "LOW",
    total_claims: 680,
    high_risk_claims: 12,
    potential_exposure: 890000000,
    dominant_risk_type: "UPCODING",
    risk_composition: { upcoding_pct: 30.0, cloning_pct: 20.0, phantom_billing_pct: 30.0, abnormal_los_pct: 20.0 },
    peer_comparison: {
      severity_3_rate: { provider: 16.5, peer_median: 18.2 },
      avg_los_days: { provider: 2.9, peer_median: 3.1 },
      avg_claim_amount: { provider: 13400000, peer_median: 14200000 },
      readmission_rate_pct: { provider: 2.8, peer_median: 3.2 },
    },
    doctors: [],
    monthly_risk_trend: [
      { month: "Apr 2026", risk_score: 32, claim_count: 160 },
      { month: "Mei 2026", risk_score: 33, claim_count: 170 },
      { month: "Jun 2026", risk_score: 34, claim_count: 180 },
      { month: "Jul 2026", risk_score: 35, claim_count: 190 },
      { month: "Agu 2026", risk_score: 34, claim_count: 200 },
    ],
  },
];

// Doctors list
export const SYNTHETIC_DOCTORS: Doctor[] = [
  { doctor_id: "DR-01", name: "dr. Hendra Prasetyo, Sp.OT", specialty: "Orthopedic Surgery Specialist", sip_number: "SIP.440/1029/DSP/2023", total_claims_handled: 342, high_risk_claims_count: 68, risk_score: 91, provider_id: "HOSP-01" },
  { doctor_id: "DR-02", name: "dr. Setiawan Santoso, Sp.PD", specialty: "Internal Medicine Specialist", sip_number: "SIP.440/0842/DSP/2022", total_claims_handled: 412, high_risk_claims_count: 42, risk_score: 76, provider_id: "HOSP-01" },
  { doctor_id: "DR-03", name: "dr. Maya Wijaya, Sp.B", specialty: "General Surgery Specialist", sip_number: "SIP.440/1410/DSP/2024", total_claims_handled: 280, high_risk_claims_count: 51, risk_score: 84, provider_id: "HOSP-02" },
  { doctor_id: "DR-04", name: "dr. Aisyah Nurul, Sp.A", specialty: "Pediatric Specialist", sip_number: "SIP.440/0612/DSP/2021", total_claims_handled: 390, high_risk_claims_count: 8, risk_score: 22, provider_id: "HOSP-02" },
  { doctor_id: "DR-05", name: "dr. Budi Santoso, Sp.JP", specialty: "Cardiology & Vascular Specialist", sip_number: "SIP.440/1908/DSP/2023", total_claims_handled: 310, high_risk_claims_count: 48, risk_score: 79, provider_id: "HOSP-03" },
  { doctor_id: "DR-06", name: "dr. Ratna Dewi, Sp.OG", specialty: "Obstetrics & Gynecology Specialist", sip_number: "SIP.440/0945/DSP/2022", total_claims_handled: 350, high_risk_claims_count: 14, risk_score: 35, provider_id: "HOSP-03" },
];

// Associate doctors to providers
SYNTHETIC_PROVIDERS[0].doctors = [SYNTHETIC_DOCTORS[0], SYNTHETIC_DOCTORS[1]];
SYNTHETIC_PROVIDERS[1].doctors = [SYNTHETIC_DOCTORS[2], SYNTHETIC_DOCTORS[3]];
SYNTHETIC_PROVIDERS[2].doctors = [SYNTHETIC_DOCTORS[4], SYNTHETIC_DOCTORS[5]];

/**
 * Generator for synthetic claims
 */
export function generateSyntheticClaims(): { claims: CanonicalClaim[]; investigations: Investigation[] } {
  const claims: CanonicalClaim[] = [];
  const investigations: Investigation[] = [];

  // 1. HERO CLAIM: CLM-10293 (RS Sehat Sentosa - Multi Risk: Upcoding + Phantom + Abnormal LOS)
  const heroClaim: CanonicalClaim = {
    claim_id: "CLM-10293",
    sep_number: "0045R0010826V0010293",
    patient: {
      patient_id: "P-10842",
      name: "Bambang Sudibyo",
      age: 48,
      gender: "L",
      bpjs_card_number: "0001892837461",
      nik: "3174051208750003",
      province_code: "ID-JK",
    },
    provider: {
      provider_id: "HOSP-01",
      name: "RS Sehat Sentosa",
      type: "RS_KELAS_B",
      province_code: "ID-JK",
      city: "Jakarta Selatan",
    },
    service: {
      admission_date: "2026-08-01",
      discharge_date: "2026-08-07",
      submission_date: "2026-08-09",
      length_of_stay: 6,
      treatment_class: "KELAS_1",
      doctor_id: "DR-01",
      doctor_name: "dr. Hendra Prasetyo, Sp.OT",
      doctor_specialty: "Orthopedic Surgery Specialist",
    },
    diagnoses: [
      {
        code: "A09",
        description: "Infectious gastroenteritis and colitis, unspecified",
        is_primary: true,
        severity: 3, // Injected Anomaly: A09 with Severity 3 (expected 1)
      },
      {
        code: "K52.9",
        description: "Non-infective gastroenteritis and colitis, unspecified",
        is_primary: false,
        severity: 2,
      },
    ],
    procedures: [
      {
        code: "44.95",
        description: "Laparoscopic gastric banding / Digestive surgical procedure",
        date: "2026-08-03",
        cost: 12500000,
      },
      {
        code: "99.18",
        description: "Injection or infusion of electrolytes and hydration",
        date: "2026-08-01",
        cost: 950000,
      },
    ],
    claim_amount: 18450000, // Rp 18.45M (Standard benchmark: ~Rp 3.8M)
    approved_tariff: 3800000,
    tariff_difference: 14650000,
    medical_evidence: [
      {
        evidence_id: "DOC-01",
        document_type: "RINGKASAN_MEDIS",
        title: "Inpatient Clinical Discharge Summary",
        date: "2026-08-07",
        excerpt: "Patient admitted with diarrhea 4x watery stool without blood or mucus. Moderate general condition, vital signs stable, mild-moderate dehydration. Received IV hydration RL 20 tpm.",
        content: "Patient admitted with watery bowel movements 4x since morning. Nausea (+), vomiting 1x, low-grade fever 37.6 C. Abdominal physical exam soft, bowel sounds moderately active. No acute peritonitis or distension. Patient improved on day 2 with normal oral intake. No severe comorbidities or complications recorded.",
        status: "CONTRADICTS_CLAIM",
        attached_file_name: "Discharge_Summary_CLM10293.pdf",
      },
      {
        evidence_id: "DOC-02",
        document_type: "CATATAN_TINDAKAN",
        title: "Operating Room Log & Anesthesia Sheet",
        date: "2026-08-03",
        excerpt: "No digestive surgical procedure (44.95) entry found in DPJP physician order sheet or operating room registry log.",
        content: "DPJP order on 03/08/2026: Continue IV fluids, recheck serum electrolytes, soft porridge diet. Patient bed-resting in standard Inpatient Ward Melati 3. No surgical scheduling or surgical consent filed with the central operating theater (IBS).",
        status: "CONTRADICTS_CLAIM",
        attached_file_name: "Physician_Orders_CLM10293.pdf",
      },
      {
        evidence_id: "DOC-03",
        document_type: "HASIL_LABORATORIUM",
        title: "Complete Blood Count & Electrolyte Report",
        date: "2026-08-01",
        excerpt: "Hb: 14.2 g/dL, Leukocytes: 8,900/uL, Platelets: 245,000/uL, Potassium: 3.6 mEq/L, Sodium: 138 mEq/L.",
        content: "Routine hematology parameters and serum electrolyte values are within normal reference range. No clinical evidence of sepsis, severe hypovolemic shock, or acute metabolic acidosis.",
        status: "SUPPORTS_CLAIM",
        attached_file_name: "Hematology_Report_010826.pdf",
      },
      {
        evidence_id: "DOC-04",
        document_type: "RESUME_PULANG",
        title: "Discharge Certificate & DPJP Patient Instructions",
        date: "2026-08-07",
        excerpt: "Patient declared clinically stable on day 2, but discharge was delayed until day 6.",
        content: "Discharge status: Symptom-free, normal vital signs. Discharge medication: Oral rehydration salts, Zinc 20mg 1x1, Probiotics 1x1.",
        status: "NEEDS_REVIEW",
        attached_file_name: "Discharge_Instructions_070826.pdf",
      },
    ],
    similar_claims: [
      {
        claim_id: "CLM-09283",
        provider_id: "HOSP-01",
        provider_name: "RS Sehat Sentosa",
        similarity_score: 0.96,
        claim_amount: 17900000,
        diagnosis_code: "A09",
        similarity_reasons: [
          "Clinical summary text structure is 96.4% identical to patient P-08912",
          "Invoiced digestive surgery billing code on non-surgical gastroenteritis diagnosis",
          "Attending physician (DPJP) is identical (dr. Hendra Prasetyo)",
        ],
        risk_score: 92,
      },
      {
        claim_id: "CLM-08741",
        provider_id: "HOSP-01",
        provider_name: "RS Sehat Sentosa",
        similarity_score: 0.91,
        claim_amount: 18200000,
        diagnosis_code: "A09",
        similarity_reasons: ["Abnormal length of stay pattern (6 days) for mild gastroenteritis"],
        risk_score: 88,
      },
    ],
    risk_score: 94,
    risk_level: "CRITICAL",
    risk_signals: ["UPCODING", "PHANTOM_BILLING", "ABNORMAL_LOS", "CLONING"],
    risk_findings: [],
    status: "FLAGGED",
    investigation_id: "INV-2026-010293",
    created_at: "2026-08-09T08:30:00Z",
    updated_at: "2026-08-23T08:30:00Z",
  };

  // Run detectors on Hero Claim
  const heroFindings = [
    detectUpcoding(heroClaim),
    detectPhantomBilling(heroClaim),
    detectAbnormalLOS(heroClaim),
    detectCloning(heroClaim),
  ].filter(Boolean) as any[];

  heroClaim.risk_findings = heroFindings;
  const heroComposite = calculateCompositeRisk(heroFindings);
  heroClaim.risk_score = heroComposite.score;
  heroClaim.risk_level = heroComposite.level;
  heroClaim.risk_signals = heroComposite.signals;

  claims.push(heroClaim);

  // Create Hero Investigation
  investigations.push({
    investigation_id: "INV-2026-010293",
    claim_id: "CLM-10293",
    claim: heroClaim,
    status: "UNDER_INVESTIGATION",
    priority: "CRITICAL",
    risk_score: heroClaim.risk_score,
    potential_exposure: heroClaim.claim_amount - (heroClaim.approved_tariff || 0),
    assigned_to: {
      user_id: "USR-001",
      name: "Aril Indra Permana",
      avatar: "AI",
      role: "Senior Fraud Investigator",
    },
    ai_priority_rationale:
      "Detected combination of 4 major anomalies: Severity Level 3 inflation for Diarrhea A09, surgical claim 44.95 lacking operating room records, 6-day abnormal length of stay, and 96.4% clinical text similarity with claim CLM-09283.",
    primary_risk_signals: heroClaim.risk_signals,
    notes: [
      {
        note_id: "NOT-001",
        author: "AI Risk Intelligence",
        role: "AI Co-Investigator",
        content:
          "System detected significant discrepancy on claim CLM-10293. Based on electronic medical records, patient only received supportive IV/oral hydration therapy. No anesthesia record or operating room log exists for the digestive surgical procedure invoiced at Rp 12,500,000.",
        created_at: "2026-08-09T08:35:00Z",
        type: "AI_ASSESSMENT",
      },
      {
        note_id: "NOT-002",
        author: "Aril Indra Permana",
        role: "Senior Investigator",
        content: "Issued formal audit inquiry for original paper records and operating room logs to RS Sehat Sentosa medical committee.",
        created_at: "2026-08-11T14:20:00Z",
        type: "USER_NOTE",
      },
    ],
    created_at: "2026-08-09T08:30:00Z",
    updated_at: "2026-08-23T08:30:00Z",
  });

  // 2. Generate remaining curated claims across Indonesia
  const diagnosisPool = [
    { code: "A09", desc: "Infectious gastroenteritis and colitis, unspecified", base_tariff: 3800000 },
    { code: "K35.8", desc: "Other and unspecified acute appendicitis", base_tariff: 12500000 },
    { code: "J18.9", desc: "Pneumonia, unspecified", base_tariff: 8900000 },
    { code: "I10", desc: "Essential (primary) hypertension", base_tariff: 2400000 },
    { code: "E11.9", desc: "Type 2 diabetes mellitus without complications", base_tariff: 6700000 },
    { code: "O80.0", desc: "Spontaneous vertex delivery", base_tariff: 4500000 },
    { code: "M54.5", desc: "Low back pain", base_tariff: 3100000 },
  ];

  const firstNames = ["Ahmad", "Siti", "Budi", "Dewi", "Eko", "Nur", "Hadi", "Sri", "Agus", "Rini", "Tri", "Wati", "Joko", "Lestari", "Dian"];
  const lastNames = ["Kusuma", "Pratama", "Hidayat", "Saputra", "Wibowo", "Santoso", "Lestari", "Utami", "Nugroho", "Firmansyah", "Pramudya"];

  for (let i = 2; i <= 60; i++) {
    const claimNum = 10293 + i;
    const claimId = `CLM-${claimNum}`;
    const prov = SYNTHETIC_PROVIDERS[(i - 2) % SYNTHETIC_PROVIDERS.length];
    const diag = diagnosisPool[i % diagnosisPool.length];
    const isAnomaly = i <= 24; // First 24 are high/critical risks
    const severity = isAnomaly && i % 3 === 0 ? 3 : isAnomaly ? 2 : 1;
    const los = isAnomaly && i % 4 === 0 ? 7 : isAnomaly ? 5 : 2;
    const tariffMultiplier = isAnomaly ? (i % 2 === 0 ? 2.4 : 1.9) : 1.0;
    const amount = Math.round(diag.base_tariff * tariffMultiplier);
    
    const pName = `${firstNames[i % firstNames.length]} ${lastNames[(i * 3) % lastNames.length]}`;
    const doc = prov.doctors[0] || SYNTHETIC_DOCTORS[0];

    const currentClaim: CanonicalClaim = {
      claim_id: claimId,
      sep_number: `0045R0010826V00${claimNum}`,
      patient: {
        patient_id: `P-${10000 + i}`,
        name: pName,
        age: 25 + (i * 3) % 50,
        gender: i % 2 === 0 ? "L" : "P",
        bpjs_card_number: `00018928${1000 + i}`,
        province_code: prov.province_code,
      },
      provider: {
        provider_id: prov.provider_id,
        name: prov.name,
        type: prov.type,
        province_code: prov.province_code,
        city: prov.city,
      },
      service: {
        admission_date: `2026-08-${String(1 + (i % 20)).padStart(2, "0")}`,
        discharge_date: `2026-08-${String(1 + (i % 20) + los).padStart(2, "0")}`,
        submission_date: `2026-08-${String(3 + (i % 20) + los).padStart(2, "0")}`,
        length_of_stay: los,
        treatment_class: "KELAS_1",
        doctor_id: doc.doctor_id,
        doctor_name: doc.name,
        doctor_specialty: doc.specialty,
      },
      diagnoses: [
        {
          code: diag.code,
          description: diag.desc,
          is_primary: true,
          severity: severity as 1 | 2 | 3,
        },
      ],
      procedures: isAnomaly && i % 2 === 0 ? [
        { code: "44.95", description: "Specialized laparoscopic digestive procedure", date: `2026-08-${String(2 + (i % 20)).padStart(2, "0")}` }
      ] : [
        { code: "99.18", description: "Electrolyte infusion and rehydration therapy", date: `2026-08-${String(1 + (i % 20)).padStart(2, "0")}` }
      ],
      claim_amount: amount,
      approved_tariff: diag.base_tariff,
      tariff_difference: Math.max(0, amount - diag.base_tariff),
      medical_evidence: [
        {
          evidence_id: `DOC-${claimNum}-01`,
          document_type: "RINGKASAN_MEDIS",
          title: `Inpatient Medical Summary - ${claimId}`,
          date: `2026-08-${String(1 + (i % 20)).padStart(2, "0")}`,
          excerpt: `Clinical record for patient ${pName} with primary complaint of ${diag.desc.toLowerCase()}. General condition stable.`,
          content: `Patient ${pName} was admitted with primary diagnosis of ${diag.desc}. Physical exam showed stable hemodynamics. Therapy administered consisted of supportive medication.`,
          status: isAnomaly ? "CONTRADICTS_CLAIM" : "SUPPORTS_CLAIM",
        }
      ],
      similar_claims: isAnomaly && i % 3 === 0 ? [
        {
          claim_id: "CLM-10293",
          provider_id: "HOSP-01",
          provider_name: "RS Sehat Sentosa",
          similarity_score: 0.89,
          claim_amount: 18450000,
          diagnosis_code: "A09",
          similarity_reasons: ["Referral form narrative layout structure is identical"],
          risk_score: 88,
        }
      ] : [],
      risk_score: 15,
      risk_level: "LOW",
      risk_signals: [],
      risk_findings: [],
      status: isAnomaly ? "FLAGGED" : "RESOLVED_VALID",
      created_at: `2026-08-${String(2 + (i % 20)).padStart(2, "0")}T08:00:00Z`,
      updated_at: `2026-08-23T08:00:00Z`,
    };

    // Calculate findings
    const findings = [
      detectUpcoding(currentClaim),
      detectCloning(currentClaim),
      detectPhantomBilling(currentClaim),
      detectAbnormalLOS(currentClaim),
    ].filter(Boolean) as any[];

    currentClaim.risk_findings = findings;
    const comp = calculateCompositeRisk(findings);
    currentClaim.risk_score = comp.score;
    currentClaim.risk_level = comp.level;
    currentClaim.risk_signals = comp.signals;

    claims.push(currentClaim);

    // Create investigation for high/critical claims
    if (currentClaim.risk_level === "CRITICAL" || currentClaim.risk_level === "HIGH") {
      const invId = `INV-2026-${String(claimNum).padStart(6, "0")}`;
      currentClaim.investigation_id = invId;
      investigations.push({
        investigation_id: invId,
        claim_id: currentClaim.claim_id,
        claim: currentClaim,
        status: i % 4 === 0 ? "NEW" : i % 4 === 1 ? "UNDER_INVESTIGATION" : i % 4 === 2 ? "NEED_EVIDENCE" : "CONFIRMED_RISK",
        priority: currentClaim.risk_level,
        risk_score: currentClaim.risk_score,
        potential_exposure: currentClaim.claim_amount - (currentClaim.approved_tariff || 0),
        assigned_to: {
          user_id: "USR-001",
          name: "Aril Indra Permana",
          avatar: "AI",
          role: "Senior Fraud Investigator",
        },
        ai_priority_rationale: `Strong indication of ${currentClaim.risk_signals.join(" & ")} with tariff exposure of Rp ${(currentClaim.tariff_difference || 0).toLocaleString("id-ID")}.`,
        primary_risk_signals: currentClaim.risk_signals,
        notes: [
          {
            note_id: `NOT-${claimNum}-1`,
            author: "AI Intelligence System",
            role: "AI Risk Engine",
            content: `Case automatically triaged to high priority queue due to risk score reaching ${currentClaim.risk_score} (${currentClaim.risk_level}).`,
            created_at: currentClaim.created_at,
            type: "AI_ASSESSMENT",
          },
        ],
        created_at: currentClaim.created_at,
        updated_at: currentClaim.updated_at,
      });
    }
  }

  return { claims, investigations };
}
