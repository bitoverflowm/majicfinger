/**
 * Explicit dataset descriptors for connector results.
 * Meaning comes from the endpoint id the adapter already chose, not from
 * whichever column happens to be numeric.
 */

export const DATASET_TYPES = [
  "candles",
  "trades",
  "price_history",
  "orderbook",
  "quote",
  "spread",
  "tick_size",
  "open_interest",
  "markets",
  "events",
  "series",
  "holders",
  "leaderboard",
  "biggest_wins",
  "positions_open",
  "positions_closed",
  "trader_positions",
  "trader_pnl",
  "trader_activity",
  "holder_trades",
];

const TYPE_SET = new Set(DATASET_TYPES);

const PROBABILITY = { price: "probability", quantity: "shares", currency: "USD", metric: "probability" };

function spec(partial) {
  return {
    shape: "records",
    seriesKeys: [],
    priceBasis: "",
    units: { ...PROBABILITY },
    delivery: "snapshot",
    coverage: "complete",
    scope: "market",
    fields: {},
    required: [],
    ...partial,
    units: { ...PROBABILITY, ...(partial.units || {}) },
    fields: { ...(partial.fields || {}) },
    seriesKeys: partial.seriesKeys || [],
    required: partial.required || [],
  };
}

/** Endpoint id, optionally qualified by exchange, to a descriptor template. */
const ENDPOINTS = {
  "kalshi:candlesticks": spec({
    datasetType: "candles",
    shape: "time_series",
    seriesKeys: ["market_ticker"],
    priceBasis: "trade",
    delivery: "streaming",
    fields: {
      market: "market_ticker",
      time: "end_period_ts",
      open: "price_open_dollars",
      high: "price_high_dollars",
      low: "price_low_dollars",
      close: "price_close_dollars",
      previous: "price_previous_dollars",
      volume: "volume_fp",
    },
    required: ["market_ticker", "end_period_ts", "price_open_dollars", "price_close_dollars"],
  }),
  "kalshi:event_candlesticks": spec({
    datasetType: "candles",
    shape: "time_series",
    scope: "event",
    seriesKeys: ["market_ticker"],
    priceBasis: "trade",
    delivery: "historical",
    fields: {
      market: "market_ticker",
      time: "end_period_ts",
      open: "price_open_dollars",
      high: "price_high_dollars",
      low: "price_low_dollars",
      close: "price_close_dollars",
      volume: "volume_fp",
    },
    required: ["market_ticker", "end_period_ts", "price_close_dollars"],
  }),
  "kalshi:trades": spec({
    datasetType: "trades",
    shape: "time_series",
    seriesKeys: ["ticker"],
    priceBasis: "trade",
    units: { quantity: "contracts" },
    delivery: "streaming",
    fields: { market: "ticker", time: "created_time", price: "yes_price_dollars", size: "count_fp", side: "taker_outcome_side" },
    required: ["ticker", "yes_price_dollars"],
  }),
  "kalshi:orderbook": spec({
    datasetType: "orderbook",
    shape: "snapshot",
    seriesKeys: ["ticker"],
    priceBasis: "bid",
    units: { quantity: "contracts" },
    delivery: "streaming",
    fields: { market: "ticker", price: "price_dollars", size: "quantity_fp", side: "side" },
    required: ["side", "price_dollars", "quantity_fp"],
  }),
  "kalshi:markets": spec({
    datasetType: "markets",
    shape: "records",
    seriesKeys: ["ticker"],
    units: { quantity: "contracts", volume: "contracts" },
    fields: {
      market: "ticker",
      label: "ticker",
      name: "yes_sub_title",
      value: "volume_24h_fp",
      total: "volume_fp",
      status: "status",
      close: "close_time",
      depth: "open_interest_fp",
    },
    required: ["ticker"],
  }),
  "kalshi:events": spec({
    datasetType: "events",
    shape: "records",
    seriesKeys: ["event_ticker"],
    fields: { market: "event_ticker", label: "title", value: "volume_fp" },
    required: ["event_ticker"],
  }),
  "kalshi:series": spec({
    datasetType: "series",
    shape: "records",
    seriesKeys: ["ticker"],
    fields: { market: "ticker", label: "title", category: "category" },
    required: ["ticker"],
  }),
  "kalshi:leaderboard": spec({
    datasetType: "leaderboard",
    category: "stats",
    shape: "ranking",
    seriesKeys: ["nickname"],
    units: { metric: "rank_metric" },
    fields: { label: "nickname", wallet: "social_id", value: "value", rank: "rank", metric: "metric_name", period: "time_period" },
    required: ["nickname", "value"],
  }),
  "kalshi:trades_by_holder": spec({
    datasetType: "holder_trades",
    shape: "records",
    seriesKeys: ["ticker"],
    priceBasis: "trade",
    fields: { market: "ticker", label: "nickname", time: "created_time", price: "yes_price", size: "count_fp", side: "taker_side" },
    required: ["yes_price"],
  }),
  "polymarket:getBatchPricesHistory": spec({
    datasetType: "price_history",
    shape: "time_series",
    seriesKeys: ["token_id"],
    priceBasis: "source",
    delivery: "streaming",
    coverage: "sampled",
    fields: { market: "token_id", outcome: "outcome", time: "t", price: "p" },
    required: ["p"],
  }),
  "polymarket:getTokenPriceHistory": spec({
    datasetType: "price_history",
    shape: "time_series",
    scope: "token",
    seriesKeys: ["token_id", "outcome"],
    priceBasis: "source",
    delivery: "historical",
    coverage: "sampled",
    fields: { market: "token_id", outcome: "outcome", time: "timestamp", price: "price" },
    required: ["price"],
  }),
  "polymarket:getTradesByMarket": spec({
    datasetType: "trades",
    shape: "time_series",
    seriesKeys: ["condition_id", "token_id"],
    priceBasis: "trade",
    delivery: "streaming",
    fields: {
      market: "condition_id",
      outcome: "outcome",
      token: "token_id",
      time: "timestamp",
      price: "price",
      size: "size",
      side: "side",
    },
    required: ["price", "size"],
  }),
  "polymarket:trades": spec({
    datasetType: "trades",
    shape: "time_series",
    seriesKeys: ["condition_id"],
    priceBasis: "trade",
    delivery: "historical",
    fields: { market: "condition_id", outcome: "outcome", time: "timestamp", price: "price", size: "size", side: "side" },
    required: ["price"],
  }),
  "polymarket:getOrderbooks": spec({
    datasetType: "orderbook",
    shape: "snapshot",
    seriesKeys: ["token_id"],
    priceBasis: "source",
    delivery: "streaming",
    fields: { market: "token_id", outcome: "outcome", price: "price", size: "size", side: "side" },
    required: ["side", "price", "size"],
  }),
  "polymarket:getMarketPrices": spec({
    datasetType: "quote",
    shape: "snapshot",
    seriesKeys: ["token_id"],
    priceBasis: "market",
    delivery: "streaming",
    fields: {
      market: "token_id",
      label: "market_title",
      outcome: "outcome",
      bid: "buy_price",
      ask: "sell_price",
      value: "buy_price",
    },
    required: ["buy_price"],
  }),
  "polymarket:getMidpointPrices": spec({
    datasetType: "quote",
    shape: "snapshot",
    seriesKeys: ["token_id"],
    priceBasis: "midpoint",
    delivery: "streaming",
    fields: {
      market: "token_id",
      label: "market_title",
      outcome: "outcome",
      price: "midpoint_price",
      value: "midpoint_price",
    },
    required: ["midpoint_price"],
  }),
  "polymarket:getSpreads": spec({
    datasetType: "spread",
    shape: "snapshot",
    seriesKeys: ["token_id"],
    delivery: "streaming",
    units: { metric: "spread" },
    fields: { market: "token_id", label: "market_title", outcome: "outcome", value: "spread" },
    required: ["spread"],
  }),
  "polymarket:getTickSize": spec({
    datasetType: "tick_size",
    shape: "snapshot",
    seriesKeys: ["token_id"],
    fields: { market: "token_id", label: "market_title", outcome: "outcome", value: "minimum_tick_size" },
    required: ["minimum_tick_size"],
  }),
  "polymarket:getLastTradePrices": spec({
    datasetType: "quote",
    shape: "snapshot",
    seriesKeys: ["token_id"],
    priceBasis: "trade",
    delivery: "streaming",
    fields: {
      market: "token_id",
      label: "market_title",
      outcome: "outcome",
      price: "last_trade_price",
      value: "last_trade_price",
      side: "last_trade_side",
    },
    required: ["last_trade_price"],
  }),
  "polymarket:getOpenInterestCompose": spec({
    datasetType: "open_interest",
    shape: "snapshot",
    seriesKeys: ["condition_id"],
    units: { metric: "open_interest", quantity: "USDC" },
    fields: { market: "condition_id", value: "value" },
    required: ["value"],
  }),
  "polymarket:getMarkets": spec({
    datasetType: "markets",
    shape: "records",
    seriesKeys: ["conditionId", "question"],
    fields: { market: "conditionId", label: "question", value: "volume24hr", icon: "image", status: "closed" },
    required: ["question"],
  }),
  "polymarket:getSamplingMarkets": spec({
    datasetType: "markets",
    shape: "records",
    seriesKeys: ["condition_id"],
    coverage: "sampled",
    fields: { market: "condition_id", label: "question", value: "volume24hr", icon: "image" },
    required: ["question"],
  }),
  "polymarket:getMarketsByEvents": spec({
    datasetType: "markets",
    shape: "records",
    seriesKeys: ["conditionId"],
    fields: { market: "conditionId", label: "question", value: "volume24hr", icon: "image", status: "closed" },
    required: ["question"],
  }),
  "polymarket:markets": spec({
    datasetType: "markets",
    shape: "records",
    seriesKeys: ["condition_id", "question"],
    delivery: "historical",
    fields: { market: "condition_id", label: "question", value: "volume", status: "closed" },
    required: ["question"],
  }),
  "polymarket:getEvents": spec({
    datasetType: "events",
    shape: "records",
    seriesKeys: ["id"],
    fields: { market: "id", label: "title", value: "volume24hr", icon: "image", status: "closed" },
    required: ["title"],
  }),
  "polymarket:events": spec({
    datasetType: "events",
    shape: "records",
    seriesKeys: ["id"],
    fields: { market: "id", label: "title", value: "volume24hr", icon: "image" },
    required: ["title"],
  }),
  "polymarket:series": spec({
    datasetType: "series",
    shape: "records",
    seriesKeys: ["series:id"],
    fields: {
      market: "series:id",
      label: "series:title",
      value: "series:volume24hr",
      icon: "series:image",
      status: "series:closed",
    },
    required: ["series:title"],
  }),
  "polymarket:getHoldersByMarkets": spec({
    datasetType: "holders",
    shape: "ranking",
    seriesKeys: ["token_id", "outcome"],
    fields: { label: "name", wallet: "proxy_wallet", value: "amount", market: "market_title", outcome: "outcome" },
    required: ["amount"],
  }),
  "polymarket:getTraderLeaderboard": spec({
    datasetType: "leaderboard",
    category: "stats",
    shape: "ranking",
    seriesKeys: ["user_id"],
    units: { metric: "usdc" },
    fields: {
      label: "user_name",
      wallet: "user_id",
      value: "pnl",
      rank: "rank",
      volume: "volume",
      avatar: "profile_image",
      handle: "x_username",
      verified: "verified",
    },
    required: ["pnl"],
  }),
  "polymarket:getBiggestWinners": spec({
    datasetType: "biggest_wins",
    category: "stats",
    shape: "ranking",
    seriesKeys: ["position_id"],
    units: { metric: "usdc" },
    fields: {
      label: "user_name",
      wallet: "user_id",
      value: "pnl",
      rank: "win_rank",
      avatar: "profile_image",
      event: "event_title",
      kind: "kind",
      stake: "initial_value",
      resolved: "resolved_at",
    },
    required: ["pnl"],
  }),
  "polymarket:getTraderPnlSeries": spec({
    datasetType: "trader_pnl",
    category: "portfolio",
    shape: "records",
    seriesKeys: [],
    units: { metric: "usdc" },
    fields: { time: "timestamp", value: "economic_pnl", basis: "realized_pnl" },
    required: ["timestamp", "economic_pnl"],
  }),
  "polymarket:getTraderActivity": spec({
    datasetType: "trader_activity",
    shape: "records",
    seriesKeys: [],
    units: { metric: "usdc" },
    fields: {
      time: "timestamp",
      type: "type",
      label: "title",
      outcome: "outcome",
      side: "side",
      size: "size",
      value: "usdc_size",
      price: "price",
      icon: "icon",
      name: "name",
      avatar: "profile_image",
      combo: "is_combo",
    },
    required: ["timestamp", "type"],
  }),
  "polymarket:getTraderPositions": spec({
    datasetType: "trader_positions",
    category: "portfolio",
    shape: "ranking",
    seriesKeys: ["condition_id", "outcome"],
    units: { metric: "usdc" },
    fields: {
      label: "title",
      outcome: "outcome",
      status: "status",
      icon: "icon",
      size: "current_size",
      value: "current_value",
      pnl: "unrealized_pnl",
    },
    required: ["current_value", "unrealized_pnl"],
  }),
  "polymarket:getCurrentPositions": spec({
    datasetType: "positions_open",
    shape: "ranking",
    seriesKeys: ["conditionId", "outcome"],
    fields: { label: "title", outcome: "outcome", value: "currentValue", size: "size", price: "avgPrice", pnl: "cashPnl" },
    required: ["currentValue"],
  }),
  "polymarket:getClosedPositions": spec({
    datasetType: "positions_closed",
    shape: "ranking",
    seriesKeys: ["conditionId"],
    fields: { label: "title", outcome: "outcome", value: "realizedPnl" },
    required: ["realizedPnl"],
  }),
  "polymarket:getHolderTrades": spec({
    datasetType: "holder_trades",
    shape: "records",
    seriesKeys: ["conditionId"],
    priceBasis: "trade",
    fields: { market: "conditionId", outcome: "outcome", time: "timestamp", price: "price", size: "size", side: "side" },
    required: ["price", "size", "side"],
  }),
  "kalshiHistorical:markets": spec({
    datasetType: "markets",
    shape: "records",
    seriesKeys: ["ticker"],
    delivery: "historical",
    units: { quantity: "contracts", volume: "contracts" },
    fields: { market: "ticker", label: "title", value: "volume", status: "status", close: "close_time", depth: "open_interest" },
    required: ["ticker"],
  }),
  "kalshiHistorical:trades": spec({
    datasetType: "trades",
    shape: "time_series",
    seriesKeys: ["ticker"],
    priceBasis: "trade",
    units: { quantity: "contracts" },
    delivery: "historical",
    fields: { market: "ticker", time: "created_time", price: "yes_price", size: "count", side: "taker_side" },
    required: ["ticker", "yes_price"],
  }),
  "polymarket:parent-market": spec({
    datasetType: "markets",
    shape: "snapshot",
    scope: "market",
    seriesKeys: ["condition_id"],
    fields: { market: "condition_id", label: "question", value: "volume" },
    required: ["question"],
  }),
};

