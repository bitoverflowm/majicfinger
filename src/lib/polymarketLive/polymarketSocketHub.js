/**
 * One Polymarket market-channel socket shared by every live view that asks for one.
 *
 * Subscribers name the assets they want; the hub keeps the union subscribed on a single
 * connection, adding and dropping assets in place (`operation: subscribe | unsubscribe`) rather
 * than reconnecting. Messages go to the subscribers holding any asset they mention. Market-wide
 * events (`new_market`, `market_resolved`) carry no asset and go to subscribers that asked for
 * custom features.
 *
 * Polymarket only sends an order book snapshot the first time an asset is subscribed on a
 * connection, so the hub keeps each book current from `book` and `price_change` messages and
 * hands a fresh copy to anyone who joins an asset that is already subscribed.
 *
 * Runs anywhere with a WebSocket: a SharedWorker (one socket per browser), the page, or a test.
 */

export const POLYMARKET_MARKET_WS_URL = "wss://ws-subscriptions-clob.polymarket.com/ws/market";

const PING_MS = 10_000;
/** Asset changes this close together go out as one subscribe / unsubscribe. */
const FLUSH_MS = 120;
/** An asset nobody wants stays subscribed this long, so scrolling back and forth doesn't churn. */
const GRACE_MS = 5_000;

function messageAssets(msg) {
  const ids = [];
  if (msg.asset_id) ids.push(String(msg.asset_id));
  const changes = Array.isArray(msg.price_changes) ? msg.price_changes : Array.isArray(msg.changes) ? msg.changes : null;
  if (changes) {
    for (const change of changes) {
      const id = change?.asset_id || change?.assetId;
      if (id) ids.push(String(id));
    }
  }
  return ids;
}

function levelEntries(levels) {
  const out = [];
  for (const level of Array.isArray(levels) ? levels : []) {
    const price = Array.isArray(level) ? level[0] : level?.price;
    const size = Array.isArray(level) ? level[1] : level?.size;
    if (price != null && size != null) out.push([String(price), String(size)]);
  }
  return out;
}

/**
 * @param {{
 *   url?: string;
 *   createSocket?: (url: string) => WebSocket;
 *   flushMs?: number;
 *   graceMs?: number;
 *   pingMs?: number;
 * }} [opts]
 */
