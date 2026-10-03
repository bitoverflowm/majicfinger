"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { isKalshiEmbeddingSearchEligible } from "@/lib/kalshiLive/kalshiLiveEmbeddingSearch";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  ["unopened", "Unopened"],
  ["open", "Open"],
  ["paused", "Paused"],
  ["closed", "Closed"],
  ["settled", "Settled"],
  ["initialized", "Initialized"],
  ["inactive", "Inactive"],
  ["active", "Active"],
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

/** Live market columns, with the choices that actually appear on a market row. */
export function kalshiLiveMarketAttributeColumns(columns) {
  return (columns || []).map((column) => {
    if (column.id === "status") return { ...column, enumOptions: STATUS_OPTIONS };
    if (column.id === "market_type") return { ...column, enumOptions: MARKET_TYPE_OPTIONS };
    if (column.id === "result") return { ...column, enumOptions: RESULT_OPTIONS };
    if (column.type === "date") return { ...column, dateEpoch: "iso" };
    return column;
  });
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
  const hint =
    typed && !isKalshiEmbeddingSearchEligible(typed)
      ? "Use a word with at least 5 letters."
      : "";

  return (
    <section className="space-y-2">
      <p className="text-[12px] font-semibold text-foreground">Markets</p>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => {
            if (suggestions.length) setOpen(true);
          }}
          placeholder="Search anything — series, markets, topics…"
          aria-label="Search Kalshi markets"
          className="h-9 w-full rounded-lg border border-border/70 bg-background pl-8 pr-8 text-[13px] outline-none placeholder:text-muted-foreground focus:border-[#0d99ff]/50"
        />
        {loading ? <Loader2 className="absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" /> : null}
      </div>
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
      {error ? <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p> : null}
      {open && suggestions.length ? (
        <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-border/70 p-2">
          {suggestions.map((suggestion) => {
            const series = seriesTickerOf(suggestion);
            const event = String(suggestion.eventTicker || "").trim();
            const markets = (Array.isArray(suggestion.markets) ? suggestion.markets : [])
              .map((market) => ({ market, ticker: nestedTicker(market) }))
              .filter((item) => item.ticker);
            const seriesId = series ? `series:${series}` : "";
            const eventId = event ? `event:${event}` : "";
            return (
              <div key={`${suggestion.ticker}:${event}`} className="rounded-lg px-1 py-1">
                <p className="truncate text-[13px] font-medium text-foreground">{suggestion.title || suggestion.ticker}</p>
                {suggestion.subtitle ? <p className="truncate text-[11px] text-muted-foreground">{suggestion.subtitle}</p> : null}
                <div className="mt-1.5 flex flex-wrap gap-1">
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
                </div>
                {markets.length ? (
                  <div className="mt-1 max-h-28 space-y-0.5 overflow-y-auto">
                    {markets.map(({ market, ticker }) => {
                      const id = `market:${ticker}`;
                      const added = picked.has(id);
                      return (
                        <button
                          key={ticker}
                          type="button"
                          disabled={added}
                          onClick={() => add({ id, kind: "market", ticker, label: nestedLabel(market) })}
                          className={cn(
                            "flex w-full items-center rounded-md px-1.5 py-1 text-left text-[12px]",
                            added
                              ? "text-muted-foreground"
                              : "text-foreground hover:bg-muted/60",
                          )}
                        >
                          <span className="min-w-0 flex-1 truncate">{nestedLabel(market)}</span>
                          <span className="shrink-0 pl-2 text-[11px] text-muted-foreground">{added ? "Added" : "Add"}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
      {open && !loading && !suggestions.length && isKalshiEmbeddingSearchEligible(typed) ? (
        <p className="text-[11px] text-muted-foreground">No markets matched that search.</p>
      ) : null}
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
      onClick={onClick}
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium",
        added
          ? "border-[#0d99ff]/40 bg-[#0d99ff]/10 text-[#0d99ff]"
          : "border-border/70 bg-background text-foreground hover:bg-muted/50",
      )}
    >
      {added ? "Added" : children}
    </button>
  );
}
