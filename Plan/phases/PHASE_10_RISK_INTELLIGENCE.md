# Phase 10 - Risk Intelligence

## Goal
Visualize systemic patterns beyond individual claims.

## Build

### Overview tab
- Risk summary KPIs
- Risk type distribution
- Top emerging patterns
- Province risk summary

### Risk Map tab
- Full-page Indonesia risk map (reuse from Command Center, larger canvas)
- Region intelligence side panel (click province → detail)
- Provider hotspots within selected region
- Risk type filter overlay (show only Upcoding, only Phantom Billing, etc.)

### Network Graph tab
- Canvas-based network graph using react-force-graph-2d
- Node types with distinct visual:
  - Provider: large green circle
  - Doctor: medium dark-green circle
  - Patient: medium blue circle
  - Claim: small teal circle
  - Diagnosis: small cyan diamond
  - Procedure: small gray-blue square
- Edge rendering: normal (light gray), suspicious (orange/red, thicker)
- Click node → side detail panel with entity information
- Drag to rearrange, zoom/pan
- Cluster detection with highlight (e.g., Cluster #42 in orange boundary)
- Cap visible nodes at 200; "Tampilkan lebih banyak" button for expansion
- Filter by risk type, provider, time period
- Selected node: green outline with subtle glow

### Emerging Patterns tab
- AI-detected patterns with confidence scores
- Each pattern links to related claims, providers, and investigations
- Timeline of when patterns were first detected

### Risk Trends tab
- Risk score trends over time (line chart)
- Risk type breakdown trends (stacked area)
- Provider risk evolution
- Period selector (7 days, 30 days, 90 days)

## Network entities
- Provider
- Doctor
- Patient
- Claim
- Diagnosis
- Procedure

## Exit criteria
- Graph relationships derive from real synthetic records (not fabricated for visual effect).
- Clusters link to claims/providers.
- Network graph handles 100+ nodes smoothly (Canvas rendering).
- Visuals remain usable without hover-only interactions (node labels visible, color-coded).
- Risk map shows province-level risk data.
- All tabs work with meaningful data from synthetic dataset.
- Risk type filter works on both map and network graph.

## Vibecoding prompt
Implement Phase 10 only. Add the Risk Intelligence workspace with 5 tabs (Overview, Risk Map, Network Graph, Emerging Patterns, Risk Trends). Build the network graph using react-force-graph-2d with Canvas rendering and 6 distinct node types (Provider, Doctor, Patient, Claim, Diagnosis, Procedure). Reuse the Indonesia Risk Map component from Phase 9. Use existing synthetic relationships and risk findings; do not fabricate graph connections for visual effect. Implement node click → detail panel and cluster highlighting.
