# Prompt Gambar dan Skrip Presentasi: Arsa AI (Healthkathon 2026)

Pasangan dari `18_RENCANA_SLIDE_VIDEO_FINAL.md`. Berisi, untuk setiap slide: ilustrasi yang diinginkan, prompt untuk ChatGPT, dan skrip yang dibacakan.

## A. Cara memakai (baca dulu)

1. **Jangan minta AI menggambar teks atau tampilan aplikasi.** Generator gambar sering salah mengeja dan mengarang angka. Semua prompt di bawah meminta gambar **tanpa teks**; teks, angka, logo, dan foto tim dipasang sendiri di PowerPoint atau Canva. Tampilan aplikasi memakai **tangkapan layar asli**, bukan hasil AI.
2. **Selalu minta rasio 16:9.** Awali tiap permintaan dengan: "Buat gambar landscape 16:9 (1792×1024)". Bila ChatGPT memberi rasio lain, bilang "ulangi dengan rasio 16:9".
3. **Jaga satu gaya.** Buat Slide 1 dulu. Untuk slide berikutnya, tempel **Blok Gaya (bagian B)** lagi, lalu tulis: "Gunakan gaya yang sama persis dengan gambar sebelumnya." Jika gaya mulai bergeser, unggah satu gambar yang sudah bagus sebagai acuan.
4. **Sisakan ruang untuk teks.** Prompt menyebut area kosong (kiri, atas, dan seterusnya). Letakkan judul di sana.
5. **Satu gambar, beberapa percobaan.** Minta 2 atau 3 variasi dan pilih satu. Tambahkan "tanpa teks, tanpa huruf, tanpa logo" bila masih ada tulisan yang muncul.
6. **Tidak ada wajah orang sungguhan.** Bila prompt melibatkan orang, minta siluet atau figur datar tanpa wajah.

## B. Blok Gaya (tempel di awal setiap prompt)

```
Create a landscape 16:9 image (1792x1024). Flat editorial vector illustration, clean and modern,
healthcare-governance feel. Palette only: white background (#FFFFFF), deep forest green (#0B291C),
BPJS green (#007A3A), pale sage panels (#EDF2EF); use red (#B91C1C) ONLY as one small accent for
"risk". No gradients, no drop shadows, no 3D, no photorealism, no neon. Thin consistent line icons,
rounded corners, generous empty space. Absolutely NO text, letters, numbers, or logos anywhere in
the image. No faces: people, if any, are faceless flat figures.
```

## C. Slide 1 sampai 13

### Slide 1. Cover (5 detik)

- **Ilustrasi:** peta kepulauan Indonesia bergaya poligon hijau (peta panas, makin pekat makin berisiko) di sisi kanan, dengan kaca pembesar di atas selembar berkas klaim. Sisi kiri kosong untuk judul.
- **Prompt:**
```
[Tempel Blok Gaya]
Scene: on the RIGHT 55% of the canvas, a stylized map of the Indonesian archipelago made of flat
polygon provinces shaded in a heat-map from very pale green to deep forest green (a few darker
provinces). Over the map, a large simple magnifying glass resting on a single claim document sheet
with two small check marks. Subtle thin dotted lines connecting a few provinces like a network.
LEFT 45% of the canvas must be completely empty white space for a title.
```
- **Skrip:** "Halo, kami tim [nama tim], dan ini Arsa AI."

### Slide 2. Perkenalan tim (30 detik)

- **Ilustrasi:** latar bersih saja. Foto asli anggota tim ditempel di atasnya. Gambar AI hanya berupa hiasan pita hijau tipis di bawah.
- **Prompt:**
```
[Tempel Blok Gaya]
Scene: almost entirely white and empty. Only a thin, wide, soft sage-green wave band along the
bottom edge of the image, with a few tiny dotted connection lines above it. Center and top must be
completely empty (space for team photos and names).
```
- **Pasang di PPT:** foto bulat anggota (foto asli), nama, peran, satu baris keahlian.
- **Skrip:** "Saya [nama ketua], ketua tim, berperan sebagai [peran]. Saya berpengalaman di [satu hal relevan, mis. membangun platform AI dan arsitektur cloud]. Di sebelah saya [nama anggota], [peran], yang berpengalaman di [satu hal relevan, mis. data science dan analisis data]. [Jika ada anggota ketiga: nama, peran, satu kalimat.] Kami membangun Arsa AI bersama, dari data sampai tampilan."

