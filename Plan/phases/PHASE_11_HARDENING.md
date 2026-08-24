# Phase 11 - Hardening

## Goal
Make the MVP reliable enough for hackathon judging.

## Build

### Testing
- Unit test completion (all four detectors, scoring, formatting, validation)
- API integration tests (all endpoint categories)
- Playwright E2E golden flow (login → command center → investigation → copilot → decision → data mapping)
- Accessibility audit with axe-core (zero critical violations on main screens)
- Keyboard navigation test on critical investigation path

### Quality
- Loading states on all screens (with Bahasa Indonesia messages)
- Error states with retry actions on all screens
- Empty states on all screens (with guidance and CTAs)
- Request logging and basic request timing

### Performance
- Run Lighthouse CI and verify Core Web Vitals targets:
  - LCP < 2.5s
  - FID < 100ms
  - CLS < 0.1
- Dynamic imports for Indonesia Map, Network Graph, and Charts
- Virtual scrolling on Claims table if > 50 rows
- React Query staleTime configuration per data type
- Debounced search inputs (300ms)

### Security
- Rate limiting on AI and upload endpoints
- AI timeout/failure fallback (show deterministic signals only)
- File upload validation (type, size, encoding)
- Security review: no secrets in client bundle, RLS enabled, CSP headers
- npm audit with zero critical vulnerabilities

### Responsive
- Verify all priority screens at 1024px and 768px
- Sidebar collapses on tablet
- No horizontal scrolling on supported breakpoints
- No overlapping or truncated critical information

### Accessibility
- All form inputs have labels
- Risk scores show value + label + icon
- Focus indicators visible on all interactive elements
- ARIA landmarks on major page regions
- Color contrast verified (4.5:1 minimum for text)

## Exit criteria
- lint passes
- typecheck passes
- unit tests pass (>= 80% coverage on business logic)
- integration tests pass
- golden demo E2E passes
- axe-core: zero critical/serious violations on 5 main screens
- Lighthouse: all Core Web Vitals in green
- app remains useful when Gemini temporarily fails
- no critical npm vulnerabilities
- responsive layout verified at 1024px and 768px

## Vibecoding prompt
Implement Phase 11 only. Do not add new product features. Harden the existing MVP: complete test coverage, improve loading/error/empty states, add accessibility audit compliance, optimize performance (dynamic imports, virtual scrolling, debouncing), verify responsive layouts, and run the complete quality suite. Fix all failures before stopping.
