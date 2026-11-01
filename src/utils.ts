/**
 * Formats a given USD price to Ethiopian Birr (ETB) with realistic premium restaurant scaling.
 * Approximate conversion: 1 USD = 60 ETB (with clean integer rounding for readable menu items).
 */
export function formatETB(usdPrice: number): string {
  const etbValue = Math.round(usdPrice * 60);
  return `${etbValue.toLocaleString()} ETB`;
}
