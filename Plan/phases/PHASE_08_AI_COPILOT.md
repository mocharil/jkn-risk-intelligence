# Phase 8 - AI Copilot

## Goal
Allow investigators to ask grounded questions about a case or provider.

## Build

Server tools/functions for:
- Claim lookup by ID
- Provider history and risk profile
- Similar claims retrieval (pgvector)
- Evidence retrieval by claim
- Risk findings by claim or provider
- Network relationships for an entity

UI:
- Full-page AI Copilot interface (centered, max 800px width)
- Chat input with streaming indicator
- 5 suggested investigation questions as quick-start prompts
- Structured intelligence responses (not generic chat bubbles)
- Evidence references (clickable, highlight source document)
- Navigable entity cards in results (claim card, provider card, pattern card)
- Action buttons: "Buka Investigasi", "Lihat Detail Klaim", "Bandingkan Provider"
- Conversation history (session-scoped, cleared on page refresh)
- Rate limiting indicator (20 queries/hour)
- Empty/welcome state: icon + "Apa yang ingin Anda investigasi?" + 5 suggested prompts

## Streaming behavior
- Use SSE (Server-Sent Events) for real-time token streaming
- Show typing indicator while processing
- Display partial response as tokens arrive
- Final event includes complete validated response + evidence refs
- Fallback: if streaming fails, show batch response after timeout

## Exit criteria
- Copilot answers only from retrieved platform context (never from general knowledge).
- Evidence references are visible and clickable.
- Unknown information is acknowledged as "INSUFFICIENT_EVIDENCE".
- Conversation cannot directly mutate case status.
- Streaming works end-to-end (first token < 2 seconds).
- Rate limiting is enforced (20 queries/hour).
- Suggested questions are relevant to current context.
- Results include navigable entity cards.
- AI responses are in Bahasa Indonesia.

## Vibecoding prompt
Implement Phase 8 only. Add an evidence-grounded AI Copilot with streaming SSE responses. The model may use server-side retrieval functions but must not access arbitrary database content or perform case mutations. Include suggested investigation prompts, structured response cards, navigable entity links, and evidence references. Validate outputs and rate limit to 20 queries/hour. AI should respond in Bahasa Indonesia.
