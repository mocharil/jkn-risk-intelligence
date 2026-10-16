# Arsa AI — JKN Risk Intelligence (Healthkathon 2026)

Platform investigasi klaim JKN: **deteksi deterministik + kemiripan semantik (embedding vektor / pgvector) + AI generatif yang selalu mengutip dokumen sumber**, sehingga auditor memverifikasi bukti, bukan memercayai skor.

## Menjalankan

```bash
npm install
cp .env.local.example .env.local       # isi AUTH_SECRET, PII_HMAC_SECRET, dan (opsional) kredensial LLM
npm run dev                            # http://localhost:3000
```

| Perintah | Fungsi |
|---|---|
| `npm test` | 79 test unit/integrasi (PII, hash chain, 8 detector, ingest, sitasi, adapter LLM, Supabase Auth) |
| `npm run build && npm run test:e2e` | E2E HTTP penuh terhadap server LLM tiruan (provider, streaming, RBAC, ingest, PDF) |
| `npm run db:up && npm run db:migrate && npm run test:db` | pgvector + audit append-only di Postgres nyata (Docker) |
| `npm run eval` | precision/recall tiap detector pada data sintetis berlabel |
| `npm run mock:llm` | server LLM tiruan (protokol OpenAI) untuk uji tanpa kunci |
| `BASE=http://localhost:3000 node scripts/perf.mjs` | latensi API p50/p95 |

Akun demo (kata sandi `Arsa#2026`, ubah dengan `DEMO_PASSWORD`):

| Email | Peran | Bisa |
|---|---|---|
| investigator@arsa.id | Investigator | analisis, catatan, minta bukti, mulai investigasi |
| supervisor@arsa.id | Supervisor | + keputusan akhir, upload dataset, jalankan ulang analisis |
| admin@arsa.id | Admin | + reset demo, kelola pengguna |

## Memilih LLM
Set `LLM_PROVIDER` (atau biarkan kosong untuk otomatis) dan isi kredensialnya — lihat `.env.local.example`:

| Provider | Env utama | Embedding |
|---|---|---|
| `gemini` | `./gemini_sa.json` / `VERTEX_SA_JSON` / `GEMINI_API_KEY` | ya |
| `openai` (OpenAI, Azure, OpenRouter, vLLM, Ollama `/v1`, LM Studio) | `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL` | bila `OPENAI_EMBEDDING_MODEL` |
| `anthropic` | `ANTHROPIC_API_KEY` | tidak (embedding lokal) |

Tanpa provider yang bekerja, semua fitur AI memakai **mode deterministik** yang selalu diberi label di UI. Status & alasan: *Settings*. Kredensial ambient mesin (`GOOGLE_APPLICATION_CREDENTIALS`) tidak dipakai kecuali `ARSA_ALLOW_AMBIENT_CREDENTIALS=1`.

## Arsitektur singkat
- `lib/risk/` — registry 8 detector (Upcoding, Cloning, Phantom, Abnormal LOS, Unbundling, Inflated Bills, Repeat Billing, Readmission), benchmark dari data peer, pipeline analisis.
- `lib/ai/` — fasad LLM + adapter provider, embedding, Copilot (konteks → LLM → **validasi sitasi** → fallback; streaming SSE), penjelasan, briefing.
- `lib/ingest/` — parse CSV/XLSX/JSON, **anonimisasi saat input**, profiling, AI schema mapping, normalisasi.
- `lib/db/` — Postgres: pencarian pgvector (HNSW), cermin audit append-only; migrasi di `supabase/migrations/20261002_arsa_pgvector_audit.sql`.
- `lib/audit/chain.ts` — hash chain SHA-256 (identik dengan hash di database).
- `lib/auth/` — sesi HMAC + RBAC (+ opsi Supabase Auth); `middleware.ts` melindungi semua rute dan membatasi laju.
- Data: store in-memory + snapshot `.data/` (gitignored, dapat dialihkan dengan `ARSA_DATA_DIR`).

## Batasan yang perlu diketahui
- Metrik performa diukur pada **data sintetis berlabel** yang dibuat dengan pola serupa logika detector; bukan klaim akurasi di data riil.
- Klaim "50–70% lebih cepat" belum terverifikasi (butuh baseline waktu manual); yang ada hanya instrumentasi dari audit log.
- Jalur LLM nyata belum teruji dengan kunci asli (diuji dengan server tiruan protokol OpenAI); Supabase Auth/Postgres Supabase belum diuji ke proyek asli (Postgres+pgvector diuji lewat Docker).
- Nama orang di teks bebas hanya dapat dikaburkan bila namanya ada di kolom nama baris tersebut (plus pola NIK/telepon/email).
- Rate limit disimpan di memori per instance.

Status per item dan panduan validasi: `Plan/15_DEVELOPMENT_ROADMAP.md`.
