import { CanonicalClaim } from "@/types/claim";
import { ALL_RISK_TYPES, RiskType } from "@/types/risk";
import { computeDashboardKPIs, computeEmergingSignals, computeProvinceRisk } from "../analytics/aggregates";
import { INDONESIA_PROVINCES } from "../data/indonesia-provinces";
import { DataStore, memoized } from "../data/store";
import * as BPJS from "../data/bpjs-national";
import { computeProviderNational, computeProvinceNational } from "../analytics/provider-national";

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
  link?: { type: "CLAIM" | "PROVIDER" | "MAP" | "QUEUE" | "SIMILAR_CLAIM"; id: string; label: string; risk_score?: number; href?: string };
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

/** Klaim yang disebut pada pertanyaan: CLM-10293 (juga "CLM 10293"), ID klaim apa pun yang ada di data (mis. nomor klaim BPJS), atau ID kasus INV-2026-010293. */
function findClaims(store: DataStore, question: string, claimId?: string): CanonicalClaim[] {
  const found = new Map<string, CanonicalClaim>();
  const byId = new Map(store.claims.map((c) => [c.claim_id.toLowerCase(), c]));
  const norm = (id: string) => id.replace(/\D/g, "").replace(/^0+/, "");
  const wanted = new Set<string>();
  if (claimId) wanted.add(norm(claimId));
  Array.from(question.matchAll(/CLM[-\s]?(\d{3,7})/gi)).forEach((m) => wanted.add(m[1].replace(/^0+/, "")));
  Array.from(question.matchAll(/INV-\d{4}-(\d{3,7})/gi)).forEach((m) => wanted.add(m[1].replace(/^0+/, "")));
  if (wanted.size) for (const c of store.claims) if (c.claim_id.toUpperCase().startsWith("CLM-") && wanted.has(norm(c.claim_id))) found.set(c.claim_id, c);
  // ID di luar format CLM: cocokkan token apa pun yang persis sama dengan ID klaim pada data.
  for (const tok of question.split(/[\s,;:()?!]+/)) {
    const hit = tok.length >= 6 ? byId.get(tok.toLowerCase()) : undefined;
    if (hit) found.set(hit.claim_id, hit);
  }
  if (found.size === 0 && /(klaim|kasus)\s+(teratas|tertinggi|paling\s+(kritis|berisiko|tinggi))/.test(question.toLowerCase()) && store.claims.length > 0) {
    const top = [...store.claims].sort((a, b) => b.risk_score - a.risk_score)[0];
    if (top) found.set(top.claim_id, top);
  }
  return Array.from(found.values()).slice(0, 3);
}

const claimHref = (c: CanonicalClaim) => (c.investigation_id ? `/investigations/${c.investigation_id}` : `/investigation-queue?mode=CLAIMS&search=${encodeURIComponent(c.claim_id)}`);

/** Nama provinsi yang disebut, termasuk bentuk singkat ("Jakarta" untuk "DKI Jakarta", "Yogyakarta" untuk "DI Yogyakarta"). */
function matchProvinces(q: string) {
  const strip = (n: string) => n.toLowerCase().replace(/^(dki|di|kep\.?|kepulauan)\s+/, "");
  const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const has = (t: string) => new RegExp(`(^|[^a-z])${esc(t)}($|[^a-z])`).test(q);
  const hit = INDONESIA_PROVINCES.filter((p) => {
    const full = p.name.toLowerCase();
    const short = strip(p.name);
    return has(full) || has(p.code.toLowerCase()) || (short.length >= 5 && has(short));
  });
  // "Papua" tidak boleh ikut bila yang dimaksud "Papua Barat"; "Riau" tidak boleh ikut bila "Kepulauan Riau".
  const names = (p: (typeof hit)[number]) => [p.name.toLowerCase(), strip(p.name)];
  return hit.filter((p) => !hit.some((o) => o !== p && names(o).some((on) => names(p).some((pn) => on.length > pn.length && on.includes(pn)))));
}

const BPJS_NOTE = "Rerata nasional mencakup seluruh jenis kasus: ini konteks kewajaran, bukan bukti kecurangan.";

