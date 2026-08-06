/**
 * @typedef {{
 *   enabled: true;
 *   integration: string;
 *   endpoint: string;
 *   eventTicker?: string;
 *   seriesTicker?: string;
 *   marketTickers?: string[];
 *   periodInterval: number;
 *   pollIntervalMs: number;
 *   marketsMetadataSheetId?: string;
 *   marketCount?: number;
 *   updatedAt: string;
 * }} ProjectLiveFeedSource
 */

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
function normalizeTickers(raw) {
  if (Array.isArray(raw)) {
    return [
      ...new Set(
        raw.map((t) => String(t || "").trim().toUpperCase()).filter(Boolean),
      ),
    ];
  }
  const single = String(raw || "").trim().toUpperCase();
  return single ? [single] : [];
}

/**
 * @param {unknown} raw
 * @returns {ProjectLiveFeedSource | null}
 */
export function sanitizeProjectLiveFeedSource(raw) {
  if (!raw || typeof raw !== "object") return null;
  const integration = String(raw.integration || "").trim();
  const endpoint = String(raw.endpoint || "").trim();
  if (!integration || !endpoint) return null;

  const periodInterval = Math.floor(Number(raw.periodInterval)) || 1;
  const pollIntervalMs = Math.floor(Number(raw.pollIntervalMs)) || 60_000;
  const base = {
    enabled: /** @type {const} */ (true),
    integration,
    endpoint,
    periodInterval: [1, 60, 1440].includes(periodInterval) ? periodInterval : 1,
    pollIntervalMs: Math.max(15_000, pollIntervalMs),
    marketsMetadataSheetId: String(raw.marketsMetadataSheetId || "").trim() || undefined,
    marketCount: Math.max(0, Math.floor(Number(raw.marketCount)) || 0) || undefined,
    updatedAt: String(raw.updatedAt || "").trim() || new Date().toISOString(),
  };

  if (endpoint === "event_candlesticks") {
    const eventTicker = String(raw.eventTicker || "").trim().toUpperCase();
    const seriesTicker = String(raw.seriesTicker || "").trim().toUpperCase();
    if (!eventTicker || !seriesTicker) return null;
    return { ...base, eventTicker, seriesTicker };
  }

  if (endpoint === "candlesticks") {
    const marketTickers = normalizeTickers(raw.marketTickers);
    if (!marketTickers.length) return null;
    return {
      ...base,
      marketTickers,
      marketCount: base.marketCount || marketTickers.length,
    };
  }

  return null;
}
