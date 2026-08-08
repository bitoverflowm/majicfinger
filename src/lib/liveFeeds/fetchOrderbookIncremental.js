/**
 * Client tick for Kalshi Live market orderbook (full snapshot per ticker).
 */

import { fetchKalshiLiveOrderbookPull } from "@/lib/kalshiLive/fetchKalshiLiveOrderbookPull";
import { fetchKalshiLiveMarket } from "@/lib/kalshiLive/fetchKalshiLiveMarket";
import { KALSHI_LIVE_MARKETS_COLUMNS } from "@/lib/kalshiLive/marketsColumns";
import { KALSHI_LIVE_ORDERBOOK_COLUMNS } from "@/lib/kalshiLive/orderbookColumns";
import { projectKalshiLiveMarketRows } from "@/lib/kalshiLive/normalizeMarketRow";

const ALL_ORDERBOOK_COLUMN_NAMES = KALSHI_LIVE_ORDERBOOK_COLUMNS.map((c) => c.name);
const ALL_MARKET_COLUMN_NAMES = KALSHI_LIVE_MARKETS_COLUMNS.map((c) => c.name);

/**
 * @param {{
 *   marketTickers: string[];
 *   depth?: number | null;
 *   signal?: AbortSignal;
 * }} opts
 * @returns {Promise<{
 *   metaRows: Record<string, unknown>[];
 *   byMarket: { ticker: string; rows: Record<string, unknown>[] }[];
 * }>}
 */
export async function fetchKalshiLiveOrderbookIncremental(opts) {
  const marketTickers = [
    ...new Set(
      (Array.isArray(opts.marketTickers) ? opts.marketTickers : [])
        .map((t) => String(t || "").trim().toUpperCase())
        .filter(Boolean),
    ),
  ];
  if (!marketTickers.length) {
    throw new Error("marketTickers are required.");
  }

  const depthRaw = Math.floor(Number(opts.depth));
  const depth = Number.isFinite(depthRaw) && depthRaw >= 0 && depthRaw <= 100 ? depthRaw : null;
  /** @type {import("@/lib/kalshiLive/kalshiLiveCompose").KalshiLiveWhereFilter[]} */
  const whereFilters =
    depth != null
      ? [{ id: "depth", column: "depth", op: "eq", value: depth }]
      : [];

  /** @type {Record<string, unknown>[]} */
  const rawMarkets = [];
  for (const ticker of marketTickers) {
    if (opts.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    try {
      const market = await fetchKalshiLiveMarket({
        marketTicker: ticker,
        signal: opts.signal,
      });
      rawMarkets.push(market);
    } catch {
      // Meta refresh is best-effort for closure detection.
    }
  }

  const { byTicker } = await fetchKalshiLiveOrderbookPull({
    marketTickers: marketTickers.join(","),
    whereFilters,
    selectedColumns: ALL_ORDERBOOK_COLUMN_NAMES,
    signal: opts.signal,
  });

  const byMarket = (Array.isArray(byTicker) ? byTicker : []).map((g) => ({
    ticker: String(g.ticker || "").trim().toUpperCase(),
    rows: Array.isArray(g.rows) ? g.rows : [],
  }));

  const metaRows = projectKalshiLiveMarketRows(rawMarkets, ALL_MARKET_COLUMN_NAMES);
  return { byMarket, metaRows };
}
