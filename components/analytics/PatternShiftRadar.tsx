"use client";

import React from "react";
import Link from "next/link";
import { ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, Legend, LineChart, Line, ReferenceLine, XAxis, YAxis } from "recharts";

export interface PatternShift {
  risk_type: string;
  recent: number;
  previous: number;
  change_percentage: number | null;
  exposure_recent: number;
  significant: boolean;
}

/** Deret harian 28 hari per jenis temuan (urut lama ke baru), dari field pattern_detail API dashboard. */
export type PatternDaily = Record<string, number[]>;

const TYPE_SHORT: Record<string, string> = {
  UPCODING: "Upcoding",
  CLONING: "Cloning",
  PHANTOM_BILLING: "Phantom billing",
  ABNORMAL_LOS: "LOS anomali",
  UNBUNDLING: "Unbundling",
  INFLATED_BILLS: "Inflasi tagihan",
  REPEAT_BILLING: "Tagihan berulang",
  READMISSION: "Rawat ulang dini",
};

const tooltipStyle = { backgroundColor: "#FFFFFF", borderRadius: 8, border: "1px solid #D5E0DA", fontSize: 12 };

/** Radar 14 hari terakhir vs 14 hari sebelumnya per jenis temuan, dengan daftar perubahan di bawahnya. */
export const PatternShiftRadar: React.FC<{ shifts: PatternShift[]; height?: number; showList?: boolean; split?: boolean; daily?: PatternDaily }> = ({ shifts, height = 280, showList = true, split = false, daily }) => {
  const data = Object.keys(TYPE_SHORT).map((k) => {
    const t = shifts.find((x) => x.risk_type === k);
    return { type: k, label: TYPE_SHORT[k], recent: t?.recent ?? 0, previous: t?.previous ?? 0, change: t?.change_percentage ?? null, significant: !!t?.significant };
  });

  return (
    <div className={split ? "grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-6 items-center" : ""}>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="66%" margin={{ top: 8, right: 36, bottom: 8, left: 36 }}>
            <PolarGrid stroke="#E4ECE8" />
            <PolarAngleAxis dataKey="label" tick={{ fontSize: 11, fill: "#61756D" }} />
            <PolarRadiusAxis angle={90} tick={false} axisLine={false} domain={[0, "dataMax"]} />
            <Radar name="14 hari sebelumnya" dataKey="previous" stroke="#94A3B8" fill="#94A3B8" fillOpacity={0.12} strokeWidth={1.25} strokeDasharray="4 3" />
            <Radar name="14 hari terakhir" dataKey="recent" stroke="#007A3A" fill="#007A3A" fillOpacity={0.22} strokeWidth={1.75} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [`${v} klaim`, n]} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      {showList && (
        <div>
          {split && (
            <div className="grid grid-cols-[minmax(0,1fr)_132px_104px] gap-3 pb-2 text-[11px] text-jkn-dim border-b border-jkn-divider">
              <span>Jenis temuan</span>
              <span>28 hari</span>
              <span className="text-right">Perubahan</span>
            </div>
          )}
          <ul className={split ? "text-sm tabular-nums" : "mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm tabular-nums"}>
            {data.map((d) => {
              const series = daily?.[d.type];
              const max = Math.max(1, ...Object.values(daily ?? {}).flat());
              const up = d.recent > d.previous;
              const tone = up ? "#B91C1C" : "#007A3A";
              return (
                <li key={d.type}>
                  <Link
                    href={`/investigation-queue?risk_type=${d.type}`}
                    className={`grid items-center gap-3 rounded-lg transition-colors hover:bg-frame/70 ${split ? "py-1.5 px-1 -mx-1 grid-cols-[minmax(0,1fr)_132px_104px]" : "grid-cols-[minmax(0,1fr)_auto]"}`}
                  >
                    <span className="text-jkn-text truncate">{d.label}</span>
                    {split && series && (
                      <span className="h-8 block" aria-hidden title="Garis putus-putus memisahkan dua periode 14 hari">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={series.map((v, i) => ({ i, v }))} margin={{ top: 4, right: 5, bottom: 4, left: 2 }}>
                            <XAxis dataKey="i" type="number" domain={[0, series.length - 1]} hide />
                            <YAxis hide domain={[0, max]} />
                            <ReferenceLine x={(series.length - 1) / 2} stroke="#D5E0DA" strokeDasharray="2 3" />
                            <Line
                              type="monotone"
                              dataKey="v"
                              stroke={tone}
                              strokeWidth={1.6}
                              strokeLinecap="round"
                              isAnimationActive={false}
                              dot={(p: { cx?: number; cy?: number; index?: number }) =>
                                p.index === series.length - 1 && p.cx !== undefined && p.cy !== undefined ? (
                                  <circle key="end" cx={p.cx} cy={p.cy} r={2.5} fill={tone} />
                                ) : (
                                  <g key={`d${p.index}`} />
                                )
                              }
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </span>
                    )}
                    <span className="text-xs text-right whitespace-nowrap">
                      <span className="text-jkn-dim">{d.previous}</span>
                      <span className="text-jkn-dim mx-1" aria-hidden>
                        →
                      </span>
                      <span className="font-semibold text-jkn-text">{d.recent}</span>
                      <span className={`ml-2 inline-block min-w-[44px] ${up ? "text-risk-critical font-medium" : d.recent < d.previous ? "text-bpjs-dark font-medium" : "text-jkn-dim"}`}>
                        {d.change === null ? (d.recent > 0 ? "baru" : "-") : d.change === 0 ? "stabil" : `${d.change > 0 ? "+" : ""}${d.change.toLocaleString("id-ID")}%`}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
