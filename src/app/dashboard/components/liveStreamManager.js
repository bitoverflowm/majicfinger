"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useMyStateV2 } from "@/context/stateContextV2";
import {
  advancePolymarketCandles,
  applyPolymarketCandleOverlay,
  polymarketCandleIntervalMs,
  upsertPolymarketTradeCandle,
} from "@/lib/polymarketLive/polymarketCandlesticks";

/** Polymarket CLOB market WS; override with NEXT_PUBLIC_POLYMARKET_WS_URL if Polymarket documents a V2 preview URL. */
const POLYMARKET_WS_URL =
  process.env.NEXT_PUBLIC_POLYMARKET_WS_URL || "wss://ws-subscriptions-clob.polymarket.com/ws/market";
const POLYMARKET_PING_MS = 10000;
const POLYMARKET_MAX_ROWS_PER_STREAM = 2500;
const CHAINLINK_WS_URL = "wss://ws-live-data.polymarket.com";
const CHAINLINK_PING_MS = 5000;

const noop = () => {};

function pushRow(setSheetData, sheetId, pausedRef, row) {
  if (pausedRef.current[sheetId]) return;
  setSheetData(sheetId, (prev) =>
    (Array.isArray(prev) ? [...prev, row] : [row]).slice(-POLYMARKET_MAX_ROWS_PER_STREAM),
  );
}

function pushRows(setSheetData, sheetId, pausedRef, rows) {
  if (pausedRef.current[sheetId]) return;
  setSheetData(sheetId, (prev) =>
    (Array.isArray(prev) ? [...prev, ...rows] : rows).slice(-POLYMARKET_MAX_ROWS_PER_STREAM),
  );
}

