"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";

const STEPS = [
  { key: "cc", tab: "Command Center", file: "01-command-center", title: "Mulai dari gambaran besar", text: "Eksposur finansial, klaim berisiko, dan peta panas provinsi dalam satu layar." },
  { key: "queue", tab: "Antrean", file: "02-pemeriksaan-klaim", title: "Kerjakan yang paling krusial lebih dulu", text: "Kasus diurutkan menurut skor, bisa disaring menurut jenis temuan." },
  { key: "case", tab: "Detail kasus", file: "03-detail-kasus", title: "Skor selalu disertai alasan", text: "Skor tiap detektor, posisi tagihan terhadap median peer dan rerata BPJS." },
  { key: "proof", tab: "Papan bukti", file: "09-papan-bukti", title: "Kutipan rekam medis yang membantah tagihan", text: "Dokumen sumber ditampilkan verbatim, bukan ringkasan yang bisa meleset." },
  { key: "graph", tab: "Graf relasi", file: "10-graf-kasus", title: "Pola yang tak terlihat dari satu klaim", text: "Satu dokter, satu faskes, enam klaim berisiko tinggi dalam satu klaster." },
  { key: "audit", tab: "Audit trail", file: "13-audit-trail", title: "Keputusan manusia, tercatat permanen", text: "Alasan tertulis wajib, dan setiap entri tersambung ke rantai hash SHA-256." },
  { key: "copilot", tab: "Copilot", file: "05-copilot", title: "Tanya dalam bahasa sehari-hari", text: "Setiap pernyataan bersitasi, dan peta perbandingan tampil langsung di jawaban." },
  { key: "data", tab: "Dataset", file: "07-dataset", title: "Unggah berkas sendiri", text: "Kolom dipetakan otomatis, identitas pasien disamarkan, baris bermasalah ditolak beralasan." },
  { key: "eval", tab: "Evaluasi", file: "06-evaluasi", title: "Jujur soal angka", text: "Diukur pada data sintetis berlabel; batasan itu selalu terlihat di halaman." },
] as const;

/** Tur produk: tangkapan layar asli dalam bingkai peramban. Fitur berganti sendiri mengikuti gulir halaman (bagian menempel di layar), dan tab tetap bisa diklik. */
export function ProductTour() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const [i, setI] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  useMotionValueEvent(scrollYProgress, "change", (v) => setI(Math.max(0, Math.min(STEPS.length - 1, Math.floor(v * STEPS.length)))));

  const jump = (k: number) => {
    const el = ref.current;
    if (!el) return;
    const span = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: el.offsetTop + ((k + 0.5) / STEPS.length) * span, behavior: reduce ? "auto" : "smooth" });
  };

  const s = STEPS[i];
  return (
    <section id="tour" ref={ref} className="relative" style={{ height: `${STEPS.length * 55 + 45}vh` }}>
      <div className="sticky top-0 h-screen max-w-6xl mx-auto px-6 pt-24 pb-6 flex flex-col justify-center">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 mb-4">
          <span className="w-5 h-5 rounded-md bg-[#2E6B38] text-white flex items-center justify-center text-[10px] font-bold">▶</span>
          <span className="text-xs font-medium text-stone-500">Tur produk</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-semibold tracking-[-0.025em] text-[#141A16] leading-[1.12]">Lihat langsung cara kerjanya</h2>
        <p className="mt-2 text-sm text-stone-600">Gulir ke bawah, fitur berganti sendiri. Tangkapan layar asli dari aplikasi.</p>
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-1.5" role="tablist" aria-label="Fitur aplikasi">
        {STEPS.map((st, k) => (
          <button
            key={st.key}
            role="tab"
            aria-selected={k === i}
            onClick={() => jump(k)}
            className={`relative px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${k === i ? "bg-[#12381B] text-white border-[#12381B]" : "bg-white text-stone-600 border-stone-200 hover:border-[#2E6B38]/50"}`}
          >
            {st.tab}
          </button>
        ))}
      </div>

      <div className="mt-5 grid lg:grid-cols-[1fr_280px] gap-6 items-start">
        <div className="rounded-2xl border border-stone-200 bg-white shadow-[0_30px_80px_-30px_rgba(18,56,27,0.35)] overflow-hidden">
          <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-stone-200 bg-[#F6F9F7]">
            <span className="w-2.5 h-2.5 rounded-full bg-red-300" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
            <span className="ml-3 flex-1 max-w-sm rounded-md bg-white border border-stone-200 px-3 py-0.5 text-[10px] text-stone-400 font-mono truncate">arsa-jkn.run.app / {s.key}</span>
          </div>
          <div className="relative aspect-[16/9] bg-[#F4F7F5]">
            <AnimatePresence mode="wait">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <motion.img
                key={s.file}
                src={`/tour/${s.file}.jpg`}
                alt={s.title}
                initial={reduce ? false : { opacity: 0, scale: 1.015 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduce ? undefined : { opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 w-full h-full object-cover object-top"
              />
            </AnimatePresence>
          </div>
        </div>

        <div className="lg:pt-6">
          <AnimatePresence mode="wait">
            <motion.div key={s.key} initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0 }} transition={{ duration: 0.3 }}>
              <div className="font-mono text-xs font-bold text-[#2E6B38]">{String(i + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}</div>
              <h3 className="mt-2 text-xl font-semibold text-[#141A16] leading-snug">{s.title}</h3>
              <p className="mt-2 text-sm text-stone-600 leading-relaxed">{s.text}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <div className="mx-auto mt-4 h-1 w-48 rounded-full bg-stone-200 overflow-hidden" aria-hidden>
        <motion.div className="h-full bg-[#2E6B38] origin-left" style={{ scaleX: scrollYProgress }} />
      </div>
      </div>
    </section>
  );
}
