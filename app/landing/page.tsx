"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { formatRupiah, formatNumber } from "@/lib/formatting/currency";
import { RiskPill } from "@/components/ui/RiskPill";
import { IndonesiaRiskMap } from "@/components/map/IndonesiaRiskMap";
import { ProvinceRiskData, RiskType } from "@/types/risk";
import {
  NumberTicker,
  BlurFade,
  StaggeredHeadline,
  SpotlightCard,
  HeroForensicIllustration,
  InfiniteTelemetryMarquee,
} from "@/components/ui/magic-landing-effects";

interface PublicStats {
  claims: number;
  flagged_claims: number;
  detectors: number;
  narratives_embedded: number;
  macro_f1: number;
  hero: {
    amount: number;
    peer_median: number;
    exposure: number;
    score: number;
    clone_partner?: string;
    clone_similarity?: number;
  } | null;
}

const AUDIENCE_JOURNEYS = [
  {
    code: "01",
    role: "Verifikator Klaim",
    subtitle: "Prioritisasi berkas harian berbasis skor komposit dan sitasi rekam medis verbatim.",
    metric: "524 Berkas Antrean",
    href: "/investigation-queue",
    cta: "Buka Antrean",
    image: "/landing/role-verifikator.png",
    previewCode: "INV-2026-010293 · Skor 99",
  },
  {
    code: "02",
    role: "Auditor Forensik",
    subtitle: "Telusuri kemiripan narasi lintas pasien, anomali tarif, dan cetak dosier audit resmi.",
    metric: "8 Detektor Aktif",
    href: "/claims",
    cta: "Telusuri Klaim",
    image: "/landing/role-auditor.png",
    previewCode: "Cosine Similarity 96,4%",
  },
  {
    code: "03",
    role: "Eksekutif & Kebijakan",
    subtitle: "Pantau sebaran eksposur finansial nasional dan indikator risiko pada 38 provinsi.",
    metric: "38 Provinsi Dipantau",
    href: "/",
    cta: "Command Center",
    image: "/landing/role-eksekutif.png",
    previewCode: "Peta Risiko Nasional",
  },
  {
    code: "04",
    role: "Tim Data & SIMRS",
    subtitle: "Unggah sampel ekspor SIMRS atau uji akurasi detektor terhadap ground-truth.",
    metric: "F1 Makro 91,4%",
    href: "/data-management",
    cta: "Uji Dataset",
    image: "/landing/role-simrs.png",
    previewCode: "Pipeline Anonimisasi UU PDP",
  },
];

const CORE_PILLARS = [
  {
    num: "01",
    code: "INA-CBG & KLINIS",
    title: "Verifikasi Aturan Klinis & Kewajaran Tarif",
    summary:
      "Mendeteksi Upcoding tingkat keparahan (Severity Level II/III), pemecahan episode tagihan (Unbundling), lama rawat abnormal (LOS), dan mark-up komponen biaya terhadap median peer sejenis.",
    signals: ["UPCODING", "ABNORMAL_LOS", "UNBUNDLING", "INFLATED_BILLS"] as RiskType[],
    href: "/claims",
    image: "/landing/pillar-01.png",
  },
  {
    num: "02",
    code: "VEKTOR & DOKUMEN",
    title: "Forensik Teks Medis & Lintas Dokumen",
    summary:
      "Mengukur kemiripan vektor semantik dan tumpang tindih frasa 3-gram untuk menangkap duplikasi narasi (Cloning) serta klaim tindakan bedah fiktif tanpa laporan operasi (Phantom Billing).",
    signals: ["CLONING", "PHANTOM_BILLING", "REPEAT_BILLING", "READMISSION"] as RiskType[],
    href: "/investigation-queue",
    image: "/landing/pillar-02.png",
  },
  {
    num: "03",
    code: "SITASI VERBATIM",
    title: "AI Pendukung Keputusan Tanpa Halusinasi",
    summary:
      "Setiap ringkasan temuan wajib menautkan bukti kutipan rekam medis secara langsung. Keputusan akhir tetap sepenuhnya berada di tangan verifikator dan supervisor manusia.",
    signals: [] as RiskType[],
    href: "/ai-copilot",
    image: "/landing/pillar-03.png",
  },
  {
    num: "04",
    code: "TATA KELOLA & PRIVASI",
    title: "Anonimisasi UU PDP & Rantai Hash SHA-256",
    summary:
      "Identitas peserta disamarkan di memori sebelum penyimpanan, sementara setiap keputusan audit diikat dalam rantai hash kriptografis append-only yang tercetak pada dosier PDF.",
    signals: [] as RiskType[],
    href: "/settings",
    image: "/landing/pillar-04.png",
  },
];

