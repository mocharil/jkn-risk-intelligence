"""Membangun kerangka PPTX Arsa AI (13 slide, 16:9) dari rencana Plan/18 dan skrip Plan/19.

Jalankan dari akar repo:  python slides/build_deck.py
Gambar AI: simpan sebagai slides/images/slide-01.png ... slide-13.png lalu jalankan ulang;
slide tanpa gambar menampilkan kotak penanda. Skrip ucapan masuk ke Catatan Pembicara tiap slide.
"""
import os
import re
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Emu, Inches, Pt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = os.path.join(ROOT, "slides", "shots")
IMGS = os.path.join(ROOT, "slides", "images")
LOGO = os.path.join(ROOT, "public", "arsa_logo.png")
FONT = "IBM Plex Sans"

FOREST, GREEN, SAGE = RGBColor(0x0B, 0x29, 0x1C), RGBColor(0x00, 0x7A, 0x3A), RGBColor(0xED, 0xF2, 0xEF)
RED, AMBER, AMBER_BG = RGBColor(0xB9, 0x1C, 0x1C), RGBColor(0xCA, 0x8A, 0x04), RGBColor(0xFE, 0xF3, 0xC7)
INK, MUTED, WHITE = RGBColor(0x11, 0x24, 0x1D), RGBColor(0x47, 0x5B, 0x53), RGBColor(0xFF, 0xFF, 0xFF)

prs = Presentation()
prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)
BLANK = prs.slide_layouts[6]
W, H = prs.slide_width, prs.slide_height


def notes_from_plan():
    text = open(os.path.join(ROOT, "Plan", "19_PROMPT_GAMBAR_DAN_SKRIP_PRESENTASI.md"), encoding="utf8").read()
    out = {}
    for m in re.finditer(r"### Slide (\d+)\..*?(?=\n### Slide |\n## D\.)", text, re.S):
        n, body = int(m.group(1)), m.group(0)
        lines = []
        for ln in body.split("\n"):
            s = ln.strip()
            if s.startswith("- **Skrip"):
                tail = s.split(":**", 1)[1].strip() if ":**" in s else ""
                if tail.startswith('"'):
                    lines.append(tail.strip('"'))
            elif re.match(r"- \*\d", s):
                lines.append(re.sub(r"^- \*(.*?)\.\* ?", r"[\1] ", s).strip('"').replace('"', ""))
        out[n] = "\n\n".join(lines)
    return out


NOTES = notes_from_plan()


def box(slide, x, y, w, h, fill=None, line=None, shape=MSO_SHAPE.RECTANGLE):
    s = slide.shapes.add_shape(shape, x, y, w, h)
    if fill is None:
        s.fill.background()
    else:
        s.fill.solid()
        s.fill.fore_color.rgb = fill
    if line is None:
        s.line.fill.background()
    else:
        s.line.color.rgb = line
        s.line.width = Pt(1)
    s.shadow.inherit = False
    return s


def text(slide, x, y, w, h, content, size=24, bold=False, color=INK, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP):
    tb = slide.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    lines = content if isinstance(content, list) else [content]
    for i, ln in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.space_after = Pt(6)
        r = p.add_run()
        r.text = ln
        r.font.size, r.font.bold, r.font.name = Pt(size), bold, FONT
        r.font.color.rgb = color
    return tb


def base(n, title, dark=False, notes=True):
    s = prs.slides.add_slide(BLANK)
    if dark:
        box(s, 0, 0, W, H, FOREST)
    if os.path.exists(LOGO):
        s.shapes.add_picture(LOGO, Inches(0.5), Inches(0.35), height=Inches(0.5))
    text(s, Inches(1.15), Inches(0.42), Inches(4), Inches(0.4), "Arsa AI", 18, True, WHITE if dark else FOREST)
    text(s, Inches(8.3), Inches(0.42), Inches(4.5), Inches(0.4), "Healthkathon 2026  ·  Detect Smarter, Protect JKN", 14, False, SAGE if dark else MUTED, PP_ALIGN.RIGHT)
    if title:
        text(s, Inches(0.5), Inches(1.05), Inches(12.3), Inches(1.3), title, 36, True, WHITE if dark else FOREST)
    text(s, Inches(12.2), Inches(7.0), Inches(0.7), Inches(0.3), str(n), 14, False, SAGE if dark else MUTED, PP_ALIGN.RIGHT)
    if notes and NOTES.get(n):
        s.notes_slide.notes_text_frame.text = NOTES[n]
    return s


