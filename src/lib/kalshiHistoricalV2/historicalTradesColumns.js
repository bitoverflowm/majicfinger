/** @typedef {{ name: string; type: string; description: string; label?: string }} KalshiHistoricalV2TradeColumn */

/**
 * Columns for GET /historical/trades response fields.
 * Omits deprecated taker_side; includes is_block_trade.
 */
export const KALSHI_HISTORICAL_V2_TRADES_COLUMNS = [
  { name: "trade_id", type: "string", description: "Unique identifier for this trade" },
  { name: "ticker", type: "string", description: "Unique identifier for the market" },
  {
    name: "count_fp",
    type: "number",
    description: "String representation of the number of contracts bought or sold in this trade",
  },
  { name: "yes_price_dollars", type: "number", description: "Yes price for this trade in dollars" },
  { name: "no_price_dollars", type: "number", description: "No price for this trade in dollars" },
  {
    name: "taker_outcome_side",
    type: "string",
    description: "Outcome side the taker is positioned for (yes | no)",
  },
  {
    name: "taker_book_side",
    type: "string",
    description: "Book side for taker direction (bid | ask)",
  },
  { name: "created_time", type: "timestamp", description: "Timestamp when this trade was executed" },
  {
    name: "is_block_trade",
    type: "boolean",
    description:
      "True if this trade was matched off-book as a block trade; false for standard order book fills",
  },
];

/** @param {KalshiHistoricalV2TradeColumn | string} col */
export function getKalshiHistoricalV2TradeColumnLabel(col) {
  const name = typeof col === "string" ? col : col.name;
  const fromCol = typeof col === "object" && col.label ? col.label : null;
  return fromCol || name;
}
