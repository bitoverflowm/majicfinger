const DEFAULT_WS_URL =
  process.env.NEXT_PUBLIC_POLYMARKET_WS_URL ||
  "wss://ws-subscriptions-clob.polymarket.com/ws/market";
const PING_MS = 10_000;

/**
 * @param {{
 *   assetIds: string[];
 *   customFeatureEnabled?: boolean;
 *   onMessage: (msg: Record<string, unknown>) => void;
 *   onStatus?: (status: "open" | "closed" | "error") => void;
 * }} opts
 * @returns {() => void}
 */
function openPolymarketMarketChannel(opts) {
  const assetIds = [...new Set((opts.assetIds || []).map(String).filter(Boolean))];
  if (!assetIds.length) return () => {};

  let closed = false;
  let ws = null;
  let ping = null;
  let reconnectTimer = null;
  let attempt = 0;

  const emitStatus = (status) => {
    try {
      opts.onStatus?.(status);
    } catch {
      /* ignore */
    }
  };

  const clearPing = () => {
    if (ping) {
      clearInterval(ping);
      ping = null;
    }
  };

  const handlePayload = (payload) => {
    const messages = Array.isArray(payload) ? payload : [payload];
    for (const msg of messages) {
      if (!msg || typeof msg !== "object") continue;
      try {
        opts.onMessage(msg);
      } catch {
        /* ignore */
      }
    }
  };

  const connect = () => {
    if (closed) return;
    try {
      ws = new WebSocket(DEFAULT_WS_URL);
    } catch {
      emitStatus("error");
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      attempt = 0;
      emitStatus("open");
      try {
        const payload = {
          assets_ids: assetIds,
          type: "market",
          initial_dump: true,
        };
        if (opts.customFeatureEnabled === true) {
          payload.custom_feature_enabled = true;
        }
        ws.send(JSON.stringify(payload));
      } catch {
        /* ignore */
      }
      clearPing();
      ping = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          try {
            ws.send("PING");
          } catch {
            /* ignore */
          }
        }
      }, PING_MS);
    };

    ws.onmessage = (event) => {
      if (event.data === "PONG") return;
      try {
        handlePayload(JSON.parse(event.data));
      } catch {
        /* ignore malformed frames */
      }
    };

    ws.onerror = () => {
      emitStatus("error");
    };

    ws.onclose = () => {
      clearPing();
      ws = null;
      if (closed) return;
      emitStatus("closed");
      scheduleReconnect();
    };
  };

  const scheduleReconnect = () => {
    if (closed || reconnectTimer) return;
    const delay = Math.min(15_000, 1_000 * 2 ** Math.min(attempt, 4));
    attempt += 1;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  };

  connect();

  return () => {
    closed = true;
    clearPing();
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws) {
      try {
        ws.close(1000, "Closed by user");
      } catch {
        /* ignore */
      }
      ws = null;
    }
  };
}

function messageTime(msg) {
  const ts = msg.timestamp ? Number(msg.timestamp) : Date.now();
  const ms = Number.isFinite(ts) ? (ts < 1e12 ? ts * 1000 : ts) : Date.now();
  return { timestamp: String(ms), time: new Date(ms).toISOString() };
}

function levelPrice(level) {
  if (Array.isArray(level)) return Number(level[0]);
  if (level && typeof level === "object") return Number(level.price);
  return NaN;
}

function levelSize(level) {
  if (Array.isArray(level)) return Number(level[1]);
  if (level && typeof level === "object") return Number(level.size);
  return NaN;
}

/**
 * Subscribe to Polymarket CLOB market-channel last-trade prints for the given
 * asset ids. Returns a disposer.
 *
 * @param {{
 *   assetIds: string[];
 *   onTrade: (row: {
 *     asset_id: string;
 *     price: number;
 *     time: string;
 *     timestamp: string;
 *     side?: string;
 *     size?: string;
 *     transaction_hash?: string;
 *   }) => void;
 *   onStatus?: (status: "open" | "closed" | "error") => void;
 * }} opts
 * @returns {() => void}
 */
export function openPolymarketLastTradeSocket(opts) {
  return openPolymarketMarketChannel({
    assetIds: opts.assetIds,
    onStatus: opts.onStatus,
    onMessage: (msg) => {
      if (msg.event_type !== "last_trade_price" || !msg.asset_id) return;
      const priceNum = msg.price != null ? parseFloat(String(msg.price)) : NaN;
      if (!Number.isFinite(priceNum)) return;
      const stamp = messageTime(msg);
      opts.onTrade({
        asset_id: String(msg.asset_id),
        price: priceNum,
        timestamp: stamp.timestamp,
        time: stamp.time,
        side: msg.side != null ? String(msg.side) : "",
        size: msg.size != null ? String(msg.size) : "",
        transaction_hash:
          msg.transaction_hash != null ? String(msg.transaction_hash) : "",
      });
    },
  });
}

