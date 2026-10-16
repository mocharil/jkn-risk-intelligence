"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/**
 * Shared pagination footer for list/table/grid pages. Renders nothing when
 * everything fits on one page.
 */
export const Pagination: React.FC<PaginationProps> = ({ page, pageSize, total, onPageChange, className }) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 tabular-nums ${className || ""}`}>
      <span className="text-xs text-jkn-muted">
        Menampilkan <strong className="font-semibold text-jkn-text">{from}–{to}</strong> dari <strong className="font-semibold text-jkn-text">{total}</strong> data
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          aria-label="Halaman sebelumnya"
          disabled={page <= 1}
          className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-jkn-border bg-white text-jkn-muted hover:bg-surface-secondary hover:text-jkn-text disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        {pages.map((p, idx) =>
          p === "..." ? (
            <span key={`ellipsis-${idx}`} className="px-1.5 text-jkn-dim text-xs select-none">
              …
            </span>
          ) : (
            <button
              type="button"
              key={p}
              aria-label={`Halaman ${p}`}
              aria-current={p === page ? "page" : undefined}
              onClick={() => onPageChange(p)}
              className={`min-w-[32px] h-8 px-2 rounded-md text-xs font-semibold transition-colors ${
                p === page
                  ? "bg-bpjs text-white border border-bpjs"
                  : "border border-transparent text-jkn-muted hover:bg-surface-secondary hover:text-jkn-text"
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          aria-label="Halaman berikutnya"
          disabled={page >= totalPages}
          className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-jkn-border bg-white text-jkn-muted hover:bg-surface-secondary hover:text-jkn-text disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
