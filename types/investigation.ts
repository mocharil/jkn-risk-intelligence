import { CanonicalClaim } from "./claim";
import { RiskFinding, RiskLevel, RiskType } from "./risk";

export type InvestigationStatus = 
  | "NEW" 
  | "UNDER_INVESTIGATION" 
  | "NEED_EVIDENCE" 
  | "CONFIRMED_RISK" 
  | "FALSE_POSITIVE" 
  | "CLOSED";

export interface InvestigationNote {
  note_id: string;
  author: string;
  role: string;
  avatar?: string;
  content: string;
  created_at: string;
  type: "USER_NOTE" | "SYSTEM_AUDIT" | "AI_ASSESSMENT";
}

export interface Investigation {
  investigation_id: string; // e.g. INV-2026-010293
  claim_id: string;
  claim: CanonicalClaim;
  status: InvestigationStatus;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  risk_score: number;
  potential_exposure: number;
  assigned_to: {
    user_id: string;
    name: string;
    avatar: string;
    role: string;
  };
  ai_priority_rationale: string;
  primary_risk_signals: RiskType[];
  notes: InvestigationNote[];
  decision?: {
    verdict: "CONFIRMED_RISK" | "FALSE_POSITIVE" | "NEED_EVIDENCE";
    decided_by: string;
    decided_at: string;
    rationale: string;
    recommended_recovery_amount?: number;
  };
  created_at: string;
  updated_at: string;
}

export interface InvestigationReport {
  report_id: string;
  investigation_id: string;
  claim_id: string;
  title: string;
  executive_summary: string;
  risk_findings_snapshot: RiskFinding[];
  evidence_analysis_summary: string;
  similar_cases_identified: number;
  final_decision: string;
  investigator_name: string;
  created_at: string;
}
