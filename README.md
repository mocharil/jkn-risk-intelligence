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
| `npm test` | 118 test unit/integrasi (+ 8 test pgvector di `tests/db-pg.test.ts` = 126 test: PII, hash chain, 8 detector, ingest BPJS, sitasi, adapter LLM, governance, Supabase Auth) |
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

## Data BPJS Kesehatan (folder `Sample/`)
`Sample/` berisi 75 statistik agregat resmi dari Portal Data BPJS Kesehatan (https://data.bpjs-kesehatan.go.id/, 2014-2018) beserta buku panduan data sampel. Data ini **agregat nasional, bukan klaim per orang**, jadi dipakai sebagai acuan dan kalibrasi, bukan sebagai pengganti data klaim.
- `npx tsx scripts/build-bpjs-reference.ts` membangun `lib/data/bpjs-national.json` dari berkas xlsx (diagnosis rawat inap terbanyak, biaya per admisi menurut kelas/provinsi/usia-jenis kelamin, lama rawat, outcome, peserta, FKRTL). Pemuat bertipe: `lib/data/bpjs-national.ts`.
- Halaman **Acuan Nasional** (`/acuan-nasional`) menampilkan acuan itu dan posisi dataset yang sedang dianalisis terhadapnya.
- Dataset sintetis bawaan dikalibrasi ke acuan itu: campuran diagnosis (berbobot admisi nasional), pangsa kelas rawat, volume provinsi, dan faktor biaya per kelas. Benchmark tarif dinormalisasi per kelas rawat (kelas 1 membayar lebih mahal dari kelas 3).
- Mapper impor mengenali kode variabel resmi data mikro BPJS (`FKL02`, `FKL18`, `FKL47`, `PSTV01`, dst.) dan menurunkan faskes dari provinsi/kota/kepemilikan/jenis/tipe karena data BPJS tidak memuat kode faskes. `scripts/make-bpjs-sample.ts --verify` membuat `public/samples/bpjs_sampel_fkrtl.csv` (sintetis, dikalibrasi statistik di atas) dan mengukur akurasi impor + deteksi.
- Data mikro asli (126 juta baris) memerlukan akun peneliti terdaftar pada portal yang sama. File itu tidak memuat resume medis: detektor berbasis teks (Cloning, Phantom, Unbundling) tidak aktif; yang berjalan adalah Upcoding, Abnormal LOS, Inflated Bills, Repeat Billing, dan Readmission.

## Batasan yang perlu diketahui
- Metrik performa diukur pada **data sintetis berlabel** yang dibuat dengan pola serupa logika detector; bukan klaim akurasi di data riil.
- Klaim "50–70% lebih cepat" belum terverifikasi (butuh baseline waktu manual); yang ada hanya instrumentasi dari audit log.
- Jalur LLM nyata belum teruji dengan kunci asli (diuji dengan server tiruan protokol OpenAI); Supabase Auth/Postgres Supabase belum diuji ke proyek asli (Postgres+pgvector diuji lewat Docker).
- Nama orang di teks bebas hanya dapat dikaburkan bila namanya ada di kolom nama baris tersebut (plus pola NIK/telepon/email).
- Rate limit disimpan di memori per instance.
- Statistik BPJS tidak memuat tarif per kode diagnosis; tarif per diagnosis pada dataset sintetis tetap ilustratif. Hanya rata-rata nasional/kelas/provinsi yang riil.
- Pada data tanpa narasi klinis, ABNORMAL_LOS berpresisi lebih rendah (sampel BPJS sintetis: sekitar 0,5) karena lama rawat riil menyebar lebar; hasilnya perlu dokumen untuk dikonfirmasi.

Status per item dan panduan validasi: `Plan/15_DEVELOPMENT_ROADMAP.md`.

## Prinsip data

1. **Data juri lebih dulu.** Statistik resmi BPJS di `Sample/` menjadi dasar: acuan nasional, jumlah faskes per provinsi (FKRTL), volume klaim per provinsi (angka admisi x peserta), indeks biaya provinsi, pangsa kelas rawat, campuran diagnosis, dan usia-jenis kelamin. Verifikasi independen: `npm run verify:bpjs`.
2. **Data buatan harus menyerupai keadaan nyata.** Hanya yang tidak ada di Sample yang disintesis (identitas faskes, rincian klaim, narasi, penyimpangan). Prevalensi penyimpangan sekitar 7%, faskes sangat bervariasi, ada kasus tipis dan kasus sah yang tampak janggal, sebagian klaim tanpa dokumen. Hasil deteksi sengaja tidak sempurna.
3. **Tanpa data tulis-tangan.** Tidak ada klaim, faskes, atau skenario bernama. Semua parameter ada di `lib/data/synthetic-config.ts` dengan basis (`Sample` atau `asumsi`) dan alasannya. Contoh di landing page dihitung dari hasil analisis.
