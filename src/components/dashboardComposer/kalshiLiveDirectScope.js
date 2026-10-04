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

/**
 * Empty when the pull can run. A loading pick is not an error yet.
 * @returns {string}
 */
export function kalshiLiveDirectScopeError(tableId, picks, query) {
  const loading = (picks || []).some((pick) => pick?.status === "loading");
  if (tableId === "series" && query?.mode === "discover") {
    return String(query?.category || "").trim() ? "" : "Select a category to discover series.";
  }
  if (tableId === "series") {
    if (directSeriesTickers(picks).length) return "";
    return loading ? "" : "Add at least one series.";
  }
  if (directMarketTickers(picks).length) return "";
  return loading ? "" : "Add at least one market ticker.";
}
