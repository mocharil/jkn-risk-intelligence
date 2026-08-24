# API Contract

## Conventions

- Base path: `/api`
- Content type: `application/json` (except streaming endpoints)
- Authentication: Supabase Auth JWT in `Authorization: Bearer <token>` header
- Pagination: cursor-based with `cursor` and `limit` parameters (default limit: 20, max: 100)
- Sorting: `sort_by` and `sort_order` (asc/desc) parameters
- Dates: ISO 8601 format
- Currency: integer (Rupiah, no decimals)
- IDs: prefixed strings (CLM-, INV-, HOSP-, P-, DOC-)

## Pagination envelope

```json
{
  "data": [],
  "pagination": {
    "cursor": "next_cursor_value",
    "has_more": true,
    "total_count": 1284
  }
}
```

## Error envelope

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Readable message in Bahasa Indonesia",
    "details": {},
    "request_id": "req_xxx"
  }
}
```

Error codes: `VALIDATION_ERROR`, `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `RATE_LIMITED`, `AI_UNAVAILABLE`, `INTERNAL_ERROR`.

---

## Dashboard

### `GET /api/dashboard`

Returns aggregate KPIs, alerts, trends, and hotspot data for Command Center.

Response:
```json
{
  "kpis": {
    "total_claims_analyzed": 1284392,
    "high_risk_claims": 47281,
    "potential_exposure": 824600000000,
    "providers_at_risk": 128,
    "trends": {
      "high_risk_change_pct": 2.4,
      "exposure_change_pct": 1.8,
      "period": "7d"
    }
  },
  "ai_briefing": {
    "summary": "Gemini mendeteksi peningkatan tidak biasa pada klaim severity tinggi...",
    "confidence": 0.94,
    "affected_providers": 7,
    "potential_exposure": 42800000000,
    "detected_at": "2026-08-23T08:30:00Z"
  },
  "emerging_signals": [
    {
      "signal_id": "SIG-492",
      "risk_type": "UPCODING",
      "title": "Upcoding Surge",
      "description": "Sudden spike in level 4 and 5 consultations across 12 connected providers",
      "severity": "CRITICAL",
      "change_pct": 34,
      "affected_providers": 7,
      "potential_exposure": 42100000000,
      "confidence": 0.94,
      "detected_at": "2026-08-23T08:26:00Z"
    }
  ],
  "province_risk": [
    {
      "province_code": "ID-JK",
      "province_name": "DKI Jakarta",
      "high_risk_claims": 47,
      "potential_exposure": 12400000000,
      "dominant_risk_type": "UPCODING",
      "latitude": -6.2088,
      "longitude": 106.8456
    }
  ],
  "risk_distribution": {
    "critical": 1247,
    "high": 8934,
    "medium": 37100,
    "low": 1237111
  },
  "risk_trend": [
    { "date": "2026-08-16", "high_risk_count": 6200, "exposure": 720000000000 },
    { "date": "2026-08-17", "high_risk_count": 6350, "exposure": 738000000000 }
  ],
  "top_risk_providers": [
    {
      "provider_id": "HOSP-01",
      "name": "RS Sehat Sentosa",
      "risk_score": 92,
      "high_risk_claims": 847,
      "potential_exposure": 18400000000
    }
  ]
}
```

---

## Claims

### `GET /api/claims`

Query parameters:
- `search` (string) — search claim ID, patient ID, provider name
- `risk_type` (string) — UPCODING, CLONING, PHANTOM_BILLING, ABNORMAL_LOS
- `risk_level` (string) — CRITICAL, HIGH, MEDIUM, LOW
- `provider_id` (string)
- `diagnosis_code` (string)
- `min_amount` (integer)
- `max_amount` (integer)
- `date_from` (ISO date)
- `date_to` (ISO date)
- `status` (string) — FLAGGED, PENDING_REVIEW, IN_QUEUE, AUTO_CLEARED
- `sort_by` (string) — risk_score, claim_amount, created_at (default: risk_score)
- `sort_order` (string) — desc (default), asc
- `cursor` (string)
- `limit` (integer, default: 20, max: 100)

