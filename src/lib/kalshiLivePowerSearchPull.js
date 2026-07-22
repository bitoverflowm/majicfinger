import { flushSync } from "react-dom";

import {
  applyConnectHomePullData,
  prepareConnectHomePullSheet,
} from "@/lib/connectHomePullDestination";
import {
  flattenKalshiEmbeddingSearchSuggestionsToRows,
  flattenKalshiEmbeddingSearchToRows,
} from "@/lib/kalshiLive/kalshiLiveEmbeddingSearch";
import { KALSHI_LIVE_MARKETS_COLUMNS } from "@/lib/kalshiLive/marketsColumns";
import { KALSHI_LIVE_SERIES_COLUMNS } from "@/lib/kalshiLive/seriesColumns";

/**
 * @typedef {{ entity: string; ticker: string; title?: string; eventTicker?: string; status?: string }} KalshiLiveSearchSuggestion
 */

/**
 * @param {Record<string, unknown>} ctx
 * @param {KalshiLiveSearchSuggestion} suggestion
 */
export function applyKalshiLivePowerSearchSelection(ctx, suggestion) {
  const endpointId = "markets";
  const columns = KALSHI_LIVE_MARKETS_COLUMNS.map((c) => c.name);

  flushSync(() => {
    ctx.setConnectKalshiLiveEndpointId?.(endpointId);
    ctx.setConnectKalshiLiveColumnSelections?.((prev) => ({
      ...(prev || {}),
      [endpointId]: columns,
    }));
    ctx.setConnectKalshiLiveWhereFilters?.([
      {
        id: `klw-${Date.now()}`,
        column: "ticker",
        op: "eq",
        value: String(suggestion.ticker || "").trim(),
      },
    ]);
    ctx.setConnectKalshiLiveSortClauses?.([]);
    ctx.setConnectActiveComposeOps?.(["where"]);
  });

  prepareConnectHomePullSheet(ctx);
  ctx.requestConnectIntegrationPull?.();
}

/**
 * @param {Record<string, unknown>} ctx
 * @param {KalshiLiveSearchSuggestion} suggestion
 */
export function applyKalshiLiveSeriesPowerSearchSelection(ctx, suggestion) {
  const endpointId = "series";
  const columns = KALSHI_LIVE_SERIES_COLUMNS.map((c) => c.name);
  const ticker = String(suggestion.ticker || "").trim().toUpperCase();
  const title = String(suggestion.title || ticker).trim() || ticker;

  flushSync(() => {
    ctx.setConnectKalshiLiveEndpointId?.(endpointId);
    ctx.setConnectKalshiLiveColumnSelections?.((prev) => ({
      ...(prev || {}),
      [endpointId]: columns,
    }));
    ctx.setConnectKalshiLiveSeriesTicker?.(ticker);
    ctx.setConnectKalshiLiveSeriesTickerMeta?.(ticker ? { [ticker]: title } : {});
    ctx.setConnectKalshiLiveSeriesSheetMode?.("per_series");
    ctx.setConnectKalshiLiveWhereFilters?.([]);
    ctx.setConnectKalshiLiveSortClauses?.([]);
    ctx.setConnectActiveComposeOps?.([]);
  });

  prepareConnectHomePullSheet(ctx);
  ctx.requestConnectIntegrationPull?.();
}

/**
 * Load embedding-search hit markets into the connect-home sheet.
 *
 * @param {Record<string, unknown>} ctx
 * @param {import("@/lib/kalshiLive/kalshiLiveEmbeddingSearch").KalshiEmbeddingSearchSuggestion} suggestion
 */
export function applyKalshiLiveEmbeddingSearchSelection(ctx, suggestion) {
  const rows = flattenKalshiEmbeddingSearchToRows(suggestion);
  prepareConnectHomePullSheet(ctx);
  flushSync(() => {
    applyConnectHomePullData(ctx, rows);
    ctx.setConnectHomeAnalyzeActive?.(true);
  });
  ctx.requestConnectAnalyzeScroll?.();
}

/**
 * Load every embedding-search hit into the connect-home sheet (Enter / pull all).
 *
 * @param {Record<string, unknown>} ctx
 * @param {import("@/lib/kalshiLive/kalshiLiveEmbeddingSearch").KalshiEmbeddingSearchSuggestion[]} suggestions
 */
export function applyKalshiLiveEmbeddingSearchAll(ctx, suggestions) {
  const rows = flattenKalshiEmbeddingSearchSuggestionsToRows(suggestions);
  if (!rows.length) return;
  prepareConnectHomePullSheet(ctx);
  flushSync(() => {
    applyConnectHomePullData(ctx, rows);
    ctx.setConnectHomeAnalyzeActive?.(true);
  });
  ctx.requestConnectAnalyzeScroll?.();
}
