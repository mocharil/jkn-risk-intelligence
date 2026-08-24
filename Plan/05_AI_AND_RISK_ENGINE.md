# AI and Risk Engine

## Philosophy

Do not use Gemini for work that SQL, deterministic rules, or vector similarity can perform more reliably and cheaply.

```text
Claim
  ├── Rules (deterministic)
  ├── SQL analytics (aggregations, peer comparison)
  ├── Similarity search (pgvector)
  └── Evidence retrieval
          ↓
       Gemini (only for suspicious cases)
          ↓
Reasoning + Explanation + Recommended Review
```

## Risk types

### Upcoding detector

Inputs:
- diagnosis (code, description, severity)
- claimed severity level
- procedures
- LOS
- medical evidence (clinical summary, supporting documents)
- peer/context signals (average severity for same diagnosis, provider history)

Outputs:
- risk score (0-100)
- inconsistency signals (severity mismatch, billing anomaly)
- supporting evidence
- missing evidence
- peer comparison data

Detection logic:
1. Compare claimed severity with expected severity for diagnosis code (rule-based lookup table)
2. Compare claim amount with peer median for same diagnosis+severity
3. Check if procedures match diagnosis expectations
4. Flag if severity >= 3 and no supporting procedure evidence
5. Score based on deviation magnitude and number of signals

### Cloning detector

1. Build narrative embedding from medical summary using Gemini embedding API
2. Retrieve top-K similar claims using pgvector (cosine similarity, K=10)
3. Apply deterministic similarity threshold (>= 0.92 = suspicious)
4. Send only suspicious pairs to Gemini for contextual comparison
5. Consider: same provider? different patients? same time period? identical procedures?

Detection logic:
- Similarity >= 0.95: CRITICAL (near-identical narrative)
- Similarity >= 0.92: HIGH (suspicious similarity)
- Similarity >= 0.85: MEDIUM (worth reviewing)
- Similarity < 0.85: LOW (normal variation)

### Phantom Billing detector

Compare billed procedures against:
- medical record content
- procedure notes
- relevant evidence metadata
- clinical summary mentions

Detection logic:
1. Extract billed procedure codes from claim
2. Search medical documents for procedure-related keywords/codes
3. Flag procedures with no supporting evidence
4. Flag procedures inconsistent with primary diagnosis
5. Score based on number of unsupported procedures and total billed amount

A missing document is not proof of fraud. Return insufficient evidence where appropriate.

### Abnormal LOS detector

Compare actual length of stay against expected range for diagnosis and severity.

Inputs:
- primary diagnosis code
- severity level
- actual LOS
- procedures performed
- patient age and comorbidities (if available)

Detection logic:
1. Calculate peer median LOS for same diagnosis+severity combination
2. Calculate standard deviation from peer group
3. Flag if actual LOS > median + 2σ (significantly above peers)
4. Consider if extended LOS is justified by procedures or complications
5. Score based on deviation magnitude

```text
Deviation   | Verdict
> 3σ        | CRITICAL
2σ - 3σ     | HIGH
1.5σ - 2σ   | MEDIUM
< 1.5σ      | LOW
```

## Composite risk scoring

When multiple detectors flag the same claim:

```text
composite_score = max(individual_scores) + bonus

bonus rules:
- 2 indicators flagged: +5
- 3 indicators flagged: +10
- 4 indicators flagged: +15
- Cap at 100
```

Verdict thresholds:
- >= 90: CRITICAL
- >= 75: HIGH
- >= 50: MEDIUM
- < 50: LOW

## Gemini output contract

