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
  POLYMARKET_PUBLIC_PROFILES_ENDPOINT_ID,
  projectPolymarketPublicProfile,
} from "@/lib/polymarketLive/publicProfilesCompose";

/**
 * @param {unknown} rawAddresses
 * @param {{ selectedColumns?: string[] }} [opts]
 */
export async function fetchPolymarketPublicProfilesRows(rawAddresses, opts = {}) {
  const addresses = parsePolymarketProfileAddresses(rawAddresses);
  if (!addresses.length) throw new Error("Enter at least one wallet address.");

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
        query: "getPublicProfile",
        address,
        skipFlatten: "true",
      });
      const response = await fetch(`/api/integrations/polymarket?${params.toString()}`, {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof data?.message === "string" ? data.message : "Public profile request failed",
        );
      }
      const profile = Array.isArray(data) ? data[0] : data;
      rows.push(projectPolymarketPublicProfile(profile, opts.selectedColumns || []));
    } catch (error) {
      failures.push(
        `${address}: ${error instanceof Error ? error.message : "Public profile request failed"}`,
      );
    }
  }

  if (!rows.length) {
    throw new Error(failures[0] || "No public profiles were returned.");
  }

  return { rows, addresses, failures };
}

/**
 * @param {Record<string, unknown>} ctx
 * @param {Record<string, unknown>[]} rows
 * @param {{
 *   endpointId?: string;
 *   addresses?: string[];
 *   selectedColumns?: string[];
 *   elapsedMs?: number;
 * }} [meta]
 */
export function applyPolymarketPublicProfilesRows(ctx, rows, meta = {}) {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return 0;
  prepareConnectHomePullSheet(ctx);
  flushSync(() => {
    applyConnectHomePullData(ctx, list);
    attachPolymarketLiveRequestMetadata(ctx, {
      endpointId: meta.endpointId || POLYMARKET_PUBLIC_PROFILES_ENDPOINT_ID,
      mode: "search",
      addresses: meta.addresses,
      selectedColumns: meta.selectedColumns,
      elapsedMs: meta.elapsedMs,
      loadedRowCount: list.length,
    });
    ctx?.setConnectHomeAnalyzeActive?.(true);
  });
  ctx?.requestConnectAnalyzeScroll?.();
  return list.length;
}
