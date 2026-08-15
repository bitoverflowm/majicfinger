/**
 * Polymarket Live — Orderbook(s) (CLOB GET /book + POST /books).
 * Discovers markets via NL search or advanced list filters, then resolves CLOB token ids.
 */

import {
  emptyPolymarketMarketsComposeState,
  normalizePolymarketMarketsComposeState,
} from "@/lib/polymarketLive/marketsCompose";

/** @typedef {"search" | "advanced"} PolymarketOrderbooksComposeMode */

/** @typedef {"both" | "buy" | "sell"} PolymarketOrderbooksSideFilter */

/**
 * @typedef {"per_market" | "meta_plus_per_market"} PolymarketOrderbooksSheetLayout
 */

/**
 * @typedef {{
 *   id: string;
 *   slug?: string;
 *   conditionId?: string;
 *   title?: string;
 *   tokenIds?: string[];
 *   outcomes?: string[];
 * }} PolymarketOrderbooksMarketRef
 */

/**
 * @typedef {{
 *   mode: PolymarketOrderbooksComposeMode;
 *   side: PolymarketOrderbooksSideFilter;
 *   marketRefs: PolymarketOrderbooksMarketRef[];
 *   sheetLayout: PolymarketOrderbooksSheetLayout;
 *   marketsFilters: import("@/lib/polymarketLive/marketsCompose").PolymarketMarketsComposeState;
 * }} PolymarketOrderbooksComposeState
 */

export const POLYMARKET_ORDERBOOKS_ENDPOINT_ID = "getOrderbooks";

export const POLYMARKET_ORDERBOOKS_SHEET_LAYOUT_PER_MARKET =
  /** @type {PolymarketOrderbooksSheetLayout} */ ("per_market");
export const POLYMARKET_ORDERBOOKS_SHEET_LAYOUT_META_PLUS_PER_MARKET =
  /** @type {PolymarketOrderbooksSheetLayout} */ ("meta_plus_per_market");

export const POLYMARKET_ORDERBOOKS_SHEET_LAYOUT_OPTIONS = [
  {
    value: POLYMARKET_ORDERBOOKS_SHEET_LAYOUT_META_PLUS_PER_MARKET,
    label: "Market metadata + one orderbook sheet per market",
    description:
      "Sheet 1 lists every matched market. Then each market gets its own orderbook sheet (Yes/No levels together).",
  },
  {
    value: POLYMARKET_ORDERBOOKS_SHEET_LAYOUT_PER_MARKET,
    label: "One orderbook sheet per market",
    description: "Skip the metadata sheet and put each market’s orderbook on its own sheet.",
  },
];

export const POLYMARKET_ORDERBOOKS_SIDE_OPTIONS = [
  {
    value: /** @type {PolymarketOrderbooksSideFilter} */ ("both"),
    label: "Buy and Sell",
    description: "Include bids (Buy) and asks (Sell).",
  },
  {
    value: /** @type {PolymarketOrderbooksSideFilter} */ ("buy"),
    label: "Buy only",
    description: "Include bid levels only.",
  },
  {
    value: /** @type {PolymarketOrderbooksSideFilter} */ ("sell"),
    label: "Sell only",
    description: "Include ask levels only.",
  },
];

export const POLYMARKET_ORDERBOOKS_COMPOSE_COLUMNS = [
  { name: "side", type: "string", description: "BUY (bid) or SELL (ask)" },
  { name: "price", type: "number", description: "Order price" },
  { name: "size", type: "number", description: "Order size" },
  { name: "token_id", type: "string", description: "CLOB outcome token id" },
  { name: "outcome", type: "string", description: "Outcome label (Yes/No) when known" },
  { name: "market", type: "string", description: "Market condition id" },
  { name: "asset_id", type: "string", description: "Asset id from orderbook response" },
  { name: "timestamp", type: "string", description: "Orderbook snapshot timestamp" },
  { name: "hash", type: "string", description: "Orderbook hash" },
  { name: "min_order_size", type: "string", description: "Minimum order size" },
  { name: "tick_size", type: "string", description: "Tick size" },
  { name: "neg_risk", type: "boolean", description: "Negative risk enabled" },
  { name: "last_trade_price", type: "string", description: "Last trade price" },
  { name: "market_id", type: "string", description: "Gamma market id" },
  { name: "market_slug", type: "string", description: "Market slug" },
  { name: "market_title", type: "string", description: "Market question / title" },
  { name: "condition_id", type: "string", description: "Condition id (from market discovery)" },
];