function familyOf(integrationId) {
  const id = String(integrationId || "").toLowerCase();
  if (id.includes("polymarket")) return "polymarket";
  if (id.includes("kalshi")) return "kalshi";
  return "";
}

function deliveryFor(template, integrationId) {
  const id = String(integrationId || "").toLowerCase();
  if (id.includes("historical")) return template.delivery === "snapshot" ? "snapshot" : "historical";
  return template.delivery;
}

/**
 * @param {string} table
 * @param {string} [integrationId]
 */
export function templateForEndpoint(table, integrationId) {
  const id = String(table || "").trim();
  if (!id) return null;
  const family = familyOf(integrationId);
  const qualified = ENDPOINTS[`${String(integrationId || "").trim()}:${id}`] || (family ? ENDPOINTS[`${family}:${id}`] : null);
  const unique = !family
    ? Object.keys(ENDPOINTS).filter((key) => key.endsWith(`:${id}`))
    : [];
  const template = qualified || ENDPOINTS[id] || (unique.length === 1 ? ENDPOINTS[unique[0]] : null);
  if (!template || !TYPE_SET.has(template.datasetType)) return null;
  return {
    ...template,
    units: { ...template.units },
    fields: { ...template.fields },
    seriesKeys: [...template.seriesKeys],
    required: [...template.required],
    delivery: deliveryFor(template, integrationId),
    sourceTable: id,
  };
}

