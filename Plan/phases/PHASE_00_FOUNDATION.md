# Phase 0 - Foundation

## Goal
Create a deployable skeleton with Next.js, Supabase clients, environment validation, layout, and navigation.

## Build
- Next.js App Router + TypeScript strict mode
- Tailwind + shadcn/ui
- Light-mode BPJS healthcare dashboard shell and sidebar
- Sidebar with navigation groups (COMMAND, INVESTIGATION, INTELLIGENCE, DATA, OUTPUT, SYSTEM)
- Top bar with global search, "Ask JKN Intelligence" button, notifications bell, user avatar
- Supabase browser/server clients
- Zod environment validation
- Health endpoint (`/api/health`)
- `.env.example` with all required variables
- TanStack React Query provider setup
- Zustand store skeleton (UI state)
- Error boundary architecture (root, page, data fetch, AI panel)
- Indonesian Rupiah and date formatting utilities (`lib/formatting/`)
- Centralized string constants (`lib/strings.ts`)
- lint/typecheck/test commands

## Do not build yet
Risk logic, Gemini, charts, dataset import, Indonesia map, network graph.

## Exit criteria
- Local app runs with light-mode BPJS healthcare styling.
- Vercel preview deploys successfully.
- All navigation routes render with proper sidebar and top bar.
- Sidebar navigation groups match the design specification.
- No secrets are committed.
- Environment variables validate on startup.
- Formatting utilities produce correct Rupiah output.
- Error boundary wraps main content area.

## Vibecoding prompt
Implement Phase 0 only. Build the project foundation described above. Use a premium light-mode healthcare design with BPJS green (#00A651) as primary color on white backgrounds. Set up the full dashboard shell with sidebar navigation, top bar, React Query provider, and Zustand store. Include Indonesian Rupiah formatting utilities. Inspect the repository first, preserve existing good code, run typecheck and lint, and stop once all Phase 0 exit criteria pass.
