"use client";

import React, { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { BorderBeam } from "./border-beam";

export const BentoGrid = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[22rem] grid-cols-1 md:grid-cols-3 gap-4",
        className
      )}
    >
      {children}
    </div>
  );
};

export const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  badge,
  badgeColor,
  featured = false,
}: {
  name: string;
  className?: string;
  background?: ReactNode;
  Icon?: any;
  description: string;
  href?: string;
  cta?: string;
  badge?: string;
  badgeColor?: string;
  featured?: boolean;
}) => (
  <div
    key={name}
    className={cn(
      "group relative col-span-1 flex flex-col justify-between overflow-hidden rounded-2xl",
      // obsidian glass container
      "bg-[#0D1322]/80 border border-emerald-500/20 backdrop-blur-md",
      "p-6 transition-all duration-300 hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] hover:-translate-y-1",
      className
    )}
  >
    {featured && (
      <BorderBeam
        size={300}
        duration={10}
        colorFrom="#10B981"
        colorTo="#06B6D4"
      />
    )}

    {/* Background visual container */}
    <div className="absolute inset-0 z-0 opacity-40 group-hover:opacity-70 transition-opacity">
      {background}
    </div>

    {/* Top Header & Icon */}
    <div className="relative z-10 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        {Icon && (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 group-hover:bg-emerald-500/20 group-hover:scale-110 transition-all">
            <Icon className="w-5 h-5" />
          </div>
        )}
        {badge && (
          <span
            className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
              badgeColor || "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
            )}
          >
            {badge}
          </span>
        )}
      </div>
    </div>

    {/* Content & CTA */}
    <div className="relative z-10 flex flex-col gap-2 pointer-events-none mt-auto">
      <h3 className="text-lg font-bold text-white tracking-tight group-hover:text-emerald-400 transition-colors">
        {name}
      </h3>
      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
        {description}
      </p>

      {cta && (
        <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform">
          <span>{cta}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      )}
    </div>
  </div>
);
