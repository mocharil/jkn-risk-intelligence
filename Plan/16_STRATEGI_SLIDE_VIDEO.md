# Strategi Slide & Video Presentasi — Healthkathon 2026 (Tahap Submit Project)

> Periode submit: **19 Okt – 1 Nov 2026** · Template slide baru bisa diunduh mulai 19 Okt · Video **maks. 10 menit**, YouTube **private**, tautan disubmit lewat dashboard.
> Dokumen ini adalah strategi (isi, narasi, visual) yang bisa langsung dituangkan ke template begitu tersedia.

---

## 1. Strategi inti: satu cerita, bukan daftar fitur

Juri melihat puluhan tim dengan "dashboard + AI". Yang membedakan Arsa adalah satu kalimat:

> **"Arsa tidak memberi skor yang harus dipercaya — Arsa memberi bukti yang bisa diverifikasi."**

Semua slide dan narasi mengalir dari kalimat itu. Tiga pesan pendukung (ulang di awal, tengah, akhir):

| # | Pesan | Bukti yang ditunjukkan di video |
|---|---|---|
| 1 | **Bukan hanya mendeteksi, tapi menginvestigasi** (detect → connect → explain → investigate) | Satu klaim kritis dibedah sampai dokumen sumber |
| 2 | **AI yang bisa diaudit** — setiap pernyataan AI mengutip dokumen sumber, kutipan palsu otomatis ditolak | Copilot bersitasi `[1][2]`, klik sitasi → dokumen asli |
| 3 | **Aman & patuh sejak input** — UU PDP 27/2022, keputusan tetap di manusia | Panel anonimisasi saat upload, RBAC, hash audit |

**Aturan emas:** semua yang diklaim di video harus bisa **ditunjukkan di layar** atau punya angka terukur. Klaim tanpa dasar (lihat §7) dilabeli "target pilot", bukan "hasil".

---

## 2. Alokasi waktu (target 9:30 — sisakan buffer 30 detik)

| Slide | Isi | Durasi | Kumulatif |
|---|---|---|---|
| 1 | Perkenalan tim | 0:30 | 0:30 |
| 2 | Judul, deskripsi, tujuan | 0:45 | 1:15 |
| 3 | Latar belakang & dampak | 1:15 | 2:30 |
| 4 | Alur proses aplikasi | 1:00 | 3:30 |
| **5** | **Demo aplikasi (inti)** | **3:30** | **7:00** |
| 6 | Penjelasan fitur & keunggulan | 1:15 | 8:15 |
| 7 | Bukti terukur & kejujuran batasan (tambahan) | 0:45 | 9:00 |
| 8 | Roadmap & penutup (tambahan) | 0:30 | 9:30 |

Demo mendapat porsi terbesar (37%) — di situlah juri memutuskan. Slide 6 jangan mengulang demo; hanya yang **tidak terlihat** di demo (arsitektur, governance, ekstensibilitas).

Laju bicara Indonesia nyaman ≈ 130–140 kata/menit. Narasi di bawah sudah dihitung ≈ jumlah kata per durasi.

---

## 3. Slide per slide

### Slide 1 — Perkenalan Tim (0:30 · ±70 kata)
**Wajib:** foto semua anggota.
**Isi:** logo Arsa AI + tagline *"Detect Smarter. Investigate Faster."*; nama, peran, 1 baris keahlian per orang:
- Moch Aril Indra Permana — Ketua · AI Platform Engineer (MLOps, cloud, AI solution)
- Salfarisa Fitria — Anggota · Data Scientist (NLP, ML, statistical modeling)

**Visual:** foto besar berdampingan (konsisten dengan slide proposal), nama tim + kategori lomba ("Risk Efficiency in Healthcare Facilities") di bawah, logo BPJS Kesehatan & Healthkathon di pojok.
**Narasi:**
> "Selamat pagi/siang Bapak/Ibu juri. Kami Tim Arsa AI. Saya Aril, AI Platform Engineer, ketua tim; bersama Salfarisa, Data Scientist yang fokus pada NLP dan pemodelan statistik. Kami mengikuti kategori Risk Efficiency in Healthcare Facilities dengan satu keyakinan: kecurangan klaim tidak cukup dideteksi — harus bisa dibuktikan."

