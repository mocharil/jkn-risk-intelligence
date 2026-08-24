# Phase 2 - Synthetic Data

## Goal
Create realistic, reproducible, labeled demo data with Indonesian conventions.

## Build
- Seeded generator (deterministic output)
- 1,000 claims distributed across 20 providers and 10 provinces
- 20 providers with Indonesian names (RS Sehat Sentosa, RS Medika Utama, Klinik Sehat Bersama, etc.)
- 40 doctors with Indonesian names and specialties
- 500 patients with anonymized Indonesian IDs
- Clinical summaries in Indonesian language templates
- 2-5 evidence documents per claim (Medical Summary, Diagnosis Record, Procedure Record, Lab, Medication)
- Hidden anomaly labels: Upcoding (7%), Cloning (5%), Phantom Billing (4%), Abnormal LOS (3%), Multiple (3%), Normal (78%)
- Province distribution weighted toward Jakarta and Java for meaningful map visualization
- Seed command (`npm run seed`)

## Important
- Ground-truth labels must never be part of the detector input.
- All amounts must be in Indonesian Rupiah (integer, no decimals).
- All names must use Indonesian conventions.
- Clinical narratives should use Indonesian medical terminology.

## Exit criteria
- Same seed produces same dataset.
- Distribution roughly matches the specification.
- Seed can populate a fresh Supabase project.
- Provider and patient names are Indonesian.
- Claim amounts are in Rupiah (reasonable ranges: Rp 500.000 to Rp 50.000.000).
- Claims are distributed across at least 10 provinces.
- Evidence documents are generated for each claim.

## Vibecoding prompt
Implement Phase 2 only. Build a deterministic synthetic-data generator and database seed process. Use Indonesian names for all providers, doctors, and patients. Generate clinical summaries in Bahasa Indonesia. All amounts must be in Rupiah. Distribute claims across provinces with weight toward Jakarta and Java. Include hidden ground-truth anomaly labels including Abnormal LOS as a fourth risk type. Add tests for reproducibility and anomaly distribution.
