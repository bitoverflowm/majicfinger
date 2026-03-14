"use client";

import { useCallback, useEffect, useRef } from "react";
import { useMyStateV2 } from "@/context/stateContextV2";

const POLYMARKET_WS_URL = "wss://ws-subscriptions-clob.polymarket.com/ws/market";
const POLYMARKET_PING_MS = 10000;
const CHAINLINK_WS_URL = "wss://ws-live-data.polymarket.com";
const CHAINLINK_PING_MS = 5000;

const noop = () => {};

function pushRow(setConnectedData, pausedRef, row) {
  if (pausedRef.current) return;
  setConnectedData((prev) => (Array.isArray(prev) ? [...prev, row] : [row]));
}

function pushRows(setConnectedData, pausedRef, rows) {
  if (pausedRef.current) return;
  setConnectedData((prev) => (Array.isArray(prev) ? [...prev, ...rows] : rows));
}

export default function LiveStreamManager() {
  const ctx = useMyStateV2();
  const setConnectedData = ctx?.setConnectedData;
  const setLiveStreamState = ctx?.setLiveStreamState;
  const setLiveStreamActions = ctx?.setLiveStreamActions;
  const setPolymarketWsState = ctx?.setPolymarketWsState;
  const setChainlinkWsState = ctx?.setChainlinkWsState;

  const wsRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const typeRef = useRef(null);
  const configRef = useRef({});
  const eventTypeRef = useRef("price_change");
  const pausedRef = useRef(false);
  const intentionalCloseRef = useRef(false);
  const reconnectTimeoutRef = useRef(null);

  const stop = useCallback(() => {
    intentionalCloseRef.current = true;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (_) {}
      wsRef.current = null;
    }
    const t = typeRef.current;
    typeRef.current = null;
    configRef.current = {};
    setPolymarketWsState?.((prev) => ({ ...prev, isRunning: false, stop: null, start: null }));
    setChainlinkWsState?.({ isRunning: false, stop: null, start: null, chartPreset: { type: "line", xKey: "time", yKey: "value" } });
    setLiveStreamState({ type: null, config: {}, isRunning: false, isPaused: false });
  }, [setLiveStreamState, setPolymarketWsState, setChainlinkWsState]);

  const startPolymarket = useCallback(
    (assetIds, eventType) => {
      if (wsRef.current || !assetIds?.length || !setConnectedData) return;
      eventTypeRef.current = eventType;
      const ws = new WebSocket(POLYMARKET_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ assets_ids: assetIds, type: "market", initial_dump: true }));
        setConnectedData([]);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send("PING");
        }, POLYMARKET_PING_MS);

        setPolymarketWsState?.({
          isRunning: true,
          assetIds,
          stop,
          start: () => start("polymarket", { assetIds, eventType }),
          chartPreset: { type: "line", xKey: "time", yKey: "price" },
        });
        setLiveStreamState({
          type: "polymarket",
          config: { assetIds, eventType },
          isRunning: true,
          isPaused: false,
        });
      };

      ws.onmessage = (event) => {
        if (event.data === "PONG") return;
        try {
          const msg = JSON.parse(event.data);
          const et = eventTypeRef.current;
          if (et === "price_change" && msg.event_type === "price_change" && msg.price_changes) {
            const rows = msg.price_changes.map((pc) => {
              const priceNum = pc.price != null ? parseFloat(pc.price) : null;
              return {
                event_type: msg.event_type,
                market: msg.market,
                timestamp: msg.timestamp,
                time: msg.timestamp ? new Date(Number(msg.timestamp)).toISOString() : "",
                asset_id: pc.asset_id,
                price: priceNum != null && !Number.isNaN(priceNum) ? priceNum : (pc.price != null ? String(pc.price) : ""),
                size: pc.size != null ? String(pc.size) : "",
                side: pc.side ?? "",
                hash: pc.hash ?? "",
                best_bid: pc.best_bid ?? "",
                best_ask: pc.best_ask ?? "",
              };
            });
            pushRows(setConnectedData, pausedRef, rows);
          } else if (et === "last_trade_price" && msg.event_type === "last_trade_price" && msg.asset_id) {
            const ts = msg.timestamp ? Number(msg.timestamp) : Date.now();
            const priceNum = msg.price != null ? parseFloat(String(msg.price)) : null;
            pushRow(setConnectedData, pausedRef, {
              event_type: msg.event_type,
              market: msg.market ?? "",
              timestamp: msg.timestamp ?? String(ts),
              time: new Date(Number(msg.timestamp ?? ts)).toISOString(),
              asset_id: msg.asset_id,
              price: priceNum != null && !Number.isNaN(priceNum) ? priceNum : (msg.price != null ? String(msg.price) : ""),
              size: msg.size != null ? String(msg.size) : "",
              fee_rate_bps: msg.fee_rate_bps != null ? String(msg.fee_rate_bps) : "",
              side: msg.side ?? "",
              transaction_hash: msg.transaction_hash ?? "",
            });
          } else if (et === "book" && msg.event_type === "book" && msg.asset_id) {
            const ts = msg.timestamp ? Number(msg.timestamp) : Date.now();
            pushRow(setConnectedData, pausedRef, {
              event_type: msg.event_type,
              asset_id: msg.asset_id,
              market: msg.market ?? "",
              timestamp: msg.timestamp ?? String(ts),
              time: new Date(ts).toISOString(),
              bids: Array.isArray(msg.bids) ? JSON.stringify(msg.bids) : "",
              asks: Array.isArray(msg.asks) ? JSON.stringify(msg.asks) : "",
              hash: msg.hash ?? "",
            });
          } else if (et === "price_change" && msg.event_type === "book" && msg.asset_id) {
            const ts = msg.timestamp ? Number(msg.timestamp) : Date.now();
            const bids = Array.isArray(msg.bids) ? msg.bids : [];
            const asks = Array.isArray(msg.asks) ? msg.asks : [];
            const parsePrice = (p) => (p?.price != null ? parseFloat(String(p.price)) : Array.isArray(p) ? parseFloat(String(p[0])) : null);
            const parseSize = (p) => (p?.size != null ? String(p.size) : Array.isArray(p) ? String(p[1] ?? "") : "");
            const bestBid = parsePrice(bids[0]);
            const bestAsk = parsePrice(asks[0]);
            let price = null;
            if (bestBid != null && bestAsk != null && !Number.isNaN(bestBid) && !Number.isNaN(bestAsk)) price = (bestBid + bestAsk) / 2;
            else if (bestBid != null && !Number.isNaN(bestBid)) price = bestBid;
            else if (bestAsk != null && !Number.isNaN(bestAsk)) price = bestAsk;
            if (price != null) {
              pushRow(setConnectedData, pausedRef, {
                event_type: msg.event_type,
                market: msg.market ?? "",
                timestamp: String(ts),
                time: new Date(ts).toISOString(),
                asset_id: msg.asset_id,
                price,
                size: parseSize(bids[0]) || parseSize(asks[0]) || "",
                side: "",
                hash: msg.hash ?? "",
                best_bid: bestBid != null ? String(bestBid) : "",
                best_ask: bestAsk != null ? String(bestAsk) : "",
              });
            }
          } else if (et === "tick_size_change" && msg.event_type === "tick_size_change" && msg.asset_id) {
            const ts = msg.timestamp ? Number(msg.timestamp) : Date.now();
            pushRow(setConnectedData, pausedRef, {
              event_type: msg.event_type,
              asset_id: msg.asset_id,
              market: msg.market ?? "",
              old_tick_size: msg.old_tick_size ?? "",
              new_tick_size: msg.new_tick_size ?? "",
              timestamp: msg.timestamp ?? String(ts),
              time: new Date(ts).toISOString(),
            });
          } else if (et === "best_bid_ask" && msg.event_type === "best_bid_ask" && msg.asset_id) {
            const ts = msg.timestamp ? Number(msg.timestamp) : Date.now();
            pushRow(setConnectedData, pausedRef, {
              event_type: msg.event_type,
              asset_id: msg.asset_id,
              market: msg.market ?? "",
              best_bid: msg.best_bid ?? "",
              best_ask: msg.best_ask ?? "",
              spread: msg.spread ?? "",
              timestamp: msg.timestamp ?? String(ts),
              time: new Date(ts).toISOString(),
            });
          } else if (et === "new_market" && msg.event_type === "new_market") {
            const ts = msg.timestamp ? Number(msg.timestamp) : Date.now();
            pushRow(setConnectedData, pausedRef, {
              event_type: msg.event_type,
              id: msg.id ?? "",
              question: msg.question ?? "",
              market: msg.market ?? "",
              slug: msg.slug ?? "",
              description: msg.description ?? "",
              assets_ids: Array.isArray(msg.assets_ids) ? JSON.stringify(msg.assets_ids) : "",
              outcomes: Array.isArray(msg.outcomes) ? JSON.stringify(msg.outcomes) : "",
              timestamp: msg.timestamp ?? String(ts),
              time: new Date(ts).toISOString(),
            });
          } else if (et === "market_resolved" && msg.event_type === "market_resolved") {
            const ts = msg.timestamp ? Number(msg.timestamp) : Date.now();
            pushRow(setConnectedData, pausedRef, {
              event_type: msg.event_type,
              id: msg.id ?? "",
              market: msg.market ?? "",
              assets_ids: Array.isArray(msg.assets_ids) ? JSON.stringify(msg.assets_ids) : "",
              winning_asset_id: msg.winning_asset_id ?? "",
              winning_outcome: msg.winning_outcome ?? "",
              timestamp: msg.timestamp ?? String(ts),
              time: new Date(ts).toISOString(),
            });
          }
        } catch (_) {}
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        setPolymarketWsState?.((prev) => ({ ...prev, isRunning: false, stop: null }));
        setLiveStreamState((s) => (s.type === "polymarket" ? { ...s, isRunning: false } : s));
      };
    },
    [setConnectedData, setLiveStreamState, setPolymarketWsState, stop]
  );

  const startChainlink = useCallback(
    (symbol) => {
      if (wsRef.current || !setConnectedData) return;
      const subscriptionMsg = {
        action: "subscribe",
        subscriptions: [{ topic: "crypto_prices_chainlink", type: "*", filters: JSON.stringify({ symbol }) }],
      };
      const ws = new WebSocket(CHAINLINK_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify(subscriptionMsg));
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send("PING");
        }, CHAINLINK_PING_MS);
        setChainlinkWsState?.({
          isRunning: true,
          stop,
          start: () => start("chainlink", { symbol }),
          chartPreset: { type: "line", xKey: "time", yKey: "value" },
        });
        setLiveStreamState({ type: "chainlink", config: { symbol }, isRunning: true, isPaused: false });
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (!msg?.payload || msg.topic !== "crypto_prices_chainlink" || msg.type !== "update") return;
          const payload = msg.payload;
          if (payload?.symbol !== symbol) return;
          if (pausedRef.current) return;
          const row = {
            source: "chainlink",
            symbol: payload.symbol,
            time: payload.timestamp,
            value: payload.value,
            price: payload.value,
            receivedAt: msg.timestamp,
          };
          setConnectedData((prev) => {
            const next = Array.isArray(prev) ? [...prev, row] : [row];
            return next.length > 2000 ? next.slice(-2000) : next;
          });
        } catch (_) {}
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        setChainlinkWsState?.({ isRunning: false, stop: null, start: null, chartPreset: { type: "line", xKey: "time", yKey: "value" } });
        setLiveStreamState((s) => (s.type === "chainlink" ? { ...s, isRunning: false } : s));
        if (!intentionalCloseRef.current && symbol) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            startChainlink(symbol);
          }, 3000);
        }
      };
    },
    [setConnectedData, setLiveStreamState, setChainlinkWsState, stop]
  );

  const start = useCallback(
    (type, config) => {
      stop();
      intentionalCloseRef.current = false;
      typeRef.current = type;
      configRef.current = config || {};
      if (type === "polymarket" && config?.assetIds?.length) {
        startPolymarket(config.assetIds, config.eventType || "price_change");
      } else if (type === "chainlink" && config?.symbol) {
        startChainlink(config.symbol);
      }
      // binance: leave as no-op for now
    },
    [stop, startPolymarket, startChainlink]
  );

  const pause = useCallback(() => {
    pausedRef.current = true;
    setLiveStreamState((s) => (s.isRunning ? { ...s, isPaused: true } : s));
  }, [setLiveStreamState]);

  const resume = useCallback(() => {
    pausedRef.current = false;
    setLiveStreamState((s) => (s.isRunning ? { ...s, isPaused: false } : s));
  }, [setLiveStreamState]);

  const restart = useCallback(() => {
    const t = typeRef.current;
    const c = configRef.current;
    if (t && (t === "polymarket" ? c?.assetIds?.length : t === "chainlink" ? c?.symbol : false)) {
      stop();
      setTimeout(() => start(t, c), 0);
    }
  }, [stop, start]);

  useEffect(() => {
    setLiveStreamActions({
      start,
      stop,
      pause,
      resume,
      restart,
    });
    return () => {
      stop();
      setLiveStreamActions({ start: noop, stop: noop, pause: noop, resume: noop, restart: noop });
    };
  }, [start, stop, pause, resume, restart, setLiveStreamActions]);

  useEffect(() => {
    const onUnload = () => {
      stop();
    };
    window.addEventListener("beforeunload", onUnload);
    window.addEventListener("pagehide", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      window.removeEventListener("pagehide", onUnload);
    };
  }, [stop]);

  return null;
}
