"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { FileCheck2, Hash, Link2, ShieldCheck, Sparkles } from "lucide-react";
import { formatNumber, formatRupiah } from "@/lib/formatting/currency";
import { PublicStats, RISK_LABEL } from "./stats";

const DOTS = {
  backgroundImage: "radial-gradient(circle, rgba(46,107,56,0.08) 1px, transparent 1px)",
  backgroundSize: "18px 18px",
};

function Card({ span, delay = 0, children }: { span: string; delay?: number; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, delay }}
      whileHover={{ y: -4 }}
      className={`${span} rounded-[26px] border border-stone-200/90 bg-white p-6 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col gap-5 relative overflow-hidden`}
      style={DOTS}
    >
      {children}
    </motion.div>
  );
}

function Heading({ title, text }: { title: React.ReactNode; text: string }) {
  return (
    <div>
      <h3 className="text-lg sm:text-xl font-semibold text-[#141A16]">{title}</h3>
      <p className="text-xs text-stone-500 mt-1.5 max-w-md leading-relaxed">{text}</p>
    </div>
  );
}

/** Antrean teratas dari hasil analisis: urutan, sinyal detektor, eksposur, dan skor risiko. */
export function PriorityQueueCard({ stats }: { stats: PublicStats | null }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const rows = stats?.top_claims ?? [];
  return (
    <Card span="lg:col-span-6" delay={0.08}>
      <Heading
        title="Antrean klaim diprioritaskan AI"
        text="Berkas diurutkan otomatis dari skor risiko komposit, selisih tarif INA-CBG, dan jumlah sinyal detektor, sehingga verifikator mulai dari klaim yang paling krusial."
      />
      <div ref={ref} className="rounded-2xl border border-stone-200/80 bg-white/80 p-3 space-y-2">
        <div className="flex items-center justify-between px-1 text-[11px] text-stone-500">
          <span className="font-semibold text-[#141A16]">Prioritas telaah</span>
          <span>{stats ? `${rows.length} teratas dari ${formatNumber(stats.queue_cases)} kasus` : "memuat..."}</span>
        </div>
        {rows.map((r, i) => (
          <Link key={r.claim_id} href={`/investigations/${r.claim_id}`} className="block">
            <motion.div
              initial={reduce ? false : { opacity: 0, x: -14 }}
              animate={inView ? { opacity: 1, x: 0 } : undefined}
              transition={{ duration: 0.45, delay: 0.1 + i * 0.12 }}
              className="rounded-xl border border-stone-200/80 bg-[#F6F9F7] hover:bg-[#EEF5F0] px-3 py-2.5 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-md bg-[#1D3B23] text-white text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                <span className="font-mono text-[12px] font-semibold text-[#141A16] whitespace-nowrap shrink-0">{r.claim_id}</span>
                <div className="flex flex-wrap gap-1 min-w-0">
                  {r.signals.slice(0, 2).map((s) => (
                    <span key={s} className="px-1.5 py-0.5 rounded bg-white border border-stone-200 text-[10px] text-stone-600 whitespace-nowrap">
                      {RISK_LABEL[s] ?? s}
                    </span>
                  ))}
                </div>
                <span className="ml-auto text-[11px] font-mono text-stone-500 whitespace-nowrap hidden sm:block">{r.exposure > 0 ? formatRupiah(r.exposure, true) : "—"}</span>
                <span className="px-2 py-0.5 rounded-md bg-red-50 border border-red-100 text-red-700 text-[11px] font-bold">{r.risk_score}</span>
              </div>
              <div className="mt-2 h-1 rounded-full bg-stone-200/70 overflow-hidden">
                <motion.div
                  initial={reduce ? false : { width: 0 }}
                  animate={inView ? { width: `${r.risk_score}%` } : undefined}
                  transition={{ duration: 0.9, delay: 0.3 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-red-500"
                />
              </div>
            </motion.div>
          </Link>
        ))}
        {!stats && <div className="h-40" />}
      </div>
    </Card>
  );
}

/** Rantai hash audit: tiga blok tersambung dengan denyut yang merambat, plus jumlah entri nyata. */
export function AuditChainCard({ stats }: { stats: PublicStats | null }) {
  const reduce = useReducedMotion();
  const steps = [
    { icon: FileCheck2, label: "Keputusan klaim" },
    { icon: Hash, label: "Hash SHA-256" },
    { icon: Link2, label: "Tersambung ke entri sebelumnya" },
  ];
  return (
    <Card span="lg:col-span-3" delay={0.14}>
      <Heading title="Jejak audit tersegel" text="Setiap keputusan dan perubahan kebijakan masuk rantai hash yang tidak bisa diubah diam-diam." />
      <div className="relative flex flex-col gap-3 pl-1">
        <div className="absolute left-[19px] top-4 bottom-4 w-px bg-emerald-200" />
        {!reduce && (
          <motion.span
            animate={{ top: ["8%", "82%"], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute left-[15px] w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"
          />
        )}
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={reduce ? false : { opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 + i * 0.15 }}
              className="relative flex items-center gap-3 rounded-xl bg-[#F6F9F7] border border-stone-200/80 px-2.5 py-2"
            >
              <span className="w-7 h-7 rounded-lg bg-white border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                <Icon className="w-3.5 h-3.5" />
              </span>
              <span className="text-[11px] font-medium text-stone-700 leading-snug">{s.label}</span>
            </motion.div>
          );
        })}
      </div>
      <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-800">
        <ShieldCheck className="w-3.5 h-3.5" />
        {stats ? (stats.audit.valid ? `Rantai valid · ${formatNumber(stats.audit.entries)} entri` : "Rantai perlu diperiksa") : "Memverifikasi..."}
      </div>
    </Card>
  );
}

/** Ikhtisar eksekutif: empat angka inti dari hasil analisis. */
export function OverviewCard({ stats }: { stats: PublicStats | null }) {
  const tiles: Array<[string, string, string, string]> = [
    ["Skor F1", stats?.macro_f1 ? (stats.macro_f1 * 100).toFixed(1).replace(".", ",") : "—", "data sintetis berlabel", "text-emerald-700"],
    ["Klaim dianalisis", stats ? formatNumber(stats.claims) : "—", `${stats?.detectors ?? 8} detektor`, "text-stone-800"],
    ["Berisiko tinggi", stats ? formatNumber(stats.high_risk_claims) : "—", "skor risiko ≥ 75", "text-red-600"],
    ["Faskes berisiko", stats ? formatNumber(stats.risky_providers) : "—", `dari ${stats?.providers ?? "—"} faskes`, "text-stone-800"],
  ];
  return (
    <Card span="lg:col-span-5" delay={0.2}>
      <Heading title="Ikhtisar eksekutif" text="Potret ringkas prioritas klaim, kualitas deteksi, dan faskes berisiko dalam sekali lihat." />
      <div className="grid grid-cols-2 gap-3">
        {tiles.map(([k, v, sub, tone], i) => (
          <motion.div
            key={k}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 + i * 0.08 }}
            className="rounded-2xl border border-stone-200/80 bg-[#F6F9F7] p-4"
          >
            <div className="text-[11px] text-stone-500">{k}</div>
            <div className={`mt-1 text-2xl font-bold font-mono tracking-tight ${tone}`}>{v}</div>
            <div className="text-[10px] text-stone-400 mt-0.5">{sub}</div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

const QUESTION = "Mengapa klaim CLM-10293 dianggap berisiko?";
const ANSWER: Array<{ text: string; cite?: string }> = [
  { text: "Tagihan memuat bedah laparoskopik Rp 12,5 juta, tetapi catatan tindakan DPJP tidak mencatat tindakan bedah apa pun.", cite: "DOC-10293-04" },
  { text: "Lama rawat 6 hari juga melebihi median peer untuk gastroenteritis.", cite: "DOC-10293-02" },
];

/** Percakapan Copilot yang berulang: pertanyaan diketik, bukti ditelusuri, jawaban mengalir dengan sitasi yang divalidasi. */
export function CopilotCard() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-80px" });
  const [typed, setTyped] = useState(reduce ? QUESTION.length : 0);
  const [phase, setPhase] = useState<"typing" | "thinking" | "answer" | "hold">(reduce ? "hold" : "typing");
  const [shown, setShown] = useState(reduce ? 99 : 0);

  useEffect(() => {
    if (reduce || !inView) return;
    let t: ReturnType<typeof setTimeout>;
    if (phase === "typing") {
      if (typed < QUESTION.length) t = setTimeout(() => setTyped(typed + 1), 38);
      else t = setTimeout(() => setPhase("thinking"), 500);
    } else if (phase === "thinking") {
      t = setTimeout(() => setPhase("answer"), 1100);
    } else if (phase === "answer") {
      const total = ANSWER.reduce((a, p) => a + p.text.split(" ").length, 0);
      if (shown < total) t = setTimeout(() => setShown(shown + 1), 55);
      else t = setTimeout(() => setPhase("hold"), 300);
    } else {
      t = setTimeout(() => {
        setTyped(0);
        setShown(0);
        setPhase("typing");
      }, 4200);
    }
    return () => clearTimeout(t);
  }, [phase, typed, shown, inView, reduce]);

  let budget = shown;
  return (
    <Card span="lg:col-span-4" delay={0.26}>
      <div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-[#2E6B38] text-white text-[11px] font-bold">Baru</span>
          <h3 className="text-lg font-semibold text-[#141A16]">ARSA Copilot</h3>
        </div>
        <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">Tanya dalam bahasa sehari-hari. Jawaban hanya memakai bukti yang bisa ditelusuri ke dokumen sumber.</p>
      </div>

      <div ref={ref} className="rounded-2xl border border-stone-200/80 bg-[#F6F9F7] p-3 space-y-2.5 min-h-[250px]">
        <div className="ml-auto max-w-[88%] rounded-2xl rounded-br-md bg-[#1E4D24] text-white text-[11px] leading-snug px-3 py-2">
          {QUESTION.slice(0, typed)}
          {phase === "typing" && <span className="inline-block w-px h-3 bg-white/80 ml-0.5 align-middle animate-pulse" />}
        </div>

        {phase !== "typing" && (
          <div className="max-w-[94%] rounded-2xl rounded-bl-md bg-white border border-stone-200 text-[11px] leading-relaxed text-stone-700 px-3 py-2 space-y-1.5">
            <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
              <Sparkles className="w-3 h-3" /> ARSA Copilot
            </div>
            {phase === "thinking" ? (
              <div className="flex items-center gap-1 py-1">
                {[0, 1, 2].map((d) => (
                  <motion.span key={d} animate={{ opacity: [0.25, 1, 0.25] }} transition={{ duration: 1, repeat: Infinity, delay: d * 0.18 }} className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                ))}
                <span className="ml-1 text-[10px] text-stone-400">menelusuri dokumen klaim...</span>
              </div>
            ) : (
              ANSWER.map((p, i) => {
                const words = p.text.split(" ");
                const take = Math.max(0, Math.min(words.length, budget));
                budget -= take;
                if (take === 0) return null;
                return (
                  <p key={i}>
                    {words.slice(0, take).join(" ")}
                    {take === words.length && p.cite && (
                      <motion.span
                        initial={reduce ? false : { opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="ml-1 inline-block whitespace-nowrap font-mono text-[10px] font-semibold text-white bg-[#00853F] rounded px-1.5 py-px align-[1px]"
                      >
                        {p.cite}
                      </motion.span>
                    )}
                  </p>
                );
              })
            )}
          </div>
        )}

        {phase === "hold" && (
          <motion.div initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
            <ShieldCheck className="w-3 h-3" /> Sitasi tervalidasi terhadap dokumen sumber
          </motion.div>
        )}
      </div>
    </Card>
  );
}