/** Konteks dari statistik resmi BPJS 2018 (Portal Data BPJS Kesehatan, agregat rawat inap tingkat lanjut). Setiap butir dapat dikutip. */
function bpjsItems(store: DataStore, q: string, claims: CanonicalClaim[]): ContextItem[] {
  const out: ContextItem[] = [];
  const y = BPJS.LATEST_YEAR;
  const cost = BPJS.costPerAdmission(y);
  const los = BPJS.losByClass(y);
  const share = BPJS.classAdmissionShare(y);
  const oc = BPJS.outcomes(y);
  const provRefs = BPJS.provinceReference(y);
  out.push({
    id: "bpjs:national",
    kind: "AGG",
    title: `Statistik resmi BPJS ${y}`,
    text: `Sumber: Portal Data BPJS Kesehatan, agregat nasional rawat inap tingkat lanjut (RITL) ${y}. ${BPJS.totalAdmissions(y).toLocaleString("id-ID")} admisi; rerata biaya klaim per admisi ${rp(cost.total)} (kelas 1 ${rp(cost.by_class["1"])}, kelas 2 ${rp(cost.by_class["2"])}, kelas 3 ${rp(cost.by_class["3"])}); rerata lama rawat ${los.total} hari (kelas 1 ${los.by_class["1"]}, kelas 2 ${los.by_class["2"]}, kelas 3 ${los.by_class["3"]}); pangsa admisi kelas 1/2/3 = ${Math.round(share["1"] * 100)}/${Math.round(share["2"] * 100)}/${Math.round(share["3"] * 100)}%; ${provRefs.reduce((a, r) => a + r.fkrtl_count, 0).toLocaleString("id-ID")} FKRTL bekerja sama; hasil perawatan: sembuh ${(oc.pct.sehat * 100).toFixed(0)}%, meninggal ${(oc.pct.meninggal * 100).toFixed(0)}%, rujuk ${(oc.pct.rujuk * 100).toFixed(0)}%. ${BPJS_NOTE}`,
  });

  if (/(diagnosis|penyakit|terbanyak|icd|kasus)/.test(q)) {
    const top = BPJS.topDiagnoses(y).slice(0, 10);
    out.push({
      id: "bpjs:top_diagnoses",
      kind: "AGG",
      title: `10 diagnosis rawat inap terbanyak ${y}`,
      text: `Admisi RITL ${y} per diagnosis primer (BPJS): ${top.map((d, i) => `${i + 1}. ${d.code} ${d.description} (${d.admisi[y].toLocaleString("id-ID")})`).join("; ")}.`,
    });
  }

  // diagnosis yang disebut (kode ICD-10 mis. A09, A01.0, K30)
  const codes = new Set(Array.from(q.toUpperCase().matchAll(/\b([A-Z]\d{2}(?:\.\d{1,2})?)\b/g)).map((m) => m[1]).filter((c) => !/^CL/.test(c)));
  Array.from(codes)
    .slice(0, 3)
    .forEach((code) => {
      const adm = BPJS.admissionsForIcdPrefix(code, y);
      const list = BPJS.topDiagnoses(y);
      const idx = list.findIndex((d) => d.code.startsWith(BPJS.icdKey(code)));
      out.push({
        id: `bpjs:dx:${code}`,
        kind: "AGG",
        title: `Diagnosis ${code} di statistik BPJS`,
        text:
          idx >= 0
            ? `${code} ${BPJS.icdDescription(code) || ""}: peringkat ${idx + 1} dari 100 diagnosis rawat inap terbanyak ${y}, ${adm.toLocaleString("id-ID")} admisi (${((adm / BPJS.totalAdmissions(y)) * 100).toFixed(1)}% dari seluruh admisi RITL).`
            : `${code}: tidak termasuk 100 diagnosis rawat inap terbanyak ${y} pada statistik BPJS.`,
      });
    });

  // provinsi yang disebut: statistik BPJS + posisi data klaim
  const provNat = memoized("province.national", () => computeProvinceNational(store));
  matchProvinces(q)
    .slice(0, 2)
    .forEach((p) => {
      const r = provRefs.find((x) => x.code === p.code);
      const n = provNat.get(p.code);
      if (!r) return;
      out.push({
        id: `bpjs:province:${p.code}`,
        kind: "AGG",
        title: `${p.name} di statistik BPJS ${y}`,
        text: `${p.name}: ${r.participants.toLocaleString("id-ID")} peserta JKN, ${r.admission_rate_per_10k.toLocaleString("id-ID", { maximumFractionDigits: 0 })} admisi per 10.000 peserta, rerata biaya per admisi ${rp(r.cost_per_admission)} (${r.cost_index.toFixed(2)}x nasional), ${r.fkrtl_count} FKRTL bekerja sama (${r.fkrtl_per_100k} per 100 ribu peserta).${n ? ` Pada data klaim yang dianalisis: pangsa ${(n.dataset_share * 100).toFixed(1)}% (admisi nasional ${(n.national_share * 100).toFixed(1)}%)${n.cost_ratio !== null ? `, biaya klaim ${n.cost_ratio.toFixed(2)}x rerata nasional untuk campuran kelas yang sama` : ""}${n.small_sample ? "; sampel kecil (kurang dari 20 klaim), belum dapat disimpulkan" : ""}.` : ""} ${BPJS_NOTE}`,
      });
    });

  // klaim yang dibahas: posisinya terhadap rerata nasional
  claims.forEach((c) => {
    const n = BPJS.nationalContext(c);
    if (!n.cost_ref) return;
    out.push({
      id: `bpjs:claim:${c.claim_id}`,
      kind: "AGG",
      title: `Klaim ${c.claim_id} terhadap statistik BPJS`,
      text: `Tagihan ${rp(c.claim_amount)} = ${n.cost_ratio !== null ? `${n.cost_ratio.toFixed(1)}x` : "(rasio tidak tersedia)"} rerata nasional ${n.class_label.toLowerCase()} ${n.level === "INAP" ? "per admisi" : "per kunjungan"} (${rp(n.cost_ref)})${n.province_cost ? `; rerata ${n.province_name} ${rp(n.province_cost)} (${(n.province_ratio || 0).toFixed(1)}x)` : ""}${n.los_ref ? `; lama rawat ${c.service.length_of_stay} hari vs rerata kelas ${n.los_ref} hari` : ""}${n.dx ? `; diagnosis ${n.dx.code} peringkat ${n.dx.rank} nasional (${n.dx.admissions.toLocaleString("id-ID")} ${n.level === "INAP" ? "admisi" : "kunjungan"})` : "; diagnosis tidak termasuk 100 teratas nasional"}. ${BPJS_NOTE}`,
    });
  });
  return out;
}

