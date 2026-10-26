import React from "react";
import { PROVENANCE_RESMI, PROVENANCE_SINTETIS, PROVENANCE_SUMMARY } from "@/lib/data/provenance";

/** Katalog sumber data: resmi (Sample BPJS) vs sintetis (beserta alasan). Sumber: lib/data/provenance.ts. */
export function ProvenanceCatalog({ compact = false }: { compact?: boolean }) {
  return (
    <section aria-label="Asal data" className="bg-surface rounded-2xl border border-jkn-border shadow-subtle p-5 space-y-4">
      <div>
        <h2 className="text-sm font-bold text-jkn-text">Asal data: resmi vs sintetis</h2>
        <p className="text-xs text-jkn-muted mt-1">{PROVENANCE_SUMMARY}.</p>
      </div>
      <div className={compact ? "space-y-3" : "grid md:grid-cols-2 gap-4"}>
        <div>
          <h3 className="text-xs font-bold text-bpjs-dark mb-2">Data resmi Sample BPJS</h3>
          <ul className="space-y-2 text-xs text-jkn-muted">
            {PROVENANCE_RESMI.map((s) => (
              <li key={s.id}>
                <span className="font-semibold text-jkn-text">{s.component}</span>: Data resmi Sample BPJS: <span className="font-mono break-all">{s.files?.join(", ")}</span>
                <div>{s.usage}</div>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-bold text-risk-high mb-2">Data sintetis</h3>
          <ul className="space-y-2 text-xs text-jkn-muted">
            {PROVENANCE_SINTETIS.map((s) => (
              <li key={s.id}>
                <span className="font-semibold text-jkn-text">{s.component}</span>: Data sintetis: {s.detail}
                <div>{s.usage}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
