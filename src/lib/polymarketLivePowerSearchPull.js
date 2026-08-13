import { flushSync } from "react-dom";

import {
  applyConnectHomePullData,
  prepareConnectHomePullSheet,
} from "@/lib/connectHomePullDestination";
import {
  flattenPolymarketPublicSearchSuggestionsToRows,
  flattenPolymarketPublicSearchToRows,
} from "@/lib/polymarketLive/polymarketPublicSearch";

/**
 * Load one Polymarket public-search hit into the connect-home sheet.
 *
 * @param {Record<string, unknown>} ctx
 * @param {import("@/lib/polymarketLive/polymarketPublicSearch").PolymarketPublicSearchSuggestion} suggestion
 */
export function applyPolymarketLiveSearchSelection(ctx, suggestion) {
  const rows = flattenPolymarketPublicSearchToRows(suggestion);
  if (!rows.length) return;
  prepareConnectHomePullSheet(ctx);
  flushSync(() => {
    applyConnectHomePullData(ctx, rows);
    ctx.setConnectHomeAnalyzeActive?.(true);
  });
  ctx.requestConnectAnalyzeScroll?.();
}

/**
 * Load every current public-search hit into the connect-home sheet (Enter).
 *
 * @param {Record<string, unknown>} ctx
 * @param {import("@/lib/polymarketLive/polymarketPublicSearch").PolymarketPublicSearchSuggestion[]} suggestions
 */
export function applyPolymarketLiveSearchAll(ctx, suggestions) {
  const rows = flattenPolymarketPublicSearchSuggestionsToRows(suggestions);
  if (!rows.length) return;
  prepareConnectHomePullSheet(ctx);
  flushSync(() => {
    applyConnectHomePullData(ctx, rows);
    ctx.setConnectHomeAnalyzeActive?.(true);
  });
  ctx.requestConnectAnalyzeScroll?.();
}
