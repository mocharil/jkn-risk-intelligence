# Rencana Slide dan Video Project Final Healthkathon 2026

Dirancang dari ketentuan di `Template Project Final Healthkathon 2026.pdf`, isi proposal `Arsa_AI_Submission.pdf`, dan keadaan aplikasi yang sudah di-deploy (rilis 28 Okt 2026).

## 0. Ketentuan yang mengikat (dari template)

| Ketentuan | Konsekuensi untuk kita |
|---|---|
| Video maksimal 10 menit | Rencana ini berdurasi 9 menit 25 detik, sisa 35 detik sebagai penyangga |
| Wajib: tim (foto semua anggota), judul-deskripsi-tujuan, latar-dampak, alur proses, demo, fitur, slide tambahan | Semua ada; urutan boleh diubah |
| Demo harus aplikasi berjalan, bukan slide | Bagian demo 3 menit penuh di layar aplikasi |
| Disarankan rekaman Zoom, unggah YouTube unlisted | Rekam lewat Zoom (bagikan layar), kamera tim tampil di pojok |
| Tidak memakai data peserta JKN riil; cantumkan sumber data | Pakai pernyataan "data sintetis berlabel + statistik resmi BPJS" di slide data dan hasil uji |
| Hindari klaim tanpa dasar | Aturan angka di bagian 6 |
| Submit tautan paling lambat 1 November 2026 | Rekam maksimal 30 Okt supaya ada waktu unggah dan cek tautan |

Kategori pada proposal: **Efisiensi Risiko pada fasilitas kesehatan**, fokus Upcoding dan Unbundling, Phantom dan Repeat Billing, Inflated Bills dan Cloning.

## 1. Sistem desain slide

Tujuannya: terlihat satu keluarga dengan aplikasi dan dengan slide proposal (header Healthkathon dan BPJS), tetapi lebih ringan dan lebih banyak ruang.

- **Format:** 16:9, 1920×1080. Bahasa Indonesia (template berbahasa Indonesia).
- **Warna:** latar putih; hijau tua `#0B291C` untuk judul dan blok gelap; hijau BPJS `#007A3A` untuk data dan penekanan; abu-hijau `#EDF2EF` untuk panel; merah `#B91C1C` hanya untuk risiko tinggi dan selisih rupiah; amber `#CA8A04` hanya untuk peringatan batasan. Tidak ada gradien dan bayangan.
- **Huruf:** IBM Plex Sans (sama dengan aplikasi). Judul 44–54 pt, isi minimal 24 pt, catatan sumber 16 pt. Di layar video, apa pun di bawah 24 pt sulit terbaca.
- **Tata letak:** satu slide, satu gagasan. Judul berupa kalimat yang menyatakan kesimpulan ("Satu klaim yang mencurigakan jarang berupa skor; ia adalah penyelidikan"), bukan label topik. Maksimal 3 blok isi per slide.
- **Gambar:** tangkapan layar aplikasi asli, bukan ikon atau ilustrasi. Setiap tangkapan layar dipotong pada bagian yang dibicarakan, dengan satu penanda (kotak atau panah) berwarna hijau. Peta panas hijau dan cincin skor adalah ciri visual aplikasi; pakai itu sebagai motif.
- **Header dan footer:** logo Healthkathon 2026 dan BPJS Kesehatan di kiri dan kanan atas (ambil dari file template), nomor slide di kanan bawah, baris sumber 16 pt di kiri bawah.
- **Gerak:** hanya "muncul bertahap" untuk daftar, agar pembicara bisa membuka satu poin per kalimat. Tanpa transisi mencolok.
- **Rekaman:** warna tulisan ke latar minimal kontras 7:1; hindari teks abu-abu muda.

## 2. Daftar slide dan waktu

