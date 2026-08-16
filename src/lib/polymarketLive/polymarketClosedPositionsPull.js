import { flushSync } from "react-dom";

import {
  applyConnectHomePullData,
  prepareConnectHomePullSheet,
} from "@/lib/connectHomePullDestination";
import {
  buildPolymarketClosedPositionsQueryValues,
  normalizePolymarketClosedPositionsComposeState,
  POLYMARKET_CLOSED_POSITIONS_ENDPOINT_ID,
  projectPolymarketClosedPosition,
} from "@/lib/polymarketLive/closedPositionsCompose";
import {
  attachPolymarketLiveRequestMetadata,
} from "@/lib/polymarketLive/polymarketLiveRequestHistory";
import {
  isPolymarketWalletAddress,
  parsePolymarketProfileAddresses,
} from "@/lib/polymarketLive/publicProfilesCompose";

/**
 * @param {import("@/lib/polymarketLive/closedPositionsCompose").PolymarketClosedPositionsComposeState} compose
 * @param {{ selectedColumns?: string[] }} [opts]
 */
export async function fetchPolymarketClosedPositionsRows(compose, opts = {}) {
  const state = normalizePolymarketClosedPositionsComposeState(compose);
  const addresses = parsePolymarketProfileAddresses(state.addresses);
  if (!addresses.length) throw new Error("Enter at least one holder wallet address.");
  const invalid = addresses.filter((address) => !isPolymarketWalletAddress(address));
  if (invalid.length) {
    throw new Error(
      `Invalid wallet address${invalid.length > 1 ? "es" : ""}: ${invalid.join(", ")}`,
    );
  }

  const requestParams = buildPolymarketClosedPositionsQueryValues(state);
  const rows = [];
  const failures = [];
  for (const address of addresses) {
    try {
      const params = new URLSearchParams({
        query: "getClosedPositions",
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
          typeof data?.message === "string" ? data.message : "Closed positions request failed",
        );
      }
      for (const position of Array.isArray(data) ? data : []) {
        rows.push(projectPolymarketClosedPosition(position, opts.selectedColumns || []));
      }
    } catch (error) {
      failures.push(
        `${address}: ${error instanceof Error ? error.message : "Closed positions request failed"}`,
      );
    }
  }

  if (!rows.length && failures.length === addresses.length) {
    throw new Error(failures[0] || "No closed positions were returned.");
  }
  return { rows, addresses, failures, requestParams };
}

/**
 * @param {Record<string, unknown>} ctx
 * @param {Record<string, unknown>[]} rows
 * @param {{
 *   addresses: string[];
 *   selectedColumns?: string[];
 *   requestParams?: Record<string, string>;
 *   elapsedMs?: number;
 * }} meta
 */
export function applyPolymarketClosedPositionsRows(ctx, rows, meta) {
  const list = Array.isArray(rows) ? rows : [];
  prepareConnectHomePullSheet(ctx);
  flushSync(() => {
    applyConnectHomePullData(ctx, list);
    attachPolymarketLiveRequestMetadata(ctx, {
      endpointId: POLYMARKET_CLOSED_POSITIONS_ENDPOINT_ID,
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
