/**
 * Maps API-facing { lake, table } to Glue/Athena physical table names.
 * Kalshi crawler-suffixed names are fixed here; optional Kalshi blocks via env.
 */

const POLYMARKET = {
  markets: "markets",
  trades: "trades",
  blocks: "blocks",
};

const KALSHI = {
  markets: "markets_a73a606d057905f6f71dcef9a7a5f582",
  trades: "trades_047909d0d0d4e8fb5f2ace0b062c60ef",
};

/** Hive/Athena-friendly identifier (unquoted segment we still wrap in quotes). */
const SAFE_IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * @param {"polymarket" | "kalshi"} lake
 * @param {"markets" | "trades" | "blocks"} table
 * @returns {string | null} physical table name, or null if unavailable (kalshi blocks)
 */
export function resolveAthenaTableName(lake, table) {
  const L = String(lake || "").toLowerCase();
  const T = String(table || "").toLowerCase();

  if (!["markets", "trades", "blocks"].includes(T)) return null;

  if (L === "polymarket") {
    return POLYMARKET[T] || null;
  }
  if (L === "kalshi") {
    if (T === "blocks") {
      const fromEnv = String(process.env.DATA_LAKE_ATHENA_TABLE_KALSHI_BLOCKS || "").trim();
      return fromEnv || null;
    }
    return KALSHI[T] || null;
  }
  return null;
}

export function isValidColumnIdentifier(name) {
  return typeof name === "string" && SAFE_IDENT.test(name);
}
