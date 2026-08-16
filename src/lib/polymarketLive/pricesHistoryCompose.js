/**
 * Polymarket Live — Price History (CLOB POST /batch-prices-history).
 * Discovers markets via NL search or advanced filters, resolves outcome
 * token ids (Yes / No / both), then pulls price history into one sheet
 * per market (optional metadata sheet first).
 */

import {
  emptyPolymarketMarketsComposeState,
  normalizePolymarketMarketsComposeState,
} from "@/lib/polymarketLive/marketsCompose";
import {
  orderbooksMarketRefFromListMarketsRow,
  orderbooksMarketRefFromSuggestion,
  parseOutcomeList,
  parseTokenIdList,
  projectOrderbooksMarketMetadataRow,
  POLYMARKET_ORDERBOOKS_METADATA_COLUMNS,
  POLYMARKET_ORDERBOOKS_METADATA_DEFAULT_COLUMNS,
} from "@/lib/polymarketLive/orderbooksCompose";
import { selectLastTradePriceOutcomeTokens } from "@/lib/polymarketLive/lastTradePricesCompose";

/** @typedef {"search" | "advanced"} PolymarketPricesHistoryComposeMode */
/** @typedef {"per_market" | "meta_plus_per_market"} PolymarketPricesHistorySheetLayout */
/** @typedef {"yes" | "no" | "both" | ""} PolymarketPricesHistoryOutcomeSelection */
/** @typedef {"max" | "all" | "1m" | "1w" | "1d" | "6h" | "1h"} PolymarketPricesHistoryInterval */

/**
 * @typedef {import("@/lib/polymarketLive/orderbooksCompose").PolymarketOrderbooksMarketRef} PolymarketPricesHistoryMarketRef
 */

/**
 * @typedef {{
 *   mode: PolymarketPricesHistoryComposeMode;
 *   marketRefs: PolymarketPricesHistoryMarketRef[];
 *   sheetLayout: PolymarketPricesHistorySheetLayout;
 *   outcomeSelection: PolymarketPricesHistoryOutcomeSelection;
 *   startTs: string;
 *   endTs: string;
 *   interval: PolymarketPricesHistoryInterval | "";
 *   fidelity: number;
 *   marketsFilters: import("@/lib/polymarketLive/marketsCompose").PolymarketMarketsComposeState;
 * }} PolymarketPricesHistoryComposeState
 */

export const POLYMARKET_PRICES_HISTORY_ENDPOINT_ID = "getBatchPricesHistory";

export const POLYMARKET_PRICES_HISTORY_MAX_MARKETS_PER_REQUEST = 20;

export const POLYMARKET_PRICES_HISTORY_SHEET_LAYOUT_PER_MARKET =
  /** @type {PolymarketPricesHistorySheetLayout} */ ("per_market");
export const POLYMARKET_PRICES_HISTORY_SHEET_LAYOUT_META_PLUS_PER_MARKET =
  /** @type {PolymarketPricesHistorySheetLayout} */ ("meta_plus_per_market");

export const POLYMARKET_PRICES_HISTORY_SHEET_LAYOUT_OPTIONS = [
  {
    value: POLYMARKET_PRICES_HISTORY_SHEET_LAYOUT_META_PLUS_PER_MARKET,
    label: "Market metadata + one price history sheet per market",
    description:
      "Sheet 1 lists every matched market. Then each market gets its own price history sheet.",
  },
  {
    value: POLYMARKET_PRICES_HISTORY_SHEET_LAYOUT_PER_MARKET,
    label: "One price history sheet per market",
    description: "Skip the metadata sheet and put each market’s history on its own sheet.",
  },
];

export const POLYMARKET_PRICES_HISTORY_INTERVAL_OPTIONS = [
  { value: /** @type {PolymarketPricesHistoryInterval} */ ("max"), label: "Max" },
  { value: /** @type {PolymarketPricesHistoryInterval} */ ("all"), label: "All" },
  { value: /** @type {PolymarketPricesHistoryInterval} */ ("1m"), label: "1 month" },
  { value: /** @type {PolymarketPricesHistoryInterval} */ ("1w"), label: "1 week" },
  { value: /** @type {PolymarketPricesHistoryInterval} */ ("1d"), label: "1 day" },
  { value: /** @type {PolymarketPricesHistoryInterval} */ ("6h"), label: "6 hours" },
  { value: /** @type {PolymarketPricesHistoryInterval} */ ("1h"), label: "1 hour" },
];

/** Fidelity values confirmed against live POST /batch-prices-history (minutes). */
export const POLYMARKET_PRICES_HISTORY_FIDELITY_OPTIONS = [
  { value: 1, label: "1 minute (default)" },
  { value: 2, label: "2 minutes" },
  { value: 5, label: "5 minutes" },
  { value: 10, label: "10 minutes" },
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
  { value: 360, label: "6 hours" },
  { value: 720, label: "12 hours" },
  { value: 1440, label: "1 day" },
];

