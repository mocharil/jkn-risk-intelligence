# Data and Database Design

## Core principle

```text
Raw JKN-like Data
      ↓
Data Adapter
      ↓
Canonical Schema
      ↓
Risk Intelligence Engine
```

Only the adapter changes when the source structure changes.

## Canonical claim

```json
{
  "claim_id": "CLM-10293",
  "patient": {
    "patient_id": "P-001",
    "age": 45,
    "gender": "M"
  },
  "provider": {
    "provider_id": "HOSP-01",
    "name": "RS Sehat Sentosa",
    "type": "RS",
    "province_code": "ID-JK"
  },
  "service": {
    "date": "2026-08-01",
    "length_of_stay": 6,
    "admission_date": "2026-07-26",
    "discharge_date": "2026-08-01"
  },
  "diagnoses": [
    {
      "code": "A09",
      "description": "Diare dan gastroenteritis",
      "is_primary": true,
      "severity": 3
    }
  ],
  "procedures": [
    {
      "code": "44960",
      "description": "Appendectomy",
      "date": "2026-07-27"
    }
  ],
  "claim_amount": 18450000,
  "medical_evidence": {
    "summary": "Synthetic clinical summary",
    "document_ids": ["DOC-01"]
  }
}
```

## Tables

### Core data
- `datasets` — imported file metadata (name, record count, status, quality score, imported_at)
- `raw_records` — unprocessed CSV rows (dataset_id, row_number, raw_json, validation_status, validation_errors)
- `field_mappings` — schema mapping configuration (dataset_id, source_field, canonical_field, confidence, is_ai_suggested)
- `claims` — canonical claims (all fields from canonical schema)
- `claim_diagnoses` — claim diagnosis records (claim_id, code, description, is_primary, severity)
- `claim_procedures` — claim procedure records (claim_id, code, description, date)
- `medical_documents` — supporting evidence documents (claim_id, document_type, content, document_id)
- `claim_embeddings` — pgvector embeddings for similarity search (claim_id, embedding, model_version)

### Risk and investigation
- `risk_findings` — risk detection results (claim_id, risk_type, risk_score, confidence, verdict, summary, evidence_json, missing_evidence_json, detector_version, created_at)
- `investigations` — investigation cases (investigation_id, claim_id, provider_id, status, assigned_to, risk_score, potential_exposure, created_at, updated_at)
- `investigation_notes` — investigator notes (investigation_id, author, content, created_at)
- `investigation_reports` — generated reports (investigation_id, title, executive_summary, findings_json, decision, created_at)
- `ai_runs` — AI execution logs (investigation_id, claim_id, prompt_version, evidence_version, model, input_tokens, output_tokens, response_json, latency_ms, created_at)

### Platform
- `providers` — provider reference data (provider_id, name, type, province_code, total_claims, high_risk_claims, risk_score, potential_exposure)
- `notifications` — user notifications (user_id, type, title, message, entity_type, entity_id, is_read, created_at)
- `audit_log` — audit events (user_id, action, entity_type, entity_id, metadata_json, ip_address, created_at)

### Geographic reference
- `provinces` — Indonesian province data (province_code, name, latitude, longitude, island_group)

## Database indexes

```sql
-- Performance-critical indexes
CREATE INDEX idx_claims_provider_risk ON claims (provider_id, risk_score DESC);
CREATE INDEX idx_claims_risk_level ON claims (risk_score DESC) WHERE risk_score >= 50;
CREATE INDEX idx_risk_findings_claim ON risk_findings (claim_id, risk_type);
CREATE INDEX idx_risk_findings_score ON risk_findings (risk_score DESC);
CREATE INDEX idx_investigations_status ON investigations (status, created_at DESC);
CREATE INDEX idx_investigations_provider ON investigations (provider_id);
CREATE INDEX idx_notifications_user_unread ON notifications (user_id, is_read, created_at DESC) WHERE is_read = false;
CREATE INDEX idx_audit_log_entity ON audit_log (entity_type, entity_id, created_at DESC);
CREATE INDEX idx_claim_embeddings_vector ON claim_embeddings USING ivfflat (embedding vector_cosine_ops);
```

## Materialized views

