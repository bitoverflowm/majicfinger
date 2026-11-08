"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { resolvePolymarketMarket } from "@/components/dashboardComposer/recipes/polymarketTradeHistorySource";
import { openPolymarketQuoteSocket } from "@/lib/polymarketLive/openPolymarketMarketSocket";

const META_REFRESH_MS = 30_000;
const QUOTE_FLUSH_MS = 400;
/** Polymarket shows the midpoint unless the spread is wider than 10¢, then the last trade. */
const MIDPOINT_MAX_SPREAD = 0.1;

/** The market's details, refreshed every 30 seconds, plus top of book for each outcome off the websocket. */
export function useLiveMarketMeta(conditionId) {
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState("");
  const [quotes, setQuotes] = useState({});
  const [refreshedAt, setRefreshedAt] = useState(0);

  useEffect(() => {
    if (!conditionId) return undefined;
    const abort = new AbortController();
    let timer = 0;
    setMeta(null);
    setError("");
    setQuotes({});
    const load = (first) =>
      resolvePolymarketMarket(conditionId, abort.signal)
        .then((next) => {
          if (abort.signal.aborted) return;
          setMeta(next);
          setRefreshedAt(Date.now());
          setError("");
        })
        .catch((err) => {
          if (err?.name === "AbortError") return;
          if (first) setError(err?.message || "Couldn't load this market.");
        })
        .finally(() => {
          if (!abort.signal.aborted) timer = window.setTimeout(() => void load(false), META_REFRESH_MS);
        });
    void load(true);
    return () => {
      abort.abort();
      window.clearTimeout(timer);
    };
  }, [conditionId]);

  const tokensKey = (meta?.tokenIds || []).join(",");
  const pendingQuotes = useRef({});
  useEffect(() => {
    if (!tokensKey || meta?.closed) return undefined;
    let timer = 0;
    pendingQuotes.current = {};
    const flush = () => {
      timer = 0;
      const next = pendingQuotes.current;
      pendingQuotes.current = {};
      setQuotes((prev) => ({ ...prev, ...next }));
    };
    const close = openPolymarketQuoteSocket({
      assetIds: tokensKey.split(","),
      onQuote: (quote) => {
        pendingQuotes.current[quote.asset_id] = quote;
        if (!timer) timer = window.setTimeout(flush, QUOTE_FLUSH_MS);
      },
    });
    return () => {
      close();
      window.clearTimeout(timer);
    };
  }, [tokensKey, meta?.closed]);

  return { meta, error, quotes, refreshedAt };
}

/** Last trade per token from rows that are newest first. */
export function latestTradeByToken(rows, tokenIds) {
  const wanted = new Set((tokenIds || []).map(String));
  const found = {};
  for (const row of rows) {
    if (!wanted.size) break;
    const token = String(row.token_id);
    if (!wanted.has(token)) continue;
    wanted.delete(token);
    found[token] = row;
  }
  return found;
}

/** The market's details with prices, bid / ask and last trade taken from the live feeds. */
export function useLiveMarketStats(meta, quotes, rows) {
  return useMemo(() => {
    if (!meta) return null;
    const tokens = meta.tokenIds || [];
    const latest = latestTradeByToken(rows, tokens);
    const prices = tokens.map((token, index) => {
      const quote = quotes[token];
      const bid = quote?.best_bid;
      const ask = quote?.best_ask;
      if (bid != null && ask != null && ask - bid <= MIDPOINT_MAX_SPREAD) return (bid + ask) / 2;
      const traded = Number(latest[token]?.price);
      return Number.isFinite(traded) && latest[token] ? traded : meta.prices?.[index] ?? null;
    });
    const first = quotes[tokens[0]];
    const lastFirst = Number(latest[tokens[0]]?.price);
    const newest = rows[0];
    return {
      ...meta,
      prices: meta.winner ? meta.prices : prices,
      bestBid: first?.best_bid ?? meta.bestBid,
      bestAsk: first?.best_ask ?? meta.bestAsk,
      lastPrice: Number.isFinite(lastFirst) && latest[tokens[0]] ? lastFirst : meta.lastPrice,
      lastTradeSec: newest ? Number(newest.timestamp) || 0 : 0,
    };
  }, [meta, quotes, rows]);
}