export default function LiveStreamManager() {
  const ctx = useMyStateV2();
  const setSheetData = ctx?.setSheetData;
  const setLiveStreamState = ctx?.setLiveStreamState;
  const setLiveStreamActions = ctx?.setLiveStreamActions;
  const setPolymarketWsState = ctx?.setPolymarketWsState;
  const setChainlinkWsState = ctx?.setChainlinkWsState;

  const wsBySheetIdRef = useRef({});
  const pingIntervalBySheetIdRef = useRef({});
  const eventTypeBySheetIdRef = useRef({});
  const symbolBySheetIdRef = useRef({});
  const pausedBySheetIdRef = useRef({});
  const intentionalCloseBySheetIdRef = useRef({});
  const firstDataReceivedBySheetIdRef = useRef({});
  const reconnectTimeoutBySheetIdRef = useRef({});
  const typeConfigBySheetIdRef = useRef({});
  const candleIntervalBySheetIdRef = useRef({});
  const candleTimerBySheetIdRef = useRef({});
  const candleTradeHashesBySheetIdRef = useRef({});
  const stop = useCallback(
    (sheetId) => {
      if (sheetId != null) {
        intentionalCloseBySheetIdRef.current[sheetId] = true;
        delete typeConfigBySheetIdRef.current[sheetId];
        delete firstDataReceivedBySheetIdRef.current[sheetId];
        delete candleIntervalBySheetIdRef.current[sheetId];
        delete candleTradeHashesBySheetIdRef.current[sheetId];
        const candleTimer = candleTimerBySheetIdRef.current[sheetId];
        if (candleTimer) {
          clearTimeout(candleTimer);
          delete candleTimerBySheetIdRef.current[sheetId];
        }
        const tid = reconnectTimeoutBySheetIdRef.current[sheetId];
        if (tid) {
          clearTimeout(tid);
          reconnectTimeoutBySheetIdRef.current[sheetId] = null;
        }
        const pi = pingIntervalBySheetIdRef.current[sheetId];
        if (pi) {
          clearInterval(pi);
          pingIntervalBySheetIdRef.current[sheetId] = null;
        }
        const ws = wsBySheetIdRef.current[sheetId];
        wsBySheetIdRef.current[sheetId] = null;
        if (ws) {
          try {
            ws.close(1000, "Closed by user");
          } catch (_) {}
        }
        setPolymarketWsState?.((prev) => (prev?.sheetId === sheetId ? { ...prev, isRunning: false, stop: null, start: null } : prev));
        setChainlinkWsState?.((prev) => (prev?.sheetId === sheetId ? { isRunning: false, stop: null, start: null, chartPreset: { type: "line", xKey: "time", yKey: "value" } } : prev));
        setLiveStreamState((s) => {
          const next = { ...(s.streamsBySheetId || {}) };
          delete next[sheetId];
          return { ...s, streamsBySheetId: next };
        });
      } else {
        Object.keys(wsBySheetIdRef.current).forEach((id) => stop(id));
      }
    },
    [setLiveStreamState, setPolymarketWsState, setChainlinkWsState]
  );

  const startPolymarket = useCallback(
    (sheetId, assetIds, eventType, options = {}) => {
      if (wsBySheetIdRef.current[sheetId] || !assetIds?.length || !setSheetData) return;
      eventTypeBySheetIdRef.current[sheetId] = eventType;
      candleIntervalBySheetIdRef.current[sheetId] = options.candleInterval || "5m";
      if (eventType === "candlesticks" && !candleTradeHashesBySheetIdRef.current[sheetId]) {
        candleTradeHashesBySheetIdRef.current[sheetId] = new Set();
      }
      intentionalCloseBySheetIdRef.current[sheetId] = false;
      const ws = new WebSocket(POLYMARKET_WS_URL);
      wsBySheetIdRef.current[sheetId] = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({
          assets_ids: assetIds,
          type: "market",
          initial_dump: true,
          custom_feature_enabled: eventType === "best_bid_ask",
        }));
        if (!options.preserveExistingRows) setSheetData(sheetId, []);
        const pi = pingIntervalBySheetIdRef.current[sheetId];
        if (pi) clearInterval(pi);
        pingIntervalBySheetIdRef.current[sheetId] = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send("PING");
        }, POLYMARKET_PING_MS);

        setPolymarketWsState?.({
          isRunning: true,
          sheetId,
          assetIds,
          stop: () => stop(sheetId),
          start: () =>
            start(sheetId, "polymarket", {
              assetIds,
              eventType,
              preserveExistingRows: options.preserveExistingRows,
              candleInterval: options.candleInterval,
            }),
          chartPreset:
            eventType === "candlesticks"
              ? { type: "candlestick", xKey: "end_period_ts", yKey: "price_close_dollars" }
              : { type: "line", xKey: "time", yKey: "price" },
        });
        typeConfigBySheetIdRef.current[sheetId] = {
          type: "polymarket",
          config: {
            assetIds,
            eventType,
            preserveExistingRows: options.preserveExistingRows,
            candleInterval: options.candleInterval,
          },
        };
        setLiveStreamState((s) => ({
          ...s,
          streamsBySheetId: {
            ...(s.streamsBySheetId || {}),
            [sheetId]: {
              type: "polymarket",
              config: {
                assetIds,
                eventType,
                preserveExistingRows: options.preserveExistingRows,
                candleInterval: options.candleInterval,
              },
              isRunning: true,
              isPaused: false,
            },
          },
        }));
        if (eventType === "candlesticks") {
          const oldTimer = candleTimerBySheetIdRef.current[sheetId];
          if (oldTimer) clearTimeout(oldTimer);
          const advance = () => {
            if (pausedBySheetIdRef.current[sheetId]) return;
            setSheetData(sheetId, (rows) =>
              advancePolymarketCandles(
                rows,
                Date.now(),
                candleIntervalBySheetIdRef.current[sheetId],
              ),
            );
          };
          advance();
          const scheduleAdvance = () => {
            if (intentionalCloseBySheetIdRef.current[sheetId]) return;
            const intervalMs = polymarketCandleIntervalMs(
              candleIntervalBySheetIdRef.current[sheetId],
            );
            const delay = intervalMs - (Date.now() % intervalMs) + 25;
            candleTimerBySheetIdRef.current[sheetId] = setTimeout(() => {
              advance();
              scheduleAdvance();
            }, delay);
          };
          scheduleAdvance();
        }
      };

      ws.onmessage = (event) => {
        if (event.data === "PONG") return;
        try {
          const msg = JSON.parse(event.data);
          const et = eventTypeBySheetIdRef.current[sheetId] || "price_change";
          if (et === "candlesticks" && msg.event_type === "last_trade_price" && msg.asset_id) {
            const transactionHash = String(msg.transaction_hash || "");
            const seen = candleTradeHashesBySheetIdRef.current[sheetId] || new Set();
            if (transactionHash && seen.has(transactionHash)) return;
            if (transactionHash) {
              seen.add(transactionHash);
              if (seen.size > 10_000) seen.delete(seen.values().next().value);
              candleTradeHashesBySheetIdRef.current[sheetId] = seen;
            }
            if (!pausedBySheetIdRef.current[sheetId]) {
              setSheetData(sheetId, (rows) =>
                upsertPolymarketTradeCandle(
                  rows,
                  msg,
                  candleIntervalBySheetIdRef.current[sheetId],
                ),
              );
            }
          } else if (
            et === "candlesticks" &&
            msg.event_type === "price_change" &&
            Array.isArray(msg.price_changes)
          ) {
            if (!pausedBySheetIdRef.current[sheetId]) {
              setSheetData(sheetId, (rows) =>
                msg.price_changes.reduce(
                  (current, change) => applyPolymarketCandleOverlay(current, change),
                  rows,
                ),
              );
            }
          } else if (et === "price_change" && msg.event_type === "price_change" && msg.price_changes) {
            const rows = msg.price_changes.map((pc) => {
              const priceNum = pc.price != null ? parseFloat(pc.price) : null;
              return {
                ...msg,
                ...pc,
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
            pushRows(setSheetData, sheetId, pausedBySheetIdRef, rows);
          } else if (et === "last_trade_price" && msg.event_type === "last_trade_price" && msg.asset_id) {
            const ts = msg.timestamp ? Number(msg.timestamp) : Date.now();
            const priceNum = msg.price != null ? parseFloat(String(msg.price)) : null;
            pushRow(setSheetData, sheetId, pausedBySheetIdRef, {
              ...msg,
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
            pushRow(setSheetData, sheetId, pausedBySheetIdRef, {
              ...msg,
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
              pushRow(setSheetData, sheetId, pausedBySheetIdRef, {
                ...msg,
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
            pushRow(setSheetData, sheetId, pausedBySheetIdRef, {
              ...msg,
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
            pushRow(setSheetData, sheetId, pausedBySheetIdRef, {
              ...msg,
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
            pushRow(setSheetData, sheetId, pausedBySheetIdRef, {
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
            pushRow(setSheetData, sheetId, pausedBySheetIdRef, {
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
        if (wsBySheetIdRef.current[sheetId] !== ws) return;
        wsBySheetIdRef.current[sheetId] = null;
        const pi = pingIntervalBySheetIdRef.current[sheetId];
        if (pi) {
          clearInterval(pi);
          pingIntervalBySheetIdRef.current[sheetId] = null;
        }
        const candleTimer = candleTimerBySheetIdRef.current[sheetId];
        if (candleTimer) {
          clearTimeout(candleTimer);
          delete candleTimerBySheetIdRef.current[sheetId];
        }
        const intentional = intentionalCloseBySheetIdRef.current[sheetId];
        setPolymarketWsState?.((prev) => (prev?.sheetId === sheetId ? { ...prev, isRunning: false, stop: null } : prev));
        setLiveStreamState((s) => {
          const next = { ...(s.streamsBySheetId || {}) };
          if (next[sheetId]) {
            next[sheetId] = {
              ...next[sheetId],
              isRunning: false,
              connecting: !intentional,
              statusMessage: intentional ? "Stopped" : "Reconnecting…",
            };
          }
          return { ...s, streamsBySheetId: next };
        });
        if (!intentional) {
          const config = typeConfigBySheetIdRef.current[sheetId]?.config;
          reconnectTimeoutBySheetIdRef.current[sheetId] = setTimeout(() => {
            reconnectTimeoutBySheetIdRef.current[sheetId] = null;
            if (!intentionalCloseBySheetIdRef.current[sheetId] && config?.assetIds?.length) {
              startPolymarket(sheetId, config.assetIds, config.eventType, {
                preserveExistingRows: true,
                candleInterval: config.candleInterval,
              });
            }
          }, 1500);
        }
      };
    },
    [setSheetData, setLiveStreamState, setPolymarketWsState, stop]
  );

  // --- Chainlink: one WebSocket per sheet (unlimited parallel streams) ---
  // Each connection is independent: wsBySheetIdRef[sheetId], pingIntervalBySheetIdRef[sheetId]. Stop(sheetId) only closes that connection.
  const startChainlink = useCallback(
    (sheetId, symbol) => {
      if (wsBySheetIdRef.current[sheetId] || !setSheetData) return;
      symbolBySheetIdRef.current[sheetId] = symbol;
      intentionalCloseBySheetIdRef.current[sheetId] = false;
      typeConfigBySheetIdRef.current[sheetId] = { type: "chainlink", config: { symbol } };
      setLiveStreamState((s) => ({
        ...s,
        streamsBySheetId: {
          ...(s.streamsBySheetId || {}),
          [sheetId]: {
            type: "chainlink",
            config: { symbol },
            isRunning: false,
            isPaused: false,
            connecting: true,
            statusMessage: "Making connection…",
          },
        },
      }));
      const subscriptionMsg = {
        action: "subscribe",
        subscriptions: [{ topic: "crypto_prices_chainlink", type: "*", filters: JSON.stringify({ symbol }) }],
      };
      const ws = new WebSocket(CHAINLINK_WS_URL);
      wsBySheetIdRef.current[sheetId] = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify(subscriptionMsg));
        const pi = pingIntervalBySheetIdRef.current[sheetId];
        if (pi) clearInterval(pi);
        pingIntervalBySheetIdRef.current[sheetId] = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send("PING");
        }, CHAINLINK_PING_MS);
        setChainlinkWsState?.({
          isRunning: true,
          sheetId,
          stop: () => stop(sheetId),
          start: () => start(sheetId, "chainlink", { symbol }),
          chartPreset: { type: "line", xKey: "time", yKey: "value" },
        });
        setLiveStreamState((s) => ({
          ...s,
          streamsBySheetId: {
            ...(s.streamsBySheetId || {}),
            [sheetId]: {
              type: "chainlink",
              config: { symbol },
              isRunning: true,
              isPaused: false,
              connecting: false,
              statusMessage: "Connected, waiting for data…",
            },
          },
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (!msg?.payload || msg.topic !== "crypto_prices_chainlink" || msg.type !== "update") return;
          const payload = msg.payload;
          if (payload?.symbol !== symbol) return;
          if (pausedBySheetIdRef.current[sheetId]) return;
          const row = {
            source: "chainlink",
            symbol: payload.symbol,
            time: payload.timestamp,
            value: payload.value,
            price: payload.value,
            receivedAt: msg.timestamp,
          };
          if (!firstDataReceivedBySheetIdRef.current[sheetId]) {
            firstDataReceivedBySheetIdRef.current[sheetId] = true;
            setLiveStreamState((s) => {
              const next = { ...(s.streamsBySheetId || {}) };
              if (next[sheetId]) next[sheetId] = { ...next[sheetId], hasReceivedFirstData: true, statusMessage: "Receiving data…" };
              return { ...s, streamsBySheetId: next };
            });
          }
          setSheetData(sheetId, (prev) => {
            const next = Array.isArray(prev) ? [...prev, row] : [row];
            return next.length > 2000 ? next.slice(-2000) : next;
          });
        } catch (_) {}
      };

      ws.onclose = () => {
        if (wsBySheetIdRef.current[sheetId] !== ws) return;
        wsBySheetIdRef.current[sheetId] = null;
        const pi = pingIntervalBySheetIdRef.current[sheetId];
        if (pi) {
          clearInterval(pi);
          pingIntervalBySheetIdRef.current[sheetId] = null;
        }
        const intentional = intentionalCloseBySheetIdRef.current[sheetId];
        setChainlinkWsState?.((prev) => (prev?.sheetId === sheetId ? { isRunning: false, stop: null, start: null, chartPreset: { type: "line", xKey: "time", yKey: "value" } } : prev));
        if (!intentional) {
          setLiveStreamState((s) => {
            const next = { ...(s.streamsBySheetId || {}) };
            const chainlinkCount = Object.values(next).filter((st) => st?.type === "chainlink").length;
            delete next[sheetId];
            if (chainlinkCount <= 1) {
              toast.error("Connection failed, something went wrong. Try again or another selection.");
            }
            return { ...s, streamsBySheetId: next };
          });
        }
      };
    },
    [setSheetData, setLiveStreamState, setChainlinkWsState, stop]
  );

  const start = useCallback(
    (sheetId, type, config) => {
      if (!sheetId) return;
      stop(sheetId);
      if (!pausedBySheetIdRef.current[sheetId]) pausedBySheetIdRef.current[sheetId] = false;
      if (type === "polymarket" && config?.assetIds?.length) {
        startPolymarket(
          sheetId,
          config.assetIds,
          config.eventType || "price_change",
          {
            preserveExistingRows: !!config.preserveExistingRows,
            candleInterval: config.candleInterval,
          },
        );
      } else if (type === "chainlink" && config?.symbol) {
        startChainlink(sheetId, config.symbol);
      }
    },
    [stop, startPolymarket, startChainlink]
  );

  const pause = useCallback(
    (sheetId) => {
      if (sheetId != null) {
        pausedBySheetIdRef.current[sheetId] = true;
        setLiveStreamState((s) => {
          const next = { ...(s.streamsBySheetId || {}) };
          if (next[sheetId]) next[sheetId] = { ...next[sheetId], isPaused: true };
          return { ...s, streamsBySheetId: next };
        });
      }
    },
    [setLiveStreamState]
  );

  const resume = useCallback(
    (sheetId) => {
      if (sheetId != null) {
        pausedBySheetIdRef.current[sheetId] = false;
        setLiveStreamState((s) => {
          const next = { ...(s.streamsBySheetId || {}) };
          if (next[sheetId]) next[sheetId] = { ...next[sheetId], isPaused: false };
          return { ...s, streamsBySheetId: next };
        });
      }
    },
    [setLiveStreamState]
  );

  const restart = useCallback(
    (sheetId) => {
      const st = typeConfigBySheetIdRef.current[sheetId];
      if (!sheetId || !st?.type) return;
      const canRestart = st.type === "polymarket" ? st.config?.assetIds?.length : st.type === "chainlink" ? st.config?.symbol : false;
      if (!canRestart) return;
      // Clear collected data only; keep the existing connection and continue receiving
      if ((st.type === "chainlink" || st.type === "polymarket") && setSheetData) {
        setSheetData(sheetId, []);
      }
    },
    [setSheetData]
  );

  useEffect(() => {
    if (typeof setLiveStreamActions !== "function") return undefined;

    setLiveStreamActions({
      start,
      stop,
      pause,
      resume,
      restart,
    });
    return () => {
      stop();
      if (typeof setLiveStreamActions === "function") {
        setLiveStreamActions({ start: noop, stop: noop, pause: noop, resume: noop, restart: noop });
      }
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
