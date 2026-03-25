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