### Slide 2 — Judul, Deskripsi, Tujuan (0:45 · ±100 kata)
**Isi:**
- Judul: **ARSA: JKN Risk Intelligence Platform**
- Deskripsi satu kalimat: platform investigasi klaim JKN yang mengubah klaim mencurigakan menjadi investigasi berbasis bukti.
- 3 tujuan: (1) memprioritaskan klaim yang benar-benar perlu diperiksa, (2) mengumpulkan & menghubungkan bukti secara otomatis, (3) menjaga keputusan tetap di tangan manusia dengan jejak audit.
- Empat kata kunci: **Detect · Connect · Explain · Investigate**.

**Visual:** gunakan ulang ikon 4-kotak dari slide proposal ("Detect/Connect/Explain/Investigate") + satu screenshot Command Center di kanan. Kalimat besar: *"Not another dashboard. An AI-assisted investigation platform."*
**Narasi:**
> "Arsa adalah platform risk intelligence untuk JKN. Berbeda dari dashboard biasa, Arsa mengikuti alur kerja investigator: mendeteksi sinyal risiko, menghubungkan klaim, dokter, dan faskes, menjelaskan alasannya dengan kutipan dokumen, lalu mendukung keputusan. Tujuan kami tiga: fokuskan kapasitas investigator pada kasus yang paling penting, kumpulkan bukti otomatis, dan pastikan keputusan akhir selalu di manusia dengan jejak audit yang tidak bisa diubah."

### Slide 3 — Latar Belakang & Dampak (1:15 · ±165 kata)
**Isi (bangun cerita masalah → celah → dampak):**
1. **Skala:** 275+ juta peserta · belanja JKN Rp165+ triliun (2023) · potensi inefisiensi 3–10% ≈ Rp5–16 triliun/tahun *(sumber: Laporan Tahunan BPJS 2023, Kemenkes, OECD, ACFE — cantumkan di footnote seperti slide proposal)*.
2. **Celah investigasi (inti masalah):** jutaan klaim → screening aturan menghasilkan terlalu banyak alert → bukti tersebar → verifikasi manual satu per satu. *"Kita tidak butuh mendeteksi lebih banyak. Kita butuh menginvestigasi lebih cerdas."*
3. **Dampak yang dituju:** investigasi lebih cepat, bukti lebih lengkap, keputusan lebih konsisten & teraudit, dana kembali untuk layanan peserta.

**Visual:** (a) 3 angka besar (275+ juta / Rp165+ T / 3–10%) dari slide proposal; (b) diagram "Investigation Gap" 6 langkah dengan langkah 3–5 diberi warna merah (alert membludak → review manual → cross-check manual); (c) baris dampak dengan 4 ikon.
**Catatan penting:** angka dampak 50–70% / 30–50% / 80%+ **tampilkan sebagai "target pilot 12 bulan"**, bukan hasil. Kalau ditanya: *"Prototipe kami sudah mengukur kelengkapan bukti dan presisi pada data sintetis; waktu investigasi akan diukur di pilot."*
**Narasi:**
> "JKN melayani lebih dari 275 juta peserta dengan belanja di atas 165 triliun rupiah. Studi internasional memperkirakan 3 sampai 10 persen berpotensi tidak efisien — setara 5 sampai 16 triliun per tahun. Setiap rupiah yang bocor adalah layanan yang hilang bagi peserta. Tantangannya bukan kekurangan alert; justru terlalu banyak. Investigator harus mengumpulkan bukti satu per satu dari sistem berbeda, membandingkan dengan klaim lain secara manual, lalu memutuskan. Itulah celah investigasi. Dampak yang kami tuju: kapasitas investigator terfokus pada kasus yang benar-benar penting, bukti lengkap sejak awal, dan keputusan yang konsisten serta bisa diaudit."

### Slide 4 — Alur Proses Aplikasi (1:00 · ±130 kata)
**Isi:** diagram alur 6 tahap (satu garis horizontal, satu warna per tahap):

