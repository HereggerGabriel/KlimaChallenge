/**
 * Distance for display: at most two decimals, no trailing zeros, no
 * floating-point noise from sums (0.1 + 0.2 -> "0.3", 227.39999 -> "227.4").
 */
export function formatKm(km: number): string {
  if (!Number.isFinite(km)) return "0";
  return String(Math.round(km * 100) / 100);
}
