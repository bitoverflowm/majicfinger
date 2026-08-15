/**
 * Polymarket Live — Midpoint Prices (CLOB POST /midpoints).
 * Uses the same market discovery and primary-token convention as Market Price.
 */

import {
  emptyPolymarketMarketPricesComposeState,
  marketPriceRefFromListMarketsRow,
  marketPriceRefFromSuggestion,
  normalizePolymarketMarketPricesComposeState,
} from "@/lib/polymarketLive/marketPricesCompose";
import { parseTokenIdList } from "@/lib/polymarketLive/orderbooksCompose";

/** @typedef {import("@/lib/polymarketLive/marketPricesCompose").PolymarketMarketPricesComposeState} PolymarketMidpointPricesComposeState */
/** @typedef {import("@/lib/polymarketLive/marketPricesCompose").PolymarketMarketPriceMarketRef} PolymarketMidpointPriceMarketRef */

export const POLYMARKET_MIDPOINT_PRICES_ENDPOINT_ID = "getMidpointPrices";

export const POLYMARKET_MIDPOINT_PRICES_COLUMNS = [
  { name: "market_id", type: "string", description: "Gamma market id" },
  { name: "market_title", type: "string", description: "Market question / title" },
  { name: "market_slug", type: "string", description: "Market slug" },
  { name: "condition_id", type: "string", description: "Market condition id" },
  { name: "token_id", type: "string", description: "Primary CLOB outcome token id" },
  { name: "outcome", type: "string", description: "Primary outcome label (usually Yes)" },
  {
    name: "midpoint_price",
    type: "number",
    description: "Average of the best bid and best ask",
  },
];

export const POLYMARKET_MIDPOINT_PRICES_DEFAULT_COLUMNS = [
  "market_title",
  "outcome",
  "midpoint_price",
  "token_id",
  "condition_id",
  "market_slug",
];

/** @returns {PolymarketMidpointPricesComposeState} */
export function emptyPolymarketMidpointPricesComposeState() {
  return emptyPolymarketMarketPricesComposeState();
}

/**
 * @param {unknown} raw
 * @returns {PolymarketMidpointPricesComposeState}
 */
export function normalizePolymarketMidpointPricesComposeState(raw) {
  return normalizePolymarketMarketPricesComposeState(raw);
}

export const midpointPriceRefFromSuggestion = marketPriceRefFromSuggestion;
export const midpointPriceRefFromListMarketsRow = marketPriceRefFromListMarketsRow;

/**
 * @param {unknown} payload
 * @param {PolymarketMidpointPriceMarketRef[]} refs
 * @param {string[]} [selectedColumns]
 * @returns {Record<string, unknown>[]}
 */
export function flattenMidpointPricesRows(payload, refs, selectedColumns) {
  const prices =
    payload && typeof payload === "object"
      ? /** @type {Record<string, unknown>} */ (payload)
      : {};
  const selected = Array.isArray(selectedColumns)
    ? selectedColumns.map((c) => String(c || "").trim()).filter(Boolean)
    : [];
  const selectedSet = selected.length ? new Set(selected) : null;

  return (Array.isArray(refs) ? refs : []).flatMap((ref) => {
    const tokenId = parseTokenIdList(ref.tokenIds)[0] || "";
    if (!tokenId) return [];
    const row = {
      market_id: String(ref.id || "").trim(),
      market_title: String(ref.title || "").trim(),
      market_slug: String(ref.slug || "").trim(),
      condition_id: String(ref.conditionId || "").trim(),
      token_id: tokenId,
      outcome: String(ref.outcomes?.[0] || "").trim(),
      midpoint_price: prices[tokenId] ?? "",
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
