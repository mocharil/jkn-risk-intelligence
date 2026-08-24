# Accessibility and Internationalization

## Accessibility target

WCAG 2.1 Level AA for critical investigation paths.

Critical paths:
1. Login → Command Center → Investigation Queue → Open Case → Review Evidence → Ask AI → Change Status
2. Claims search → Claim detail → Create Investigation
3. AI Copilot → Ask question → Review answer → Navigate to entity

## Keyboard navigation

### Global
- `Tab` / `Shift+Tab` to move between interactive elements
- `Enter` or `Space` to activate buttons and links
- `Escape` to close modals, panels, and drawers
- `Ctrl+K` or `/` to focus global search
- Arrow keys for menu navigation within sidebar

### Investigation Workspace
- `Tab` through workspace tabs (Overview, Evidence, Timeline, etc.)
- `Enter` to select tab
- `Tab` into tab content
- AI Investigator panel reachable via `Tab` from main content

### Network Graph
- `Tab` to focus graph canvas
- Arrow keys to navigate between nodes
- `Enter` to select node (opens detail panel)
- `Escape` to deselect

### Data tables
- `Tab` to reach table
- Arrow keys to navigate rows/columns
- `Enter` to open row action/detail

## ARIA guidelines

### Landmarks
```html
<nav aria-label="Navigasi utama">           <!-- Sidebar -->
<main aria-label="Konten utama">            <!-- Main content area -->
<aside aria-label="Panel AI Investigator">  <!-- AI panel -->
<header aria-label="Header aplikasi">       <!-- Top bar -->
<search aria-label="Pencarian global">      <!-- Global search -->
```

### Live regions
- Notification count: `aria-live="polite"` on bell badge
- AI streaming response: `aria-live="polite"` on response container
- Risk analysis progress: `aria-live="assertive"` for completion
- Toast messages: `role="status"` with `aria-live="polite"`

### Risk score accessibility
Risk scores must always convey information through three channels:
1. **Numeric value**: "94"
2. **Text label**: "CRITICAL"
3. **Icon**: Warning triangle / shield icon

```html
<span aria-label="Risk Score 94, Critical">
  <span class="risk-score">94</span>
  <span class="risk-icon" aria-hidden="true">⚠</span>
  <span class="risk-label">CRITICAL</span>
</span>
```

### Chart accessibility
- Every chart has an `aria-label` describing what it shows
- Data tables as alternative to charts (togglable via "Lihat sebagai tabel" link)
- Indonesia map provinces have `aria-label` with province name and risk summary

### Form accessibility
- All inputs have visible labels (not placeholder-only)
- Required fields marked with `aria-required="true"` and visible asterisk
- Validation errors associated via `aria-describedby`
- Error messages include specific guidance for resolution

## Color contrast

### Minimum ratios (WCAG AA)

| Element | Ratio requirement | Verification |
|---|---|---|
| Normal text (< 18px) | >= 4.5:1 | Primary text #16332A on white #FFFFFF = 14.5:1 ✓ |
| Large text (>= 18px bold) | >= 3:1 | Secondary text #52665F on white = 7.2:1 ✓ |
| UI components | >= 3:1 | Green #00A651 on white = 3.8:1 ✓ |
| Critical risk red | >= 3:1 | Red #D92D20 on white = 5.3:1 ✓ |
| Medium risk amber | >= 3:1 | Amber #F79009 on white = 2.9:1 ⚠ |

