# Performance and Scalability

## Core Web Vitals targets

| Metric | Target | Measurement |
|---|---|---|
| Largest Contentful Paint (LCP) | < 2.5s | Lighthouse CI |
| First Input Delay (FID) | < 100ms | Lighthouse CI |
| Cumulative Layout Shift (CLS) | < 0.1 | Lighthouse CI |
| Time to Interactive (TTI) | < 3.5s | Lighthouse CI |
| First Contentful Paint (FCP) | < 1.5s | Lighthouse CI |

## API response time targets

| Endpoint type | p95 target | Strategy |
|---|---|---|
| Dashboard KPIs | < 200ms | Materialized views |
| Claims list (paginated) | < 300ms | Indexed queries, cursor pagination |
| Claim detail | < 200ms | Single query with joins |
| Provider detail | < 300ms | Indexed queries |
| Investigation workspace | < 400ms | Parallel queries (React Query) |
| Risk Intelligence map | < 300ms | Materialized view |
| Network graph data | < 500ms | Capped node count, indexed relationships |
| AI Copilot (first token) | < 2s | Gemini streaming |
| AI batch analysis | < 10s | Background job with progress |

## Database optimization

### Materialized views
- `mv_dashboard_kpis` — aggregate counts and sums for Command Center
- `mv_provider_risk` — pre-computed provider risk summaries
- `mv_province_risk` — province-level aggregations for Indonesia map
- Refresh strategy: after each risk analysis batch completion

### Indexes
See `04_DATA_AND_DATABASE.md` for complete index specification.

Priority indexes for query performance:
- Claims by provider and risk score (composite)
- Risk findings by claim ID
- Investigations by status and date
- Notifications by user and read status
- Vector index for claim embeddings (IVFFlat)

### Query patterns
- Use cursor-based pagination (not OFFSET) for large result sets
- Limit JOIN depth to 2 levels
- Use `SELECT` only required columns (no `SELECT *`)
- Use `EXPLAIN ANALYZE` during development to verify query plans
- Maximum query timeout: 5 seconds

## Frontend performance

### Code splitting
- Route-level code splitting via Next.js App Router (automatic)
- Dynamic imports for heavy components:
  - `components/map/IndonesiaMap` — loaded only on Command Center and Risk Intelligence
  - `components/network/NetworkGraph` — loaded only on Risk Intelligence and Investigation Network tab
  - `components/charts/*` — loaded only when chart sections are visible
  - AI Copilot panel — loaded on demand

### Lazy loading
```text
Above the fold (eager):
  - Sidebar navigation
  - Page header and KPI cards
  - First visible table rows

Below the fold (lazy):
  - Charts and graphs
  - Indonesia map
  - Evidence board content
  - AI Investigator panel
```

### Virtual scrolling
- Claims table: virtualize when > 50 rows visible
- Investigation queue: virtualize when > 30 items
- Library: @tanstack/react-virtual

### Image and asset optimization
- next/image for all images
- SVG for icons and Indonesia map (inline, not raster)
- Font: Inter via next/font/google (subset, swap display)
- No large background images or decorative assets

### Debouncing and throttling
- Search inputs: 300ms debounce
- Window resize: 150ms throttle
- Scroll events: 100ms throttle
- Map zoom: 200ms debounce

## Caching strategy

### React Query cache

| Data type | staleTime | gcTime | refetchOnWindowFocus |
|---|---|---|---|
| Dashboard KPIs | 30s | 5min | true |
| Claims list | 30s | 5min | true |
| Claim detail | 5min | 30min | false |
| Provider detail | 5min | 30min | false |
| Investigation detail | 30s | 5min | true |
| Province risk data | 5min | 30min | false |
| Network graph data | 5min | 30min | false |
| Reference data (provinces, ICD codes) | 1hr | 2hr | false |
| Notifications | 10s | 1min | true |

### Browser cache
- Static assets: Cache-Control max-age=31536000, immutable (Next.js handles this)
- API responses: no-cache (managed by React Query)

### CDN cache
- Vercel Edge: static assets only
- API routes: no CDN caching (dynamic data)

## Large dataset handling

### 1M+ claims aggregation
- Never fetch all claims to the browser
- Use server-side aggregation (SQL GROUP BY, materialized views)
- Dashboard KPIs come from pre-computed views, not live COUNT(*)
- Claims list is always paginated (max 100 per page)

### Network graph rendering
- Maximum 200 nodes rendered simultaneously
- Nodes beyond 2-hop distance from selected entity are hidden
- "Show more" button to expand visible network
- Canvas rendering for > 100 nodes (react-force-graph-2d)
- SVG rendering for <= 100 nodes (better text quality)

### Indonesia map
- 34 province polygons (SVG) — lightweight, no tile server needed
- Province fill color computed from materialized view
- Hotspot nodes are overlaid circles, not part of SVG geography
- Total SVG size target: < 200KB

## Monitoring (MVP)

### Client-side
- Console logging for API errors
- React Query devtools in development
- Performance marks for critical user interactions

### Server-side
- Vercel function logs for API errors
- Gemini call duration logging in ai_runs table
- Token usage tracking per AI run

### Production considerations (out of scope for MVP)
- Real User Monitoring (RUM) via Vercel Analytics
- Error tracking service (Sentry)
- Database query performance monitoring
- Custom dashboards for system health