def art(slide, n, x, y, w, h, label="Tempel gambar AI di sini"):
    path = os.path.join(IMGS, f"slide-{n:02d}.png")
    if os.path.exists(path):
        slide.shapes.add_picture(path, x, y, width=w, height=h)
        return
    b = box(slide, x, y, w, h, SAGE, MUTED)
    b.line.dash_style = 4
    text(slide, x, y, w, h, [label, f"slides/images/slide-{n:02d}.png"], 16, False, MUTED, PP_ALIGN.CENTER, MSO_ANCHOR.MIDDLE)


def shot(slide, name, x, y, w):
    path = os.path.join(SHOTS, name)
    if os.path.exists(path):
        pic = slide.shapes.add_picture(path, x, y, width=w)
        pic.line.color.rgb = SAGE
        pic.line.width = Pt(1)
        return pic


def amber_note(slide, y, msg):
    box(slide, Inches(0.5), y, Inches(12.3), Inches(0.6), AMBER_BG, AMBER)
    text(slide, Inches(0.7), y, Inches(11.9), Inches(0.6), msg, 18, False, RGBColor(0x92, 0x40, 0x0E), anchor=MSO_ANCHOR.MIDDLE)


# 1 Cover -------------------------------------------------------------------
s = base(1, None)
text(s, Inches(0.5), Inches(2.0), Inches(6.2), Inches(1.6), "Arsa AI", 66, True, FOREST)
text(s, Inches(0.5), Inches(3.3), Inches(6.2), Inches(0.9), "JKN Risk Intelligence", 34, True, GREEN)
text(s, Inches(0.5), Inches(4.3), Inches(6.0), Inches(1.0), "Menemukan klaim berisiko, dan menunjukkan buktinya.", 26)
text(s, Inches(0.5), Inches(5.6), Inches(6.0), Inches(0.9), ["Kategori: Efisiensi Risiko pada fasilitas kesehatan", "Tim: [isi nama tim]"], 18, False, MUTED)
art(s, 1, Inches(7.0), Inches(1.2), Inches(5.9), Inches(5.6))

# 2 Tim ---------------------------------------------------------------------
s = base(2, "Tim kami")
for i, (nm, role, exp) in enumerate([
    ("Moch Aril Indra Permana", "Ketua tim, AI platform engineer", "[satu baris keahlian, sama dengan proposal]"),
    ("Salfarisa Fitria", "Data scientist dan ML engineer", "[satu baris keahlian, sama dengan proposal]"),
    ("[Anggota 3, jika ada]", "[peran]", "[keahlian]"),
]):
    x = Inches(0.9 + i * 4.1)
    circ = box(s, x + Inches(0.55), Inches(2.5), Inches(2.4), Inches(2.4), SAGE, MUTED, MSO_SHAPE.OVAL)
    text(s, x + Inches(0.55), Inches(2.5), Inches(2.4), Inches(2.4), "Foto", 18, False, MUTED, PP_ALIGN.CENTER, MSO_ANCHOR.MIDDLE)
    text(s, x, Inches(5.1), Inches(3.5), Inches(0.5), nm, 24, True, FOREST, PP_ALIGN.CENTER)
    text(s, x, Inches(5.6), Inches(3.5), Inches(0.5), role, 18, False, GREEN, PP_ALIGN.CENTER)
    text(s, x, Inches(6.1), Inches(3.5), Inches(0.8), exp, 16, False, MUTED, PP_ALIGN.CENTER)

# 3 Judul, deskripsi, tujuan -------------------------------------------------
s = base(3, "Arsa AI membantu verifikator memeriksa klaim berisiko dengan bukti yang bisa dicek")
text(s, Inches(0.5), Inches(2.5), Inches(6.2), Inches(3.5), [
    "Delapan detektor menandai klaim yang janggal.",
    "Setiap temuan membawa bukti: dokumen yang bertentangan, selisih terhadap klaim sejenis, klaim serupa.",
    "AI hanya menjelaskan dan selalu mengutip sumber.",
    "Manusia yang memutuskan.",
], 24)
text(s, Inches(7.3), Inches(2.5), Inches(5.5), Inches(0.5), "Tiga tujuan", 24, True, GREEN)
for i, g in enumerate(["Memusatkan pemeriksaan pada kasus prioritas", "Setiap temuan bersitasi", "Setiap keputusan tercatat di rantai audit yang tidak bisa diubah"]):
    text(s, Inches(7.3), Inches(3.2 + i * 1.1), Inches(0.6), Inches(0.8), str(i + 1), 40, True, FOREST)
    text(s, Inches(8.0), Inches(3.3 + i * 1.1), Inches(4.8), Inches(0.9), g, 22)