```json
{
  "risk_type": "UPCODING",
  "risk_score": 82,
  "confidence": 0.88,
  "verdict": "HIGH",
  "summary": "Severity level yang diklaim tidak konsisten dengan evidence klinis yang tersedia. Diagnosis primer (A09) biasanya ditangani sebagai kasus ringan, namun klaim menggunakan severity level 3 dengan prosedur tambahan yang tidak didukung rekam medis.",
  "evidence": [
    {
      "evidence_id": "DOC-01",
      "document_type": "MEDICAL_SUMMARY",
      "claim": "Ringkasan medis menunjukkan kondisi ringan tanpa komplikasi.",
      "supports_finding": true
    },
    {
      "evidence_id": "DOC-02",
      "document_type": "PROCEDURE_RECORD",
      "claim": "Prosedur 44960 tidak ditemukan dalam catatan tindakan.",
      "supports_finding": true
    }
  ],
  "missing_evidence": [
    "Catatan laboratorium untuk konfirmasi severity",
    "Catatan konsultasi spesialis"
  ],
  "recommended_actions": [
    "Verifikasi severity level dengan dokter penanggung jawab",
    "Minta rekam medis lengkap dari provider",
    "Bandingkan dengan klaim serupa dari provider yang sama"
  ],
  "limitations": [
    "Analisis berdasarkan ringkasan medis, bukan rekam medis lengkap"
  ]
}
```

## Streaming response strategy

### AI Copilot (interactive)
- Use Server-Sent Events (SSE) for token-by-token streaming
- First token target: < 2 seconds
- Stream structured JSON progressively using Gemini's streaming API
- Client renders partial responses as they arrive

### Investigation AI synthesis (batch)
- Non-streaming: wait for complete response
- Show progress indicator: "Gemini sedang menganalisis evidence..."
- Timeout: 15 seconds, then show partial results or retry

### Implementation pattern
```text
Client → POST /api/copilot (with Accept: text/event-stream)
Server → Construct evidence bundle
Server → Call Gemini with streaming enabled
Server → Stream SSE events to client
Client → Parse and render incrementally
Server → Final event with complete validated response
```

## Fallback hierarchy

When Gemini is unavailable or fails:

```text
Level 0: Full AI (Gemini available)
  → Show AI synthesis + deterministic signals + evidence

Level 1: Deterministic only (Gemini fails)
  → Show deterministic risk signals + raw evidence
  → Hide AI synthesis panel
  → Show: "Analisis AI tidak tersedia. Menampilkan sinyal risiko deterministik."

Level 2: Cached AI (Gemini fails, previous run exists)
  → Show cached AI synthesis with timestamp
  → Show: "Analisis AI dari [timestamp]. Data mungkin tidak terkini."

Level 3: No analysis (everything fails)
  → Show claim data and evidence documents only
  → Show: "Analisis risiko belum tersedia."
```

## Guardrails

- JSON-schema validation on every Gemini response (Zod)
- Evidence IDs for every material claim in AI output
- No invented policy or medical facts
- `INSUFFICIENT_EVIDENCE` is a valid and expected outcome
- Store model name, prompt version, and evidence version with every AI run
- Retry malformed structured output once with repair prompt
- Never call AI for every row by default (batch only for flagged claims)
- Rate limit AI calls per user (max 20 Copilot queries per hour)
- Prompt injection defense: sanitize user input before including in Gemini prompts

## Prompt template versioning

```text
prompts/
  v1/
    upcoding_analysis.txt
    cloning_comparison.txt
    phantom_billing_check.txt
    abnormal_los_analysis.txt
    copilot_investigation.txt
    copilot_provider.txt
    schema_mapping_suggestion.txt
    executive_briefing.txt
```

Each prompt template includes:
- Version number
- System instruction
- Input schema description
- Output schema description
- Few-shot examples
- Guardrail instructions

Prompt version is stored in ai_runs table for reproducibility.

## Cost control

- Rules first, Gemini only for suspicious cases or explicit user requests
- Retrieve relevant evidence chunks only (max 5 documents per analysis)
- Cache stable summaries in ai_runs table
- Cap similar-claim retrieval (max 10 neighbors)
- Use Gemini Flash for simple tasks (schema mapping, copilot)
- Use Gemini Pro only for complex reasoning (investigation synthesis)
- Track token usage per AI run for cost monitoring
- Daily token budget alert (configurable in settings)

## Evaluation

### Deterministic detectors
- Precision, recall, F1 per risk type
- False-positive rate
- Confusion matrix
- Target: F1 >= 0.7 for each detector

### Gemini AI quality
- Groundedness: % of AI claims that reference provided evidence
- Evidence correctness: % of evidence citations that are accurate
- Usefulness: subjective quality assessment on sample cases
- Unsupported-claim rate: % of AI statements without evidence backing
- Hallucination detection: compare AI output against known synthetic ground truth
