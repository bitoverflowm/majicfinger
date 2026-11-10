"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cleanTerms, mergeArticles } from "@/lib/newsQuery";
import { useHolderDemoFeed } from "./holderDemoFeed";

const SOURCES = ["google", "gdelt", "volume"];
const POLL_MS = 60_000;
const RETRY_MS = 45_000;
const MAX_RETRIES = 4;
/** Windows snap to these steps so nearby views share one lookup. */
const LIVE_STEP_MS = 5 * 60_000;
const PAST_STEP_MS = 15 * 60_000;
const FRESH_MS = { live: 55_000, past: 30 * 60_000 };
/** An article only counts as breaking if it's newer than when we started watching, less this. */
const ARRIVAL_SLACK_MS = 15 * 60_000;
const EMPTY = [];

const store = new Map();

function fetchNews(source, params, signal) {
  return fetch(`/api/news?${params}`, { signal }).then((res) => res.json());
}

/**
 * Headlines and article counts mentioning every one of `terms` over `win` (`{ start, end, live }`),
 * from Google News and GDELT merged. A live window runs to now and re-checks every minute;
 * `arrivals` maps article ids that showed up while watching to when they did.
 */
export function useMarketNews(terms, win) {
  const termsKey = cleanTerms(terms).join("\u0001");
  const live = !!win?.live;
  const start = win ? Math.floor(win.start / PAST_STEP_MS) * PAST_STEP_MS : 0;
  const end = win && !live ? Math.ceil(win.end / PAST_STEP_MS) * PAST_STEP_MS : 0;
  const [results, setResults] = useState({});
  const [arrivals, setArrivals] = useState(() => new Map());
  const watch = useRef({ termsKey: "", since: 0, ids: new Set() });
  const feed = useHolderDemoFeed();
  const request = feed?.news || fetchNews;

  useEffect(() => {
    setResults({});
    setArrivals(new Map());
  }, [termsKey]);

  useEffect(() => {
    if (!termsKey || !start) return undefined;
    let cancelled = false;
    const controller = new AbortController();
    const timers = new Set();
    const retries = {};
    const later = (fn, ms) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    };
    const put = (source, patch) => setResults((prev) => ({ ...prev, [source]: { ...prev[source], ...patch } }));

    const load = (source) => {
      const stop = live ? Math.ceil(Date.now() / LIVE_STEP_MS) * LIVE_STEP_MS : end;
      const params = new URLSearchParams({ source, start: String(start), end: String(stop) });
      for (const term of termsKey.split("\u0001")) params.append("terms", term);
      const key = params.toString();
      const hit = feed ? null : store.get(key);
      if (hit && Date.now() - hit.at < (live ? FRESH_MS.live : FRESH_MS.past)) {
        put(source, { ...hit.result, loading: false });
        return;
      }
      put(source, { loading: true });
      request(source, key, controller.signal)
        .then((result) => {
          if (cancelled) return;
          const usable = result.status === "ok" || result.status === "out_of_range";
          if (usable) {
            if (!feed) store.set(key, { result, at: Date.now() });
            setResults((prev) => ({ ...prev, [source]: { ...result, loading: false } }));
            return;
          }
          put(source, { status: result.status || "error", message: result.message || "Couldn't load news.", loading: false });
          const again = result.status === "limited" || result.status === "busy" || result.status === "unavailable";
          retries[source] = (retries[source] || 0) + 1;
          if (again && retries[source] <= MAX_RETRIES) later(() => load(source), RETRY_MS);
        })
        .catch((err) => {
          if (!cancelled && err?.name !== "AbortError") put(source, { status: "error", message: "Couldn't load news.", loading: false });
        });
    };

    for (const source of SOURCES) load(source);
    const poll = live
      ? window.setInterval(() => {
          for (const source of SOURCES) load(source);
        }, POLL_MS)
      : 0;
    return () => {
      cancelled = true;
      controller.abort();
      if (poll) window.clearInterval(poll);
      for (const id of timers) window.clearTimeout(id);
    };
  }, [termsKey, start, end, live, feed, request]);

  const google = results.google?.articles;
  const gdelt = results.gdelt?.articles;
  const articles = useMemo(() => mergeArticles([google || EMPTY, gdelt || EMPTY]), [google, gdelt]);

  useEffect(() => {
    if (!articles.length) return;
    const seen = watch.current;
    if (seen.termsKey !== termsKey) {
      watch.current = { termsKey, since: Date.now(), ids: new Set(articles.map((article) => article.id)) };
      return;
    }
    const fresh = [];
    for (const article of articles) {
      if (seen.ids.has(article.id)) continue;
      seen.ids.add(article.id);
      if (article.precision !== "day" && article.t >= seen.since - ARRIVAL_SLACK_MS) fresh.push(article.id);
    }
    if (fresh.length) {
      const at = Date.now();
      setArrivals((prev) => {
        const next = new Map(prev);
        for (const id of fresh) next.set(id, at);
        return next;
      });
    }
  }, [articles, termsKey]);

  return {
    articles,
    volume: results.volume?.volume || EMPTY,
    sources: { google: results.google || null, gdelt: results.gdelt || null, volume: results.volume || null },
    arrivals,
    loading: SOURCES.some((source) => results[source]?.loading) && !articles.length,
  };
}