| No | Slide | Template | Durasi | Kumulatif |
|---|---|---|---|---|
| 1 | Cover | hal. 1 | 0:05 | 0:05 |
| 2 | Perkenalan tim | hal. 4 | 0:30 | 0:35 |
| 3 | Judul, deskripsi, tujuan | hal. 5 | 1:00 | 1:35 |
| 4 | Latar belakang | hal. 6 | 0:45 | 2:20 |
| 5 | Dampak | hal. 6 | 0:35 | 2:55 |
| 6 | Alur proses | hal. 7 | 1:20 | 4:15 |
| 7 | Demo (layar aplikasi) | hal. 8 | 3:00 | 7:15 |
| 8 | Penjelasan fitur | hal. 9 | 1:20 | 8:35 |
| 9 | Arsitektur dan data | hal. 10 | 0:10 | 8:45 |
| 10 | Keamanan, privasi, tata kelola | hal. 10 | 0:10 | 8:55 |
| 11 | Hasil uji dan batasan | hal. 10 | 0:10 | 9:05 |
| 12 | Rencana pengembangan | hal. 10 | 0:10 | 9:15 |
| 13 | Terima kasih | hal. 11 | 0:10 | 9:25 |

Catatan: slide 9–12 pendek karena isinya sudah tersirat di demo. Kalau waktu longgar, tambahkan slide Referensi dan sumber data (disarankan sebagai slide cadangan di akhir, tidak dibacakan).

## 3. Isi dan desain tiap slide

### Slide 1. Cover
- **Isi:** "Arsa AI: JKN Risk Intelligence". Subjudul: "Menemukan klaim berisiko, dan menunjukkan buktinya." Kategori: Efisiensi Risiko pada fasilitas kesehatan. Nama tim.
- **Desain:** latar putih, judul besar hijau tua rata kiri. Di kanan, tangkapan layar Command Center (peta panas) sebagai satu gambar besar, dipotong tanpa bingkai laptop. Logo di header.
- **Ucapan (5 dtk):** "Kami tim ... dan ini Arsa AI."

### Slide 2. Perkenalan tim
- **Isi:** foto semua anggota (wajib), nama lengkap, peran, satu baris keahlian yang dapat diverifikasi. Dari proposal: Moch Aril Indra Permana (Ketua, AI platform engineer, MLOps dan arsitektur cloud) dan Salfarisa Fitria Anggata (Data scientist dan ML engineer, analisis data). Template menyediakan tiga kolom; dua anggota boleh, tetapi jangan biarkan kolom kosong.
- **Desain:** dua atau tiga kartu sejajar, foto bulat 240 px, nama 32 pt, peran 24 pt. Satu garis hijau tipis di bawah foto.
- **Ucapan (30 dtk):** nama, peran, satu hal relevan masing-masing, tanpa membaca CV.
- **Catatan:** keahlian harus jujur dan bisa diverifikasi; pakai kalimat yang sama dengan proposal.

### Slide 3. Judul, deskripsi, tujuan
- **Isi:**
  - Nama solusi: Arsa AI.
  - Satu kalimat nilai: "Arsa AI membantu verifikator BPJS memeriksa klaim berisiko dengan bukti yang bisa dicek, agar waktu pemeriksaan tertuju pada klaim yang paling penting."
  - Deskripsi: 8 detektor menandai klaim; setiap temuan membawa bukti (dokumen yang bertentangan, selisih terhadap median peer, klaim serupa); AI hanya menjelaskan dan selalu mengutip sumber; manusia yang memutuskan.
  - Tiga tujuan terukur (lihat slide 5): (1) memusatkan pemeriksaan pada kasus prioritas, (2) setiap temuan bersitasi, (3) keputusan tercatat di rantai audit yang tidak bisa diubah.
- **Desain:** kolom kiri kalimat nilai 40 pt; kolom kanan tiga tujuan sebagai daftar bernomor besar. Tanpa gambar; ruang kosong disengaja.
- **Ucapan (1 mnt):** mulai dari kalimat nilai, lalu "bukan dashboard, bukan kotak hitam".

### Slide 4. Latar belakang
- **Isi:** persoalan: peringatan tanpa konteks membuat verifikator tetap membuka berkas satu per satu. Tiga fakta berumber:
  - 208 juta peserta JKN dan 11,1 juta admisi rawat inap tingkat lanjut (statistik BPJS 2018, dipakai di aplikasi);
  - biaya klaim rawat inap rata-rata Rp 4,75 juta per admisi, 2.511 FKRTL bekerja sama (sumber sama);
  - belanja JKN dan potensi inefisiensi: ambil dari proposal hanya bila sumbernya dapat dicantumkan.