art(s, 3, Inches(7.3), Inches(6.2), Inches(5.5), Inches(0.9), "Ilustrasi opsional (kecil)")

# 4 Latar belakang -----------------------------------------------------------
s = base(4, "Persoalannya bukan kurang peringatan, melainkan kurang bukti dan konteks")
for i, (num, lab, src) in enumerate([
    ("208 juta", "peserta JKN", "Statistik BPJS Kesehatan 2018"),
    ("11,1 juta", "admisi rawat inap tingkat lanjut", "Statistik BPJS Kesehatan 2018"),
    ("Rp 4,75 juta", "rerata biaya klaim per admisi", "Statistik BPJS Kesehatan 2018"),
]):
    x = Inches(0.5 + i * 4.2)
    text(s, x, Inches(2.7), Inches(4.0), Inches(1.1), num, 54, True, GREEN)
    text(s, x, Inches(3.9), Inches(4.0), Inches(0.9), lab, 24)
    text(s, x, Inches(4.8), Inches(4.0), Inches(0.4), "Sumber: " + src, 16, False, MUTED)
text(s, Inches(0.5), Inches(5.6), Inches(12.3), Inches(1.0), "Peringatan tanpa konteks membuat verifikator tetap membuka berkas satu per satu.", 28, True, FOREST)
art(s, 4, Inches(9.0), Inches(0.9), Inches(3.9), Inches(1.4), "Ilustrasi opsional (kecil)")

# 5 Dampak -------------------------------------------------------------------
s = base(5, "Dampak yang kami ukur langsung di aplikasi")
for i, (before, after, lab) in enumerate([
    ("1.503 klaim", "65 kasus", "Beban awal pemeriksaan turun sekitar 96%"),
    ("Skor tanpa alasan", "97%", "temuan memuat sitasi bukti valid (125 dari 129)"),
    ("Ambang tunggal F1 0,269", "ARSA F1 0,811", "recall 90,4%, klaim normal ditandai 2,3%"),
]):
    x = Inches(0.5 + i * 4.2)
    box(s, x, Inches(2.4), Inches(3.9), Inches(3.4), SAGE)
    text(s, x + Inches(0.25), Inches(2.6), Inches(3.4), Inches(0.5), before, 20, False, MUTED)
    text(s, x + Inches(0.25), Inches(3.2), Inches(3.4), Inches(1.2), after, 40, True, GREEN)
    text(s, x + Inches(0.25), Inches(4.6), Inches(3.4), Inches(1.0), lab, 18)
amber_note(s, Inches(6.1), "Diukur pada data sintetis berlabel; belum divalidasi pada klaim riil.")

# 6 Alur proses --------------------------------------------------------------
s = base(6, "Dari berkas klaim sampai keputusan yang tercatat")
steps = [("1. Input", "CSV, XLSX, JSON, atau sampel BPJS"), ("2. Proses", "Identitas disamarkan, kolom dipetakan, baris tidak valid ditolak"),
         ("3. Analisis AI", "8 detektor dan benchmark per diagnosis, kelas, provinsi"), ("4. Output", "Antrean prioritas, bukti, dosier PDF"),
         ("5. Tindak lanjut", "Status dan alasan tertulis, tercatat di rantai audit")]
for i, (t, d) in enumerate(steps):
    x = Inches(0.5 + i * 2.5)
    hero = i == 2
    box(s, x, Inches(2.3), Inches(2.3), Inches(2.5), FOREST if hero else SAGE)
    text(s, x + Inches(0.15), Inches(2.45), Inches(2.0), Inches(0.5), t, 20, True, WHITE if hero else FOREST)
    text(s, x + Inches(0.15), Inches(3.05), Inches(2.0), Inches(1.7), d, 16, False, WHITE if hero else INK)