export const POLYMARKET_ORDERBOOKS_DEFAULT_COLUMNS = [
  "side",
  "price",
  "size",
  "outcome",
  "token_id",
  "market_title",
  "market",
  "last_trade_price",
  "tick_size",
];

export const POLYMARKET_ORDERBOOKS_METADATA_COLUMNS = [
  { name: "id", type: "string", description: "Gamma market id" },
  { name: "question", type: "string", description: "Market question" },
  { name: "conditionId", type: "string", description: "Condition id" },
  { name: "slug", type: "string", description: "Market slug" },
  { name: "active", type: "boolean", description: "Active" },
  { name: "closed", type: "boolean", description: "Closed" },
  { name: "outcomes", type: "string", description: "Outcomes" },
  { name: "clobTokenIds", type: "string", description: "CLOB token ids" },
  { name: "volume", type: "number", description: "Volume" },
  { name: "liquidity", type: "number", description: "Liquidity" },
  { name: "bestBid", type: "number", description: "Best bid" },
  { name: "bestAsk", type: "number", description: "Best ask" },
  { name: "endDate", type: "string", description: "End date" },
];

export const POLYMARKET_ORDERBOOKS_METADATA_DEFAULT_COLUMNS = [
  "id",
  "question",
  "conditionId",
  "slug",
  "active",
  "closed",
  "outcomes",
  "clobTokenIds",
];

/**
 * @param {unknown} raw
 * @returns {PolymarketOrderbooksSheetLayout}
 */
export function normalizePolymarketOrderbooksSheetLayout(raw) {
  if (raw === POLYMARKET_ORDERBOOKS_SHEET_LAYOUT_PER_MARKET) {
    return POLYMARKET_ORDERBOOKS_SHEET_LAYOUT_PER_MARKET;
  }
  return POLYMARKET_ORDERBOOKS_SHEET_LAYOUT_META_PLUS_PER_MARKET;
}

/**
 * @param {unknown} raw
 * @returns {PolymarketOrderbooksSideFilter}
 */
export function normalizePolymarketOrderbooksSide(raw) {
  if (raw === "buy" || raw === "sell") return raw;
  return "both";
}

/**
 * @returns {PolymarketOrderbooksComposeState}
 */
export function emptyPolymarketOrderbooksComposeState() {
  return {
    mode: "search",
    side: "both",
    marketRefs: [],
    sheetLayout: POLYMARKET_ORDERBOOKS_SHEET_LAYOUT_META_PLUS_PER_MARKET,
    marketsFilters: {
      ...emptyPolymarketMarketsComposeState(),
      mode: "advanced",
    },
  };
}

/**
 * @param {unknown} raw
 * @returns {PolymarketOrderbooksComposeState}
 */
export function normalizePolymarketOrderbooksComposeState(raw) {
  const base = emptyPolymarketOrderbooksComposeState();
  if (!raw || typeof raw !== "object") return base;
  const o = /** @type {Record<string, unknown>} */ (raw);
  const mode = o.mode === "advanced" ? "advanced" : "search";
  const marketRefs = Array.isArray(o.marketRefs)
    ? o.marketRefs
        .map((r) => {
          if (!r || typeof r !== "object") return null;
          const row = /** @type {Record<string, unknown>} */ (r);
          const id = String(row.id || "").trim();
          const slug = String(row.slug || "").trim();
          const conditionId = String(row.conditionId || "").trim();
          const tokenIds = parseTokenIdList(row.tokenIds ?? row.clobTokenIds ?? row.tokenId);
          if (!id && !slug && !conditionId && !tokenIds.length) return null;
          const outcomes = parseOutcomeList(row.outcomes);
          return {
            id,
            slug: slug || undefined,
            conditionId: conditionId || undefined,
            title: String(row.title || "").trim() || undefined,
            tokenIds: tokenIds.length ? tokenIds : undefined,
            outcomes: outcomes.length ? outcomes : undefined,
          };
        })
        .filter(Boolean)
    : [];

  return {
    mode,
    side: normalizePolymarketOrderbooksSide(o.side),
    marketRefs: /** @type {PolymarketOrderbooksMarketRef[]} */ (marketRefs),
    sheetLayout: normalizePolymarketOrderbooksSheetLayout(o.sheetLayout),
    marketsFilters: normalizePolymarketMarketsComposeState({
      ...(o.marketsFilters && typeof o.marketsFilters === "object" ? o.marketsFilters : {}),
      mode: "advanced",
    }),
  };
}