export const POLYMARKET_PRICES_HISTORY_COLUMNS = [
  { name: "market_id", type: "string", description: "Gamma market id" },
  { name: "market_title", type: "string", description: "Market question / title" },
  { name: "market_slug", type: "string", description: "Market slug" },
  { name: "condition_id", type: "string", description: "Market condition id" },
  { name: "token_id", type: "string", description: "CLOB outcome token / asset id" },
  { name: "outcome", type: "string", description: "Selected outcome label" },
  { name: "t", type: "number", description: "Unix timestamp (seconds)" },
  { name: "timestamp", type: "string", description: "ISO timestamp (UTC)" },
  { name: "p", type: "number", description: "Price at timestamp" },
];

export const POLYMARKET_PRICES_HISTORY_DEFAULT_COLUMNS = [
  "market_title",
  "outcome",
  "timestamp",
  "p",
  "t",
  "token_id",
  "condition_id",
];

export const POLYMARKET_PRICES_HISTORY_METADATA_COLUMNS = POLYMARKET_ORDERBOOKS_METADATA_COLUMNS;
export const POLYMARKET_PRICES_HISTORY_METADATA_DEFAULT_COLUMNS =
  POLYMARKET_ORDERBOOKS_METADATA_DEFAULT_COLUMNS;

/**
 * @param {unknown} raw
 * @returns {PolymarketPricesHistorySheetLayout}
 */
export function normalizePolymarketPricesHistorySheetLayout(raw) {
  if (raw === POLYMARKET_PRICES_HISTORY_SHEET_LAYOUT_PER_MARKET) {
    return POLYMARKET_PRICES_HISTORY_SHEET_LAYOUT_PER_MARKET;
  }
  return POLYMARKET_PRICES_HISTORY_SHEET_LAYOUT_META_PLUS_PER_MARKET;
}

/**
 * @param {unknown} raw
 * @returns {PolymarketPricesHistoryOutcomeSelection}
 */
export function normalizePolymarketPricesHistoryOutcomeSelection(raw) {
  const value = String(raw || "")
    .trim()
    .toLowerCase();
  if (value === "yes" || value === "no" || value === "both") return value;
  return "";
}

/**
 * @param {unknown} raw
 * @returns {PolymarketPricesHistoryInterval | ""}
 */
export function normalizePolymarketPricesHistoryInterval(raw) {
  const value = String(raw || "")
    .trim()
    .toLowerCase();
  if (
    value === "max" ||
    value === "all" ||
    value === "1m" ||
    value === "1w" ||
    value === "1d" ||
    value === "6h" ||
    value === "1h"
  ) {
    return /** @type {PolymarketPricesHistoryInterval} */ (value);
  }
  return "";
}

/**
 * @param {unknown} raw
 * @returns {number}
 */
export function normalizePolymarketPricesHistoryFidelity(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 1;
  const allowed = POLYMARKET_PRICES_HISTORY_FIDELITY_OPTIONS.map((o) => o.value);
  if (allowed.includes(Math.floor(n))) return Math.floor(n);
  return 1;
}

/**
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizePolymarketPricesHistoryUnixTs(raw) {
  if (raw == null || raw === "") return "";
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return "";
  return String(Math.floor(n));
}

/** @returns {PolymarketPricesHistoryComposeState} */
export function emptyPolymarketPricesHistoryComposeState() {
  return {
    mode: "search",
    marketRefs: [],
    sheetLayout: POLYMARKET_PRICES_HISTORY_SHEET_LAYOUT_META_PLUS_PER_MARKET,
    outcomeSelection: "",
    startTs: "",
    endTs: "",
    interval: "1d",
    fidelity: 1,
    marketsFilters: {
      ...emptyPolymarketMarketsComposeState(),
      mode: "advanced",
    },
  };
}

/**
 * @param {unknown} raw
 * @returns {PolymarketPricesHistoryComposeState}
 */
