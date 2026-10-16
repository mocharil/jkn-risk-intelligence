import Papa from "papaparse";
import * as XLSX from "xlsx";

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const MAX_ROWS = 50_000;

export interface ParsedUpload {
  format: "CSV" | "EXCEL" | "JSON";
  columns: string[];
  rows: Record<string, string>[];
  truncated: boolean;
}

function toStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}

function finalize(format: ParsedUpload["format"], raw: Record<string, unknown>[]): ParsedUpload {
  const truncated = raw.length > MAX_ROWS;
  const slice = truncated ? raw.slice(0, MAX_ROWS) : raw;
  const columns: string[] = [];
  const seen = new Set<string>();
  slice.forEach((r) =>
    Object.keys(r).forEach((k) => {
      const key = k.trim();
      if (key && !seen.has(key)) {
        seen.add(key);
        columns.push(key);
      }
    })
  );
  const rows = slice.map((r) => {
    const o: Record<string, string> = {};
    for (const c of columns) o[c] = toStr((r as Record<string, unknown>)[c]);
    return o;
  });
  return { format, columns, rows, truncated };
}

export function parseUpload(buffer: Buffer, filename: string): ParsedUpload {
  if (buffer.length > MAX_UPLOAD_BYTES) throw new Error(`Ukuran file melebihi batas ${MAX_UPLOAD_BYTES / 1024 / 1024} MB`);
  const lower = filename.toLowerCase();

  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) throw new Error("Sheet Excel kosong");
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false, dateNF: "yyyy-mm-dd" });
    return finalize("EXCEL", raw);
  }

  const text = buffer.toString("utf8").replace(/^﻿/, "");
  if (lower.endsWith(".json")) {
    const data = JSON.parse(text);
    const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : null;
    if (!arr) throw new Error("JSON harus berupa array objek");
    return finalize("JSON", arr as Record<string, unknown>[]);
  }

  // CSV / TSV: deteksi delimiter otomatis (koma, titik-koma, tab, pipa)
  const res = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: "greedy", delimitersToGuess: [",", ";", "\t", "|"] });
  const fatal = res.errors.find((e) => e.type === "Delimiter" || e.type === "Quotes");
  if (fatal && res.data.length === 0) throw new Error(`File CSV tidak dapat dibaca: ${fatal.message}`);
  if (res.data.length === 0) throw new Error("File tidak berisi baris data");
  return finalize("CSV", res.data);
}
