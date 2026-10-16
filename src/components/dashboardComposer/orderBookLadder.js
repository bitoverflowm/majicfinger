/** Turn a Kalshi order-book sheet into a bid/ask ladder. A no bid at X is a yes ask at 1−X. */

import { parseVisualNumber as parseChartNumber } from "@/lib/visualizations/visualTable";

function findColumn(columns, test) {
  return (columns || []).findIndex((column) =>
    test(String(column?.title || "").trim().toLowerCase(), String(column?.id || "").trim().toLowerCase()),
  );
}

function dollars(value) {
  return Math.round(value * 10000) / 10000;
}

function outcomeKind(value) {
  const text = String(value || "").trim().toLowerCase();
  if (text === "yes") return "yes";
  if (text === "no") return "no";
  return "";
}

function rowsHaveYesAndNo(rows, outcomeIndex) {
  if (outcomeIndex < 0) return false;
  let yes = false;
  let no = false;
  for (const row of rows || []) {
    const kind = outcomeKind(row?.[outcomeIndex]);
    if (kind === "yes") yes = true;
    if (kind === "no") no = true;
    if (yes && no) return true;
  }
  return false;
}

function accumulate(levels) {
  let total = 0;
  return levels.map((level) => {
    total += level.size;
    return { price: level.price, size: level.size, total };
  });
}

/**
 * @param {object | null | undefined} sheet
 */
export function isOrderBookSheet(sheet) {
  if (!sheet || sheet.type === "chart") return false;
  const table = String(sheet.table || "");
  if (table === "orderbook" || table === "getOrderbooks") return true;
  if (
    table === "trades" ||
    table === "getTradesByMarket" ||
    table === "trades_by_holder" ||
    table === "getHolderTrades"
  ) {
    return false;
  }
  const title = String(sheet.title || "");
  if (/^order\s*books?/i.test(title)) return true;
  if (/^trade history\b/i.test(title) || /^trades\s·/i.test(title)) return false;
  const ids = new Set((sheet.columns || []).map((column) => String(column?.id || "").toLowerCase()));
  const titles = new Set((sheet.columns || []).map((column) => String(column?.title || "").trim().toLowerCase()));
  const side = ids.has("side") || titles.has("side");
  const price = ids.has("price") || ids.has("price_dollars") || titles.has("price") || titles.has("price dollars");
  const qty = ids.has("size") || ids.has("quantity_fp") || titles.has("size") || titles.has("quantity fp");
  return side && price && qty;
}

function bookIndexes(columns) {
  return {
    sideIndex: findColumn(columns, (title, id) => id === "side" || title === "side"),
    priceIndex: findColumn(
      columns,
      (title, id) => id === "price" || id === "price_dollars" || title === "price" || title === "price dollars",
    ),
    sizeIndex: findColumn(
      columns,
      (title, id) => id === "quantity_fp" || id === "size" || title === "quantity fp" || title === "size" || title.includes("quantity"),
    ),
    outcomeIndex: findColumn(columns, (title, id) => id === "outcome" || title === "outcome"),
  };
}

function addLevel(map, price, size) {
  const level = dollars(price);
  if (level <= 0) return;
  map.set(level, (map.get(level) || 0) + size);
}

/** A mirrored complement is the same order on the other token. Keep the larger size. */
function raiseLevel(map, price, size) {
  const level = dollars(price);
  if (level <= 0) return;
  const current = map.get(level) || 0;
  if (size > current) map.set(level, size);
}

function finishBook(bids, asks) {
  const bidLevels = accumulate([...bids.entries()].map(([price, size]) => ({ price, size })).sort((a, b) => b.price - a.price));
  const askLevels = accumulate([...asks.entries()].map(([price, size]) => ({ price, size })).sort((a, b) => a.price - b.price));
  const bestBid = bidLevels[0]?.price;
  const bestAsk = askLevels[0]?.price;
  const mid = bestBid != null && bestAsk != null ? dollars((bestBid + bestAsk) / 2) : bestBid ?? bestAsk ?? 0;
  return { bids: bidLevels, asks: askLevels, mid };
}

function readLevel(row, sideIndex, priceIndex, sizeIndex) {
  const side = String(row?.[sideIndex] ?? "").trim().toLowerCase();
  const price = parseChartNumber(row?.[priceIndex]);
  const size = parseChartNumber(row?.[sizeIndex]);
  if (price == null || size == null || size <= 0) return null;
  return { side, price, size };
}

/**
 * One bid/ask ladder.
 * Kalshi has no outcome column: a no bid at X is a yes ask at 1−X.
 * Polymarket Yes and No are the same market on two tokens. No buys land on the
 * yes ask (and No sells on the yes bid) without stacking a mirrored size twice.
 * @param {Array<{ title?: string, id?: string }>} columns
 * @param {unknown[][]} rows
 */
