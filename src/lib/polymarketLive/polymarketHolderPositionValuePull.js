import { flushSync } from "react-dom";

import {
  applyConnectHomePullData,
  prepareConnectHomePullSheet,
} from "@/lib/connectHomePullDestination";
import {
  buildPolymarketHolderPositionValueQueryValues,
  normalizePolymarketHolderPositionValueComposeState,
  POLYMARKET_HOLDER_POSITION_VALUE_ENDPOINT_ID,
  projectPolymarketHolderPositionValue,
} from "@/lib/polymarketLive/holderPositionValueCompose";
import {
  attachPolymarketLiveRequestMetadata,
} from "@/lib/polymarketLive/polymarketLiveRequestHistory";
import {
  isPolymarketWalletAddress,
  parsePolymarketProfileAddresses,
} from "@/lib/polymarketLive/publicProfilesCompose";

export async function fetchPolymarketHolderPositionValueRows(compose, opts = {}) {
  const state = normalizePolymarketHolderPositionValueComposeState(compose);
  const addresses = parsePolymarketProfileAddresses(state.addresses);
  if (!addresses.length) throw new Error("Enter at least one holder wallet address.");
  const invalid = addresses.filter((address) => !isPolymarketWalletAddress(address));
  if (invalid.length) {
    throw new Error(
      `Invalid wallet address${invalid.length > 1 ? "es" : ""}: ${invalid.join(", ")}`,
    );
  }

  const requestParams = buildPolymarketHolderPositionValueQueryValues(state);
  const rows = [];
  const failures = [];
  for (const address of addresses) {
    try {
      const params = new URLSearchParams({
        query: "getHolderPositionValue",
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
          typeof data?.message === "string" ? data.message : "Position value request failed",
        );
      }
      for (const value of Array.isArray(data) ? data : []) {
        rows.push(projectPolymarketHolderPositionValue(value, opts.selectedColumns || []));
      }
    } catch (error) {
      failures.push(
        `${address}: ${error instanceof Error ? error.message : "Position value request failed"}`,
      );
    }
  }

  if (!rows.length && failures.length === addresses.length) {
    throw new Error(failures[0] || "No position values were returned.");
  }
  return { rows, addresses, failures, requestParams };
}

export function applyPolymarketHolderPositionValueRows(ctx, rows, meta) {
  const list = Array.isArray(rows) ? rows : [];
  prepareConnectHomePullSheet(ctx);
  flushSync(() => {
    applyConnectHomePullData(ctx, list);
    attachPolymarketLiveRequestMetadata(ctx, {
      endpointId: POLYMARKET_HOLDER_POSITION_VALUE_ENDPOINT_ID,
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
