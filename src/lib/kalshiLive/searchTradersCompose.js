import {
  KALSHI_LIVE_SEARCH_TRADERS_LIMIT_MAX,
  KALSHI_LIVE_SEARCH_TRADERS_QUERY_MIN_LEN,
  normalizeKalshiLiveSearchTradersLimit,
  normalizeKalshiLiveSearchTradersQuery,
} from "@/lib/kalshiLive/searchTradersColumns";

/**
 * @param {{
 *   query?: string;
 *   limit?: number;
 *   includeMetrics?: boolean;
 *   includeHoldings?: boolean;
 * }} params
 * @returns {string | null}
 */
export function validateKalshiLiveSearchTradersPull(params = {}) {
  const query = normalizeKalshiLiveSearchTradersQuery(params.query);
  if (!query) return "Enter a trader nickname to search.";
  if (query.length < KALSHI_LIVE_SEARCH_TRADERS_QUERY_MIN_LEN) {
    return `Search query must be at least ${KALSHI_LIVE_SEARCH_TRADERS_QUERY_MIN_LEN} characters.`;
  }
  if (/\s/.test(query)) {
    return "Search by a single nickname fragment (no spaces). Try a shorter prefix like “citadel”.";
  }

  const limit = normalizeKalshiLiveSearchTradersLimit(params.limit);
  if (limit < 1 || limit > KALSHI_LIVE_SEARCH_TRADERS_LIMIT_MAX) {
    return `Limit must be between 1 and ${KALSHI_LIVE_SEARCH_TRADERS_LIMIT_MAX}.`;
  }
  return null;
}

/**
 * @param {{
 *   query: string;
 *   limit: number;
 *   includeMetrics?: boolean;
 *   includeHoldings?: boolean;
 *   loadedRowCount?: number;
 *   profileCount?: number;
 * }} opts
 */
export function summarizeKalshiLiveSearchTradersRequest(opts) {
  const query = normalizeKalshiLiveSearchTradersQuery(opts.query);
  const limit = normalizeKalshiLiveSearchTradersLimit(opts.limit);
  const parts = ["GET /v1/search/social_profiles"];
  parts.push(`query=${query}`);
  parts.push(`limit=${limit}`);
  if (opts.includeMetrics) parts.push("metrics=1");
  if (opts.includeHoldings) parts.push("holdings=1");
  if (typeof opts.profileCount === "number") parts.push(`profiles=${opts.profileCount}`);
  if (typeof opts.loadedRowCount === "number") parts.push(`rows=${opts.loadedRowCount}`);
  return parts.join(" · ");
}
