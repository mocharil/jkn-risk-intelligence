# Vibecoding Prompt Pack

Use one phase at a time.

## Global context prompt

```text
You are implementing the JKN Risk Intelligence Platform MVP.

Stack:
- Next.js App Router (14+)
- TypeScript strict mode
- Tailwind + shadcn/ui
- Vercel
- Supabase PostgreSQL, pgvector, Auth, Storage, Realtime
- Gemini through server-side authentication
- TanStack React Query for server state
- Zustand for client state
- Recharts for charts
- react-force-graph-2d for network graph
- react-simple-maps or custom SVG for Indonesia map

Design direction:
- Light-mode BPJS Kesehatan healthcare interface
- White + green institutional visual identity
- 70% clean healthcare / 20% intelligence / 10% futuristic AI
- Do NOT use dark mode or cyberpunk aesthetic

Engineering rules:
- TypeScript strict mode.
- Never expose secrets client-side.
- Use Zod at external boundaries.
- Risk detectors consume only the canonical schema.
- Use deterministic logic before LLM calls.
- Gemini outputs must be structured and validated.
- Use synthetic data only.
- Add tests for deterministic business logic.
- Do not implement functionality outside the current phase.

Localization rules:
- All currency in Indonesian Rupiah (Rp).
- All provider and patient names use Indonesian conventions.
- Use Bahasa Indonesia for user-facing labels where natural.
- Technical terms (Risk Score, Upcoding, Phantom Billing, AI Copilot) remain in English.
- Number formatting: Indonesian locale (dot as thousand separator).
- Date formatting: Indonesian locale or relative ("4 menit yang lalu").

Accessibility rules:
- All interactive elements keyboard-navigable.
- Risk scores show numeric value + label + icon (not color-only).
- All form inputs have visible labels.
- ARIA landmarks on major page regions.
- Focus visible indicator on all interactive elements.

Responsive rules:
- Desktop-first (1440px primary).
- Support laptop (1024px) and tablet (768px).
- Sidebar collapses to icon rail on tablet.
- Use dynamic imports for heavy components.
```

## Working style

For every phase ask the coding agent to:

1. Inspect existing repository before editing.
2. State the implementation plan.
3. Modify the smallest coherent set of files.
4. Run lint/typecheck/tests.
5. Fix failures before stopping.
6. Summarize changed files.
7. State remaining known limitations.

The detailed phase prompts live in `phases/`.