/**
 * Field id for a sheet column. A resized grid can persist the title without the id;
 * the title is the same words as the field, so it still maps back.
 */
export function columnKey(column) {
  const id = String(column?.id || column?.name || "").trim();
  if (id) return id;
  const title = String(column?.title || "").trim();
  if (!title) return "";
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function columnIds(sheet) {
  return new Set((sheet?.columns || []).map((column) => columnKey(column)).filter(Boolean));
}

/** A saved descriptor still fits when its label, value, price, and series keys are columns on the sheet. */
function descriptorFitsSheet(sheet, dataset) {
  const ids = columnIds(sheet);
  if (!ids.size) return true;
  const fields = dataset?.fields || {};
  if (fields.label && !ids.has(fields.label)) return false;
  if (fields.value && !ids.has(fields.value)) return false;
  if (fields.price && !ids.has(fields.price)) return false;
  if (fields.bid && !ids.has(fields.bid)) return false;
  if (fields.ask && !ids.has(fields.ask)) return false;
  const keys = (dataset?.seriesKeys || []).filter(Boolean);
  if (keys.length && keys.every((key) => !ids.has(key))) return false;
  return true;
}

/**
 * Distinct combinations of the descriptor's own series keys.
 * An empty key list means the endpoint is already one subject.
 * @param {object | null | undefined} sheet
 * @param {string[]} keys
 */
export function countSeries(sheet, keys) {
  const wanted = (keys || []).filter(Boolean);
  if (!wanted.length) return 1;
  const ids = columnIds(sheet);
  const present = wanted.filter((key) => ids.has(key));
  if (!present.length) return 1;
  const seen = new Set();
  for (const row of sheetRecords(sheet)) {
    const parts = present.map((key) => String(row?.[key] ?? "").trim());
    if (parts.every((part) => !part)) continue;
    seen.add(parts.join("\u0001"));
  }
  return seen.size || 1;
}

/**
 * @param {object | null | undefined} sheet
 */
export function describeSheet(sheet) {
  if (!sheet || sheet.type === "chart") return null;
  const table = String(sheet.table || sheet.pull?.table || "").trim();
  const template = templateForEndpoint(table, sheet.integrationId || sheet.provenance?.integrationId);
  const stamped = sheet.dataset;
  if (stamped && TYPE_SET.has(stamped.datasetType) && stamped.sourceTable && descriptorFitsSheet(sheet, stamped)) {
    return {
      ...stamped,
      units: { ...PROBABILITY, ...(template?.units || {}), ...(stamped.units || {}) },
      fields: { ...(stamped.fields || {}) },
      seriesKeys: [...(stamped.seriesKeys || [])],
      required: [...(stamped.required || [])],
      seriesCount: countSeries(sheet, stamped.seriesKeys),
    };
  }
  if (!template) return null;
  return { ...template, seriesCount: countSeries(sheet, template.seriesKeys) };
}

/** Rows keyed by the sheet's own column ids. Stored records win over the formatted grid. */
export function sheetRecords(sheet) {
  if (Array.isArray(sheet?.records) && sheet.records.length) return sheet.records;
  const columns = Array.isArray(sheet?.columns) ? sheet.columns : [];
  const cells = sheet?.cells && typeof sheet.cells === "object" ? sheet.cells : {};
  const rowIndexes = new Set();
  for (const key of Object.keys(cells)) {
    const row = Number(String(key).split(",")[1]);
    if (Number.isFinite(row)) rowIndexes.add(row);
  }
  return [...rowIndexes].sort((a, b) => a - b).map((row) => {
    const record = {};
    columns.forEach((column, index) => {
      const id = columnKey(column);
      if (id) record[id] = cells[`${index},${row}`];
    });
    return record;
  });
}

/** Filled observations of the descriptor's price, close, or value field. */
export function countObservations(sheet, dataset) {
  const field = dataset?.fields?.price || dataset?.fields?.close || dataset?.fields?.value;
  const records = sheetRecords(sheet);
  if (!field) return records.length;
  const fallback = dataset?.fields?.close ? dataset.fields.previous : "";
  const filled = (row, key) => Boolean(key) && String(row?.[key] ?? "").trim() !== "";
  return records.filter((row) => filled(row, field) || filled(row, fallback)).length;
}

/** Attach the endpoint descriptor onto a sheet that is about to be saved. */
export function stampDataset(sheet) {
  const dataset = describeSheet({ ...sheet, dataset: undefined });
  if (!dataset) return sheet;
  const { seriesCount, ...stored } = dataset;
  return { ...sheet, dataset: stored };
}

/**
 * Convert an explicit price scale into a 0–1 probability.
 * Cent fields are converted only when the adapter says the column is cents.
 * @param {number} value
 * @param {"probability" | "cents"} scale
 */
export function toProbability(value, scale) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (scale === "cents") return n / 100;
  return n;
}

