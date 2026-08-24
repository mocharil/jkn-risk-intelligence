"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface RetroGridProps {
  className?: string;
  angle?: number;
}

export const RetroGrid: React.FC<RetroGridProps> = ({
  className,
  angle = 65,
}) => {
  return (
    <div
      className={cn(
        "pointer-events-none absolute size-full overflow-hidden opacity-50 [perspective:200px]",
        className
      )}
      style={{ "--grid-angle": `${angle}deg` } as React.CSSProperties}
    >
      {/* Grid */}
      <div className="absolute inset-0 [transform:rotateX(var(--grid-angle))]">
        <div
          className={cn(
            "animate-retro-grid",
            "[background-repeat:repeat] [background-size:60px_60px] [height:300vh] [inset:0%_0px] [margin-left:-50%] [transform-origin:100%_0_0] [width:600vw]",
            "[background-image:linear-gradient(to_right,rgba(16,185,129,0.2)_1px,transparent_0),linear-gradient(to_bottom,rgba(16,185,129,0.2)_1px,transparent_0)]"
          )}
        />
      </div>

      {/* Background Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#070B14] via-transparent to-transparent" />
    </div>
  );
};
