import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/data/store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, claim_id, provider_id } = body;
    const store = getStore();

    const normalizedQuery = (question || "").toLowerCase();
    
    // Check if query is specific to claim CLM-10293 or general
    if (claim_id === "CLM-10293" || normalizedQuery.includes("10293") || normalizedQuery.includes("diarrhea") || normalizedQuery.includes("diare") || normalizedQuery.includes("why is this claim") || normalizedQuery.includes("critical")) {
      const heroClaim = store.claims.find((c) => c.claim_id === "CLM-10293");
      
      return NextResponse.json({
        answer: `Based on forensic examination of digital medical evidence and INA-CBG tariff schedule audits, claim **CLM-10293** (Patient: Bambang Sudibyo, Provider: RS Sehat Sentosa) contains **3 critical anomaly patterns**:

1. **Severity Level Upcoding**: Primary diagnosis *Acute Gastroenteritis (A09)* was billed at **Severity Level 3** (Rp 18,450,000), despite laboratory findings and clinical notes confirming mild-to-moderate dehydration (expected standard: Severity Level 1, median Rp 3,800,000). Confirmed unwarranted variance: **+Rp 14,650,000**.
2. **Phantom Procedure Billing**: Invoiced digestive surgical procedure *Laparoscopic digestive procedure (44.95)* totaling Rp 12,500,000, yet **no formal operative report, anesthesia chart, or operating room log exists**.
3. **Abnormal Length of Stay (LOS)**: Patient retained for **6 inpatient days**, exceeding peer median benchmark (2.2 days) with zero clinical deterioration documented in CPPT.
4. **Clinical Narrative Duplication**: Inpatient discharge summary shares a **96.4% semantic overlap** with reference claim CLM-09283.`,
        confidence: 0.96,
        evidence_citations: [
          {
            evidence_id: "DOC-01",
            title: "Inpatient Medical Discharge Summary (DOC-01)",
            excerpt: "Patient demonstrated marked clinical recovery on Day 2 with oral hydration therapy. No severe underlying comorbidity.",
            status: "CONTRADICTS_CLAIM",
          },
          {
            evidence_id: "DOC-02",
            title: "Integrated Physician Daily Notes (CPPT) (DOC-02)",
            excerpt: "No consultation, transfer request, or procedural log issued to central surgical suite (IBS).",
            status: "CONTRADICTS_CLAIM",
          },
          {
            evidence_id: "DOC-03",
            title: "Hematology & Chemistry Panel (DOC-03)",
            excerpt: "Hb 14.2 g/dL, WBC 8,900/uL (Normal). Electrolytes balanced. No systemic infection.",
            status: "SUPPORTS_CLAIM",
          }
        ],
        entity_links: [
          { type: "CLAIM", id: "CLM-10293", label: "Inspect Claim Dossier CLM-10293", risk_score: 94 },
          { type: "PROVIDER", id: "HOSP-01", label: "RS Sehat Sentosa 360° Profile", risk_score: 94 },
          { type: "SIMILAR_CLAIM", id: "CLM-09283", label: "Duplicate Claim CLM-09283 (96.4% Match)", risk_score: 92 },
        ],
        suggested_followups: [
          "Compare this claim tariff against 10 nearby South Jakarta facilities",
          "Show claim submission history for attending doctor dr. Hendra Prasetyo",
          "Draft formal audit disallowance notice for hospital medical committee",
        ],
        recommended_action: "CONFIRMED_RISK",
      });
    }

    if (normalizedQuery.includes("provider") || normalizedQuery.includes("hospital") || normalizedQuery.includes("rumah sakit") || normalizedQuery.includes("faskes") || provider_id === "HOSP-01" || normalizedQuery.includes("sehat sentosa")) {
      return NextResponse.json({
        answer: `Provider intelligence breakdown for **RS Sehat Sentosa (HOSP-01)**:
- **Composite Risk Score**: 94/100 (CRITICAL)
- **High-Risk Ingested Claims**: 184 out of 1,248 claims (14.7% vs peer median benchmark 3.5%)
- **Potential Exposure**: Rp 18.45 Billion
- **Dominant Anomaly Types**: Upcoding (48.6%) and Phantom Billing (24.2%)
- **Attending DPJP Findings**: dr. Hendra Prasetyo, Sp.OT accounts for 68 of 184 high-risk claims with a 38% surgical billing rate lacking matching operating room logs.`,
        confidence: 0.94,
        evidence_citations: [
          {
            evidence_id: "AGG-HOSP-01",
            title: "RS Sehat Sentosa Aggregate Claims Audit Dossier 2026",
            excerpt: "Severity Level 3 ratio reached 44.5% versus Class B regional median in Jakarta (18.2%).",
            status: "CONTRADICTS_CLAIM",
          }
        ],
        entity_links: [
          { type: "PROVIDER", id: "HOSP-01", label: "Open RS Sehat Sentosa Dossier", risk_score: 94 },
          { type: "DOCTOR", id: "DR-01", label: "dr. Hendra Prasetyo, Sp.OT Profile", risk_score: 91 },
        ],
        suggested_followups: [
          "List priority high-risk claims from RS Sehat Sentosa",
          "Compare average inpatient stay with RS Medika Utama",
        ],
        recommended_action: "INVESTIGATE_PROVIDER",
      });
    }

    if (normalizedQuery.includes("map") || normalizedQuery.includes("peta") || normalizedQuery.includes("province") || normalizedQuery.includes("provinsi") || normalizedQuery.includes("national") || normalizedQuery.includes("nasional")) {
      return NextResponse.json({
        answer: `National Claims Risk Telemetry Summary:
1. **DKI Jakarta (ID-JK)**: Primary critical hotspot with 184 high-risk claims (Rp 18.45 Billion exposure). Dominant anomaly: Upcoding.
2. **East Java (ID-JI)**: 92 high-risk claims (Rp 11.2 Billion). Dominant anomaly: Phantom Billing.
3. **West Java (ID-JB)**: 88 high-risk claims (Rp 9.24 Billion). Dominant anomaly: Clinical summary narrative cloning.
4. **North Sumatra (ID-SU)**: 72 high-risk claims (Rp 7.8 Billion). Dominant anomaly: Orthopedic upcoding.`,
        confidence: 0.92,
        evidence_citations: [],
        entity_links: [
          { type: "MAP", id: "ID-JK", label: "View DKI Jakarta Risk Map", risk_score: 94 },
          { type: "MAP", id: "ID-JI", label: "View East Java Risk Map", risk_score: 76 },
        ],
        suggested_followups: [
          "Display top 5 facilities with spike anomalies in East Java",
          "Analyze 7-day multi-detector risk velocity",
        ],
      });
    }

    // Default intelligent response
    return NextResponse.json({
      answer: `JKN Risk Intelligence analysis outcome for query "${question}":

The system scanned 1,284,392 national claims and identified connections across **4 active risk patterns**:
- Identified 47,281 claims with active anomaly signals (total exposure Rp 824.6 Billion).
- 128 Healthcare Facilities currently under priority investigative oversight.
- Most prevalent current pattern: Unjustified Severity Level inflation on diagnostic codes A09, K35.8, and J18.9.

You can delve into specific cases via the *Investigation Queue* or examine hero claim *CLM-10293*.`,
      confidence: 0.89,
      evidence_citations: [],
      entity_links: [
        { type: "QUEUE", id: "QUEUE", label: "Open Investigation Queue (47 Cases)", risk_score: 90 },
        { type: "CLAIM", id: "CLM-10293", label: "Inspect Hero Case CLM-10293", risk_score: 94 },
      ],
      suggested_followups: [
        "Why is claim CLM-10293 categorized as CRITICAL?",
        "Show risk profile for RS Sehat Sentosa",
        "How is anomaly risk distributed across West Java?",
      ],
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process AI Copilot analysis." },
      { status: 500 }
    );
  }
}
