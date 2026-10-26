import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { AuditEntry, verifyChain } from "../audit/chain";
import { Investigation } from "@/types/investigation";

/**
 * Laporan investigasi PDF (server-side): temuan, kutipan bukti verbatim, penjelasan (berlabel sumber),
 * keputusan, dan jejak audit ber-hash. Footer tiap halaman memuat hash kepala rantai audit.
 */

const GREEN = rgb(0, 0.65, 0.32);
const DARK = rgb(0.1, 0.12, 0.15);
const MUTED = rgb(0.38, 0.42, 0.47);
const RED = rgb(0.76, 0.16, 0.12);

const A4: [number, number] = [595.28, 841.89];
const M = 48;

/** Font standar PDF hanya WinAnsi — ganti karakter di luar rentang agar tidak melempar error. */
function clean(t: string): string {
  return t
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/→/g, "->")
    .replace(/…/g, "...")
    .replace(/[•●]/g, "-")
    .replace(/✓/g, "v")
    .replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ–—]/g, "?");
}

const rp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

const VERDICT: Record<string, string> = {
  CONFIRMED_RISK: "RISIKO TERKONFIRMASI - koreksi tarif / disallow tagihan tidak berdasar",
  FALSE_POSITIVE: "FALSE POSITIVE - klaim wajar",
  NEED_EVIDENCE: "TERTUNDA - bukti tambahan diminta",
};

