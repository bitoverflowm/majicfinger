"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MarketTickerSearchCutoffNotes } from "@/components/connectData/MarketTickerSearchCutoffNotes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { isKalshiEmbeddingSearchEligible } from "@/lib/kalshiLive/kalshiLiveEmbeddingSearch";
import {
  aggregateKalshiMarketTiming,
  formatKalshiMarketDateRange,
  formatKalshiMarketStatusLabel,
  getMarketTickerSearchSegment,
  isKalshiMarketLiveStatus,
  isTickerLikeSegment,
  isValidMarketTickerToken,
  normalizeSeriesMarketsForPicker,
  parseMarketTickerList,
  resolveMarketTickers,
  serializeMarketTickerSelections,
} from "@/lib/kalshiLive/marketTickerSearch";
import { cn } from "@/lib/utils";

/** @typedef {import("@/lib/kalshiLive/marketTickerSearch").MarketTickerSelection} MarketTickerSelection */
/** @typedef {import("@/lib/kalshiLive/marketTickerSearch").KalshiTickerSearchDataSource} KalshiTickerSearchDataSource */

/**
 * @typedef {{
 *   kind: "market";
 *   ticker: string;
 *   title: string;
 *   subtitle?: string;
 *   status?: string;
 *   openTime?: string;
 *   closeTime?: string;
 * }} MarketSuggestion
 *
 * @typedef {{
 *   kind: "series";
 *   ticker: string;
 *   title: string;
 *   subtitle?: string;
 *   markets: MarketTickerSelection[];
 * }} SeriesSuggestion
 *
 * @typedef {MarketSuggestion | SeriesSuggestion} TickerSearchSuggestion
 */

const MAX_TICKERS = 100;

/**
 * @param {{
 *   status?: string;
 *   openTime?: string;
 *   closeTime?: string;
 *   className?: string;
 * }} meta
 */
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
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-green-500 animate-pulse"
              aria-hidden
            />
          ) : (
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-slate-400 dark:bg-slate-500"
              aria-hidden
            />
          )}
          <span className={cn(live ? "text-emerald-700 dark:text-emerald-300" : "")}>
            {statusLabel}
          </span>
        </span>
      ) : null}
      {dateRange ? <span className="tabular-nums whitespace-nowrap">{dateRange}</span> : null}
    </span>
  );
}

/**
 * Basic market info shown when hovering a selected ticker chip (and in the "+N" popover).
 *
 * @param {{ selection: MarketTickerSelection }} props
 */
function SelectionHoverDetails({ selection }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium leading-snug text-foreground">
        {selection.title || selection.ticker}
      </p>
      <p className="font-mono text-[10px] text-muted-foreground">{selection.ticker}</p>
      {selection.eventTicker && selection.eventTicker !== selection.ticker ? (
        <p className="text-[10px] text-muted-foreground">
          Event: <span className="font-mono">{selection.eventTicker}</span>
        </p>
      ) : null}
      <SuggestionMetaRow
        status={selection.status}
        openTime={selection.openTime}
        closeTime={selection.closeTime}
        className="justify-start text-left"
      />
    </div>
  );
}

/**
 * @param {{
 *   selection: MarketTickerSelection;
 *   busy: boolean;
 *   onRemove: (ticker: string) => void;
 * }} props
 */
