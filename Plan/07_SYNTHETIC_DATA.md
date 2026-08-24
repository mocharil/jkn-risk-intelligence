# Synthetic Data Specification

## Initial target

Generate 1,000 deterministic synthetic claims using seeded randomness.

| Class | Share | Count |
|---|---:|---:|
| Normal | 78% | 780 |
| Upcoding | 7% | 70 |
| Cloning | 5% | 50 |
| Phantom Billing | 4% | 40 |
| Abnormal LOS | 3% | 30 |
| Multiple Risk | 3% | 30 |

## Providers

Generate 20 synthetic providers:

| Provider ID | Name | Type | Province | Risk Profile |
|---|---|---|---|---|
| HOSP-01 | RS Sehat Sentosa | RS | DKI Jakarta | HIGH (hero provider) |
| HOSP-02 | RS Medika Utama | RS | Jawa Barat | MEDIUM |
| HOSP-03 | RS Mitra Kasih | RS | Jawa Timur | HIGH |
| KLIN-01 | Klinik Sehat Bersama | Klinik | DKI Jakarta | MEDIUM |
| KLIN-02 | Klinik Utama Kasih | Klinik | Sumatera Utara | HIGH |
| ... | (15 more providers spread across 10 provinces) | ... | ... | ... |

## Doctors

Generate 40 synthetic doctors with Indonesian names:
- Dr. Hendra (Orthopedics) — high risk
- Dr. Setiawan (Internal Medicine) — medium risk
- Dr. Wijaya (Surgery) — normal
- Dr. Aisyah (Pediatrics) — normal
- (36 more with realistic specialties)

## Patients

Generate 500 synthetic patients:
- Indonesian anonymized IDs (P-001 through P-500)
- Age distribution: 0-17 (15%), 18-40 (30%), 41-60 (35%), 61+ (20%)
- Gender distribution: 50/50

## Injection examples

### Upcoding
Clinical evidence indicates mild disease while the synthetic claim uses higher severity and cost. Severity level 3 for diagnosis that typically requires severity level 1. Claim amount 2-4x peer median.

### Cloning
Reuse a narrative across different synthetic patients with small controlled mutations (name changes, minor word substitutions). Same provider, different patients, within 30-day window.

### Phantom Billing
Add a billed procedure that is absent from the generated supporting evidence. Example: ICU charges without ICU admission notes, specialist consultation without consultation record.

### Abnormal LOS
Set LOS to 2-4x the peer median for the same diagnosis and severity. Example: simple appendicitis with 12-day stay vs peer median of 3 days.

### Multiple Risk
Combine 2-3 risk types in one claim. Example: upcoding + phantom billing + abnormal LOS.

## Clinical narratives

Generate realistic Indonesian clinical summaries using templates:

```text
"Pasien [gender], [age] tahun, masuk dengan keluhan [complaint].
Diagnosis primer: [diagnosis].
Tindakan yang dilakukan: [procedures].
Lama rawat: [LOS] hari.
Kondisi saat pulang: [discharge_status]."
```

## Evidence documents

For each claim, generate 2-5 supporting documents:
- Medical Summary (always present)
- Diagnosis Record (always present)
- Procedure Record (if procedures billed)
- Laboratory Result (50% of claims)
- Medication Record (60% of claims)

For phantom billing injections, deliberately omit the evidence document for the phantom procedure.

## Ground truth

Maintain a separate label dataset:

```text
claim_id
risk_type          (NORMAL, UPCODING, CLONING, PHANTOM_BILLING, ABNORMAL_LOS, MULTIPLE)
is_injected        (true/false)
injected_risks     (array of risk types for MULTIPLE)
injection_version  (v1)
expected_score     (approximate expected risk score range)
```

Do not expose the ground-truth label to Gemini during detection.

## Province distribution

Distribute claims across provinces to enable meaningful Indonesia map visualization:

| Province | Claim % | Risk Concentration |
|---|---:|---|
| DKI Jakarta | 25% | High (most hotspots) |
| Jawa Barat | 20% | Medium-High |
| Jawa Timur | 15% | Medium |
| Jawa Tengah | 10% | Low-Medium |
| Sumatera Utara | 8% | High |
| Sulawesi Selatan | 5% | Medium |
| Bali | 4% | Low |
| Other provinces | 13% | Low |

## Evaluation

For deterministic detectors:
- precision
- recall
- F1
- false-positive rate
- confusion matrix
- target: F1 >= 0.7 per detector

For Gemini:
- groundedness (% of claims with evidence references)
- evidence correctness (% of references that are accurate)
- usefulness (qualitative assessment)
- unsupported-claim rate
- hallucination rate (claims contradicted by ground truth)
