import { flushSync } from "react-dom";

import {
  applyConnectHomePullData,
  prepareConnectHomePullSheet,
} from "@/lib/connectHomePullDestination";
import {
  attachPolymarketLiveRequestMetadata,
} from "@/lib/polymarketLive/polymarketLiveRequestHistory";
import {
  isPolymarketWalletAddress,
  parsePolymarketProfileAddresses,
} from "@/lib/polymarketLive/publicProfilesCompose";
import {
  buildPolymarketUserActivityQueryValues,
  normalizePolymarketUserActivityComposeState,
  POLYMARKET_USER_ACTIVITY_ENDPOINT_ID,
  projectPolymarketUserActivity,
} from "@/lib/polymarketLive/userActivityCompose";

export async function fetchPolymarketUserActivityRows(compose, opts = {}) {
  const state = normalizePolymarketUserActivityComposeState(compose);
  const addresses = parsePolymarketProfileAddresses(state.addresses);
  if (!addresses.length) throw new Error("Enter at least one user wallet address.");
  const invalid = addresses.filter((address) => !isPolymarketWalletAddress(address));
  if (invalid.length) {
    throw new Error(
      `Invalid wallet address${invalid.length > 1 ? "es" : ""}: ${invalid.join(", ")}`,
    );
  }

  const requestParams = buildPolymarketUserActivityQueryValues(state);
  const rows = [];
  const failures = [];
  for (const address of addresses) {
    try {
      const params = new URLSearchParams({
        query: "getUserActivity",
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
          typeof data?.message === "string" ? data.message : "User activity request failed",
        );
      }
      for (const activity of Array.isArray(data) ? data : []) {
        rows.push(projectPolymarketUserActivity(activity, opts.selectedColumns || []));
      }
    } catch (error) {
      failures.push(
        `${address}: ${error instanceof Error ? error.message : "User activity request failed"}`,
      );
    }
  }

  if (!rows.length && failures.length === addresses.length) {
    throw new Error(failures[0] || "No user activity was returned.");
  }
  return { rows, addresses, failures, requestParams };
}

export function applyPolymarketUserActivityRows(ctx, rows, meta) {
  const list = Array.isArray(rows) ? rows : [];
  prepareConnectHomePullSheet(ctx);
  flushSync(() => {
    applyConnectHomePullData(ctx, list);
    attachPolymarketLiveRequestMetadata(ctx, {
      endpointId: POLYMARKET_USER_ACTIVITY_ENDPOINT_ID,
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
