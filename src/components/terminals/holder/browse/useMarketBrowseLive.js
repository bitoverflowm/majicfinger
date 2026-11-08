"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { openPolymarketMarketFeed } from "@/lib/polymarketLive/openPolymarketMarketSocket";
import { fromSocket } from "./marketBrowseFeeds";

/** Crypto up/down markets are created a dozen at a time, so arrivals this close together share one alert. */
const NEW_MARKET_BATCH_MS = 1500;
const FLUSH_MS = 400;
const RESUBSCRIBE_MS = 800;
const DISCOVERY_ASSETS = 6;
const RATE_WINDOW_MS = 60_000;

/**
 * Markets created and resolved anywhere on Polymarket. The socket needs some assets to subscribe
 * to, so it takes the first few it is given and keeps them, which keeps the connection steady.
 *
 * @param {{ assetIds: string[], onNewMarkets: (markets: object[]) => void, onResolved: (msg: object) => void }} opts
 * @returns {"connecting" | "open" | "closed" | "error"}
 */
export function useNewMarketFeed({ assetIds, onNewMarkets, onResolved }) {
  const [status, setStatus] = useState("connecting");
  const [assetsKey, setAssetsKey] = useState("");
  const handlers = useRef({ onNewMarkets, onResolved });
  handlers.current = { onNewMarkets, onResolved };

  useEffect(() => {
    if (!assetsKey && assetIds.length) setAssetsKey(assetIds.slice(0, DISCOVERY_ASSETS).join(","));
  }, [assetIds, assetsKey]);

  useEffect(() => {
    if (!assetsKey) return undefined;
    const seen = new Set();
    let buffer = [];
    let timer = 0;
    const close = openPolymarketMarketFeed({
      assetIds: assetsKey.split(","),
      onStatus: setStatus,
      onNewMarket: (msg) => {
        const market = fromSocket(msg);
        if (!/^0x[a-fA-F0-9]{64}$/.test(market.conditionId) || seen.has(market.conditionId)) return;
        seen.add(market.conditionId);
        buffer.push(market);
        if (timer) return;
        timer = window.setTimeout(() => {
          timer = 0;
          const batch = buffer;
          buffer = [];
          handlers.current.onNewMarkets?.(batch);
        }, NEW_MARKET_BATCH_MS);
      },
      onResolved: (msg) => handlers.current.onResolved?.(msg),
    });
    return () => {
      close();
      window.clearTimeout(timer);
    };
  }, [assetsKey]);

  return status;
}

/**
 * Live prices and traded volume for the assets on screen. Moves are collected and published a few
 * times a second; the socket is reopened when the on-screen set settles on something new.
 *
 * @param {string[]} assetIds
 * @returns {{
 *   quotes: Map<string, { price: number, dir: number, at: number }>,
 *   traded: Map<string, number>,
 *   tradesPerMin: number,
 *   status: "idle" | "connecting" | "open" | "closed" | "error",
 *   version: number,
 * }}
 */
export function useLiveQuotes(assetIds) {
  const quotesRef = useRef(new Map());
  const tradedRef = useRef(new Map());
  const tradeTimesRef = useRef([]);
  const [version, setVersion] = useState(0);
  const [status, setStatus] = useState("idle");
  const [tradesPerMin, setTradesPerMin] = useState(0);
  const key = useMemo(() => [...new Set(assetIds.filter(Boolean))].sort().join(","), [assetIds]);
  const [activeKey, setActiveKey] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setActiveKey(key), activeKey ? RESUBSCRIBE_MS : 0);
    return () => window.clearTimeout(timer);
  }, [key, activeKey]);

  useEffect(() => {
    if (!activeKey) {
      setStatus("idle");
      return undefined;
    }
    setStatus("connecting");
    let dirty = false;
    const quotes = quotesRef.current;
    const move = (token, price) => {
      const previous = quotes.get(token);
      if (previous && Math.abs(previous.price - price) < 1e-9) return;
      quotes.set(token, { price, dir: previous ? Math.sign(price - previous.price) : 0, at: Date.now() });
      dirty = true;
    };
    const flush = window.setInterval(() => {
      const cutoff = Date.now() - RATE_WINDOW_MS;
      const times = tradeTimesRef.current;
      while (times.length && times[0] < cutoff) times.shift();
      setTradesPerMin(times.length);
      if (!dirty) return;
      dirty = false;
      setVersion((value) => value + 1);
    }, FLUSH_MS);
    const close = openPolymarketMarketFeed({
      assetIds: activeKey.split(","),
      onStatus: setStatus,
      onQuote: (quote) => move(quote.asset_id, quote.mid),
      onTrade: (trade) => {
        move(trade.asset_id, trade.price);
        tradedRef.current.set(trade.asset_id, (tradedRef.current.get(trade.asset_id) || 0) + trade.price * trade.size);
        tradeTimesRef.current.push(Date.now());
        dirty = true;
      },
    });
    return () => {
      close();
      window.clearInterval(flush);
    };
  }, [activeKey]);

  return { quotes: quotesRef.current, traded: tradedRef.current, tradesPerMin, status, version };
}
