"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { isKalshiEmbeddingSearchEligible } from "@/lib/kalshiLive/kalshiLiveEmbeddingSearch";
import {
  aggregateKalshiMarketTiming,
  formatKalshiMarketDateRange,
  formatKalshiMarketStatusLabel,
  isKalshiMarketLiveStatus,
  isTickerLikeSegment,
  normalizeSeriesMarketsForPicker,
} from "@/lib/kalshiLive/marketTickerSearch";
import { KALSHI_LIVE_QUERY_ATTRIBUTE_COLUMNS } from "@/lib/kalshiLive/liveMarketAttributeQuery";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  ["initialized", "Initialized"],
  ["inactive", "Inactive"],
  ["active", "Active"],
  ["closed", "Closed"],
  ["determined", "Determined"],
  ["disputed", "Disputed"],
  ["amended", "Amended"],
  ["finalized", "Finalized"],
];

const MARKET_TYPE_OPTIONS = [
  ["binary", "Binary"],
  ["scalar", "Scalar"],
];

const RESULT_OPTIONS = [
  ["yes", "Yes"],
  ["no", "No"],
  ["scalar", "Scalar"],
  ["", "Unresolved"],
];

const SETTLEMENT_BOUNDS_OPTIONS = [
  ["default", "Default"],
  ["floor", "Floor"],
];

const STRIKE_OPTIONS = [
  ["greater", "Greater"],
  ["greater_or_equal", "Greater or equal"],
  ["less", "Less"],
  ["less_or_equal", "Less or equal"],
  ["between", "Between"],
  ["functional", "Functional"],
  ["custom", "Custom"],
  ["structured", "Structured"],
];

/** Response columns plus the request filters that are not fields on the market. */
export function kalshiLiveMarketAttributeColumns(columns) {
  const shaped = (columns || []).map((column) => {
    if (column.id === "status") return { ...column, enumOptions: STATUS_OPTIONS };
    if (column.id === "market_type") return { ...column, enumOptions: MARKET_TYPE_OPTIONS };
    if (column.id === "result") return { ...column, enumOptions: RESULT_OPTIONS };
    if (column.id === "settlement_bounds_type") return { ...column, enumOptions: SETTLEMENT_BOUNDS_OPTIONS };
    if (column.id === "strike_type") return { ...column, enumOptions: STRIKE_OPTIONS };
    if (column.type === "date") return { ...column, dateEpoch: "iso" };
    return column;
  });
  return [...KALSHI_LIVE_QUERY_ATTRIBUTE_COLUMNS, ...shaped];
}

const MAX_MARKETS = 100;
const SEARCH_PLACEHOLDER =
  "Add one or more tickers here, e.g. KXHIGHNY-25JAN01-T77; multiple tickers separated by commas: TICKER1, TICKER2";

function tagLabel(pick) {
  const count = Array.isArray(pick.rows) ? pick.rows.length : 0;
  if (pick.kind === "series" || pick.kind === "event") {
    const noun = pick.kind === "series" ? "Series" : "Event";
    return count ? `${noun} · ${pick.ticker} · ${count}` : `${noun} · ${pick.ticker}`;
  }
  return pick.label || pick.ticker;
}

function SuggestionMetaRow({ status, openTime, closeTime, className }) {
  const live = isKalshiMarketLiveStatus(status);
  const statusLabel = formatKalshiMarketStatusLabel(status);
  const dateRange = formatKalshiMarketDateRange(openTime, closeTime);
  if (!statusLabel && !dateRange) return null;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 flex-wrap items-center justify-end gap-x-2 gap-y-0.5 text-right text-[10px] leading-tight text-muted-foreground",
        className,
      )}
    >
      {statusLabel ? (
        <span className="inline-flex items-center gap-1.5">
          {live ? (
            <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-green-500" aria-hidden />
          ) : (
            <span className="h-2 w-2 shrink-0 rounded-full bg-slate-400 dark:bg-slate-500" aria-hidden />
          )}
          <span className={cn(live ? "text-emerald-700 dark:text-emerald-300" : "")}>{statusLabel}</span>
        </span>
      ) : null}
      {dateRange ? <span className="whitespace-nowrap tabular-nums">{dateRange}</span> : null}
    </span>
  );
}

