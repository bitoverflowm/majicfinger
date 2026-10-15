/**
 * Polymarket Live — total markets a holder has traded (Data API GET /traded).
 */
import { projectCatalogRow } from "@/lib/integrations/columnPayload";

export const POLYMARKET_HOLDER_TRADED_MARKETS_ENDPOINT_ID = "getHolderTradedMarkets";

export const POLYMARKET_HOLDER_TRADED_MARKETS_COLUMNS = [
  { name: "user", type: "string", description: "Holder wallet address" },
  { name: "traded", type: "number", description: "Total markets the holder has traded" },
];

export const POLYMARKET_HOLDER_TRADED_MARKETS_DEFAULT_COLUMNS = ["user", "traded"];

export function emptyPolymarketHolderTradedMarketsComposeState() {
  return { addresses: "" };
}

/** @param {unknown} raw */
export function normalizePolymarketHolderTradedMarketsComposeState(raw) {
  if (!raw || typeof raw !== "object") {
    return emptyPolymarketHolderTradedMarketsComposeState();
  }
  return {
    addresses: String(/** @type {Record<string, unknown>} */ (raw).addresses || ""),
  };
}

/**
 * The API omits `user` on some responses, so fall back to the requested address.
 *
 * @param {unknown} payload
 * @param {string} address
 * @param {string[]} selectedColumns
 */
export function projectPolymarketHolderTradedMarkets(payload, address, selectedColumns) {
  void selectedColumns;
  const source =
    payload && typeof payload === "object"
      ? /** @type {Record<string, unknown>} */ (payload)
      : {};
  return projectCatalogRow(
    { ...source, user: source.user || address || "" },
    POLYMARKET_HOLDER_TRADED_MARKETS_COLUMNS,
  );
}
