/**
 * Format numbers as Indonesian Rupiah (Rp) with standard Indonesian financial compact notation (T, M, Jt, Rb)
 */
export function formatRupiah(amount: number, compact: boolean = false): string {
  if (isNaN(amount)) return "Rp 0";
  
  if (compact) {
    if (Math.abs(amount) >= 1_000_000_000_000) {
      return `Rp ${(amount / 1_000_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} T`;
    }
    if (Math.abs(amount) >= 1_000_000_000) {
      return `Rp ${(amount / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} M`;
    }
    if (Math.abs(amount) >= 1_000_000) {
      return `Rp ${(amount / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} Jt`;
    }
    if (Math.abs(amount) >= 1_000) {
      return `Rp ${(amount / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 0 })} Rb`;
    }
  }

  return `Rp ${Math.round(amount).toLocaleString("id-ID")}`;
}

export function formatNumber(n: number): string {
  if (isNaN(n)) return "0";
  return n.toLocaleString("id-ID");
}

export function formatPercent(n: number, decimals: number = 1): string {
  if (isNaN(n)) return "0%";
  return `${n.toLocaleString("id-ID", { maximumFractionDigits: decimals })}%`;
}
