import { CanonicalClaim } from "@/types/claim";
import { ALL_RISK_TYPES, RiskType } from "@/types/risk";
import { computeDashboardKPIs, computeEmergingSignals, computeProvinceRisk } from "../analytics/aggregates";
import { INDONESIA_PROVINCES } from "../data/indonesia-provinces";
import { DataStore } from "../data/store";

/**
 * Konteks terkurasi untuk LLM (RAG sederhana tanpa pencarian bebas):
 * hanya fakta dari data yang sudah dianonimkan, masing-masing dengan id yang dapat dikutip.
 */
export interface ContextItem {
  id: string;
  kind: "CLAIM" | "FINDING" | "DOC" | "SIMILAR" | "PROVIDER" | "AGG" | "SIGNAL" | "LIST";
  title: string;
  text: string;
  status?: "SUPPORTS_CLAIM" | "CONTRADICTS_CLAIM" | "NEEDS_REVIEW";
  link?: { type: "CLAIM" | "PROVIDER" | "MAP" | "QUEUE" | "SIMILAR_CLAIM"; id: string; label: string; risk_score: number };
}

const rp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;
const trunc = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

const TYPE_ALIASES: Record<RiskType, string[]> = {
  UPCODING: ["upcoding", "severity", "keparahan"],
  CLONING: ["cloning", "klon", "duplikat", "duplikasi", "mirip", "salin"],
  PHANTOM_BILLING: ["phantom", "fiktif", "tanpa bukti", "tindakan tanpa"],
  ABNORMAL_LOS: ["los", "lama rawat", "length of stay", "rawat inap lama"],
  UNBUNDLING: ["unbundling", "terpisah", "paket"],
  REPEAT_BILLING: ["repeat", "ganda", "dobel", "double billing", "tagih ulang"],
  READMISSION: ["readmisi", "readmission", "rawat ulang", "masuk kembali"],
  INFLATED_BILLS: ["inflated", "digelembungkan", "mark-up", "markup", "harga acuan", "penggelembungan"],
};

function findClaims(store: DataStore, question: string, claimId?: string): CanonicalClaim[] {
  const found = new Map<string, CanonicalClaim>();
  const norm = (id: string) => id.replace(/\D/g, "").replace(/^0+/, "");
  const wanted = new Set<string>();
  if (claimId) wanted.add(norm(claimId));
  Array.from(question.matchAll(/CLM[-\s]?(\d{3,7})/gi)).forEach((m) => wanted.add(m[1].replace(/^0+/, "")));
  if (wanted.size) for (const c of store.claims) if (wanted.has(norm(c.claim_id))) found.set(c.claim_id, c);
  return Array.from(found.values()).slice(0, 3);
}

