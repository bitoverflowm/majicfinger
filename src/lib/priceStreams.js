export const CHAINLINK_LIVE_SOURCES = [
  { id: "btc/usd", name: "Bitcoin", title: "BTC / USD", description: "Bitcoin priced in US dollars (Chainlink)." },
  { id: "eth/usd", name: "Ethereum", title: "ETH / USD", description: "Ethereum priced in US dollars (Chainlink)." },
  { id: "sol/usd", name: "Solana", title: "SOL / USD", description: "Solana priced in US dollars (Chainlink)." },
  { id: "xrp/usd", name: "XRP", title: "XRP / USD", description: "XRP priced in US dollars (Chainlink)." },
  { id: "doge/usd", name: "Dogecoin", title: "DOGE / USD", description: "Dogecoin priced in US dollars (Chainlink)." },
  { id: "hype/usd", name: "Hyperliquid", title: "HYPE / USD", description: "Hyperliquid priced in US dollars (Chainlink)." },
  { id: "bnb/usd", name: "BNB", title: "BNB / USD", description: "BNB priced in US dollars (Chainlink)." },
  { id: "zec/usd", name: "Zcash", title: "ZEC / USD", description: "Zcash priced in US dollars (Chainlink)." },
];

/** Every pair the socket carries on the Binance topic. */
export const BINANCE_LIVE_SOURCES = [
  { id: "btcusdt", name: "Bitcoin", title: "BTC / USDT", description: "Bitcoin priced in Tether on Binance." },
  { id: "ethusdt", name: "Ethereum", title: "ETH / USDT", description: "Ethereum priced in Tether on Binance." },
  { id: "solusdt", name: "Solana", title: "SOL / USDT", description: "Solana priced in Tether on Binance." },
  { id: "xrpusdt", name: "XRP", title: "XRP / USDT", description: "XRP priced in Tether on Binance." },
  { id: "bnbusdt", name: "BNB", title: "BNB / USDT", description: "BNB priced in Tether on Binance." },
  { id: "dogeusdt", name: "Dogecoin", title: "DOGE / USDT", description: "Dogecoin priced in Tether on Binance." },
];

/**
 * Chainlink streams on the Polymarket real-time data socket. One subscription per coin per connection:
 * the socket only sends live updates for one symbol of a topic on each connection.
 */
export const CHAINLINK_FEEDS = [
  {
    id: "twap_60",
    topic: "crypto_prices_twap_sixty",
    label: "Up/Down settlement price",
    windowSeconds: 60,
    description:
      "Chainlink's 60-second TWAP. Polymarket sets the price to beat and settles every crypto Up/Down market on it.",
  },
  {
    id: "prices",
    topic: "crypto_prices_chainlink",
    label: "Spot price",
    windowSeconds: null,
    description: "Latest Chainlink spot price for each coin.",
  },
  {
    id: "twap_30",
    topic: "crypto_prices_twap_thirty",
    label: "30-second TWAP (legacy)",
    windowSeconds: 30,
    description: "Chainlink's 30-second TWAP. Polymarket settled 5-minute markets on it from Aug 7 to Aug 14, 2026, and no longer uses it.",
  },
];

/** Binance trades relayed on the same socket, with the same one-symbol-per-connection rule. */
export const BINANCE_FEEDS = [
  {
    id: "prices",
    topic: "crypto_prices",
    label: "Spot price",
    windowSeconds: null,
    description: "Latest Binance spot price for each pair, about once a second.",
  },
];

const PROVIDERS = {
  chainlink: { name: "Chainlink", feeds: CHAINLINK_FEEDS, pairs: CHAINLINK_LIVE_SOURCES },
  binance: { name: "Binance", feeds: BINANCE_FEEDS, pairs: BINANCE_LIVE_SOURCES },
};

/** @param {string} integrationId */
export function isPriceStreamIntegration(integrationId) {
  return Object.hasOwn(PROVIDERS, String(integrationId || ""));
}

/** @param {string} integrationId */
export function priceStreamProviderName(integrationId) {
  return PROVIDERS[integrationId]?.name || "";
}

/** @param {string} integrationId */
export function priceStreamFeeds(integrationId) {
  return PROVIDERS[integrationId]?.feeds || [];
}

/** @param {string} integrationId */
export function priceStreamPairs(integrationId) {
  return PROVIDERS[integrationId]?.pairs || [];
}

/**
 * @param {string} integrationId
 * @param {string} id
 */
export function priceStreamFeed(integrationId, id) {
  return priceStreamFeeds(integrationId).find((feed) => feed.id === id) || null;
}

/** @param {string} id */
export function chainlinkFeed(id) {
  return priceStreamFeed("chainlink", id);
}

export const PRICE_STREAM_SOCKET_URL = "wss://ws-live-data.polymarket.com";

/** Rows one pair sheet keeps while it streams. */
export const PRICE_STREAM_CAP = 10000;

/**
 * The pair a price pair sheet streams, or "" for any other sheet.
 * Older Chainlink and Binance sheets hold one row per coin and have an "updated" column instead of "time".
 * @param {any} sheet
 */