export function createPolymarketHub({
  url = POLYMARKET_MARKET_WS_URL,
  createSocket = (target) => new WebSocket(target),
  flushMs = FLUSH_MS,
  graceMs = GRACE_MS,
  pingMs = PING_MS,
} = {}) {
  /** @type {Map<number, { assets: Set<string>, custom: boolean, onMessage: Function, onStatus?: Function }>} */
  const subs = new Map();
  /** How many subscribers want each asset. */
  const refs = new Map();
  /** Assets subscribed on the current connection. */
  const upstream = new Set();
  /** Assets nobody wants any more, by when they were let go. */
  const released = new Map();
  /** Live order books and last quotes for subscribed assets, replayed to late joiners. */
  const books = new Map();
  const quotes = new Map();

  let nextId = 1;
  let ws = null;
  let status = "closed";
  let ping = 0;
  let flushTimer = 0;
  let reconnectTimer = 0;
  let attempt = 0;

  const send = (payload) => {
    if (ws && ws.readyState === 1) {
      try {
        ws.send(typeof payload === "string" ? payload : JSON.stringify(payload));
      } catch {
        /* the close handler reconnects */
      }
    }
  };

  const setStatus = (next) => {
    status = next;
    for (const sub of subs.values()) {
      try {
        sub.onStatus?.(next);
      } catch {
        /* a subscriber's problem */
      }
    }
  };

  const forgetAsset = (asset) => {
    upstream.delete(asset);
    books.delete(asset);
    quotes.delete(asset);
  };

  const track = (msg) => {
    const type = msg.event_type;
    if (type === "book" && msg.asset_id) {
      books.set(String(msg.asset_id), {
        market: msg.market,
        bids: new Map(levelEntries(msg.bids)),
        asks: new Map(levelEntries(msg.asks)),
        timestamp: msg.timestamp,
      });
    } else if (type === "price_change") {
      for (const change of Array.isArray(msg.price_changes) ? msg.price_changes : []) {
        const book = books.get(String(change?.asset_id || ""));
        if (!book || change.price == null || change.size == null) continue;
        const side = String(change.side || "").toUpperCase() === "SELL" ? book.asks : book.bids;
        if (Number(change.size) === 0) side.delete(String(change.price));
        else side.set(String(change.price), String(change.size));
        book.timestamp = msg.timestamp ?? book.timestamp;
      }
    } else if (type === "best_bid_ask" && msg.asset_id) {
      quotes.set(String(msg.asset_id), msg);
    }
  };

  const deliver = (msg) => {
    track(msg);
    const assets = messageAssets(msg);
    for (const sub of subs.values()) {
      const wanted = assets.length ? assets.some((asset) => sub.assets.has(asset)) : sub.custom;
      if (!wanted) continue;
      try {
        sub.onMessage(msg);
      } catch {
        /* a subscriber's problem */
      }
    }
  };

  /** What a late joiner would have got from Polymarket's initial dump. */
  const replay = (sub, assets) => {
    for (const asset of assets) {
      if (!upstream.has(asset)) continue;
      const book = books.get(asset);
      if (book) {
        const toLevels = (side) => [...side].map(([price, size]) => ({ price, size }));
        sub.onMessage({
          event_type: "book",
          asset_id: asset,
          market: book.market,
          bids: toLevels(book.bids),
          asks: toLevels(book.asks),
          timestamp: book.timestamp,
        });
      }
      const quote = quotes.get(asset);
      if (quote && sub.custom) sub.onMessage(quote);
    }
  };

  const wantsSocket = () => subs.size > 0 && refs.size > 0;

  const flush = () => {
    flushTimer = 0;
    if (!ws || ws.readyState !== 1) return;
    const added = [...refs.keys()].filter((asset) => !upstream.has(asset));
    const now = Date.now();
    const dropped = [];
    let nextRelease = Infinity;
    for (const [asset, at] of released) {
      if (refs.has(asset)) {
        released.delete(asset);
      } else if (now - at >= graceMs) {
        released.delete(asset);
        if (upstream.has(asset)) dropped.push(asset);
      } else {
        nextRelease = Math.min(nextRelease, at + graceMs - now);
      }
    }
    if (added.length) {
      added.forEach((asset) => upstream.add(asset));
      send({ assets_ids: added, operation: "subscribe", custom_feature_enabled: true });
    }
    if (dropped.length) {
      dropped.forEach(forgetAsset);
      send({ assets_ids: dropped, operation: "unsubscribe" });
    }
    if (!wantsSocket() && !upstream.size) {
      disconnect();
      return;
    }
    if (nextRelease !== Infinity) schedule(nextRelease);
  };

  const schedule = (delay = flushMs) => {
    if (flushTimer) return;
    flushTimer = setTimeout(flush, delay);
  };

  const scheduleReconnect = () => {
    if (reconnectTimer || !wantsSocket()) return;
    const delay = Math.min(15_000, 1_000 * 2 ** Math.min(attempt, 4));
    attempt += 1;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = 0;
      connect();
    }, delay);
  };

  function connect() {
    if (ws || !wantsSocket()) return;
    let socket;
    try {
      socket = createSocket(url);
    } catch {
      setStatus("error");
      scheduleReconnect();
      return;
    }
    ws = socket;
    setStatus("connecting");
    socket.onopen = () => {
      if (ws !== socket) return;
      if (!wantsSocket()) {
        disconnect();
        return;
      }
      attempt = 0;
      upstream.clear();
      books.clear();
      quotes.clear();
      released.clear();
      const assets = [...refs.keys()];
      assets.forEach((asset) => upstream.add(asset));
      send({ assets_ids: assets, type: "market", initial_dump: true, custom_feature_enabled: true });
      clearInterval(ping);
      ping = setInterval(() => send("PING"), pingMs);
      ping?.unref?.();
      setStatus("open");
    };
    socket.onmessage = (event) => {
      if (ws !== socket || event.data === "PONG") return;
      let payload;
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }
      for (const msg of Array.isArray(payload) ? payload : [payload]) {
        if (msg && typeof msg === "object") deliver(msg);
      }
    };
    socket.onerror = () => {
      if (ws === socket) setStatus("error");
    };
    socket.onclose = () => {
      if (ws !== socket) return;
      ws = null;
      clearInterval(ping);
      upstream.clear();
      books.clear();
      quotes.clear();
      if (!wantsSocket()) {
        setStatus("closed");
        return;
      }
      setStatus("closed");
      scheduleReconnect();
    };
  }

  function disconnect() {
    clearInterval(ping);
    clearTimeout(reconnectTimer);
    reconnectTimer = 0;
    const socket = ws;
    ws = null;
    upstream.clear();
    released.clear();
    books.clear();
    quotes.clear();
    status = "closed";
    if (socket) {
      try {
        socket.close(1000, "No subscribers");
      } catch {
        /* already closed */
      }
    }
  }

  const retain = (assets) => {
    for (const asset of assets) {
      refs.set(asset, (refs.get(asset) || 0) + 1);
      released.delete(asset);
    }
  };

  const release = (assets) => {
    const now = Date.now();
    for (const asset of assets) {
      const left = (refs.get(asset) || 0) - 1;
      if (left > 0) {
        refs.set(asset, left);
        continue;
      }
      refs.delete(asset);
      if (upstream.has(asset)) released.set(asset, now);
    }
  };

  const changed = (sub, added) => {
    if (!ws) {
      connect();
      return;
    }
    if (ws.readyState === 1) {
      queueMicrotask(() => [...subs.values()].includes(sub) && replay(sub, added));
      schedule();
    }
  };

  /**
   * @param {{ assetIds: string[], custom?: boolean, onMessage: (msg: object) => void, onStatus?: (status: string) => void }} opts
   * @returns {{ update: (assetIds: string[]) => void, close: () => void }}
   */
  function subscribe({ assetIds, custom = false, onMessage, onStatus }) {
    const id = nextId++;
    const assets = new Set((assetIds || []).map(String).filter(Boolean));
    const sub = { assets, custom, onMessage, onStatus };
    subs.set(id, sub);
    retain(assets);
    if (status === "open" || status === "connecting") {
      const now = status;
      queueMicrotask(() => subs.get(id) === sub && sub.onStatus?.(now));
    }
    changed(sub, [...assets]);

    return {
      update(nextIds) {
        if (subs.get(id) !== sub) return;
        const next = new Set((nextIds || []).map(String).filter(Boolean));
        const added = [...next].filter((asset) => !sub.assets.has(asset));
        const removed = [...sub.assets].filter((asset) => !next.has(asset));
        if (!added.length && !removed.length) return;
        sub.assets = next;
        retain(added);
        release(removed);
        changed(sub, added);
        if (removed.length) schedule();
      },
      close() {
        if (subs.get(id) !== sub) return;
        subs.delete(id);
        release(sub.assets);
        schedule();
      },
    };
  }

  return {
    subscribe,
    /** For tests and diagnostics. */
    inspect: () => ({ status, subscribers: subs.size, assets: [...refs.keys()], upstream: [...upstream] }),
  };
}
