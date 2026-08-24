# Phase 6 - Gemini Intelligence

## Goal
Add grounded reasoning and synthesis on top of existing deterministic signals.

## Build
- Server-only Gemini client with authentication
- Evidence bundle builder (select relevant documents, cap at 5 per claim)
- Structured output schema (Zod validation on every response)
- Prompt versioning system (`prompts/v1/` directory)
- Response validation with retry-once repair for malformed JSON
- AI run logging (prompt version, evidence version, tokens, latency)
- Investigation synthesis (overall risk explanation with evidence citations)
- Gemini streaming setup for Copilot (SSE infrastructure)
- Fallback hierarchy (Gemini fails → show deterministic signals only)
- Prompt injection defense (sanitize user input in prompts)

## Rules
- Do not send full datasets to Gemini.
- Do not invent missing evidence.
- `INSUFFICIENT_EVIDENCE` is a valid and expected outcome.
- Material statements need evidence IDs.
- AI summaries should use Bahasa Indonesia for explanations.

## Exit criteria
- Gemini cannot be invoked from client code.
- Malformed model output fails safely (retries once, then returns fallback).
- AI summary is reproducible from logged prompt/evidence version.
- Streaming SSE infrastructure works end-to-end.
- Fallback mode displays deterministic signals when Gemini is unavailable.
- AI responses include evidence references.
- Token usage is logged per AI run.
- User input is sanitized before inclusion in prompts.

## Vibecoding prompt
Implement Phase 6 only. Add a server-side Gemini reasoning layer over existing risk signals and evidence. Set up SSE streaming infrastructure for the Copilot. Enforce structured validated output (Zod) and evidence grounding. Implement fallback hierarchy when Gemini is unavailable. Add failure handling, prompt injection defense, and AI run metadata logging. AI explanations should use Bahasa Indonesia.