Response:
```json
{
  "data": [
    {
      "claim_id": "CLM-10293",
      "provider": { "provider_id": "HOSP-01", "name": "RS Sehat Sentosa" },
      "primary_diagnosis": { "code": "A09", "description": "Diare dan gastroenteritis" },
      "claim_amount": 18450000,
      "length_of_stay": 6,
      "risk_score": 94,
      "risk_level": "CRITICAL",
      "risk_signals": ["UPCODING", "PHANTOM_BILLING"],
      "status": "FLAGGED",
      "admission_date": "2026-07-26",
      "created_at": "2026-08-01T10:00:00Z"
    }
  ],
  "pagination": { "cursor": "abc123", "has_more": true, "total_count": 47281 }
}
```

### `GET /api/claims/:id`

Response includes full claim detail with diagnoses, procedures, evidence, risk findings, and similar claims.

```json
{
  "claim_id": "CLM-10293",
  "patient": { "patient_id": "P-001", "age": 45, "gender": "M" },
  "provider": { "provider_id": "HOSP-01", "name": "RS Sehat Sentosa", "type": "RS", "province_code": "ID-JK" },
  "diagnoses": [
    { "code": "A09", "description": "Diare dan gastroenteritis", "is_primary": true, "severity": 3 }
  ],
  "procedures": [
    { "code": "44960", "description": "Appendectomy", "date": "2026-07-27" }
  ],
  "service": {
    "admission_date": "2026-07-26",
    "discharge_date": "2026-08-01",
    "length_of_stay": 6,
    "submission_date": "2026-08-02"
  },
  "claim_amount": 18450000,
  "medical_evidence": [
    { "document_id": "DOC-01", "document_type": "MEDICAL_SUMMARY", "content": "...", "status": "SUPPORTS_CLAIM" },
    { "document_id": "DOC-02", "document_type": "PROCEDURE_RECORD", "content": "...", "status": "CONTRADICTS_CLAIM" }
  ],
  "risk_findings": [
    {
      "risk_type": "UPCODING",
      "risk_score": 92,
      "confidence": 0.92,
      "verdict": "HIGH",
      "summary": "Severity level tidak konsisten dengan evidence klinis.",
      "evidence": [{ "evidence_id": "DOC-01", "claim": "...", "supports_finding": true }]
    }
  ],
  "similar_claims": [
    { "claim_id": "CLM-09283", "similarity": 0.96, "provider_name": "RS Sehat Sentosa", "risk_score": 88 }
  ],
  "composite_risk_score": 94,
  "composite_risk_level": "CRITICAL"
}
```

### `POST /api/claims/:id/analyze`

Trigger risk analysis for a specific claim. Returns analysis job ID.

Request:
```json
{
  "detectors": ["UPCODING", "CLONING", "PHANTOM_BILLING", "ABNORMAL_LOS"],
  "include_gemini": true
}
```

Response:
```json
{
  "job_id": "JOB-001",
  "status": "PROCESSING",
  "estimated_duration_seconds": 8
}
```

---

## Providers

### `GET /api/providers`

Query parameters:
- `search` (string)
- `risk_level` (string)
- `province_code` (string)
- `sort_by` (string) — risk_score, total_claims, potential_exposure
- `sort_order` (string)
- `cursor`, `limit`

Response:
```json
{
  "data": [
    {
      "provider_id": "HOSP-01",
      "name": "RS Sehat Sentosa",
      "type": "RS",
      "province_code": "ID-JK",
      "risk_score": 92,
      "total_claims": 12482,
      "high_risk_claims": 847,
      "potential_exposure": 18400000000
    }
  ],
  "pagination": { "cursor": "xyz", "has_more": true, "total_count": 128 }
}
```

### `GET /api/providers/:id`

Response includes provider detail with risk composition, peer comparison, trend, and network data.

