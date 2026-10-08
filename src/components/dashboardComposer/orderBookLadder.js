/** Turn a Kalshi order-book sheet into a bid/ask ladder. A no bid at X is a yes ask at 1−X. */

function parseChartNumber(value) {
  const raw = String(value ?? "")
    .trim()
    .replace(/[$¢]/g, "")
    .replace(/,/g, "");
  if (!raw) return null;
  const match = raw.match(/^(-?\d+(?:\.\d+)?)\s*([KMB])?$/i);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isFinite(n)) return null;
  const scale = { K: 1e3, M: 1e6, B: 1e9 }[(match[2] || "").toUpperCase()] || 1;
  return n * scale;
}

function findColumn(columns, test) {
  return (columns || []).findIndex((column) =>
    test(String(column?.title || "").trim().toLowerCase(), String(column?.id || "").trim().toLowerCase()),
  );
}

function dollars(value) {
  return Math.round(value * 10000) / 10000;
}

function preferredBookOutcome(rows, outcomeIndex) {
  if (outcomeIndex < 0) return "";
  const counts = new Map();
  for (const row of rows || []) {
    const value = String(row?.[outcomeIndex] ?? "").trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  if (counts.size < 2) return "";
  return [...counts.keys()].find((value) => value.toLowerCase() === "yes") || [...counts.keys()][0];
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
  if (/^order\s*books?/i.test(String(sheet.title || ""))) return true;
  const ids = new Set((sheet.columns || []).map((column) => String(column?.id || "").toLowerCase()));
  const titles = new Set((sheet.columns || []).map((column) => String(column?.title || "").trim().toLowerCase()));
  const side = ids.has("side") || titles.has("side");
  const price = ids.has("price") || ids.has("price_dollars") || titles.has("price") || titles.has("price dollars");
  const qty = ids.has("size") || ids.has("quantity_fp") || titles.has("size") || titles.has("quantity fp");
  return side && price && qty;
}

/**
 * @param {Array<{ title?: string, id?: string }>} columns
 * @param {unknown[][]} rows
 */
export function rowsToOrderBook(columns, rows) {
  const sideIndex = findColumn(columns, (title, id) => id === "side" || title === "side");
  const priceIndex = findColumn(
    columns,
    (title, id) => id === "price" || id === "price_dollars" || title === "price" || title === "price dollars",
  );
  const sizeIndex = findColumn(
    columns,
    (title, id) => id === "quantity_fp" || id === "size" || title === "quantity fp" || title === "size" || title.includes("quantity"),
  );
  const outcomeIndex = findColumn(columns, (title, id) => id === "outcome" || title === "outcome");
  const preferredOutcome = preferredBookOutcome(rows, outcomeIndex);
  /** @type {Map<number, number>} */
  const bids = new Map();
  /** @type {Map<number, number>} */
  const asks = new Map();
  if (sideIndex < 0 || priceIndex < 0 || sizeIndex < 0) {
    return { bids: [], asks: [], mid: 0 };
  }

  for (const row of rows || []) {
    if (preferredOutcome) {
      const outcome = String(row?.[outcomeIndex] ?? "").trim();
      if (outcome && outcome !== preferredOutcome) continue;
    }
    const side = String(row?.[sideIndex] ?? "").trim().toLowerCase();
    const price = parseChartNumber(row?.[priceIndex]);
    const size = parseChartNumber(row?.[sizeIndex]);
    if (price == null || size == null || size <= 0) continue;
    if (side === "yes" || side === "bid" || side === "buy") {
      const level = dollars(price);
      bids.set(level, (bids.get(level) || 0) + size);
      continue;
    }
    if (side === "no") {
      const ask = dollars(1 - price);
      if (ask <= 0) continue;
      asks.set(ask, (asks.get(ask) || 0) + size);
      continue;
    }
    if (side === "ask" || side === "sell") {
      const level = dollars(price);
      if (level <= 0) continue;
      asks.set(level, (asks.get(level) || 0) + size);
    }
  }

  const bidLevels = accumulate([...bids.entries()].map(([price, size]) => ({ price, size })).sort((a, b) => b.price - a.price));
  const askLevels = accumulate([...asks.entries()].map(([price, size]) => ({ price, size })).sort((a, b) => a.price - b.price));
  const bestBid = bidLevels[0]?.price;
  const bestAsk = askLevels[0]?.price;
  const mid =
    bestBid != null && bestAsk != null ? dollars((bestBid + bestAsk) / 2) : bestBid ?? bestAsk ?? 0;
  return { bids: bidLevels, asks: askLevels, mid };
}