function SelectionChip({ selection, busy, onRemove }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex max-w-full items-center gap-0.5 rounded-full border border-emerald-600/25 bg-emerald-500/10 py-px pl-1.5 pr-0.5 text-[10px] font-medium leading-4 text-emerald-900 dark:text-emerald-100">
          <span className="truncate font-mono">{selection.ticker}</span>
          <button
            type="button"
            disabled={busy}
            aria-label={`Remove ${selection.ticker}`}
            className="rounded-full p-0.5 text-emerald-800/70 hover:bg-emerald-500/20 hover:text-emerald-950 dark:text-emerald-100/80"
            onClick={() => onRemove(selection.ticker)}
          >
            <X className="h-2.5 w-2.5" aria-hidden />
          </button>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs text-pretty">
        <SelectionHoverDetails selection={selection} />
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Selected-ticker chips capped at two visual rows. Overflow collapses into a
 * "+N" chip whose hover popover lists every selected market for inspection.
 *
 * @param {{
 *   selections: MarketTickerSelection[];
 *   busy: boolean;
 *   onRemove: (ticker: string) => void;
 * }} props
 */
function SelectionChipsRow({ selections, busy, onRemove }) {
  const containerRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const [measure, setMeasure] = useState(
    /** @type {{ key: string; count: number | null }} */ ({ key: "", count: null }),
  );
  const [overflowOpen, setOverflowOpen] = useState(false);
  const closeTimerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));

  const selectionsKey = useMemo(
    () => selections.map((s) => s.ticker).join(","),
    [selections],
  );

  // Render-phase reset: when the chip set changes, invalidate the previous
  // measurement synchronously so we never paint a stale layout.
  if (measure.key !== selectionsKey) {
    setMeasure({ key: selectionsKey, count: null });
  }

  const visibleCount = measure.key === selectionsKey ? measure.count : null;

  // Re-measure when the container width changes (e.g. panel resize).
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let lastWidth = el.offsetWidth;
    const ro = new ResizeObserver(() => {
      // Ignore scrollbar-sized jitter so measuring cannot loop forever.
      if (Math.abs(el.offsetWidth - lastWidth) > 24) {
        lastWidth = el.offsetWidth;
        setMeasure((prev) => (prev.count === null ? prev : { ...prev, count: null }));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Runs after every commit; only acts while unmeasured, so it cannot get
  // stuck the way a dependency-gated effect can.
  useLayoutEffect(() => {
    if (visibleCount !== null) return;
    const el = containerRef.current;
    if (!el) return;
    const chips = Array.from(el.children);
    if (!chips.length) return;

    /** @type {number[]} */
    const rowTops = [];
    let fitCount = chips.length;
    for (let i = 0; i < chips.length; i++) {
      const top = /** @type {HTMLElement} */ (chips[i]).offsetTop;
      if (!rowTops.some((t) => Math.abs(t - top) < 2)) rowTops.push(top);
      if (rowTops.length > 2) {
        fitCount = i;
        break;
      }
    }

    const count =
      fitCount >= selections.length
        ? selections.length
        : // Drop one more chip so the "+N" chip has room on the second row.
          Math.max(1, fitCount - 1);
    setMeasure({ key: selectionsKey, count });
  });

  const measuring = visibleCount === null;
  const shown = measuring ? selections : selections.slice(0, visibleCount);
  const hiddenCount = measuring ? 0 : selections.length - shown.length;

  const cancelClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimerRef.current = setTimeout(() => setOverflowOpen(false), 150);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-wrap gap-1 pt-0.5",
        // While measuring, hide chips and cap the height to ~2 rows so the
        // page height (and scrollbar) stays stable during re-measures.
        measuring && "invisible max-h-14 overflow-hidden",
      )}
    >
      {shown.map((s) => (
        <SelectionChip key={s.ticker} selection={s} busy={busy} onRemove={onRemove} />
      ))}
      {hiddenCount > 0 ? (
        <Popover open={overflowOpen} onOpenChange={setOverflowOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center rounded-full border border-emerald-600/25 bg-emerald-500/15 px-2 py-px text-[10px] font-semibold leading-4 text-emerald-900 hover:bg-emerald-500/25 dark:text-emerald-100"
              onMouseEnter={() => {
                cancelClose();
                setOverflowOpen(true);
              }}
              onMouseLeave={scheduleClose}
              onClick={() => setOverflowOpen((v) => !v)}
            >
              +{hiddenCount}
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="bottom"
            align="start"
            className="max-h-80 w-96 max-w-[calc(100vw-2rem)] overflow-y-auto p-2"
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            <p className="px-1 pb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {selections.length} markets selected
            </p>
            <ul className="space-y-0.5">
              {selections.map((s) => (
                <li
                  key={s.ticker}
                  className="flex items-start justify-between gap-2 rounded-md px-1.5 py-1.5 hover:bg-muted/60"
                >
                  <SelectionHoverDetails selection={s} />
                  <button
                    type="button"
                    disabled={busy}
                    aria-label={`Remove ${s.ticker}`}
                    className="mt-0.5 shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => onRemove(s.ticker)}
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
  );
}

/**
 * Independent Market Ticker Search.
 * Emits a comma-separated ticker string via onChange for Kalshi endpoint params.
 *
 * @param {{
 *   value: string;
 *   onChange: (value: string) => void;
 *   onSelectionsChange?: (selections: MarketTickerSelection[]) => void;
 *   disabled?: boolean;
 *   className?: string;
 *   maxTickers?: number;
 *   dataSource?: KalshiTickerSearchDataSource;
 *   historyEntity?: "trades" | "candlesticks" | "data";
 * }} props
 */
export function MarketTickerSearch({
  value,
  onChange,
  onSelectionsChange,
  disabled = false,
  className,
  maxTickers = MAX_TICKERS,
  dataSource = "live",
  historyEntity = "data",
}) {
  const debounceRef = useRef(null);
  const suggestAbortRef = useRef(/** @type {AbortController | null} */ (null));
  const resolveAbortRef = useRef(/** @type {AbortController | null} */ (null));
  const suggestSeqRef = useRef(0);
  const inputRef = useRef(/** @type {HTMLInputElement | null} */ (null));

  const [selections, setSelections] = useState(/** @type {MarketTickerSelection[]} */ ([]));
  const [draft, setDraft] = useState("");
  const [suggestions, setSuggestions] = useState(/** @type {TickerSearchSuggestion[]} */ ([]));
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [resolveLoading, setResolveLoading] = useState(false);
  const [missingTickers, setMissingTickers] = useState(/** @type {string[]} */ ([]));
  const [error, setError] = useState(/** @type {string | null} */ (null));

  const [seriesModal, setSeriesModal] = useState(
    /** @type {{ title: string; markets: MarketTickerSelection[]; selected: Set<string> } | null} */ (
      null
    ),
  );

  const emitChange = useCallback(
    (next) => {
      onChange(serializeMarketTickerSelections(next));
      onSelectionsChange?.(next);
    },
    [onChange, onSelectionsChange],
  );

  // Hydrate badges when parent value changes (e.g. restore / clear).
  useEffect(() => {
    const tickers = parseMarketTickerList(value);
    setSelections((prev) => {
      const prevKey = serializeMarketTickerSelections(prev);
      const nextKey = tickers.join(", ");
      if (prevKey === nextKey) return prev;
      return tickers.map((ticker) => {
        const existing = prev.find((p) => p.ticker === ticker);
        return existing || { ticker, title: ticker };
      });
    });
  }, [value]);

  const addSelections = useCallback(
    (incoming) => {
      const list = Array.isArray(incoming) ? incoming : [];
      if (!list.length) return;
      setSelections((prev) => {
        const map = new Map(prev.map((s) => [s.ticker, s]));
        for (const item of list) {
          const ticker = String(item?.ticker || "").trim().toUpperCase();
          if (!ticker || !isValidMarketTickerToken(ticker)) continue;
          if (map.size >= maxTickers && !map.has(ticker)) continue;
          map.set(ticker, {
            ticker,
            title: String(item?.title || ticker).trim() || ticker,
            subtitle: item?.subtitle,
            eventTicker: item?.eventTicker,
            status: item?.status,
            openTime: item?.openTime,
            closeTime: item?.closeTime,
          });
        }
        const next = [...map.values()];
        emitChange(next);
        return next;
      });
      setMissingTickers((prev) =>
        prev.filter((t) => !list.some((s) => s.ticker === String(t).toUpperCase())),
      );
      setError(null);
      setDraft("");
      setSuggestOpen(false);
      setSuggestions([]);
    },
    [emitChange, maxTickers],
  );

  const removeSelection = useCallback(
    (ticker) => {
      const key = String(ticker || "").toUpperCase();
      setSelections((prev) => {
        const next = prev.filter((s) => s.ticker !== key);
        emitChange(next);
        return next;
      });
    },
    [emitChange],
  );

  const resolveAndAddTickers = useCallback(
    async (rawTokens) => {
      const tokens = [...new Set(rawTokens.map((t) => String(t).trim().toUpperCase()).filter(Boolean))];
      if (!tokens.length) return;

      resolveAbortRef.current?.abort();
      const ac = new AbortController();
      resolveAbortRef.current = ac;
      setResolveLoading(true);
      setError(null);
      try {
        const { found, missing } = await resolveMarketTickers(tokens, { signal: ac.signal });
        if (ac.signal.aborted) return;
        if (found.length) addSelections(found);
        if (missing.length) {
          setMissingTickers((prev) => [...new Set([...prev, ...missing])]);
          setError(
            missing.length === 1
              ? `Market ticker not found: ${missing[0]}`
              : `${missing.length} tickers were not found`,
          );
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Failed to validate tickers");
      } finally {
        if (!ac.signal.aborted) setResolveLoading(false);
      }
    },
    [addSelections],
  );

  const fetchSuggestions = useCallback(async (segment) => {
    const mySeq = ++suggestSeqRef.current;
    suggestAbortRef.current?.abort();
    const trimmed = String(segment || "").trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setSuggestOpen(false);
      setSuggestLoading(false);
      return;
    }

    const ac = new AbortController();
    suggestAbortRef.current = ac;
    setSuggestLoading(true);
    try {
      /** @type {TickerSearchSuggestion[]} */
      const marketHits = [];
      /** @type {TickerSearchSuggestion[]} */
      const seriesHits = [];
      const tickerLike = isTickerLikeSegment(trimmed);

      const tasks = [];

      // Market search (reliable for exact tickers + short queries)
      tasks.push(
        fetch(
          `/api/integrations/kalshi-live/search/suggestions?${new URLSearchParams({
            q: trimmed,
            mode: "market_search",
          })}`,
          {
            headers: { Accept: "application/json" },
            credentials: "same-origin",
            signal: ac.signal,
          },
        ).then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok || ac.signal.aborted) return;
          const list = Array.isArray(data?.suggestions) ? data.suggestions : [];
          for (const s of list) {
            const ticker = String(s?.ticker || "").trim().toUpperCase();
            if (!ticker) continue;
            marketHits.push({
              kind: "market",
              ticker,
              title: String(s?.title || ticker).trim() || ticker,
              subtitle: String(s?.subtitle || "").trim() || undefined,
              status: String(s?.status || "").trim() || undefined,
              openTime: String(s?.openTime || "").trim() || undefined,
              closeTime: String(s?.closeTime || "").trim() || undefined,
            });
          }
        }),
      );

      // Semantic / embedding search for natural language
      if (isKalshiEmbeddingSearchEligible(trimmed)) {
        tasks.push(
          fetch(
            `/api/integrations/kalshi-live/search/embedding-suggestions?${new URLSearchParams({
              q: trimmed,
            })}`,
            {
              headers: { Accept: "application/json" },
              credentials: "same-origin",
              signal: ac.signal,
            },
          ).then(async (res) => {
            const data = await res.json().catch(() => ({}));
            if (!res.ok || ac.signal.aborted) return;
            const list = Array.isArray(data?.suggestions) ? data.suggestions : [];
            for (const s of list) {
              const ticker = String(s?.ticker || "").trim().toUpperCase();
              if (!ticker) continue;
              const markets = normalizeSeriesMarketsForPicker(s?.markets);
              seriesHits.push({
                kind: "series",
                ticker,
                title: String(s?.title || s?.ticker || "Series").trim(),
                subtitle: String(s?.subtitle || "").trim() || undefined,
                markets,
              });
            }
          }),
        );
      }

      await Promise.allSettled(tasks);
      if (mySeq !== suggestSeqRef.current || ac.signal.aborted) return;

      /** @type {TickerSearchSuggestion[]} */
      const next = [...seriesHits, ...marketHits];

      // Exact ticker match first; for natural language prefer series (semantic)
      // over the live market text scan, which is a weaker heuristic.
      const upper = trimmed.toUpperCase();
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

      // Dedupe markets by ticker; keep series separately
      const seenMarkets = new Set();
      const deduped = [];
      for (const s of next) {
        if (s.kind === "market") {
          if (seenMarkets.has(s.ticker)) continue;
          seenMarkets.add(s.ticker);
        }
        deduped.push(s);
      }

      setSuggestions(deduped.slice(0, 24));
      setSuggestOpen(deduped.length > 0);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      if (mySeq !== suggestSeqRef.current) return;
      setSuggestions([]);
      setSuggestOpen(false);
    } finally {
      if (mySeq === suggestSeqRef.current) setSuggestLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(draft);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [draft, fetchSuggestions]);

  const commitDraftAsTicker = useCallback(async () => {
    const segment = draft.trim();
    if (!segment) return;
    if (segment.includes(",")) {
      await resolveAndAddTickers(parseMarketTickerList(segment));
      setDraft("");
      return;
    }
    if (!isTickerLikeSegment(segment)) {
      setError("Enter a market ticker, or pick a suggestion from the list.");
      return;
    }
    await resolveAndAddTickers([segment]);
  }, [draft, resolveAndAddTickers]);

  const handlePaste = useCallback(
    (e) => {
      const text = e.clipboardData?.getData("text") || "";
      if (!text || !/[,|\n]/.test(text)) return;
      e.preventDefault();
      void resolveAndAddTickers(parseMarketTickerList(text));
      setDraft("");
    },
    [resolveAndAddTickers],
  );

  const openSeriesModal = useCallback((series) => {
    const markets = Array.isArray(series.markets) ? series.markets : [];
    setSeriesModal({
      title: series.title || series.ticker || "Select markets",
      markets,
      selected: new Set(),
    });
    setSuggestOpen(false);
  }, []);

  const busy = disabled || resolveLoading;
  const atCap = selections.length >= maxTickers;

  const seriesSelectedCount = useMemo(
    () => (seriesModal ? seriesModal.selected.size : 0),
    [seriesModal],
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn("space-y-2", className)}>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            {resolveLoading ? (
              <Loader2 className="h-3 w-3 animate-spin text-primary" aria-hidden />
            ) : null}
            {selections.length > 0 ? `${selections.length} selected` : "Required"}
          </span>
        </div>

        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 z-[1] flex h-4 w-4 -translate-y-1/2 items-center justify-center text-muted-foreground">
            {suggestLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
            ) : (
              <Search className="h-4 w-4" aria-hidden />
            )}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={draft}
            disabled={busy || atCap}
            placeholder="Add one or more tickers here, e.g. KXHIGHNY-25JAN01-T77; multiple tickers separated by commas: TICKER1, TICKER2"
            onChange={(e) => {
              setDraft(e.target.value);
              setError(null);
            }}
            onPaste={handlePaste}
            onFocus={() => {
              if (suggestions.length) setSuggestOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const first = suggestions[0];
                if (suggestOpen && first) {
                  if (first.kind === "market") {
                    addSelections([first]);
                  } else {
                    openSeriesModal(first);
                  }
                  return;
                }
                void commitDraftAsTicker();
              }
              if (e.key === "," ) {
                const segment = getMarketTickerSearchSegment(draft + ",");
                // Allow comma to commit ticker-like draft
                if (isTickerLikeSegment(draft.trim())) {
                  e.preventDefault();
                  void resolveAndAddTickers([draft.trim()]);
                } else if (!segment) {
                  e.preventDefault();
                }
              }
              if (e.key === "Backspace" && !draft && selections.length) {
                removeSelection(selections[selections.length - 1].ticker);
              }
              if (e.key === "Escape") {
                setSuggestOpen(false);
              }
            }}
            autoComplete="off"
            className={cn(
              "flex h-9 w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-xs text-foreground shadow-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              (busy || atCap) && "opacity-70",
            )}
            aria-label="Market ticker search"
          />

          <AnimatePresence>
            {suggestOpen && suggestions.length > 0 ? (
              <motion.ul
                key="suggestions"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                role="listbox"
                className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-auto rounded-lg border border-border bg-popover py-1 shadow-md"
              >
                {suggestions.map((s) => {
                  const marketCount = Array.isArray(s.markets) ? s.markets.length : 0;
                  const seriesTiming =
                    s.kind === "series" ? aggregateKalshiMarketTiming(s.markets) : null;
                  return (
                    <li
                      key={
                        s.kind === "market"
                          ? `m:${s.ticker}`
                          : `s:${s.ticker}:${marketCount}`
                      }
                      role="option"
                    >
                      <button
                        type="button"
                        disabled={busy}
                        className="flex w-full items-start gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          if (s.kind === "market") addSelections([s]);
                          else openSeriesModal(s);
                        }}
                      >
                        <span className="min-w-0 flex-1 space-y-0.5">
                          <span className="block font-medium text-foreground line-clamp-2">
                            {s.title || s.ticker}
                          </span>
                          {s.subtitle ? (
                            <span className="block text-xs text-muted-foreground line-clamp-1">
                              {s.subtitle}
                            </span>
                          ) : null}
                          <span className="block text-xs text-muted-foreground">
                            <span
                              className={cn(
                                "rounded px-1.5 py-0.5 font-mono text-[0.65rem] font-medium tracking-wide ring-1",
                                s.kind === "market"
                                  ? "bg-emerald-500/15 text-emerald-900 ring-emerald-600/25 dark:bg-emerald-400/15 dark:text-emerald-100 dark:ring-emerald-400/35"
                                  : "bg-violet-500/15 text-violet-900 ring-violet-600/25 dark:bg-violet-400/15 dark:text-violet-100 dark:ring-violet-400/35",
                              )}
                            >
                              {s.kind === "market" ? "Market" : "Series"}
                            </span>
                            {s.ticker ? ` · ${s.ticker}` : ""}
                            {s.kind === "series" && marketCount
                              ? ` · ${marketCount} markets`
                              : ""}
                          </span>
                        </span>
                        {s.kind === "market" ? (
                          <SuggestionMetaRow
                            status={s.status}
                            openTime={s.openTime}
                            closeTime={s.closeTime}
                          />
                        ) : seriesTiming ? (
                          <SuggestionMetaRow
                            status={seriesTiming.status}
                            openTime={seriesTiming.openTime}
                            closeTime={seriesTiming.closeTime}
                          />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </motion.ul>
            ) : null}
          </AnimatePresence>
        </div>

        <p className="text-[10px] leading-snug text-muted-foreground">
          If you don&apos;t know your ticker, search anything and suggestions will populate.
        </p>

        {selections.length > 0 ? (
          <SelectionChipsRow selections={selections} busy={busy} onRemove={removeSelection} />
        ) : null}

        <MarketTickerSearchCutoffNotes
          selections={selections}
          dataSource={dataSource}
          historyEntity={historyEntity}
        />

        {missingTickers.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {missingTickers.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 py-0.5 pl-2 pr-1 text-[11px] font-medium text-destructive"
              >
                <span className="font-mono">{t}</span>
                <span className="pr-1 text-[10px] opacity-80">not found</span>
                <button
                  type="button"
                  aria-label={`Dismiss ${t}`}
                  className="rounded-full p-0.5 hover:bg-destructive/20"
                  onClick={() => setMissingTickers((prev) => prev.filter((x) => x !== t))}
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </span>
            ))}
          </div>
        ) : null}

        {error ? <p className="text-xs text-destructive">{error}</p> : null}

        <Dialog
          open={!!seriesModal}
          onOpenChange={(open) => {
            if (!open) setSeriesModal(null);
          }}
        >
          <DialogContent className="max-h-[85vh] max-w-lg overflow-hidden sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-base pr-6">
                {seriesModal?.title || "Select markets"}
              </DialogTitle>
              <DialogDescription>
                Select one or more markets to add to your ticker list.
                {seriesModal?.markets?.length
                  ? ` ${seriesModal.markets.length} markets in this series.`
                  : ""}
              </DialogDescription>
            </DialogHeader>

            {(seriesModal?.markets || []).length > 0 ? (
              <div className="-mt-1 flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px] font-normal"
                  onClick={() => {
                    setSeriesModal((prev) => {
                      if (!prev) return prev;
                      const allSelected =
                        prev.markets.length > 0 &&
                        prev.markets.every((m) => prev.selected.has(m.ticker));
                      if (allSelected) {
                        return { ...prev, selected: new Set() };
                      }
                      return {
                        ...prev,
                        selected: new Set(prev.markets.map((m) => m.ticker)),
                      };
                    });
                  }}
                >
                  {seriesModal &&
                  seriesModal.markets.length > 0 &&
                  seriesModal.markets.every((m) => seriesModal.selected.has(m.ticker))
                    ? "Deselect all"
                    : "Select all"}
                </Button>
              </div>
            ) : null}

            <div className="max-h-[min(24rem,50vh)] space-y-1 overflow-auto pr-1">
              {(seriesModal?.markets || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No markets available for this series.</p>
              ) : (
                (seriesModal?.markets || []).map((m) => {
                  const checked = seriesModal?.selected.has(m.ticker);
                  return (
                    <button
                      key={m.ticker}
                      type="button"
                      className={cn(
                        "flex w-full items-start gap-2 rounded-md border px-2.5 py-2 text-left transition-colors",
                        checked
                          ? "border-primary/40 bg-primary/5"
                          : "border-border/60 bg-background hover:bg-muted/30",
                      )}
                      onClick={() => {
                        setSeriesModal((prev) => {
                          if (!prev) return prev;
                          const selected = new Set(prev.selected);
                          if (selected.has(m.ticker)) selected.delete(m.ticker);
                          else selected.add(m.ticker);
                          return { ...prev, selected };
                        });
                      }}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border",
                          checked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background",
                        )}
                      >
                        {checked ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
                      </span>
                      <span className="min-w-0 flex-1 space-y-0.5">
                        <span className="flex items-start justify-between gap-2">
                          <span className="min-w-0 text-xs font-medium text-foreground">
                            {m.title || m.ticker}
                          </span>
                          <SuggestionMetaRow
                            status={m.status}
                            openTime={m.openTime}
                            closeTime={m.closeTime}
                          />
                        </span>
                        <span className="block font-mono text-[10px] text-muted-foreground">
                          {m.ticker}
                        </span>
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
                  const picked = seriesModal.markets.filter((m) =>
                    seriesModal.selected.has(m.ticker),
                  );
                  addSelections(picked);
                  setSeriesModal(null);
                }}
              >
                Add {seriesSelectedCount > 0 ? `${seriesSelectedCount} ` : ""}market
                {seriesSelectedCount === 1 ? "" : "s"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