for i, (t, d) in enumerate([("Pengguna", "Investigator, Supervisor, Administrator"), ("Data", "Statistik resmi BPJS dan data sintetis berlabel, tanpa data peserta riil"), ("Teknologi", "Aturan deterministik, embedding, model bahasa hanya untuk penjelasan bersitasi")]):
    x = Inches(0.5 + i * 4.2)
    text(s, x, Inches(5.2), Inches(4.0), Inches(0.4), t, 20, True, GREEN)
    text(s, x, Inches(5.7), Inches(3.9), Inches(1.2), d, 16, False, MUTED)

# 7 Demo ---------------------------------------------------------------------
s = base(7, None, dark=True)
text(s, Inches(0.5), Inches(2.6), Inches(12.3), Inches(1.5), "Demo", 80, True, WHITE, PP_ALIGN.CENTER)
text(s, Inches(0.5), Inches(4.3), Inches(12.3), Inches(0.6), "https://arsa-jkn-627843549213.asia-southeast2.run.app", 22, False, SAGE, PP_ALIGN.CENTER)
text(s, Inches(0.5), Inches(5.0), Inches(12.3), Inches(0.5), "Masuk: supervisor@arsa.id  ·  Arsa#2026", 18, False, SAGE, PP_ALIGN.CENTER)

# 8 Fitur --------------------------------------------------------------------
s = base(8, "Empat fitur, masing-masing menjawab satu bagian masalah")
feats = [("Command Center dan peta risiko", "Menunjukkan di mana risiko menumpuk.", "s-command-center.png"),
         ("Pemeriksaan klaim dengan bukti", "Menjawab peringatan tanpa konteks.", "s-detail-kasus.png"),
         ("Copilot bersitasi", "Menjawab risiko AI berhalusinasi.", "s-copilot.png"),
         ("Unggah, privasi, dan audit", "Data baru masuk dengan aman dan tercatat.", "s-dataset.png")]