`Data SIMRS/Klaim → Anonimisasi (UU PDP) → Pemetaan Skema (AI + manusia) → Deteksi 8 detector + kemiripan semantik → Antrean prioritas → Workspace investigasi + Copilot bersitasi → Keputusan manusia + Laporan PDF & audit hash`

Tandai **tiga titik "manusia"**: konfirmasi mapping, keputusan akhir (Supervisor), verifikasi sitasi. Tandai **dua titik "AI"**: mapping & penjelasan. Garis bawah: *"Deterministik dulu, AI kemudian, manusia memutuskan."*
**Visual:** diagram flow bersih (kotak hijau, ikon per tahap), di bawahnya strip kecil 3 ikon "Deterministik / AI / Manusia". Hindari teks panjang.
**Narasi:**
> "Alurnya begini. Data ekspor SIMRS diunggah, dan data pribadi langsung dianonimkan sebelum disimpan atau dikirim ke model AI. Skema kolom dipetakan otomatis, tetapi manusia yang mengonfirmasi. Lalu delapan detector deterministik dan pencocokan semantik narasi medis menilai setiap klaim. Klaim berisiko masuk antrean prioritas, dibuka di workspace investigasi lengkap dengan bukti dan Copilot yang selalu mengutip sumber. Keputusan akhir dibuat supervisor, dan setiap langkah tercatat di jejak audit berantai hash. Prinsipnya: deterministik dulu, AI kemudian, manusia yang memutuskan."

### Slide 5 — Demo Aplikasi (3:30 · ±450 kata, mayoritas di layar)
Ini bagian terpenting; lihat **§4 Skrip Demo** di bawah. Slide ini hanya berupa pembatas ("Demo") atau layar aplikasi penuh — **jangan ada teks tambahan di layar** selain aplikasi.

### Slide 6 — Penjelasan Fitur & Keunggulan (1:15 · ±165 kata)
**Isi (hanya yang tidak terlihat jelas di demo), 6 kartu:**

| Fitur | Satu baris penjelasan |
|---|---|
| 8 detector plug-in | Upcoding, Cloning, Phantom, Abnormal LOS, Unbundling, Inflated Bills, Repeat Billing, Readmission — detector baru = modul, bukan aplikasi baru |
| Cloning semantik | Embedding vektor + gerbang kesamaan frasa; mendukung pgvector |
| AI bersitasi | Validator menolak kutipan yang tidak ada di sumber; tanpa sitasi valid → jawaban diganti versi deterministik berlabel |
| Netral provider LLM | Gemini / OpenAI-compatible / Anthropic / model lokal; tanpa LLM pun tetap jalan |
| Governance | RBAC 3 peran, hash chain audit (aplikasi + database), rate limit, header keamanan |
| Siap skala | Filter & paginasi server-side, p95 API < 50 ms, jalur pgvector/Cloud Run |

**Visual:** grid 2×3 kartu ikon; satu diagram kecil arsitektur (Sumber data → Ingest → Engine → Workspace → Output) di sisi kanan. Warna hijau BPJS konsisten.
**Narasi:**
> "Beberapa hal yang tidak terlihat di demo. Pertama, mesin risiko berbasis plug-in: delapan detector hari ini, dan pola baru cukup menjadi modul. Kedua, AI kami bisa diaudit: validator menolak kutipan yang tidak ada di sumber, dan jika model gagal atau menolak, sistem tetap bekerja dengan mode deterministik yang selalu berlabel. Ketiga, kami netral terhadap penyedia LLM, bahkan bisa memakai model lokal untuk data sensitif. Keempat, tata kelola: tiga peran, audit trail berantai hash yang juga dijaga di level database, dan data pribadi dianonimkan sejak input. Terakhir, arsitektur siap diskalakan ke pgvector dan Cloud Run."

