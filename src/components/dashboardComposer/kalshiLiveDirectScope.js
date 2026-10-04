/** One-off Kalshi Live market endpoints. These are not the markets join. */

export const KALSHI_LIVE_DIRECT_TABLES = ["series", "candlesticks", "trades", "orderbook"];

const DAY = 24 * 60 * 60;

export function isKalshiLiveDirectTable(tableId) {
  return KALSHI_LIVE_DIRECT_TABLES.includes(tableId);
}

export function defaultKalshiLiveDirectQuery(tableId, now = Date.now()) {
  const maxTs = Math.floor(now / 1000);
  return {
    mode: "tickers",
    minTs: maxTs - DAY,
    maxTs,
    period: tableId === "candlesticks" ? 60 : 1,
    depth: 20,
    category: "",
    tag: "",
    includeProductMetadata: false,
    minUpdatedTs: "",
    sheetMode: "combined",
  };
}

export function directMarketTickers(picks) {
  const seen = new Set();
  const markets = [];
  for (const pick of picks || []) {
    const fromRows = (pick?.rows || []).map((row) => String(row?.ticker || "").trim()).filter(Boolean);
    const list = fromRows.length ? fromRows : pick?.kind === "market" && pick.ticker ? [String(pick.ticker).trim()] : [];
    for (const ticker of list) {
      if (!ticker || seen.has(ticker)) continue;
      seen.add(ticker);
      markets.push({
        ticker,
        label: ticker,
        title: String(pick?.title || ticker),
      });
    }
  }
  return markets;
}

export function directSeriesTickers(picks) {
  const seen = new Set();
  const tickers = [];
  for (const pick of picks || []) {
    if (pick?.kind !== "series") continue;
    const ticker = String(pick.ticker || "").trim();
    if (!ticker || seen.has(ticker)) continue;
    seen.add(ticker);
    tickers.push(ticker);
  }
  return tickers;
}

/** First selected category. The series list endpoint takes one category. */
export function seriesDiscoveryCategory(filters) {
  const include = filters?.category?.include;
  if (!Array.isArray(include)) return "";
  return String(include.find((value) => String(value || "").trim()) || "").trim();
}

/** Unix seconds for "last updated after", or "" when unset. */
export function seriesUpdatedAfter(filters) {
  const raw = Number(filters?.last_updated_ts?.minUpdatedTs);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : "";
}

/**
 * Category first, then the discover "last updated after" time, then the other columns.
 * @param {Array<{ id: string, title?: string, type?: string, description?: string }>} columns
 * @param {string[]} categories
 * @param {{ loading?: boolean }} [opts]
 */
export function kalshiLiveSeriesAttributeColumns(columns, categories = [], opts = {}) {
  const list = Array.isArray(columns) ? columns : [];
  const byId = new Map(list.map((column) => [column.id, column]));
  const category = {
    ...(byId.get("category") || { id: "category", type: "text", title: "Category" }),
    title: "Category",
    control: "category",
    enumLoading: Boolean(opts.loading),
    enumOptions: (categories || []).map((name) => [name, name]),
  };
  const updated = {
    ...(byId.get("last_updated_ts") || { id: "last_updated_ts", type: "date", title: "Last updated after" }),
    title: "Last updated after",
    control: "updated-after",
    description: "Only series whose metadata was updated after this time.",
  };
  const rest = list.filter((column) => column.id !== "category" && column.id !== "last_updated_ts");
  return [category, updated, ...rest];
}

/**
 * Empty when the pull can run. A loading pick is not an error yet.
 * Series runs from tickers, or from a category when no tickers are selected.
 * @returns {string}
 */
export function kalshiLiveDirectScopeError(tableId, picks, _query, filters) {
  const loading = (picks || []).some((pick) => pick?.status === "loading");
  if (tableId === "series") {
    if (directSeriesTickers(picks).length) return "";
    if (seriesDiscoveryCategory(filters)) return "";
    return loading ? "" : "Search for a series or select a category.";
  }
  if (directMarketTickers(picks).length) return "";
  return loading ? "" : "Add at least one market ticker.";
}
