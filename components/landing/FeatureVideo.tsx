"use client";

import { useRef, useState } from "react";

// Waktu bab harus sama dengan CHAPTERS/SCENES di scripts/video/explainer.html.
const CHAPTERS = [
  { t: 0, label: "Masalah", desc: "Ribuan klaim per bulan; pola yang merugikan tersembunyi di detail." },
  { t: 6.5, label: "Anonimisasi", desc: "Identitas peserta disamarkan sebelum data disimpan." },
  { t: 17, label: "Deteksi", desc: "Delapan detektor memeriksa aturan INA-CBG dan tarif sejenis." },
  { t: 31, label: "Kloning narasi", desc: "Resume yang disalin antar pasien ditemukan lewat kemiripan." },
  { t: 43, label: "Penjelasan bersitasi", desc: "Copilot menjawab dengan rujukan ke kutipan rekam medis." },
  { t: 57, label: "Keputusan dan audit", desc: "Supervisor memutuskan; setiap langkah masuk rantai hash." },
];

const TRANSCRIPT = [
  "Setiap bulan, jutaan klaim JKN diverifikasi. Pola yang merugikan sering tersembunyi di detail rekam medis.",
  "Data SIMRS dan E-Klaim diunggah apa adanya. Identitas peserta disamarkan sebelum disimpan, jadi AI hanya membaca pseudonim.",
  "Delapan detektor memeriksa setiap klaim terhadap aturan INA-CBG dan klaim sejenis dari rumah sakit setara. Klaim CLM-10293 memicu enam sinyal, skor risiko 99.",
  "Resume medis yang disalin dari pasien lain terdeteksi lewat kemiripan makna (98,6%) dan frasa, walau identitas pasiennya berbeda.",
  "Copilot menjawab dengan rujukan ke kutipan rekam medis. Rujukan yang tidak cocok dengan dokumen klaim dibuang.",
  "Keputusan akhir tetap di tangan supervisor. Setiap langkah tercatat di rantai hash SHA-256 dan ikut tercetak di dosier PDF.",
];

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function FeatureVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(-1);

  const onTime = () => {
    const t = ref.current?.currentTime ?? 0;
    let idx = 0;
    CHAPTERS.forEach((c, i) => {
      if (t >= c.t) idx = i;
    });
    setActive(idx);
  };

  const jump = (i: number) => {
    const v = ref.current;
    if (!v) return;
    v.currentTime = CHAPTERS[i].t;
    setActive(i);
    void v.play().catch(() => {});
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
      <div className="lg:col-span-8">
        <video
          ref={ref}
          controls
          playsInline
          preload="metadata"
          poster="/video/arsa-explainer-poster.jpg"
          onTimeUpdate={onTime}
          aria-describedby="video-transcript"
          className="w-full aspect-video rounded-2xl bg-[#06241A] border border-black/10 shadow-[0_24px_60px_-30px_rgba(6,36,26,0.5)]"
        >
          <source src="/video/arsa-explainer.mp4" type="video/mp4" />
          Peramban Anda tidak dapat memutar video ini.{" "}
          <a href="/video/arsa-explainer.mp4">Unduh videonya</a>.
        </video>
        <details id="video-transcript" className="mt-4 text-sm text-jkn-muted">
          <summary className="cursor-pointer font-medium text-jkn-text hover:text-bpjs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bpjs rounded">
            Baca isi video
          </summary>
          <div className="mt-3 space-y-2 max-w-2xl leading-relaxed">
            {TRANSCRIPT.map((line, i) => (
              <p key={i}>
                <span className="font-mono text-xs text-jkn-muted mr-2">{fmt(CHAPTERS[i].t)}</span>
                {line}
              </p>
            ))}
          </div>
        </details>
      </div>

      <ol className="lg:col-span-4 divide-y divide-black/10 border-y border-black/10" aria-label="Bab video">
        {CHAPTERS.map((c, i) => (
          <li key={c.label}>
            <button
              type="button"
              onClick={() => jump(i)}
              aria-current={active === i ? "step" : undefined}
              className={`w-full text-left py-3.5 px-3 grid grid-cols-[52px_1fr] gap-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bpjs rounded-sm ${
                active === i ? "bg-bpjs-light" : "hover:bg-black/[0.03]"
              }`}
            >
              <span className={`font-mono text-sm tabular-nums pt-0.5 ${active === i ? "text-bpjs-dark font-semibold" : "text-jkn-muted"}`}>
                {fmt(c.t)}
              </span>
              <span>
                <span className={`block text-[15px] font-semibold ${active === i ? "text-bpjs-dark" : "text-jkn-text"}`}>{c.label}</span>
                <span className="block text-[13px] text-jkn-muted mt-0.5 leading-snug">{c.desc}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
