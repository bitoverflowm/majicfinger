"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Search, X } from "lucide-react";
import { isKalshiEmbeddingSearchEligible } from "@/lib/kalshiLive/kalshiLiveEmbeddingSearch";
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

function seriesTickerOf(suggestion) {
  return String(suggestion?.raw?.series_ticker || "").trim();
}

function nestedTicker(market) {
  return String(market?.ticker || "").trim();
}

function nestedLabel(market) {
  const ticker = nestedTicker(market);
  const title = String(market?.yes_sub_title || market?.yes_subtitle || "").trim();
  if (title && title !== ticker) return `${ticker} · ${title}`;
  return ticker;
}

function tagLabel(pick) {
  const count = Array.isArray(pick.rows) ? pick.rows.length : 0;
  if (pick.kind === "series" || pick.kind === "event") {
    const noun = pick.kind === "series" ? "Series" : "Event";
    return count ? `${noun} · ${pick.ticker} · ${count}` : `${noun} · ${pick.ticker}`;
  }
  return pick.label || pick.ticker;
}

/**
 * Natural-language Kalshi market search. A hit becomes a tag; the parent fetches the rows.
 */
export function KalshiLiveMarketPicker({ picks, onAdd, onRemove }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const seq = useRef(0);
  const abortRef = useRef(null);
  const picked = new Set((picks || []).map((pick) => pick.id));

  useEffect(() => {
    const term = query.trim();
    const mySeq = ++seq.current;
    abortRef.current?.abort();
    if (!isKalshiEmbeddingSearchEligible(term)) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      setError("");
      return undefined;
    }
    const ac = new AbortController();
    abortRef.current = ac;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ q: term });
        const res = await fetch(`/api/integrations/kalshi-live/search/embedding-suggestions?${params}`, {
          headers: { Accept: "application/json" },
          credentials: "same-origin",
          signal: ac.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (mySeq !== seq.current) return;
        if (!res.ok) {
          setSuggestions([]);
          setOpen(false);
          setError(typeof data?.error === "string" ? data.error : "Search failed");
          return;
        }
        const list = Array.isArray(data?.suggestions) ? data.suggestions : [];
        setSuggestions(list);
        setOpen(true);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (mySeq !== seq.current) return;
        setSuggestions([]);
        setOpen(false);
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        if (mySeq === seq.current) setLoading(false);
      }
    }, 400);
    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [query]);

  function add(pick) {
    if (!pick?.id || picked.has(pick.id)) return;
    onAdd?.(pick);
  }

  const typed = query.trim();
  const eligible = isKalshiEmbeddingSearchEligible(typed);

  return (
    <section className="space-y-2">
      <p className="text-[12px] font-semibold text-foreground">Markets</p>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 z-[1] flex h-4 w-4 -translate-y-1/2 items-center justify-center text-muted-foreground">
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden /> : <Search className="h-4 w-4" aria-hidden />}
        </span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => {
            if (suggestions.length) setOpen(true);
          }}
          placeholder="Search anything — series, markets, topics…"
          aria-label="Search Kalshi markets"
          autoComplete="off"
          className="flex h-9 w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-xs text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <AnimatePresence>
          {open && !loading && eligible && !suggestions.length ? (
            <motion.p
              key="no-matches"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-border bg-popover px-3 py-2 text-xs text-muted-foreground shadow-md"
            >
              No matches for &ldquo;{typed}&rdquo;
            </motion.p>
          ) : null}
        </AnimatePresence>
        <AnimatePresence>
          {open && suggestions.length ? (
            <motion.ul
              key="suggestions"
              role="listbox"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.18 } }}
              exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
              className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-auto rounded-lg border border-border bg-popover py-1 shadow-md"
            >
              {suggestions.map((suggestion) => {
                const series = seriesTickerOf(suggestion);
                const event = String(suggestion.eventTicker || "").trim();
                const markets = (Array.isArray(suggestion.markets) ? suggestion.markets : [])
                  .map((market) => ({ market, ticker: nestedTicker(market) }))
                  .filter((item) => item.ticker);
                const seriesId = series ? `series:${series}` : "";
                const eventId = event ? `event:${event}` : "";
                return (
                  <motion.li
                    key={`${suggestion.ticker}:${event}`}
                    role="option"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.16 } }}
                    className="border-b border-border/60 last:border-b-0"
                  >
                    <div className="flex flex-col gap-0.5 px-3 py-2">
                      <span className="line-clamp-2 text-sm font-medium text-foreground">{suggestion.title || suggestion.ticker}</span>
                      {suggestion.subtitle ? (
                        <span className="line-clamp-1 text-xs text-muted-foreground">{suggestion.subtitle}</span>
                      ) : null}
                      <span className="text-xs text-muted-foreground">
                        <span className="rounded bg-violet-500/15 px-1.5 py-0.5 font-mono text-[0.65rem] font-medium tracking-wide text-violet-900 ring-1 ring-violet-600/25 dark:bg-violet-400/15 dark:text-violet-100 dark:ring-violet-400/35">
                          Series
                        </span>
                        {series || suggestion.ticker ? ` · ${series || suggestion.ticker}` : ""}
                        {markets.length ? ` · ${markets.length} ${markets.length === 1 ? "market" : "markets"}` : ""}
                      </span>
                      <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                        {series ? (
                          <ScopeButton
                            added={picked.has(seriesId)}
                            onClick={() =>
                              add({
                                id: seriesId,
                                kind: "series",
                                ticker: series,
                                label: suggestion.title || series,
                              })
                            }
                          >
                            All markets in series
                          </ScopeButton>
                        ) : null}
                        {event ? (
                          <ScopeButton
                            added={picked.has(eventId)}
                            onClick={() =>
                              add({
                                id: eventId,
                                kind: "event",
                                ticker: event,
                                label: suggestion.title || event,
                              })
                            }
                          >
                            All markets in event
                          </ScopeButton>
                        ) : null}
                      </span>
                    </div>
                    {markets.map(({ market, ticker }) => {
                      const id = `market:${ticker}`;
                      const added = picked.has(id);
                      return (
                        <button
                          key={ticker}
                          type="button"
                          disabled={added}
                          onMouseDown={(eventClick) => eventClick.preventDefault()}
                          onClick={() => add({ id, kind: "market", ticker, label: nestedLabel(market) })}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-50"
                        >
                          <span className="min-w-0 flex-1 truncate text-foreground">{nestedLabel(market)}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">{added ? "Added" : "Add"}</span>
                        </button>
                      );
                    })}
                  </motion.li>
                );
              })}
            </motion.ul>
          ) : null}
        </AnimatePresence>
      </div>
      {typed && !eligible ? (
        <p className="text-[10px] leading-snug text-muted-foreground">Type at least one word with 5+ letters to search.</p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {picks?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {picks.map((pick) => (
            <span
              key={pick.id}
              title={pick.error || tagLabel(pick)}
              className={cn(
                "inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
                pick.status === "error"
                  ? "border-red-500/40 text-red-600 dark:text-red-400"
                  : "border-border/70 bg-background text-foreground",
              )}
            >
              {pick.status === "loading" ? <Loader2 className="size-3 shrink-0 animate-spin text-muted-foreground" /> : null}
              <span className="min-w-0 truncate">{tagLabel(pick)}</span>
              <button
                type="button"
                aria-label={`Remove ${tagLabel(pick)}`}
                onClick={() => onRemove?.(pick.id)}
                className="shrink-0 rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Add a market, or every market in a series or event. The preview updates as you add them.
        </p>
      )}
    </section>
  );
}

function ScopeButton({ added, onClick, children }) {
  return (
    <button
      type="button"
      disabled={added}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="text-xs font-medium text-foreground hover:underline disabled:text-muted-foreground disabled:no-underline"
    >
      {added ? "Added" : children}
    </button>
  );
}
