/**
 * Polymarket Live — Market Price (CLOB POST /prices).
 * Each discovered Gamma market becomes one row using its primary outcome token.
 */

import {
  emptyPolymarketMarketsComposeState,
  normalizePolymarketMarketsComposeState,
} from "@/lib/polymarketLive/marketsCompose";
import {
  orderbooksMarketRefFromListMarketsRow,
  orderbooksMarketRefFromSuggestion,
  parseTokenIdList,
} from "@/lib/polymarketLive/orderbooksCompose";

/** @typedef {"search" | "advanced"} PolymarketMarketPricesComposeMode */

/**
 * @typedef {import("@/lib/polymarketLive/orderbooksCompose").PolymarketOrderbooksMarketRef} PolymarketMarketPriceMarketRef
 */

/**
 * @typedef {{
 *   mode: PolymarketMarketPricesComposeMode;
 *   marketRefs: PolymarketMarketPriceMarketRef[];
 *   marketsFilters: import("@/lib/polymarketLive/marketsCompose").PolymarketMarketsComposeState;
 * }} PolymarketMarketPricesComposeState
 */

export const POLYMARKET_MARKET_PRICES_ENDPOINT_ID = "getMarketPrices";

export const POLYMARKET_MARKET_PRICES_COLUMNS = [
  { name: "market_id", type: "string", description: "Gamma market id" },
  { name: "market_title", type: "string", description: "Market question / title" },
  { name: "market_slug", type: "string", description: "Market slug" },
  { name: "condition_id", type: "string", description: "Market condition id" },
  { name: "token_id", type: "string", description: "Primary CLOB outcome token id" },
  { name: "outcome", type: "string", description: "Primary outcome label (usually Yes)" },
  { name: "buy_price", type: "number", description: "Current BUY price" },
  { name: "sell_price", type: "number", description: "Current SELL price" },
];

export const POLYMARKET_MARKET_PRICES_DEFAULT_COLUMNS = [
  "market_title",
  "outcome",
  "buy_price",
  "sell_price",
  "token_id",
  "condition_id",
  "market_slug",
];

/** @returns {PolymarketMarketPricesComposeState} */
export function emptyPolymarketMarketPricesComposeState() {
  return {
    mode: "search",
    marketRefs: [],
    marketsFilters: {
      ...emptyPolymarketMarketsComposeState(),
      mode: "advanced",
    },
  };
}

/**
 * @param {unknown} raw
 * @returns {PolymarketMarketPricesComposeState}
 */
export function normalizePolymarketMarketPricesComposeState(raw) {
  const base = emptyPolymarketMarketPricesComposeState();
  if (!raw || typeof raw !== "object") return base;
  const o = /** @type {Record<string, unknown>} */ (raw);
  const marketRefs = Array.isArray(o.marketRefs)
    ? o.marketRefs
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          const r = /** @type {Record<string, unknown>} */ (row);
          if (r.clobTokenIds != null || r.clob_token_ids != null || Array.isArray(r.tokens)) {
            const ref = orderbooksMarketRefFromListMarketsRow(row);
            if (ref) return ref;
          }
          const id = String(r.id || "").trim();
          const slug = String(r.slug || "").trim();
          const conditionId = String(r.conditionId || "").trim();
          const tokenIds = parseTokenIdList(r.tokenIds || r.clobTokenIds || r.tokenId);
          if (!id && !slug && !conditionId && !tokenIds.length) return null;
          return {
            id,
            slug: slug || undefined,
            conditionId: conditionId || undefined,
            title: String(r.title || r.question || "").trim() || undefined,
            tokenIds: tokenIds.length ? tokenIds : undefined,
            outcomes: Array.isArray(r.outcomes)
              ? r.outcomes.map((v) => String(v || "").trim()).filter(Boolean)
              : undefined,
          };
        })
        .filter(Boolean)
    : [];

  return {
    mode: o.mode === "advanced" ? "advanced" : "search",
    marketRefs: /** @type {PolymarketMarketPriceMarketRef[]} */ (marketRefs),
    marketsFilters: normalizePolymarketMarketsComposeState({
      ...(o.marketsFilters && typeof o.marketsFilters === "object" ? o.marketsFilters : {}),
      mode: "advanced",
    }),
  };
}

/** @param {Parameters<typeof orderbooksMarketRefFromSuggestion>[0]} suggestion */
export function marketPriceRefFromSuggestion(suggestion) {
  return orderbooksMarketRefFromSuggestion(suggestion);
}

/** @param {unknown} row */
export function marketPriceRefFromListMarketsRow(row) {
  return orderbooksMarketRefFromListMarketsRow(row);
}

/**
 * Flatten a CLOB /prices response into one row per selected market.
 *
 * @param {unknown} payload
 * @param {PolymarketMarketPriceMarketRef[]} refs
 * @param {string[]} [selectedColumns]
 * @returns {Record<string, unknown>[]}
 */
export function flattenMarketPricesRows(payload, refs, selectedColumns) {
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
    const tokenPrices =
      prices[tokenId] && typeof prices[tokenId] === "object"
        ? /** @type {Record<string, unknown>} */ (prices[tokenId])
        : {};
    const row = {
      market_id: String(ref.id || "").trim(),
      market_title: String(ref.title || "").trim(),
      market_slug: String(ref.slug || "").trim(),
      condition_id: String(ref.conditionId || "").trim(),
      token_id: tokenId,
      outcome: String(ref.outcomes?.[0] || "").trim(),
      buy_price: tokenPrices.BUY ?? tokenPrices.buy ?? "",
      sell_price: tokenPrices.SELL ?? tokenPrices.sell ?? "",
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
