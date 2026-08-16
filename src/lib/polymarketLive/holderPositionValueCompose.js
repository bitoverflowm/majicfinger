/**
 * Polymarket Live — total value of holder positions (Data API GET /value).
 */

export const POLYMARKET_HOLDER_POSITION_VALUE_ENDPOINT_ID = "getHolderPositionValue";

export const POLYMARKET_HOLDER_POSITION_VALUE_COLUMNS = [
  { name: "user", type: "string", description: "Holder wallet address" },
  { name: "value", type: "number", description: "Total value of the holder's positions" },
];

export const POLYMARKET_HOLDER_POSITION_VALUE_DEFAULT_COLUMNS = ["user", "value"];

export function emptyPolymarketHolderPositionValueComposeState() {
  return { addresses: "", market: "" };
}

/** @param {unknown} raw */
export function normalizePolymarketHolderPositionValueComposeState(raw) {
  if (!raw || typeof raw !== "object") {
    return emptyPolymarketHolderPositionValueComposeState();
  }
  const value = /** @type {Record<string, unknown>} */ (raw);
  return {
    addresses: String(value.addresses || ""),
    market: String(value.market || ""),
  };
}

/** @param {ReturnType<typeof emptyPolymarketHolderPositionValueComposeState>} raw */
export function buildPolymarketHolderPositionValueQueryValues(raw) {
  const state = normalizePolymarketHolderPositionValueComposeState(raw);
  return state.market.trim() ? { market: state.market.trim() } : {};
}

/** @param {unknown} value @param {string[]} selectedColumns */
export function projectPolymarketHolderPositionValue(value, selectedColumns) {
  const source =
    value && typeof value === "object"
      ? /** @type {Record<string, unknown>} */ (value)
      : {};
  const selected = new Set(
    Array.isArray(selectedColumns) && selectedColumns.length
      ? selectedColumns
      : POLYMARKET_HOLDER_POSITION_VALUE_DEFAULT_COLUMNS,
  );
  const row = {};
  for (const { name } of POLYMARKET_HOLDER_POSITION_VALUE_COLUMNS) {
    if (selected.has(name)) row[name] = source[name] == null ? "" : source[name];
  }
  return row;
}