export function claimItems(c: CanonicalClaim): ContextItem[] {
  const d = c.diagnoses.find((x) => x.is_primary) || c.diagnoses[0];
  const items: ContextItem[] = [];
  items.push({
    id: `claim:${c.claim_id}`,
    kind: "CLAIM",
    title: `Klaim ${c.claim_id}`,
    text: `Klaim ${c.claim_id} di ${c.provider.name} (${c.provider.province_code}). Diagnosis ${d?.code} ${d?.description}, severity ${d?.severity}, lama rawat ${c.service.length_of_stay} hari, DPJP ${c.service.doctor_name}. Tagihan ${rp(c.claim_amount)} vs median peer ${rp(c.approved_tariff || 0)} (selisih ${rp(c.tariff_difference || 0)}). Prosedur: ${c.procedures.map((p) => `${p.code}${p.cost ? ` (${rp(p.cost)})` : ""}`).join(", ") || "-"}. Skor risiko ${c.risk_score} (${c.risk_level}), status ${c.status}.`,
    link: { type: "CLAIM", id: c.claim_id, label: `Buka klaim ${c.claim_id}`, risk_score: c.risk_score },
  });
  for (const f of c.risk_findings) {
    items.push({
      id: `finding:${c.claim_id}:${f.risk_type}`,
      kind: "FINDING",
      title: f.title,
      text: `${f.risk_type} skor ${f.risk_score} (conf ${f.confidence}, aturan ${f.rule_id || "-"}): ${f.summary} Bukti hilang: ${f.missing_evidence.join("; ") || "-"}.`,
      status: "CONTRADICTS_CLAIM",
    });
  }
  for (const e of c.medical_evidence) {
    items.push({
      id: e.evidence_id,
      kind: "DOC",
      title: `${e.title} (${e.document_type})`,
      text: trunc(e.content || e.excerpt, 520),
      status: e.status === "SUPPORTS_CLAIM" ? "SUPPORTS_CLAIM" : e.status === "CONTRADICTS_CLAIM" ? "CONTRADICTS_CLAIM" : "NEEDS_REVIEW",
    });
  }
  for (const s of c.similar_claims.slice(0, 3)) {
    items.push({
      id: `sim:${c.claim_id}:${s.claim_id}`,
      kind: "SIMILAR",
      title: `Klaim mirip ${s.claim_id}`,
      text: `Klaim ${s.claim_id} (${s.provider_name}) kemiripan ${(s.similarity_score * 100).toFixed(1)}%, tumpang tindih frasa ${Math.round((s.lexical_overlap ?? 0) * 100)}%. ${s.similarity_reasons.join(" ")}`,
      link: { type: "SIMILAR_CLAIM", id: s.claim_id, label: `Klaim mirip ${s.claim_id} (${(s.similarity_score * 100).toFixed(1)}%)`, risk_score: s.risk_score },
    });
  }
  return items;
}

