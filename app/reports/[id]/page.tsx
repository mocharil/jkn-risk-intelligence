"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { formatRupiah } from "@/lib/formatting/currency";
import { formatDate } from "@/lib/formatting/date";
import { Investigation } from "@/types/investigation";
import {
  ArrowLeft,
  Printer,
  FileSpreadsheet,
  Download,
} from "lucide-react";

const verdictLabel: Record<string, string> = {
  CONFIRMED_RISK: "RISIKO TERKONFIRMASI (KOREKSI TARIF / DISALLOW)",
  FALSE_POSITIVE: "POSITIF PALSU (KLAIM WAJAR)",
  NEED_EVIDENCE: "TERTUNDA — BUKTI TAMBAHAN DIMINTA",
};

export default function ReportDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const investigationId = id.replace(/^REP-/, "");

  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setInvestigation(null);
    fetch(`/api/investigations/${investigationId}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.data) {
          setInvestigation(data.data);
        } else {
          setNotFound(true);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setNotFound(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [investigationId]);

  if (loading) {
    return (
      <DashboardShell>
        <PageLoader label={`Memuat dosier audit untuk ${id}...`} />
      </DashboardShell>
    );
  }

  if (notFound || !investigation) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center print:hidden">
          <FileSpreadsheet className="w-8 h-8 text-jkn-dim" />
          <p className="text-sm font-bold text-jkn-text">Laporan tidak ditemukan</p>
          <p className="text-xs text-jkn-muted">
            Tidak ada berkas investigasi dengan nomor &ldquo;{investigationId}&rdquo;.
          </p>
          <Link href="/reports" className="text-xs font-semibold text-bpjs-dark hover:underline">
            Kembali ke Register Dosier
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const { decision } = investigation;
  const claim = { ...investigation.claim, risk_findings: investigation.claim.risk_findings ?? [] };
  const topFinding = claim.risk_findings[0];

  return (
    <DashboardShell>
      {/* Action Header */}
      <div className="flex items-center justify-between border-b border-jkn-border pb-4 print:hidden">
        <Link
          href="/reports"
          className="flex items-center gap-2 text-xs font-semibold text-jkn-muted hover:text-jkn-text"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Register Dosier</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="h-9 flex items-center gap-1.5 px-3.5 rounded-lg border border-jkn-border bg-white text-jkn-text text-xs font-semibold hover:bg-surface-secondary transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak</span>
          </button>
          <a
            href={`/api/reports/${investigation.investigation_id}/pdf`}
            className="h-9 flex items-center gap-1.5 px-4 rounded-lg bg-bpjs text-white text-xs font-semibold hover:bg-bpjs-deep transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh PDF (Hash SHA-256)</span>
          </a>
        </div>
      </div>

      {/* Formal Printable Document Canvas */}
      <div className="max-w-4xl mx-auto bg-white border border-jkn-border p-8 md:p-10 rounded-xl shadow-subtle space-y-6 print:border-none print:shadow-none print:p-0 print:max-w-none print:w-full print-page tabular-nums">
        {/* Institutional Header */}
        <div className="flex items-center justify-between border-b-2 border-bpjs pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-white border border-jkn-border flex items-center justify-center p-1.5 shrink-0">
              <img src="/arsa_logo.png" alt="ARSA JKN" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-jkn-text tracking-tight uppercase">
                BPJS KESEHATAN · DIREKTORAT JAMINAN PELAYANAN KESEHATAN
              </h2>
              <p className="text-xs text-bpjs-dark font-semibold mt-0.5">
                DOSIER PEMERIKSAAN INTEGRITAS KLAIM INA-CBG (ARSA AI)
              </p>
            </div>
          </div>
          <div className="text-right text-xs">
            <span className="font-mono font-bold text-jkn-text block">
              REP-{investigation.investigation_id}
            </span>
            <span className="text-[10px] font-bold text-risk-critical uppercase tracking-wider">
              DOKUMEN AUDIT TERBATAS
            </span>
          </div>
        </div>

        {/* Report Metadata */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-jkn-divider rounded-lg bg-surface-secondary/70 border border-jkn-border text-xs">
          <div className="p-3">
            <span className="text-[10px] text-jkn-dim font-bold uppercase block">Referensi Klaim</span>
            <span className="font-mono font-semibold text-jkn-text mt-0.5 block">
              {claim.claim_id}
            </span>
            <span className="font-mono text-[10px] text-jkn-muted block">SEP: {claim.sep_number}</span>
          </div>
          <div className="p-3">
            <span className="text-[10px] text-jkn-dim font-bold uppercase block">Faskes Diaudit</span>
            <span className="font-semibold text-jkn-text mt-0.5 block">{claim.provider.name}</span>
            <span className="text-[10px] text-jkn-muted block">{claim.provider.city}</span>
          </div>
          <div className="p-3">
            <span className="text-[10px] text-jkn-dim font-bold uppercase block">
              Peserta (Pseudonim)
            </span>
            <span className="font-semibold text-jkn-text mt-0.5 block">{claim.patient.name}</span>
            <span className="font-mono text-[10px] text-jkn-muted block">
              {claim.patient.patient_id}
            </span>
          </div>
          <div className="p-3">
            <span className="text-[10px] text-jkn-dim font-bold uppercase block">
              Tanggal Dosier
            </span>
            <span className="font-semibold text-jkn-text mt-0.5 block">
              {formatDate(decision?.decided_at || investigation.updated_at)}
            </span>
            <span className="font-mono text-[10px] text-jkn-muted block">
              Skor Risiko: {claim.risk_score}/100
            </span>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-jkn-text uppercase tracking-wider border-b border-jkn-divider pb-1.5">
            I. Ringkasan Eksekutif Pemeriksaan
          </h3>
          <p className="text-xs text-jkn-text leading-relaxed">
            {claim.risk_findings.length > 0 ? (
              <>
                Berdasarkan pemeriksaan dokumen rekam medis dan pembandingan terhadap distribusi faskes sejawat (peer group), detektor deterministik mengidentifikasi bahwa berkas klaim{" "}
                <strong className="font-mono">{claim.claim_id}</strong> memuat indikator{" "}
                {claim.risk_findings.map((f, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && (i === claim.risk_findings.length - 1 ? " serta " : ", ")}
                    <strong>{f.title}</strong>
                  </React.Fragment>
                ))}
                .
                {claim.tariff_difference
                  ? ` Teridentifikasi potensi selisih tagihan terhadap tarif standar sebesar `
                  : ""}
                {claim.tariff_difference ? (
                  <strong className="font-mono text-risk-critical">
                    {formatRupiah(claim.tariff_difference)}
                  </strong>
                ) : null}
                {claim.tariff_difference ? "." : ""}
              </>
            ) : (
              <>
                Tidak ditemukan indikator anomali otomatis pada berkas klaim{" "}
                <strong className="font-mono">{claim.claim_id}</strong>.
              </>
            )}
          </p>
        </div>

        {/* Evidence Matrix */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold text-jkn-text uppercase tracking-wider border-b border-jkn-divider pb-1.5">
            II. Rincian Temuan Detektor & Bukti Rekam Medis Verbatim
          </h3>
          <div className="divide-y divide-jkn-divider border border-jkn-border rounded-lg overflow-hidden text-xs">
            {claim.risk_findings.length > 0 ? (
              claim.risk_findings.map((finding, idx) => (
                <div key={idx} className="p-4 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-risk-critical">
                      {idx + 1}. {finding.title}
                    </span>
                    <span className="font-mono text-[11px] text-jkn-muted">
                      Keyakinan: {(finding.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-jkn-muted leading-relaxed">{finding.summary}</p>
                  <div className="space-y-1.5 pt-1">
                    {(finding.evidence ?? []).map((e, i) => (
                      <div
                        key={i}
                        className="text-[11px] pl-3 border-l-2 border-bpjs py-0.5 space-y-0.5"
                      >
                        <div>
                          <span className="font-mono text-[10px] font-semibold text-bpjs-dark">
                            [{e.evidence_id}]
                          </span>{" "}
                          <span className="text-jkn-text">{e.claim_statement}</span>
                        </div>
                        {e.excerpt && (
                          <div className="italic text-jkn-muted">&ldquo;{e.excerpt}&rdquo;</div>
                        )}
                      </div>
                    ))}
                  </div>
                  {finding.ai_explanation && (
                    <div className="text-[11px] text-jkn-text bg-surface-secondary border border-jkn-border rounded p-2.5 mt-2">
                      <strong>
                        Sintesis Analisis (
                        {finding.ai_explanation.source === "llm"
                          ? "LLM · Sitasi Tervalidasi"
                          : "Deterministik"}
                        ):
                      </strong>{" "}
                      {finding.ai_explanation.text}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="p-4 text-xs text-jkn-muted">
                Tidak ada bukti kontradiksi pada berkas klaim ini.
              </p>
            )}
          </div>
        </div>

        {/* Decision & Signatures */}
        <div className="space-y-4 pt-2">
          <h3 className="text-xs font-bold text-jkn-text uppercase tracking-wider border-b border-jkn-divider pb-1.5">
            III. Penetapan Keputusan Audit & Rencana Tindak Lanjut
          </h3>
          <div className="p-4 rounded-lg bg-surface-secondary border border-jkn-border text-xs space-y-2">
            <div className="flex justify-between font-bold text-jkn-text">
              <span>Status Keputusan:</span>
              <span className="font-mono text-bpjs-dark">
                {decision
                  ? verdictLabel[decision.verdict] || decision.verdict
                  : "MENUNGGU PENETAPAN KEPUTUSAN"}
              </span>
            </div>
            <p className="text-xs text-jkn-muted leading-relaxed">
              {decision?.rationale ||
                (topFinding
                  ? `Rekomendasi tindak lanjut: koreksi ke kode tarif INA-CBG yang sesuai bukti klinis atau penangguhan komponen biaya yang tidak didukung dokumen (${
                      (topFinding.recommended_actions ?? []).join("; ") || topFinding.summary
                    }).`
                  : "Tidak diperlukan tindakan koreksi pada klaim ini.")}
            </p>
            {decision?.recommended_recovery_amount ? (
              <p className="text-xs font-mono font-bold text-risk-critical pt-1">
                Nilai Pemulihan / Koreksi Tagihan:{" "}
                {formatRupiah(decision.recommended_recovery_amount)}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-8 pt-8 text-xs text-center">
            <div className="space-y-12">
              <span className="text-jkn-dim font-medium">Verifikator Pemeriksa,</span>
              <div>
                <span className="font-bold text-jkn-text underline block">
                  {investigation.assigned_to?.name ?? "-"}
                </span>
                <span className="text-[10px] text-jkn-dim">{investigation.assigned_to?.role ?? ""}</span>
              </div>
            </div>
            <div className="space-y-12">
              <span className="text-jkn-dim font-medium">Pejabat Penetap Keputusan,</span>
              <div>
                <span className="font-bold text-jkn-text underline block">
                  {decision?.decided_by || "Menunggu Otorisasi"}
                </span>
                <span className="text-[10px] text-jkn-dim">
                  {decision ? formatDate(decision.decided_at) : "Pemeriksaan masih berlangsung"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
