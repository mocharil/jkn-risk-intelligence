# Phase 9 - Command Center

## Goal
Create the high-impact landing experience — the first screen users see after login.

## Build
- KPI cards (4 across):
  - Total Klaim Dianalisis (with period trend arrow)
  - Klaim Berisiko Tinggi (with change percentage)
  - Potensi Kerugian dalam Rupiah (with change percentage)
  - Penyedia Layanan Berisiko (with change percentage)
- Indonesia Risk Map (SVG-based):
  - 34 province polygons with risk-level fill colors (green → amber → red gradient)
  - Hotspot nodes positioned at province centroids with pulse animation
  - Click province → region intelligence side panel (risk breakdown, top providers, dominant risk type)
  - Hover → tooltip with province name, risk count, exposure
  - Use react-simple-maps or custom SVG with province GeoJSON/TopoJSON
- AI Intelligence Briefing card:
  - Gemini-generated executive summary of current risk landscape
  - Confidence indicator
  - Affected providers count and exposure
  - Auto-refreshes on new analysis completion
- Emerging Risk Signals section:
  - Pulsing critical signals with time indicator ("Terdeteksi 4 menit yang lalu")
  - Click → drill-down to related claims/providers
- Risk Distribution chart (donut/bar: Critical, High, Medium, Low)
- Risk Trend chart (line: risk count and exposure over time)
- Top Risk Providers widget (sortable mini-table)
- Drill-down links: every metric → relevant filtered view
- Notification bell with unread count badge (Supabase Realtime subscription)

## Exit criteria
- All KPI values come from APIs/materialized views, not hard-coded.
- Indonesia Risk Map renders 34 province polygons with risk coloring.
- Map hotspot click navigates to provider/region detail.
- AI Briefing displays Gemini-generated summary.
- Emerging signals show relative timestamps.
- Every visual can drill into supporting claims/providers.
- No decorative metric lacks a definition.
- All amounts display in Rupiah format.
- Responsive: 2-column layout on tablet.

## Vibecoding prompt
Implement Phase 9 only. Build the Command Center from existing APIs and materialized views. Create the Indonesia Risk Map using SVG with 34 province polygons and risk-level coloring. Include AI Intelligence Briefing, emerging signals with pulse animation, and drill-down links. Use the light-mode BPJS healthcare design with white backgrounds and green accents. All amounts in Rupiah. Prioritize drill-down and investigation entry points over generic BI decoration.
