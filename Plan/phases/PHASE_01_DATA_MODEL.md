# Phase 1 - Canonical Data Model

## Goal
Make the canonical schema the stable contract for the entire platform.

## Build
- Supabase migrations for all tables:
  - Core: `datasets`, `raw_records`, `field_mappings`, `claims`, `claim_diagnoses`, `claim_procedures`, `medical_documents`, `claim_embeddings`
  - Risk: `risk_findings`, `investigations`, `investigation_notes`, `investigation_reports`, `ai_runs`
  - Platform: `providers`, `notifications`, `audit_log`, `provinces`
- Enums: risk types (UPCODING, CLONING, PHANTOM_BILLING, ABNORMAL_LOS), investigation statuses, evidence statuses, notification types
- TypeScript domain types aligned with database schema
- Zod schemas for all external boundaries
- Database indexes (see 04_DATA_AND_DATABASE.md)
- Basic RLS policies
- Materialized view definitions (dashboard KPIs, provider risk, province risk)
- Province reference data seed (34 Indonesian provinces with coordinates)

## Exit criteria
- Migrations apply cleanly to an empty project.
- TypeScript and database naming are aligned.
- Validation tests cover valid and invalid claims.
- Province reference table is seeded with 34 entries.
- All four risk types are represented in enums.
- Materialized views create without error (empty data is fine).

## Vibecoding prompt
Implement Phase 1 only. Create database migrations, domain types, and Zod schemas from the documentation. Include all tables from 04_DATA_AND_DATABASE.md including notifications, audit_log, and provinces. Add Abnormal LOS to risk type enums. Seed 34 Indonesian provinces with coordinates. Do not create dashboards or AI calls. Add tests for canonical validation and run them.
