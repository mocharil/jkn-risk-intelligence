# Testing and Acceptance

## Unit tests

Test:
- canonical schema validation (valid claim, invalid claim, missing fields)
- field adapters (CSV column mapping, type conversion)
- risk scoring (composite score calculation, verdict thresholds)
- upcoding rules (severity mismatch detection, peer comparison)
- cloning thresholds (similarity scoring, pair matching)
- phantom-billing evidence matching (procedure-document linkage)
- abnormal LOS detection (peer median calculation, deviation scoring)
- Gemini response parser (valid JSON, malformed JSON, missing fields)
- currency formatting (Rupiah formatting, large numbers)
- date formatting (Indonesian locale)

## Integration tests

Test:
- CSV → raw record → canonical claim (end-to-end data flow)
- canonical claim → risk findings (all four detectors)
- risk finding → investigation creation and status transitions
- Copilot → evidence retrieval → streaming answer
- notification creation on risk signal detection
- investigation status change → audit log entry
- dataset import → quality report generation

## E2E golden flow

```text
Login
→ Command Center
  - KPIs load with real data
  - Indonesia map shows hotspots
  - AI Briefing displays
→ Investigation Queue
  - Priority cases listed
  - Filters work
→ Open Hero Case (CLM-10293)
  - Risk indicators display
  - Evidence tab shows documents
  - Timeline shows chronological events
  - Similar Claims tab shows matches
  - Network tab shows entity graph
→ Ask AI Copilot
  - "Mengapa klaim ini berisiko tinggi?"
  - Response references evidence
  - Streaming works
→ Change Investigation Decision
  - Status transitions to CONFIRMED_RISK
  - Audit log records the change
→ Generate Report
  - Report saves with findings and decision
→ Data Management
  - Second CSV schema maps correctly
  - Risk engine works without code changes
```

## Accessibility tests

### Automated (axe-core)
- Run axe-core on every page during E2E tests
- Zero critical/serious violations on critical paths
- All form inputs have labels
- All images have alt text
- Color contrast meets 4.5:1 ratio

### Manual keyboard navigation
Test these flows without a mouse:
- Navigate sidebar → select menu item → content loads
- Investigation Queue → Tab through cases → Enter to open
- Investigation Workspace → Tab through tabs → Enter to switch
- AI Copilot → Type question → Enter to submit → Tab through results
- Data Management → Upload flow → Schema mapping → Validate

### Focus management
- Modal opens → focus moves to modal → Escape closes → focus returns
- Side panel opens → focus moves to panel content
- Tab switching → focus moves to new tab content
- Notification panel → focus trap within panel

## Performance benchmarks

| Metric | Target | Page |
|---|---|---|
| LCP | < 2.5s | All pages |
| FID | < 100ms | All pages |
| CLS | < 0.1 | All pages |
| TTI | < 3.5s | Command Center |
| Dashboard KPI load | < 500ms | Command Center |
| Claims table render (100 rows) | < 300ms | Claims |
| Network graph render (100 nodes) | < 500ms | Risk Intelligence |
| Indonesia map initial render | < 400ms | Risk Intelligence |
| AI Copilot first token | < 2s | AI Copilot |

### How to measure
- Lighthouse CI for Core Web Vitals
- React Profiler for component render times
- Network tab for API response times
- Custom performance marks for critical user interactions

## AI output quality tests

### Groundedness test
For each AI response in golden flow:
- Every factual claim references a provided evidence ID
- No evidence IDs are fabricated (must exist in input)
- `INSUFFICIENT_EVIDENCE` used when evidence is missing

### Hallucination detection
Compare AI output against synthetic ground truth:
- AI risk assessment should align with injected risk type
- AI should not claim procedures exist when they are deliberately missing (phantom billing)
- AI should not invent diagnosis details not present in medical summary

### Schema compliance
- Every AI response passes Zod validation against defined output schema
- Malformed responses trigger retry and eventually return safe fallback
- No raw AI errors reach the UI

## Acceptance criteria

### Data
- A supported CSV can be uploaded.
- Invalid rows are rejected with specific reason.
- A second differently named schema can be mapped without detector changes.
- All amounts display in Indonesian Rupiah format.
- Province data populates the Indonesia risk map.

### AI
- Every medium/high AI finding has evidence or insufficient-evidence status.
- Invalid Gemini JSON never reaches UI.
- Missing evidence is not silently invented.
- AI Copilot streams responses in real time.
- AI gracefully degrades when Gemini is unavailable.
- All four risk types (Upcoding, Cloning, Phantom Billing, Abnormal LOS) produce findings.

### Investigation
- Case status persists across page reloads.
- Notes persist and display chronologically.
- Risk findings are reproducible from stored evidence version.
- Closed/false-positive decisions remain auditable in audit log.
- Reports can be generated from completed investigations.

### Security
- No secret appears in browser bundle or repository.
- All API routes validate authentication.
- File uploads are validated for type and size.
- User input is sanitized before use in AI prompts.

### Accessibility
- Critical investigation path is keyboard-navigable.
- Risk scores display numeric value + label + icon (not color-only).
- All form inputs have associated labels.
- Zero critical axe-core violations on main screens.

### Responsive
- Core flow works on laptop (1024px) and tablet (768px).
- Sidebar collapses appropriately on smaller screens.
- No horizontal scrolling on supported breakpoints.
- No overlapping text or truncated critical information.

### UI
- Core flow works end-to-end.
- All provider/patient names use Indonesian conventions.
- Indonesia risk map displays with province-level risk coloring.
- Network graph renders entity relationships.
- Light-mode BPJS healthcare visual identity is consistent across all screens.
