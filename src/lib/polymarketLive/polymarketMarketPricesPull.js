import { flushSync } from "react-dom";

import {
  applyConnectHomePullData,
  prepareConnectHomePullSheet,
} from "@/lib/connectHomePullDestination";
import {
  flattenMarketPricesRows,
  marketPriceRefFromSuggestion,
  normalizePolymarketMarketPricesComposeState,
  POLYMARKET_MARKET_PRICES_ENDPOINT_ID,
} from "@/lib/polymarketLive/marketPricesCompose";
import {
  attachPolymarketLiveRequestMetadata,
} from "@/lib/polymarketLive/polymarketLiveRequestHistory";
import {
  discoverOrderbooksMarketsFromListFilters,
  resolveOrderbooksMarketTokenIds,
} from "@/lib/polymarketLive/polymarketOrderbooksPull";
import { parseTokenIdList } from "@/lib/polymarketLive/orderbooksCompose";

/**
 * @param {unknown} payload
 * @returns {Record<string, unknown>}
 */
function unwrapPricesPayload(payload) {
  if (Array.isArray(payload)) {
    const first = payload.find((item) => item && typeof item === "object");
    return first ? /** @type {Record<string, unknown>} */ (first) : {};
  }
  return payload && typeof payload === "object"
    ? /** @type {Record<string, unknown>} */ (payload)
    : {};
}

/**
 * @param {import("@/lib/polymarketLive/marketPricesCompose").PolymarketMarketPriceMarketRef[]} refs
 */
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

/**
 * @param {import("@/lib/polymarketLive/marketPricesCompose").PolymarketMarketPricesComposeState} compose
 * @param {{
 *   selectedColumns?: string[];
 *   marketRefsOverride?: import("@/lib/polymarketLive/marketPricesCompose").PolymarketMarketPriceMarketRef[];
 * }} [opts]
 */
export async function fetchPolymarketMarketPricesRows(compose, opts = {}) {
  const normalized = normalizePolymarketMarketPricesComposeState(compose);
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

  // A Gamma market has Yes/No outcome tokens. Market Price uses the primary
  // token (normally Yes), yielding exactly one row per discovered market.
  const tokenIds = refs.map((ref) => parseTokenIdList(ref.tokenIds)[0]).filter(Boolean);
  const params = new URLSearchParams({ query: "getMarketPrices" });
  const res = await fetch(`/api/integrations/polymarket?${params.toString()}`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(
      tokenIds.flatMap((token_id) => [
        { token_id, side: "BUY" },
        { token_id, side: "SELL" },
      ]),
    ),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data?.message === "string" ? data.message : "Market prices request failed");
  }

  return {
    rows: flattenMarketPricesRows(unwrapPricesPayload(data), refs, opts.selectedColumns),
    marketsDiscovered: refs.length,
    tokenIds,
    refs,
  };
}

/**
 * All Market Price results always write to one sheet.
 *
 * @param {Record<string, unknown>} ctx
 * @param {Record<string, unknown>[]} rows
 * @param {{
 *   endpointId?: string;
 *   compose?: import("@/lib/polymarketLive/marketPricesCompose").PolymarketMarketPricesComposeState;
 *   marketRefs?: import("@/lib/polymarketLive/marketPricesCompose").PolymarketMarketPriceMarketRef[];
 *   selectedColumns?: string[];
 *   tokenIds?: string[];
 *   elapsedMs?: number;
 * }} [meta]
 */
export function applyPolymarketMarketPricesRows(ctx, rows, meta = {}) {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return 0;
  prepareConnectHomePullSheet(ctx);
  flushSync(() => {
    applyConnectHomePullData(ctx, list);
    const compose = meta.compose || null;
    const marketRefs =
      Array.isArray(meta.marketRefs) && meta.marketRefs.length
        ? meta.marketRefs
        : Array.isArray(compose?.marketRefs)
          ? compose.marketRefs
          : [];
    attachPolymarketLiveRequestMetadata(ctx, {
      endpointId: meta.endpointId || POLYMARKET_MARKET_PRICES_ENDPOINT_ID,
      mode: compose?.mode === "advanced" ? "advanced" : "search",
      marketRefs,
      marketsFilters: compose?.marketsFilters,
      selectedColumns: meta.selectedColumns,
      tokenIds: meta.tokenIds,
      elapsedMs: meta.elapsedMs,
      loadedRowCount: list.length,
    });
    ctx?.setConnectHomeAnalyzeActive?.(true);
  });
  ctx?.requestConnectAnalyzeScroll?.();
  return list.length;
}

/**
 * @param {Record<string, unknown>} ctx
 * @param {import("@/lib/polymarketLive/polymarketPublicSearch").PolymarketPublicSearchSuggestion[]} suggestions
 * @param {{
 *   compose: import("@/lib/polymarketLive/marketPricesCompose").PolymarketMarketPricesComposeState;
 *   selectedColumns?: string[];
 *   endpointId?: string;
 * }} opts
 */
export async function applyPolymarketMarketPricesSearchAll(ctx, suggestions, opts) {
  const pullStartMs =
    typeof performance !== "undefined" && performance?.now ? performance.now() : Date.now();
  const refs = (suggestions || []).map(marketPriceRefFromSuggestion).filter(Boolean);
  if (!refs.length) throw new Error("Select at least one market.");
  const compose = normalizePolymarketMarketPricesComposeState({
    ...(opts.compose || {}),
    mode: "search",
    marketRefs: refs,
  });
  const fetched = await fetchPolymarketMarketPricesRows(compose, {
    selectedColumns: opts.selectedColumns,
    marketRefsOverride: refs,
  });
  if (!fetched.rows.length) {
    throw new Error("No market prices found for the selected markets.");
  }
  const elapsedMs =
    (typeof performance !== "undefined" && performance?.now ? performance.now() : Date.now()) -
    pullStartMs;
  return applyPolymarketMarketPricesRows(ctx, fetched.rows, {
    endpointId: opts.endpointId || POLYMARKET_MARKET_PRICES_ENDPOINT_ID,
    compose,
    marketRefs: fetched.refs || refs,
    selectedColumns: opts.selectedColumns,
    tokenIds: fetched.tokenIds,
    elapsedMs,
  });
}
