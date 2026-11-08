"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { marketPriceSheet } from "./holderTerminalSheets";

const REFRESH_MS = 5 * 60_000;
/** Bucket sizes Polymarket accepts, in minutes. The finest that keeps a line near 1,500 points wins. */
const FIDELITIES = [1, 5, 15, 60, 360, 1440];
const TARGET_POINTS = 1500;
/** Quotes closer together than this replace the last live point instead of adding one. */
const LIVE_GAP_SEC = 2;
const FALLBACK_SPAN_MS = 30 * 24 * 60 * 60_000;

function fidelityFor(spanSec) {
  const minutes = spanSec / 60;
  return FIDELITIES.find((fidelity) => minutes / fidelity <= TARGET_POINTS) ?? FIDELITIES[FIDELITIES.length - 1];
}

/** Each outcome's history as `{ t, p }` points (t in seconds), from its first day to now or its close. */
async function fetchHistory(meta, signal) {
  const tokens = meta.tokenIds.slice(0, 2);
  const now = Date.now();
  const endMs = meta.closed && meta.closeMs ? Math.min(meta.closeMs, now) : now;
  const start = Math.floor((meta.openMs || endMs - FALLBACK_SPAN_MS) / 1000);
  const end = Math.max(Math.floor(endMs / 1000), start + 60);
  const res = await fetch("/api/integrations/polymarket?query=getBatchPricesHistory", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    credentials: "same-origin",
    signal,
    body: JSON.stringify({ markets: tokens, start_ts: start, end_ts: end, fidelity: fidelityFor(end - start) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Couldn't load the price history.");
  const history = data?.history && typeof data.history === "object" ? data.history : {};
  return tokens.map((token) =>
    (Array.isArray(history[token]) ? history[token] : [])
      .map((point) => ({ t: Number(point?.t), p: Number(point?.p) }))
      .filter((point) => Number.isFinite(point.t) && Number.isFinite(point.p))
      .sort((a, b) => a.t - b.t),
  );
}

/**
 * Polymarket's price line for both outcomes as a canvas sheet: the stored history, refreshed every
 * few minutes, with each live price (`livePrices`, one per outcome) appended as it changes.
 */
export function useMarketPriceHistory(meta, livePrices) {
  const [history, setHistory] = useState(null);
  const [live, setLive] = useState([[], []]);
  const [error, setError] = useState("");
  const conditionId = meta?.conditionId || "";
  const closed = !!meta?.closed;

  const metaRef = useRef(meta);
  metaRef.current = meta;

  useEffect(() => {
    if (!conditionId || !metaRef.current?.tokenIds?.length) return undefined;
    const abort = new AbortController();
    let timer = 0;
    setHistory(null);
    setLive([[], []]);
    setError("");
    const load = () =>
      fetchHistory(metaRef.current, abort.signal)
        .then((next) => {
          if (abort.signal.aborted) return;
          setHistory(next);
          setError("");
          setLive((prev) => prev.map((points, index) => points.filter((point) => point.t > (next[index]?.at(-1)?.t ?? 0))));
        })
        .catch((err) => {
          if (abort.signal.aborted || err?.name === "AbortError") return;
          setError(err?.message || "Couldn't load the price history.");
        })
        .finally(() => {
          if (!abort.signal.aborted && !closed) timer = window.setTimeout(load, REFRESH_MS);
        });
    void load();
    return () => {
      abort.abort();
      window.clearTimeout(timer);
    };
  }, [conditionId, closed]);

  const priceKey = (livePrices || []).slice(0, 2).join(",");
  useEffect(() => {
    if (closed || !history || !priceKey) return;
    const now = Date.now() / 1000;
    const prices = priceKey.split(",").map(Number);
    setLive((prev) => {
      let changed = false;
      const next = prev.map((points, index) => {
        const price = prices[index];
        if (!Number.isFinite(price)) return points;
        const last = points.at(-1) ?? history[index]?.at(-1);
        if (last && last.p === price) return points;
        changed = true;
        const recent = points.length && now - points[points.length - 1].t < LIVE_GAP_SEC;
        return [...(recent ? points.slice(0, -1) : points), { t: now, p: price }];
      });
      return changed ? next : prev;
    });
  }, [closed, history, priceKey]);

  const sheet = useMemo(() => {
    if (!meta || !history) return null;
    const records = [];
    meta.tokenIds.slice(0, 2).forEach((token, index) => {
      const outcome = meta.outcomes?.[index] || (index ? "No" : "Yes");
      for (const point of [...history[index], ...(live[index] || [])]) {
        records.push({
          token_id: token,
          outcome,
          t: point.t,
          timestamp: new Date(point.t * 1000).toISOString(),
          p: point.p,
          condition_id: meta.conditionId,
          market_title: meta.title,
          market_slug: meta.slug,
        });
      }
    });
    return marketPriceSheet(meta, records);
  }, [history, live, meta]);

  return { sheet, loading: !history && !error, error };
}
