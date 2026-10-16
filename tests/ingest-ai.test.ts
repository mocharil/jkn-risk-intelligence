import { describe, expect, it } from "vitest";
import { parseUpload } from "@/lib/ingest/parse";
import { anonymizeUpload } from "@/lib/ingest/pii";
import { profileColumns } from "@/lib/ingest/profile";
import { heuristicMapping } from "@/lib/ingest/mapper";
import { normalizeRows, normalizeIcd10, parseDate, parseNumber } from "@/lib/ingest/normalize";
import { validateCitations } from "@/lib/ai/copilot";
import { ContextItem } from "@/lib/ai/context";

describe("parser nilai", () => {
  it("tanggal: berbagai format & menolak tanggal mustahil", () => {
    expect(parseDate("2026-08-01")).toBe("2026-08-01");
    expect(parseDate("01/08/2026")).toBe("2026-08-01");
    expect(parseDate("31/02/2026")).toBeNull(); // regresi: JS menggulung ke Maret
    expect(parseDate("2026-13-01")).toBeNull();
    expect(parseDate("")).toBeNull();
  });
  it("angka: format Indonesia & US, 'Rp'", () => {
    expect(parseNumber("Rp 18.450.000")).toBe(18450000);
    expect(parseNumber("1,234,567.50")).toBe(1234567.5);
    expect(parseNumber("3800000")).toBe(3800000);
    expect(parseNumber("abc")).toBeNull();
  });
  it("ICD-10 dinormalisasi", () => {
    expect(normalizeIcd10("k358")).toBe("K35.8");
    expect(normalizeIcd10("A09")).toBe("A09");
    expect(normalizeIcd10("XYZ")).toBeNull();
  });
});

const CSV_SEMI = [
  "NO_SEP;NO_KARTU;NIK;NAMA_PASIEN;ALAMAT;KODE_PPK;DIAG_PRIMER;LAMA_RAWAT;TGL_MASUK;TGL_KELUAR;BIAYA_TAGIHAN;TINDAKAN;RESUME_MEDIS",
  "S1;0001111111111;3174051208750003;Budi Santoso;Jl. A 1;RS1;A09;3;2026-08-01;2026-08-04;4500000;99.18;Pasien Budi Santoso datang dengan diare stabil membaik",
  "S2;0002222222222;3174051208750004;Siti Aminah;Jl. B 2;RS1;XYZ;3;2026-08-01;2026-08-04;4500000;;diare",
  "S1;0003333333333;3174051208750005;Dewi;Jl. C 3;RS1;A09;3;2026-08-01;2026-08-04;4500000;;duplikat id",
  "S4;0004444444444;3174051208750006;Eko;Jl. D 4;RS1;A09;3;31/02/2026;2026-08-04;4500000;;tanggal mustahil",
].join("\n");

describe("ingest end-to-end (CSV titik-koma)", () => {
  const parsed = parseUpload(Buffer.from(CSV_SEMI), "x.csv");
  const anon = anonymizeUpload(parsed.columns, parsed.rows);
  const cols = profileColumns(anon);
  const map = heuristicMapping(cols);

  it("delimiter terdeteksi otomatis", () => {
    expect(parsed.columns).toHaveLength(13);
    expect(parsed.rows).toHaveLength(4);
  });
  it("PII tidak ada pada baris yang akan disimpan", () => {
    const blob = JSON.stringify(anon.rows);
    expect(blob).not.toMatch(/3174051208750\d{3}/);
    expect(blob).not.toContain("Budi Santoso");
    expect(blob).not.toContain("Jl. A");
  });
  it("mapping heuristik menemukan field wajib", () => {
    const m = Object.fromEntries(map.map((x) => [x.source_field, x.canonical_field]));
    expect(m.NO_SEP).toBe("claim_id");
    expect(m.NO_KARTU).toBe("patient_id");
    expect(m.KODE_PPK).toBe("provider_id");
    expect(m.DIAG_PRIMER).toBe("primary_diagnosis");
    expect(m.BIAYA_TAGIHAN).toBe("claim_amount");
    expect(m.TGL_MASUK).toBe("admission_date");
    expect(m.RESUME_MEDIS).toBe("clinical_narrative");
  });
  it("normalisasi: 1 valid, sisanya ditolak dengan alasan jelas", () => {
    const res = normalizeRows(anon.rows, map.map((m) => ({ ...m, status: m.canonical_field ? ("CONFIRMED" as const) : ("UNMAPPED" as const) })), { existingClaimIds: new Set(), providers: new Map(), today: "2026-10-02" });
    expect(res.claims).toHaveLength(1);
    expect(res.claims[0].claim_id).toBe("S1");
    expect(res.claims[0].patient.patient_id).toMatch(/^PSN-/);
    expect(res.claims[0].service.length_of_stay).toBe(3);
    expect(res.rejected.map((r) => r.reason).join("|")).toMatch(/ICD-10 tidak valid/);
    expect(res.rejected.map((r) => r.reason).join("|")).toMatch(/duplikat/);
    expect(res.rejected.map((r) => r.reason).join("|")).toMatch(/Tanggal masuk tidak valid/);
    expect(res.quality.duplicate_rows).toBe(1);
  });
  it("field wajib belum dipetakan -> ditolak seluruhnya dengan pesan", () => {
    const res = normalizeRows(anon.rows, [], { existingClaimIds: new Set(), providers: new Map(), today: "2026-10-02" });
    expect(res.claims).toHaveLength(0);
    expect(res.quality.missing_required_fields.length).toBeGreaterThan(0);
  });
});

describe("validasi sitasi Copilot (anti-halusinasi)", () => {
  const items: ContextItem[] = [
    { id: "claim:CLM-1", kind: "CLAIM", title: "Klaim", text: "t" },
    { id: "DOC-1-01", kind: "DOC", title: "Dok", text: "t", status: "CONTRADICTS_CLAIM" },
  ];
  it("id sah dipertahankan & dinomori; id karangan dibuang dan dihitung", () => {
    const v = validateCitations("Klaim bermasalah [claim:CLM-1] dan terbukti [DOC-1-01] serta [DOC-999-99] dan [finding:CLM-1:FAKE].", items);
    expect(v.used).toEqual(["claim:CLM-1", "DOC-1-01"]);
    expect(v.removed).toBe(2);
    expect(v.text).toContain("[1]");
    expect(v.text).toContain("[2]");
    expect(v.text).not.toContain("DOC-999-99");
  });
  it("tanpa sitasi sah -> used kosong (akan ditolak validator di jalur Gemini)", () => {
    expect(validateCitations("Klaim ini mencurigakan.", items).used).toHaveLength(0);
  });
  it("kurung biasa non-sitasi tidak dirusak", () => {
    expect(validateCitations("Nilai [sic] tetap", items).text).toContain("[sic]");
  });
});