### Slide 3. Judul, deskripsi, tujuan (1 menit)

- **Ilustrasi:** meja verifikator yang rapi: satu map klaim terbuka, di sampingnya tiga kartu bukti kecil yang tersambung garis ke map. Kesan: satu klaim, banyak bukti yang bisa dicek.
- **Prompt:**
```
[Tempel Blok Gaya]
Scene: on the RIGHT half, a clean flat illustration of a single open claim folder at the center
with three small evidence cards (a medical record sheet, an invoice sheet, and a similar-claims
card) connected to it by thin green lines; each card has a small green check mark; one card has a
small red mark. A faceless flat figure of a verifier sits at the side looking at the folder.
LEFT half is empty white space for the title and three goals.
```
- **Skrip:** "Solusi kami bernama Arsa AI. Arsa AI membantu verifikator BPJS memeriksa klaim berisiko dengan bukti yang bisa dicek, supaya waktu pemeriksaan tertuju pada klaim yang paling penting. Caranya: delapan detektor menandai klaim yang janggal. Setiap temuan membawa bukti, misalnya dokumen medis yang bertentangan dengan tagihan, selisih tagihan terhadap klaim sejenis, dan klaim lain yang narasinya mirip. AI hanya menjelaskan, dan selalu mengutip sumber. Keputusan tetap di tangan manusia. Ada tiga tujuan kami. Pertama, memusatkan pemeriksaan pada kasus prioritas, bukan seluruh klaim. Kedua, memastikan setiap temuan bersitasi. Ketiga, mencatat setiap keputusan di rantai audit yang tidak bisa diubah. Jadi Arsa AI bukan dasbor, dan bukan kotak hitam yang hanya memberi skor."

### Slide 4. Latar belakang (45 detik)

- **Ilustrasi:** menumpuknya berkas: tumpukan map dan lonceng peringatan membanjiri satu figur verifikator, sementara gedung rumah sakit kecil di kejauhan. Kesan: banyak peringatan, sedikit konteks.
- **Prompt:**
```
[Tempel Blok Gaya, but use more muted pale-green and grey tones for this slide]
Scene: a faceless flat verifier figure at a desk on the left, overwhelmed by tall stacks of claim
folders and many small alert-bell icons floating above the stacks; the stacks look uniform and
undifferentiated. In the far background, a small simple hospital building silhouette. Upper-right
area is empty white space for three large statistics.
```
- **Skrip:** "Persoalannya bukan kurangnya peringatan. Sistem yang ada menghasilkan banyak peringatan tanpa konteks, sehingga verifikator tetap membuka berkas satu per satu. Skalanya besar. Menurut statistik resmi BPJS tahun 2018 yang kami pakai, ada sekitar 208 juta peserta JKN, 11,1 juta admisi rawat inap tingkat lanjut, dan 2.511 rumah sakit dan fasilitas rujukan yang bekerja sama. Rata-rata biaya klaim sekitar 4,75 juta rupiah per admisi. Dengan skala itu, pemeriksaan harus dipusatkan pada klaim yang paling perlu, dan setiap temuan harus bisa dibuktikan."

### Slide 5. Dampak (35 detik)

- **Ilustrasi:** sebelum dan sesudah. Kiri: tumpukan dokumen besar berwarna abu-abu pudar. Kanan: tumpukan kecil rapi berwarna hijau tegas, dengan panah di tengah. Tiga angka dipasang di PPT.
- **Prompt:**
```
[Tempel Blok Gaya]
Scene: two sides divided by a simple arrow in the middle. LEFT: a very large chaotic stack of
document sheets drawn in faded grey, looking heavy. RIGHT: a small tidy stack of the same sheets
in solid BPJS green with a single small green check mark above it. Below both, leave a wide
empty band for three metric cards. Top is empty for the title.
```
- **Pasang di PPT:** tiga kartu: 1.503 → 65 kasus (turun 95,7%); skor tanpa alasan → 97% temuan bersitasi (125 dari 129); recall 90,4% dan klaim normal ditandai 2,3% (data sintetis). Baris amber: "Diukur pada data sintetis berlabel; belum divalidasi pada klaim riil."
- **Skrip:** "Dampaknya kami ukur langsung di aplikasi. Dari 1.503 klaim, verifikator hanya perlu memulai dari 65 kasus prioritas, atau turun sekitar 96 persen beban awal. Setiap temuan membawa bukti: 97 persen temuan memuat sitasi bukti yang valid. Pada data sintetis berlabel, detektor menangkap sekitar 90 persen anomali yang kami sisipkan, dan hanya 2,3 persen klaim normal yang ikut ditandai. Perlu kami tegaskan, angka ini diukur pada data sintetis, bukan klaim riil, dan itu kami tulis jelas di aplikasinya."

