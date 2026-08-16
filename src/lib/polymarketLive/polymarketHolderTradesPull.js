import { flushSync } from "react-dom";

import {
  applyConnectHomePullData,
  prepareConnectHomePullSheet,
} from "@/lib/connectHomePullDestination";
import {
  buildPolymarketHolderTradesQueryValues,
  normalizePolymarketHolderTradesComposeState,
  POLYMARKET_HOLDER_TRADES_ENDPOINT_ID,
  projectPolymarketHolderTrade,
} from "@/lib/polymarketLive/holderTradesCompose";
import {
  attachPolymarketLiveRequestMetadata,
} from "@/lib/polymarketLive/polymarketLiveRequestHistory";
import {
  isPolymarketWalletAddress,
  parsePolymarketProfileAddresses,
} from "@/lib/polymarketLive/publicProfilesCompose";

export async function fetchPolymarketHolderTradesRows(compose, opts = {}) {
  const state = normalizePolymarketHolderTradesComposeState(compose);
  const addresses = parsePolymarketProfileAddresses(state.addresses);
  if (!addresses.length) throw new Error("Enter at least one holder wallet address.");
  const invalid = addresses.filter((address) => !isPolymarketWalletAddress(address));
  if (invalid.length) {
    throw new Error(
      `Invalid wallet address${invalid.length > 1 ? "es" : ""}: ${invalid.join(", ")}`,
    );
  }

  const requestParams = buildPolymarketHolderTradesQueryValues(state);
  const rows = [];
  const failures = [];
  for (const address of addresses) {
    try {
      const params = new URLSearchParams({
        query: "getHolderTrades",
        user: address,
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
          typeof data?.message === "string" ? data.message : "Holder trades request failed",
        );
      }
      for (const trade of Array.isArray(data) ? data : []) {
        rows.push(projectPolymarketHolderTrade(trade, opts.selectedColumns || []));
      }
    } catch (error) {
      failures.push(
        `${address}: ${error instanceof Error ? error.message : "Holder trades request failed"}`,
      );
    }
  }

  if (!rows.length && failures.length === addresses.length) {
    throw new Error(failures[0] || "No holder trades were returned.");
  }
  return { rows, addresses, failures, requestParams };
}

export function applyPolymarketHolderTradesRows(ctx, rows, meta) {
  const list = Array.isArray(rows) ? rows : [];
  prepareConnectHomePullSheet(ctx);
  flushSync(() => {
    applyConnectHomePullData(ctx, list);
    attachPolymarketLiveRequestMetadata(ctx, {
      endpointId: POLYMARKET_HOLDER_TRADES_ENDPOINT_ID,
      mode: "search",
      addresses: meta.addresses,
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
