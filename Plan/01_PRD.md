# Product Requirements Document

## Vision

JKN Risk Intelligence Platform is an AI-assisted investigation workspace that helps reviewers identify, prioritize, understand, and investigate suspicious healthcare claims.

It is not an autonomous fraud judge. It is a decision-support system.

## Users

### Investigator
Needs a prioritized queue, evidence, explanations, and a clear case workflow.

### Risk / Fraud Analyst
Needs cross-claim and provider-level pattern analysis.

### Decision Maker
Needs exposure, emerging risks, provider hotspots, and concise AI briefing.

### Data Admin
Needs to onboard differently structured source datasets.

## Primary value proposition

Instead of only returning a fraud probability, the platform answers:

- What looks suspicious?
- Why?
- What evidence supports the finding?
- Are there similar historical patterns?
- What should an investigator check next?

## MVP risk types

### Upcoding
Detect inconsistency between claimed severity/billing and available clinical evidence.

### Cloning
Detect suspicious semantic similarity between claim narratives.

### Phantom Billing
Detect billed procedures or services without supporting evidence.

### Abnormal LOS
Detect length-of-stay that significantly exceeds comparable cases for the same diagnosis and severity level.

## Product principles

- Evidence first
- Human in the loop
- Hybrid AI, not LLM-only
- Source agnostic
- Explainable
- Cost conscious
- Modular and extensible

## Accessibility requirements

Target: WCAG 2.1 Level AA for critical investigation paths.

- All interactive elements must be keyboard-navigable
- Risk scores must not rely solely on color (always show numeric score + label + icon)
- Minimum color contrast ratio 4.5:1 for normal text, 3:1 for large text
- All form inputs must have associated labels
- ARIA landmarks on all major page regions (navigation, main, complementary)
- Focus must be visible and logically ordered
- Charts and visualizations must have text alternatives or summary descriptions
- AI Copilot responses must be accessible to screen readers
- Modal dialogs must trap focus and be dismissible via keyboard

## Internationalization strategy

Primary language: Bahasa Indonesia for user-facing labels where natural.

English is retained for:
- Technical terms (Risk Score, AI Copilot, Upcoding, Phantom Billing, Network Intelligence)
- Code-facing identifiers
- API responses and developer documentation

Formatting rules:
- Currency: Indonesian Rupiah (Rp 18.450.000 or Rp 18,45M)
- Dates: DD MMM YYYY or relative ("4 menit yang lalu")
- Numbers: Indonesian locale (1.284.392 for thousand separators)
- Percentages: 94% (universal format)

MVP approach: Hard-coded Bahasa Indonesia strings with a consistent naming convention. Full i18n framework (next-intl) is out of scope but the codebase should use a centralized string/label pattern to enable future extraction.

## Responsive requirements

Primary target: 1440px desktop.

| Breakpoint | Layout adaptation |
|---|---|
| >= 1440px | Full layout as designed |
| 1024px - 1439px | Slightly compressed sidebar, reduced card padding |
| 768px - 1023px | Collapsible sidebar (drawer), stacked investigation workspace, simplified network graph |
| < 768px | Out of MVP scope (graceful fallback, not optimized) |

Priority screens for responsive polish:
1. Command Center
2. Investigation Queue
3. Investigation Workspace
4. Claims Intelligence

## Onboarding experience

### First-time login
1. Welcome modal explaining the platform purpose
2. Guided prompt to upload first dataset or use demo data
3. Tooltip highlights on key navigation items (Command Center, Investigation Queue, AI Copilot)

### First-time investigation
1. Contextual tooltip explaining risk indicators
2. Brief explanation of AI Investigator panel
3. Suggested first action prompt

### Empty states
Every screen must have a meaningful empty state:
- Command Center: "Upload your first dataset to begin risk analysis"
- Investigation Queue: "No cases requiring attention. All risk signals have been reviewed."
- Claims: "No claims found. Import a dataset to get started."
- AI Copilot: Welcome screen with suggested investigation questions

## Notification requirements

### Notification types

| Type | Trigger | Priority |
|---|---|---|
| New critical risk signal | Risk engine detects critical (>= 90) finding | High |
| Emerging pattern detected | AI identifies new cluster or trend | High |
| Investigation status change | Case moves to new status | Medium |
| Data import complete | Dataset normalization finishes | Medium |
| AI analysis complete | Gemini completes batch analysis | Low |

### Notification behavior
- Bell icon in top bar with unread count badge
- Notification panel (slide-over, not a separate page)
- Click-to-navigate to relevant entity (claim, investigation, dataset)
- Mark as read / mark all as read
- MVP: In-app notifications only (no email/push)

## Success criteria

- Complete demo works end to end within 5 minutes.
- All four risk types generate structured findings with evidence.
- Findings show evidence or `INSUFFICIENT_EVIDENCE`.
- Synthetic ground truth enables measurable evaluation (F1 >= 0.7 for deterministic detectors).
- A second CSV schema can be onboarded without changing detector code.
- Gemini credentials never reach the browser.
- All amounts display in Indonesian Rupiah format.
- All provider and patient names use Indonesian conventions.
- Critical investigation path is keyboard-navigable.
- Core screens render correctly at 1024px width.
- Indonesia Risk Map displays province-level risk hotspots.
- Network Graph visualizes entity relationships from real synthetic data.