function mergeSearchSuggestions(marketHits, seriesHits, trimmed) {
  const next = [...seriesHits, ...marketHits];
  const upper = trimmed.toUpperCase();
  const tickerLike = isTickerLikeSegment(trimmed);
  next.sort((a, b) => {
    const aExact = a.kind === "market" && a.ticker === upper ? 0 : 1;
    const bExact = b.kind === "market" && b.ticker === upper ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;
    if (a.kind !== b.kind) {
      if (tickerLike) return a.kind === "market" ? -1 : 1;
      return a.kind === "series" ? -1 : 1;
    }
    return 0;
  });
  const seenMarkets = new Set();
  const seenSeries = new Set();
  const deduped = [];
  for (const item of next) {
    if (item.kind === "market") {
      if (seenMarkets.has(item.ticker)) continue;
      seenMarkets.add(item.ticker);
    } else {
      if (seenSeries.has(item.ticker)) continue;
      seenSeries.add(item.ticker);
    }
    deduped.push(item);
  }
  return deduped;
}

function marketHitFromSuggestion(item) {
  const ticker = String(item?.ticker || "").trim().toUpperCase();
  if (!ticker) return null;
  return {
    kind: "market",
    ticker,
    title: String(item?.title || ticker).trim() || ticker,
    subtitle: String(item?.subtitle || "").trim() || undefined,
    status: String(item?.status || "").trim() || undefined,
    openTime: String(item?.openTime || "").trim() || undefined,
    closeTime: String(item?.closeTime || "").trim() || undefined,
  };
}

const inputClassName =
  "flex h-9 w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-xs text-foreground shadow-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

/**
 * Kalshi Live market search. Focusing the field expands it over the preview so
 * suggestions match the legacy ticker search. A series opens the market picker.
 */