- **Desain:** tiga angka besar sejajar (96 pt, hijau tua), masing-masing dengan baris sumber 16 pt. Di bawahnya satu kalimat masalah. Kalau memakai angka dari proposal, tulis tahunnya.
- **Peringatan:** proposal menulis "275+ juta peserta aktif"; aplikasi memakai 208 juta (tahun 2018). Pilih satu dan tulis tahunnya, jangan campur.
- **Ucapan (45 dtk):** masalahnya bukan kurang peringatan, melainkan kurang bukti dan kurang konteks.

### Slide 5. Dampak
- **Isi:** tiga indikator sebelum dan sesudah, semua terukur di aplikasi (bagian 6):
  1. Beban pemeriksaan: 1.503 klaim menjadi 65 kasus prioritas, turun 95,7%.
  2. Bukti: skor tanpa alasan menjadi 97% temuan memuat sitasi bukti valid (125 dari 129).
  3. Deteksi pada data sintetis berlabel: recall 90,4%, klaim normal ditandai 2,3%; dibanding ambang tunggal, F1 tingkat klaim 0,269 menjadi 0,811.
- **Desain:** tiga kartu dengan angka "sebelum" abu-abu, panah, dan angka "sesudah" hijau besar. Di bawah, satu baris amber: "Diukur pada data sintetis berlabel; belum divalidasi pada klaim riil."
- **Ucapan (35 dtk):** sebut baris amber dengan lantang; juri menilai kejujuran ini.

### Slide 6. Alur proses
- **Isi (lima langkah sesuai template):**
  1. **Input:** berkas klaim (CSV, XLSX, JSON) atau data sampel BPJS.
  2. **Proses:** identitas pasien disamarkan di memori, kolom dipetakan ke skema kanonik, baris tidak valid ditolak dengan alasan.
  3. **Analisis AI:** 8 detektor, benchmark per diagnosis, kelas, dan provinsi, kemiripan narasi, skor komposit.
  4. **Output:** antrean kasus prioritas, bukti kontradiksi, dosier PDF.
  5. **Tindak lanjut:** verifikator menetapkan status dan alasan; supervisor memutuskan akhir; semua tercatat di rantai audit.
  - Strip bawah: Pengguna (Investigator, Supervisor, Administrator); Data (statistik resmi BPJS dan data sintetis berlabel, tanpa data peserta riil); Teknologi (aturan deterministik, embedding, model bahasa hanya untuk penjelasan bersitasi).
- **Desain:** lima langkah horizontal dengan ikon garis tipis dan panah; langkah 3 diberi blok hijau tua sebagai pusat. Strip bawah tiga kolom abu-hijau.
- **Ucapan (1:20):** satu kalimat per langkah, tekankan bahwa langkah 5 dikerjakan manusia.

