# JKN Risk Intelligence Platform

Build-ready documentation pack for a low-cost HealthKathon MVP using:

- Next.js + TypeScript on Vercel
- Supabase PostgreSQL, pgvector, Storage, Realtime, and Auth
- Gemini via server-side Service Account
- Synthetic healthcare claim data for the prototype

## Product idea

The platform helps investigators **detect → prioritize → investigate → explain → decide** on suspicious healthcare claims.

The MVP focuses on four risk types:

1. Upcoding
2. Cloning / duplicated claim narratives
3. Phantom Billing
4. Abnormal LOS

The architecture is intentionally source-agnostic. Incoming datasets are mapped into a canonical claim schema before entering the risk engine.

## Design direction

Premium **light-mode** healthcare intelligence interface inspired by the BPJS Kesehatan institutional identity. White + green visual language with intelligence and AI accents.

## Recommended reading order

### Core documentation
1. `00_MASTER_PLAN.md` — MVP objective, phases, boundaries, constraints
2. `01_PRD.md` — Product requirements, users, accessibility, i18n, responsive, onboarding
3. `02_UX_AND_USER_FLOW.md` — Navigation, screens, drill-downs, empty states, error flows
4. `03_TECHNICAL_ARCHITECTURE.md` — Stack, state management, performance, rendering strategy
5. `04_DATA_AND_DATABASE.md` — Schema, tables, indexes, materialized views, caching
6. `05_AI_AND_RISK_ENGINE.md` — Risk detectors, Gemini integration, streaming, fallback
7. `06_API_CONTRACT.md` — Full endpoint specification with request/response schemas
8. `07_SYNTHETIC_DATA.md` — Data generation, injection strategy, evaluation
9. `08_SECURITY.md` — OWASP checklist, CSP, input sanitization, file upload security
10. `09_TESTING_AND_ACCEPTANCE.md` — Unit/integration/E2E tests, accessibility, performance benchmarks
11. `10_DEMO_PLAN.md` — 5-minute demo storyline with timing, talking points, fallbacks
12. `11_VIBECODING_PROMPTS.md` — Global context prompt and working style

### Supplementary documentation
13. `12_PERFORMANCE_AND_SCALABILITY.md` — Web Vitals, caching, optimization, large dataset handling
14. `13_ACCESSIBILITY_AND_I18N.md` — WCAG 2.1 AA, keyboard navigation, ARIA, Indonesian formatting
15. `14_RESPONSIVE_DESIGN_STRATEGY.md` — Breakpoints, per-screen adaptation, touch interactions

### Implementation phases
16. Execute the phases in `phases/` sequentially (Phase 0 through Phase 12).

## Golden rule

Do not ask an AI coding agent to build the whole product in one prompt. Each phase has an explicit goal, scope, deliverables, tests, and exit criteria.
