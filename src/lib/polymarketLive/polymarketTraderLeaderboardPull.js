import { flushSync } from "react-dom";

import {
  applyConnectHomePullData,
  prepareConnectHomePullSheet,
} from "@/lib/connectHomePullDestination";
import {
  buildPolymarketTraderLeaderboardQueryValues,
  normalizePolymarketTraderLeaderboardComposeState,
  POLYMARKET_TRADER_LEADERBOARD_ENDPOINT_ID,
  projectPolymarketTraderLeaderboardEntry,
} from "@/lib/polymarketLive/traderLeaderboardCompose";
import { attachPolymarketLiveRequestMetadata } from "@/lib/polymarketLive/polymarketLiveRequestHistory";
import { isPolymarketWalletAddress } from "@/lib/polymarketLive/publicProfilesCompose";

export async function fetchPolymarketTraderLeaderboardRows(compose, opts = {}) {
  const state = normalizePolymarketTraderLeaderboardComposeState(compose);
  if (state.user && !isPolymarketWalletAddress(state.user)) {
    throw new Error("Enter a valid 0x-prefixed user wallet address.");
  }

  const requestParams = buildPolymarketTraderLeaderboardQueryValues(state);
  const params = new URLSearchParams({
    query: POLYMARKET_TRADER_LEADERBOARD_ENDPOINT_ID,
    ...requestParams,
    skipFlatten: "true",
  });
  const response = await fetch(`/api/integrations/polymarket?${params.toString()}`, {
    headers: { Accept: "application/json" },
    credentials: "same-origin",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof data?.message === "string" ? data.message : "Trader leaderboard request failed",
    );
  }

  const rows = (Array.isArray(data) ? data : []).map((entry) =>
    projectPolymarketTraderLeaderboardEntry(entry, opts.selectedColumns || []),
  );
  return { rows, requestParams };
}

export function applyPolymarketTraderLeaderboardRows(ctx, rows, meta) {
  const list = Array.isArray(rows) ? rows : [];
  prepareConnectHomePullSheet(ctx);
  flushSync(() => {
    applyConnectHomePullData(ctx, list);
    attachPolymarketLiveRequestMetadata(ctx, {
      endpointId: POLYMARKET_TRADER_LEADERBOARD_ENDPOINT_ID,
      mode: "search",
      selectedColumns: meta.selectedColumns,
      requestParams: meta.requestParams,
      elapsedMs: meta.elapsedMs,
      loadedRowCount: list.length,
    });
    ctx?.setConnectHomeAnalyzeActive?.(true);
  });
  ctx?.requestConnectAnalyzeScroll?.();
  return list.length;
}
