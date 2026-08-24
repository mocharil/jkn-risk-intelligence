# Phase 7 - Investigation Workflow

## Goal
Turn detections into a usable human investigation process.

## Build
- Prioritized investigation queue with AI priority explanation
- Queue filters: risk level, risk type, provider, region, exposure, date, status
- Queue tabs: All, Critical, High, Medium
- Card view and table view toggle
- Investigation creation from claim (POST /api/investigations)
- Investigation workspace with 65/35 layout (evidence + AI panel)
- Workspace tabs: Overview, Evidence, Timeline, Similar Claims, Network, Notes
- Overview: risk indicators with colored left borders, claim information
- Evidence board: categorized evidence cards (Supports, Contradicts, Needs Review, Missing)
- Timeline: chronological medical events with suspicious gaps highlighted
- Similar Claims: semantically similar historical claims with similarity scores
- Network: mini relationship graph for the claim context
- AI Investigator panel (right side): structured analysis, suggested prompts, follow-up input
- Investigation notes: add/view notes with timestamps
- Status transitions: NEW → UNDER_INVESTIGATION → NEED_EVIDENCE/CONFIRMED_RISK/FALSE_POSITIVE → CLOSED
- Persistent bottom action bar: [Butuh Bukti Tambahan] [Tandai False Positive] [Konfirmasi Risiko] [Buat Laporan]
- Report generation from investigation
- Notification on status change
- Audit log entry on status transitions

## Exit criteria
- A risk finding can become a case (investigation creation works).
- Status and notes persist across page reloads.
- User can review all evidence used by AI.
- Evidence board shows categorized evidence with color-coded states.
- Similar claims display with similarity percentages.
- Timeline highlights suspicious gaps and inconsistencies.
- Closed/false-positive decisions remain auditable.
- Status changes create notification and audit log entries.
- Bottom action bar uses Bahasa Indonesia labels.
- Responsive layout stacks AI panel below evidence on tablet.

## Vibecoding prompt
Implement Phase 7 only. Build the Investigation Queue and Investigation Workspace using persisted findings. Follow the light-mode BPJS healthcare design with evidence-focused investigation layout (65/35 split). Include case lifecycle, notes, evidence board with categorized states, similar claims, timeline, and AI synthesis. Keep human decision authoritative. Use Bahasa Indonesia for action labels. Implement responsive stacking for tablet.