### Slide 7 (tambahan) — Bukti Terukur & Batasan (0:45 · ±100 kata)
**Tujuan:** membangun kepercayaan dengan kejujuran — ini sering menjadi pembeda.
**Isi (angka nyata dari halaman *Evaluasi & Kalibrasi*):**
- F1 makro ±0,97 · presisi/recall per detector (tabel mini) — **diberi label: "data sintetis berlabel"**
- 100% temuan bersitasi dokumen sumber · 0 PII mentah tersimpan (diuji otomatis)
- 126 test otomatis + E2E + uji dengan Gemini asli · WCAG AA 0 pelanggaran · API p95 < 50 ms
- **Batasan jujur (kotak kuning):** data sintetis (belum data riil BPJS) · waktu investigasi akan diukur di pilot · validasi dengan label investigasi nyata adalah langkah berikutnya.

**Visual:** tabel P/R/F1 8 baris (screenshot halaman Evaluasi) + kotak "Batasan" kontras. Ini satu-satunya slide dengan banyak angka — pastikan terbaca.
**Narasi:**
> "Kami ingin jujur soal bukti. Pada data sintetis berlabel, delapan detector mencapai F1 rata-rata sekitar 0,97, dan seluruh temuan bersitasi dokumen sumber. Ini membuktikan mesin bekerja sesuai rancangan, bukan akurasi di data riil BPJS — itu yang akan kami validasi di pilot bersama investigator. Demikian juga target percepatan investigasi: akan diukur, bukan diklaim."

### Slide 8 (tambahan) — Roadmap & Penutup (0:30 · ±70 kata)
**Isi:** timeline 3 titik — *Pilot (3 bulan): data riil teranonimkan + baseline waktu manual → Integrasi (6 bulan): konektor SIMRS/e-Klaim, Cloud Run + BigQuery → Skala (12 bulan): detector baru, 100+ investigator.* Tutup dengan kalimat inti + kontak tim + logo.
**Visual:** garis waktu horizontal sederhana; kalimat penutup besar di tengah.
**Narasi:**
> "Langkah berikutnya: pilot dengan data riil teranonimkan sambil mengukur waktu investigasi, integrasi konektor SIMRS dan e-Klaim di infrastruktur cloud, lalu skala ke seluruh investigator. Arsa tidak menggantikan investigator — Arsa memperkuat mereka. Terima kasih."

---

## 4. Skrip Demo (Slide 5 · 3:30)

**Persiapan wajib (lihat §6):** `npm run build && npm start`, Reset Demo, panaskan Gemini 1 pertanyaan, login sebagai **Supervisor**, zoom browser 110%, layar 1920×1080, notifikasi OS dimatikan.

| Waktu | Layar | Aksi | Narasi (ringkas) |
|---|---|---|---|
| 0:00–0:25 | **Command Center** | Tunjuk 4 KPI, peta, panel sinyal emergen | "Ini Pusat Komando. 1.202 klaim sintetis terkalibrasi BPJS, 341 berisiko tinggi, eksposur sekitar Rp1,33 miliar. Semua angka dihitung dari data, bukan statik. Sinyal emergen di kanan membandingkan 14 hari terakhir dengan sebelumnya." |
| 0:25–0:50 | **Pemeriksaan Klaim → CLM-10293** | Klik kasus teratas | "Kita buka klaim teratas: gastroenteritis ditagih severity 3, nilai Rp18,45 juta — 3,5 kali median peer. Skor 99, kritis, dengan enam sinyal sekaligus." |
| 0:50–1:30 | **Panel Anatomi Skor & Papan Bukti** | Tunjuk 6 detector, 4 dokumen kontradiktif; buka tab *Papan Bukti*, tunjukkan kutipan | "Bukan satu skor — enam sinyal, masing-masing dengan keyakinannya. Di sini intinya: dokumen catatan tindakan menyatakan *tidak ada catatan operasi*, padahal ditagih bedah laparoskopik Rp12,5 juta. Kutipan ini verbatim dari dokumen sumber." |
| 1:30–1:55 | **Klaim Serupa / Graf Relasi** | Tab *Klaim Serupa*, lalu *Graf Relasi* | "Narasi medisnya 98,6% mirip dengan klaim lain dari dokter yang sama, pasien berbeda — indikasi cloning. Graf menghubungkan faskes, dokter, dan klaim." |
| 1:55–2:35 | **Copilot (panel kanan)** | Klik pertanyaan "Mengapa klaim ini berisiko tinggi?"; klik angka sitasi `[2]` | "Copilot menjawab dengan Gemini, dan setiap kalimat bernomor sitasi. Saya klik [2] — langsung ke dokumen sumbernya. Jika model mengarang sitasi, validator menolaknya." |
| 2:35–3:10 | **Manajemen Dataset** | Unggah `simrs_rs_b.csv` (rekaman yang sudah disiapkan bila perlu), tunjuk panel anonimisasi & mapping AI, Konfirmasi | "Sekarang data baru dari rumah sakit lain dengan header berbeda. NIK dan nomor kartu langsung menjadi pseudonim, alamat dihapus — sebelum menyentuh AI. Mapping diusulkan Gemini dan saya yang mengonfirmasi. Klaim baru langsung dianalisis." |
| 3:10–3:30 | **Keputusan + PDF** | Klik *Konfirmasi Risiko*, isi alasan, simpan; buka *Laporan → Unduh PDF*; tunjuk footer hash | "Keputusan akhir hanya supervisor, wajib beralasan, dan tercatat di audit berantai hash. Dosier PDF memuat kutipan bukti dan hash audit di setiap halaman." |