export default function LandingPage() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [provinces, setProvinces] = useState<ProvinceRiskData[]>([]);
  const [heroSlide, setHeroSlide] = useState<0 | 1 | 2>(0);
  const [selectedCaseId, setSelectedCaseId] = useState<"CLM-10293" | "CLM-09283" | "CLM-08741">("CLM-10293");
  const [activePillar, setActivePillar] = useState<number>(0);

  useEffect(() => {
    fetch("/api/public/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j?.data && setStats(j.data))
      .catch(() => {});

    fetch("/api/dashboard")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j?.province_risk && setProvinces(j.province_risk))
      .catch(() => {});
  }, []);

  const clonePct =
    stats?.hero?.clone_similarity !== undefined
      ? `${(stats.hero.clone_similarity * 100).toFixed(1)}%`
      : "99,6%";

  const heroSlides = [
    {
      kicker: "01 / INTEGRITAS KLAIM KESEHATAN NASIONAL",
      headline: ["MENJAGA", "AKUNTABILITAS", "DANA JKN"],
      description:
        "Platform intelijen audit klaim INA-CBG yang memadukan 8 detektor deterministik, kemiripan vektor rekam medis, dan sitasi bukti verbatim.",
      ctaLabel: "Buka Command Center",
      ctaHref: "/",
      image: "/landing/hero-bg.png",
    },
    {
      kicker: "02 / TRIASE FORENSIK BERBASIS BUKTI",
      headline: ["DETEKSI", "KONTRADIKSI", "REKAM MEDIS"],
      description:
        "Membandingkan ribuan klaim secara sensus untuk mengidentifikasi indikasi Upcoding, Phantom Billing, dan duplikasi narasi lintas pasien.",
      ctaLabel: "Lihat Antrean Investigasi",
      ctaHref: "/investigation-queue",
      image: "/landing/pillar-02.png",
    },
    {
      kicker: "03 / TRANSPARANSI & EVALUASI TERUKUR",
      headline: ["AUDIT AI", "DENGAN JEJAK", "KRIPTOGRAFIS"],
      description:
        "Setiap keputusan verifikator manusia dicatat pada rantai hash SHA-256 dengan kepatuhan penuh terhadap perlindungan data pribadi UU PDP.",
      ctaLabel: "Evaluasi Performa Model",
      ctaHref: "/model-performance",
      image: "/landing/who-we-are.png",
    },
  ];

  const casesData = {
    "CLM-10293": {
      id: "CLM-10293",
      tabLabel: "01 · Upcoding & Bedah Fiktif",
      invId: "INV-2026-010293",
      image: "/landing/pillar-01.png",
      provider: "RS Sehat Sentosa · Kelas B · Jakarta Selatan",
      patient: "Peserta 48 thn · Rawat Inap Reguler (2 Hari)",
      diagnosis: "Gastroenteritis & Kolitis Infeksius Akut",
      inaCbg: "Tagihan Diajukan: Keparahan Tinggi (Level III)",
      claimed: stats?.hero?.amount ?? 18450000,
      standard: stats?.hero?.peer_median ?? 3992229,
      exposure: stats?.hero?.exposure ?? 14457771,
      docExcerpt:
        '"Pasien masuk dengan keluhan diare cair 4x sehari dan mual ringan. Diberikan rehidrasi intravena RL 20 tpm selama 2 hari perawatan di ruang rawat biasa; tanda vital stabil tanpa intervensi bedah."',
      findings: [
        {
          title: "Kenaikan Tingkat Keparahan Tanpa Bukti Komplikasi",
          detail:
            "Klaim ditagihkan pada tarif tertinggi (Severity Level III), padahal rekam medis hanya mencatat diare ringan tanpa komorbiditas maupun perawatan intensif.",
        },
        {
          title: "Tagihan Prosedur Bedah Tanpa Laporan Kamar Operasi",
          detail:
            "Rincian billing mencantumkan tindakan bedah saluran cerna, namun berkas pasien hanya berisi terapi infus cairan rumatan di bangsal biasa.",
        },
        {
          title: `Duplikasi Narasi Rekam Medis Lintas Pasien (${clonePct})`,
          detail:
            "Paragraf anamnesis dan ringkasan pulang memiliki kemiripan tekstual 99% dengan berkas pasien lain pada periode klaim yang sama.",
        },
      ],
    },
    "CLM-09283": {
      id: "CLM-09283",
      tabLabel: "02 · Duplikasi Narasi Medis",
      invId: "INV-2026-009283",
      image: "/landing/pillar-02.png",
      provider: "RS Sehat Sentosa · Kelas B · Jakarta Selatan",
      patient: "Peserta 47 thn · Rawat Inap Reguler (2 Hari)",
      diagnosis: "Gastroenteritis & Kolitis Infeksius Akut",
      inaCbg: "Tagihan Diajukan: Keparahan Tinggi (Level III)",
      claimed: 17900000,
      standard: 3992229,
      exposure: 13907771,
      docExcerpt:
        '"Pasien dirawat di bangsal reguler dengan terapi cairan rumatan dan antiemetik oral. Tidak ada persiapan maupun pelaksanaan tindakan kamar operasi."',
      findings: [
        {
          title: `Salin-Tempel Catatan Klinis Antar Pasien (${clonePct})`,
          detail:
            "Kalimat pemeriksaan fisik dan instruksi pulang identik kata-demi-kata dengan berkas pasien berbeda yang diajukan pada minggu yang sama.",
        },
        {
          title: "Pemecahan Episode Perawatan (Unbundling Tagihan)",
          detail:
            "Kunjungan kontrol pasca-rawat ditagihkan sebagai episode rawat inap baru untuk menggandakan klaim paket INA-CBG.",
        },
      ],
    },
    "CLM-08741": {
      id: "CLM-08741",
      tabLabel: "03 · Anomali Lama Rawat",
      invId: "INV-2026-008741",
      image: "/landing/pillar-04.png",
      provider: "RS Sehat Sentosa · Kelas B · Jakarta Selatan",
      patient: "Peserta 46 thn · Rawat Inap Reguler (6 Hari)",
      diagnosis: "Gastroenteritis & Kolitis Infeksius Akut",
      inaCbg: "Tagihan Diajukan: Keparahan Tinggi (Level III)",
      claimed: 18200000,
      standard: 3992229,
      exposure: 14207771,
      docExcerpt:
        '"Hari rawat ke-3 s.d. ke-6: Pasien bebas demam (36,6°C), tanda vital normal, makan dan minum baik tanpa indikasi medis rawat inap lanjutan."',
      findings: [
        {
          title: "Perpanjangan Hari Rawat Tanpa Indikasi Klinis",
          detail:
            "Pasien ditahan selama 6 hari di ruang rawat inap meskipun catatan keperawatan menyatakan kondisi sudah pulih penuh sejak hari ke-3.",
        },
        {
          title: "Disparitas Tarif 4,5x di Atas Standar Rumah Sakit Setara",
          detail:
            "Total tagihan mencapai Rp 18,2 juta untuk kasus gastroenteritis tanpa komplikasi yang rata-rata memerlukan Rp 3,99 juta pada faskes Kelas B.",
        },
      ],
    },
  };

  const currentHero = heroSlides[heroSlide];
  const activeCase = casesData[selectedCaseId];

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-jkn-text font-sans selection:bg-bpjs selection:text-white">
      {/* =====================================================================
          1. FULL-BLEED EDITORIAL HERO (AMMAN + MAGIC UI ILLUSTRATION & BEAMS)
      ===================================================================== */}
      <section className="relative min-h-[90vh] bg-[#071A12] text-white flex flex-col justify-between overflow-hidden">
        {/* Full-Bleed Architectural Photograph with Crossfade */}
        <AnimatePresence mode="wait">
          <motion.img
            key={currentHero.image}
            src={currentHero.image}
            alt={currentHero.kicker}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1.01 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        </AnimatePresence>

        {/* Directional Dark Emerald Scrim */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, rgba(5,20,14,0.94) 0%, rgba(5,20,14,0.80) 48%, rgba(5,20,14,0.68) 100%), linear-gradient(180deg, rgba(5,20,14,0.82) 0%, rgba(5,20,14,0.35) 48%, rgba(5,20,14,0.94) 100%)",
          }}
        />

        {/* Top Editorial Navigation Bar (Split Left / Center Logo / Right like AMMAN) */}
        <header className="relative z-20 border-b border-white/15 backdrop-blur-xs">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-10 h-20 flex items-center justify-between">
            {/* Left Nav */}
            <nav className="hidden lg:flex items-center gap-8 text-xs uppercase tracking-[0.14em] text-white/85 font-medium">
              <a href="#peran" className="hover:text-emerald-300 transition-colors">
                Peran Pengguna
              </a>
              <a href="#siapa-kami" className="hover:text-emerald-300 transition-colors">
                Siapa Kami
              </a>
              <a href="#pilar" className="hover:text-emerald-300 transition-colors">
                Pilar Sistem
              </a>
            </nav>

            {/* Center Brand Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-lg bg-white/95 p-1.5 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <img src="/arsa_logo.png" alt="ARSA JKN" className="w-full h-full object-contain" />
              </div>
              <div className="text-left">
                <span className="text-base font-bold tracking-[0.18em] uppercase text-white block leading-none">
                  ARSA JKN
                </span>
                <span className="text-[10px] tracking-[0.12em] uppercase text-emerald-400 block mt-1">
                  Risk Intelligence
                </span>
              </div>
            </Link>

            {/* Right Nav */}
            <div className="flex items-center gap-6">
              <nav className="hidden lg:flex items-center gap-8 text-xs uppercase tracking-[0.14em] text-white/85 font-medium">
                <a href="#simulasi" className="hover:text-emerald-300 transition-colors">
                  Simulasi Bukti
                </a>
                <a href="#geospasial" className="hover:text-emerald-300 transition-colors">
                  Peta Nasional
                </a>
              </nav>
              <Link
                href="/"
                className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-bpjs text-white text-xs font-semibold tracking-wide hover:bg-emerald-400 hover:text-[#05140E] transition-all shadow-sm"
              >
                <span>Masuk Aplikasi</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </header>

        {/* Center Editorial Grid: Left Staggered Headline + Right 3D Isometric Forensic Illustration */}
        <div className="relative z-10 max-w-[1400px] w-full mx-auto px-6 lg:px-10 py-10 lg:py-14 flex-1 flex flex-col justify-between gap-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center my-auto">
            {/* Left Column: Staggered BlurFade Headline (Clean, zero tag clutter) */}
            <div className="lg:col-span-7">
              <StaggeredHeadline
                slideKey={heroSlide}
                lines={currentHero.headline}
                className="text-4xl sm:text-6xl lg:text-[72px] font-light uppercase tracking-tight text-white leading-[1.02] drop-shadow-sm"
              />
            </div>

            {/* Right Column: Hero Interactive 3D Isometric Illustration + Animated Beams */}
            <div className="lg:col-span-5">
              <HeroForensicIllustration />
            </div>
          </div>

          {/* Bottom Split Row (Left Slide Switcher Dots / Right Description & Pill CTA) */}
          <div className="pt-8 border-t border-white/20 flex flex-col md:flex-row md:items-end justify-between gap-8">
            {/* Left: Minimal Slide Switcher Dots (AMMAN style) */}
            <div className="flex items-center gap-2.5">
              {heroSlides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setHeroSlide(idx as 0 | 1 | 2)}
                  aria-label={`Slide ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    heroSlide === idx ? "w-10 bg-emerald-400" : "w-3 bg-white/35 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>

            {/* Right: Concise Copy + Single Rounded Pill CTA (AMMAN signature bottom-right block) */}
            <div className="max-w-md space-y-4">
              <p className="text-sm text-white/90 leading-relaxed font-normal drop-shadow-sm">
                {currentHero.description}
              </p>
              <div>
                <Link
                  href={currentHero.ctaHref}
                  className="group inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-white text-[#071A12] text-xs font-bold uppercase tracking-wider hover:bg-emerald-400 hover:text-[#071A12] transition-all shadow-lg"
                >
                  <span>{currentHero.ctaLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. "SELECT WHO YOU ARE" (4 SPOTLIGHT CARDS + BLURFADE REVEAL)
      ===================================================================== */}
      <section id="peran" className="py-20 lg:py-24 max-w-[1400px] mx-auto px-6 lg:px-10">
        <BlurFade>
          <div className="mb-12">
            <h2 className="text-2xl sm:text-3xl font-light uppercase tracking-wide text-jkn-text">
              Pilih Peran Anda
            </h2>
            <p className="text-sm text-jkn-muted mt-2">
              Akses langsung ruang kerja yang disesuaikan dengan tanggung jawab pemeriksaan dan pengawasan Anda
            </p>
          </div>
        </BlurFade>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {AUDIENCE_JOURNEYS.map((item, idx) => (
            <BlurFade key={item.code} delay={idx * 0.08}>
              <SpotlightCard className="h-full rounded-xl border border-jkn-border bg-surface hover:border-bpjs transition-all shadow-subtle hover:shadow-card group">
                <Link href={item.href} className="flex flex-col justify-between h-full">
                  <div>
                    {/* Pure Editorial Photograph Header (Zero badge clutter) */}
                    <div className="h-56 relative overflow-hidden bg-[#0D2B1D]">
                      <img
                        src={item.image}
                        alt={item.role}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#071A12]/45 via-transparent to-transparent" />
                    </div>

                    <div className="p-5 pb-0">
                      <h3 className="text-lg font-normal uppercase tracking-wide text-jkn-text group-hover:text-bpjs-dark transition-colors">
                        {item.role}
                      </h3>
                      <p className="text-xs text-jkn-muted leading-relaxed mt-2">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="p-5 pt-4 mt-5 border-t border-jkn-divider flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-bpjs-dark group-hover:text-bpjs">
                      <span>{item.cta}</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform" />
                    </span>
                  </div>
                </Link>
              </SpotlightCard>
            </BlurFade>
          ))}
        </div>
      </section>

      {/* =====================================================================
          3. FULL-BLEED DARK EDITORIAL BANNER ("WHO WE ARE" + NUMBER TICKERS)
      ===================================================================== */}
      <section id="siapa-kami" className="bg-[#0B2117] text-white py-24 lg:py-32 relative overflow-hidden">
        <img
          src="/landing/who-we-are.png"
          alt="Kampus Medis & Pusat Audit ARSA JKN"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(8,26,18,0.88) 0%, rgba(8,26,18,0.68) 50%, rgba(8,26,18,0.92) 100%)",
          }}
        />
        <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-10 flex flex-col justify-between min-h-[400px] gap-12">
          {/* Top-left large light-weight title + Animated NumberTickers */}
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
            <BlurFade>
              <h2 className="text-3xl sm:text-5xl font-light uppercase tracking-tight leading-none drop-shadow-sm">
                Siapa Kami
              </h2>
            </BlurFade>

            {/* Key Quantitative Figures Strip with Magic UI NumberTicker */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 lg:gap-10 pt-2 border-t lg:border-t-0 border-white/20 tabular-nums">
              <div>
                <div className="text-2xl sm:text-3xl font-light text-white font-mono">
                  <NumberTicker value={stats?.claims ?? 1394} />
                </div>
                <div className="text-[11px] uppercase tracking-wider text-white/75 mt-1">
                  Klaim Sensus Dianalisis
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-light text-emerald-400 font-mono">
                  <NumberTicker value={stats?.flagged_claims ?? 616} />
                </div>
                <div className="text-[11px] uppercase tracking-wider text-white/75 mt-1">
                  Kasus Berisiko Tinggi
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-light text-white font-mono">
                  <NumberTicker value={stats?.detectors ?? 8} />
                </div>
                <div className="text-[11px] uppercase tracking-wider text-white/75 mt-1">
                  Detektor Anomali Aktif
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-light text-emerald-400 font-mono">
                  <NumberTicker
                    value={stats ? stats.macro_f1 * 100 : 96.9}
                    decimals={1}
                    suffix="%"
                  />
                </div>
                <div className="text-[11px] uppercase tracking-wider text-white/75 mt-1">
                  Skor F1 Makro Terukur
                </div>
              </div>
            </div>
          </div>

          {/* Bottom-right editorial paragraph + pill button (AMMAN #who_we_are layout) */}
          <BlurFade delay={0.15} className="flex justify-end">
            <div className="max-w-xl space-y-6">
              <p className="text-sm sm:text-base text-white/90 leading-relaxed font-normal drop-shadow-xs">
                ARSA JKN adalah sistem intelijen risiko dan pendukung keputusan audit klaim kesehatan yang memverifikasi kesesuaian antara kode tagihan INA-CBG, rincian billing rumah sakit, dan bukti klinis pada rekam medis. Seluruh temuan divalidasi dengan sitasi dokumen nyata tanpa menggantikan kewenangan verifikator manusia.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/model-performance"
                  className="group inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-white/50 bg-black/25 backdrop-blur-xs text-white text-xs font-semibold uppercase tracking-wider hover:bg-white hover:text-[#0B2117] transition-all"
                >
                  <span>Lihat Evaluasi & Metodologi</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </BlurFade>
        </div>
      </section>

      {/* =====================================================================
          4. INTERACTIVE CASE SHOWCASE (SPOTLIGHT + ANIMATEPRESENCE)
      ===================================================================== */}
      <section id="simulasi" className="py-20 lg:py-24 max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-10">
          <div className="max-w-xl">
            <h2 className="text-2xl sm:text-3xl font-light uppercase tracking-wide text-jkn-text">
              Simulasi Bedah Klaim
            </h2>
            <p className="text-sm text-jkn-muted mt-2">
              Lihat bagaimana sistem membandingkan ketimpangan tarif tagihan dengan bukti klinis rekam medis secara nyata
            </p>
          </div>

          {/* Readable Case Scenario Switcher Tabs (Single horizontal row) */}
          <div className="inline-flex flex-wrap sm:flex-nowrap items-center gap-1.5 p-1.5 rounded-full bg-surface border border-jkn-border shadow-2xs shrink-0 self-start xl:self-auto">
            {(["CLM-10293", "CLM-09283", "CLM-08741"] as const).map((cid) => (
              <button
                key={cid}
                type="button"
                onClick={() => setSelectedCaseId(cid)}
                className={`px-4 py-2 rounded-full text-xs font-medium tracking-wide whitespace-nowrap transition-all ${
                  selectedCaseId === cid
                    ? "bg-[#071A12] text-white shadow-subtle"
                    : "text-jkn-muted hover:text-jkn-text"
                }`}
              >
                {casesData[cid].tabLabel}
              </button>
            ))}
          </div>
        </div>

        <SpotlightCard className="bg-surface rounded-2xl border border-jkn-border shadow-card overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedCaseId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28 }}
              className="grid grid-cols-1 lg:grid-cols-12"
            >
              {/* Left Column: Dark Forest Editorial Dossier & Visual Tariff Discrepancy Bars */}
              <div className="lg:col-span-5 relative bg-[#081E15] text-white p-7 sm:p-9 flex flex-col justify-between overflow-hidden">
                <img
                  src={activeCase.image}
                  alt={activeCase.diagnosis}
                  className="absolute inset-0 w-full h-full object-cover object-center opacity-25 mix-blend-luminosity"
                />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(7,26,18,0.88) 0%, rgba(7,26,18,0.96) 100%)",
                  }}
                />

                <div className="relative z-10 space-y-6">
                  <div>
                    <span className="text-[11px] uppercase tracking-[0.18em] text-emerald-400 font-semibold block">
                      Studi Kasus Pemeriksaan Klaim
                    </span>
                    <h3 className="text-xl sm:text-2xl font-light tracking-tight text-white mt-2 leading-snug">
                      {activeCase.diagnosis}
                    </h3>
                    <p className="text-xs text-white/75 mt-1.5">
                      {activeCase.provider} · {activeCase.patient}
                    </p>
                  </div>

                  {/* Visual Tariff Comparison Bars */}
                  <div className="space-y-4 pt-5 border-t border-white/15 tabular-nums">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/80">Tagihan Diajukan Rumah Sakit</span>
                        <span className="font-mono font-bold text-white">
                          {formatRupiah(activeCase.claimed)}
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500"
                        />
                      </div>
                      <span className="text-[11px] text-white/60 block">
                        {activeCase.inaCbg}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/80">Standar Tarif Normal (Rumah Sakit Setara)</span>
                        <span className="font-mono font-semibold text-emerald-300">
                          {formatRupiah(activeCase.standard)}
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.max(
                              12,
                              Math.round((activeCase.standard / activeCase.claimed) * 100)
                            )}%`,
                          }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className="h-full rounded-full bg-emerald-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Highlighted Financial Exposure Callout */}
                <div className="relative z-10 mt-8 pt-5 border-t border-white/15 flex items-baseline justify-between gap-4 tabular-nums">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.16em] text-emerald-300 font-semibold block">
                      Potensi Penghematan Dana JKN
                    </span>
                    <span className="text-xs text-white/70 mt-0.5 block">
                      Selisih kelebihan tagihan yang teridentifikasi
                    </span>
                  </div>
                  <span className="text-xl sm:text-2xl font-mono font-bold text-emerald-400 shrink-0">
                    {formatRupiah(activeCase.exposure)}
                  </span>
                </div>
              </div>

              {/* Right Column: Verbatim Clinical Record & Full-Sentence Contradiction Analysis */}
              <div className="lg:col-span-7 p-7 sm:p-9 flex flex-col justify-between space-y-6 bg-surface">
                <div className="space-y-6">
                  {/* Clean Verbatim Medical Record Quote */}
                  <div className="p-5 rounded-xl bg-[#F4F7F5] border-l-4 border-bpjs space-y-2">
                    <span className="text-[11px] uppercase tracking-[0.14em] text-bpjs-dark font-semibold block">
                      Kutipan Rekam Medis Pasien
                    </span>
                    <p className="text-sm text-jkn-text italic leading-relaxed">
                      {activeCase.docExcerpt}
                    </p>
                  </div>

                  {/* Contradiction Explanations (Full readable cards, zero cryptic tags) */}
                  <div className="space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.12em] text-jkn-muted">
                      Mengapa Klaim Ini Ditandai untuk Pemeriksaan:
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {activeCase.findings.map((f, i) => (
                        <div
                          key={i}
                          className="p-4 rounded-xl border border-jkn-border bg-surface-secondary/45 flex items-start gap-3.5"
                        >
                          <span className="w-6 h-6 rounded-full bg-[#071A12] text-emerald-300 text-xs font-mono font-semibold flex items-center justify-center shrink-0 mt-0.5">
                            0{i + 1}
                          </span>
                          <div className="space-y-1">
                            <h4 className="text-sm font-semibold text-jkn-text">
                              {f.title}
                            </h4>
                            <p className="text-xs text-jkn-muted leading-relaxed">
                              {f.detail}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-jkn-divider">
                  <span className="text-xs text-jkn-muted">
                    Tinjau perbandingan dokumen lengkap dan ambil keputusan verifikasi.
                  </span>
                  <Link
                    href={`/investigations/${activeCase.invId}`}
                    className="group inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-[#071A12] text-white text-xs font-semibold uppercase tracking-wider hover:bg-bpjs transition-colors shrink-0"
                  >
                    <span>Buka Berkas Investigasi</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </SpotlightCard>
      </section>

      {/* =====================================================================
          5. "WHAT WE DO" (AMMAN-STYLE EXPANDABLE ACCORDION PILLAR PANELS)
      ===================================================================== */}
      <section id="pilar" className="py-16 lg:py-20 max-w-[1400px] mx-auto px-6 lg:px-10">
        <BlurFade>
          <div className="max-w-2xl mb-12">
            <h2 className="text-2xl sm:text-3xl font-light uppercase tracking-wide text-jkn-text">
              Apa yang Kami Lakukan
            </h2>
            <p className="text-sm text-jkn-muted mt-2 leading-relaxed">
              Arsitektur pemeriksaan berlapis mulai dari verifikasi aturan paket INA-CBG, analisis kemiripan narasi klinis, hingga penguncian bukti audit berstandar enterprise.
            </p>
          </div>
        </BlurFade>

        {/* Horizontal Expandable Accordion on Desktop (like amman.co.id #what_we_do) */}
        <div className="flex flex-col lg:flex-row border border-jkn-border rounded-2xl overflow-hidden bg-[#0A1F16] text-white min-h-[450px]">
          {CORE_PILLARS.map((pillar, idx) => {
            const isActive = activePillar === idx;
            return (
              <div
                key={pillar.num}
                onMouseEnter={() => setActivePillar(idx)}
                style={{
                  flex: isActive ? 1.65 : 0.85,
                  transition: "flex 550ms cubic-bezier(0.22, 1, 0.36, 1)",
                }}
                className="relative p-7 lg:p-8 min-h-[380px] lg:min-h-[450px] flex flex-col justify-between border-b lg:border-b-0 lg:border-r last:border-r-0 border-white/15 overflow-hidden group cursor-pointer"
              >
                {/* Active Top Emerald Accent Line */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 z-20 transition-all duration-500 ${
                    isActive ? "bg-emerald-400 opacity-100" : "bg-transparent opacity-0"
                  }`}
                />

                <img
                  src={pillar.image}
                  alt={pillar.title}
                  className={`absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ${
                    isActive ? "scale-105" : "scale-100"
                  }`}
                />
                <div
                  className="absolute inset-0 pointer-events-none transition-opacity duration-500"
                  style={{
                    background: isActive
                      ? "linear-gradient(180deg, rgba(6,22,15,0.92) 0%, rgba(6,22,15,0.80) 48%, rgba(6,22,15,0.40) 74%, rgba(6,22,15,0.92) 100%)"
                      : "linear-gradient(180deg, rgba(6,22,15,0.95) 0%, rgba(6,22,15,0.88) 52%, rgba(6,22,15,0.62) 76%, rgba(6,22,15,0.95) 100%)",
                  }}
                />

                <div className="relative z-10">
                  <div className="text-sm font-mono font-semibold text-emerald-400">
                    {pillar.num}
                  </div>
                  <h3 className="text-xl font-light uppercase tracking-wide text-white mt-5 leading-snug drop-shadow-xs">
                    {pillar.title}
                  </h3>
                  <p
                    className={`text-xs text-white/85 leading-relaxed mt-4 transition-opacity duration-300 ${
                      isActive ? "opacity-100" : "opacity-80"
                    }`}
                  >
                    {pillar.summary}
                  </p>
                </div>

                <div className="relative z-10 pt-6">
                  <Link
                    href={pillar.href}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-semibold uppercase tracking-wider transition-all ${
                      isActive
                        ? "bg-white text-[#071A12] border-white hover:bg-emerald-400 hover:border-emerald-400"
                        : "border-white/35 bg-black/25 backdrop-blur-xs text-white hover:bg-white hover:text-[#0A1F16]"
                    }`}
                  >
                    <span>Selengkapnya</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =====================================================================
          6. NATIONAL GEOSPATIAL RISK MAP
      ===================================================================== */}
      <section id="geospasial" className="py-16 lg:py-20 max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-light uppercase tracking-wide text-jkn-text">
              Sebaran Risiko Nasional
            </h2>
            <p className="text-sm text-jkn-muted mt-2">
              Pemetaan konsentrasi klaim berisiko tinggi dan estimasi eksposur pada 38 provinsi Indonesia
            </p>
          </div>
          <Link
            href="/providers"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-surface border border-jkn-border text-xs font-semibold uppercase tracking-wider text-jkn-text hover:border-bpjs hover:text-bpjs transition-all self-start sm:self-auto"
          >
            <span>Lihat Direktori Faskes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {provinces.length > 0 && <IndonesiaRiskMap provinceData={provinces} />}
      </section>

      {/* =====================================================================
          7. EDITORIAL FOOTER (AMMAN-INSPIRED MINIMALIST DARK FOOTER)
      ===================================================================== */}
      <footer className="bg-[#071A12] text-white border-t border-white/10 mt-12">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-16">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10 pb-12 border-b border-white/10">
            <div className="space-y-3 max-w-md">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center">
                  <img src="/arsa_logo.png" alt="ARSA JKN" className="w-full h-full object-contain" />
                </div>
                <span className="text-base font-bold tracking-[0.18em] uppercase">
                  ARSA JKN
                </span>
              </div>
              <p className="text-xs text-white/65 leading-relaxed">
                Sistem Intelijen Risiko &amp; Verifikasi Klaim INA-CBG. Memadukan detektor aturan klinis, analisis vektor semantik, dan perlindungan privasi UU PDP No. 27 Tahun 2022.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-bpjs text-white text-xs font-bold uppercase tracking-wider hover:bg-bpjs-deep transition-all"
              >
                <span>Buka Command Center</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/investigation-queue"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/25 text-white text-xs font-semibold uppercase tracking-wider hover:bg-white hover:text-[#071A12] transition-all"
              >
                <span>Antrean Investigasi</span>
              </Link>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/60 uppercase tracking-wider">
            <div className="flex flex-wrap items-center gap-6">
              <Link href="/settings" className="hover:text-white transition-colors">
                Kepatuhan UU PDP &amp; Privasi
              </Link>
              <Link href="/model-performance" className="hover:text-white transition-colors">
                Evaluasi Akurasi Model
              </Link>
              <Link href="/reports" className="hover:text-white transition-colors">
                Dosier Audit PDF
              </Link>
            </div>
            <div>ARSA · JKN Risk Intelligence</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