for i, (t, d, f) in enumerate(feats):
    x, y = Inches(0.5 + (i % 2) * 6.25), Inches(2.2 + (i // 2) * 2.5)
    shot(s, f, x, y, Inches(2.9))
    text(s, x + Inches(3.1), y + Inches(0.1), Inches(3.0), Inches(0.9), t, 22, True, FOREST)
    text(s, x + Inches(3.1), y + Inches(1.1), Inches(3.0), Inches(1.0), d, 18, False, MUTED)

# 9 Arsitektur dan data ------------------------------------------------------
s = base(9, "Arsitektur dan sumber data")
for i, t in enumerate(["Sumber data", "Anonimisasi", "Detektor dan skor", "Antrean dan dosier", "Audit SHA-256"]):
    x = Inches(0.5 + i * 2.5)
    hero = i == 2
    box(s, x, Inches(2.6), Inches(2.2), Inches(1.4), FOREST if hero else SAGE)
    text(s, x, Inches(2.6), Inches(2.2), Inches(1.4), t, 20, True, WHITE if hero else FOREST, PP_ALIGN.CENTER, MSO_ANCHOR.MIDDLE)
text(s, Inches(0.5), Inches(4.5), Inches(12.3), Inches(1.0), "Data: statistik resmi BPJS (36 dari 75 berkas, diverifikasi independen: 5.729 pemeriksaan, 0 selisih) dan data klaim sintetis berlabel. Data peserta riil tidak dipakai.", 20)
text(s, Inches(0.5), Inches(5.9), Inches(12.3), Inches(0.6), "Next.js  ·  PostgreSQL + pgvector  ·  Cloud Run", 20, True, GREEN)

# 10 Keamanan ----------------------------------------------------------------
s = base(10, "Privasi dan tata kelola dirancang sejak input")
for i, (t, d) in enumerate([("Identitas disamarkan", "HMAC, inisial, kolom identitas dibuang sebelum disimpan"), ("Tiga peran", "Investigator, Supervisor, Administrator dengan hak berbeda"), ("Rantai audit", "SHA-256, hanya bisa ditambah; kebijakan hanya diubah Administrator")]):
    x = Inches(0.5 + i * 4.2)
    box(s, x, Inches(2.5), Inches(3.9), Inches(3.2), SAGE)
    text(s, x + Inches(0.3), Inches(2.8), Inches(3.3), Inches(0.7), t, 26, True, FOREST)
    text(s, x + Inches(0.3), Inches(3.7), Inches(3.3), Inches(1.8), d, 20)

# 11 Hasil uji dan batasan ---------------------------------------------------
s = base(11, "Yang sudah diuji, dan yang belum")
box(s, Inches(0.5), Inches(2.4), Inches(6.0), Inches(4.0), SAGE)
text(s, Inches(0.8), Inches(2.6), Inches(5.4), Inches(0.5), "Sudah diuji", 26, True, GREEN)
text(s, Inches(0.8), Inches(3.3), Inches(5.4), Inches(3.0), ["137 tes otomatis lulus", "Alur unggah CSV, XLSX, JSON, dan berkas bermasalah", "Data acuan BPJS: 5.729 pemeriksaan, 0 selisih", "F1 makro 82,7% pada data sintetis"], 20)
box(s, Inches(6.8), Inches(2.4), Inches(6.0), Inches(4.0), AMBER_BG, AMBER)
text(s, Inches(7.1), Inches(2.6), Inches(5.4), Inches(0.5), "Belum", 26, True, RGBColor(0x92, 0x40, 0x0E))
text(s, Inches(7.1), Inches(3.3), Inches(5.4), Inches(3.0), ["Validasi pada klaim riil", "Detektor dengan kasus berlabel di bawah 10 hanya indikatif", "Klaim penghematan waktu belum diukur"], 20)

# 12 Rencana -----------------------------------------------------------------
s = base(12, "Rencana pengembangan")
for i, (t, d) in enumerate([("Tahap 1", "Pilot terbatas dengan data klaim teranonimkan atas izin resmi"), ("Tahap 2", "Kalibrasi detektor dan ambang dengan label investigasi nyata"), ("Tahap 3", "Integrasi ke alur verifikasi BPJS")]):
    x = Inches(0.5 + i * 4.2)
    box(s, x, Inches(2.5), Inches(0.5), Inches(0.5), GREEN, None, MSO_SHAPE.OVAL)
    text(s, x + Inches(0.7), Inches(2.5), Inches(3.0), Inches(0.5), t, 24, True, FOREST, anchor=MSO_ANCHOR.MIDDLE)
    text(s, x, Inches(3.4), Inches(3.8), Inches(1.8), d, 20)
text(s, Inches(0.5), Inches(5.8), Inches(12.3), Inches(0.6), "Setiap tahap diukur dengan indikator yang sama seperti pada slide dampak.", 20, False, MUTED)

# 13 Terima kasih ------------------------------------------------------------
s = base(13, "Terima kasih", dark=True)
text(s, Inches(0.5), Inches(2.5), Inches(8.0), Inches(0.5), "Prototype", 18, True, SAGE)
text(s, Inches(0.5), Inches(3.0), Inches(8.0), Inches(0.5), "https://arsa-jkn-627843549213.asia-southeast2.run.app", 20, False, WHITE)
text(s, Inches(0.5), Inches(3.8), Inches(8.0), Inches(0.5), "Repositori", 18, True, SAGE)
text(s, Inches(0.5), Inches(4.3), Inches(8.0), Inches(0.5), "https://github.com/mocharil/jkn-risk-intelligence", 20, False, WHITE)
text(s, Inches(0.5), Inches(5.1), Inches(8.0), Inches(0.5), "Kontak", 18, True, SAGE)
text(s, Inches(0.5), Inches(5.6), Inches(8.0), Inches(0.5), "[nama ketua tim]  ·  [email]", 20, False, WHITE)
b = box(s, Inches(9.6), Inches(2.5), Inches(3.0), Inches(3.0), SAGE)
text(s, Inches(9.6), Inches(2.5), Inches(3.0), Inches(3.0), "Tempel QR\nke tautan prototype", 16, False, MUTED, PP_ALIGN.CENTER, MSO_ANCHOR.MIDDLE)
text(s, Inches(0.5), Inches(6.5), Inches(12.0), Inches(0.5), "Arsa AI tidak menggantikan verifikator. Ia membuktikan klaim mana yang layak diperiksa.", 18, False, SAGE)

os.makedirs(IMGS, exist_ok=True)
out = os.path.join(ROOT, "slides", "Arsa_AI_Healthkathon_2026.pptx")
prs.save(out)
print("tersimpan:", out, "| catatan pembicara terisi:", sum(1 for k in NOTES if NOTES[k]), "slide")
