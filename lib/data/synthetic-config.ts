import type { RiskType } from "@/types/risk";

/**
 * SATU-SATUNYA tempat parameter data sintetis. Tidak ada faskes, klaim, atau skenario yang ditulis tangan:
 * semuanya dibangkitkan dari parameter di bawah dan dari statistik resmi BPJS (folder Sample/).
 *
 * Setiap parameter memiliki `basis`:
 *  - "Sample"  : diturunkan langsung dari berkas statistik BPJS (lihat lib/data/bpjs-national.ts)
 *  - "asumsi"  : tidak ada di Sample; nilai dipilih agar menyerupai keadaan nyata dan DIBERI ALASAN tertulis.
 * Data sintetis hanya dipakai untuk hal yang tidak tersedia pada statistik agregat BPJS:
 * identitas faskes, rincian per klaim, narasi klinis, dan penyimpangan yang disisipkan (berlabel untuk evaluasi).
 */
export const SYNTH = {
  /** Tanggal acuan data (akhir periode klaim). basis: asumsi. */
  as_of: "2026-09-30",
  /** Rentang tanggal pengajuan klaim, hari ke belakang dari as_of. basis: asumsi (±12 minggu agar tren 7/30/90 hari bermakna). */
  window_days: 84,
  /** Jumlah klaim yang dibangkitkan. basis: asumsi (cukup untuk statistik peer per diagnosis, tetap ringan di demo). */
  claims: 1500,

  providers: {
    /**
     * Satu faskes sintetis mewakili sekian FKRTL nyata. Jumlah faskes per provinsi = FKRTL provinsi (Sample/61) / nilai ini,
     * minimal 1. basis: Sample (jumlah FKRTL per provinsi) + asumsi skala.
     */
    fkrtl_per_synthetic_provider: 38,
    /** Bauran jenis faskes FKRTL. basis: asumsi (Sample tidak memuat kelas RS); RS kelas C paling banyak di Indonesia. */
    type_mix: { RS_KELAS_A: 0.05, RS_KELAS_B: 0.27, RS_KELAS_C: 0.5, RS_KELAS_D: 0.12, KLINIK_UTAMA: 0.06 },
    /** Skala volume klaim relatif antar jenis faskes. basis: asumsi (RS besar menangani lebih banyak admisi). */
    volume_factor: { RS_KELAS_A: 2.2, RS_KELAS_B: 1.5, RS_KELAS_C: 1, RS_KELAS_D: 0.6, KLINIK_UTAMA: 0.45 },
    /** Sebaran volume antar faskes (log-normal). basis: asumsi. */
    volume_sigma: 0.45,
    /** Dokter per faskes. basis: asumsi. */
    doctors_per_provider: 3,
  },

  anomaly: {
    /**
     * Prevalensi dasar penyimpangan per klaim pada faskes "rata-rata". basis: asumsi.
     * Literatur audit klaim/utilization review umumnya menempatkan klaim bermasalah di kisaran satu digit persen;
     * total dasar di sini ±4,9% sebelum pengali faskes. Bukan statistik BPJS.
     */
    base_rate: {
      UPCODING: 0.011,
      PHANTOM_BILLING: 0.003,
      CLONING: 0.005,
      ABNORMAL_LOS: 0.009,
      UNBUNDLING: 0.005,
      INFLATED_BILLS: 0.007,
      REPEAT_BILLING: 0.003,
      READMISSION: 0.006,
    } as Record<RiskType, number>,
    /**
     * Berkas sampel FKRTL (scripts/make-bpjs-sample.ts) tidak memodelkan kecenderungan per faskes, sehingga prevalensi dasar
     * dikalikan nilai ini agar totalnya tetap sekitar 6-7% seperti dataset bawaan. basis: asumsi.
     */
    sample_file_multiplier: 1.8,
    /** Kecenderungan tiap faskes (log-normal, rata-rata 1): kebanyakan faskes bersih, sebagian kecil jauh di atas rata-rata. */
    provider_propensity_sigma: 0.85,
    /** Porsi faskes dengan pola penyimpangan khas (spesialisasi satu-dua jenis) dan pengali tingkatnya. basis: asumsi. */
    hot_provider_share: 0.15,
    hot_multiplier: [7, 16] as [number, number],
    /** Dokter tertentu menyumbang sebagian besar penyimpangan faskes (klaster). basis: asumsi. */
    doctor_concentration: 0.6,
    /** Pengali musiman: lonjakan upcoding A09 dan klaim fiktif pada 14 hari terakhir (agar sinyal emergen terlihat). basis: asumsi. */
    recent_days: 14,
    recent_boost: { UPCODING_A09: 1.8, PHANTOM_BILLING: 1.4 },
    /** Faskes berpola khas makin aktif pada periode terbaru (pola baru yang muncul). basis: asumsi. */
    recent_hot_boost: 2.5,
    /** Porsi penyimpangan yang sengaja tipis (sulit): magnitudenya dekat ambang. */
    subtle_share: { UPCODING: 0.35, INFLATED_BILLS: 0.4, ABNORMAL_LOS: 0.35 },
  },

  /**
   * Sebaran normal dalam satu diagnosis (log-normal). basis: asumsi. Biaya dan lama rawat riil menyebar lebar bahkan pada
   * diagnosis yang sama; tanpa ini penyimpangan terlalu mudah dipisahkan dari klaim wajar.
   */
  variation: { amount_sigma: 0.28, los_sigma: 0.32 },

  /** Kasus SAH yang tampak janggal (hard negative) dan cacat data nyata. basis: asumsi. */
  realism: {
    legit_severe_share: 0.07,
    legit_long_los_share: 0.05,
    legit_extra_procedure_share: 0.05,
    /** Klaim tanpa narasi/rekam medis terlampir (ekspor SIMRS tidak lengkap). */
    missing_narrative_share: 0.07,
    /** Pasien lama yang kembali pada diagnosis berbeda. */
    returning_patient_share: 0.12,
  },

  /**
   * Penyesuaian biaya menurut provinsi memakai indeks biaya per admisi BPJS (Sample/66) dipangkatkan nilai ini.
   * 1 = penuh sesuai data BPJS. basis: Sample.
   */
  province_cost_exponent: 1,
} as const;

export type SynthConfig = typeof SYNTH;
