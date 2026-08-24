/**
 * Format numbers as Indonesian Rupiah (Rp) with English compact notation
 */
export function formatRupiah(amount: number, compact: boolean = false): string {
  if (isNaN(amount)) return "Rp 0";
  
  if (compact) {
    if (Math.abs(amount) >= 1_000_000_000_000) {
      return `Rp ${(amount / 1_000_000_000_000).toLocaleString("en-US", { maximumFractionDigits: 1 })}T`;
    }
    if (Math.abs(amount) >= 1_000_000_000) {
      return `Rp ${(amount / 1_000_000_000).toLocaleString("en-US", { maximumFractionDigits: 1 })}B`;
    }
    if (Math.abs(amount) >= 1_000_000) {
      return `Rp ${(amount / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 1 })}M`;
    }
    if (Math.abs(amount) >= 1_000) {
      return `Rp ${(amount / 1_000).toLocaleString("en-US", { maximumFractionDigits: 0 })}K`;
    }
  }

  return `Rp ${Math.round(amount).toLocaleString("en-US")}`;
}

export function formatNumber(n: number): string {
  if (isNaN(n)) return "0";
  return n.toLocaleString("en-US");
}

export function formatPercent(n: number, decimals: number = 1): string {
  if (isNaN(n)) return "0%";
  return `${n.toLocaleString("en-US", { maximumFractionDigits: decimals })}%`;
}
