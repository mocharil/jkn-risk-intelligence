# Technical Architecture

## MVP stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14+ App Router + TypeScript strict |
| UI | Tailwind CSS + shadcn/ui |
| Hosting | Vercel (hobby plan) |
| Backend | Next.js Route Handlers / Server Actions |
| Database | Supabase PostgreSQL |
| Vector | Supabase pgvector |
| Storage | Supabase Storage |
| Authentication | Supabase Auth |
| AI | Gemini (server-side only) |
| Validation | Zod |
| Server State | TanStack React Query v5 |
| Client State | Zustand |
| Charts | Recharts |
| Network Graph | react-force-graph-2d or d3-force with Canvas |
| Indonesia Map | Custom SVG (react-simple-maps or inline SVG) |
| Date Formatting | date-fns with Indonesian locale |
| Number Formatting | Intl.NumberFormat with id-ID locale |

## Architecture

```text
Browser
   ↓
Next.js / Vercel
   ↓
Server-side API / Orchestrator
   ├── Supabase PostgreSQL
   ├── pgvector
   ├── Supabase Storage
   ├── Supabase Realtime (notifications)
   ├── Rule Engine
   └── Gemini Gateway
```

Gemini must never be called directly from the browser.

## State management strategy

### Server state (TanStack React Query)
- All API data fetching, caching, and synchronization
- Stale-while-revalidate pattern for dashboard data
- Background refetching with configurable intervals
- Optimistic updates for investigation status changes

Cache invalidation rules:
- Investigation status change → invalidate queue and investigation list
- New risk analysis → invalidate dashboard KPIs and risk signals
- Data import complete → invalidate all claim and provider queries

### Client state (Zustand)
- Sidebar open/collapse state
- Active filters and search terms
- Network graph selected node
- Map selected region
- Notification panel open state
- Current investigation workspace tab
- AI Copilot conversation history (session-scoped)

### State persistence
- Zustand persisted to sessionStorage for tab-scoped state
- URL query parameters for shareable state (filters, selected claim, active tab)
- No localStorage for sensitive investigation data

## Performance strategy

### Database query optimization
- Materialized views for Command Center KPIs (refresh on analysis completion)
- Composite indexes on (provider_id, risk_level), (risk_score DESC), (status, created_at)
- Partial indexes for high-risk claims (WHERE risk_score >= 75)
- Paginated queries with cursor-based pagination for large datasets

### Frontend performance
- Next.js App Router with server components by default
- Client components only where interactivity is required
- Dynamic imports for heavy components (network graph, Indonesia map, charts)
- React.lazy + Suspense for route-level code splitting
- Virtual scrolling for claims table (> 100 rows)
- Debounced search inputs (300ms)
- Image optimization via next/image

### Caching layers

| Layer | Strategy | TTL |
|---|---|---|
| Browser | React Query stale time | 30 seconds (dashboard), 5 minutes (static data) |
| CDN | Vercel Edge Cache | Static assets only |
| Database | Materialized views | Refresh on demand |
| AI responses | Stored in ai_runs table | Permanent (keyed by prompt + evidence version) |

### API response targets

| Endpoint type | p95 target |
|---|---|
| Dashboard KPIs | < 200ms |
| Claims list (paginated) | < 300ms |
| Claim detail | < 200ms |
| Investigation workspace | < 400ms |
| Risk Intelligence aggregation | < 500ms |
| AI Copilot (streaming first token) | < 2 seconds |
| AI analysis (batch) | < 10 seconds |

## Real-time strategy

MVP uses a hybrid approach:

### Supabase Realtime (push)
- New notification events → bell icon update
- Investigation status changes → queue auto-refresh

### Polling (pull)
- Command Center KPIs: poll every 60 seconds when tab is active
- Emerging risk signals: poll every 120 seconds
- Use React Query refetchInterval with focus-aware pausing

### Streaming (SSE)
- AI Copilot responses: Server-Sent Events for token streaming
- Investigation AI synthesis: SSE for progress indication

## Geographic rendering strategy

### Indonesia Risk Map
- **Approach**: Pre-built SVG of Indonesian provinces (34 provinces)
- **Library**: react-simple-maps with custom Indonesia TopoJSON, or inline SVG for maximum control
- **Rendering**: SVG (sufficient for 34 province polygons)
- **Interactivity**: Hover for tooltip, click for region intelligence panel
- **Risk overlay**: Province fill color based on risk level (green → amber → red gradient)
- **Hotspot nodes**: Positioned at province centroids with pulse animation
- **Data source**: GeoJSON from Natural Earth or BPS (Badan Pusat Statistik)
- **Performance**: Static SVG paths, only risk data is dynamic

### Fallback
If geographic rendering has issues at demo time, use a schematic grid-based Indonesia layout as fallback.

## Graph rendering strategy