/**
 * Digits required so every price in the book keeps a distinct cent label.
 * @param {number[]} prices 0–1 probabilities
 */
export function centsDigits(prices) {
  const values = (prices || []).filter((price) => Number.isFinite(price));
  for (let digits = 1; digits <= 4; digits += 1) {
    const labels = values.map((price) => (price * 100).toFixed(digits));
    if (new Set(labels).size === labels.length) return digits;
  }
  return 4;
}

/**
 * @param {number} probability
 * @param {number} [digits]
 */
export function formatCents(probability, digits = 1) {
  if (!Number.isFinite(probability)) return "—";
  return `${(probability * 100).toFixed(digits)}¢`;
}

/**
 * @param {number} probability
 */
export function formatProbability(probability) {
  if (!Number.isFinite(probability)) return "—";
  const percent = probability * 100;
  const abs = Math.abs(percent);
  const digits = abs > 0 && abs < 1 ? 2 : 1;
  return `${percent.toFixed(digits)}%`;
}

/**
 * Holder rows label the person, never the repeated market question.
 * @param {Record<string, unknown>} row
 * @param {{ label?: string, wallet?: string }} fields
 */
export function holderLabel(row, fields) {
  const name = String(row?.[fields?.label || "name"] ?? "").trim();
  if (name) return name;
  const wallet = String(row?.[fields?.wallet || "proxy_wallet"] ?? "").trim();
  return wallet;
}

