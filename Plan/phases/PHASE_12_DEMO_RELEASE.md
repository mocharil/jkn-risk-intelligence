# Phase 12 - Demo Release

## Goal
Create a deterministic, polished hackathon release.

## Build
- Curated demo seed with hero data:
  - One hero provider: RS Sehat Sentosa (HOSP-01) with risk score 92
  - One hero claim: CLM-10293 with multiple risk signals (Upcoding 92 + Phantom Billing 81 + Abnormal LOS 74)
  - Stable emerging pattern: Upcoding Surge across 7 connected providers
  - Province hotspots focused on Jakarta and West Java
  - AI Briefing pre-cached response
- Demo reset script (`npm run demo:reset`)
  - Clears all investigation decisions and notes
  - Resets investigation statuses to NEW
  - Refreshes materialized views
  - Verifies hero data is intact
  - Takes < 30 seconds to complete
- Final report flow verification
- README setup instructions (updated with demo steps)
- Deployment checklist
- Fallback assets:
  - Screenshot deck (all 6 demo sections as annotated PNGs)
  - Pre-recorded 30-second video of AI Copilot in action
  - Cached AI responses for hero claim and briefing

## Pre-demo checklist
- [ ] Run `npm run demo:reset`
- [ ] Verify Gemini API responsiveness
- [ ] Verify Supabase accessibility
- [ ] Verify Vercel deployment is latest
- [ ] Clear browser cache and cookies
- [ ] Set browser to 1440px resolution
- [ ] Prepare fallback assets
- [ ] Test internet connectivity
- [ ] Close unnecessary browser tabs
- [ ] Disable browser notifications

## Golden demo flow

```text
Command Center → KPIs + Indonesia Map + AI Briefing
  ↓
Provider hotspot (RS Sehat Sentosa)
  ↓
Hero claim (CLM-10293) → Evidence → Timeline → Similar Claims
  ↓
AI Copilot → "Mengapa klaim ini berisiko tinggi?" (streaming)
  ↓
Human decision → Confirmed Risk
  ↓
Data Management → Schema Mapping (two CSV formats)
```

## Timing

| Section | Duration |
|---|---|
| Command Center | 60 seconds |
| Provider drill-down | 45 seconds |
| Claim investigation | 90 seconds |
| AI Copilot | 60 seconds |
| Human decision | 30 seconds |
| Adaptability (data mapping) | 30 seconds |
| **Total** | **5 minutes 15 seconds** |

Buffer: 15 seconds (trim from any section running ahead).

## Exit criteria
- Fresh demo reset produces expected storyline within 30 seconds.
- No manual DB editing is needed for any demo step.
- Demo completes within ~5 minutes.
- Fallback screenshots/recordings exist for every demo section.
- All amounts display in Rupiah.
- All names are Indonesian.
- Indonesia Map shows province hotspots.
- AI Copilot streams a response with evidence references.
- Hero claim shows all four risk types.

## Vibecoding prompt
Implement Phase 12 only. Freeze feature scope and prepare a deterministic hackathon demo release. Create a resettable demo seed with hero provider (RS Sehat Sentosa) and hero claim (CLM-10293, multiple risk signals). Cache AI responses for reliability. Create a demo reset script. Validate the complete golden flow on the deployed environment. Prepare fallback assets for each demo section.
