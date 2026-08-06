/**
 * Helpers for Market Candlesticks ticker selection meta (title + timing).
 */

/**
 * @typedef {{
 *   title?: string;
 *   status?: string;
 *   openTime?: string;
 *   closeTime?: string;
 *   seriesTicker?: string;
 * }} KalshiCandlestickTickerMetaEntry
 */

/**
 * @param {unknown} meta
 * @param {string} ticker
 * @returns {string}
 */
export function kalshiCandlestickTickerMetaTitle(meta, ticker) {
  const t = String(ticker || "").trim().toUpperCase();
  const v = meta && typeof meta === "object" ? meta[t] : null;
  if (typeof v === "string") return String(v).trim() || t;
  if (v && typeof v === "object") {
    return String(v.title || t).trim() || t;
  }
  return t;
}

/**
 * @param {unknown} meta
 * @param {string} ticker
 * @returns {KalshiCandlestickTickerMetaEntry | null}
 */
export function kalshiCandlestickTickerMetaEntry(meta, ticker) {
  const t = String(ticker || "").trim().toUpperCase();
  if (!t) return null;
  const v = meta && typeof meta === "object" ? meta[t] : null;
  if (typeof v === "string") {
    return { title: String(v).trim() || t };
  }
  if (v && typeof v === "object") {
    return {
      title: String(v.title || t).trim() || t,
      status: String(v.status || "").trim() || undefined,
      openTime: String(v.openTime || "").trim() || undefined,
      closeTime: String(v.closeTime || "").trim() || undefined,
      seriesTicker: String(v.seriesTicker || "").trim().toUpperCase() || undefined,
    };
  }
  return null;
}