/**
 * @param {unknown} value
 * @returns {string[]}
 */
export function parseTokenIdList(value) {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.map((v) => String(v ?? "").trim()).filter(Boolean);
  }
  const s = String(value).trim();
  if (!s) return [];
  try {
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed)) {
      return parsed.map((v) => String(v ?? "").trim()).filter(Boolean);
    }
  } catch {
    /* csv */
  }
  return s
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * @param {unknown} value
 * @returns {string[]}
 */
export function parseOutcomeList(value) {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.map((v) => String(v ?? "").trim()).filter(Boolean);
  }
  const s = String(value).trim();
  if (!s) return [];
  try {
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed)) {
      return parsed.map((v) => String(v ?? "").trim()).filter(Boolean);
    }
  } catch {
    /* csv */
  }
  return s
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * @param {import("@/lib/polymarketLive/polymarketPublicSearch").PolymarketPublicSearchSuggestion | null | undefined} suggestion
 * @returns {PolymarketOrderbooksMarketRef | null}
 */
export function orderbooksMarketRefFromSuggestion(suggestion) {
  if (!suggestion) return null;
  const raw =
    suggestion.raw && typeof suggestion.raw === "object"
      ? /** @type {Record<string, unknown>} */ (suggestion.raw)
      : {};
  const id = String(suggestion.id || raw.id || "").trim();
  const slug = String(suggestion.slug || raw.slug || "").trim();
  const conditionId = String(
    suggestion.conditionId || raw.conditionId || raw.condition_id || "",
  ).trim();
  const title = String(suggestion.title || raw.question || raw.groupItemTitle || "").trim();
  const tokenIds = parseTokenIdList(
    suggestion.tokenId || raw.tokenId || raw.clobTokenId || raw.clobTokenIds || raw.clob_token_ids,
  );
  const outcomes = parseOutcomeList(raw.outcomes || raw.outcome);
  if (!id && !slug && !conditionId && !tokenIds.length) return null;
  return {
    id,
    slug: slug || undefined,
    conditionId: conditionId || undefined,
    title: title || undefined,
    tokenIds: tokenIds.length ? tokenIds : undefined,
    outcomes: outcomes.length ? outcomes : undefined,
  };
}

/**
 * @param {unknown} marketRow
 * @returns {PolymarketOrderbooksMarketRef | null}
 */
export function orderbooksMarketRefFromListMarketsRow(marketRow) {
  if (!marketRow || typeof marketRow !== "object") return null;
  const row = /** @type {Record<string, unknown>} */ (marketRow);
  const id = String(row.id || "").trim();
  const slug = String(row.slug || "").trim();
  const conditionId = String(row.conditionId || row.condition_id || "").trim();
  const title = String(row.question || row.groupItemTitle || row.title || "").trim();
  /** @type {string[]} */
  const tokenIds = [...parseTokenIdList(row.clobTokenIds || row.clob_token_ids)];
  // sampling / CLOB markets use tokens: [{ token_id, outcome }]
  if (Array.isArray(row.tokens) && !tokenIds.length) {
    for (const t of row.tokens) {
      if (t && typeof t === "object") {
        const tid = String(/** @type {Record<string, unknown>} */ (t).token_id || "").trim();
        if (tid) tokenIds.push(tid);
      }
    }
  }
  /** @type {string[]} */
  const outcomes = [...parseOutcomeList(row.outcomes)];
  if (Array.isArray(row.tokens) && !outcomes.length) {
    for (const t of row.tokens) {
      if (t && typeof t === "object") {
        const outcome = String(/** @type {Record<string, unknown>} */ (t).outcome || "").trim();
        if (outcome) outcomes.push(outcome);
      }
    }
  }
  if (!id && !slug && !conditionId && !tokenIds.length) return null;
  return {
    id,
    slug: slug || undefined,
    conditionId: conditionId || undefined,
    title: title || undefined,
    tokenIds: tokenIds.length ? tokenIds : undefined,
    outcomes: outcomes.length ? outcomes : undefined,
  };
}

/**
 * @param {PolymarketOrderbooksSheetLayout} layout
 * @returns {boolean}
 */
export function orderbooksLayoutIncludesMetadata(layout) {
  return (
    normalizePolymarketOrderbooksSheetLayout(layout) ===
    POLYMARKET_ORDERBOOKS_SHEET_LAYOUT_META_PLUS_PER_MARKET
  );
}

