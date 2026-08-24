import { RiskFinding, RiskLevel, RiskType } from "./risk";

export interface Patient {
  patient_id: string;
  name: string;
  age: number;
  gender: "L" | "P";
  bpjs_card_number: string;
  nik?: string;
  province_code: string;
}

export interface ProviderRef {
  provider_id: string;
  name: string;
  type: "RS_KELAS_A" | "RS_KELAS_B" | "RS_KELAS_C" | "RS_KELAS_D" | "KLINIK_UTAMA" | "PUSKESMAS";
  province_code: string;
  city: string;
}

export interface Diagnosis {
  code: string;
  description: string;
  is_primary: boolean;
  severity: 1 | 2 | 3;
}

export interface Procedure {
  code: string;
  description: string;
  date: string;
  cost?: number;
}

export type EvidenceStatus = "SUPPORTS_CLAIM" | "CONTRADICTS_CLAIM" | "NEEDS_REVIEW" | "MISSING";

export interface EvidenceItem {
  evidence_id: string;
  document_type: 
    | "RINGKASAN_MEDIS" 
    | "CATATAN_TINDAKAN" 
    | "HASIL_LABORATORIUM" 
    | "CATATAN_KONSULTASI" 
    | "RESUME_PULANG" 
    | "SURAT_RUJUKAN" 
    | "BUKTI_BILLING";
  title: string;
  date: string;
  excerpt: string;
  content: string;
  status: EvidenceStatus;
  attached_file_name?: string;
}

export interface ServiceDetail {
  admission_date: string;
  discharge_date: string;
  submission_date: string;
  length_of_stay: number;
  treatment_class: "KELAS_1" | "KELAS_2" | "KELAS_3" | "VIP" | "ICU" | "RAWAT_JALAN";
  doctor_id: string;
  doctor_name: string;
  doctor_specialty: string;
}

export interface SimilarClaimRef {
  claim_id: string;
  provider_id: string;
  provider_name: string;
  similarity_score: number; // 0 - 1.0 (e.g. 0.96 = 96%)
  claim_amount: number;
  diagnosis_code: string;
  similarity_reasons: string[];
  risk_score: number;
}

export type ClaimStatus = "FLAGGED" | "PENDING_REVIEW" | "IN_INVESTIGATION" | "RESOLVED_VALID" | "CONFIRMED_RISK" | "FALSE_POSITIVE";

export interface CanonicalClaim {
  claim_id: string;
  sep_number: string;
  patient: Patient;
  provider: ProviderRef;
  service: ServiceDetail;
  diagnoses: Diagnosis[];
  procedures: Procedure[];
  claim_amount: number; // in IDR
  approved_tariff?: number;
  tariff_difference?: number;
  medical_evidence: EvidenceItem[];
  risk_score: number; // 0 - 100
  risk_level: RiskLevel;
  risk_signals: RiskType[];
  risk_findings: RiskFinding[];
  similar_claims: SimilarClaimRef[];
  status: ClaimStatus;
  investigation_id?: string;
  created_at: string;
  updated_at: string;
}