### Slide 6. Alur proses (1 menit 20 detik)

- **Ilustrasi:** lima ikon berderet horizontal dengan garis penghubung: (1) berkas yang diunggah, (2) perisai dengan siluet yang disamarkan, (3) jaringan delapan simpul (pusat, paling menonjol), (4) lembar dosier dengan penanda bukti, (5) figur manusia dengan stempel persetujuan dan rantai. Ruang kosong di bawah tiap ikon untuk label.
- **Prompt:**
```
[Tempel Blok Gaya]
Scene: a horizontal pipeline of five evenly spaced circular icons connected by a thin green line
with small arrowheads. 1) a document with an upward arrow (upload). 2) a shield with a faceless
silhouette that is half blurred (anonymization). 3) a network graph of eight small nodes around a
central node, drawn larger and in deep forest green as the hero element (AI analysis). 4) a report
sheet with highlighted lines and small tabs (evidence dossier). 5) a faceless person figure with a
round stamp and a short chain of linked blocks (human decision and audit chain). Leave empty white
space under each icon for a label, and a wide empty band at the bottom for three short columns.
```
- **Pasang di PPT:** label langkah (Input, Proses, Analisis AI, Output, Tindak lanjut) dan strip bawah (Pengguna, Data, Teknologi), sesuai Plan/18.
- **Skrip:** "Alurnya lima langkah. Satu, input: berkas klaim dari rumah sakit dalam CSV, Excel, atau JSON, atau data sampel BPJS. Dua, proses: identitas pasien langsung disamarkan di memori, kolom dipetakan ke skema standar, dan baris yang tidak valid ditolak lengkap dengan alasannya. Tiga, analisis: delapan detektor memeriksa tiap klaim, dibandingkan dengan klaim sejenis menurut diagnosis, kelas rawat, dan provinsi, lalu digabung menjadi satu skor. Empat, output: antrean kasus prioritas lengkap dengan bukti, dan dosier PDF. Lima, tindak lanjut: verifikator menetapkan status dan wajib menulis alasan, supervisor memutuskan akhir, dan semuanya tercatat di rantai audit. Pengguna kami ada tiga peran: investigator, supervisor, dan administrator. Data yang kami pakai adalah statistik resmi BPJS dan data klaim sintetis berlabel, tanpa data peserta riil."

### Slide 7. Demo (3 menit)

- **Ilustrasi:** slide penanda singkat, dilihat hanya satu detik. Latar hijau tua dengan siluet laptop minimal.
- **Prompt:**
```
[Tempel Blok Gaya, but make the whole background deep forest green #0B291C]
Scene: a minimal thin-line outline of an open laptop in pale sage green, centered, with a small
play-triangle shape on its screen. Nothing else. Empty space above for a short word.
```
- **Pasang di PPT:** satu kata "Demo" dan tautan prototype.
- **Skrip (3 menit, berjalan bersama layar aplikasi):**
  - *0:00 sampai 0:35, Command Center.* "Sekarang kami tunjukkan aplikasinya. Ini Command Center. Ada 1.503 klaim yang dianalisis, dan 65 di antaranya perlu diperiksa. Peta ini menunjukkan skor risiko tiap provinsi, makin hijau pekat makin tinggi. Di kanan ada ringkasan temuan, faskes dan provinsi yang paling menonjol, dan radar yang menunjukkan jenis temuan mana yang bergeser dalam dua minggu terakhir."
  - *0:35 sampai 1:05, Pemeriksaan Klaim.* "Di Pemeriksaan Klaim, verifikator tidak membuka 1.503 berkas. Ia mulai dari kasus dengan skor tertinggi. Saya filter jenis temuan Upcoding, dan daftarnya langsung mengerucut."
  - *1:05 sampai 2:00, detail kasus teratas.* "Kita buka kasus teratas. Skornya 99, dan ada alasannya. Pada garis ini terlihat tagihan sekitar 16,3 juta rupiah, jauh di atas median klaim sejenis sekitar 5,7 juta, dan di atas rerata nasional BPJS. Di tab Papan Bukti, ketiga dokumen medis bertentangan dengan tingkat keparahan yang ditagihkan: catatan menyebut pasien stabil, sedangkan tagihannya setara kasus berat. Di tab Klaim Serupa ada klaim lain yang narasinya hampir sama. Jadi verifikator melihat bukti, bukan hanya angka."
  - *2:00 sampai 2:30, Copilot.* "Sekarang Copilot. Saya tanya: bandingkan risiko DKI Jakarta dan Jawa Timur. Jawabannya ringkas, dan setiap pernyataan mengutip sumber. Peta di bawahnya langsung menunjukkan kedua provinsi, lengkap dengan skor, jumlah klaim, dan eksposur. Kalau sebuah kalimat tidak punya sumber yang sah, sistem menolaknya."
  - *2:30 sampai 3:00, keputusan dan unggah.* "Verifikator lalu menetapkan status dan menulis alasan, dan dosier PDF bisa diunduh untuk dibawa ke rapat. Kami juga bisa memasukkan data baru. Saya unggah berkas Excel kecil: kolomnya dipetakan otomatis, identitas pasien disamarkan, dan baris yang bermasalah ditolak dengan alasannya. Semua langkah ini tercatat di jejak audit."
  - *Cadangan bila molor:* potong bagian unggah, sebut saja di slide fitur.