/**
 * @param {unknown} marketRow
 * @param {string[]} [selectedColumns]
 * @returns {Record<string, unknown>}
 */
export function projectOrderbooksMarketMetadataRow(marketRow, selectedColumns) {
  const row =
    marketRow && typeof marketRow === "object"
      ? /** @type {Record<string, unknown>} */ (marketRow)
      : {};
  const preferred = Array.isArray(selectedColumns)
    ? selectedColumns.map((c) => String(c || "").trim()).filter(Boolean)
    : [];
  const cols =
    preferred.length > 0 ? preferred : POLYMARKET_ORDERBOOKS_METADATA_DEFAULT_COLUMNS;
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const key of cols) {
    if (!(key in row)) continue;
    const v = row[key];
    if (v != null && typeof v === "object") {
      try {
        out[key] = JSON.stringify(v);
      } catch {
        out[key] = String(v);
      }
    } else {
      out[key] = v;
    }
  }
  for (const key of ["id", "question", "conditionId", "slug"]) {
    if (out[key] == null && row[key] != null) out[key] = row[key];
  }
  return out;
}

/**
 * @param {unknown} book
 * @param {{
 *   side?: PolymarketOrderbooksSideFilter;
 *   marketMeta?: PolymarketOrderbooksMarketRef | Record<string, unknown> | null;
 *   selectedColumns?: string[];
 * }} [opts]
 * @returns {Record<string, unknown>[]}
 */
export function expandOrderBookSummaryToRows(book, opts = {}) {
  if (!book || typeof book !== "object") return [];
  const summary = /** @type {Record<string, unknown>} */ (book);
  const side = normalizePolymarketOrderbooksSide(opts.side);
  const meta =
    opts.marketMeta && typeof opts.marketMeta === "object"
      ? /** @type {Record<string, unknown>} */ (opts.marketMeta)
      : {};
  const tokenIds = parseTokenIdList(meta.tokenIds || meta.clobTokenIds);
  const outcomes = parseOutcomeList(meta.outcomes);
  const assetId = String(summary.asset_id || summary.assetId || "").trim();
  let outcome = "";
  if (assetId && tokenIds.length) {
    const idx = tokenIds.findIndex((t) => t === assetId);
    if (idx >= 0 && outcomes[idx]) outcome = outcomes[idx];
  }

  const stamp = {
    market: String(summary.market || meta.conditionId || "").trim(),
    asset_id: assetId,
    token_id: assetId,
    outcome,
    timestamp: summary.timestamp != null ? String(summary.timestamp) : "",
    hash: summary.hash != null ? String(summary.hash) : "",
    min_order_size:
      summary.min_order_size != null ? String(summary.min_order_size) : "",
    tick_size: summary.tick_size != null ? String(summary.tick_size) : "",
    neg_risk: summary.neg_risk,
    last_trade_price:
      summary.last_trade_price != null ? String(summary.last_trade_price) : "",
    market_id: String(meta.id || meta.market_id || "").trim(),
    market_slug: String(meta.slug || meta.market_slug || "").trim(),
    market_title: String(meta.title || meta.question || meta.market_title || "").trim(),
    condition_id: String(
      meta.conditionId || meta.condition_id || summary.market || "",
    ).trim(),
  };

  /** @type {Array<{ side: string; price: unknown; size: unknown }>} */
  const levels = [];
  if (side === "both" || side === "buy") {
    const bids = Array.isArray(summary.bids) ? summary.bids : [];
    for (const level of bids) {
      if (!level || typeof level !== "object") continue;
      const L = /** @type {Record<string, unknown>} */ (level);
      levels.push({ side: "BUY", price: L.price, size: L.size });
    }
  }
  if (side === "both" || side === "sell") {
    const asks = Array.isArray(summary.asks) ? summary.asks : [];
    for (const level of asks) {
      if (!level || typeof level !== "object") continue;
      const L = /** @type {Record<string, unknown>} */ (level);
      levels.push({ side: "SELL", price: L.price, size: L.size });
    }
  }

  const selected = Array.isArray(opts.selectedColumns)
    ? opts.selectedColumns.map((c) => String(c || "").trim()).filter(Boolean)
    : [];
  const selectedSet = selected.length ? new Set(selected) : null;

  return levels.map((level) => {
    const row = { ...stamp, ...level };
    if (!selectedSet) return row;
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const k of Object.keys(row)) {
      if (selectedSet.has(k)) out[k] = row[k];
    }
    return out;
  });
}