export function buildContext(store: DataStore, opts: { question: string; claim_id?: string; provider_id?: string }): ContextItem[] {
  const q = opts.question.toLowerCase();
  const items: ContextItem[] = [];
  const add = (i: ContextItem) => {
    if (!items.some((x) => x.id === i.id)) items.push(i);
  };

  const claims = findClaims(store, opts.question, opts.claim_id);
  claims.forEach((c) => claimItems(c).forEach(add));

  // faskes
  const provs = store.providers.filter((p) => p.provider_id === opts.provider_id || q.includes(p.provider_id.toLowerCase()) || q.includes(p.name.toLowerCase()) || (claims.length > 0 && claims.some((c) => c.provider.provider_id === p.provider_id)));
  provs.slice(0, 3).forEach((p) =>
    add({
      id: `provider:${p.provider_id}`,
      kind: "PROVIDER",
      title: p.name,
      text: `${p.name} (${p.provider_id}, ${p.province_name}): skor risiko ${p.risk_score} (${p.risk_level}), ${p.high_risk_claims} klaim berisiko tinggi dari ${p.total_claims}, eksposur ${rp(p.potential_exposure)}, dominan ${p.dominant_risk_type}. Severity-3 ${p.peer_comparison.severity_3_rate.provider}% vs median peer ${p.peer_comparison.severity_3_rate.peer_median}%; rerata LOS ${p.peer_comparison.avg_los_days.provider} hari vs ${p.peer_comparison.avg_los_days.peer_median}; readmisi ${p.peer_comparison.readmission_rate_pct.provider}% vs ${p.peer_comparison.readmission_rate_pct.peer_median}%. Dokter berisiko: ${p.doctors.filter((d) => d.high_risk_claims_count > 0).sort((a, b) => b.risk_score - a.risk_score).slice(0, 2).map((d) => `${d.name} (skor ${d.risk_score}, ${d.high_risk_claims_count} klaim tinggi)`).join("; ") || "-"}.`,
      link: { type: "PROVIDER", id: p.provider_id, label: `Profil ${p.name}`, risk_score: p.risk_score },
    })
  );

  // provinsi
  const provRisk = computeProvinceRisk(store);
  INDONESIA_PROVINCES.filter((p) => q.includes(p.name.toLowerCase()) || q.includes(p.code.toLowerCase())).slice(0, 2).forEach((p) => {
    const r = provRisk.find((x) => x.province_code === p.code);
    if (r)
      add({
        id: `province:${p.code}`,
        kind: "AGG",
        title: `Provinsi ${p.name}`,
        text: `${p.name}: ${r.total_claims} klaim, ${r.high_risk_claims} berisiko tinggi, eksposur ${rp(r.potential_exposure)}, dominan ${r.dominant_risk_type}, level ${r.risk_level}. Faskes teratas: ${r.top_providers.join(", ") || "-"}.`,
        link: { type: "MAP", id: p.code, label: `Peta risiko ${p.name}`, risk_score: r.risk_level === "CRITICAL" ? 95 : r.risk_level === "HIGH" ? 80 : r.risk_level === "MEDIUM" ? 60 : 30 },
      });
  });

  // jenis risiko
  for (const t of ALL_RISK_TYPES) {
    if (TYPE_ALIASES[t].some((a) => q.includes(a))) {
      const withT = store.claims.filter((c) => c.risk_findings.some((f) => f.risk_type === t));
      const byProv = new Map<string, number>();
      withT.forEach((c) => byProv.set(c.provider.name, (byProv.get(c.provider.name) || 0) + 1));
      const top = Array.from(byProv.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
      add({
        id: `type:${t}`,
        kind: "AGG",
        title: `Sinyal ${t}`,
        text: `${withT.length} klaim memiliki sinyal ${t}, eksposur ${rp(withT.reduce((a, c) => a + (c.tariff_difference || 0), 0))}. Faskes terbanyak: ${top.map(([n, v]) => `${n} (${v})`).join(", ") || "-"}.`,
      });
    }
  }

  // agregat nasional + sinyal emergen + daftar teratas (selalu ada sebagai pijakan)
  const kpi = computeDashboardKPIs(store);
  add({
    id: "agg:national",
    kind: "AGG",
    title: "Ringkasan nasional",
    text: `${kpi.total_claims_analyzed} klaim dianalisis, ${kpi.high_risk_claims} berisiko tinggi, eksposur ${rp(kpi.potential_exposure)}, ${kpi.providers_at_risk} faskes berisiko tinggi. Distribusi: kritis ${kpi.risk_distribution.critical}, tinggi ${kpi.risk_distribution.high}, sedang ${kpi.risk_distribution.medium}, rendah ${kpi.risk_distribution.low}. Perubahan 7 hari: klaim ${kpi.trends.claims_change_pct}%, berisiko tinggi ${kpi.trends.high_risk_change_pct}%.`,
  });
  computeEmergingSignals(store).slice(0, 3).forEach((s) =>
    add({ id: `signal:${s.signal_id}`, kind: "SIGNAL", title: s.title, text: `${s.title}: ${s.description} Eksposur ${rp(s.potential_exposure)}, keyakinan ${s.confidence}.` })
  );
  if (claims.length === 0) {
    const top = [...store.claims].sort((a, b) => b.risk_score - a.risk_score).slice(0, 5);
    add({
      id: "list:top_claims",
      kind: "LIST",
      title: "Klaim berisiko tertinggi",
      text: top.map((c) => `${c.claim_id} (${c.provider.name}, skor ${c.risk_score}, ${c.risk_signals.join("+")}, selisih ${rp(c.tariff_difference || 0)})`).join("; "),
      link: { type: "CLAIM", id: top[0]?.claim_id || "", label: `Klaim teratas ${top[0]?.claim_id}`, risk_score: top[0]?.risk_score || 0 },
    });
  }
  if (provs.length === 0) {
    const top = [...store.providers].sort((a, b) => b.risk_score - a.risk_score).slice(0, 5);
    add({
      id: "list:top_providers",
      kind: "LIST",
      title: "Faskes berisiko tertinggi",
      text: top.map((p) => `${p.name} (skor ${p.risk_score}, ${p.high_risk_claims}/${p.total_claims} klaim tinggi, eksposur ${rp(p.potential_exposure)})`).join("; "),
      link: { type: "PROVIDER", id: top[0]?.provider_id || "", label: `Profil ${top[0]?.name}`, risk_score: top[0]?.risk_score || 0 },
    });
  }
  return items.slice(0, 40);
}
