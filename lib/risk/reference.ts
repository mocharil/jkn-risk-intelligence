/**
 * Data referensi (sintetis, terinspirasi struktur INA-CBG) yang dipakai sebagai
 * fallback benchmark saat jumlah klaim peer belum cukup, serta aturan unbundling
 * dan harga acuan tindakan. Seluruhnya transparan & dapat diaudit.
 * Pilihan diagnosis dan bobot campurannya mengacu pada 100 penyakit rawat inap terbanyak BPJS (lib/data/bpjs-national.ts);
 * tarif per diagnosis tetap ilustratif (tarif INA-CBG per kode tidak ada pada statistik agregat).
 */

export interface DiagnosisReference {
  description: string;
  /** Awalan ICD-10 pada statistik nasional BPJS (berkas tanpa titik), untuk bobot campuran diagnosis. */
  icd_prefix?: string;
  expected_severity: 1 | 2 | 3;
  expected_los: number;
  expected_tariff: number;
  /** Tindakan rutin yang SUDAH termasuk dalam paket tarif diagnosis ini. */
  package_procedures: string[];
  /** Batas pasien yang masuk akal secara klinis (mis. persalinan hanya perempuan usia subur). */
  patient?: { gender?: "L" | "P"; age?: [number, number] };
}

export const DIAGNOSIS_REFERENCE: Record<string, DiagnosisReference> = {
  A09: { description: "Gastroenteritis & kolitis infeksi", icd_prefix: "A09", expected_severity: 1, expected_los: 2.2, expected_tariff: 3_800_000, package_procedures: ["99.18", "90.59"] },
  "K35.8": { description: "Apendisitis akut", icd_prefix: "K35", expected_severity: 2, expected_los: 3.5, expected_tariff: 12_500_000, package_procedures: ["90.59", "99.18"] },
  "J18.9": { description: "Pneumonia", icd_prefix: "J18", expected_severity: 2, expected_los: 4.1, expected_tariff: 8_900_000, package_procedures: ["87.44", "96.56"] },
  I10: { description: "Hipertensi esensial", icd_prefix: "I10", expected_severity: 1, expected_los: 1.5, expected_tariff: 2_400_000, package_procedures: ["89.52"] },
  "E11.9": { description: "Diabetes melitus tipe 2", icd_prefix: "E11", expected_severity: 2, expected_los: 3.0, expected_tariff: 6_700_000, package_procedures: ["90.59", "90.39"] },
  "O80.0": { description: "Persalinan spontan normal", icd_prefix: "O80", expected_severity: 1, expected_los: 2.0, expected_tariff: 4_500_000, package_procedures: ["73.59"], patient: { gender: "P", age: [15, 45] } },
  "A01.0": { description: "Demam tifoid", icd_prefix: "A01", expected_severity: 1, expected_los: 4.2, expected_tariff: 3_600_000, package_procedures: ["90.59", "99.18"] },
  K30: { description: "Dispepsia", icd_prefix: "K30", expected_severity: 1, expected_los: 2.3, expected_tariff: 2_600_000, package_procedures: ["90.59", "99.18"] },
};

export const GENERIC_REFERENCE: DiagnosisReference = {
  description: "Diagnosis lain",
  expected_severity: 1,
  expected_los: 3.0,
  expected_tariff: 6_000_000,
  package_procedures: [],
};

export interface ProcedureReference {
  description: string;
  keywords: string[];
  reference_price: number;
  /** Tindakan besar: wajib punya jejak dokumen operasi / tindakan. */
  major: boolean;
}

export const PROCEDURE_REFERENCE: Record<string, ProcedureReference> = {
  "44.95": { description: "Prosedur bedah digestif laparoskopik", keywords: ["laparoskopi", "laparoscopic", "bedah", "surgical", "operasi", "operating", "ibs"], reference_price: 12_500_000, major: true },
  "47.01": { description: "Apendektomi laparoskopik", keywords: ["apendektomi", "appendectomy", "apendiks", "laparoskopi", "operasi"], reference_price: 9_500_000, major: true },
  "45.13": { description: "Endoskopi saluran cerna atas", keywords: ["endoskopi", "endoscopy", "egd"], reference_price: 2_500_000, major: true },
  "54.21": { description: "Laparoskopi diagnostik", keywords: ["laparoskopi", "laparoscopy"], reference_price: 3_000_000, major: false },
  "99.18": { description: "Infus elektrolit & hidrasi", keywords: ["infus", "infusion", "hidrasi", "hydration", "elektrolit", "rl"], reference_price: 350_000, major: false },
  "90.59": { description: "Pemeriksaan laboratorium darah rutin", keywords: ["laboratorium", "darah", "hematologi", "hemoglobin", "leukosit"], reference_price: 450_000, major: false },
  "90.39": { description: "Pemeriksaan glukosa / HbA1c", keywords: ["glukosa", "gula darah", "hba1c"], reference_price: 300_000, major: false },
  "89.52": { description: "Elektrokardiogram", keywords: ["ekg", "elektrokardiogram", "ecg"], reference_price: 250_000, major: false },
  "87.44": { description: "Rontgen thorax", keywords: ["rontgen", "thorax", "x-ray", "foto dada"], reference_price: 300_000, major: false },
  "96.56": { description: "Terapi nebulisasi / bilas bronkus", keywords: ["nebulisasi", "nebulizer", "bronkus"], reference_price: 400_000, major: false },
  "73.59": { description: "Persalinan normal", keywords: ["persalinan", "partus", "delivery", "partograf"], reference_price: 3_500_000, major: false },
  "88.38": { description: "CT/MRI lumbal", keywords: ["ct", "mri", "lumbal"], reference_price: 2_800_000, major: false },
  "93.11": { description: "Fisioterapi", keywords: ["fisioterapi", "physiotherapy"], reference_price: 300_000, major: false },
  "87.03": { description: "CT scan kepala", keywords: ["ct scan", "kepala", "head ct"], reference_price: 1_800_000, major: false },
  "99.04": { description: "Observasi / transfusi", keywords: ["observasi", "transfusi", "observation"], reference_price: 500_000, major: false },
};

/** Tindakan induk → komponen yang sudah termasuk di dalamnya (tidak boleh ditagih terpisah). */
export const BUNDLE_COMPONENTS: Record<string, string[]> = {
  "47.01": ["54.21", "99.18", "90.59"],
  "44.95": ["54.21", "99.18"],
  "73.59": ["99.18", "90.59"],
};

export function referenceFor(code: string): DiagnosisReference {
  return DIAGNOSIS_REFERENCE[code] || GENERIC_REFERENCE;
}

export function procedureRef(code: string): ProcedureReference | undefined {
  return PROCEDURE_REFERENCE[code];
}

/** Apakah pasien (usia, jenis kelamin) masuk akal untuk diagnosis ini. */
export function patientEligible(code: string, age: number, gender: "L" | "P"): boolean {
  const c = referenceFor(code).patient;
  if (!c) return true;
  if (c.gender && c.gender !== gender) return false;
  if (c.age && (age < c.age[0] || age > c.age[1])) return false;
  return true;
}
