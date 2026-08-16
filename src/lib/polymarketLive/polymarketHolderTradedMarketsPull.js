import { flushSync } from "react-dom";

import {
  applyConnectHomePullData,
  prepareConnectHomePullSheet,
} from "@/lib/connectHomePullDestination";
import {
  normalizePolymarketHolderTradedMarketsComposeState,
  POLYMARKET_HOLDER_TRADED_MARKETS_ENDPOINT_ID,
  projectPolymarketHolderTradedMarkets,
} from "@/lib/polymarketLive/holderTradedMarketsCompose";
import {
  attachPolymarketLiveRequestMetadata,
} from "@/lib/polymarketLive/polymarketLiveRequestHistory";
import {
  isPolymarketWalletAddress,
  parsePolymarketProfileAddresses,
} from "@/lib/polymarketLive/publicProfilesCompose";

export async function fetchPolymarketHolderTradedMarketsRows(compose, opts = {}) {
  const state = normalizePolymarketHolderTradedMarketsComposeState(compose);
  const addresses = parsePolymarketProfileAddresses(state.addresses);
  if (!addresses.length) throw new Error("Enter at least one holder wallet address.");
  const invalid = addresses.filter((address) => !isPolymarketWalletAddress(address));
  if (invalid.length) {
    throw new Error(
      `Invalid wallet address${invalid.length > 1 ? "es" : ""}: ${invalid.join(", ")}`,
    );
  }

  const rows = [];
  const failures = [];
  for (const address of addresses) {
    try {
      const params = new URLSearchParams({
        query: "getHolderTradedMarkets",
        user: address,
        skipFlatten: "true",
      });
      const response = await fetch(`/api/integrations/polymarket?${params.toString()}`, {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof data?.message === "string" ? data.message : "Traded markets request failed",
        );
      }
      const payloads = Array.isArray(data) ? data : [data];
      for (const payload of payloads) {
        rows.push(
          projectPolymarketHolderTradedMarkets(payload, address, opts.selectedColumns || []),
        );
      }
    } catch (error) {
      failures.push(
        `${address}: ${error instanceof Error ? error.message : "Traded markets request failed"}`,
      );
    }
  }

  if (!rows.length && failures.length === addresses.length) {
    throw new Error(failures[0] || "No traded market counts were returned.");
  }
  return { rows, addresses, failures, requestParams: {} };
}

export function applyPolymarketHolderTradedMarketsRows(ctx, rows, meta) {
  const list = Array.isArray(rows) ? rows : [];
  prepareConnectHomePullSheet(ctx);
  flushSync(() => {
    applyConnectHomePullData(ctx, list);
    attachPolymarketLiveRequestMetadata(ctx, {
      endpointId: POLYMARKET_HOLDER_TRADED_MARKETS_ENDPOINT_ID,
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
