/** @typedef {{ name: string; type: string; description: string; label?: string; lycheeCustom?: boolean }} KalshiConnectColumn */

/** Display labels for server-computed Kalshi fields (matches integrations panel). */
export const KALSHI_CONNECT_COLUMN_LABELS = {
  kalshi_event_ticker_category: "event ticker simplified",
  kalshi_taxonomy_category: "Category",
};

/** @param {KalshiConnectColumn | string} col */
export function getKalshiColumnDisplayLabel(col) {
  const name = typeof col === "string" ? col : col.name;
  const fromCol = typeof col === "object" && col.label ? col.label : null;
  return fromCol || KALSHI_CONNECT_COLUMN_LABELS[name] || name;
}

/** @type {KalshiConnectColumn[]} */
export const KALSHI_MARKETS_CONNECT_COLUMNS = [
  {
    name: "ticker",
    type: "string",
    description: "Unique market identifier (e.g., PRES-2024-DJT)",
  },
  {
    name: "kalshi_event_ticker_category",
    type: "string",
    label: "event ticker simplified",
    lycheeCustom: true,
    description:
      "Simplified ticker parsed from event_ticker.",
  },
  {
    name: "event_ticker",
    type: "string",
    description: "Parent event identifier, used for categorization",
  },
  {
    name: "kalshi_taxonomy_category",
    type: "string",
    label: "Category",
    lycheeCustom: true,
    description:
      "Market category bucket (Sports, Weather, Politics, Crypto, …).",
  },
  {
    name: "market_type",
    type: "string",
    description: "Market type (typically binary)",
  },
  {
    name: "title",
    type: "string",
    description: "Human-readable market title",
  },
  {
    name: "yes_sub_title",
    type: "string",
    description: 'Label for the "Yes" outcome',
  },
  {
    name: "no_sub_title",
    type: "string",
    description: 'Label for the "No" outcome',
  },
  {
    name: "status",
    type: "string",
    description: "Market status: open, closed, finalized",
  },
  {
    name: "yes_bid",
    type: "int (nullable)",
    description: "Best bid price for Yes contracts (cents, 1-99)",
  },
  {
    name: "yes_ask",
    type: "int (nullable)",
    description: "Best ask price for Yes contracts (cents, 1-99)",
  },
  {
    name: "no_bid",
    type: "int (nullable)",
    description: "Best bid price for No contracts (cents, 1-99)",
  },
  {
    name: "no_ask",
    type: "int (nullable)",
    description: "Best ask price for No contracts (cents, 1-99)",
  },
  {
    name: "last_price",
    type: "int (nullable)",
    description: "Last traded price (cents, 1-99)",
  },
  {
    name: "volume",
    type: "int",
    description: "Total contracts traded",
  },
  {
    name: "volume_24h",
    type: "int",
    description: "Contracts traded in last 24 hours",
  },
  {
    name: "open_interest",
    type: "int",
    description: "Outstanding contracts",
  },
  {
    name: "result",
    type: "string",
    description: "Market outcome: yes, no, or empty if unresolved",
  },
  {
    name: "created_time",
    type: "datetime",
    description: "When the market was created",
  },
  {
    name: "open_time",
    type: "datetime (nullable)",
    description: "When trading opened",
  },
  {
    name: "close_time",
    type: "datetime (nullable)",
    description: "When trading closed",
  },
  {
    name: "_fetched_at",
    type: "datetime",
    description: "When this record was fetched",
  },
];

/** @type {KalshiConnectColumn[]} */
export const KALSHI_TRADES_CONNECT_COLUMNS = [
  {
    name: "trade_id",
    type: "string",
    description: "Unique trade identifier",
  },
  {
    name: "ticker",
    type: "string",
    description: "Market ticker this trade belongs to",
  },
  {
    name: "count",
    type: "int",
    description: "Number of contracts traded",
  },
  {
    name: "yes_price",
    type: "int",
    description: "Yes contract price (cents, 1-99)",
  },
  {
    name: "no_price",
    type: "int",
    description: "No contract price (cents, 1-99), always 100 - yes_price",
  },
  {
    name: "taker_side",
    type: "string",
    description: "Which side the taker bought: yes or no",
  },
  {
    name: "created_time",
    type: "datetime",
    description: "When the trade occurred",
  },
  {
    name: "_fetched_at",
    type: "datetime",
    description: "When this record was fetched",
  },
];

/** @param {string} sampleId */
export function getKalshiConnectColumnsForSample(sampleId) {
  if (sampleId === "athena-kal-markets") return KALSHI_MARKETS_CONNECT_COLUMNS;
  if (sampleId === "athena-kal-trades") return KALSHI_TRADES_CONNECT_COLUMNS;
  return [];
}