### Slide 8. Penjelasan fitur (1 menit 20 detik)

- **Ilustrasi:** empat ikon pendamping, satu per panel (tangkapan layar asli di panelnya, ikon sebagai penanda saja). Prompt menghasilkan empat ikon dalam satu gambar yang bisa digunting.
- **Prompt:**
```
[Tempel Blok Gaya]
Scene: a clean 2x2 grid of four large simple line icons on white, evenly spaced with lots of
margin, each in deep forest green with one small BPJS-green accent: top-left a stylized heat-map
of an archipelago; top-right a claim folder with a highlighted evidence line and a check mark;
bottom-left a chat bubble with a small quote mark and a tiny link chain; bottom-right a shield
with a document and a chain of three linked blocks. No text, no numbers.
```
- **Skrip:** "Empat fitur utama. Pertama, Command Center dan peta risiko: menunjukkan di mana risiko menumpuk, jadi tim tidak mencari manual. Kedua, pemeriksaan klaim dengan bukti: skor per detektor, posisi tagihan terhadap klaim sejenis, dokumen yang bertentangan, dan klaim serupa; ini menjawab masalah peringatan tanpa konteks. Ketiga, Copilot bersitasi: tanya jawab yang setiap kalimatnya harus mengutip sumber, dan jawaban yang tidak lolos validasi diganti jawaban berbasis aturan; ini menjawab risiko AI yang berhalusinasi, dan peta serta grafik ikut tampil di jawaban. Keempat, unggah dataset, privasi, dan audit: data baru masuk dengan pemetaan otomatis yang dikonfirmasi manusia, identitas disamarkan, dan setiap keputusan tercatat di rantai SHA-256 yang hanya bisa ditambah."

### Slide 9. Arsitektur dan data (10 detik)

- **Ilustrasi:** diagram satu baris lima kotak dengan ikon: basis data, perisai, simpul jaringan (paling menonjol), lembar laporan, rantai.
- **Prompt:**
```
[Tempel Blok Gaya]
Scene: five rounded rectangles in one horizontal row joined by thin arrows. Icons inside, left to
right: a database cylinder, a shield, a node-network (this box filled deep forest green with pale
icon, larger than the others), a report sheet, a chain of blocks. Below the row, a long thin pale
sage band. Large empty margins top and bottom for text.
```
- **Pasang di PPT:** label Sumber data, Anonimisasi, Detektor dan skor, Antrean dan dosier, Audit; teknologi: Next.js, PostgreSQL dengan pgvector, Cloud Run.
- **Skrip:** "Data riil JKN tidak kami pakai. Kami memakai statistik resmi BPJS dan data klaim sintetis berlabel yang dibangkitkan dari statistik itu."

### Slide 10. Keamanan, privasi, tata kelola (10 detik)

- **Ilustrasi:** tiga ikon: perisai dengan siluet yang disamarkan, tiga lencana peran, dan rantai blok.
- **Prompt:**
```
[Tempel Blok Gaya]
Scene: three large line icons evenly spaced across the canvas on white: left, a shield containing
a faceless silhouette partly dissolved into dots (anonymization); center, three small round badges
of different sizes side by side (three roles); right, a short chain of linked blocks with a small
padlock (tamper-proof audit chain). Wide empty space under each icon for a sentence.
```
- **Skrip:** "Identitas pasien disamarkan sebelum disimpan, ada tiga peran dengan hak berbeda, dan setiap keputusan masuk rantai audit yang tidak bisa diubah."

