import { ColumnProfile } from "@/types/dataset";
import { AnonymizedUpload } from "./pii";

const DATE_RE = /^(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{4})/;

function detectType(values: string[]): ColumnProfile["detected_type"] {
  const v = values.filter(Boolean).slice(0, 300);
  if (!v.length) return "string";
  const dateShare = v.filter((x) => DATE_RE.test(x)).length / v.length;
  if (dateShare > 0.8) return "date";
  const numShare = v.filter((x) => /^-?[\d.,\sRp]+$/i.test(x) && /\d/.test(x)).length / v.length;
  if (numShare > 0.9) return "number";
  const boolShare = v.filter((x) => /^(true|false|ya|tidak|y|n|0|1)$/i.test(x)).length / v.length;
  if (boolShare > 0.95) return "boolean";
  return "string";
}

export function profileColumns(a: AnonymizedUpload): ColumnProfile[] {
  const total = a.rows.length;
  return a.columns.map((name) => {
    const values = a.rows.map((r) => r[name]);
    const nonEmpty = values.filter((v) => v !== "");
    const distinct = new Set(nonEmpty);
    return {
      name,
      detected_type: detectType(values),
      // Sampel hanya dari nilai yang SUDAH dianonimkan; teks bebas dipotong.
      sample_values: Array.from(distinct)
        .slice(0, 4)
        .map((v) => (v.length > 80 ? `${v.slice(0, 77)}...` : v)),
      null_count: total - nonEmpty.length,
      total_count: total,
      distinct_count: distinct.size,
      pii: a.piiByColumn[name],
      pii_treatment: a.treatmentByColumn[name],
    };
  });
}
