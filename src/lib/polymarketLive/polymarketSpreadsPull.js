import { applyPolymarketMarketPricesRows } from "@/lib/polymarketLive/polymarketMarketPricesPull";
import {
  discoverOrderbooksMarketsFromListFilters,
  resolveOrderbooksMarketTokenIds,
} from "@/lib/polymarketLive/polymarketOrderbooksPull";
import { parseTokenIdList } from "@/lib/polymarketLive/orderbooksCompose";
import {
  flattenSpreadsRows,
  normalizePolymarketSpreadsComposeState,
  POLYMARKET_SPREADS_ENDPOINT_ID,
  spreadRefFromSuggestion,
} from "@/lib/polymarketLive/spreadsCompose";

/** @param {unknown} payload */
function unwrapSpreadsPayload(payload) {
  if (Array.isArray(payload)) {
    const first = payload.find((item) => item && typeof item === "object");
    return first ? /** @type {Record<string, unknown>} */ (first) : {};
  }
  return payload && typeof payload === "object"
    ? /** @type {Record<string, unknown>} */ (payload)
    : {};
}

/** @param {import("@/lib/polymarketLive/spreadsCompose").PolymarketSpreadMarketRef[]} refs */
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
 * @param {import("@/lib/polymarketLive/spreadsCompose").PolymarketSpreadsComposeState} compose
 * @param {{
 *   selectedColumns?: string[];
 *   marketRefsOverride?: import("@/lib/polymarketLive/spreadsCompose").PolymarketSpreadMarketRef[];
 * }} [opts]
 */
export async function fetchPolymarketSpreadsRows(compose, opts = {}) {
  const normalized = normalizePolymarketSpreadsComposeState(compose);
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

  const tokenIds = refs.map((ref) => parseTokenIdList(ref.tokenIds)[0]).filter(Boolean);
  const params = new URLSearchParams({ query: "getSpreads" });
  const res = await fetch(`/api/integrations/polymarket?${params.toString()}`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(tokenIds.map((token_id) => ({ token_id }))),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data?.message === "string" ? data.message : "Spreads request failed");
  }

  return {
    rows: flattenSpreadsRows(unwrapSpreadsPayload(data), refs, opts.selectedColumns),
    marketsDiscovered: refs.length,
    tokenIds,
    refs,
  };
}

/**
 * @param {Record<string, unknown>} ctx
 * @param {import("@/lib/polymarketLive/polymarketPublicSearch").PolymarketPublicSearchSuggestion[]} suggestions
 * @param {{
 *   compose: import("@/lib/polymarketLive/spreadsCompose").PolymarketSpreadsComposeState;
 *   selectedColumns?: string[];
 * }} opts
 */
export async function applyPolymarketSpreadsSearchAll(ctx, suggestions, opts) {
  const pullStartMs =
    typeof performance !== "undefined" && performance?.now ? performance.now() : Date.now();
  const refs = (suggestions || []).map(spreadRefFromSuggestion).filter(Boolean);
  if (!refs.length) throw new Error("Select at least one market.");
  const compose = normalizePolymarketSpreadsComposeState({
    ...(opts.compose || {}),
    mode: "search",
    marketRefs: refs,
  });
  const fetched = await fetchPolymarketSpreadsRows(compose, {
    selectedColumns: opts.selectedColumns,
    marketRefsOverride: refs,
  });
  if (!fetched.rows.length) throw new Error("No spreads found for the selected markets.");
  const elapsedMs =
    (typeof performance !== "undefined" && performance?.now ? performance.now() : Date.now()) -
    pullStartMs;
  return applyPolymarketMarketPricesRows(ctx, fetched.rows, {
    endpointId: POLYMARKET_SPREADS_ENDPOINT_ID,
    compose,
    marketRefs: fetched.refs || refs,
    selectedColumns: opts.selectedColumns,
    tokenIds: fetched.tokenIds,
    elapsedMs,
  });
}
