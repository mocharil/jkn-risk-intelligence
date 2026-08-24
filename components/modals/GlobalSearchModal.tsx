"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, X, ShieldAlert, FileText, Building2, ArrowRight } from "lucide-react";
import { CanonicalClaim } from "@/types/claim";
import { Provider } from "@/types/provider";
import { formatRupiah } from "@/lib/formatting/currency";
import { RiskPill } from "../ui/RiskPill";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [claims, setClaims] = useState<CanonicalClaim[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        isOpen ? onClose() : undefined;
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    fetch(`/api/claims?search=${encodeURIComponent(query)}`)
      .then((res) => res.json())
      .then((data) => setClaims(data.data || []));

    fetch(`/api/providers?search=${encodeURIComponent(query)}`)
      .then((res) => res.json())
      .then((data) => setProviders(data.data || []));
  }, [isOpen, query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-100">
      <div className="w-full max-w-2xl bg-surface rounded-2xl shadow-elevated border border-jkn-border overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Box */}
        <div className="p-4 border-b border-jkn-divider flex items-center gap-3">
          <Search className="w-5 h-5 text-bpjs shrink-0" />
          <input
            type="text"
            placeholder="Ketik nomor klaim (CLM-10293), nama faskes, dokter, atau diagnosis..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full text-sm outline-hidden text-jkn-text placeholder:text-jkn-dim bg-transparent"
          />
          <button
            onClick={onClose}
            className="p-1 text-jkn-dim hover:text-jkn-text rounded-md hover:bg-surface-secondary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Quick Suggestions if query is empty */}
          {!query && (
            <div className="space-y-2">
              <h5 className="text-[11px] font-bold text-jkn-dim uppercase tracking-wider">
                Pencarian Populer
              </h5>
              <div className="flex flex-wrap gap-2">
                {["CLM-10293 (Hero Claim)", "RS Sehat Sentosa", "Diare A09", "dr. Hendra Prasetyo", "Klaster Upcoding"].map((item) => (
                  <button
                    key={item}
                    onClick={() => setQuery(item.split(" ")[0])}
                    className="px-2.5 py-1 rounded-lg bg-surface-secondary border border-jkn-border text-xs text-jkn-text hover:border-bpjs hover:bg-bpjs-soft transition-colors"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Claims Results */}
          {claims.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-jkn-dim uppercase tracking-wider">
                <span>Klaim Terdeteksi ({claims.length})</span>
              </div>
              <div className="space-y-1.5">
                {claims.slice(0, 5).map((claim) => (
                  <div
                    key={claim.claim_id}
                    onClick={() => {
                      router.push(claim.investigation_id ? `/investigations/${claim.investigation_id}` : `/claims`);
                      onClose();
                    }}
                    className="flex items-center justify-between p-3 rounded-xl border border-jkn-border hover:border-bpjs hover:bg-bpjs-soft/40 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-surface-secondary text-bpjs group-hover:bg-white transition-colors">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-jkn-text">{claim.claim_id}</span>
                          <span className="text-xs text-jkn-muted">· {claim.patient.name}</span>
                          <RiskPill score={claim.risk_score} level={claim.risk_level} size="sm" />
                        </div>
                        <p className="text-[11px] text-jkn-dim mt-0.5">
                          {claim.provider.name} · {claim.diagnoses[0]?.description}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-jkn-text">{formatRupiah(claim.claim_amount)}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-jkn-dim group-hover:text-bpjs group-hover:translate-x-1 transition-all ml-auto mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Providers Results */}
          {providers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-jkn-dim uppercase tracking-wider">
                <span>Fasilitas Kesehatan ({providers.length})</span>
              </div>
              <div className="space-y-1.5">
                {providers.slice(0, 3).map((provider) => (
                  <div
                    key={provider.provider_id}
                    onClick={() => {
                      router.push(`/providers/${provider.provider_id}`);
                      onClose();
                    }}
                    className="flex items-center justify-between p-3 rounded-xl border border-jkn-border hover:border-bpjs hover:bg-bpjs-soft/40 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-surface-secondary text-intel group-hover:bg-white transition-colors">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-jkn-text">{provider.name}</span>
                          <RiskPill score={provider.risk_score} level={provider.risk_level} size="sm" />
                        </div>
                        <p className="text-[11px] text-jkn-dim mt-0.5">
                          {provider.city}, {provider.province_name} · {provider.high_risk_claims} Klaim Anomali
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-risk-critical">
                        {formatRupiah(provider.potential_exposure, true)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-surface-secondary border-t border-jkn-divider text-[11px] text-jkn-dim flex items-center justify-between px-4">
          <span>Tekan ↵ untuk membuka atau Esc untuk keluar</span>
          <span className="font-medium text-bpjs">JKN Global Search</span>
        </div>
      </div>
    </div>
  );
};