/**
 * YES bids stay bids. NO bids become YES asks at 1 − price, with the same quantity.
 * @param {{ side: string, price: number, size: number }[]} levels
 */
export function kalshiYesBook(levels) {
  const bids = new Map();
  const asks = new Map();
  for (const level of levels || []) {
    const side = String(level?.side || "").trim().toLowerCase();
    const price = Number(level?.price);
    const size = Number(level?.size);
    if (!Number.isFinite(price) || !Number.isFinite(size) || size <= 0) continue;
    if (side === "yes" || side === "bid") {
      bids.set(price, (bids.get(price) || 0) + size);
      continue;
    }
    if (side === "no") {
      const ask = Math.round((1 - price) * 10000) / 10000;
      if (ask <= 0) continue;
      asks.set(ask, (asks.get(ask) || 0) + size);
    }
  }
  const bidLevels = [...bids.entries()].map(([price, size]) => ({ price, size })).sort((a, b) => b.price - a.price);
  const askLevels = [...asks.entries()].map(([price, size]) => ({ price, size })).sort((a, b) => a.price - b.price);
  const bestBid = bidLevels[0]?.price;
  const bestAsk = askLevels[0]?.price;
  const spread = bestBid != null && bestAsk != null ? Math.round((bestAsk - bestBid) * 10000) / 10000 : null;
  return { bids: bidLevels, asks: askLevels, spread };
}

/**
 * One close series per market. Missing closes are skipped, not filled with zero.
 * @param {Record<string, unknown>[]} rows
 * @param {{ market: string, time: string, close: string }} fields
 */
export function eventCloseSeries(rows, fields) {
  const groups = new Map();
  for (const row of rows || []) {
    const market = String(row?.[fields.market] ?? "").trim();
    if (!market) continue;
    const close = row?.[fields.close];
    if (close == null || close === "") continue;
    const price = Number(close);
    const time = Number(row?.[fields.time]);
    if (!Number.isFinite(price) || !Number.isFinite(time)) continue;
    if (!groups.has(market)) groups.set(market, []);
    groups.get(market).push({ t: time, price });
  }
  return [...groups.entries()].map(([market, points]) => ({
    market,
    points: points.sort((a, b) => a.t - b.t),
  }));
}

/**
 * @param {{ coverage?: string, datasetType?: string }} dataset
 * @param {{ shown: number, loaded: number, noun: string }} detail
 */
export function partialCaption(dataset, detail) {
  if (dataset?.coverage === "sampled") return "Sampled prices";
  if (dataset?.coverage === "partial") {
    return `Top ${detail.shown} of loaded ${detail.noun}`;
  }
  return "";
}
