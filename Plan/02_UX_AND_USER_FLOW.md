# UX and User Flow

## Navigation

```text
COMMAND
  Command Center

INVESTIGATION
  Investigation Queue        [badge: count]
  Investigations
  Claims
  Providers

INTELLIGENCE
  Risk Intelligence
  AI Copilot

DATA
  Data Management

OUTPUT
  Reports

SYSTEM
  Settings
```

## Golden flow

```text
Detect
  ↓
Prioritize
  ↓
Investigate
  ↓
Review Evidence
  ↓
Ask AI
  ↓
Decide
  ↓
Generate Report
```

## Screens

### Command Center
Show:
- total claims analyzed
- high-risk claims
- potential exposure (Rupiah)
- providers at risk
- Indonesia risk map (SVG) with province-level hotspots
- emerging anomalies
- risk distribution
- trend
- AI executive briefing

### Investigation Queue
Show:
- priority
- claim
- provider
- risk indicators
- risk score
- potential exposure (Rupiah)
- reason prioritized (AI priority explanation)

Primary CTA: `Investigate`

### Investigation Workspace
Tabs:
- Overview
- Evidence
- Timeline
- Similar Claims
- Network
- Notes

Actions:
- Need Evidence
- Confirmed Risk
- False Positive
- Closed
- Generate Report

Layout: 65-70% evidence workspace, 30-35% AI Investigator panel

### Claims
Search/filter claims and open a claim.
Click opens side preview with quick summary, risk score, top findings.

### Providers
Provider risk profile, claim history, trends, indicators, network.
Peer comparison visualization.

### Risk Intelligence
Tabs:
- Overview
- Risk Map
- Network Graph
- Emerging Patterns
- Risk Trends

### AI Copilot
Natural-language investigation interface with evidence-grounded answers.
Structured intelligence responses, not generic chat bubbles.
Navigable intelligence objects in results.

### Data Management
Tabs:
- Sources
- Datasets
- Schema Mapping
- Data Quality
- Import History

### Reports
Investigation report library with card and list views.
Report detail: Executive Summary, Risk Findings, Evidence, Similar Claims, AI Analysis, Notes, Decision.

### Settings
Sections: Profile, Risk Configuration, AI Configuration, Data Settings, Audit Log.

## Drill-down pathways

Every visualization must provide a drill-down path toward an investigation.

```text
MAP HOTSPOT
→ Region Intelligence
→ Provider
→ Claim
→ Investigation

PROVIDER
→ Provider Intelligence
→ Suspicious Pattern
→ Claims
→ Investigation

NETWORK NODE
→ Relationship Detail
→ Cluster
→ Investigation

AI RESULT
→ Provider / Claim / Pattern
→ Create Investigation

EVIDENCE CITATION
→ Highlight Evidence

RISK SIGNAL
→ Related Claims

CLAIM
→ Investigation Workspace
```

The product should never become a collection of disconnected dashboards.

## First-time user onboarding flow

```text
Login
  ↓
Welcome Modal
  "Selamat datang di JKN Risk Intelligence"
  Brief platform overview (3 bullet points)
  ↓
[Use Demo Data] or [Upload Dataset]
  ↓
If Upload: → Data Management → Schema Mapping → Validate → Ready
If Demo: → Command Center with pre-loaded synthetic data
  ↓
Guided Highlights
  1. "Command Center menampilkan overview risiko nasional"
  2. "Investigation Queue menampilkan kasus prioritas AI"
  3. "AI Copilot membantu investigasi berbasis evidence"
  ↓
Dismiss → Normal usage
```

## Empty state specifications

| Screen | Empty State Message | Action |
|---|---|---|
| Command Center | "Belum ada data untuk dianalisis. Upload dataset pertama Anda untuk memulai." | [Upload Dataset] |
| Investigation Queue | "Tidak ada kasus yang memerlukan perhatian. Semua sinyal risiko telah ditinjau." | — |
| Investigations | "Belum ada investigasi. Mulai investigasi dari Investigation Queue." | [Buka Investigation Queue] |
| Claims | "Belum ada klaim ditemukan. Import dataset untuk memulai." | [Import Data] |
| Providers | "Data provider belum tersedia. Import dataset yang berisi informasi provider." | [Import Data] |
| Risk Intelligence | "Analisis risiko belum tersedia. Jalankan risk analysis terlebih dahulu." | [Jalankan Analisis] |
| AI Copilot | Welcome screen with icon, "Apa yang ingin Anda investigasi?" + 5 suggested prompts | — |
| Data Management | "Belum ada dataset. Upload file CSV untuk memulai." | [Upload CSV] |
| Reports | "Belum ada laporan investigasi. Generate laporan dari Investigation Workspace." | — |

## Notification flow

```text
Risk Engine detects critical finding
  ↓
System creates notification record
  ↓
Bell icon shows unread count
  ↓
User clicks bell → Notification panel (slide-over)
  ↓
User clicks notification → Navigate to entity (claim/investigation/dataset)
  ↓
Notification marked as read
```

### Notification panel design
- Slide-over panel from right
- Grouped by: Today, Yesterday, Earlier
- Each notification shows: icon, title, description, timestamp, action link
- "Tandai semua sudah dibaca" action at top
- Maximum 50 recent notifications displayed

## Error recovery flows

### Gemini API failure
```text
User triggers AI action
  ↓
Gemini fails (timeout/error)
  ↓
Show: "Analisis AI tidak dapat diselesaikan. Evidence yang tersedia tetap dapat diakses."
  ↓
Display: deterministic risk signals only (no AI synthesis)
  ↓
Offer: [Coba Lagi] button
```

### Data upload failure
```text
User uploads CSV
  ↓
Validation fails
  ↓
Show: specific error (file too large / wrong format / encoding issue)
  ↓
Show: guidance for resolution
  ↓
Offer: [Upload Ulang] button
```

### Network/API failure
```text
API request fails
  ↓
Show: inline error message (not full-page error)
  ↓
Show: stale cached data if available
  ↓
Offer: [Muat Ulang] button
```

## Responsive adaptation rules

### Desktop (>= 1440px)
Full layout as designed. Sidebar always visible.

### Laptop (1024px - 1439px)
- Sidebar slightly narrower (200px → 180px)
- Cards reduce horizontal padding
- Investigation Workspace: AI panel reduces to 30% width
- Network Graph: same layout, smaller canvas

### Tablet (768px - 1023px)
- Sidebar collapses to icon-only rail, expands as drawer on tap
- Investigation Workspace: stacked layout (evidence full-width, AI panel below or in a collapsible drawer)
- Investigation Queue: card view becomes default (no table view)
- Network Graph: simplified view with fewer visible nodes
- Command Center: 2-column grid becomes single column for metric cards

### Mobile (< 768px)
Out of MVP scope. Show a graceful message: "Untuk pengalaman terbaik, gunakan perangkat desktop atau tablet."
