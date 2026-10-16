/** Skema kanonik klaim Arsa beserta sinonim nama kolom umum pada ekspor SIMRS / klaim JKN. */
export interface CanonicalField {
  id: string;
  label: string;
  description: string;
  required: boolean;
  kind: "string" | "number" | "date" | "text" | "list";
  synonyms: string[];
}

export const CANONICAL_FIELDS: CanonicalField[] = [
  { id: "claim_id", label: "ID Klaim / No. SEP", description: "Identitas unik klaim atau nomor SEP", required: true, kind: "string", synonyms: ["no_klaim", "nomor_klaim", "no_sep", "nosep", "sep", "no_rawat", "id_klaim", "claim_id", "id_transaksi_klaim", "no_transaksi", "kode_klaim", "visit_id", "visit_no", "claim_no", "claim_number", "invoice_no"] },
  { id: "patient_id", label: "ID Pasien/Peserta", description: "Identitas peserta (akan dipseudonimkan)", required: true, kind: "string", synonyms: ["id_peserta", "no_peserta", "nomor_peserta", "no_kartu", "nokartu", "nomor_kartu", "no_bpjs", "nomor_peserta_bpjs", "patient_id", "id_pasien", "no_rm", "norm", "no_rkm_medis", "mrn", "nik", "no_ktp", "member_no", "member_id", "member_number", "patient_no", "insured_id"] },
  { id: "patient_name", label: "Nama Pasien", description: "Hanya inisial yang disimpan", required: false, kind: "string", synonyms: ["nama_pasien", "nm_pasien", "namapasien", "nama_peserta", "nama", "patient_name", "member_name", "name"] },
  { id: "patient_age", label: "Umur", description: "Umur pasien (tahun)", required: false, kind: "number", synonyms: ["umur", "usia", "age", "umur_tahun", "umurdaftar", "umur_th", "umur_pasien", "patient_age"] },
  { id: "patient_gender", label: "Jenis Kelamin", description: "L/P", required: false, kind: "string", synonyms: ["jenis_kelamin", "jk", "jkel", "gender", "sex", "kelamin", "patient_gender"] },
  { id: "provider_id", label: "Kode Faskes", description: "Kode fasilitas kesehatan / PPK", required: true, kind: "string", synonyms: ["kode_ppk", "kd_ppk", "kdppk", "kode_faskes", "kode_rs", "kode_rumah_sakit", "id_faskes", "provider_id", "kode_fasilitas", "ppk", "provider_code", "facility_code", "hospital_code"] },
  { id: "provider_name", label: "Nama Faskes", description: "Nama fasilitas kesehatan", required: false, kind: "string", synonyms: ["nama_ppk", "nm_ppk", "nama_faskes", "nama_rs", "nama_rumah_sakit", "provider_name", "nama_fasilitas", "faskes", "facility", "facility_name", "hospital", "hospital_name"] },
  { id: "province", label: "Provinsi", description: "Provinsi faskes (nama atau kode ID-XX)", required: false, kind: "string", synonyms: ["provinsi", "propinsi", "kode_provinsi", "kd_prop", "province", "prov", "wilayah", "nama_provinsi", "region", "state"] },
  { id: "primary_diagnosis", label: "Diagnosis Utama (ICD-10)", description: "Kode ICD-10 diagnosis primer (atau daftar DIAGLIST dipisah #)", required: true, kind: "string", synonyms: ["diag_primer", "diagnosis_utama", "diaglist", "diagawal", "diagnosa", "icd10", "icd_10", "icd10_utama", "diagnosis_icd", "kode_diagnosis", "kd_diagnosa", "dx", "primary_diagnosis", "diagnosis", "diag_utama", "kode_icd", "icd", "icd_code", "primary_icd", "main_diagnosis"] },
  { id: "diagnosis_description", label: "Deskripsi Diagnosis", description: "Uraian diagnosis", required: false, kind: "string", synonyms: ["nama_diagnosis", "nmdiagawal", "nm_penyakit", "deskripsi_diagnosis", "diagnosis_desc", "uraian_diagnosis", "diagnosis_description"] },
  { id: "severity_level", label: "Severity Level", description: "Tingkat keparahan 1–3 (atau kode grouper INACBG / kelas rawat)", required: false, kind: "number", synonyms: ["severity", "severity_level", "tingkat_keparahan", "kelas_severity", "level_severitas", "sev", "severitas", "inacbg", "kode_cbg", "klsrawat", "kls_rawat", "kelas_rawat", "class_rawat"] },
  { id: "length_of_stay", label: "Lama Rawat (hari)", description: "Lama rawat inap dalam hari", required: false, kind: "number", synonyms: ["lama_rawat", "lama_inap", "los", "hari_rawat", "lama_dirawat", "length_of_stay", "los_hari", "jml_hari_rawat", "length_of_stay_days", "days"] },
  { id: "admission_date", label: "Tanggal Masuk", description: "Tanggal masuk rawat", required: false, kind: "date", synonyms: ["tgl_masuk", "tanggal_masuk", "tgl_rawat", "admission_date", "tgl_sep", "tglsep", "tgl_registrasi", "tanggal_admisi", "tgl_admisi", "admit_date", "admission", "date_in", "check_in", "start_date"] },
  { id: "discharge_date", label: "Tanggal Keluar", description: "Tanggal keluar / pulang", required: false, kind: "date", synonyms: ["tgl_keluar", "tanggal_keluar", "tgl_pulang", "tglpulang", "tanggal_pulang", "discharge_date", "discharge", "date_out", "check_out", "end_date"] },
  { id: "claim_amount", label: "Total Tagihan (Rp)", description: "Total biaya yang ditagihkan faskes", required: true, kind: "number", synonyms: ["biaya_tagihan", "total_biaya", "tarif_rs", "tarif_rs_total", "biaya_reg_total", "total_tagihan", "biaya_rs", "claim_amount", "tagihan", "total_biaya_rs", "biaya", "jumlah_tagihan", "total_bill", "bill", "billed_amount", "total_charge", "amount", "total_amount"] },
  { id: "approved_tariff", label: "Tarif INA-CBG (Rp)", description: "Tarif paket INA-CBG (opsional)", required: false, kind: "number", synonyms: ["tarif_inacbg", "tarif_ina_cbg", "tarif_paket", "approved_tariff", "tarif_cbg", "tarif_ina", "ub_plafon"] },
  { id: "procedure_codes", label: "Kode Tindakan (ICD-9-CM)", description: "Daftar kode tindakan dipisah # ; | atau ,", required: false, kind: "list", synonyms: ["tindakan", "proclist", "prosedur_icd9", "kode_tindakan", "tindakan_medis", "prosedur", "icd9", "icd9cm", "icd_9", "procedure_codes", "kode_prosedur", "procedures", "procedure", "icd9_codes"] },
  { id: "procedure_costs", label: "Biaya Tindakan (Rp)", description: "Biaya per tindakan, urutan sama dengan kode tindakan", required: false, kind: "list", synonyms: ["biaya_tindakan", "biaya_prosedur", "procedure_costs", "tarif_tindakan", "rincian_biaya_tindakan"] },
  { id: "doctor_id", label: "Kode DPJP", description: "Identitas dokter penanggung jawab", required: false, kind: "string", synonyms: ["kode_dpjp", "kd_dpjp", "id_dokter", "dpjp_id", "doctor_id", "kd_dokter", "kode_dokter"] },
  { id: "doctor_name", label: "Nama DPJP", description: "Nama dokter penanggung jawab", required: false, kind: "string", synonyms: ["dpjp", "nama_dpjp", "nm_dpjp", "nama_dokter", "nm_dokter", "dokter", "doctor_name", "attending", "attending_physician", "physician", "doctor"] },
  { id: "clinical_narrative", label: "Resume Medis / CPPT", description: "Narasi klinis bebas (dipakai untuk kemiripan semantik & bukti)", required: false, kind: "text", synonyms: ["resume_medis", "ringkasan_medis", "narasi_klinis", "catatan_klinis", "catatan_eklaim", "keluhan_utama_dan_jalannya_penyakit", "resume_pasien", "cppt", "resume", "anamnesis", "clinical_summary", "catatan_dokter", "resume_pulang", "clinical_notes", "notes", "discharge_summary", "medical_summary"] },
];

export const CANONICAL_IDS = new Set(CANONICAL_FIELDS.map((f) => f.id));
export const REQUIRED_FIELDS = CANONICAL_FIELDS.filter((f) => f.required).map((f) => f.id);

export function fieldById(id: string): CanonicalField | undefined {
  return CANONICAL_FIELDS.find((f) => f.id === id);
}

export function normName(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}
