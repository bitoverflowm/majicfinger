import { buildPolymarketCandlestickSeedRows } from "@/lib/polymarketLive/polymarketCandlesticks";

const HISTORY_BATCH_SIZE = 20;
const CLOB_BATCH_SIZE = 500;

function objectList(payload) {
  if (Array.isArray(payload)) {
    if (payload.length === 1 && Array.isArray(payload[0])) return payload[0];
    return payload.filter((row) => row && typeof row === "object");
  }
  return payload && typeof payload === "object" ? [payload] : [];
}

function historyMap(payload) {
  if (!payload || typeof payload !== "object") return {};
  const root = payload.history && typeof payload.history === "object" ? payload.history : payload;
  if (Array.isArray(root)) {
    return Object.fromEntries(
      root
        .map((entry) => {
          const tokenId = String(entry?.market || entry?.asset_id || entry?.token_id || "").trim();
          return tokenId && Array.isArray(entry?.history) ? [tokenId, entry.history] : null;
        })
        .filter(Boolean),
    );
  }
  return Object.fromEntries(
    Object.entries(root).filter(([, points]) => Array.isArray(points)),
  );
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function levelPrice(level) {
  if (Array.isArray(level)) return numberOrNull(level[0]);
  return numberOrNull(level?.price);
}

function bookAssetId(book, fallback = "") {
  return String(
    book?.asset_id || book?.assetId || book?.token_id || book?.tokenId || fallback,
  ).trim();
}

export function normalizePolymarketRealtimeHistoryRows(payload) {
  const rows = [];
  for (const [assetId, points] of Object.entries(historyMap(payload))) {
    for (const point of points) {
      const timestampSeconds = numberOrNull(point?.t ?? point?.timestamp);
      const price = numberOrNull(point?.p ?? point?.price);
      if (timestampSeconds == null || price == null) continue;
      const timestampMs = timestampSeconds < 1e12 ? timestampSeconds * 1000 : timestampSeconds;
      rows.push({
        source: "rest_seed",
        event_type: "price_history_seed",
        asset_id: assetId,
        timestamp: String(timestampMs),
        time: new Date(timestampMs).toISOString(),
        price,
      });
    }
  }
  return rows.sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
}

export function normalizePolymarketRealtimeBookRows(payload, assetIds = []) {
  return objectList(payload).map((book, index) => {
    const bids = Array.isArray(book?.bids) ? book.bids : [];
    const asks = Array.isArray(book?.asks) ? book.asks : [];
    const bestBid = levelPrice(bids[bids.length - 1]);
    const bestAsk = levelPrice(asks[0]);
    const rawTimestamp = numberOrNull(book?.timestamp);
    const timestampMs =
      rawTimestamp == null
        ? Date.now()
        : rawTimestamp < 1e12
          ? rawTimestamp * 1000
          : rawTimestamp;
    return {
      ...book,
      source: "rest_seed",
      event_type: "book_seed",
      asset_id: bookAssetId(book, assetIds[index]),
      timestamp: String(timestampMs),
      time: new Date(timestampMs).toISOString(),
      bids: JSON.stringify(bids),
      asks: JSON.stringify(asks),
      best_bid: bestBid ?? "",
      best_ask: bestAsk ?? "",
      spread: bestBid != null && bestAsk != null ? bestAsk - bestBid : "",
    };
  });
}

export function buildPolymarketRealtimeSeedRows(
  { feedTypes = [], candleInterval = "5m" },
  { historyPayload = {}, booksPayload = [], assetIds = [] } = {},
) {
  const historyRows = normalizePolymarketRealtimeHistoryRows(historyPayload);
  const bookRows = normalizePolymarketRealtimeBookRows(booksPayload, assetIds);
  const rowsByFeed = {};
  for (const feedType of feedTypes) {
    if (feedType === "last_trade_price" || feedType === "price_change") {
      rowsByFeed[feedType] = historyRows;
    } else if (feedType === "candlesticks") {
      rowsByFeed[feedType] = buildPolymarketCandlestickSeedRows(
        historyRows,
        candleInterval,
      );
    } else if (feedType === "book") {
      rowsByFeed[feedType] = bookRows;
    } else if (feedType === "best_bid_ask") {
      rowsByFeed[feedType] = bookRows.map((row) => ({
        ...row,
        event_type: "best_bid_ask_seed",
      }));
    } else if (feedType === "tick_size_change") {
      rowsByFeed[feedType] = bookRows
        .filter((row) => row.tick_size != null && row.tick_size !== "")
        .map((row) => ({
          ...row,
          event_type: "tick_size_seed",
          old_tick_size: row.tick_size,
          new_tick_size: row.tick_size,
        }));
    } else {
      rowsByFeed[feedType] = [];
    }
  }
  return rowsByFeed;
}

async function fetchHistory(assetIds) {
  const combined = {};
  for (let offset = 0; offset < assetIds.length; offset += HISTORY_BATCH_SIZE) {
    const markets = assetIds.slice(offset, offset + HISTORY_BATCH_SIZE);
    const response = await fetch("/api/integrations/polymarket?query=getBatchPricesHistory", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ markets, interval: "1d", fidelity: 1 }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message || payload?.error || "Price history seed request failed");
    }
    Object.assign(combined, historyMap(payload));
  }
  return combined;
}

async function fetchBooks(assetIds) {
  const books = [];
  for (let offset = 0; offset < assetIds.length; offset += CLOB_BATCH_SIZE) {
    const batch = assetIds.slice(offset, offset + CLOB_BATCH_SIZE);
    const response = await fetch("/api/integrations/polymarket?query=getOrderBooks", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(batch.map((token_id) => ({ token_id }))),
    });
    const payload = await response.json().catch(() => ([]));
    if (!response.ok) {
      throw new Error(payload?.message || payload?.error || "Orderbook seed request failed");
    }
    books.push(...objectList(payload));
  }
  return books;
}

export async function fetchPolymarketRealtimeSeedRows(config) {
  const assetIds = [...new Set((config?.assetIds || []).map(String).filter(Boolean))];
  const feedTypes = [...new Set(config?.feedTypes || [])];
  const needsHistory = feedTypes.some((type) =>
    type === "last_trade_price" || type === "price_change" || type === "candlesticks",
  );
  const needsBooks = feedTypes.some((type) =>
    ["book", "best_bid_ask", "tick_size_change"].includes(type),
  );
  const errors = [];
  let historyPayload = {};
  let booksPayload = [];

  const [historyResult, booksResult] = await Promise.allSettled([
    needsHistory ? fetchHistory(assetIds) : Promise.resolve({}),
    needsBooks ? fetchBooks(assetIds) : Promise.resolve([]),
  ]);
  if (historyResult.status === "fulfilled") historyPayload = historyResult.value;
  else errors.push(historyResult.reason instanceof Error ? historyResult.reason.message : "History seed failed");
  if (booksResult.status === "fulfilled") booksPayload = booksResult.value;
  else errors.push(booksResult.reason instanceof Error ? booksResult.reason.message : "Orderbook seed failed");

  return {
    rowsByFeed: buildPolymarketRealtimeSeedRows(
      { feedTypes, candleInterval: config?.candleInterval },
      { historyPayload, booksPayload, assetIds },
    ),
    errors,
  };
}
