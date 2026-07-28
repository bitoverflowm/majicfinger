/** @typedef {{ name: string; type: string; description: string; label?: string }} KalshiLiveSearchTradersColumn */

/** Search page size maps to API `limit` / PageSize (max 100). */
export const KALSHI_LIVE_SEARCH_TRADERS_PAGE_SIZE_MAX = 100;

/** Refine row-limit = max trader profiles to return from search. */
export const KALSHI_LIVE_SEARCH_TRADERS_LIMIT_DEFAULT = 25;
export const KALSHI_LIVE_SEARCH_TRADERS_LIMIT_MAX = 500;

/** Max holdings rows fetched per trader when enrichment is on. */
export const KALSHI_LIVE_SEARCH_TRADERS_HOLDINGS_PER_TRADER_MAX = 100;

/** Min nickname query length accepted by upstream. */
export const KALSHI_LIVE_SEARCH_TRADERS_QUERY_MIN_LEN = 2;

export const KALSHI_LIVE_SEARCH_TRADERS_BASE_COLUMNS = [
  { name: "nickname", type: "string", description: "Trader nickname from search" },
  {
    name: "profile_image_path",
    type: "string",
    description: "Profile image path / key",
    label: "profile image",
  },
];

export const KALSHI_LIVE_SEARCH_TRADERS_METRICS_COLUMNS = [
  { name: "volume", type: "number", description: "Shared trading volume (contracts)" },
  { name: "volume_fp", type: "string", description: "Volume as fixed-point string" },
  { name: "pnl", type: "number", description: "Shared profit and loss when public" },
  {
    name: "dollars_traded",
    type: "number",
    description: "Shared dollar volume traded when public",
    label: "dollars traded",
  },
  {
    name: "open_interest",
    type: "number",
    description: "Shared open interest when public",
    label: "open interest",
  },
  {
    name: "open_interest_fp",
    type: "string",
    description: "Open interest as fixed-point string",
    label: "open interest fp",
  },
  {
    name: "num_markets_traded",
    type: "int",
    description: "Number of markets traded when public",
    label: "markets traded",
  },
  {
    name: "metrics_social_id",
    type: "string",
    description: "Social id returned with metrics",
    label: "metrics social id",
  },
];

export const KALSHI_LIVE_SEARCH_TRADERS_HOLDINGS_COLUMNS = [
  {
    name: "holdings_visibility_state",
    type: "string",
    description: "Whether holdings are visible or hidden for this trader",
    label: "holdings visibility",
  },
  {
    name: "holdings_social_id",
    type: "string",
    description: "Social id returned with holdings",
    label: "holdings social id",
  },
  {
    name: "closed_positions",
    type: "boolean",
    description: "Whether closed positions were requested",
    label: "closed positions",
  },
  { name: "event_ticker", type: "string", description: "Event ticker for the holding" },
  { name: "series_ticker", type: "string", description: "Series ticker for the holding" },
  {
    name: "total_absolute_position",
    type: "number",
    description: "Absolute position size at event level",
    label: "event position",
  },
  {
    name: "total_absolute_position_fp",
    type: "string",
    description: "Event position as fixed-point string",
    label: "event position fp",
  },
  { name: "market_id", type: "string", description: "Market id for the position" },
  { name: "market_ticker", type: "string", description: "Market ticker for the position" },
  {
    name: "signed_open_position",
    type: "number",
    description: "Signed position size on the market",
    label: "position",
  },
  {
    name: "signed_open_position_fp",
    type: "string",
    description: "Signed position as fixed-point string",
    label: "position fp",
  },
  {
    name: "holding_pnl",
    type: "number",
    description: "PnL on this market holding when present",
    label: "holding pnl",
  },
];

/**
 * @param {{ includeMetrics?: boolean; includeHoldings?: boolean }} [opts]
 * @returns {KalshiLiveSearchTradersColumn[]}
 */
export function getKalshiLiveSearchTradersColumns(opts = {}) {
  /** @type {KalshiLiveSearchTradersColumn[]} */
  const cols = [...KALSHI_LIVE_SEARCH_TRADERS_BASE_COLUMNS];
  if (opts.includeMetrics) cols.push(...KALSHI_LIVE_SEARCH_TRADERS_METRICS_COLUMNS);
  if (opts.includeHoldings) cols.push(...KALSHI_LIVE_SEARCH_TRADERS_HOLDINGS_COLUMNS);
  return cols;
}

/** All columns (for Where/Sort pickers). */
export const KALSHI_LIVE_SEARCH_TRADERS_COLUMNS = getKalshiLiveSearchTradersColumns({
  includeMetrics: true,
  includeHoldings: true,
});

/** @param {KalshiLiveSearchTradersColumn | string} col */
export function getKalshiLiveSearchTradersColumnLabel(col) {
  const name = typeof col === "string" ? col : col.name;
  const fromCol = typeof col === "object" && col.label ? col.label : null;
  return fromCol || name;
}

/**
 * Compact display for suggestion / sheet metric values.
 * @param {unknown} n
 * @returns {string | null}
 */
export function formatKalshiLiveTraderMetricCompact(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  const sign = v < 0 ? "-" : "";
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${Math.round(abs)}`;
}

/**
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeKalshiLiveSearchTradersQuery(raw) {
  return String(raw || "").trim();
}

/**
 * @param {unknown} raw
 * @returns {number}
 */
export function normalizeKalshiLiveSearchTradersLimit(raw) {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 1) return KALSHI_LIVE_SEARCH_TRADERS_LIMIT_DEFAULT;
  return Math.min(KALSHI_LIVE_SEARCH_TRADERS_LIMIT_MAX, n);
}
