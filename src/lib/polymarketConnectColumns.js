/** @typedef {{ name: string; type: string; description: string; label?: string }} PolymarketConnectColumn */

/** Row-level summary shown above the column picker. */
export const POLYMARKET_TABLE_INTROS = {
  markets: "Each row is a Polymarket prediction market.",
  trades:
    "Each row represents an OrderFilled event from the Polygon blockchain (CTF Exchange or Neg Risk).",
  blocks: "Mapping from Polygon block numbers to timestamps.",
};

export const POLYMARKET_TRADES_PRICE_NOTE =
  "Polymarket prices are decimals between 0 and 1. A price of 0.65 means the contract costs $0.65 and pays $1.00 if the outcome wins (implied probability: 65%).";

export const POLYMARKET_LEGACY_TRADES_INTRO =
  "Legacy FPMM trades (2020–2022): each row is an FPMMBuy or FPMMSell from Fixed Product Market Maker contracts before migration to the CTF Exchange. Amount fields are strings to avoid integer overflow (collateral: 6 decimals; outcome tokens: 18 decimals).";

/** Reference-only — legacy schema; not in current CTF trades pulls. */
export const POLYMARKET_LEGACY_TRADES_COLUMNS = [
  { name: "block_number", type: "int", description: "Polygon block number" },
  { name: "transaction_hash", type: "string", description: "Blockchain transaction hash" },
  { name: "log_index", type: "int", description: "Log index within transaction" },
  { name: "fpmm_address", type: "string", description: "FPMM contract (market) address" },
  { name: "trader", type: "string", description: "Buyer or seller address" },
  {
    name: "amount",
    type: "string",
    description:
      "Investment amount (buy) or return amount (sell) in collateral units (6 decimals for USDC)",
  },
  { name: "fee_amount", type: "string", description: "Trading fee in collateral units" },
  { name: "outcome_index", type: "int", description: "Index of the outcome traded (0 or 1)" },
  {
    name: "outcome_tokens",
    type: "string",
    description: "Outcome tokens bought or sold (18 decimals)",
  },
  { name: "is_buy", type: "bool", description: "True for buy, false for sell" },
  {
    name: "timestamp",
    type: "int",
    description: "Unix timestamp (if enriched)",
  },
  { name: "_fetched_at", type: "datetime", description: "When this record was fetched" },
];

/** @type {PolymarketConnectColumn[]} */
export const POLYMARKET_MARKETS_CONNECT_COLUMNS = [
  { name: "id", type: "string", description: "Unique market identifier (Gamma API)" },
  { name: "condition_id", type: "string", description: "On-chain condition ID for the market" },
  { name: "question", type: "string", description: "Market question text" },
  { name: "slug", type: "string", description: "URL-friendly market slug" },
  { name: "outcomes", type: "string", description: "JSON-encoded outcome labels" },
  {
    name: "outcome_prices",
    type: "string",
    description: "JSON-encoded outcome prices (0–1 probability per outcome)",
  },
  { name: "clob_token_ids", type: "string", description: "CLOB token IDs for tradable outcomes" },
  { name: "volume", type: "float", description: "Total traded volume" },
  { name: "liquidity", type: "float", description: "Available market liquidity" },
  { name: "active", type: "bool", description: "True if the market is open for trading" },
  { name: "closed", type: "bool", description: "True if the market is closed" },
  { name: "end_date", type: "int", description: "Market end time (Unix timestamp)" },
  { name: "created_at", type: "int", description: "When the market was created (Unix timestamp)" },
  { name: "market_maker_address", type: "string", description: "Market maker wallet address" },
  { name: "_fetched_at", type: "int", description: "When this record was fetched" },
];

/** @type {PolymarketConnectColumn[]} */
export const POLYMARKET_TRADES_CONNECT_COLUMNS = [
  { name: "block_number", type: "int", description: "Polygon block number" },
  { name: "transaction_hash", type: "string", description: "Blockchain transaction hash" },
  { name: "log_index", type: "int", description: "Log index within transaction" },
  { name: "order_hash", type: "string", description: "Unique order identifier" },
  { name: "maker", type: "string", description: "Address of limit order placer" },
  { name: "taker", type: "string", description: "Address that filled the order" },
  { name: "maker_asset_id", type: "int", description: "Asset ID maker provided (0 = USDC)" },
  { name: "taker_asset_id", type: "int", description: "Asset ID taker provided" },
  { name: "maker_amount", type: "int", description: "Amount maker gave (6 decimals)" },
  { name: "taker_amount", type: "int", description: "Amount taker gave (6 decimals)" },
  { name: "fee", type: "int", description: "Trading fee (6 decimals)" },
  { name: "timestamp", type: "int", description: "Unix timestamp (if enriched)" },
  { name: "_fetched_at", type: "datetime", description: "When this record was fetched" },
  {
    name: "_contract",
    type: "string",
    description: "Contract name (CTF Exchange or Neg Risk)",
  },
];

/** @type {PolymarketConnectColumn[]} */
export const POLYMARKET_BLOCKS_CONNECT_COLUMNS = [
  { name: "block_number", type: "int", description: "Polygon block number" },
  {
    name: "timestamp",
    type: "string",
    description: "ISO 8601 timestamp (e.g. 2024-01-15T12:30:00Z)",
  },
];

/** @param {PolymarketConnectColumn | string} col */
export function getPolymarketColumnDisplayLabel(col) {
  const name = typeof col === "string" ? col : col.name;
  const fromCol = typeof col === "object" && col.label ? col.label : null;
  return fromCol || name;
}

/** @param {string} sampleId */
export function getPolymarketConnectColumnsForSample(sampleId) {
  if (sampleId === "athena-pm-markets") return POLYMARKET_MARKETS_CONNECT_COLUMNS;
  if (sampleId === "athena-pm-trades") return POLYMARKET_TRADES_CONNECT_COLUMNS;
  if (sampleId === "athena-pm-blocks") return POLYMARKET_BLOCKS_CONNECT_COLUMNS;
  return [];
}

/** @param {string} sampleId */
export function getPolymarketTableIntro(sampleId) {
  if (sampleId === "athena-pm-markets") return POLYMARKET_TABLE_INTROS.markets;
  if (sampleId === "athena-pm-trades") return POLYMARKET_TABLE_INTROS.trades;
  if (sampleId === "athena-pm-blocks") return POLYMARKET_TABLE_INTROS.blocks;
  return "";
}

/**
 * Extra notes below the intro (price semantics, legacy FPMM reference).
 * @param {string} sampleId
 */
export function getPolymarketTableNotes(sampleId) {
  if (sampleId === "athena-pm-trades") {
    return {
      footnotes: [POLYMARKET_TRADES_PRICE_NOTE],
      legacyIntro: POLYMARKET_LEGACY_TRADES_INTRO,
      legacyColumns: POLYMARKET_LEGACY_TRADES_COLUMNS,
    };
  }
  return null;
}
