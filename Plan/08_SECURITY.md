# Security and Privacy

## MVP rules

- Use synthetic data only.
- Never commit Service Account JSON.
- Never expose Gemini credentials in client-side code.
- Never prefix server secrets with `NEXT_PUBLIC_`.
- Keep Supabase service-role key server-side.
- Enable Row Level Security where user access exists.
- Validate every uploaded file and model response.
- Do not send unnecessary identifiers or entire datasets to Gemini.

## Environment variables

```text
# Client-safe (exposed to browser)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Server-only (never in browser bundle)
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_MODEL=
GEMINI_API_KEY=
APP_ENV=
```

Google/Gemini Service Account configuration remains server-side and depends on the selected Gemini endpoint/auth mechanism.

## OWASP Top 10 MVP checklist

| Risk | MVP mitigation |
|---|---|
| A01 Broken Access Control | Supabase RLS, server-side auth validation on every API route |
| A02 Cryptographic Failures | HTTPS only (Vercel default), no sensitive data in localStorage |
| A03 Injection | Parameterized Supabase queries, Zod input validation |
| A04 Insecure Design | Human-in-the-loop, AI never auto-adjudicates |
| A05 Security Misconfiguration | Environment variable validation at startup, `.env.example` |
| A06 Vulnerable Components | npm audit in CI, dependabot alerts |
| A07 Auth Failures | Supabase Auth with secure session management |
| A08 Data Integrity | Zod validation on all API boundaries, AI output validation |
| A09 Logging Failures | Audit log for all state-changing operations |
| A10 SSRF | No user-controlled URLs passed to server-side fetch |

## Content Security Policy

```text
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  font-src 'self';
  connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com;
  frame-ancestors 'none';
```

Note: `unsafe-inline` and `unsafe-eval` may be needed for Next.js dev mode. Tighten for production.

## Input sanitization

### CSV upload
- Maximum file size: 50 MB
- Allowed types: `.csv`, `.tsv` (MIME: `text/csv`, `text/tab-separated-values`)
- Encoding detection: UTF-8 preferred, fallback to ISO-8859-1
- Maximum columns: 100
- Maximum rows: 2,000,000
- Strip BOM if present
- Reject files with embedded scripts or formulas (`=`, `+`, `-`, `@` at cell start)

### User text input
- Maximum length: 2,000 characters (copilot), 5,000 characters (notes)
- HTML tag stripping on all user inputs
- No markdown rendering of user-generated content without sanitization

### AI prompt injection defense
- User questions are wrapped in a clearly delimited user-input block within the prompt
- System instructions are separated from user content
- User input is never used as part of system-level instructions
- Output validation ensures AI response matches expected schema

## Session management

- Supabase Auth manages JWT sessions
- Access token expiry: 1 hour (Supabase default)
- Refresh token: 7 days
- Server-side token verification on every API request
- No sensitive data stored in cookies
- Logout clears all client-side state (Zustand stores, React Query cache)

## Audit events

Log:
- dataset import (user, filename, record count, timestamp)
- schema mapping change (user, dataset, field changes, timestamp)
- risk analysis trigger (user, claim/batch, detectors used, timestamp)
- Gemini API call (user, prompt version, input/output tokens, latency, timestamp)
- investigation status change (user, investigation, old status, new status, timestamp)
- investigation note added (user, investigation, timestamp)
- report generation (user, investigation, timestamp)
- login/logout (user, IP, timestamp)
- settings change (user, setting key, old value, new value, timestamp)

Audit log entries are append-only and cannot be deleted by users.

## File upload security

1. Validate MIME type server-side (do not trust client Content-Type)
2. Validate file extension matches MIME type
3. Scan first 1,000 bytes for unexpected binary content
4. Store uploaded files in Supabase Storage with restricted access policies
5. Generate unique storage paths (no user-controlled filenames in storage)
6. Set Content-Disposition to `attachment` on download

## Production note

A real JKN deployment requires a separate enterprise security design covering IAM, network isolation, encryption at rest and in transit, retention policies, audit integration, regulatory controls (HIPAA-equivalent for Indonesia), data residency requirements, and penetration testing.
