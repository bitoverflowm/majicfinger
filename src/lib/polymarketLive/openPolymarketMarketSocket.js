const DEFAULT_WS_URL =
  process.env.NEXT_PUBLIC_POLYMARKET_WS_URL ||
  "wss://ws-subscriptions-clob.polymarket.com/ws/market";
const PING_MS = 10_000;

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
      if (msg.event_type !== "last_trade_price" || !msg.asset_id) continue;
      const priceNum = msg.price != null ? parseFloat(String(msg.price)) : NaN;
      if (!Number.isFinite(priceNum)) continue;
      const ts = msg.timestamp ? Number(msg.timestamp) : Date.now();
      const ms = Number.isFinite(ts) ? (ts < 1e12 ? ts * 1000 : ts) : Date.now();
      opts.onTrade({
        asset_id: String(msg.asset_id),
        price: priceNum,
        timestamp: String(ms),
        time: new Date(ms).toISOString(),
        side: msg.side != null ? String(msg.side) : "",
        size: msg.size != null ? String(msg.size) : "",
        transaction_hash: msg.transaction_hash != null ? String(msg.transaction_hash) : "",
      });
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
        ws.send(
          JSON.stringify({
            assets_ids: assetIds,
            type: "market",
            initial_dump: true,
          }),
        );
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