/**
 * Subscribe to best bid / ask / spread (and book snapshots) for top-of-book
 * live views. `custom_feature_enabled` is required for `best_bid_ask` events.
 *
 * @param {{
 *   assetIds: string[];
 *   onQuote?: (row: {
 *     asset_id: string;
 *     best_bid: number | null;
 *     best_ask: number | null;
 *     spread: number | null;
 *     bid_size: number | null;
 *     ask_size: number | null;
 *     time: string;
 *     timestamp: string;
 *     source: string;
 *   }) => void;
 *   onBook?: (row: {
 *     asset_id: string;
 *     bids: Array<{ price: number; size: number }>;
 *     asks: Array<{ price: number; size: number }>;
 *     time: string;
 *     timestamp: string;
 *   }) => void;
 *   onPriceChange?: (row: {
 *     asset_id: string;
 *     price: number;
 *     size: number;
 *     side: string;
 *     time: string;
 *     timestamp: string;
 *   }) => void;
 *   onStatus?: (status: "open" | "closed" | "error") => void;
 * }} opts
 * @returns {() => void}
 */
export function openPolymarketQuoteSocket(opts) {
  return openPolymarketMarketChannel({
    assetIds: opts.assetIds,
    customFeatureEnabled: true,
    onStatus: opts.onStatus,
    onMessage: (msg) => {
      const stamp = messageTime(msg);
      const type = String(msg.event_type || "");

      const emitQuote = (id, quote) => {
        if (
          quote.best_bid == null &&
          quote.best_ask == null &&
          quote.spread == null
        ) {
          return;
        }
        opts.onQuote?.({
          asset_id: id,
          ...quote,
          time: stamp.time,
          timestamp: stamp.timestamp,
          source: type || "quote",
        });
      };

      if (type === "price_change") {
        const changes = Array.isArray(msg.price_changes)
          ? msg.price_changes
          : Array.isArray(msg.changes)
            ? msg.changes
            : [];
        for (const change of changes) {
          if (!change || typeof change !== "object") continue;
          const id = String(
            change.asset_id || change.assetId || msg.asset_id || msg.assetId || "",
          ).trim();
          const price = Number(change.price);
          const size = Number(change.size);
          if (!id || !Number.isFinite(price) || !Number.isFinite(size)) continue;
          opts.onPriceChange?.({
            asset_id: id,
            price,
            size,
            side: String(change.side || "").toUpperCase(),
            time: stamp.time,
            timestamp: stamp.timestamp,
          });
          const bestBid = Number(change.best_bid ?? msg.best_bid);
          const bestAsk = Number(change.best_ask ?? msg.best_ask);
          emitQuote(id, {
            best_bid: Number.isFinite(bestBid) ? bestBid : null,
            best_ask: Number.isFinite(bestAsk) ? bestAsk : null,
            spread:
              Number.isFinite(bestBid) && Number.isFinite(bestAsk)
                ? bestAsk - bestBid
                : null,
            bid_size: null,
            ask_size: null,
          });
        }
        return;
      }

      const assetId = String(msg.asset_id || msg.assetId || "").trim();
      if (!assetId) return;

      if (type === "best_bid_ask") {
        const bestBid = Number(msg.best_bid);
        const bestAsk = Number(msg.best_ask);
        const spreadRaw = Number(msg.spread);
        const bidSize = Number(msg.best_bid_size ?? msg.bid_size);
        const askSize = Number(msg.best_ask_size ?? msg.ask_size);
        emitQuote(assetId, {
          best_bid: Number.isFinite(bestBid) ? bestBid : null,
          best_ask: Number.isFinite(bestAsk) ? bestAsk : null,
          spread: Number.isFinite(spreadRaw)
            ? spreadRaw
            : Number.isFinite(bestBid) && Number.isFinite(bestAsk)
              ? bestAsk - bestBid
              : null,
          bid_size: Number.isFinite(bidSize) ? bidSize : null,
          ask_size: Number.isFinite(askSize) ? askSize : null,
        });
        return;
      }

      if (type === "book") {
        const bids = Array.isArray(msg.bids) ? msg.bids : [];
        const asks = Array.isArray(msg.asks) ? msg.asks : [];
        const parsedBids = bids
          .map((level) => ({ price: levelPrice(level), size: levelSize(level) }))
          .filter((row) => Number.isFinite(row.price) && Number.isFinite(row.size));
        const parsedAsks = asks
          .map((level) => ({ price: levelPrice(level), size: levelSize(level) }))
          .filter((row) => Number.isFinite(row.price) && Number.isFinite(row.size));
        parsedBids.sort((a, b) => b.price - a.price);
        parsedAsks.sort((a, b) => a.price - b.price);
        const bestBid = parsedBids[0]?.price ?? Number(msg.best_bid);
        const bestAsk = parsedAsks[0]?.price ?? Number(msg.best_ask);
        emitQuote(assetId, {
          best_bid: Number.isFinite(bestBid) ? bestBid : null,
          best_ask: Number.isFinite(bestAsk) ? bestAsk : null,
          spread:
            Number.isFinite(bestBid) && Number.isFinite(bestAsk)
              ? bestAsk - bestBid
              : null,
          bid_size: parsedBids[0]?.size ?? null,
          ask_size: parsedAsks[0]?.size ?? null,
        });
        opts.onBook?.({
          asset_id: assetId,
          bids: parsedBids,
          asks: parsedAsks,
          time: stamp.time,
          timestamp: stamp.timestamp,
        });
      }
    },
  });
}
