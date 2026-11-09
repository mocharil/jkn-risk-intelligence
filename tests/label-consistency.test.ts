import fs from "fs";
import os from "os";
import path from "path";
import zlib from "zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getStore } from "@/lib/data/store";
import { computeDashboardKPIs } from "@/lib/analytics/aggregates";
import { buildInvestigationPdf } from "@/lib/reports/pdf";
import { RISK_LEVEL_LABEL, RISK_TYPE_LABEL, humanizeRiskCodes, statusText } from "@/lib/risk/labels";

/** Satu nama untuk satu hal di seluruh antarmuka, briefing, dan laporan PDF. */

const RAW_CODE = /\b(?:UPCODING|CLONING|PHANTOM_BILLING|ABNORMAL_LOS|UNBUNDLING|INFLATED_BILLS|REPEAT_BILLING|READMISSION|CRITICAL|UNDER_INVESTIGATION|NEED_EVIDENCE|CONFIRMED_RISK|FALSE_POSITIVE)\b/;

/** Teks halaman PDF: aliran konten pdf-lib dikompresi dan teksnya berupa string heksadesimal (Tj). */
function pdfText(bytes: Uint8Array): string {
  const buf = Buffer.from(bytes);
  const out: string[] = [];
  let at = 0;
  for (;;) {
    const s = buf.indexOf("stream", at, "latin1");
    if (s < 0) break;
    const start = buf[s + 6] === 0x0d ? s + 8 : s + 7;
    const end = buf.indexOf("endstream", start, "latin1");
    if (end < 0) break;
    at = end + 9;
    let data: string | null = null;
    try {
      data = zlib.inflateSync(buf.subarray(start, end)).toString("latin1");
    } catch {
      continue;
    }
    Array.from(data.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)).forEach((m) => out.push(Buffer.from(m[1], "hex").toString("latin1")));
  }
  return out.join("\n");
}

/** Store dibangun dari data bawaan di folder sementara, bukan dari snapshot .data milik server pengembangan (catatan lama di sana masih memuat kode mentah). */
let dir = "";
beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "arsa-label-"));
  process.env.ARSA_DATA_DIR = dir;
});
afterAll(() => {
  delete process.env.ARSA_DATA_DIR;
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("humanizeRiskCodes", () => {
  it("kode jenis risiko dan tingkat dalam kurung menjadi nama antarmuka", () => {
    expect(humanizeRiskCodes("Dominan UPCODING dan PHANTOM_BILLING pada RSUD (CRITICAL).")).toBe(`Dominan ${RISK_TYPE_LABEL.UPCODING} dan ${RISK_TYPE_LABEL.PHANTOM_BILLING} pada RSUD (${RISK_LEVEL_LABEL.CRITICAL}).`);
  });

  it("teks yang sudah rapi tidak berubah", () => {
    const t = "RSUD Jakarta Selatan memiliki skor 90 (Kritis), dominan Upcoding, status tinggi.";
    expect(humanizeRiskCodes(t)).toBe(t);
  });
});

describe("briefing otomatis dan laporan PDF", () => {
  it("briefing otomatis di Command Center tidak memuat kode mentah atau spasi ganda", () => {
    const b = computeDashboardKPIs(getStore()).ai_briefing;
    for (const line of [b.summary, ...b.key_findings]) {
      expect(line).not.toMatch(RAW_CODE);
      expect(line).not.toMatch(/\s{2,}/);
    }
    expect(b.summary).toMatch(/Pola dominan: (Upcoding|Cloning|Phantom Billing|LOS Anomali|Unbundling|Inflasi Tagihan|Tagihan Berulang|Readmisi Dini)\./);
  });

  it("laporan PDF memakai tingkat risiko, jenis risiko, dan status yang dapat dibaca", async () => {
    const store = getStore();
    const inv = store.investigations[0];
    const claimAudit = store.auditLog.filter((e) => e.claim_id === inv.claim_id);
    const text = pdfText(await buildInvestigationPdf(inv, claimAudit, store.auditLog));
    expect(text.length).toBeGreaterThan(200);
    expect(text).toContain(`Status kasus: ${statusText(inv.status)}`);
    expect(text).toMatch(/Skor risiko|Skor risiko/);
    expect(text).not.toMatch(/\((?:CRITICAL|HIGH|MEDIUM|LOW)\)/);
    expect(text).not.toMatch(RAW_CODE);
    expect(text).toContain(RISK_TYPE_LABEL[inv.claim.risk_findings[0].risk_type]);
  });
});

describe("satu sumber nama jenis risiko", () => {
  it("antarmuka tidak lagi memuat varian nama yang berbeda-beda untuk jenis risiko yang sama", () => {
    const roots = ["app", "components"];
    const variants = ["Klaim fiktif", "Tagihan fiktif", "Kloning narasi", "Tagihan membengkak", "Lama rawat janggal", "LOS anomali", "Rawat ulang dini", "Readmisi dini", "Phantom billing", "Inflasi tagihan"];
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(tsx?|mjs)$/.test(e.name)) {
          const src = fs.readFileSync(p, "utf8");
          for (const v of variants) if (src.includes(v)) hits.push(`${p}: ${v}`);
        }
      }
    };
    roots.forEach((r) => walk(path.resolve(process.cwd(), r)));
    expect(hits).toEqual([]);
  });
});