```sql
-- Command Center KPIs (refresh after each analysis run)
CREATE MATERIALIZED VIEW mv_dashboard_kpis AS
SELECT
  COUNT(*) AS total_claims,
  COUNT(*) FILTER (WHERE risk_score >= 75) AS high_risk_claims,
  SUM(claim_amount) FILTER (WHERE risk_score >= 75) AS potential_exposure,
  COUNT(DISTINCT provider_id) FILTER (WHERE risk_score >= 75) AS providers_at_risk
FROM claims;

-- Provider risk summary (refresh after each analysis run)
CREATE MATERIALIZED VIEW mv_provider_risk AS
SELECT
  provider_id,
  p.name AS provider_name,
  p.province_code,
  COUNT(*) AS total_claims,
  COUNT(*) FILTER (WHERE c.risk_score >= 75) AS high_risk_claims,
  MAX(c.risk_score) AS max_risk_score,
  SUM(c.claim_amount) FILTER (WHERE c.risk_score >= 75) AS potential_exposure
FROM claims c
JOIN providers p ON c.provider_id = p.provider_id
GROUP BY provider_id, p.name, p.province_code;

-- Province risk aggregation for Indonesia map
CREATE MATERIALIZED VIEW mv_province_risk AS
SELECT
  p.province_code,
  prov.name AS province_name,
  prov.latitude,
  prov.longitude,
  COUNT(*) FILTER (WHERE c.risk_score >= 75) AS high_risk_claims,
  SUM(c.claim_amount) FILTER (WHERE c.risk_score >= 75) AS potential_exposure,
  MODE() WITHIN GROUP (ORDER BY rf.risk_type) AS dominant_risk_type
FROM claims c
JOIN providers p ON c.provider_id = p.provider_id
JOIN provinces prov ON p.province_code = prov.province_code
LEFT JOIN risk_findings rf ON c.claim_id = rf.claim_id AND rf.risk_score >= 75
GROUP BY p.province_code, prov.name, prov.latitude, prov.longitude;
```

## Caching strategy

| Data | Cache location | TTL | Invalidation |
|---|---|---|---|
| Dashboard KPIs | Materialized view | Refresh on analysis completion | Manual refresh via API |
| Province risk map data | Materialized view + React Query | 5 minutes | Analysis completion |
| Provider list (paginated) | React Query | 30 seconds staleTime | Investigation status change |
| Claim detail | React Query | 5 minutes staleTime | Risk re-analysis |
| AI analysis responses | ai_runs table | Permanent | Re-analysis with new evidence |
| Static reference data (provinces, ICD codes) | React Query | 1 hour staleTime | Never (static) |

## Data onboarding

```text
Upload CSV
   ↓
Profile Columns (detect types, cardinality, null rate)
   ↓
AI Suggest Mapping (Gemini or heuristic matching)
   ↓
Human Review (confirm/edit mappings)
   ↓
Validate (run Zod schema against mapped data)
   ↓
Normalize (transform to canonical schema)
   ↓
Quality Report (completeness, validity, duplicates)
   ↓
Vector Index (generate embeddings for similarity search)
   ↓
Ready
```

## Example mapping

```text
NO_SEP       → claim_id
NO_KARTU     → patient_id
KODE_PPK     → provider_id
DIAG_PRIMER  → primary_diagnosis
LOS          → length_of_stay
TARIF        → claim_amount
```

Missing fields must lower confidence or produce insufficient evidence. Never fabricate missing values.

## Data retention policy

| Data type | Retention | Rationale |
|---|---|---|
| Raw records | 90 days after normalization | Needed for re-mapping |
| Canonical claims | Duration of project | Core analysis data |
| Risk findings | Duration of project | Investigation dependency |
| Investigations | Duration of project | Audit trail |
| AI runs | Duration of project | Reproducibility |
| Notifications | 30 days | Non-critical |
| Audit log | Duration of project | Compliance |

For MVP, all data is retained indefinitely within Supabase free tier limits.

## Geographic reference data

Indonesian provinces (34 entries):

```json
[
  { "province_code": "ID-JK", "name": "DKI Jakarta", "latitude": -6.2088, "longitude": 106.8456, "island_group": "Jawa" },
  { "province_code": "ID-JB", "name": "Jawa Barat", "latitude": -6.9175, "longitude": 107.6191, "island_group": "Jawa" },
  { "province_code": "ID-JT", "name": "Jawa Tengah", "latitude": -7.1509, "longitude": 110.1403, "island_group": "Jawa" },
  { "province_code": "ID-JI", "name": "Jawa Timur", "latitude": -7.5361, "longitude": 112.2384, "island_group": "Jawa" },
  { "province_code": "ID-SU", "name": "Sumatera Utara", "latitude": 2.1154, "longitude": 99.5451, "island_group": "Sumatera" },
  { "province_code": "ID-SN", "name": "Sulawesi Selatan", "latitude": -3.6688, "longitude": 119.9741, "island_group": "Sulawesi" }
]
```

Full 34-province dataset included in seed data. Coordinates used for map hotspot positioning.
