# Responsive Design Strategy

## Design philosophy

Desktop-first, with graceful adaptation for smaller screens.

The platform is primarily used by investigators at their desks. Tablet support enables supervisors to review dashboards in meetings. Mobile is out of scope for MVP.

## Breakpoint system

| Breakpoint | Name | Target devices | Layout behavior |
|---|---|---|---|
| >= 1440px | Desktop | External monitors, large laptops | Full layout as designed |
| 1024px - 1439px | Laptop | Standard laptops, small desktops | Compressed sidebar, reduced spacing |
| 768px - 1023px | Tablet | iPad, Android tablets | Collapsible sidebar, stacked layouts |
| < 768px | Mobile | Out of MVP scope | Graceful fallback message |

### CSS implementation

```css
/* Tailwind breakpoints */
/* Default: mobile-first base (not used for MVP) */
/* md: 768px  — tablet */
/* lg: 1024px — laptop */
/* xl: 1440px — desktop (primary design target) */
```

Since MVP is desktop-first, implement responsive as "desktop default, override down":
```css
/* Desktop default styles */
.sidebar { width: 240px; }

/* Laptop override */
@media (max-width: 1439px) { .sidebar { width: 200px; } }

/* Tablet override */
@media (max-width: 1023px) { .sidebar { width: 60px; /* icon rail */ } }

/* Mobile fallback */
@media (max-width: 767px) { .mobile-message { display: block; } }
```

## Sidebar behavior

### Desktop (>= 1440px)
- Fixed left sidebar, always visible
- Width: 240px
- Full navigation labels with icons
- User profile at bottom
- "Ask JKN Intelligence" button at bottom

### Laptop (1024px - 1439px)
- Fixed left sidebar, always visible
- Width: 200px
- Slightly smaller text
- Navigation labels visible

### Tablet (768px - 1023px)
- Collapsed to icon-only rail (60px width)
- Tap hamburger icon to expand as drawer overlay
- Drawer overlays main content with semi-transparent backdrop
- Close on backdrop tap or navigation selection

### Mobile (< 768px)
- Hidden completely
- Show message: "Untuk pengalaman terbaik, gunakan perangkat desktop atau tablet."

## Per-screen responsive rules

### Command Center

| Element | Desktop | Laptop | Tablet |
|---|---|---|---|
| KPI cards | 4 columns | 4 columns (smaller) | 2 columns, then 2 below |
| Indonesia Map | 60% width | 55% width | Full width |
| AI Briefing | 40% width (side) | 45% width (side) | Full width (below map) |
| Emerging Signals | 3 columns | 3 columns (smaller) | 2 columns |
| Charts section | 2 columns | 2 columns | 1 column stack |

### Investigation Queue

| Element | Desktop | Laptop | Tablet |
|---|---|---|---|
| Filter bar | Horizontal | Horizontal (compressed) | Collapsible filter panel |
| Queue items | Card/table toggle | Card/table toggle | Card view only |
| Card width | Full width rows | Full width rows | Full width rows |
| AI priority text | Visible | Visible | Collapsed (expand on tap) |

### Investigation Workspace

| Element | Desktop | Laptop | Tablet |
|---|---|---|---|
| Layout | 65/35 split | 65/35 split (narrower AI) | Full-width stacked |
| Evidence workspace | Left 65% | Left 65% | Full width |
| AI Investigator | Right 35% | Right 35% | Collapsible drawer (bottom sheet) |
| Tab navigation | Horizontal tabs | Horizontal tabs | Scrollable horizontal tabs |
| Action bar | Fixed bottom | Fixed bottom | Fixed bottom (compact) |

Tablet AI panel behavior:
- Initially collapsed as a small floating button: "✦ AI Investigator"
- Tap to expand as bottom sheet (70% height)
- Drag handle to resize
- Dismiss by swipe down or close button

### Claims Intelligence

| Element | Desktop | Laptop | Tablet |
|---|---|---|---|
| Filter area | Horizontal row | Horizontal row | Collapsible panel |
| Table | Full table with all columns | Table with priority columns | Simplified card list |
| Side preview | Right panel (40%) | Right panel (35%) | Full-screen modal |
| Pagination | Bottom of table | Bottom of table | Bottom of list |

Tablet column priority (show in order, hide excess):
1. Claim ID
2. Provider
3. Risk Score
4. Status
5. Amount (hide on very narrow)
6. LOS (hide on narrow)

### Risk Intelligence

| Element | Desktop | Laptop | Tablet |
|---|---|---|---|
| Tab navigation | Horizontal | Horizontal | Scrollable horizontal |
| Risk Map | Large with side panel | Full width, panel below | Full width, panel below |
| Network Graph | Large canvas with side panel | Full width, panel below | Simplified view (fewer nodes) |
| Emerging Patterns | 2-column cards | 2-column cards | 1-column cards |

### AI Copilot

| Element | Desktop | Laptop | Tablet |
|---|---|---|---|
| Layout | Centered column (max 800px) | Centered column | Full width with padding |
| Suggested prompts | Horizontal row | Horizontal row | Vertical stack |
| Results | Below input | Below input | Below input |
| Result cards | 2 columns | 2 columns | 1 column |

### Data Management — Schema Mapping

| Element | Desktop | Laptop | Tablet |
|---|---|---|---|
| Two-column mapping | Side by side with visual connections | Side by side (compressed) | Stacked (source above, target below) |
| Connection lines | Visible SVG lines | Visible SVG lines | Hidden (show as dropdown instead) |

### Reports

| Element | Desktop | Laptop | Tablet |
|---|---|---|---|
| Report cards | 4 columns | 3 columns | 2 columns |
| Report detail | Full layout | Full layout | Sections stacked vertically |

### Login

Responsive by default. Center-aligned form works at all breakpoints.

## Touch interaction considerations (tablet)

- Minimum touch target: 44px × 44px
- Hover states replaced with active/pressed states
- Tooltip information accessible via long-press or info icon
- Swipe gestures:
  - Notification panel: swipe right to dismiss
  - Investigation Queue cards: swipe left for quick actions
  - AI Investigator panel: swipe down to minimize
- No drag-and-drop for schema mapping on tablet (use dropdowns instead)

## Typography scaling

| Breakpoint | Base font | H1 | H2 | Body |
|---|---|---|---|---|
| Desktop | 16px | 30px | 24px | 14px |
| Laptop | 16px | 28px | 22px | 14px |
| Tablet | 16px | 26px | 20px | 14px |

Body text stays at 14px for readability. Only headings scale down.

## Priority screens for responsive polish

Implement responsive in this order (highest priority first):

1. **Login** — must work everywhere (simplest)
2. **Command Center** — first screen after login
3. **Investigation Queue** — primary workflow entry
4. **Investigation Workspace** — most complex layout
5. **Claims Intelligence** — frequently used data table
6. **AI Copilot** — important demo feature
7. **Risk Intelligence** — complex visualizations
8. **Data Management** — schema mapping complexity
9. **Reports** — simple card layout
10. **Settings** — simple form layout

## Testing responsive

- Chrome DevTools device emulation at each breakpoint
- Real device testing on iPad (if available)
- Screenshot comparison at 1440px, 1024px, and 768px
- Verify no horizontal scrolling at any supported breakpoint
- Verify no overlapping or truncated text
- Verify all interactive elements meet 44px minimum touch target on tablet
