"use client";

import React, { useEffect, useRef, useState } from "react";
import { Network, DataSet } from "vis-network/standalone";
import { Building2, Stethoscope, User, FileText, Activity, Layers, X, ZoomIn, ZoomOut, RefreshCw, ArrowRight } from "lucide-react";
import { formatRupiah } from "@/lib/formatting/currency";
import { RiskPill } from "../ui/RiskPill";
import Link from "next/link";
import type { GraphData, GraphNode, GraphEdge } from "@/lib/analytics/graph";

interface VisNetworkGraphProps {
  claimId?: string;
  providerId?: string;
  className?: string;
}

type NodeData = GraphNode;

export const VisNetworkGraph: React.FC<VisNetworkGraphProps> = ({
  claimId,
  providerId,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("ALL");

  const [graph, setGraph] = useState<GraphData | null>(null);
  const [error, setError] = useState("");
  const rawNodes: NodeData[] = graph?.nodes || [];
  const rawEdges: GraphEdge[] = graph?.edges || [];

  // Graf dibangun server dari data analisis (faskes-dokter-klaim-pasien-diagnosis-tindakan), bukan data tetap.
  useEffect(() => {
    const qs = new URLSearchParams();
    if (claimId) qs.set("claim_id", claimId);
    if (providerId) qs.set("provider_id", providerId);
    setGraph(null);
    setError("");
    fetch(`/api/graph?${qs}`)
      .then((r) => r.json())
      .then((j) => (j.data ? setGraph(j.data) : setError(j.error || "Gagal memuat graf")))
      .catch(() => setError("Gagal memuat graf"));
  }, [claimId, providerId]);

  const getNodeColor = (type: string, risk_level?: string) => {
    switch (type) {
      case "PROVIDER":
        return { background: "#00A651", border: "#08783E", highlight: { background: "#08783E", border: "#00A651" } };
      case "DOCTOR":
        return { background: "#08783E", border: "#055029", highlight: { background: "#055029", border: "#00A651" } };
      case "CLAIM":
        return risk_level === "CRITICAL"
          ? { background: "#D92D20", border: "#B42318", highlight: { background: "#B42318", border: "#D92D20" } }
          : { background: "#1689C8", border: "#0E7090", highlight: { background: "#0E7090", border: "#1689C8" } };
      case "PATIENT":
        return { background: "#475467", border: "#344054", highlight: { background: "#344054", border: "#475467" } };
      case "DIAGNOSIS":
        return { background: "#7A5AF8", border: "#6938EF", highlight: { background: "#6938EF", border: "#7A5AF8" } };
      case "PROCEDURE":
        return { background: "#F04438", border: "#D92D20", highlight: { background: "#D92D20", border: "#F04438" } };
      default:
        return { background: "#00A651", border: "#08783E", highlight: { background: "#08783E", border: "#00A651" } };
    }
  };

  const getNodeShape = (type: string) => {
    switch (type) {
      case "PROVIDER":
        return "box";
      case "DOCTOR":
        return "ellipse";
      case "CLAIM":
        return "box";
      case "PATIENT":
        return "dot";
      case "DIAGNOSIS":
        return "diamond";
      case "PROCEDURE":
        return "triangle";
      default:
        return "dot";
    }
  };

  useEffect(() => {
    if (!containerRef.current || !graph) return;

    const filteredNodes = activeFilter === "CLUSTER_ONLY"
      ? rawNodes.filter((n) => !!n.cluster)
      : rawNodes;

    const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));

    const filteredEdges = rawEdges.filter(
      (e) => filteredNodeIds.has(e.from) && filteredNodeIds.has(e.to)
    );

    const visNodes = new DataSet(
      filteredNodes.map((n) => ({
        id: n.id,
        label: n.label,
        shape: getNodeShape(n.type),
        color: getNodeColor(n.type, n.risk_level),
        font: { color: "#FFFFFF", size: 12, face: "Inter, sans-serif", bold: { color: "#FFFFFF" } },
        margin: { top: 8, right: 12, bottom: 8, left: 12 },
        shadow: { enabled: true, color: "rgba(0,0,0,0.15)", size: 6, x: 2, y: 2 },
      }))
    );

    const visEdges = new DataSet(
      filteredEdges.map((e, idx) => ({
        id: idx,
        from: e.from,
        to: e.to,
        label: e.label,
        font: { size: 9, color: e.dashes ? "#D92D20" : "#64748B", strokeWidth: 2, strokeColor: "#FFFFFF", align: "middle" },
        color: { color: e.color || "#CBD5E1", highlight: "#00A651" },
        dashes: e.dashes || false,
        width: e.width || 1.5,
        arrows: { to: { enabled: true, scaleFactor: 0.6 } },
        smooth: { type: "continuous", roundness: 0.2 },
      }))
    );

    const options: any = {
      nodes: {
        borderWidth: 2,
        borderWidthSelected: 4,
      },
      edges: {
        arrows: { to: { enabled: true } },
      },
      physics: {
        solver: "forceAtlas2Based",
        forceAtlas2Based: {
          gravitationalConstant: -70,
          centralGravity: 0.015,
          springLength: 120,
          springConstant: 0.08,
          damping: 0.4,
        },
        stabilization: { iterations: 120 },
      },
      interaction: {
        hover: true,
        tooltipDelay: 100,
        zoomView: true,
        dragView: true,
      },
    };

    const network = new Network(containerRef.current, { nodes: visNodes as any, edges: visEdges as any }, options);
    networkRef.current = network;

    network.on("click", (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const found = rawNodes.find((n) => n.id === nodeId);
        setSelectedNode(found || null);
      } else {
        setSelectedNode(null);
      }
    });

    return () => {
      network.destroy();
    };
  }, [activeFilter, graph]);

  const handleZoomIn = () => {
    if (!networkRef.current) return;
    const scale = networkRef.current.getScale();
    (networkRef.current as any).moveTo({ scale: scale * 1.25, animation: { duration: 300, easingFunction: "easeInOutQuad" } });
  };

  const handleZoomOut = () => {
    if (!networkRef.current) return;
    const scale = networkRef.current.getScale();
    (networkRef.current as any).moveTo({ scale: scale * 0.8, animation: { duration: 300, easingFunction: "easeInOutQuad" } });
  };

  const handleFit = () => {
    if (!networkRef.current) return;
    (networkRef.current as any).fit({ animation: { duration: 400, easingFunction: "easeInOutQuad" } });
  };

  return (
    <div className={`relative bg-surface rounded-xl border border-jkn-border p-4 shadow-subtle overflow-hidden flex flex-col ${className || ""}`}>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 border-b border-jkn-divider pb-2.5">
        <div>
          <h3 className="text-xs font-bold text-jkn-text uppercase tracking-wider flex items-center gap-2">
            <span>Graf Relasi Entitas{graph?.nodes.find((n) => n.cluster)?.cluster ? ` · ${graph.nodes.find((n) => n.cluster)?.cluster}` : ""}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-risk-critical-bg text-risk-critical border border-risk-critical-border font-bold uppercase">
              {graph ? `${graph.stats.flagged} klaim berisiko tinggi` : "memuat…"}
            </span>
          </h3>
          <p className="text-[11px] text-jkn-muted mt-0.5">
            Relasi dokter DPJP, faskes, klaim anomali, pasien (pseudonim), diagnosis, dan tindakan tanpa jejak dokumen, dibangun dari data analisis.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-[10px] text-jkn-dim bg-surface-secondary px-3 py-1.5 rounded-lg border border-jkn-border flex-wrap">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-bpjs" />
            <span>Faskes</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-bpjs-deep" />
            <span>Dokter</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-risk-critical" />
            <span>Klaim</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-intel" />
            <span>Diagnosis</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-amber-600" />
            <span>Tindakan</span>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex items-center justify-between gap-2 mb-2 text-xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveFilter("ALL")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
              activeFilter === "ALL"
                ? "bg-bpjs text-white border-bpjs shadow-xs"
                : "bg-surface-secondary text-jkn-text border-jkn-border hover:bg-bpjs-soft"
            }`}
          >
            Semua entitas ({rawNodes.length})
          </button>
          <button
            onClick={() => setActiveFilter("CLUSTER_ONLY")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
              activeFilter === "CLUSTER_ONLY"
                ? "bg-risk-critical text-white border-risk-critical shadow-xs"
                : "bg-surface-secondary text-jkn-text border-jkn-border hover:bg-risk-critical-bg"
            }`}
          >
            Fokus klaster anomali
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg bg-surface-secondary border border-jkn-border hover:bg-white text-jkn-text"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg bg-surface-secondary border border-jkn-border hover:bg-white text-jkn-text"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleFit}
            className="p-1.5 rounded-lg bg-surface-secondary border border-jkn-border hover:bg-white text-jkn-text"
            title="Reset Viewport"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Network Canvas Container */}
      <div className="relative w-full h-[420px] bg-gradient-to-b from-[#F2F8F5]/50 to-white rounded-xl border border-jkn-divider overflow-hidden shadow-inner">
        <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
        {!graph && !error && <div className="absolute inset-0 flex items-center justify-center text-xs text-jkn-muted">Membangun graf dari data…</div>}
        {error && <div className="absolute inset-0 flex items-center justify-center text-xs text-risk-critical">{error}</div>}

        {/* Selected Node Inspector Drawer */}
        {selectedNode && (
          <div className="absolute bottom-3 right-3 left-3 md:left-auto md:w-80 bg-white/95 backdrop-blur-md border border-bpjs-border rounded-xl p-4 shadow-elevated z-10 animate-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-jkn-divider">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-bpjs-soft text-bpjs-dark font-bold">
                  {selectedNode.type === "PROVIDER" && <Building2 className="w-4 h-4" />}
                  {selectedNode.type === "DOCTOR" && <Stethoscope className="w-4 h-4" />}
                  {selectedNode.type === "CLAIM" && <FileText className="w-4 h-4" />}
                  {selectedNode.type === "PATIENT" && <User className="w-4 h-4" />}
                  {selectedNode.type === "DIAGNOSIS" && <Activity className="w-4 h-4" />}
                  {selectedNode.type === "PROCEDURE" && <Layers className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-jkn-text">{selectedNode.label}</h4>
                  <p className="text-[10px] text-jkn-muted">{selectedNode.subtitle}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-jkn-dim hover:text-jkn-text p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-2.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-jkn-muted">Jenis entitas:</span>
                <span className="font-semibold text-jkn-text">{selectedNode.type}</span>
              </div>
              {selectedNode.risk_score && (
                <div className="flex items-center justify-between">
                  <span className="text-jkn-muted">Skor risiko:</span>
                  <RiskPill score={selectedNode.risk_score} level={selectedNode.risk_level as any} size="sm" />
                </div>
              )}
              {selectedNode.cluster && (
                <div className="flex items-center justify-between">
                  <span className="text-jkn-muted">Klaster:</span>
                  <span className="font-bold text-risk-critical">{selectedNode.cluster}</span>
                </div>
              )}
            </div>

            {selectedNode.type === "CLAIM" && (
              <Link
                href={`/investigations/INV-2026-${selectedNode.id.replace(/\D/g, "").padStart(6, "0")}`}
                className="w-full mt-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-bpjs text-white text-xs font-bold hover:bg-bpjs-deep transition-all shadow-xs"
              >
                <span>Buka investigasi</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
