import {
  flattenLastTradePricesRows,
  lastTradePriceRefFromSuggestion,
  normalizePolymarketLastTradePricesComposeState,
  POLYMARKET_LAST_TRADE_PRICES_ENDPOINT_ID,
  selectLastTradePriceOutcomeTokens,
} from "@/lib/polymarketLive/lastTradePricesCompose";
import {
  applyPolymarketMarketPricesRows,
} from "@/lib/polymarketLive/polymarketMarketPricesPull";
import {
  discoverOrderbooksMarketsFromListFilters,
  resolveOrderbooksMarketTokenIds,
} from "@/lib/polymarketLive/polymarketOrderbooksPull";
import { parseTokenIdList } from "@/lib/polymarketLive/orderbooksCompose";

export const POLYMARKET_LAST_TRADE_PRICES_MAX_TOKENS_PER_REQUEST = 500;

/** @param {import("@/lib/polymarketLive/lastTradePricesCompose").PolymarketLastTradePriceMarketRef[]} refs */
function uniqueMarketRefs(refs) {
  const seen = new Set();
  return (Array.isArray(refs) ? refs : []).filter((ref) => {
    const tokenId = parseTokenIdList(ref.tokenIds)[0] || "";
    const key =
      String(ref.conditionId || "").trim() ||
      `${ref.id || ""}:${ref.slug || ""}` ||
      tokenId;
    if (!key || !tokenId || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** @param {string[]} tokenIds */
async function fetchLastTradePriceBatch(tokenIds) {
  const params = new URLSearchParams({ query: "getLastTradePrices" });
  const res = await fetch(`/api/integrations/polymarket?${params.toString()}`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(tokenIds.map((token_id) => ({ token_id }))),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.message === "string" ? data.message : "Last trade prices request failed",
    );
  }
  if (Array.isArray(data) && data.length === 1 && Array.isArray(data[0])) return data[0];
  return Array.isArray(data) ? data : [];
}

/**
 * @param {import("@/lib/polymarketLive/lastTradePricesCompose").PolymarketLastTradePricesComposeState} compose
 * @param {{
 *   selectedColumns?: string[];
 *   marketRefsOverride?: import("@/lib/polymarketLive/lastTradePricesCompose").PolymarketLastTradePriceMarketRef[];
 * }} [opts]
 */
export async function fetchPolymarketLastTradePricesRows(compose, opts = {}) {
  const normalized = normalizePolymarketLastTradePricesComposeState(compose);
  if (!normalized.outcomeSelection) {
    throw new Error("Choose YES, NO, or both outcomes before pulling last trade prices.");
  }
  let refs = Array.isArray(opts.marketRefsOverride)
    ? opts.marketRefsOverride
    : normalized.marketRefs;

  if (!opts.marketRefsOverride && normalized.mode === "advanced") {
    const discovered = await discoverOrderbooksMarketsFromListFilters(normalized.marketsFilters);
    refs = discovered.refs;
    if (!refs.length) throw new Error("No markets matched your filters.");
  }

  refs = uniqueMarketRefs(await resolveOrderbooksMarketTokenIds(refs));
  if (!refs.length) {
    throw new Error("Select at least one market with a CLOB token id.");
  }

  const tokenIds = [
    ...new Set(
      selectLastTradePriceOutcomeTokens(refs, normalized.outcomeSelection).map((p) => p.tokenId),
    ),
  ];
  if (!tokenIds.length) {
    throw new Error(
      `No ${normalized.outcomeSelection.toUpperCase()} outcome tokens were found for the selected markets.`,
    );
  }
  const payload = [];
  for (let offset = 0; offset < tokenIds.length; offset += POLYMARKET_LAST_TRADE_PRICES_MAX_TOKENS_PER_REQUEST) {
    const batch = tokenIds.slice(
      offset,
      offset + POLYMARKET_LAST_TRADE_PRICES_MAX_TOKENS_PER_REQUEST,
    );
    payload.push(...(await fetchLastTradePriceBatch(batch)));
  }

  return {
    rows: flattenLastTradePricesRows(
      payload,
      refs,
      opts.selectedColumns,
      normalized.outcomeSelection,
    ),
    marketsDiscovered: refs.length,
    tokenIds,
    refs,
  };
}

/**
 * @param {Record<string, unknown>} ctx
 * @param {import("@/lib/polymarketLive/polymarketPublicSearch").PolymarketPublicSearchSuggestion[]} suggestions
 * @param {{
 *   compose: import("@/lib/polymarketLive/lastTradePricesCompose").PolymarketLastTradePricesComposeState;
 *   selectedColumns?: string[];
 * }} opts
 */
export async function applyPolymarketLastTradePricesSearchAll(ctx, suggestions, opts) {
  const pullStartMs =
    typeof performance !== "undefined" && performance?.now ? performance.now() : Date.now();
  const refs = (suggestions || []).map(lastTradePriceRefFromSuggestion).filter(Boolean);
  if (!refs.length) throw new Error("Select at least one market.");
  const compose = normalizePolymarketLastTradePricesComposeState({
    ...(opts.compose || {}),
    mode: "search",
    marketRefs: refs,
  });
  const fetched = await fetchPolymarketLastTradePricesRows(compose, {
    selectedColumns: opts.selectedColumns,
    marketRefsOverride: refs,
  });
  if (!fetched.rows.length) {
    throw new Error("No last trade prices found for the selected markets.");
  }
  const elapsedMs =
    (typeof performance !== "undefined" && performance?.now ? performance.now() : Date.now()) -
    pullStartMs;
  return applyPolymarketMarketPricesRows(ctx, fetched.rows, {
    endpointId: POLYMARKET_LAST_TRADE_PRICES_ENDPOINT_ID,
    compose,
    marketRefs: fetched.refs || refs,
    selectedColumns: opts.selectedColumns,
    tokenIds: fetched.tokenIds,
    elapsedMs,
  });
}