export function normalizePolymarketPricesHistoryComposeState(raw) {
  const base = emptyPolymarketPricesHistoryComposeState();
  if (!raw || typeof raw !== "object") return base;
  const o = /** @type {Record<string, unknown>} */ (raw);
  const mode = o.mode === "advanced" ? "advanced" : "search";
  const marketRefs = Array.isArray(o.marketRefs)
    ? o.marketRefs
        .map((r) => {
          if (!r || typeof r !== "object") return null;
          const row = /** @type {Record<string, unknown>} */ (r);
          const id = String(row.id || "").trim();
          const slug = String(row.slug || "").trim();
          const conditionId = String(row.conditionId || "").trim();
          const tokenIds = parseTokenIdList(row.tokenIds ?? row.clobTokenIds ?? row.tokenId);
          if (!id && !slug && !conditionId && !tokenIds.length) return null;
          const outcomes = parseOutcomeList(row.outcomes);
          return {
            id,
            slug: slug || undefined,
            conditionId: conditionId || undefined,
            title: String(row.title || "").trim() || undefined,
            tokenIds: tokenIds.length ? tokenIds : undefined,
            outcomes: outcomes.length ? outcomes : undefined,
          };
        })
        .filter(Boolean)
    : [];

  return {
    mode,
    marketRefs: /** @type {PolymarketPricesHistoryMarketRef[]} */ (marketRefs),
    sheetLayout: normalizePolymarketPricesHistorySheetLayout(o.sheetLayout),
    outcomeSelection: normalizePolymarketPricesHistoryOutcomeSelection(o.outcomeSelection),
    startTs: normalizePolymarketPricesHistoryUnixTs(o.startTs),
    endTs: normalizePolymarketPricesHistoryUnixTs(o.endTs),
    interval: normalizePolymarketPricesHistoryInterval(o.interval) || "1d",
    fidelity: normalizePolymarketPricesHistoryFidelity(o.fidelity),
    marketsFilters: normalizePolymarketMarketsComposeState({
      ...(o.marketsFilters && typeof o.marketsFilters === "object" ? o.marketsFilters : {}),
      mode: "advanced",
    }),
  };
}

export const pricesHistoryRefFromSuggestion = orderbooksMarketRefFromSuggestion;
export const pricesHistoryRefFromListMarketsRow = orderbooksMarketRefFromListMarketsRow;
export const projectPricesHistoryMarketMetadataRow = projectOrderbooksMarketMetadataRow;

/**
 * @param {PolymarketPricesHistorySheetLayout} layout
 */
export function pricesHistoryLayoutIncludesMetadata(layout) {
  return (
    normalizePolymarketPricesHistorySheetLayout(layout) ===
    POLYMARKET_PRICES_HISTORY_SHEET_LAYOUT_META_PLUS_PER_MARKET
  );
}

/**
 * Reuse last-trade outcome pairing (label match, else token[0]=YES / token[1]=NO).
 *
 * @param {PolymarketPricesHistoryMarketRef[]} refs
 * @param {PolymarketPricesHistoryOutcomeSelection} [outcomeSelection]
 */
export function selectPricesHistoryOutcomeTokens(refs, outcomeSelection = "yes") {
  return selectLastTradePriceOutcomeTokens(refs, outcomeSelection || "yes");
}

/**
 * Flatten batch-prices-history response for one market (all selected outcomes).
 *
 * @param {Record<string, Array<{ t?: number; p?: number }>> | null | undefined} historyByToken
 * @param {PolymarketPricesHistoryMarketRef} ref
 * @param {{ tokenId: string; outcome: string }[]} tokenPairs
 * @param {string[]} [selectedColumns]
 * @returns {Record<string, unknown>[]}
 */
export function flattenPricesHistoryRowsForMarket(
  historyByToken,
  ref,
  tokenPairs,
  selectedColumns,
) {
  const history =
    historyByToken && typeof historyByToken === "object" ? historyByToken : {};
  const selected = Array.isArray(selectedColumns)
    ? selectedColumns.map((c) => String(c || "").trim()).filter(Boolean)
    : [];
  const selectedSet = selected.length ? new Set(selected) : null;

  /** @type {Record<string, unknown>[]} */
  const rows = [];
  for (const pair of Array.isArray(tokenPairs) ? tokenPairs : []) {
    const tokenId = String(pair.tokenId || "").trim();
    if (!tokenId) continue;
    const points = Array.isArray(history[tokenId]) ? history[tokenId] : [];
    for (const point of points) {
      if (!point || typeof point !== "object") continue;
      const tRaw = /** @type {Record<string, unknown>} */ (point).t;
      const pRaw = /** @type {Record<string, unknown>} */ (point).p;
      const tNum = Number(tRaw);
      const row = {
        market_id: String(ref.id || "").trim(),
        market_title: String(ref.title || "").trim(),
        market_slug: String(ref.slug || "").trim(),
        condition_id: String(ref.conditionId || "").trim(),
        token_id: tokenId,
        outcome: String(pair.outcome || "").trim(),
        t: Number.isFinite(tNum) ? tNum : tRaw ?? "",
        timestamp:
          Number.isFinite(tNum) && tNum > 0 ? new Date(tNum * 1000).toISOString() : "",
        p: pRaw ?? "",
      };
      if (!selectedSet) {
        rows.push(row);
        continue;
      }
      /** @type {Record<string, unknown>} */
      const projected = {};
      for (const [key, value] of Object.entries(row)) {
        if (selectedSet.has(key)) projected[key] = value;
      }
      rows.push(projected);
    }
  }

  rows.sort((a, b) => {
    const ta = Number(a.t);
    const tb = Number(b.t);
    if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) return ta - tb;
    return String(a.token_id || "").localeCompare(String(b.token_id || ""));
  });
  return rows;
}
