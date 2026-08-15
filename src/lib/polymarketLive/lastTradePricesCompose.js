/**
 * Polymarket Live — Last Trade Prices (CLOB POST /last-trades-prices).
 * Uses the same market discovery and primary-token convention as Market Price.
 */

import {
  emptyPolymarketMarketPricesComposeState,
  marketPriceRefFromListMarketsRow,
  marketPriceRefFromSuggestion,
  normalizePolymarketMarketPricesComposeState,
} from "@/lib/polymarketLive/marketPricesCompose";
import { parseTokenIdList } from "@/lib/polymarketLive/orderbooksCompose";

/** @typedef {import("@/lib/polymarketLive/marketPricesCompose").PolymarketMarketPricesComposeState} PolymarketLastTradePricesComposeState */
/** @typedef {import("@/lib/polymarketLive/marketPricesCompose").PolymarketMarketPriceMarketRef} PolymarketLastTradePriceMarketRef */

export const POLYMARKET_LAST_TRADE_PRICES_ENDPOINT_ID = "getLastTradePrices";

export const POLYMARKET_LAST_TRADE_PRICES_COLUMNS = [
  { name: "market_id", type: "string", description: "Gamma market id" },
  { name: "market_title", type: "string", description: "Market question / title" },
  { name: "market_slug", type: "string", description: "Market slug" },
  { name: "condition_id", type: "string", description: "Market condition id" },
  { name: "token_id", type: "string", description: "Primary CLOB outcome token id" },
  { name: "outcome", type: "string", description: "Primary outcome label (usually Yes)" },
  { name: "last_trade_price", type: "number", description: "Most recent trade price" },
  { name: "last_trade_side", type: "string", description: "Most recent trade side (BUY or SELL)" },
];

export const POLYMARKET_LAST_TRADE_PRICES_DEFAULT_COLUMNS = [
  "market_title",
  "outcome",
  "last_trade_price",
  "last_trade_side",
  "token_id",
  "condition_id",
  "market_slug",
];

/** @returns {PolymarketLastTradePricesComposeState} */
export function emptyPolymarketLastTradePricesComposeState() {
  return emptyPolymarketMarketPricesComposeState();
}

/** @param {unknown} raw */
export function normalizePolymarketLastTradePricesComposeState(raw) {
  return normalizePolymarketMarketPricesComposeState(raw);
}

export const lastTradePriceRefFromSuggestion = marketPriceRefFromSuggestion;
export const lastTradePriceRefFromListMarketsRow = marketPriceRefFromListMarketsRow;

/**
 * @param {unknown} payload
 * @param {PolymarketLastTradePriceMarketRef[]} refs
 * @param {string[]} [selectedColumns]
 * @returns {Record<string, unknown>[]}
 */
export function flattenLastTradePricesRows(payload, refs, selectedColumns) {
  const items = Array.isArray(payload)
    ? payload.filter((item) => item && typeof item === "object")
    : [];
  const byToken = new Map();
  for (const item of items) {
    const row = /** @type {Record<string, unknown>} */ (item);
    const tokenId = String(row.token_id || row.tokenId || "").trim();
    if (tokenId) byToken.set(tokenId, row);
  }
  const selected = Array.isArray(selectedColumns)
    ? selectedColumns.map((c) => String(c || "").trim()).filter(Boolean)
    : [];
  const selectedSet = selected.length ? new Set(selected) : null;

  return (Array.isArray(refs) ? refs : []).flatMap((ref) => {
    const tokenId = parseTokenIdList(ref.tokenIds)[0] || "";
    if (!tokenId) return [];
    const trade = byToken.get(tokenId) || {};
    const row = {
      market_id: String(ref.id || "").trim(),
      market_title: String(ref.title || "").trim(),
      market_slug: String(ref.slug || "").trim(),
      condition_id: String(ref.conditionId || "").trim(),
      token_id: tokenId,
      outcome: String(ref.outcomes?.[0] || "").trim(),
      last_trade_price: trade.price ?? "",
      last_trade_side: trade.side ?? "",
    };
    if (!selectedSet) return [row];
    /** @type {Record<string, unknown>} */
    const projected = {};
    for (const [key, value] of Object.entries(row)) {
      if (selectedSet.has(key)) projected[key] = value;
    }
    return [projected];
  });
}