### Slide 11. Hasil uji dan batasan (10 detik)

- **Ilustrasi:** dua kolom: kiri daftar centang hijau (sudah diuji), kanan satu tanda seru amber (belum divalidasi). Kesan jujur dan seimbang.
- **Prompt:**
```
[Tempel Blok Gaya]
Scene: split canvas. LEFT half: a clean checklist of five rows, each a rounded square with a green
check mark and an empty line to the right. RIGHT half: a single large rounded panel in pale amber
(#FEF3C7 with an amber #CA8A04 outline) containing a simple warning triangle and two empty lines.
Top is empty for the title.
```
- **Pasang di PPT:** kiri: 137 tes otomatis lulus; uji unggah CSV, XLSX, JSON dan berkas bermasalah; verifikasi data acuan BPJS 5.729 pemeriksaan tanpa selisih; F1 makro 82,7% pada data sintetis. Kanan: belum divalidasi pada klaim riil; detektor dengan kasus berlabel di bawah 10 hanya indikatif.
- **Skrip:** "Yang sudah kami uji: seratus tiga puluh tujuh tes otomatis, alur unggah berkas, dan data acuan BPJS. Yang belum: validasi pada klaim riil. Itu kami sebut terbuka."

### Slide 12. Rencana pengembangan (10 detik)

- **Ilustrasi:** tiga anak tangga naik menuju gedung BPJS sederhana.
- **Prompt:**
```
[Tempel Blok Gaya]
Scene: three ascending steps from lower-left to upper-right, each step marked by a small circle
node, leading toward a simple flat building silhouette (public-institution style, with a small
green flag) in deep forest green at the top right. Faint dotted line connecting the three nodes.
Empty space above and to the left for three short labels.
```
- **Skrip:** "Selanjutnya tiga tahap: pilot terbatas dengan data teranonimkan atas izin resmi, kalibrasi dengan label investigasi nyata, lalu integrasi ke alur verifikasi. Tiap tahap diukur dengan indikator yang sama."

### Slide 13. Terima kasih (10 detik)

- **Ilustrasi:** latar hijau tua dengan peta panas halus di pojok; ruang kosong untuk QR dan kontak.
- **Prompt:**
```
[Tempel Blok Gaya, but make the whole background deep forest green #0B291C]
Scene: a subtle stylized archipelago heat-map built from thin pale-green outlines and a few soft
sage polygons, occupying the lower-left corner at low contrast. Everything else empty, with a
square empty area at the right (for a QR code) and large empty space at the left for a thank-you
line and contact details.
```
- **Pasang di PPT:** "Terima kasih", tautan prototype, tautan repositori, QR, nama dan email ketua tim.
- **Skrip:** "Terima kasih. Arsa AI tidak menggantikan verifikator. Ia membuktikan klaim mana yang layak diperiksa. Tautan prototype dan repositori ada di layar."

## D. Pengaturan kecepatan bicara

Skrip memakai sekitar 130 kata per menit. Bila Anda bicara lebih cepat atau lambat, pakai jumlah kata ini sebagai patokan:

| Slide | Durasi | Kata kira-kira |
|---|---|---|
| 1 | 5 dtk | 10 |
| 2 | 30 dtk | 65 |
| 3 | 1:00 | 130 |
| 4 | 45 dtk | 95 |
| 5 | 35 dtk | 75 |
| 6 | 1:20 | 170 |
| 7 | 3:00 | 390 |
| 8 | 1:20 | 170 |
| 9–13 | 10 dtk masing-masing | 20–25 |

Latih dengan pengatur waktu; bila melebihi 9:45, potong slide 11 dan 12 menjadi satu kalimat.

## E. Sebelum merekam: sesuaikan angka

Angka di skrip dan di slide Dampak diambil per 28 Okt 2026. Setelah reset demo, buka aplikasi dan cocokkan: jumlah klaim (1.503), kasus prioritas (65), skor dan tagihan kasus teratas, recall dan positif palsu (halaman Evaluasi), dan sitasi bukti (halaman Evaluasi). Bila berbeda, ubah angka di slide dan skrip, bukan di aplikasi.
