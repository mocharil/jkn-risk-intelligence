# Arsa AI – Development Roadmap & Progress Tracker

> Sumber kebenaran progres. `[x]` = berjalan **dan** terverifikasi (test / E2E / browser). `[~]` = ada kompromi atau belum teruji dengan layanan eksternal asli. `[ ]` = belum.
> Terakhir diperbarui: 2026-10-02 (sesi pengembangan lanjutan).

## Ringkasan
- **Semua fitur proposal sudah ada di kode.** Gemini live terbukti (SA baru valid). Yang belum terbukti hanya **Supabase** (belum dikonfigurasi). Dengan embedding Vertex asli: macro F1 0,968, cloning P 0,925 / R 0,971.
- **Bukti verifikasi:** 79 test unit/integrasi (termasuk 8 terhadap Postgres+pgvector sungguhan via Docker), 40 asersi E2E HTTP terhadap server LLM tiruan (protokol OpenAI), type-check & build produksi bersih, axe-core 0 pelanggaran pada halaman utama, p95 API terburuk 48 ms.
- **Lapisan LLM kini agnostik provider:** Gemini, OpenAI-compatible (OpenAI/Azure/vLLM/Ollama/OpenRouter), Anthropic. Pilih dengan `LLM_PROVIDER`.

## Sprint 1 — Inti AI
### A1. Copilot bersitasi
- [x] Fasad LLM generik + 3 adapter (`lib/ai/llm.ts`, `lib/ai/providers/*`); status ter-cache, timeout, fallback berlabel
- [x] Retrieval konteks terkurasi; output terstruktur (zod); **validasi sitasi** (id karangan dibuang, jawaban tanpa sitasi ditolak) — unit + E2E
- [x] **Streaming SSE** (start → delta → final tervalidasi; halusinasi diganti deterministik) — E2E
- [x] Penjelasan per temuan & briefing dashboard oleh LLM bersitasi — E2E
- [x] **Diuji live dengan Gemini 2.5 Flash (Vertex, `gemini_sa.json`)** via `node scripts/live-llm.mjs`: 12/12 — Copilot, streaming, penjelasan, briefing, AI mapping, embedding Vertex
### A2. Kemiripan semantik
- [x] Embedding per provider (label model berawalan provider; vektor beda model tak pernah dibandingkan) + fallback lokal
- [x] Cloning = vektor + gerbang tumpang-tindih frasa; kandidat lintas diagnosis via indeks frasa langka
- [x] **pgvector**: tabel + indeks HNSW + fungsi set-based `arsa_match_all` (`supabase/migrations/20261002_arsa_pgvector_audit.sql`), `VECTOR_BACKEND=pgvector`, fallback in-process bila DB gagal — diuji di Postgres+pgvector nyata
### A3. Audit trail
- [x] Hash chain SHA-256 di aplikasi + verifikasi UI
- [x] **Di level database:** tabel append-only, trigger tolak UPDATE/DELETE/TRUNCATE, trigger penjaga rantai (seq, previous_hash, hash), fungsi `arsa_audit_verify()`, cermin otomatis — diuji (termasuk hash JS = hash SQL untuk unicode/kutip, dan deteksi manipulasi oleh superuser)

## Sprint 2
### B. Ingest & anonimisasi — [x] (CSV/XLSX/JSON, anonimisasi saat input, AI mapping oleh Gemini live: 13/13 kolom sampel B terpetakan benar, review manual, validasi baris, sampel SIMRS)
### C. Pipeline & evidence — [x]
### D. Auth & RBAC
- [x] Sesi HMAC lokal + middleware + 3 peran + izin server & UI
- [x] **Opsi Supabase Auth** (`AUTH_PROVIDER=supabase`; peran dari `app_metadata.role`, bukan `user_metadata`) — diuji dengan fetch palsu · [~] belum diuji ke proyek Supabase asli

## Sprint 3
### E. Testing & metrik
- [x] 79 test; E2E otomatis (`npm run build && npm run test:e2e`); `npm run test:db` untuk pgvector
- [x] Precision/recall/F1 8 detector, baseline pembanding, kelengkapan bukti, halaman Model Performance
- [~] Waktu investigasi: instrumentasi dari audit log; klaim 50–70% **belum terverifikasi** (butuh baseline manual)
- [ ] Penyelarasan klaim slide proposal dengan angka terukur — keputusan Anda (landing sudah dijujurkan)
### F. Data-driven — [x]
### G. Detector — [x] 8 detector: + **Repeat Billing** & **Readmission** (riwayat pasien), registry plug-in

## Sprint 4
- [x] PDF server-side · README · `.env.local.example` lengkap
- [x] **Hardening:** rate limit per-IP/grup (API/AI/upload/auth), header keamanan (CSP, nosniff, frame deny, HSTS di produksi), validasi zod di route penting
- [x] **Performa:** `npm run` → `node scripts/perf.mjs`; p95 terburuk 48 ms (target <500) setelah memoization agregasi
- [x] **Aksesibilitas:** axe-core WCAG 2.1 AA — 0 pelanggaran pada login, beranda, investigasi, data management, klaim, antrean, settings, model performance, providers; perbaikan kontras token, label tombol/select, skip-link, `lang="id"`, fokus terlihat, role dialog
- [x] Landing dijujurkan: angka hidup dari `/api/public/stats`, nama pasien dianonimkan, klaim berlebihan ("100% census", "court-admissible", "~96% accuracy") dilunakkan
- [x] Peta memakai tile OpenStreetMap (watermark "API KEY REQUIRED" hilang)
- [ ] Dokumen arsitektur → jalur GCP (keputusan hosting: Anda)
- [ ] Rate limit terdistribusi (saat ini memori per instance) · LCP/CLS belum diukur · pengujian pembaca layar manual
- [ ] Sinkronkan `Plan/*.md` lama dengan kode akhir

---

## Cara memvalidasi
1. `npm install && cp .env.local.example .env.local` (isi `AUTH_SECRET`, `PII_HMAC_SECRET`), `npm run dev`. Akun demo: lihat README.
2. `npm test` (unit) · `npm run build && npm run test:e2e` (E2E dengan LLM tiruan) · `npm run db:up && npm run db:migrate && npm run test:db` (pgvector nyata) · `npm run eval` · `BASE=http://localhost:3000 node scripts/perf.mjs`
3. **Ganti LLM:** set `LLM_PROVIDER` + kredensial (lihat `.env.local.example`) → *Settings → Periksa ulang*. Uji tanpa kunci: `npm run mock:llm` lalu `LLM_PROVIDER=openai OPENAI_BASE_URL=http://localhost:4010/v1 OPENAI_API_KEY=x OPENAI_EMBEDDING_MODEL=mock npm run dev`.
4. **pgvector:** `npm run db:up`, `DATABASE_URL=postgres://postgres:arsa@localhost:54329/arsa`, `VECTOR_BACKEND=pgvector`, `npm run db:migrate`, jalankan ulang analisis di *Settings* → kartu "Database & pencarian vektor".
5. **Manual UI:** login per peran → RBAC; upload sampel A/B; Copilot (klik sitasi); "Jelaskan dengan AI"; unduh PDF; Settings → rantai audit valid.
