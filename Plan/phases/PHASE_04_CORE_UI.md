# Phase 4 - Core Read UI

## Goal
Make normalized data explorable before adding intelligence.

## Build
- Claims page with search, filters, and paginated table
- Claim detail with diagnoses, procedures, evidence, and service info
- Side preview panel on claim row click
- Providers page with search, filters, and provider cards
- Provider detail with risk profile, claim history, and peer comparison placeholder
- Global search functionality
- Indonesian Rupiah formatting on all amounts
- Indonesian date formatting
- Loading states ("Memuat data klaim...")
- Empty states ("Belum ada klaim ditemukan. Import dataset untuk memulai.")
- Error states with retry ("Gagal memuat data. [Coba Lagi]")
- Responsive layouts for desktop and laptop (1024px+)

## Exit criteria
- UI reads from Supabase, not hard-coded arrays.
- Claim and provider drill-down works.
- All amounts display in Rupiah format (e.g., Rp 18.450.000).
- All provider names are Indonesian.
- Responsive core layouts work at 1024px width.
- Loading, empty, and error states are implemented.
- Side preview panel opens on claim click.
- Keyboard navigation works for claim table (Tab, Enter).

## Vibecoding prompt
Implement Phase 4 only. Build Claims and Providers screens using real Supabase queries against seeded synthetic data. Follow the light-mode BPJS healthcare design direction with white backgrounds and green accents. All amounts must display in Indonesian Rupiah format. All names must be Indonesian. Include loading, empty, and error states in Bahasa Indonesia. Implement responsive layouts for 1024px+ widths. Prioritize information hierarchy and usability.
