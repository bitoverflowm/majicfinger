import { flushSync } from "react-dom";

import { prepareConnectHomePullSheet } from "@/lib/connectHomePullDestination";
import { KALSHI_LIVE_MARKETS_COLUMNS } from "@/lib/kalshiLive/marketsColumns";

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
    ctx.setConnectKalshiLiveFilters?.([]);
    ctx.setConnectKalshiLiveTickers?.(String(suggestion.ticker || "").trim());
  });

  prepareConnectHomePullSheet(ctx);
  ctx.requestConnectIntegrationPull?.();
}
