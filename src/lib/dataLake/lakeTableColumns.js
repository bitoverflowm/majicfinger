/**
 * Glue-style column metadata per lake + table (keep in sync with DataLakeParquetPanel).
 */

/** @typedef {{ name: string; type: string }} LakeColumnMeta */

/** @type {Record<string, Record<string, LakeColumnMeta[]>>} */
const META = {
  polymarket: {
    markets: [
      { name: "id", type: "string" },
      { name: "condition_id", type: "string" },
      { name: "question", type: "string" },
      { name: "slug", type: "string" },
      { name: "outcomes", type: "string" },
      { name: "outcome_prices", type: "string" },
      { name: "clob_token_ids", type: "string" },
      { name: "volume", type: "double" },
      { name: "liquidity", type: "double" },
      { name: "active", type: "boolean" },
      { name: "closed", type: "boolean" },
      { name: "end_date", type: "bigint" },
      { name: "created_at", type: "bigint" },
      { name: "market_maker_address", type: "string" },
      { name: "_fetched_at", type: "bigint" },
    ],
    trades: [
      { name: "block_number", type: "bigint" },
      { name: "transaction_hash", type: "string" },
      { name: "log_index", type: "bigint" },
      { name: "order_hash", type: "string" },
      { name: "maker", type: "string" },
      { name: "taker", type: "string" },
      { name: "maker_asset_id", type: "string" },
      { name: "taker_asset_id", type: "string" },
      { name: "maker_amount", type: "bigint" },
      { name: "taker_amount", type: "bigint" },
      { name: "fee", type: "bigint" },
      { name: "timestamp", type: "int" },
      { name: "_fetched_at", type: "bigint" },
      { name: "_contract", type: "string" },
    ],
    blocks: [
      { name: "block_number", type: "bigint" },
      { name: "timestamp", type: "string" },
    ],
  },
  kalshi: {
    markets: [
      { name: "ticker", type: "string" },
      /** Computed in Athena compose SQL from `event_ticker` (leading A-Z0-9 token); not a physical Glue column. */
      { name: "kalshi_event_ticker_category", type: "string" },
      { name: "event_ticker", type: "string" },
      { name: "market_type", type: "string" },
      { name: "title", type: "string" },
      { name: "yes_sub_title", type: "string" },
      { name: "no_sub_title", type: "string" },
      { name: "status", type: "string" },
      { name: "yes_bid", type: "bigint" },
      { name: "yes_ask", type: "bigint" },
      { name: "no_bid", type: "bigint" },
      { name: "no_ask", type: "bigint" },
      { name: "last_price", type: "bigint" },
      { name: "volume", type: "bigint" },
      { name: "volume_24h", type: "bigint" },
      { name: "open_interest", type: "bigint" },
      { name: "result", type: "string" },
      { name: "created_time", type: "bigint" },
      { name: "open_time", type: "bigint" },
      { name: "close_time", type: "bigint" },
      { name: "_fetched_at", type: "bigint" },
    ],
    trades: [
      { name: "trade_id", type: "string" },
      { name: "ticker", type: "string" },
      { name: "count", type: "bigint" },
      { name: "yes_price", type: "bigint" },
      { name: "no_price", type: "bigint" },
      { name: "taker_side", type: "string" },
      { name: "created_time", type: "bigint" },
      { name: "_fetched_at", type: "bigint" },
    ],
    blocks: [],
  },
};

/**
 * @param {string} name
 */
export function isDateLikeColumnName(name) {
  return /(^timestamp$)|(_at$)|(_time$)|(^created_)|(_date$)|date|time/i.test(String(name || ""));
}

/**
 * @param {"polymarket" | "kalshi"} lake
 * @param {"markets" | "trades" | "blocks"} table
 * @returns {LakeColumnMeta[]}
 */
export function getColumnMetaForLakeTable(lake, table) {
  const L = String(lake || "").toLowerCase();
  const T = String(table || "").toLowerCase();
  return META[L]?.[T] || [];
}

/**
 * @param {"polymarket" | "kalshi"} lake
 * @param {"markets" | "trades" | "blocks"} table
 * @returns {string[]}
 */
export function allowedColumnsForLakeTable(lake, table) {
  return getColumnMetaForLakeTable(lake, table).map((c) => c.name);
}

/**
 * @param {"polymarket" | "kalshi"} lake
 * @param {"markets" | "trades" | "blocks"} table
 * @param {string} column
 */
export function isColumnAllowedOnLakeTable(lake, table, column) {
  const set = new Set(allowedColumnsForLakeTable(lake, table));
  return set.has(String(column || "").trim());
}

/**
 * @param {"polymarket" | "kalshi"} lake
 * @param {"markets" | "trades" | "blocks"} table
 * @param {string} column
 * @returns {string | null}
 */
export function columnHiveTypeForLakeTable(lake, table, column) {
  const meta = getColumnMetaForLakeTable(lake, table);
  const f = meta.find((c) => c.name === String(column || "").trim());
  return f ? String(f.type).toLowerCase() : null;
}

/**
 * @param {string | null | undefined} t
 */
export function isNumericHiveType(t) {
  const x = String(t || "").toLowerCase();
  return x === "bigint" || x === "int" || x === "double";
}

/** Compose-only: Kalshi trades ⟕ markets (finalized, yes/no); equal-width decile buckets on trade price (¢). */
export const KALSHI_TRADES_RESOLVED_MARKETS_JOIN_PRESET = "kalshi_trades_resolved_markets";

/** Same join + filters; fixed cent buckets 1–10c … 91–99c on taker-side trade price. */
export const KALSHI_TRADES_RESOLVED_MARKETS_JOIN_PRESET_CENT = "kalshi_trades_resolved_markets_cent";

/** Output columns of the Athena subquery for that join (not physical Glue cols on `trades`). */
export const KALSHI_TRADES_RESOLVED_MARKETS_JOIN_META = [
  { name: "kalshi_resolved_centile_bin", type: "bigint" },
  { name: "kalshi_resolved_centile_label", type: "string" },
  { name: "kalshi_resolved_taker_notional", type: "double" },
  { name: "kalshi_resolved_maker_notional", type: "double" },
  { name: "kalshi_resolved_contract_count", type: "bigint" },
];

/**
 * @param {string} column
 * @returns {{ name: string; type: string } | null}
 */
export function kalshiResolvedMarketsJoinColumnMeta(column) {
  const key = String(column || "").trim();
  return KALSHI_TRADES_RESOLVED_MARKETS_JOIN_META.find((c) => c.name === key) || null;
}