export function claimItems(c: CanonicalClaim): ContextItem[] {
  const d = c.diagnoses.find((x) => x.is_primary) || c.diagnoses[0];
  const items: ContextItem[] = [];
  items.push({
    id: `claim:${c.claim_id}`,
    kind: "CLAIM",
    title: `Klaim ${c.claim_id}`,
    text: `Klaim ${c.claim_id} di ${c.provider.name} (${c.provider.province_code}). Diagnosis ${d?.code} ${d?.description}, severity ${d?.severity}, lama rawat ${c.service.length_of_stay} hari, DPJP ${c.service.doctor_name}. Tagihan ${rp(c.claim_amount)} vs median peer ${rp(c.approved_tariff || 0)} (selisih ${rp(c.tariff_difference || 0)}). Prosedur: ${c.procedures.map((p) => `${p.code}${p.cost ? ` (${rp(p.cost)})` : ""}`).join(", ") || "-"}. Skor risiko ${c.risk_score} (${c.risk_level}), status ${c.status}.`,
    link: { type: "CLAIM", id: c.claim_id, label: `Buka klaim ${c.claim_id}`, risk_score: c.risk_score, href: claimHref(c) },
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
      link: { type: "SIMILAR_CLAIM", id: s.claim_id, label: `Klaim mirip ${s.claim_id} (${(s.similarity_score * 100).toFixed(1)}%)`, risk_score: s.risk_score, href: `/investigation-queue?mode=CLAIMS&search=${encodeURIComponent(s.claim_id)}` },
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
  const provNationalMap = memoized("providers.national", () => computeProviderNational(store));
  const provs = store.providers.filter((p) => p.provider_id === opts.provider_id || q.includes(p.provider_id.toLowerCase()) || q.includes(p.name.toLowerCase()) || (claims.length > 0 && claims.some((c) => c.provider.provider_id === p.provider_id)));
  provs.slice(0, 3).forEach((p) =>
    add({
      id: `provider:${p.provider_id}`,
      kind: "PROVIDER",
      title: p.name,
      text: `${p.name} (${p.provider_id}, ${p.province_name}): skor risiko ${p.risk_score} (${p.risk_level}), ${p.high_risk_claims} klaim berisiko tinggi dari ${p.total_claims}, eksposur ${rp(p.potential_exposure)}, dominan ${p.dominant_risk_type}. Severity-3 ${p.peer_comparison.severity_3_rate.provider}% vs median peer ${p.peer_comparison.severity_3_rate.peer_median}%; rerata LOS ${p.peer_comparison.avg_los_days.provider} hari vs ${p.peer_comparison.avg_los_days.peer_median}; readmisi ${p.peer_comparison.readmission_rate_pct.provider}% vs ${p.peer_comparison.readmission_rate_pct.peer_median}%. Dokter berisiko: ${p.doctors.filter((d) => d.high_risk_claims_count > 0).sort((a, b) => b.risk_score - a.risk_score).slice(0, 2).map((d) => `${d.name} (skor ${d.risk_score}, ${d.high_risk_claims_count} klaim tinggi)`).join("; ") || "-"}.${(() => {
        const pn = provNationalMap.get(p.provider_id);
        return pn ? ` Biaya klaim ${pn.cost_ratio !== null ? `${pn.cost_ratio.toFixed(2)}x` : "-"} rerata nasional BPJS untuk campuran kelas yang sama${pn.small_sample ? `; baru ${pn.claims} klaim (sampel kecil, belum dapat disimpulkan)` : ""}.`  : "";
      })()}`,
      link: { type: "PROVIDER", id: p.provider_id, label: `Profil ${p.name}`, risk_score: p.risk_score, href: `/providers/${p.provider_id}` },
    })
  );

  // provinsi
  const provRisk = computeProvinceRisk(store);
  matchProvinces(q).slice(0, 2).forEach((p) => {
    const r = provRisk.find((x) => x.province_code === p.code);
    if (r)
      add({
        id: `province:${p.code}`,
        kind: "AGG",
        title: `Provinsi ${p.name}`,
        text: `${p.name}: ${r.total_claims} klaim, ${r.high_risk_claims} berisiko tinggi, eksposur ${rp(r.potential_exposure)}, dominan ${r.dominant_risk_type}, level ${r.risk_level}. Faskes teratas: ${r.top_providers.join(", ") || "-"}.`,
        link: { type: "MAP", id: p.code, label: `Peta risiko ${p.name}`, risk_score: r.total_claims > 0 ? r.risk_score : undefined, href: `/risk-intelligence?tab=peta&province=${p.code}` },
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
  if (claims.length === 0 && store.claims.length > 0) {
    const top = [...store.claims].sort((a, b) => b.risk_score - a.risk_score).slice(0, 5);
    add({
      id: "list:top_claims",
      kind: "LIST",
      title: "Klaim berisiko tertinggi",
      text: top.map((c) => `${c.claim_id} (${c.provider.name}, skor ${c.risk_score}, ${c.risk_signals.join("+")}, selisih ${rp(c.tariff_difference || 0)})`).join("; "),
      link: { type: "CLAIM", id: top[0]?.claim_id || "", label: `Klaim teratas ${top[0]?.claim_id}`, risk_score: top[0]?.risk_score || 0, href: top[0] ? claimHref(top[0]) : undefined },
    });
  }
  if (provs.length === 0 && store.providers.length > 0) {
    const top = [...store.providers].sort((a, b) => b.risk_score - a.risk_score).slice(0, 5);
    add({
      id: "list:top_providers",
      kind: "LIST",
      title: "Faskes berisiko tertinggi",
      text: top.map((p) => `${p.name} (skor ${p.risk_score}, ${p.high_risk_claims}/${p.total_claims} klaim tinggi, eksposur ${rp(p.potential_exposure)})`).join("; "),
      link: { type: "PROVIDER", id: top[0]?.provider_id || "", label: `Profil ${top[0]?.name}`, risk_score: top[0]?.risk_score || 0, href: top[0] ? `/providers/${top[0].provider_id}` : undefined },
    });
  }
  // Statistik resmi BPJS selalu tersedia sebagai pembanding; butir spesifik (provinsi, diagnosis, klaim) menyusul menurut pertanyaan.
  const bpjs = bpjsItems(store, q, claims);
  // Sisihkan slot untuk butir BPJS agar tidak terpotong oleh klaim yang banyak butirnya.
  const MAX_ITEMS = 40;
  return [...items.slice(0, Math.max(0, MAX_ITEMS - bpjs.length)), ...bpjs].filter((x, i, arr) => arr.findIndex((y) => y.id === x.id) === i);
}