**Tips demo:**
- **Rekam demo secara terpisah** (OBS/Zoom, 1080p), lalu putar di slide 5 — risiko gagal live nol, bisa dipercepat 1,1× bila perlu. Narasi tetap direkam langsung.
- Urutan "wow": bukti verbatim (menit 1) → sitasi diklik (menit 2). Jangan habiskan waktu di peta.
- Jangan menampilkan tab Settings/halaman error. Jangan tunjukkan email/akun autofill browser.
- Bila Gemini lambat, klik pertanyaan yang sudah dipanaskan; jawaban kedua biasanya <3 detik.

---

## 5. Panduan visual

**Palet:** hijau BPJS `#00853F` (utama), hijau tua `#075C35` (judul), hijau muda `#E7F7EE` (latar kartu), merah `#C4281C` (risiko), kuning `#F79009` (peringatan/batasan), abu `#5F7269` (teks sekunder). Putih dominan — konsisten dengan antarmuka aplikasi.
**Tipografi:** Plus Jakarta Sans (sama dengan aplikasi). Judul ≥ 40 pt, isi ≥ 24 pt, footnote sumber ≥ 14 pt. **Maks. 6 baris teks/slide** (juri menonton video, bukan membaca).
**Aturan:** satu pesan per slide · screenshot nyata (bukan mockup) dengan sorotan merah/hijau tipis di bagian yang dibicarakan · ikon konsisten (set lucide) · tanpa animasi berlebih · logo BPJS & Healthkathon di setiap slide sesuai template.
**Gunakan ulang dari proposal:** slide "One Claim Can Hide Multiple Risks" (ilustrasi masalah), "Why This Matters" (3 angka), "The Investigation Gap" (diagram 6 langkah), "How Arsa AI Works" (5 langkah).
**Screenshot yang harus disiapkan** (resolusi 1920×1080, mode bersih): Command Center · kasus CLM-10293 (panel anatomi) · papan bukti dengan kutipan · tab klaim serupa · graf relasi · Copilot bersitasi · panel anonimisasi upload · PDF halaman 1 & footer hash · halaman Evaluasi.

---

## 6. Produksi video — checklist & jadwal

**Jadwal (hindari mepet 1 Nov):**
| Tanggal | Kegiatan |
|---|---|
| 19–21 Okt | Unduh template, isi slide 1–4 & 6–8, kumpulkan screenshot |
| 22–24 Okt | Latihan narasi (stopwatch), rekam demo terpisah |
| 25–27 Okt | Rekam Zoom penuh, 2–3 take; pilih terbaik |
| 28–30 Okt | Edit ringan (potong jeda), cek durasi **< 10:00**, unggah YouTube *private*, uji tautan di jendela incognito |
| 31 Okt | **Submit** di dashboard (buffer 1 hari); simpan salinan video & slide |