### Network Graph
- **Library**: react-force-graph-2d (Canvas-based, handles 500+ nodes smoothly)
- **Fallback**: d3-force with manual Canvas rendering
- **Node types**: Provider (large green), Doctor (medium dark green), Patient (medium blue), Claim (small teal), Diagnosis (small cyan), Procedure (small gray-blue)
- **Edge rendering**: Normal = light gray, suspicious = orange/red with increased width
- **Selected node**: Green outline with subtle glow
- **Performance cap**: Maximum 200 visible nodes at a time; filter/collapse distant nodes
- **Interactivity**: Click node → side panel with entity detail; drag to rearrange; zoom/pan

### Canvas vs SVG decision
- < 100 nodes: SVG (crisper text, easier styling)
- >= 100 nodes: Canvas (better performance)
- react-force-graph-2d handles this automatically

## Error boundary architecture

```text
RootLayout
  └── GlobalErrorBoundary (catches unhandled errors, shows recovery UI)
      └── DashboardLayout
          ├── SidebarErrorBoundary (sidebar failure doesn't kill main content)
          └── MainContent
              ├── PageErrorBoundary (per-route error handling)
              │   ├── DataFetchErrorBoundary (API failures → inline retry)
              │   └── ChartErrorBoundary (chart render failure → fallback message)
              └── AIPanel
                  └── AIErrorBoundary (Gemini failure → deterministic signals fallback)
```

Error boundaries must:
- Log errors to console (and optionally to an error tracking service)
- Show user-friendly Indonesian error messages
- Offer retry actions where possible
- Never expose stack traces or technical details to the user

## Suggested repository

```text
app/
  (auth)/
    login/
    register/
  (dashboard)/
    command-center/
    investigation-queue/
    investigations/[id]/
    claims/
    claims/[id]/
    providers/
    providers/[id]/
    risk-intelligence/
    copilot/
    data-management/
    reports/
    reports/[id]/
    settings/
  api/
    dashboard/
    claims/
    claims/[id]/
    claims/[id]/analyze/
    providers/
    providers/[id]/
    investigation-queue/
    investigations/
    investigations/[id]/
    copilot/
    datasets/
    datasets/[id]/mapping/
    datasets/[id]/normalize/
    notifications/
    risk-intelligence/
    reports/
    reports/[id]/

components/
  ui/              # shadcn/ui primitives
  layout/          # sidebar, top-bar, error boundaries
  charts/          # recharts wrappers
  claims/          # claim card, claim table, claim preview
  investigation/   # workspace tabs, evidence board, timeline
  risk/            # risk badge, risk pill, risk score
  providers/       # provider card, peer comparison
  map/             # Indonesia SVG map, region panel
  network/         # graph canvas, node detail panel
  ai/              # copilot chat, AI analysis card, AI briefing
  notifications/   # notification panel, notification item
  data/            # schema mapping, data quality, import history

hooks/
  use-claims.ts
  use-investigations.ts
  use-providers.ts
  use-dashboard.ts
  use-notifications.ts
  use-copilot.ts
  use-risk-intelligence.ts

store/
  ui-store.ts           # sidebar, panels, active tabs
  filter-store.ts       # search and filter state
  map-store.ts          # selected region
  network-store.ts      # selected node, zoom level

lib/
  ai/
    gemini-client.ts
    prompts.ts
    schemas.ts
    streaming.ts
  risk/
    detector.ts
    upcoding.ts
    cloning.ts
    phantom-billing.ts
    abnormal-los.ts
    scoring.ts
  data/
    canonical-schema.ts
    adapters/
    validators/
  supabase/
    client.ts
    server.ts
    realtime.ts
  formatting/
    currency.ts         # Rupiah formatting
    date.ts             # Indonesian date formatting
    number.ts           # Indonesian number formatting
  geo/
    indonesia.json      # TopoJSON or GeoJSON
    provinces.ts        # Province metadata and coordinates

types/
  claim.ts
  investigation.ts
  provider.ts
  risk.ts
  notification.ts
  dataset.ts

supabase/
  migrations/
  seed/

tests/
  unit/
  integration/
  e2e/

public/
  indonesia.svg        # Fallback static map
```

## Key interfaces

```ts
interface RiskDetector {
  type: RiskType;
  analyze(context: ClaimContext): Promise<RiskFinding>;
}

type RiskType = 'UPCODING' | 'CLONING' | 'PHANTOM_BILLING' | 'ABNORMAL_LOS';

interface RiskFinding {
  risk_type: RiskType;
  risk_score: number;       // 0-100
  confidence: number;       // 0-1
  verdict: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  summary: string;
  evidence: EvidenceItem[];
  missing_evidence: string[];
  recommended_actions: string[];
  limitations: string[];
}
```

Detectors must depend on the canonical schema, never raw source columns.
