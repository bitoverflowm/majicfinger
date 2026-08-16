import { flushSync } from "react-dom";

import {
  applyConnectHomePullData,
  prepareConnectHomePullSheet,
} from "@/lib/connectHomePullDestination";
import {
  buildPolymarketCurrentPositionsQueryValues,
  normalizePolymarketCurrentPositionsComposeState,
  POLYMARKET_CURRENT_POSITIONS_ENDPOINT_ID,
  projectPolymarketCurrentPosition,
} from "@/lib/polymarketLive/currentPositionsCompose";
import {
  attachPolymarketLiveRequestMetadata,
} from "@/lib/polymarketLive/polymarketLiveRequestHistory";
import {
  isPolymarketWalletAddress,
  parsePolymarketProfileAddresses,
} from "@/lib/polymarketLive/publicProfilesCompose";

/**
 * @param {import("@/lib/polymarketLive/currentPositionsCompose").PolymarketCurrentPositionsComposeState} compose
 * @param {{ selectedColumns?: string[] }} [opts]
 */
export async function fetchPolymarketCurrentPositionsRows(compose, opts = {}) {
  const state = normalizePolymarketCurrentPositionsComposeState(compose);
  const addresses = parsePolymarketProfileAddresses(state.addresses);
  if (!addresses.length) throw new Error("Enter at least one holder wallet address.");
  const invalid = addresses.filter((address) => !isPolymarketWalletAddress(address));
  if (invalid.length) {
    throw new Error(
      `Invalid wallet address${invalid.length > 1 ? "es" : ""}: ${invalid.join(", ")}`,
    );
  }

  const requestParams = buildPolymarketCurrentPositionsQueryValues(state);
  const rows = [];
  const failures = [];
  for (const address of addresses) {
    try {
      const params = new URLSearchParams({
        query: "getCurrentPositions",
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
          typeof data?.message === "string" ? data.message : "Current positions request failed",
        );
      }
      const positions = Array.isArray(data) ? data : [];
      for (const position of positions) {
        rows.push(projectPolymarketCurrentPosition(position, opts.selectedColumns || []));
      }
    } catch (error) {
      failures.push(
        `${address}: ${error instanceof Error ? error.message : "Current positions request failed"}`,
      );
    }
  }

  if (!rows.length && failures.length === addresses.length) {
    throw new Error(failures[0] || "No current positions were returned.");
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
export function applyPolymarketCurrentPositionsRows(ctx, rows, meta) {
  const list = Array.isArray(rows) ? rows : [];
  prepareConnectHomePullSheet(ctx);
  flushSync(() => {
    applyConnectHomePullData(ctx, list);
    attachPolymarketLiveRequestMetadata(ctx, {
      endpointId: POLYMARKET_CURRENT_POSITIONS_ENDPOINT_ID,
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