### Slide 7. Demo (3 menit, layar aplikasi)
Slide ini hanya penanda satu detik sebelum Anda berpindah ke aplikasi (tautan https://arsa-jkn-627843549213.asia-southeast2.run.app). Skenario ada di bagian 4.

### Slide 8. Penjelasan fitur
- **Isi (empat fitur, format fungsi dan masalah yang dijawab):**
  1. **Command Center dan peta risiko:** ringkasan eksposur, tren, peta panas provinsi, faskes dan provinsi paling berisiko. Menjawab: sulit melihat di mana risiko menumpuk.
  2. **Pemeriksaan klaim dengan bukti:** antrean prioritas, detail kasus (skor per detektor, posisi tagihan terhadap median peer, dokumen yang bertentangan, klaim serupa, graf relasi). Menjawab: alert tanpa konteks.
  3. **Copilot bersitasi:** tanya jawab yang setiap kalimatnya wajib mengutip sumber; jawaban yang tidak lolos validasi diganti jawaban berbasis aturan; peta dan grafik ikut tampil di jawaban. Menjawab: risiko AI berhalusinasi.
  4. **Unggah dataset, privasi, dan audit:** pemetaan kolom otomatis dengan konfirmasi manusia, identitas disamarkan, rantai audit SHA-256. Menjawab: bagaimana data baru masuk dengan aman.
- **Desain:** empat panel 2×2, masing-masing satu tangkapan layar terpotong (±640×360), judul fitur 32 pt, dua baris teks 24 pt (Fungsi, Menjawab).
- **Ucapan (1:20):** 20 detik per fitur.

### Slide 9. Arsitektur dan data
- **Isi:** diagram satu baris: Sumber data → Anonimisasi → Detektor dan mesin skor → Antrean dan dosier → Audit. Di bawahnya: data = statistik resmi BPJS (36 dari 75 berkas Sample dipakai, diverifikasi independen: 5.729 pemeriksaan, 0 selisih) dan data klaim sintetis berlabel yang dibangkitkan dari statistik itu. Teknologi: Next.js, PostgreSQL dengan pgvector, Cloud Run, model bahasa hanya di lapis penjelasan.
- **Desain:** satu diagram horizontal, lima kotak, panah tipis, satu kotak hijau tua pada "Detektor".
- **Ucapan (10 dtk):** "Data riil JKN tidak dipakai; ini asal data kami."

### Slide 10. Keamanan, privasi, tata kelola
- **Isi:** tiga poin: identitas pasien disamarkan (HMAC, inisial, kolom identitas dibuang) sehingga tidak ada data mentah di penyimpanan; tiga peran dengan hak berbeda; rantai audit SHA-256 yang hanya bisa ditambah; kebijakan (ambang antrean, mode Copilot, alasan tertulis wajib) hanya bisa diubah Administrator dan tercatat.
- **Desain:** tiga ikon garis dengan satu kalimat masing-masing.
- **Ucapan (10 dtk):** satu kalimat per poin.

### Slide 11. Hasil uji dan batasan
- **Isi:** apa yang sudah diuji: 137 tes otomatis lulus (termasuk 12 uji unggah ujung ke ujung), verifikasi data acuan BPJS, uji unggah CSV, XLSX, JSON, dan berkas bermasalah; kinerja detektor F1 makro 82,7% pada data sintetis. Batasan (kotak amber): belum divalidasi pada klaim riil; detektor dengan kasus berlabel di bawah 10 ditandai "sampel kecil".
- **Desain:** dua kolom, kiri "Sudah diuji" (hijau), kanan "Belum" (amber). Jujur tampil sebagai kekuatan.
- **Ucapan (10 dtk).**

### Slide 12. Rencana pengembangan
- **Isi:** tiga tahap: (1) pilot terbatas dengan data klaim teranonimkan atas izin resmi; (2) kalibrasi detektor dan ambang dengan label investigasi nyata; (3) integrasi ke alur verifikasi BPJS. Satu baris: "Setiap tahap diukur dengan indikator yang sama seperti di slide 5."
- **Desain:** garis waktu horizontal sederhana, tiga titik. Jangan menulis tanggal yang tidak bisa dijanjikan; pakai "tahap 1, 2, 3".
- **Ucapan (10 dtk).**

### Slide 13. Terima kasih
- **Isi:** tautan prototype (https://arsa-jkn-627843549213.asia-southeast2.run.app), tautan repositori (https://github.com/mocharil/jkn-risk-intelligence), kontak ketua tim (nama dan email). Satu kalimat penutup: "Arsa AI tidak menggantikan verifikator; ia membuktikan klaim mana yang layak diperiksa."
- **Desain:** latar hijau tua, teks putih, QR ke tautan prototype di kanan.
- **Ucapan (10 dtk).**

## 4. Skenario demo (3 menit, slide 7)

Siapkan sebelum merekam: reset demo (Administrator → Reset Demo) agar data bersih; masuk sebagai Supervisor; perbesar browser ke 110–125%; tutup bookmark dan tab lain; buka semua halaman sekali agar tidak ada jeda muat.

| Waktu | Layar | Yang dikatakan |
|---|---|---|
| 0:00–0:35 | **Command Center.** Tunjuk peta panas, kartu "Faskes sorotan", radar pergeseran pola | "Ini 1.503 klaim; 65 di antaranya perlu diperiksa. Peta menunjukkan skor risiko provinsi." |
| 0:35–1:05 | **Pemeriksaan Klaim.** Klik chip "Upcoding" untuk memfilter, urutkan skor | "Verifikator tidak membuka 1.503 berkas; ia mulai dari yang paling berisiko." |
| 1:05–2:00 | **Detail kasus teratas** (cek ID di data akhir; saat ini CLM-10459, skor 99). Tunjuk sumbu posisi tagihan (Rp 16,3 jt vs median peer Rp 5,7 jt vs rerata BPJS), tab Papan Bukti (dokumen yang bertentangan), tab Klaim Serupa | "Skornya punya alasan: tagihan 3 kali median peer, dan dokumen medis menyatakan pasien stabil, tidak sejalan dengan tingkat keparahan yang ditagihkan." |
| 2:00–2:30 | **Copilot.** Ketik "Bandingkan risiko DKI Jakarta dan Jawa Timur" | "Jawaban bersitasi, dan petanya langsung tampil. Kalimat tanpa sumber ditolak." |
| 2:30–3:00 | **Putuskan dan unggah.** Beri status dengan alasan, buka dosier PDF; atau tunjukkan unggah satu berkas XLSX kecil dan pemetaan otomatisnya | "Keputusan tercatat di rantai audit; berkas baru dianonimkan sebelum disimpan." |

Cadangan bila waktu mepet: potong bagian unggah dan sebut saja di slide 8.

## 5. Tips merekam

1. **Dua kali jalan, satu penyuntingan.** Rekam slide (menit 0–4:15 dan 7:15–9:25) di satu sesi Zoom, rekam demo di sesi terpisah dengan layar aplikasi, lalu gabungkan. Zoom boleh dipakai untuk keduanya; template hanya menyarankan.
2. **Suara dulu.** Mikrofon terpisah atau headset; rekam 10 detik hening untuk menghapus dengung. Suara jelas lebih penting daripada gambar.
3. **Skrip, bukan hafalan.** Tulis poin per slide (bagian 3), bacakan sebagai ucapan sendiri; hindari membaca isi slide kata per kata.
4. **Tempo.** Slide 3–6 adalah bagian yang paling mudah molor. Latihan dengan pengatur waktu; bila lewat 9:45, potong slide 11–12 menjadi satu kalimat.
5. **Layar.** Resolusi 1920×1080, kursor besar, gerakkan kursor pelan, hanya klik yang perlu.
6. **Bab YouTube.** Tambahkan penanda waktu di deskripsi (Tim, Latar, Alur, Demo, Fitur) agar juri bisa melompat.
7. **Pemeriksaan akhir:** sesuai checklist template (maksimal 10 menit, foto semua anggota tampil, demo benar-benar berjalan, tulisan terbaca, tautan unlisted bisa dibuka dari akun lain).

## 6. Angka yang boleh dan tidak boleh dipakai

Boleh (terukur di aplikasi saat ini, per 28 Okt 2026; hitung ulang sebelum merekam):
- 1.503 klaim dianalisis, 65 kasus prioritas (4,3%), eksposur Rp 350,8 jt (selisih tarif klaim bertanda terhadap median peer).
- Recall mikro 90,4%, precision mikro 72,9%, klaim normal ditandai 2,3%, F1 makro 82,7%, semuanya pada data sintetis berlabel.
- Sitasi bukti valid 125 dari 129 temuan (97%); bersitasi dokumen rekam medis 78%.
- 137 tes otomatis lulus; verifikasi referensi BPJS 5.729 pemeriksaan tanpa selisih.

Jangan dipakai:
- **F1 96,8%, 1.394 klaim, CLM-10293, "RS Sehat Sentosa".** Itu dari deck lama (`Plan/17`); datanya sudah diganti dan angkanya terlalu tinggi.
- **"50–70% lebih cepat" dan "30–50% lebih akurat" dari proposal** sebagai hasil. Kita belum mengukurnya. Boleh disebut hanya sebagai target pilot, dengan kata "target".
- Frasa "terbukti", "akurasi 9x%", atau "mendeteksi fraud". Pakai "menandai klaim yang perlu diperiksa"; skor bukan bukti kecurangan.

## 7. Aset yang perlu disiapkan

- [ ] Foto semua anggota tim (wajib), latar polos, resolusi tinggi.
- [ ] Logo Healthkathon dan BPJS dari file template.
- [ ] Tangkapan layar 1920×1080 dari aplikasi publik: Command Center, antrean, detail kasus (sumbu posisi tagihan), papan bukti, Copilot dengan peta, dialog unggah dan pemetaan, halaman Evaluasi (dengan banner batasan).
- [ ] QR ke tautan prototype untuk slide 13.
- [ ] Skrip ucapan per slide (bagian 3, kolom "Ucapan").