```json
{
  "provider_id": "HOSP-01",
  "name": "RS Sehat Sentosa",
  "type": "RS",
  "province_code": "ID-JK",
  "risk_score": 92,
  "risk_level": "HIGH",
  "total_claims": 12482,
  "high_risk_claims": 847,
  "potential_exposure": 18400000000,
  "risk_composition": {
    "upcoding": { "count": 412, "pct": 48.6 },
    "phantom_billing": { "count": 203, "pct": 24.0 },
    "cloning": { "count": 134, "pct": 15.8 },
    "abnormal_los": { "count": 98, "pct": 11.6 }
  },
  "peer_comparison": {
    "severity_3_pct": { "this_provider": 42, "peer_median": 18 },
    "avg_los": { "this_provider": 5.2, "peer_median": 3.1 },
    "avg_claim_amount": { "this_provider": 22400000, "peer_median": 14200000 }
  },
  "risk_trend": [
    { "month": "2026-06", "risk_score": 78 },
    { "month": "2026-07", "risk_score": 85 },
    { "month": "2026-08", "risk_score": 92 }
  ],
  "top_doctors": [
    { "doctor_id": "DR-01", "name": "Dr. Hendra", "specialty": "Orthopedics", "claim_count": 342, "risk_score": 88 }
  ]
}
```

---

## Investigation

### `GET /api/investigation-queue`

Query parameters:
- `risk_level` (string)
- `risk_type` (string)
- `provider_id` (string)
- `province_code` (string)
- `sort_by` (string) — risk_score, potential_exposure, created_at
- `cursor`, `limit`

### `POST /api/investigations`

Create a new investigation from a claim.

Request:
```json
{
  "claim_id": "CLM-10293",
  "assigned_to": "user_id"
}
```

### `GET /api/investigations`

Query parameters: `status`, `assigned_to`, `risk_level`, `sort_by`, `cursor`, `limit`

### `GET /api/investigations/:id`

Full investigation workspace data: claim detail, risk findings, evidence, similar claims, network data, notes, AI runs.

### `PATCH /api/investigations/:id`

Update investigation status or assignment.

Request:
```json
{
  "status": "CONFIRMED_RISK",
  "decision_notes": "Multiple high-confidence indicators confirmed by manual review."
}
```

Allowed statuses:

```text
NEW → UNDER_INVESTIGATION
UNDER_INVESTIGATION → NEED_EVIDENCE | CONFIRMED_RISK | FALSE_POSITIVE
NEED_EVIDENCE → UNDER_INVESTIGATION | CONFIRMED_RISK | FALSE_POSITIVE
CONFIRMED_RISK → CLOSED
FALSE_POSITIVE → CLOSED
```

### `POST /api/investigations/:id/notes`

Request:
```json
{
  "content": "Investigator note content..."
}
```

---

## Reports

### `GET /api/reports`

Query parameters: `investigation_id`, `status` (draft, completed), `sort_by`, `cursor`, `limit`

### `GET /api/reports/:id`

Full report detail with executive summary, findings, evidence, AI analysis, decision.

### `POST /api/reports`

Generate a new report from an investigation.

Request:
```json
{
  "investigation_id": "INV-2026-010293",
  "include_ai_analysis": true
}
```

---

## AI Copilot

### `POST /api/copilot`

Streaming endpoint (SSE) for AI Copilot.

Request:
```json
{
  "investigation_id": "INV-001",
  "question": "Mengapa klaim ini berisiko tinggi?",
  "conversation_history": []
}
```

Response (Server-Sent Events):
```text
event: token
data: {"content": "Berdasarkan "}

event: token
data: {"content": "analisis evidence, "}

event: token
data: {"content": "terdapat 3 indikator..."}

event: complete
data: {"full_response": {...}, "evidence_refs": ["DOC-01", "DOC-02"], "suggested_actions": ["Investigate Provider"]}
```

---

## Risk Intelligence

### `GET /api/risk-intelligence/overview`

Returns risk distribution, trends, and top patterns.

### `GET /api/risk-intelligence/map`

Returns province-level risk data for Indonesia map.

### `GET /api/risk-intelligence/network`