export function KalshiLiveMarketPicker({ picks, onAdd, onRemove }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [box, setBox] = useState(null);
  const [seriesModal, setSeriesModal] = useState(null);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const anchorRef = useRef(null);
  const portalInputRef = useRef(null);
  const listRef = useRef(null);
  const suggestionsRef = useRef(suggestions);
  suggestionsRef.current = suggestions;
  const scrollTopRef = useRef(0);
  const pageRef = useRef({ term: "", cursor: "", hasMore: false, loading: false });
  const seq = useRef(0);
  const abortRef = useRef(null);
  const picked = new Set((picks || []).map((pick) => pick.id));
  const atCap = (picks || []).length >= MAX_MARKETS;
  const seriesPickerRemaining = Math.max(0, MAX_MARKETS - (picks || []).length);
  const seriesSelectedCount = seriesModal ? seriesModal.selected.size : 0;

  const measure = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dialog = el.closest("[role='dialog']");
    const limitRight = dialog ? dialog.getBoundingClientRect().right - 20 : window.innerWidth - 20;
    const width = Math.min(720, Math.max(rect.width, limitRight - rect.left));
    const dialogBottom = dialog ? dialog.getBoundingClientRect().bottom : window.innerHeight;
    const listTop = rect.bottom + 4;
    const listMax = Math.max(180, Math.min(dialogBottom, window.innerHeight) - listTop - 16);
    setBox({ top: rect.top, left: rect.left, width, listMax });
  }, []);

  useEffect(() => {
    if (!expanded) return undefined;
    const root = anchorRef.current?.closest("[role='dialog']");
    const locked = [];
    const lock = (node) => {
      if (!(node instanceof HTMLElement)) return;
      locked.push([node, node.style.overflow]);
      node.style.overflow = "hidden";
    };
    lock(document.documentElement);
    lock(document.body);
    if (root) {
      for (const node of root.querySelectorAll("*")) {
        if (!(node instanceof HTMLElement)) continue;
        const style = window.getComputedStyle(node);
        if (/(auto|scroll)/.test(style.overflowY) || /(auto|scroll)/.test(style.overflowX)) lock(node);
      }
    }
    const blockBackgroundScroll = (event) => {
      const target = event.target;
      const series = document.querySelector("[data-kalshi-series-picker]");
      if (series && target instanceof Node && series.contains(target)) return;
      const list = target instanceof Element ? target.closest("[data-kalshi-search-results]") : null;
      event.stopPropagation();
      if (!list) {
        event.preventDefault();
        return;
      }
      if (event.type !== "wheel") return;
      const dy = event.deltaY || 0;
      const atTop = list.scrollTop <= 0;
      const atBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 1;
      if ((dy < 0 && atTop) || (dy > 0 && atBottom)) event.preventDefault();
    };
    document.addEventListener("wheel", blockBackgroundScroll, { capture: true, passive: false });
    document.addEventListener("touchmove", blockBackgroundScroll, { capture: true, passive: false });
    return () => {
      for (const [node, previous] of locked) node.style.overflow = previous;
      document.removeEventListener("wheel", blockBackgroundScroll, { capture: true });
      document.removeEventListener("touchmove", blockBackgroundScroll, { capture: true });
    };
  }, [expanded]);

  useLayoutEffect(() => {
    if (!expanded) return undefined;
    measure();
    const frame = window.requestAnimationFrame(() => portalInputRef.current?.focus());
    const onReflow = (event) => {
      const list = listRef.current;
      if (list && event?.target && (event.target === list || list.contains(event.target))) return;
      measure();
    };
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [expanded, measure]);

  useEffect(() => {
    const term = query.trim();
    const mySeq = ++seq.current;
    abortRef.current?.abort();
    scrollTopRef.current = 0;
    pageRef.current = { term, cursor: "", hasMore: false, loading: false };
    if (term.length < 2) {
      setSuggestions([]);
      setLoading(false);
      setLoadingMore(false);
      setError("");
      return undefined;
    }
    const ac = new AbortController();
    abortRef.current = ac;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setLoadingMore(false);
      setError("");
      try {
        const marketHits = [];
        const seriesHits = [];
        let nextCursor = "";
        let hasMore = false;
        const tasks = [
          fetch(`/api/integrations/kalshi-live/search/suggestions?${new URLSearchParams({ q: term, mode: "market_search", limit: "20" })}`, {
            headers: { Accept: "application/json" },
            credentials: "same-origin",
            signal: ac.signal,
          }).then(async (res) => {
            const data = await res.json().catch(() => ({}));
            if (!res.ok || ac.signal.aborted) return;
            const list = Array.isArray(data?.suggestions) ? data.suggestions : [];
            for (const item of list) {
              const hit = marketHitFromSuggestion(item);
              if (hit) marketHits.push(hit);
            }
            nextCursor = String(data?.cursor || "").trim();
            hasMore = !!data?.hasMore && !!nextCursor;
          }),
        ];
        if (isKalshiEmbeddingSearchEligible(term)) {
          tasks.push(
            fetch(`/api/integrations/kalshi-live/search/embedding-suggestions?${new URLSearchParams({ q: term })}`, {
              headers: { Accept: "application/json" },
              credentials: "same-origin",
              signal: ac.signal,
            }).then(async (res) => {
              const data = await res.json().catch(() => ({}));
              if (!res.ok || ac.signal.aborted) return;
              const list = Array.isArray(data?.suggestions) ? data.suggestions : [];
              for (const item of list) {
                const ticker = String(item?.ticker || "").trim().toUpperCase();
                if (!ticker) continue;
                seriesHits.push({
                  kind: "series",
                  ticker,
                  title: String(item?.title || item?.ticker || "Series").trim(),
                  subtitle: String(item?.subtitle || "").trim() || undefined,
                  markets: normalizeSeriesMarketsForPicker(item?.markets),
                });
              }
            }),
          );
        }
        await Promise.allSettled(tasks);
        if (mySeq !== seq.current || ac.signal.aborted) return;
        pageRef.current = { term, cursor: nextCursor, hasMore, loading: false };
        setSuggestions(mergeSearchSuggestions(marketHits, seriesHits, term));
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (mySeq !== seq.current) return;
        setSuggestions([]);
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        if (mySeq === seq.current) setLoading(false);
      }
    }, 350);
    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [query]);

  const loadMoreMarkets = useCallback(async () => {
    const page = pageRef.current;
    if (!page.hasMore || page.loading || !page.cursor || page.term.length < 2) return;
    if ((suggestionsRef.current || []).filter((item) => item.kind === "market").length >= 240) {
      page.hasMore = false;
      return;
    }
    page.loading = true;
    setLoadingMore(true);
    const term = page.term;
    try {
      let cursor = page.cursor;
      const collected = [];
      let hasMore = page.hasMore;
      for (let attempt = 0; attempt < 4 && cursor && hasMore; attempt += 1) {
        const params = new URLSearchParams({ q: term, limit: "20", cursor });
        const res = await fetch(`/api/integrations/kalshi-live/search/suggestions?${params}`, {
          headers: { Accept: "application/json" },
          credentials: "same-origin",
        });
        const data = await res.json().catch(() => ({}));
        if (pageRef.current.term !== term) return;
        if (!res.ok) {
          hasMore = false;
          cursor = "";
          setError(typeof data?.error === "string" ? data.error : "Search failed");
          break;
        }
        const hits = (Array.isArray(data?.suggestions) ? data.suggestions : [])
          .map((item) => marketHitFromSuggestion(item))
          .filter(Boolean);
        collected.push(...hits);
        const nextCursor = String(data?.cursor || "").trim();
        hasMore = !!data?.hasMore && !!nextCursor && nextCursor !== cursor;
        cursor = hasMore ? nextCursor : "";
        if (collected.length) break;
      }
      if (pageRef.current.term !== term) return;
      pageRef.current = { term, cursor, hasMore, loading: false };
      if (collected.length) {
        const markets = [];
        const series = [];
        for (const item of suggestionsRef.current || []) {
          if (item.kind === "series") series.push(item);
          else markets.push(item);
        }
        setSuggestions(mergeSearchSuggestions([...markets, ...collected], series, term));
      }
    } catch (err) {
      if (pageRef.current.term === term) {
        pageRef.current.loading = false;
        setError(err instanceof Error ? err.message : "Search failed");
      }
    } finally {
      if (pageRef.current.term === term) {
        pageRef.current.loading = false;
        setLoadingMore(false);
      }
    }
  }, []);

  function addMarket(market) {
    const ticker = String(market?.ticker || "").trim().toUpperCase();
    if (!ticker || picked.has(`market:${ticker}`) || atCap) return;
    onAdd?.({
      id: `market:${ticker}`,
      kind: "market",
      ticker,
      label: ticker,
      title: String(market?.title || ticker).trim() || ticker,
      subtitle: market?.subtitle,
      marketStatus: market?.status,
      openTime: market?.openTime,
      closeTime: market?.closeTime,
    });
  }

  function openSeries(series) {
    setSeriesModal({
      title: series.title || series.ticker || "Select markets",
      markets: Array.isArray(series.markets) ? series.markets : [],
      selected: new Set(),
    });
  }

  function chooseSuggestion(suggestion) {
    if (!suggestion || atCap) return;
    if (suggestion.kind === "series") openSeries(suggestion);
    else addMarket(suggestion);
  }

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    if (scrollTopRef.current) list.scrollTop = scrollTopRef.current;
    const page = pageRef.current;
    if (!expanded || loading || loadingMore || !page.hasMore) return;
    if (list.scrollHeight - list.scrollTop - list.clientHeight < 80) void loadMoreMarkets();
  }, [suggestions, expanded, loading, loadingMore, loadMoreMarkets]);

  const typed = query.trim();
  const showList = expanded && typed.length >= 2;
  const visiblePicks = (picks || []).slice(0, 8);
  const hiddenPicks = (picks || []).slice(8);

  const suggestionList = useMemo(() => {
    if (!showList) return null;
    if (!loading && !suggestions.length) {
      return (
        <motion.p
          key="no-matches"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-border bg-popover px-3 py-2 text-xs text-muted-foreground shadow-md"
        >
          No matches for &ldquo;{typed}&rdquo;
        </motion.p>
      );
    }
    if (!suggestions.length) return null;
    return (
      <motion.ul
        key="suggestions"
        ref={listRef}
        data-kalshi-search-results=""
        role="listbox"
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        onScroll={(event) => {
          const el = event.currentTarget;
          scrollTopRef.current = el.scrollTop;
          if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) void loadMoreMarkets();
        }}
        style={{ maxHeight: box?.listMax || 320 }}
        className="absolute left-0 right-0 top-full z-10 mt-1 overflow-y-auto overscroll-none rounded-lg border border-border bg-popover py-1 shadow-md"
      >
        {suggestions.map((suggestion) => {
          const marketCount = Array.isArray(suggestion.markets) ? suggestion.markets.length : 0;
          const seriesTiming = suggestion.kind === "series" ? aggregateKalshiMarketTiming(suggestion.markets) : null;
          const kindLabel = suggestion.kind === "market" ? "Market" : "Series";
          const kindBadgeClass =
            suggestion.kind === "market"
              ? "bg-emerald-500/15 text-emerald-900 ring-emerald-600/25 dark:bg-emerald-400/15 dark:text-emerald-100 dark:ring-emerald-400/35"
              : "bg-violet-500/15 text-violet-900 ring-violet-600/25 dark:bg-violet-400/15 dark:text-violet-100 dark:ring-violet-400/35";
          const added = suggestion.kind === "market" && picked.has(`market:${suggestion.ticker}`);
          return (
            <li key={`${suggestion.kind}:${suggestion.ticker}:${marketCount}`} role="option">
              <button
                type="button"
                disabled={atCap || added}
                className="flex w-full items-start gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseSuggestion(suggestion)}
              >
                <span className="min-w-0 flex-1 space-y-0.5">
                  <span className="line-clamp-2 block font-medium text-foreground">{suggestion.title || suggestion.ticker}</span>
                  {suggestion.subtitle ? (
                    <span className="line-clamp-1 block text-xs text-muted-foreground">{suggestion.subtitle}</span>
                  ) : null}
                  <span className="block text-xs text-muted-foreground">
                    <span className={cn("rounded px-1.5 py-0.5 font-mono text-[0.65rem] font-medium tracking-wide ring-1", kindBadgeClass)}>
                      {kindLabel}
                    </span>
                    {suggestion.ticker ? ` · ${suggestion.ticker}` : ""}
                    {suggestion.kind === "series" && marketCount ? ` · ${marketCount} markets` : ""}
                    {added ? " · Added" : ""}
                  </span>
                </span>
                {suggestion.kind === "market" ? (
                  <SuggestionMetaRow status={suggestion.status} openTime={suggestion.openTime} closeTime={suggestion.closeTime} />
                ) : seriesTiming ? (
                  <SuggestionMetaRow status={seriesTiming.status} openTime={seriesTiming.openTime} closeTime={seriesTiming.closeTime} />
                ) : null}
              </button>
            </li>
          );
        })}
        {loadingMore ? (
          <li className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Loading more markets
          </li>
        ) : null}
      </motion.ul>
    );
  }, [showList, loading, loadingMore, suggestions, typed, picked, atCap, box?.listMax, loadMoreMarkets]);

  const searchField = (portal) => (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 z-[1] flex h-4 w-4 -translate-y-1/2 items-center justify-center text-muted-foreground">
        {loading ? <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden /> : <Search className="h-4 w-4" aria-hidden />}
      </span>
      <input
        ref={portal ? portalInputRef : undefined}
        type="text"
        value={query}
        disabled={atCap}
        placeholder={SEARCH_PLACEHOLDER}
        aria-label="Search Kalshi markets"
        autoComplete="off"
        onChange={(event) => {
          setQuery(event.target.value);
          setError("");
          if (!expanded) setExpanded(true);
        }}
        onFocus={() => setExpanded(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            setExpanded(false);
            return;
          }
          if (event.key === "Enter") {
            event.preventDefault();
            const first = suggestions[0];
            if (expanded && first) chooseSuggestion(first);
          }
        }}
        className={cn(inputClassName, portal && "pr-8", atCap && "opacity-70")}
      />
      {portal ? (
        <button
          type="button"
          aria-label="Close search"
          className="absolute right-2 top-1/2 z-[1] -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setExpanded(false)}
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      ) : null}
      <AnimatePresence>{portal ? suggestionList : null}</AnimatePresence>
    </div>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12px] font-semibold text-foreground">Markets</p>
          {(picks || []).length ? (
            <span className="text-[10px] text-muted-foreground">{picks.length} selected</span>
          ) : null}
        </div>
        <div ref={anchorRef} className={cn(expanded && "invisible")}>
          {searchField(false)}
        </div>
        {expanded && box && typeof document !== "undefined"
          ? createPortal(
              <>
                <button
                  type="button"
                  aria-label="Close market search"
                  className="fixed inset-0 z-[600] cursor-default bg-black/25"
                  onMouseDown={() => setExpanded(false)}
                />
                <div className="fixed z-[610]" style={{ top: box.top, left: box.left, width: box.width }}>
                  {searchField(true)}
                </div>
              </>,
              document.body,
            )
          : null}
        <p className="text-[10px] leading-snug text-muted-foreground">
          If you don&apos;t know your ticker, search anything and suggestions will populate.
        </p>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        {picks?.length ? (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {visiblePicks.map((pick) => (
              <PickChip key={pick.id} pick={pick} onRemove={onRemove} />
            ))}
            {hiddenPicks.length ? (
              <Popover open={overflowOpen} onOpenChange={setOverflowOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center rounded-full border border-emerald-600/25 bg-emerald-500/15 px-2 py-px text-[10px] font-semibold leading-4 text-emerald-900 hover:bg-emerald-500/25 dark:text-emerald-100"
                  >
                    +{hiddenPicks.length}
                  </button>
                </PopoverTrigger>
                <PopoverContent side="bottom" align="start" className="z-[620] max-h-80 w-80 overflow-y-auto p-2">
                  <p className="px-1 pb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {picks.length} markets selected
                  </p>
                  <ul className="space-y-0.5">
                    {picks.map((pick) => (
                      <li key={pick.id} className="flex items-start justify-between gap-2 rounded-md px-1.5 py-1.5 hover:bg-muted/60">
                        <PickDetails pick={pick} />
                        <button
                          type="button"
                          aria-label={`Remove ${tagLabel(pick)}`}
                          className="mt-0.5 shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          onClick={() => onRemove?.(pick.id)}
                        >
                          <X className="h-3 w-3" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                </PopoverContent>
              </Popover>
            ) : null}
          </div>
        ) : (
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Add a market, or open a series and choose the markets to include. The preview updates as you add them.
          </p>
        )}

        <Dialog
          open={!!seriesModal}
          onOpenChange={(open) => {
            if (!open) setSeriesModal(null);
          }}
        >
          <DialogContent data-kalshi-series-picker="" overlayClassName="z-[700]" className="z-[700] max-h-[85vh] max-w-lg overflow-hidden sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="pr-6 text-base">{seriesModal?.title || "Select markets"}</DialogTitle>
              <DialogDescription>
                Select up to {seriesPickerRemaining} market{seriesPickerRemaining === 1 ? "" : "s"} to add to your ticker list.
                {seriesModal?.markets?.length ? ` ${seriesModal.markets.length} markets in this series.` : ""}
              </DialogDescription>
            </DialogHeader>
            {(seriesModal?.markets || []).length > 0 ? (
              <div className="-mt-1 flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-full px-3 text-xs font-normal"
                  onClick={() => {
                    setSeriesModal((prev) => {
                      if (!prev) return prev;
                      const allSelected =
                        prev.markets.length > 0 &&
                        (prev.selected.size >= seriesPickerRemaining || prev.markets.every((market) => prev.selected.has(market.ticker)));
                      if (allSelected || seriesPickerRemaining <= 0) return { ...prev, selected: new Set() };
                      const selected = new Set();
                      for (const market of prev.markets) {
                        if (selected.size >= seriesPickerRemaining) break;
                        selected.add(market.ticker);
                      }
                      return { ...prev, selected };
                    });
                  }}
                >
                  {seriesModal &&
                  seriesModal.markets.length > 0 &&
                  seriesModal.selected.size > 0 &&
                  (seriesModal.selected.size >= seriesPickerRemaining ||
                    seriesModal.markets.every((market) => seriesModal.selected.has(market.ticker)))
                    ? "Deselect all"
                    : "Select all"}
                </Button>
              </div>
            ) : null}
            <div className="max-h-[min(24rem,50vh)] space-y-1 overflow-auto pr-1">
              {(seriesModal?.markets || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No markets available for this series.</p>
              ) : (
                (seriesModal?.markets || []).map((market) => {
                  const checked = seriesModal?.selected.has(market.ticker);
                  const blocked = !checked && (seriesModal?.selected.size || 0) >= seriesPickerRemaining;
                  return (
                    <button
                      key={market.ticker}
                      type="button"
                      disabled={blocked}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-md border px-2.5 py-2 text-left transition-colors",
                        checked
                          ? "border-primary/40 bg-primary/5"
                          : blocked
                            ? "cursor-not-allowed border-border/40 bg-muted/20 opacity-60"
                            : "border-border/60 bg-background hover:bg-muted/30",
                      )}
                      onClick={() => {
                        setSeriesModal((prev) => {
                          if (!prev) return prev;
                          const selected = new Set(prev.selected);
                          if (selected.has(market.ticker)) selected.delete(market.ticker);
                          else if (selected.size < seriesPickerRemaining) selected.add(market.ticker);
                          return { ...prev, selected };
                        });
                      }}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border",
                          checked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background",
                        )}
                      >
                        {checked ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
                      </span>
                      <span className="min-w-0 flex-1 space-y-0.5">
                        <span className="flex items-start justify-between gap-2">
                          <span className="min-w-0 text-xs font-medium text-foreground">{market.title || market.ticker}</span>
                          <SuggestionMetaRow status={market.status} openTime={market.openTime} closeTime={market.closeTime} />
                        </span>
                        <span className="block font-mono text-[10px] text-muted-foreground">{market.ticker}</span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="ghost" size="sm" onClick={() => setSeriesModal(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!seriesSelectedCount}
                onClick={() => {
                  if (!seriesModal) return;
                  for (const market of seriesModal.markets) {
                    if (seriesModal.selected.has(market.ticker)) addMarket(market);
                  }
                  setSeriesModal(null);
                }}
              >
                Add {seriesSelectedCount > 0 ? `${seriesSelectedCount} ` : ""}market
                {seriesSelectedCount === 1 ? "" : "s"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    </TooltipProvider>
  );
}

function PickDetails({ pick }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium leading-snug text-foreground">{pick.title || pick.label || pick.ticker}</p>
      <p className="font-mono text-[10px] text-muted-foreground">{pick.ticker}</p>
      {pick.error ? <p className="text-[10px] text-destructive">{pick.error}</p> : null}
      <SuggestionMetaRow status={pick.marketStatus} openTime={pick.openTime} closeTime={pick.closeTime} />
    </div>
  );
}

function PickChip({ pick, onRemove }) {
  const label = tagLabel(pick);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex max-w-full items-center gap-0.5 rounded-full border py-px pl-1.5 pr-0.5 text-[10px] font-medium leading-4",
            pick.status === "error"
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-emerald-600/25 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
          )}
        >
          {pick.status === "loading" ? <Loader2 className="h-2.5 w-2.5 shrink-0 animate-spin" aria-hidden /> : null}
          <span className="truncate font-mono">{label}</span>
          <button
            type="button"
            aria-label={`Remove ${label}`}
            className="rounded-full p-0.5 text-emerald-800/70 hover:bg-emerald-500/20 hover:text-emerald-950 dark:text-emerald-100/80"
            onClick={() => onRemove?.(pick.id)}
          >
            <X className="h-2.5 w-2.5" aria-hidden />
          </button>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="z-[620] max-w-xs text-pretty">
        <PickDetails pick={pick} />
      </TooltipContent>
    </Tooltip>
  );
}
