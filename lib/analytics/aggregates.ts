import { CanonicalClaim } from "@/types/claim";
import { Provider } from "@/types/provider";
import { ALL_RISK_TYPES, DashboardKPIs, EmergingSignal, ProvinceRiskData, RiskLevel, RiskType } from "@/types/risk";
import { INDONESIA_PROVINCES } from "../data/indonesia-provinces";

/**
 * Semua angka di dashboard / peta / profil faskes dihitung dari klaim hasil analisis —
 * tidak ada konstanta yang ditulis tangan.
 */

export interface AggStore {
  claims: CanonicalClaim[];
  providers: Provider[];
}

const HIGH = (c: CanonicalClaim) => c.risk_level === "CRITICAL" || c.risk_level === "HIGH";
const FLAGGED = (c: CanonicalClaim) => c.risk_score >= 50;

function levelOf(score: number): RiskLevel {
  return score >= 90 ? "CRITICAL" : score >= 75 ? "HIGH" : score >= 50 ? "MEDIUM" : "LOW";
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function mean(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

/** Skor risiko entitas (faskes/provinsi/dokter) dari proporsi klaim berisiko tinggi & rerata skor klaim terflag. */
export function entityRiskScore(claims: CanonicalClaim[]): number {
  if (!claims.length) return 0;
  const highRate = claims.filter(HIGH).length / claims.length;
  const flagged = claims.filter(FLAGGED);
  const avgFlag = mean(flagged.map((c) => c.risk_score));
  return Math.min(99, Math.round(highRate * 220 + avgFlag * 0.2));
}

function dominantType(claims: CanonicalClaim[]): RiskType {
  const counts = new Map<RiskType, number>();
  claims.forEach((c) => c.risk_findings.forEach((f) => counts.set(f.risk_type, (counts.get(f.risk_type) || 0) + 1)));
  let best: RiskType = "UPCODING";
  let n = 0;
  counts.forEach((v, k) => {
    if (v > n) {
      n = v;
      best = k;
    }
  });
  return best;
}

const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function asOfDate(claims: CanonicalClaim[]): string {
  return claims.reduce((m, c) => (c.service.submission_date > m ? c.service.submission_date : m), "1970-01-01");
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${a}T00:00:00Z`).getTime() - new Date(`${b}T00:00:00Z`).getTime()) / 86_400_000);
}

// ---------------------------------------------------------------------------
// Statistik faskes & dokter (memutakhirkan objek provider di tempat)
// ---------------------------------------------------------------------------
export function computeProviderStats(store: AggStore): void {
  const byProvider = new Map<string, CanonicalClaim[]>();
  store.claims.forEach((c) => {
    const arr = byProvider.get(c.provider.provider_id) || [];
    arr.push(c);
    byProvider.set(c.provider.provider_id, arr);
  });

  // pembanding peer: median lintas faskes yang punya klaim
  const sev3: number[] = [];
  const los: number[] = [];
  const amt: number[] = [];
  const readm: number[] = [];

  const metrics = new Map<string, { sev3: number; los: number; amt: number; readm: number }>();
  byProvider.forEach((claims, id) => {
    const sev3Rate = (claims.filter((c) => (c.diagnoses.find((d) => d.is_primary) || c.diagnoses[0])?.severity === 3).length / claims.length) * 100;
    const avgLos = mean(claims.map((c) => c.service.length_of_stay));
    const avgAmt = mean(claims.map((c) => c.claim_amount));

    // readmisi ≤30 hari: pasien (pseudonim) yang sama masuk lagi di faskes yang sama
    const byPatient = new Map<string, CanonicalClaim[]>();
    claims.forEach((c) => byPatient.set(c.patient.patient_id, [...(byPatient.get(c.patient.patient_id) || []), c]));
    let readmissions = 0;
    byPatient.forEach((list) => {
      const sorted = [...list].sort((a, b) => a.service.admission_date.localeCompare(b.service.admission_date));
      for (let i = 1; i < sorted.length; i++) if (daysBetween(sorted[i].service.admission_date, sorted[i - 1].service.discharge_date) <= 30) readmissions++;
    });
    const readmRate = (readmissions / claims.length) * 100;

    metrics.set(id, { sev3: sev3Rate, los: avgLos, amt: avgAmt, readm: readmRate });
    sev3.push(sev3Rate);
    los.push(avgLos);
    amt.push(avgAmt);
    readm.push(readmRate);
  });
  const peer = { sev3: median(sev3), los: median(los), amt: median(amt), readm: median(readm) };

  for (const p of store.providers) {
    const claims = byProvider.get(p.provider_id) || [];
    const m = metrics.get(p.provider_id);
    p.total_claims = claims.length;
    p.high_risk_claims = claims.filter(HIGH).length;
    p.potential_exposure = claims.filter(FLAGGED).reduce((a, c) => a + (c.tariff_difference || 0), 0);
    p.risk_score = entityRiskScore(claims);
    p.risk_level = levelOf(p.risk_score);
    p.dominant_risk_type = dominantType(claims);

    const counts: Record<RiskType, number> = Object.fromEntries(ALL_RISK_TYPES.map((t) => [t, 0])) as Record<RiskType, number>;
    claims.forEach((c) => c.risk_findings.forEach((f) => counts[f.risk_type]++));
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    const pct = (t: RiskType) => Number(((counts[t] / total) * 100).toFixed(1));
    p.risk_composition = {
      upcoding_pct: pct("UPCODING"),
      cloning_pct: pct("CLONING"),
      phantom_billing_pct: pct("PHANTOM_BILLING"),
      abnormal_los_pct: pct("ABNORMAL_LOS"),
      unbundling_pct: pct("UNBUNDLING"),
      inflated_bills_pct: pct("INFLATED_BILLS"),
      repeat_billing_pct: pct("REPEAT_BILLING"),
      readmission_pct: pct("READMISSION"),
    };
    if (m) {
      p.peer_comparison = {
        severity_3_rate: { provider: Number(m.sev3.toFixed(1)), peer_median: Number(peer.sev3.toFixed(1)) },
        avg_los_days: { provider: Number(m.los.toFixed(1)), peer_median: Number(peer.los.toFixed(1)) },
        avg_claim_amount: { provider: Math.round(m.amt), peer_median: Math.round(peer.amt) },
        readmission_rate_pct: { provider: Number(m.readm.toFixed(1)), peer_median: Number(peer.readm.toFixed(1)) },
      };
    }

    // tren bulanan
    const byMonth = new Map<string, CanonicalClaim[]>();
    claims.forEach((c) => {
      const k = c.service.admission_date.slice(0, 7);
      byMonth.set(k, [...(byMonth.get(k) || []), c]);
    });
    p.monthly_risk_trend = Array.from(byMonth.keys())
      .sort()
      .slice(-5)
      .map((k) => ({ month: `${MONTHS_ID[Number(k.slice(5, 7)) - 1]} ${k.slice(0, 4)}`, risk_score: entityRiskScore(byMonth.get(k)!), claim_count: byMonth.get(k)!.length }));

    // dokter
    p.doctors.forEach((d) => {
      const dc = claims.filter((c) => c.service.doctor_id === d.doctor_id);
      d.total_claims_handled = dc.length;
      d.high_risk_claims_count = dc.filter(HIGH).length;
      d.risk_score = entityRiskScore(dc);
    });
  }
}

// ---------------------------------------------------------------------------
// Peta provinsi
// ---------------------------------------------------------------------------
export function computeProvinceRisk(store: AggStore): ProvinceRiskData[] {
  return INDONESIA_PROVINCES.map((prov) => {
    const claims = store.claims.filter((c) => c.provider.province_code === prov.code);
    const score = entityRiskScore(claims);
    const provExposure = new Map<string, number>();
    claims.filter(FLAGGED).forEach((c) => provExposure.set(c.provider.name, (provExposure.get(c.provider.name) || 0) + (c.tariff_difference || 0)));
    return {
      province_code: prov.code,
      province_name: prov.name,
      island_group: prov.island,
      latitude: prov.lat,
      longitude: prov.lng,
      total_claims: claims.length,
      high_risk_claims: claims.filter(HIGH).length,
      potential_exposure: claims.filter(FLAGGED).reduce((a, c) => a + (c.tariff_difference || 0), 0),
      dominant_risk_type: dominantType(claims),
      risk_level: claims.length === 0 ? "LOW" : levelOf(score),
      top_providers: Array.from(provExposure.entries()).sort((a, b) => b[1] - a[1]).slice(0, 2).map((e) => e[0]),
    };
  });
}

// ---------------------------------------------------------------------------
// KPI dashboard
// ---------------------------------------------------------------------------
function pctChange(now: number, prev: number): number {
  if (prev === 0) return now > 0 ? 100 : 0;
  return Number((((now - prev) / prev) * 100).toFixed(1));
}

function shortDate(d: string): string {
  return `${MONTHS_ID[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8, 10))}`;
}

export function computeDashboardKPIs(store: AggStore): DashboardKPIs {
  const claims = store.claims;
  const asOf = asOfDate(claims);
  const inWindow = (c: CanonicalClaim, from: number, to: number) => {
    const age = daysBetween(asOf, c.service.submission_date);
    return age >= from && age < to;
  };
  const cur = claims.filter((c) => inWindow(c, 0, 7));
  const prev = claims.filter((c) => inWindow(c, 7, 14));
  const exposureOf = (list: CanonicalClaim[]) => list.filter(FLAGGED).reduce((a, c) => a + (c.tariff_difference || 0), 0);
  const provCount = (list: CanonicalClaim[]) => new Set(list.filter(HIGH).map((c) => c.provider.provider_id)).size;

  const highRisk = claims.filter(HIGH);
  const providersAtRisk = store.providers.filter((p) => p.risk_level === "CRITICAL" || p.risk_level === "HIGH").length;
  const totalExposure = exposureOf(claims);

  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(`${asOf}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  const risk_trends = days.map((day) => {
    const dc = claims.filter((c) => c.service.submission_date === day);
    return {
      date: shortDate(day),
      critical_count: dc.filter((c) => c.risk_level === "CRITICAL").length,
      high_count: dc.filter((c) => c.risk_level === "HIGH").length,
      medium_count: dc.filter((c) => c.risk_level === "MEDIUM").length,
      exposure_amount: exposureOf(dc),
    };
  });

  const topProviders = [...store.providers].sort((a, b) => b.potential_exposure - a.potential_exposure).slice(0, 3);
  const topProv = topProviders[0];
  const dom = dominantType(highRisk);
  const flaggedFindings = highRisk.flatMap((c) => c.risk_findings);
  const conf = mean(flaggedFindings.map((f) => f.confidence));

  const risk_by_type = ALL_RISK_TYPES.map((rt) => {
    const matchingClaims = claims.filter((c) => c.risk_findings.some((f) => f.risk_type === rt));
    const findings = matchingClaims.flatMap((c) => c.risk_findings.filter((f) => f.risk_type === rt));
    return {
      risk_type: rt,
      claim_count: matchingClaims.length,
      potential_exposure: matchingClaims.reduce((acc, c) => acc + (c.tariff_difference || 0), 0),
      avg_confidence: Number(mean(findings.map((f) => f.confidence)).toFixed(2)),
    };
  }).sort((a, b) => b.potential_exposure - a.potential_exposure || b.claim_count - a.claim_count);

  return {
    total_claims_analyzed: claims.length,
    high_risk_claims: highRisk.length,
    potential_exposure: totalExposure,
    providers_at_risk: providersAtRisk,
    trends: {
      claims_change_pct: pctChange(cur.length, prev.length),
      high_risk_change_pct: pctChange(cur.filter(HIGH).length, prev.filter(HIGH).length),
      exposure_change_pct: pctChange(exposureOf(cur), exposureOf(prev)),
      providers_change_pct: pctChange(provCount(cur), provCount(prev)),
      period: "7 hari terakhir vs 7 hari sebelumnya",
    },
    ai_briefing: {
      summary: `Arsa menganalisis ${claims.length.toLocaleString("id-ID")} klaim dan menandai ${highRisk.length} klaim berisiko tinggi dengan potensi eksposur Rp ${Math.round(totalExposure).toLocaleString("id-ID")}. Pola dominan: ${dom.replace("_", " ")}.${topProv ? ` Faskes dengan eksposur terbesar: ${topProv.name} (skor ${topProv.risk_score}).` : ""}`,
      key_findings: topProviders.map((p) => `${p.name}: ${p.high_risk_claims} klaim berisiko tinggi dari ${p.total_claims}, eksposur Rp ${Math.round(p.potential_exposure).toLocaleString("id-ID")}, dominan ${p.dominant_risk_type.replace("_", " ")}.`),
      confidence: Number(conf.toFixed(2)),
      affected_providers: providersAtRisk,
      potential_exposure: totalExposure,
      detected_at: new Date().toISOString(),
      source: "deterministic",
    },
    risk_distribution: {
      critical: claims.filter((c) => c.risk_level === "CRITICAL").length,
      high: claims.filter((c) => c.risk_level === "HIGH").length,
      medium: claims.filter((c) => c.risk_level === "MEDIUM").length,
      low: claims.filter((c) => c.risk_level === "LOW").length,
    },
    risk_trends,
    risk_by_type,
  };
}

// ---------------------------------------------------------------------------
// Sinyal emergen: lonjakan temuan per jenis risiko 14 hari terakhir vs 14 hari sebelumnya
// ---------------------------------------------------------------------------
const TYPE_TITLE: Record<RiskType, string> = {
  UPCODING: "Lonjakan Upcoding Severity Level",
  CLONING: "Duplikasi Narasi Medis Lintas Pasien",
  PHANTOM_BILLING: "Tindakan Bedah Tanpa Jejak Dokumen",
  ABNORMAL_LOS: "Lama Rawat Inap Melebihi Peer",
  UNBUNDLING: "Komponen Paket Ditagih Terpisah",
  INFLATED_BILLS: "Tagihan Melebihi Harga Acuan",
  REPEAT_BILLING: "Episode Rawat Ditagih Ganda",
  READMISSION: "Pola Rawat Ulang Dini",
};

export function computeEmergingSignals(store: AggStore): EmergingSignal[] {
  const asOf = asOfDate(store.claims);
  const signals: EmergingSignal[] = [];
  const now = Date.now();

  for (const type of ALL_RISK_TYPES) {
    const recent: CanonicalClaim[] = [];
    let prevCount = 0;
    for (const c of store.claims) {
      if (!c.risk_findings.some((f) => f.risk_type === type)) continue;
      const age = daysBetween(asOf, c.service.submission_date);
      if (age >= 0 && age < 14) recent.push(c);
      else if (age >= 14 && age < 28) prevCount++;
    }
    if (recent.length < 3) continue;
    const change = pctChange(recent.length, prevCount);
    const providers = new Set(recent.map((c) => c.provider.provider_id));
    const exposure = recent.reduce((a, c) => a + (c.tariff_difference || 0), 0);
    const confidence = mean(recent.flatMap((c) => c.risk_findings.filter((f) => f.risk_type === type).map((f) => f.confidence)));
    const top = [...recent].sort((a, b) => b.risk_score - a.risk_score).slice(0, 3);
    const severity: RiskLevel = change >= 60 || recent.length >= 25 ? "CRITICAL" : change >= 20 || recent.length >= 12 ? "HIGH" : "MEDIUM";

    signals.push({
      signal_id: `SIG-${type.slice(0, 3)}-${asOf.replace(/-/g, "")}`,
      risk_type: type,
      title: TYPE_TITLE[type],
      description: `${recent.length} klaim dengan sinyal ${type.replace("_", " ")} dalam 14 hari terakhir (${prevCount} pada 14 hari sebelumnya, ${change >= 0 ? "+" : ""}${change}%), tersebar di ${providers.size} faskes.`,
      severity,
      change_percentage: change,
      affected_providers_count: providers.size,
      potential_exposure: exposure,
      confidence: Number(confidence.toFixed(2)),
      detected_at: new Date(now - signals.length * 17 * 60_000).toISOString(),
      highlighted_claim_ids: top.map((c) => c.claim_id),
    });
  }
  return signals.sort((a, b) => b.change_percentage * Math.log10(b.potential_exposure + 10) - a.change_percentage * Math.log10(a.potential_exposure + 10)).slice(0, 4);
}