export function priceStreamSymbol(sheet) {
  if (!sheet || !isPriceStreamIntegration(sheet.integrationId)) return "";
  if (sheet.pull?.mode === "stream" && sheet.pull.symbol) return String(sheet.pull.symbol).toLowerCase();
  const columns = Array.isArray(sheet.columns) ? sheet.columns : [];
  if (!columns.some((column) => column?.id === "time") || columns.some((column) => column?.id === "updated")) return "";
  const first = Array.isArray(sheet.records) ? sheet.records.find((row) => row?.symbol) : null;
  return first ? String(first.symbol).toLowerCase() : "";
}

/** @param {any} sheet */
export function isPriceStreamSheet(sheet) {
  return Boolean(priceStreamSymbol(sheet));
}

/**
 * @param {string} integrationId
 * @param {string} symbol
 */
export function priceStreamPairTitle(integrationId, symbol) {
  const wanted = String(symbol || "").toLowerCase();
  return priceStreamPairs(integrationId).find((pair) => pair.id === wanted)?.title || wanted.toUpperCase();
}

/**
 * Price points in one socket message for one pair. The first message is a snapshot of recent points.
 * The Chainlink spot snapshot arrives labelled `crypto_prices`, so the topic is not checked here.
 * @param {any} msg
 * @param {string} symbol
 * @returns {{ timestamp: number, value: number }[]}
 */
export function priceMessagePoints(msg, symbol) {
  const payload = msg?.payload;
  if (!payload || typeof payload !== "object") return [];
  const wanted = String(symbol || "").toLowerCase();
  const history = Array.isArray(payload.data) ? payload.data : null;
  const named = String(payload.symbol || "").toLowerCase();
  if (named && named !== wanted) return [];
  if (!named && !history) return [];
  const points = [];
  for (const point of history || [payload]) {
    const value = Number(point?.value);
    const timestamp = Number(point?.timestamp);
    if (Number.isFinite(value) && Number.isFinite(timestamp)) points.push({ timestamp, value });
  }
  return points;
}

/**
 * Rows for points newer than `after`, oldest first, one row per timestamp.
 * @param {{ timestamp: number, value: number }[]} points
 * @param {{ symbol: string, windowSeconds?: number | null, after?: number }} options
 */
export function priceRowsFromPoints(points, { symbol, windowSeconds = null, after = -Infinity }) {
  const label = String(symbol || "").toUpperCase();
  const seen = new Set();
  const rows = [];
  for (const point of points || []) {
    if (!(point.timestamp > after) || seen.has(point.timestamp)) continue;
    seen.add(point.timestamp);
    rows.push({
      time: point.timestamp,
      symbol: label,
      price: point.value,
      ...(windowSeconds ? { window_seconds: windowSeconds } : {}),
    });
  }
  return rows.sort((a, b) => a.time - b.time);
}

/**
 * Merge points into a pair sheet's rows, oldest first, one row per timestamp. Keeps the latest `cap` rows.
 * @param {object[]} rows
 * @param {{ timestamp: number, value: number }[]} points
 * @param {{ symbol: string, windowSeconds?: number | null, cap?: number }} options
 */
export function mergePriceRows(rows, points, { symbol, windowSeconds = null, cap = PRICE_STREAM_CAP }) {
  const base = Array.isArray(rows) ? rows : [];
  const seen = new Set(base.map((row) => row.time));
  const added = priceRowsFromPoints(points, { symbol, windowSeconds }).filter((row) => !seen.has(row.time));
  if (!added.length) return base;
  const last = base.length ? base[base.length - 1].time : -Infinity;
  const merged = added[0].time > last ? base.concat(added) : base.concat(added).sort((a, b) => a.time - b.time);
  return merged.length > cap ? merged.slice(merged.length - cap) : merged;
}

/**
 * The subscription for one pair. Both topics only answer a `{ symbol }` filter with type "*";
 * a list filter such as `["btcusdt"]` subscribes without error and never sends a price.
 * @param {string} topic
 * @param {string} symbol
 */
export function priceStreamSubscription(topic, symbol) {
  return { topic, type: "*", filters: JSON.stringify({ symbol: String(symbol).toLowerCase() }) };
}

/**
 * Stream one pair on one topic. Returns a function that closes the socket.
 * @param {{ topic: string, symbol: string, onPoints: (points: { timestamp: number, value: number }[]) => void, onStatus?: (status: "connecting" | "live" | "closed") => void }} options
 */
export function openPriceStream({ topic, symbol, onPoints, onStatus }) {
  if (typeof WebSocket === "undefined") {
    onStatus?.("closed");
    return () => {};
  }
  let stopped = false;
  let live = false;
  const ws = new WebSocket(PRICE_STREAM_SOCKET_URL);
  const ping = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) ws.send("PING");
  }, 5000);
  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearInterval(ping);
    try {
      ws.close();
    } catch {
      /* ignore */
    }
  };
  onStatus?.("connecting");
  ws.onopen = () => {
    if (stopped) return;
    ws.send(JSON.stringify({ action: "subscribe", subscriptions: [priceStreamSubscription(topic, symbol)] }));
  };
  ws.onmessage = (event) => {
    if (stopped || event.data === "PONG") return;
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }
    const points = priceMessagePoints(msg, symbol);
    if (!points.length) return;
    if (!live) {
      live = true;
      onStatus?.("live");
    }
    onPoints(points);
  };
  ws.onclose = () => {
    if (stopped) return;
    stop();
    onStatus?.("closed");
  };
  return stop;
}
