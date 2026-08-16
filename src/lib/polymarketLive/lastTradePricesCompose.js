/**
 * Polymarket Live — Last Trade Prices (CLOB POST /last-trades-prices).
 * Uses the same market discovery as Market Price, with a request-wide
 * Yes / No / both outcome selection.
 */

import {
  emptyPolymarketMarketPricesComposeState,
  marketPriceRefFromListMarketsRow,
  marketPriceRefFromSuggestion,
  normalizePolymarketMarketPricesComposeState,
} from "@/lib/polymarketLive/marketPricesCompose";
import { parseOutcomeList, parseTokenIdList } from "@/lib/polymarketLive/orderbooksCompose";

/** @typedef {"yes" | "no" | "both" | ""} PolymarketLastTradePricesOutcomeSelection */
/**
 * @typedef {import("@/lib/polymarketLive/marketPricesCompose").PolymarketMarketPricesComposeState & {
 *   outcomeSelection: PolymarketLastTradePricesOutcomeSelection;
 * }} PolymarketLastTradePricesComposeState
 */
/** @typedef {import("@/lib/polymarketLive/marketPricesCompose").PolymarketMarketPriceMarketRef} PolymarketLastTradePriceMarketRef */

export const POLYMARKET_LAST_TRADE_PRICES_ENDPOINT_ID = "getLastTradePrices";

export const POLYMARKET_LAST_TRADE_PRICES_COLUMNS = [
  { name: "market_id", type: "string", description: "Gamma market id" },
  { name: "market_title", type: "string", description: "Market question / title" },
  { name: "market_slug", type: "string", description: "Market slug" },
  { name: "condition_id", type: "string", description: "Market condition id" },
  { name: "token_id", type: "string", description: "Selected CLOB outcome token id" },
  { name: "outcome", type: "string", description: "Selected outcome label (Yes or No)" },
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
  return {
    ...emptyPolymarketMarketPricesComposeState(),
    outcomeSelection: "",
  };
}

/** @param {unknown} raw */
export function normalizePolymarketLastTradePricesComposeState(raw) {
  const base = normalizePolymarketMarketPricesComposeState(raw);
  const value =
    raw && typeof raw === "object"
      ? String(/** @type {Record<string, unknown>} */ (raw).outcomeSelection || "")
          .trim()
          .toLowerCase()
      : "";
  return {
    ...base,
    outcomeSelection:
      value === "yes" || value === "no" || value === "both" ? value : "",
  };
}

export const lastTradePriceRefFromSuggestion = marketPriceRefFromSuggestion;
export const lastTradePriceRefFromListMarketsRow = marketPriceRefFromListMarketsRow;

/**
 * Pair every market ref with the CLOB token(s) the requested outcome asks for.
 *
 * Outcome labels come from Gamma `outcomes`; when a market labels its sides
 * something other than Yes/No (e.g. candidate names) the first token is treated
 * as the YES side and the second as the NO side, matching Polymarket's ordering.
 *
 * @param {PolymarketLastTradePriceMarketRef[]} refs
 * @param {PolymarketLastTradePricesOutcomeSelection} [outcomeSelection]
 * @returns {{ ref: PolymarketLastTradePriceMarketRef; tokenId: string; outcome: string }[]}
 */
export function selectLastTradePriceOutcomeTokens(refs, outcomeSelection = "yes") {
  const selection =
    outcomeSelection === "no" || outcomeSelection === "both" ? outcomeSelection : "yes";
  const wanted = selection === "both" ? ["yes", "no"] : [selection];

  /** @type {{ ref: PolymarketLastTradePriceMarketRef; tokenId: string; outcome: string }[]} */
  const pairs = [];
  for (const ref of Array.isArray(refs) ? refs : []) {
    const tokenIds = parseTokenIdList(ref?.tokenIds);
    if (!tokenIds.length) continue;
    const outcomes = parseOutcomeList(ref?.outcomes);
    for (const want of wanted) {
      const labelled = outcomes.findIndex((o) => o.trim().toLowerCase() === want);
      const index = labelled >= 0 ? labelled : want === "yes" ? 0 : 1;
      const tokenId = tokenIds[index];
      if (!tokenId) continue;
      pairs.push({
        ref,
        tokenId,
        outcome: outcomes[index] || (want === "yes" ? "Yes" : "No"),
      });
    }
  }
  return pairs;
}

/**
 * @param {unknown} payload
 * @param {PolymarketLastTradePriceMarketRef[]} refs
 * @param {string[]} [selectedColumns]
 * @param {PolymarketLastTradePricesOutcomeSelection} [outcomeSelection]
 * @returns {Record<string, unknown>[]}
 */
export function flattenLastTradePricesRows(
  payload,
  refs,
  selectedColumns,
  outcomeSelection = "yes",
) {
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

  return selectLastTradePriceOutcomeTokens(refs, outcomeSelection).map(
    ({ ref, tokenId, outcome }) => {
      const trade = byToken.get(tokenId) || {};
      const row = {
        market_id: String(ref.id || "").trim(),
        market_title: String(ref.title || "").trim(),
        market_slug: String(ref.slug || "").trim(),
        condition_id: String(ref.conditionId || "").trim(),
        token_id: tokenId,
        outcome,
        last_trade_price: trade.price ?? "",
        last_trade_side: trade.side ?? "",
      };
      if (!selectedSet) return row;
      /** @type {Record<string, unknown>} */
      const projected = {};
      for (const [key, value] of Object.entries(row)) {
        if (selectedSet.has(key)) projected[key] = value;
      }
      return projected;
    },
  );
}