Note: Amber on white (#F79009) is borderline. Use #C27803 (darker amber) for text, or use amber only on dark backgrounds. Amber risk pills should use amber background with dark text.

## Focus management

### Rules
- Focus visible indicator: 2px solid #00A651 outline with 2px offset
- When modal opens: focus moves to first interactive element in modal
- When modal closes: focus returns to the element that opened it
- When side panel opens: focus moves to panel heading
- When tab switches: focus moves to the tab panel content
- Skip-to-main link as first focusable element

### Implementation
```css
:focus-visible {
  outline: 2px solid #00A651;
  outline-offset: 2px;
}
```

## Screen reader testing

MVP: Test with VoiceOver (macOS) or NVDA (Windows) on:
- Login flow
- Command Center navigation
- Investigation Queue → open case
- AI Copilot question/answer cycle

---

## Internationalization (i18n)

### Language strategy

Primary UI language: **Bahasa Indonesia** for user-facing labels.

English is retained for:
- Technical terms used across the industry
- Code-facing identifiers
- API field names and developer documentation

### Label categories

#### Always in Bahasa Indonesia
- Navigation labels: "Pusat Komando", "Antrian Investigasi", "Investigasi", "Klaim", "Penyedia Layanan", "Intelijen Risiko", "Manajemen Data", "Laporan", "Pengaturan"
- Action buttons: "Investigasi", "Buat Laporan", "Tandai False Positive", "Konfirmasi Risiko", "Butuh Bukti Tambahan"
- Status labels: "Dalam Investigasi", "Butuh Bukti", "Risiko Dikonfirmasi", "False Positive", "Ditutup"
- Empty states and system messages
- Date and time descriptions ("4 menit yang lalu", "Hari ini", "Kemarin")

#### Always in English (technical terms)
- Risk types: "Upcoding", "Phantom Billing", "Cloning", "Abnormal LOS"
- Technical labels: "Risk Score", "AI Copilot", "Network Graph", "Schema Mapping"
- System identifiers: "CLM-10293", "INV-2026-010293"
- Model names: "Gemini Intelligence"

#### Flexible (use most natural option)
- "Command Center" or "Pusat Komando" — either is acceptable
- "Evidence" or "Bukti" — either is acceptable
- "Provider" or "Penyedia Layanan" — either is acceptable
- Keep consistent once chosen

### Currency formatting

```typescript
// Indonesian Rupiah formatting
const formatRupiah = (amount: number): string => {
  if (amount >= 1_000_000_000_000) {
    return `Rp ${(amount / 1_000_000_000_000).toFixed(1)}T`;
  }
  if (amount >= 1_000_000_000) {
    return `Rp ${(amount / 1_000_000_000).toFixed(1)}B`;
  }
  if (amount >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toFixed(1)}M`;
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
};

// Examples:
// 18450000      → "Rp 18,45M" or "Rp 18.450.000"
// 824600000000  → "Rp 824,6B"
// 42800000000   → "Rp 42,8B"
```

### Number formatting

```typescript
// Indonesian number formatting (dot as thousand separator)
const formatNumber = (n: number): string => {
  return new Intl.NumberFormat('id-ID').format(n);
};

// Examples:
// 1284392  → "1.284.392"
// 47281    → "47.281"
// 94       → "94"
```

### Date formatting

```typescript
// Indonesian date formatting
// Full: "23 Agustus 2026"
// Short: "23 Agu 2026"
// Relative: "4 menit yang lalu", "2 jam yang lalu", "Kemarin"
```

### MVP implementation approach

Use a centralized string constants file:

```typescript
// lib/strings.ts
export const STRINGS = {
  nav: {
    commandCenter: 'Command Center',
    investigationQueue: 'Antrian Investigasi',
    investigations: 'Investigasi',
    claims: 'Klaim',
    providers: 'Penyedia Layanan',
    riskIntelligence: 'Risk Intelligence',
    aiCopilot: 'AI Copilot',
    dataManagement: 'Manajemen Data',
    reports: 'Laporan',
    settings: 'Pengaturan',
  },
  actions: {
    investigate: 'Investigasi',
    generateReport: 'Buat Laporan',
    confirmRisk: 'Konfirmasi Risiko',
    markFalsePositive: 'Tandai False Positive',
    needEvidence: 'Butuh Bukti Tambahan',
    retry: 'Coba Lagi',
    upload: 'Unggah',
    export: 'Ekspor',
  },
  // ... more sections
} as const;
```

This pattern enables future i18n extraction without runtime overhead for MVP.
