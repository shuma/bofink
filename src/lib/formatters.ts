/**
 * Format number as Swedish Krona (SEK)
 */
export function formatSEK(amount: number): string {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format number as SEK without currency symbol
 */
export function formatNumber(amount: number): string {
  return new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage with Swedish locale
 */
export function formatPercent(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat("sv-SE", {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

/**
 * Format date in Swedish format
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

/**
 * Parse Swedish formatted number string to number
 */
export function parseSEK(value: string): number {
  // Remove spaces, currency symbols, and replace comma with dot
  const cleaned = value
    .replace(/\s/g, "")
    .replace(/kr/gi, "")
    .replace(/SEK/gi, "")
    .replace(",", ".");
  return parseFloat(cleaned) || 0;
}
