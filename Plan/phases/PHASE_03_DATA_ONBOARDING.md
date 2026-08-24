# Phase 3 - Data Onboarding

## Goal
Allow differently structured CSV datasets to enter the same canonical schema.

## Build
- CSV upload with file validation (type, size, encoding checks per 08_SECURITY.md)
- Raw-record persistence with validation status
- Column profiler (detect types, cardinality, null rate)
- Mapping UI with two-column visual interface (incoming → canonical)
- AI-assisted mapping suggestion (optional Gemini or heuristic matching)
- Mapping persistence in `field_mappings` table
- Canonical validation (Zod schema against mapped data)
- Normalization job (raw → canonical claims with Rupiah amounts)
- Data quality summary (completeness, validity, duplicates, missing critical fields)
- Import history with status tracking
- Audit log entry on dataset import

## Optional AI
Gemini may suggest mappings with confidence scores, but a human must confirm them.

## Exit criteria
- Two CSVs with different column names map into the same canonical schema.
- Invalid rows are reported with specific reasons, not silently discarded.
- Risk engine remains unaware of source column names.
- File upload validates type and size (max 50MB CSV).
- Quality report shows completeness and validity percentages.
- Import creates an audit log entry.
- Amounts are normalized to Rupiah integers.

## Vibecoding prompt
Implement Phase 3 only. Build source-agnostic CSV onboarding with explicit field mapping, canonical normalization, and data quality reporting. Include file validation (type, size, encoding). Demonstrate two differently shaped CSV schemas. Ensure all amounts normalize to Rupiah integers. Create audit log entries for imports. Do not implement risk detection yet.