**Teknis Zoom:** satu orang membawakan (suara konsisten) atau bergantian per slide dengan jelas; kamera on di slide 1 saja; mikrofon eksternal/headset; ruangan tenang; resolusi rekaman 1080p; matikan notifikasi; uji suara 15 detik dahulu.
**Uji kelayakan sebelum submit:** durasi ≤ 10 menit · slide 1–6 semua ada & urut · foto semua anggota di slide 1 · demo terlihat jelas (teks terbaca di 720p) · tautan YouTube berstatus *private/unlisted* sesuai ketentuan dan bisa dibuka juri.

---

## 7. Hindari (risiko kredibilitas) vs Pakai

| ❌ Jangan | ✅ Pakai |
|---|---|
| "Mendeteksi 100% kecurangan" / "100% census" | "Menyaring seluruh klaim dalam dataset yang diunggah" |
| "Akurasi 97%" tanpa konteks | "F1 ±0,97 pada data sintetis berlabel; validasi data riil di pilot" |
| "Mempercepat investigasi 50–70%" sebagai fakta | "Target pilot 50–70%; kami menginstrumentasi waktu penanganan untuk mengukurnya" |
| "AI memutuskan/menghentikan kecurangan" | "AI mengumpulkan & menjelaskan bukti; **manusia** memutuskan" |
| "Data kami data BPJS nyata" | "Data sintetis berlabel — tidak ada data pasien nyata" |
| "Tidak pernah halusinasi" | "Setiap klaim AI wajib bersitasi dan divalidator; kutipan palsu ditolak" |
| "Sudah production-ready di GCP" | "Prototipe berfungsi; jalur Cloud Run/BigQuery/pgvector sudah disiapkan" |

---

## 8. Antisipasi pertanyaan juri (siapkan 1–2 kalimat jawaban)

| Pertanyaan | Jawaban singkat |
|---|---|
| Apakah ini memakai data asli? | Tidak — data sintetis berlabel demi kepatuhan PDP; pipeline anonimisasi sudah diuji untuk data riil. |
| Bagaimana mencegah AI berhalusinasi? | Konteks dibatasi dari data; setiap kalimat wajib bersitasi; validator membuang sitasi yang tidak ada; gagal → mode deterministik berlabel. |
| Bagaimana dengan kepatuhan UU PDP? | NIK/kartu → pseudonim HMAC, nama → inisial, alamat/telepon dihapus *sebelum* simpan atau kirim ke LLM; tersedia opsi model lokal. |
| Seberapa besar skalanya? | Saat ini hingga 50.000 baris per unggahan di prototipe; jalur pgvector (HNSW) dan Cloud Run/BigQuery untuk jutaan klaim. |
| Bagaimana false positive? | Halaman Evaluasi menunjukkan presisi per detector; keputusan akhir manusia; tiap temuan menyertakan bukti pendukung **dan bantahan**. |
| Apa bedanya dengan rule engine/BI biasa? | Menghubungkan klaim–dokter–faskes, kemiripan semantik narasi, bukti terkutip, dan workspace investigasi — bukan sekadar alert. |
| Model bisnis & keberlanjutan? | SaaS per peran + integrasi + analitik lanjut + pelatihan (slide proposal); biaya LLM terkendali karena deterministik-dulu. |
| Siapa yang bertanggung jawab atas keputusan? | Supervisor/admin; tercatat nama, alasan, waktu, dan hash di audit trail. |

---

## 9. Daftar tugas (siap dieksekusi)

- [ ] Unduh template (19 Okt), petakan slide 1–8 ke dokumen ini
- [ ] Foto tim (latar netral, resolusi tinggi) untuk slide 1
- [ ] Ambil 9 screenshot (daftar §5) dari build produksi bersih
- [ ] Latih narasi dengan stopwatch — target 9:30
- [ ] Rekam demo terpisah mengikuti §4 (2–3 take)
- [ ] Rekam Zoom penuh, edit ringan, unggah YouTube private, uji incognito
- [ ] Submit sebelum 1 Nov (target 31 Okt)

*Bantuan yang bisa dilanjutkan setelah template ada: menyusun isi tiap slide sebagai teks siap tempel, membuat gambar diagram alur (SVG/PNG), dan menyiapkan dataset + skenario demo yang direkam ulang secara konsisten.*
