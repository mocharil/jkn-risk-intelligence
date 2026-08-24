# Master Implementation Plan

## MVP objective

Build a credible end-to-end prototype of an AI-assisted JKN risk investigation platform without requiring dedicated cloud infrastructure.

## Core workflow

```text
Data Source
    ↓
Upload / Ingestion
    ↓
Schema Mapping
    ↓
Canonical Claim Schema
    ↓
Rules + Similarity Search
    ↓
Gemini Evidence Reasoning
    ↓
Risk Findings
    ↓
Investigation Queue
    ↓
Investigation Workspace
    ↓
Human Decision
```

## Delivery phases

| Phase | Name | Main outcome |
|---|---|---|
| 0 | Foundation | Working Next.js + Supabase project |
| 1 | Data Model | Canonical schema and migrations |
| 2 | Synthetic Data | Reproducible labeled dataset |
| 3 | Data Onboarding | CSV mapping and normalization |
| 4 | Core UI | Claims and Providers views |
| 5 | Risk Engine | Upcoding, Cloning, Phantom Billing, Abnormal LOS |
| 6 | Gemini Intelligence | Grounded structured reasoning |
| 7 | Investigation | Queue and case workspace |
| 8 | AI Copilot | Evidence-grounded conversational investigation |
| 9 | Command Center | KPIs, Indonesia risk map, alerts, AI briefing |
| 10 | Risk Intelligence | Network graph, emerging patterns, risk trends |
| 11 | Hardening | Tests, security, accessibility, performance, responsive |
| 12 | Demo Release | Stable hackathon demo |

## Build principle

Each phase must be independently runnable and testable. Do not start the next phase until the exit criteria of the current phase are met.

## Design direction

Use a premium **light-mode** healthcare intelligence interface inspired by the BPJS Kesehatan institutional identity.

Design balance:

- 70% Clean healthcare / BPJS enterprise (white + green)
- 20% Intelligence platform
- 10% Futuristic AI

Do NOT use a dark cyberpunk interface. Do NOT simply recolor a generic admin template green.

## Non-functional requirements

| Requirement | MVP target |
|---|---|
| Largest Contentful Paint | < 2.5 seconds |
| First Input Delay | < 100 milliseconds |
| Cumulative Layout Shift | < 0.1 |
| API response (p95) | < 500 milliseconds (excluding Gemini) |
| Gemini response (p95) | < 10 seconds |
| Accessibility | WCAG 2.1 Level AA (critical paths) |
| Responsive support | Desktop 1440px primary, laptop 1024px, tablet 768px |
| Browser support | Chrome and Edge latest two versions |
| Localization | Bahasa Indonesia labels, English technical terms, Rupiah formatting |

## Technical constraints

- Free-tier Supabase (500 MB database, 1 GB storage)
- Vercel hobby plan (100 GB bandwidth, 10 second serverless function timeout)
- Gemini API rate limits (adjust batch size accordingly)
- No custom domain required for MVP
- Synthetic data only (no real patient data)

## MVP boundaries

### In scope

- Synthetic data
- 4 risk types (Upcoding, Cloning, Phantom Billing, Abnormal LOS)
- Claim and provider analysis
- Investigator workflow
- AI Copilot
- Data schema mapping
- Explainable evidence
- Light-mode BPJS healthcare UI
- Indonesia risk map (SVG-based)
- Network relationship graph
- Investigation reports
- Basic accessibility (keyboard navigation, ARIA labels, color contrast)
- Responsive layouts for desktop and tablet

### Out of scope

- Production BPJS integration
- Real patient data
- Automated fraud adjudication
- Custom foundation-model training
- Kubernetes or microservices
- Enterprise HA and DR
- Mobile-first responsive design
- Offline support
- Multi-tenant architecture
- Advanced RBAC (single investigator role for MVP)
- PDF report generation (HTML-based reports for MVP)

## Risk and mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Gemini API downtime during demo | Demo breaks at AI steps | Prepare cached fallback responses and screenshot deck |
| Supabase free tier limits | Database or storage quota exceeded | Monitor usage, keep synthetic data at 1,000 claims |
| Vercel function timeout on Gemini calls | AI analysis fails | Implement streaming responses, increase timeout budget |
| Hackathon time pressure | Incomplete features | Prioritize golden demo flow, defer non-critical screens |
| Network graph rendering performance | UI freezes with large datasets | Cap visible nodes, use Canvas rendering above threshold |
| Indonesia map geographic accuracy | Map looks wrong | Use verified GeoJSON/SVG from official sources |