export function rowsToOrderBook(columns, rows) {
  const { sideIndex, priceIndex, sizeIndex, outcomeIndex } = bookIndexes(columns);
  /** @type {Map<number, number>} */
  const bids = new Map();
  /** @type {Map<number, number>} */
  const asks = new Map();
  if (sideIndex < 0 || priceIndex < 0 || sizeIndex < 0) {
    return { bids: [], asks: [], mid: 0 };
  }
  const complement = rowsHaveYesAndNo(rows, outcomeIndex);
  /** @type {unknown[][]} */
  const noRows = [];

  for (const row of rows || []) {
    if (complement && outcomeKind(row?.[outcomeIndex]) === "no") {
      noRows.push(row);
      continue;
    }
    const level = readLevel(row, sideIndex, priceIndex, sizeIndex);
    if (!level) continue;
    if (level.side === "yes" || level.side === "bid" || level.side === "buy") {
      addLevel(bids, level.price, level.size);
      continue;
    }
    if (level.side === "no") {
      addLevel(asks, 1 - level.price, level.size);
      continue;
    }
    if (level.side === "ask" || level.side === "sell") addLevel(asks, level.price, level.size);
  }

  for (const row of noRows) {
    const level = readLevel(row, sideIndex, priceIndex, sizeIndex);
    if (!level) continue;
    if (level.side === "sell" || level.side === "ask") {
      raiseLevel(bids, 1 - level.price, level.size);
      continue;
    }
    raiseLevel(asks, 1 - level.price, level.size);
  }

  return finishBook(bids, asks);
}

/**
 * One ladder per outcome, on that outcome's own prices.
 * Used when a market has both Yes and No so neither book is hidden.
 * @param {Array<{ title?: string, id?: string }>} columns
 * @param {unknown[][]} rows
 * @returns {Array<{ outcome: string, bids: Array<{ price: number, size: number, total: number }>, asks: Array<{ price: number, size: number, total: number }>, mid: number }>}
 */
export function rowsToOutcomeBooks(columns, rows) {
  const { outcomeIndex } = bookIndexes(columns);
  if (outcomeIndex < 0 || !rowsHaveYesAndNo(rows, outcomeIndex)) return [];
  /** @type {Map<string, unknown[][]>} */
  const groups = new Map();
  for (const row of rows || []) {
    const outcome = String(row?.[outcomeIndex] ?? "").trim();
    if (!outcome) continue;
    const list = groups.get(outcome) || [];
    list.push(row);
    groups.set(outcome, list);
  }
  const rank = (value) => {
    const kind = outcomeKind(value);
    if (kind === "yes") return 0;
    if (kind === "no") return 1;
    return 2;
  };
  return [...groups.keys()]
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
    .map((outcome) => ({ outcome, ...rowsToOrderBook(columns, groups.get(outcome) || []) }));
}

/**
 * One complete bid/ask ladder priced in a single outcome.
 * The other outcome's orders fill the opposite side at 1−price, keeping the
 * larger size where the same order already exists on both tokens.
 * @param {Array<{ title?: string, id?: string }>} columns
 * @param {unknown[][]} rows
 */
export function rowsToFramedBooks(columns, rows) {
  const { sideIndex, priceIndex, sizeIndex, outcomeIndex } = bookIndexes(columns);
  if (outcomeIndex < 0 || !rowsHaveYesAndNo(rows, outcomeIndex)) return [];
  /** @type {string[]} */
  const names = [];
  const seen = new Set();
  for (const row of rows || []) {
    const outcome = String(row?.[outcomeIndex] ?? "").trim();
    if (!outcome || seen.has(outcome)) continue;
    seen.add(outcome);
    names.push(outcome);
  }
  const rank = (value) => {
    const kind = outcomeKind(value);
    if (kind === "yes") return 0;
    if (kind === "no") return 1;
    return 2;
  };
  return names.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b)).map((outcome) => {
    /** @type {Map<number, number>} */
    const bids = new Map();
    /** @type {Map<number, number>} */
    const asks = new Map();
    const want = outcomeKind(outcome) || outcome.trim().toLowerCase();
    /** @type {unknown[][]} */
    const otherRows = [];
    for (const row of rows || []) {
      const level = readLevel(row, sideIndex, priceIndex, sizeIndex);
      if (!level) continue;
      const kind = outcomeKind(row?.[outcomeIndex]);
      const label = String(row?.[outcomeIndex] ?? "").trim().toLowerCase();
      const own = (kind && kind === want) || label === want;
      if (!own) {
        if (kind === "yes" || kind === "no") otherRows.push(row);
        continue;
      }
      const buy = level.side === "yes" || level.side === "bid" || level.side === "buy";
      const sell = level.side === "ask" || level.side === "sell";
      if (buy) addLevel(bids, level.price, level.size);
      else if (sell) addLevel(asks, level.price, level.size);
    }
    for (const row of otherRows) {
      const level = readLevel(row, sideIndex, priceIndex, sizeIndex);
      if (!level) continue;
      const buy = level.side === "yes" || level.side === "bid" || level.side === "buy";
      const sell = level.side === "ask" || level.side === "sell";
      if (sell) raiseLevel(bids, 1 - level.price, level.size);
      else if (buy) raiseLevel(asks, 1 - level.price, level.size);
    }
    return { outcome, ...finishBook(bids, asks) };
  });
}

/** Canvas height that fits every bid and ask, plus the outcome tabs when present. */
export function orderBookBlockHeight(levelCount, options = {}) {
  const levels = Math.max(0, Math.floor(Number(levelCount) || 0));
  return 200 + (options.tabs ? 36 : 0) + levels * 22;
}

/**
 * The two charts an order book sheet opens: ladder and depth, side by side.
 * @param {string} title
 */
export function defaultOrderBookCharts(title) {
  const base = String(title || "Order book").replace(/\s+chart$/, "").trim() || "Order book";
  return [
    { chartView: "order-book", title: `${base} · ladder`, w: 540, h: 420 },
    { chartView: "depth", title: `${base} · depth`, w: 540, h: 360 },
  ];
}
