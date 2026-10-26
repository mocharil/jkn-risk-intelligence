import { CanonicalClaim } from "@/types/claim";
import { DataStore } from "../data/store";

export interface GraphNode {
  id: string;
  label: string;
  type: "PROVIDER" | "DOCTOR" | "CLAIM" | "PATIENT" | "DIAGNOSIS" | "PROCEDURE";
  subtitle: string;
  risk_score?: number;
  risk_level?: string;
  cluster?: string;
  /** Hanya node klaim: ID kasus bila skor mencapai ambang antrean. */
  investigation_id?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  label: string;
  color: string;
  dashes?: boolean;
  width?: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  focus: { type: "claim" | "provider" | "overview"; id: string };
  truncated: boolean;
  stats: { claims: number; doctors: number; providers: number; flagged: number };
}

const MAX_CLAIMS = 14;
const rp = (n: number) => `Rp ${(n / 1_000_000).toFixed(1)} jt`;

/** Membangun graf provider–dokter–klaim–pasien(pseudonim)–diagnosis–tindakan dari data analisis (bukan data tetap). */
export function buildGraph(store: DataStore, opts: { claim_id?: string; provider_id?: string }): GraphData {
  const byId = new Map(store.claims.map((c) => [c.claim_id, c]));
  let focus: GraphData["focus"];
  let claims: CanonicalClaim[] = [];
  let truncated = false;

  if (opts.claim_id && byId.has(opts.claim_id)) {
    const c = byId.get(opts.claim_id)!;
    focus = { type: "claim", id: c.claim_id };
    const set = new Map<string, CanonicalClaim>([[c.claim_id, c]]);
    c.similar_claims.forEach((s) => byId.has(s.claim_id) && set.set(s.claim_id, byId.get(s.claim_id)!));
    store.claims
      .filter((x) => x.service.doctor_id === c.service.doctor_id && x.risk_score >= 75)
      .sort((a, b) => b.risk_score - a.risk_score)
      .slice(0, 8)
      .forEach((x) => set.set(x.claim_id, x));
    claims = Array.from(set.values());
  } else {
    const prov = opts.provider_id ? store.providers.find((p) => p.provider_id === opts.provider_id) : [...store.providers].sort((a, b) => b.risk_score - a.risk_score)[0];
    focus = prov ? { type: opts.provider_id ? "provider" : "overview", id: prov.provider_id } : { type: "overview", id: "" };
    const provClaims = store.claims.filter((c) => c.provider.provider_id === prov?.provider_id).sort((a, b) => b.risk_score - a.risk_score);
    truncated = provClaims.length > MAX_CLAIMS;
    claims = provClaims.slice(0, MAX_CLAIMS);
    // sertakan klaim mirip lintas faskes agar relasi antar-faskes terlihat
    claims.slice(0, 6).forEach((c) =>
      c.similar_claims.slice(0, 1).forEach((s) => {
        const o = byId.get(s.claim_id);
        if (o && !claims.includes(o)) claims.push(o);
      })
    );
  }

  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const addNode = (n: GraphNode) => {
    if (!nodes.has(n.id)) nodes.set(n.id, n);
  };
  const edgeKeys = new Set<string>();
  const addEdge = (e: GraphEdge) => {
    const k = `${e.from}>${e.to}>${e.label}`;
    if (!edgeKeys.has(k) && !edgeKeys.has(`${e.to}>${e.from}>${e.label}`)) {
      edgeKeys.add(k);
      edges.push(e);
    }
  };

  const doctorFlag = new Map<string, number>();
  claims.forEach((c) => c.risk_score >= 75 && doctorFlag.set(c.service.doctor_id, (doctorFlag.get(c.service.doctor_id) || 0) + 1));
  const clusterDoctor = Array.from(doctorFlag.entries()).sort((a, b) => b[1] - a[1])[0];
  const clusterId = clusterDoctor && clusterDoctor[1] >= 2 ? `CLUSTER-${clusterDoctor[0]}` : undefined;

  for (const c of claims) {
    const prov = store.providers.find((p) => p.provider_id === c.provider.provider_id);
    const flagged = c.risk_score >= 75;
    const inCluster = !!clusterId && flagged && c.service.doctor_id === clusterDoctor![0];
    const cluster = inCluster ? clusterId : undefined;

    addNode({ id: c.provider.provider_id, label: c.provider.name, type: "PROVIDER", subtitle: `${prov?.province_name || ""} · skor ${prov?.risk_score ?? "-"}`, risk_score: prov?.risk_score, risk_level: prov?.risk_level, cluster: cluster && prov ? cluster : undefined });
    const doc = prov?.doctors.find((d) => d.doctor_id === c.service.doctor_id);
    addNode({ id: c.service.doctor_id, label: c.service.doctor_name, type: "DOCTOR", subtitle: `DPJP · ${doc?.high_risk_claims_count ?? 0} klaim berisiko tinggi`, risk_score: doc?.risk_score, risk_level: doc ? (doc.risk_score >= 90 ? "CRITICAL" : doc.risk_score >= 75 ? "HIGH" : doc.risk_score >= 50 ? "MEDIUM" : "LOW") : undefined, cluster: inCluster ? clusterId : undefined });
    addNode({ id: c.claim_id, label: c.claim_id, type: "CLAIM", subtitle: `${rp(c.claim_amount)} · ${c.risk_signals.join("+") || "wajar"}`, risk_score: c.risk_score, risk_level: c.risk_level, cluster, investigation_id: c.investigation_id });
    addNode({ id: c.patient.patient_id, label: c.patient.patient_id, type: "PATIENT", subtitle: c.patient.age > 0 ? `Pasien (pseudonim) ${c.patient.age} th` : "Pasien (pseudonim)" });
    const dx = c.diagnoses.find((d) => d.is_primary) || c.diagnoses[0];
    if (dx) addNode({ id: `DIAG-${dx.code}`, label: `${dx.code} · ${dx.description}`, type: "DIAGNOSIS", subtitle: `Severity ${dx.severity}` });

    addEdge({ from: c.provider.provider_id, to: c.service.doctor_id, label: "DPJP", color: "#00A651" });
    addEdge({ from: c.service.doctor_id, to: c.claim_id, label: flagged ? "Menagihkan" : "Menangani", color: flagged ? "#D92D20" : "#94A3B8", dashes: flagged, width: flagged ? 2.2 : 1 });
    addEdge({ from: c.claim_id, to: c.patient.patient_id, label: "Pasien", color: "#94A3B8" });
    if (dx) {
      const up = c.risk_findings.some((f) => f.risk_type === "UPCODING");
      addEdge({ from: c.claim_id, to: `DIAG-${dx.code}`, label: up ? "Upcoding" : "Diagnosis", color: up ? "#7A5AF8" : "#CBD5E1", dashes: up, width: up ? 2 : 1 });
    }
    for (const p of c.procedures) {
      const phantom = c.risk_findings.some((f) => f.risk_type === "PHANTOM_BILLING") && /(44\.95|47\.01|45\.13)/.test(p.code);
      if (!phantom && !c.procedures.some(() => flagged)) continue; // hanya tindakan relevan risiko agar graf tetap terbaca
      if (!phantom) continue;
      addNode({ id: `PROC-${p.code}`, label: `${p.code} · ${p.description}`, type: "PROCEDURE", subtitle: "Tindakan tanpa jejak dokumen", risk_score: 90, risk_level: "CRITICAL", cluster });
      addEdge({ from: c.claim_id, to: `PROC-${p.code}`, label: "Phantom", color: "#D92D20", dashes: true, width: 2.4 });
    }
    for (const s of c.similar_claims.slice(0, 2)) {
      if (!claims.some((x) => x.claim_id === s.claim_id)) continue;
      const strong = c.risk_findings.some((f) => f.risk_type === "CLONING");
      addEdge({ from: c.claim_id, to: s.claim_id, label: `${(s.similarity_score * 100).toFixed(1)}% mirip`, color: strong ? "#D92D20" : "#F79009", dashes: true, width: strong ? 2.5 : 1.5 });
    }
  }

  return {
    nodes: Array.from(nodes.values()),
    edges,
    focus,
    truncated,
    stats: {
      claims: claims.length,
      doctors: Array.from(nodes.values()).filter((n) => n.type === "DOCTOR").length,
      providers: Array.from(nodes.values()).filter((n) => n.type === "PROVIDER").length,
      flagged: claims.filter((c) => c.risk_score >= 75).length,
    },
  };
}
