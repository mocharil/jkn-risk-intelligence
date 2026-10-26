"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Potongan berkas klaim CLM-10293 di hero: tagihan bedah vs catatan tindakan yang membantahnya.
 * Satu urutan animasi saat halaman dimuat (stabilo menyapu kutipan, lalu temuan muncul);
 * dengan prefers-reduced-motion langsung tampil dalam keadaan akhir.
 */
export function HeroEvidenceSpecimen({ score = 99 }: { score?: number }) {
  const reduce = useReducedMotion();
  const at = (delay: number, duration = 0.5) => (reduce ? { duration: 0 } : { delay, duration, ease: [0.16, 1, 0.3, 1] as const });

  return (
    <motion.figure
      aria-label="Contoh temuan Arsa pada klaim CLM-10293: bedah ditagih, tetapi catatan tindakan menyatakan tidak ada bedah."
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={at(0.25, 0.7)}
      className="relative w-full max-w-[520px] ml-auto rounded-2xl bg-[#F6F8F4] text-[#10251B] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] overflow-hidden"
    >
      <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-4 border-b border-[#DDE4DE]">
        <div>
          <div className="font-mono text-lg font-semibold tracking-tight">CLM-10293</div>
          <div className="text-xs text-[#5F7269] mt-0.5">RS Sehat Sentosa, Jakarta Selatan. Gastroenteritis, rawat 6 hari.</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-3xl font-extrabold leading-none tracking-tighter text-[#C4281C]">{score}</div>
          <div className="text-[11px] text-[#5F7269] mt-1 font-medium">skor risiko</div>
        </div>
      </div>

      <div className="px-6 py-4 space-y-4">
        <div>
          <div className="text-[11px] font-semibold text-[#5F7269]">Rincian tagihan</div>
          <div className="mt-1.5 font-mono text-[13px] flex flex-wrap justify-between gap-x-3 gap-y-1">
            <span>44.95 Bedah digestif laparoskopik</span>
            <motion.span
              className="font-semibold whitespace-nowrap underline decoration-2 underline-offset-4"
              initial={reduce ? false : { textDecorationColor: "rgba(196,40,28,0)" }}
              animate={{ textDecorationColor: "rgba(196,40,28,1)" }}
              transition={at(1.0, 0.4)}
            >
              Rp 12.500.000
            </motion.span>
          </div>
        </div>

        <div>
          <div className="text-[11px] font-semibold text-[#5F7269]">Catatan tindakan DPJP, 2 September 2026</div>
          <p className="mt-1.5 font-mono text-[13px] leading-relaxed text-[#22382D]">
            Perintah: lanjutkan infus, diet bubur lunak.{" "}
            <motion.mark
              className="text-inherit bg-no-repeat rounded-sm [box-decoration-break:clone] px-0.5"
              style={{ backgroundImage: "linear-gradient(rgba(242,212,70,0.7), rgba(242,212,70,0.7))", backgroundColor: "transparent" }}
              initial={reduce ? false : { backgroundSize: "0% 100%" }}
              animate={{ backgroundSize: "100% 100%" }}
              transition={at(1.4, 0.9)}
            >
              Tidak ada catatan tindakan bedah digestif (44.95)
            </motion.mark>{" "}
            pada lembar perintah DPJP maupun registri kamar operasi.
          </p>
        </div>
      </div>

      <motion.figcaption
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={at(2.4, 0.5)}
        className="mx-3 mb-3 rounded-xl bg-white border border-[#E8D3D0] px-4 py-3 flex gap-3"
      >
        <span aria-hidden className="mt-1.5 h-2 w-2 rounded-full bg-[#C4281C] shrink-0" />
        <div className="text-[13px] leading-snug">
          <div className="font-bold text-[#C4281C]">Tagihan fiktif terdeteksi</div>
          <div className="text-[#3A4F44] mt-0.5">
            Bedah ditagih Rp 12,5 juta, tetapi tidak tercatat di kamar operasi.{" "}
            <span className="inline-block whitespace-nowrap font-mono text-[11px] font-semibold text-white bg-[#00853F] rounded px-1.5 py-px align-[1px]">DOC-10293-04</span>
          </div>
        </div>
      </motion.figcaption>
    </motion.figure>
  );
}