Query parameters: `provider_id`, `cluster_id`, `max_depth` (default: 2), `max_nodes` (default: 100)

Returns network graph data (nodes and edges).

```json
{
  "nodes": [
    { "id": "HOSP-01", "type": "PROVIDER", "label": "RS Sehat Sentosa", "risk_score": 92, "size": "large" },
    { "id": "DR-01", "type": "DOCTOR", "label": "Dr. Hendra", "risk_score": 88, "size": "medium" },
    { "id": "P-001", "type": "PATIENT", "label": "Patient P-001", "risk_score": null, "size": "medium" },
    { "id": "CLM-10293", "type": "CLAIM", "label": "CLM-10293", "risk_score": 94, "size": "small" }
  ],
  "edges": [
    { "source": "HOSP-01", "target": "DR-01", "type": "EMPLOYS", "suspicious": false },
    { "source": "DR-01", "target": "CLM-10293", "type": "SUBMITTED", "suspicious": true },
    { "source": "P-001", "target": "CLM-10293", "type": "PATIENT_OF", "suspicious": false }
  ],
  "clusters": [
    {
      "cluster_id": "CLUSTER-42",
      "risk_level": "CRITICAL",
      "claims_count": 12,
      "doctors_count": 3,
      "providers_count": 1,
      "exposure": 2800000000,
      "patterns": ["Repeated diagnosis sequence", "High severity concentration"]
    }
  ]
}
```

### `GET /api/risk-intelligence/patterns`

Returns AI-discovered emerging patterns.

### `GET /api/risk-intelligence/trends`

Query parameters: `period` (7d, 30d, 90d), `risk_type`, `province_code`

---

## Data Management

### `POST /api/datasets`

Upload a new CSV dataset. Uses `multipart/form-data`.

Response:
```json
{
  "dataset_id": "DS-001",
  "filename": "Claims_JKN_August_2026.csv",
  "record_count": 1284392,
  "status": "PROFILING",
  "columns": [
    { "name": "NO_SEP", "detected_type": "string", "non_null_count": 1284392, "unique_count": 1284392 }
  ]
}
```

### `GET /api/datasets`

List all datasets with status and quality info.

### `GET /api/datasets/:id`

Dataset detail with column profile.

### `POST /api/datasets/:id/mapping`

Save or update field mappings.

Request:
```json
{
  "mappings": [
    { "source_field": "NO_SEP", "canonical_field": "claim_id", "confidence": 0.96 },
    { "source_field": "NO_KARTU", "canonical_field": "patient_id", "confidence": 0.94 }
  ]
}
```

### `POST /api/datasets/:id/suggest-mapping`

Request AI-assisted mapping suggestion.

Response:
```json
{
  "suggestions": [
    { "source_field": "NO_SEP", "canonical_field": "claim_id", "confidence": 0.96, "reasoning": "Field name pattern matches claim identifier" }
  ],
  "overall_confidence": 0.94
}
```

### `POST /api/datasets/:id/normalize`

Trigger normalization from raw records to canonical claims.

### `GET /api/datasets/:id/quality`

Returns data quality report (completeness, validity, duplicates, missing fields).

---

## Notifications

### `GET /api/notifications`

Query parameters: `is_read` (boolean), `cursor`, `limit` (default: 20)

### `PATCH /api/notifications/:id`

Mark as read: `{ "is_read": true }`

### `POST /api/notifications/mark-all-read`

Mark all notifications as read.

---

## Settings

### `GET /api/settings`

Returns current configuration (risk thresholds, AI config status).

### `PATCH /api/settings`

Update risk thresholds or configuration.

---

## Rate limiting

| Endpoint category | Rate limit |
|---|---|
| Read endpoints | 100 requests/minute |
| Write endpoints | 30 requests/minute |
| AI Copilot | 20 requests/hour |
| Batch analysis | 5 requests/hour |
| File upload | 10 requests/hour |

Rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

## API versioning

MVP: No versioning prefix. All endpoints are v1 implicitly.

Future: `/api/v2/...` when breaking changes are introduced.