export async function buildInvestigationPdf(inv: Investigation, audit: AuditEntry[], fullChain: AuditEntry[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.Courier);
  const chain = verifyChain(fullChain);
  const headHash = chain.head_hash;

  let page: PDFPage = doc.addPage(A4);
  const pages: PDFPage[] = [page];
  let y = A4[1] - M;

  const newPage = () => {
    page = doc.addPage(A4);
    pages.push(page);
    y = A4[1] - M;
  };

  const ensure = (h: number) => {
    if (y - h < M + 28) newPage();
  };

  const wrap = (text: string, f: PDFFont, size: number, width: number): string[] => {
    const out: string[] = [];
    for (const para of clean(text).split("\n")) {
      let line = "";
      for (const word of para.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (f.widthOfTextAtSize(next, size) > width && line) {
          out.push(line);
          line = word;
        } else line = next;
      }
      out.push(line);
    }
    return out;
  };

  const write = (text: string, opts: { f?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; indent?: number; gap?: number } = {}) => {
    const f = opts.f || font;
    const size = opts.size || 9.5;
    const indent = opts.indent || 0;
    for (const l of wrap(text, f, size, A4[0] - 2 * M - indent)) {
      ensure(size + 3);
      page.drawText(l, { x: M + indent, y: y - size, size, font: f, color: opts.color || DARK });
      y -= size + 3;
    }
    y -= opts.gap ?? 0;
  };

  const heading = (t: string) => {
    ensure(28);
    y -= 6;
    page.drawText(clean(t.toUpperCase()), { x: M, y: y - 10, size: 10, font: bold, color: GREEN });
    y -= 14;
    page.drawLine({ start: { x: M, y }, end: { x: A4[0] - M, y }, thickness: 0.6, color: rgb(0.85, 0.88, 0.9) });
    y -= 6;
  };

  const claim = inv.claim;
  const assignee = inv.assigned_to ?? { name: "-", role: "-" };
  const findings = claim.risk_findings ?? [];

  // ---- Kop ----
  page.drawRectangle({ x: 0, y: A4[1] - 74, width: A4[0], height: 74, color: rgb(0.03, 0.4, 0.22) });
  page.drawText("BPJS KESEHATAN - JKN RISK INTELLIGENCE (ARSA AI)", { x: M, y: A4[1] - 34, size: 12, font: bold, color: rgb(1, 1, 1) });
  page.drawText("Laporan Investigasi Integritas Klaim", { x: M, y: A4[1] - 52, size: 10, font, color: rgb(0.85, 0.95, 0.9) });
  page.drawText(`REP-${inv.investigation_id}`, { x: A4[0] - M - bold.widthOfTextAtSize(`REP-${inv.investigation_id}`, 11), y: A4[1] - 34, size: 11, font: bold, color: rgb(1, 1, 1) });
  page.drawText("RAHASIA - HANYA UNTUK AUDIT", { x: A4[0] - M - bold.widthOfTextAtSize("RAHASIA - HANYA UNTUK AUDIT", 8), y: A4[1] - 52, size: 8, font: bold, color: rgb(1, 0.85, 0.85) });
  y = A4[1] - 92;

  // ---- Metadata ----
  const meta: [string, string][] = [
    ["Klaim / SEP", `${claim.claim_id} (${claim.sep_number})`],
    ["Faskes", `${claim.provider.name} - ${claim.provider.city}`],
    ["Peserta (pseudonim)", `${claim.patient.patient_id}, ${claim.patient.age} th`],
    ["DPJP", claim.service.doctor_name],
    ["Diagnosis utama", claim.diagnoses?.[0] ? `${claim.diagnoses[0].code} ${claim.diagnoses[0].description} (severity ${claim.diagnoses[0].severity})` : "-"],
    ["Episode", `${claim.service.admission_date} s/d ${claim.service.discharge_date} (${claim.service.length_of_stay} hari)`],
    ["Tagihan / median peer", `${rp(claim.claim_amount)} / ${rp(claim.approved_tariff || 0)}`],
    ["Potensi eksposur", rp(claim.tariff_difference || 0)],
    ["Skor risiko", `${claim.risk_score} (${claim.risk_level})`],
  ];
  for (const [k, v] of meta) {
    ensure(14);
    page.drawText(clean(k), { x: M, y: y - 9, size: 8.5, font, color: MUTED });
    page.drawText(clean(v).slice(0, 95), { x: M + 130, y: y - 9, size: 9.5, font: bold, color: DARK });
    y -= 14;
  }

  // ---- I. Ringkasan ----
  heading("I. Ringkasan temuan");
  if (findings.length === 0) write("Tidak ada indikator risiko yang dinaikkan oleh detector pada klaim ini.");
  else
    write(
      `Detector deterministik menemukan ${findings.length} sinyal risiko: ${findings.map((f) => f.title).join("; ")}. Potensi selisih terhadap median peer ${rp(claim.tariff_difference || 0)}. Seluruh pernyataan di bawah dapat ditelusuri ke dokumen sumber melalui id bukti.`
    );

  // ---- II. Temuan & bukti ----
  heading("II. Temuan, bukti terkutip, dan penjelasan");
  findings.forEach((f, i) => {
    ensure(40);
    write(`${i + 1}. ${f.title}`, { f: bold, size: 10.5, color: RED });
    write(`${f.risk_type} - skor ${f.risk_score}, keyakinan ${(f.confidence * 100).toFixed(0)}%, aturan ${f.rule_id || "-"}`, { size: 8.5, color: MUTED });
    write(f.summary, { gap: 2 });
    if (f.evidence?.length) {
      write("Bukti terkutip:", { f: bold, size: 9 });
      f.evidence.forEach((e) => {
        write(`[${e.evidence_id}] ${e.supports_finding ? "(mendukung temuan)" : "(membantah temuan)"} ${e.claim_statement}`, { indent: 10, size: 8.8 });
        if (e.excerpt) write(`"${e.excerpt}"`, { indent: 18, size: 8.5, color: MUTED });
      });
    }
    if (f.missing_evidence?.length) write(`Bukti belum tersedia: ${f.missing_evidence.join("; ")}`, { size: 8.8, color: rgb(0.6, 0.35, 0) });
    if (f.ai_explanation) {
      write(`Penjelasan (${f.ai_explanation.source === "llm" ? `${f.ai_explanation.provider || "LLM"} ${f.ai_explanation.model || ""}, sitasi tervalidasi` : "deterministik, tanpa LLM"}):`, { f: bold, size: 9 });
      write(f.ai_explanation.text, { indent: 10, size: 8.8 });
    }
    write("", { gap: 4 });
  });

  // ---- III. Keputusan ----
  heading("III. Keputusan & rekomendasi pemulihan dana");
  const d = inv.decision;
  write(`Status kasus: ${inv.status}`, { f: bold });
  if (d) {
    write(VERDICT[d.verdict] || d.verdict, { f: bold, color: GREEN });
    write(`Dasar keputusan: ${d.rationale}`);
    if (d.recommended_recovery_amount) write(`Rekomendasi pemulihan: ${rp(d.recommended_recovery_amount)}`, { f: bold, color: RED });
    write(`Ditetapkan oleh ${d.decided_by} pada ${d.decided_at.slice(0, 10)}`, { size: 8.5, color: MUTED });
  } else {
    write("Belum ada keputusan akhir. Keputusan ditetapkan oleh Supervisor/Admin setelah verifikasi bukti.", { color: MUTED });
  }
  write(`Petugas: ${assignee.name} (${assignee.role})`, { size: 8.5, color: MUTED });

  // ---- IV. Catatan ----
  if (inv.notes?.length) {
    heading("IV. Catatan investigasi");
    inv.notes.slice(0, 12).forEach((n) => write(`${n.created_at.slice(0, 10)} - ${n.author}: ${n.content}`, { size: 8.8 }));
  }

  // ---- V. Audit trail ----
  heading("V. Jejak audit (hash chain SHA-256)");
  write(`Verifikasi rantai: ${chain.valid ? `VALID (${chain.length} entri)` : `RUSAK pada #${chain.broken_at_seq}: ${chain.reason}`}`, { f: bold, color: chain.valid ? GREEN : RED });
  write(`Hash kepala rantai: ${headHash}`, { f: mono, size: 7.5, color: MUTED });
  audit.slice(0, 25).forEach((e) => {
    write(`#${e.seq} ${e.timestamp.slice(0, 19).replace("T", " ")} ${e.action} oleh ${e.actor} (${e.actor_role}) ${e.previous_status ?? "-"} -> ${e.new_status ?? "-"}`, { size: 8.3 });
    write(`sha256 ${e.hash}`, { f: mono, size: 6.8, color: MUTED, indent: 10 });
  });

  // ---- Tanda tangan ----
  ensure(80);
  y -= 16;
  page.drawText("Investigator,", { x: M + 20, y: y - 9, size: 9, font, color: MUTED });
  page.drawText("Menyetujui,", { x: A4[0] / 2 + 40, y: y - 9, size: 9, font, color: MUTED });
  y -= 56;
  page.drawText(clean(assignee.name), { x: M + 20, y: y - 9, size: 9.5, font: bold, color: DARK });
  page.drawText(clean(d?.decided_by || "(menunggu keputusan)"), { x: A4[0] / 2 + 40, y: y - 9, size: 9.5, font: bold, color: DARK });

  // ---- Footer semua halaman ----
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: M, y: M - 6 }, end: { x: A4[0] - M, y: M - 6 }, thickness: 0.4, color: rgb(0.8, 0.83, 0.86) });
    p.drawText(`Arsa AI - dokumen rahasia - data pasien teranonimkan (UU PDP 27/2022) - audit head ${headHash.slice(0, 16)}...`, { x: M, y: M - 18, size: 6.8, font, color: MUTED });
    const label = `Hal ${i + 1}/${pages.length}`;
    p.drawText(label, { x: A4[0] - M - font.widthOfTextAtSize(label, 7), y: M - 18, size: 7, font, color: MUTED });
  });

  doc.setTitle(`Laporan Investigasi ${inv.investigation_id}`);
  doc.setAuthor("Arsa AI - JKN Risk Intelligence");
  return doc.save();
}
