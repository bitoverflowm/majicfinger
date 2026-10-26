"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import "@glideapps/glide-data-grid/dist/index.css";
import { ArrowLeft, Download, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportSheet } from "@/components/dashboardComposer/blockExport";
import { normalizeKalshiLiveTrades } from "@/lib/kalshiLive/normalizeTradeRow";
import { cn } from "@/lib/utils";

const RecipeGrid = dynamic(() => import("./recipeGridInner"), {
  ssr: false,
  loading: () => <div className="min-h-0 flex-1" />,
});

/** Anonymous visitors share a 30-requests-a-minute budget on the trades proxy; 10 pages stays well inside it. */
const MAX_TRADES = 10000;
const PAGE_SIZE = 1000;
const SEARCH_LIMIT = 30;
const MARKETS_PER_SERIES = 8;
const EXAMPLE_QUERIES = ["Bitcoin price", "Fed funds rate", "Trump"];

function formatPrice(value) {
  const n = Number(value);
  if (value == null || !Number.isFinite(n)) return "";
  return `$${n.toFixed(Math.round(n * 10000) % 100 ? 4 : 2)}`;
}

function formatSide(value) {
  const text = String(value || "");
  return text ? text[0].toUpperCase() + text.slice(1) : "";
}

const COLUMNS = [
  { id: "created_time", title: "Time", type: "date", width: 190, format: (v) => (v == null ? "" : new Date(v).toLocaleString()) },
  { id: "yes_price_dollars", title: "Yes price", type: "number", width: 100, format: formatPrice },
  { id: "no_price_dollars", title: "No price", type: "number", width: 100, format: formatPrice },
  { id: "count_fp", title: "Contracts", type: "number", width: 110, format: (v) => (v == null ? "" : Number(v).toLocaleString()) },
  { id: "taker_outcome_side", title: "Taker side", width: 100, format: formatSide },
  { id: "taker_book_side", title: "Book side", width: 100, format: formatSide },
  { id: "is_block_trade", title: "Block trade", width: 100, format: (v) => (v == null ? "" : v ? "Yes" : "No") },
  { id: "trade_id", title: "Trade ID", width: 300 },
  { id: "ticker", title: "Ticker", width: 220 },
];

async function searchMarkets(q, signal) {
  const query = encodeURIComponent(q);
  const json = (url) => fetch(url, { signal }).then((res) => (res.ok ? res.json() : null));
  const [plain, semantic] = await Promise.allSettled([
    json(`/api/integrations/kalshi-live/search/suggestions?q=${query}`),
    json(`/api/integrations/kalshi-live/search/embedding-suggestions?q=${query}`),
  ]);
  const phrase = q.trim().toLowerCase();
  const markets = new Map();
  const add = (market, rank) => {
    if (!market.ticker || markets.has(market.ticker)) return;
    const exact =
      market.ticker.toLowerCase().startsWith(phrase) || `${market.title} ${market.subtitle}`.toLowerCase().includes(phrase);
    markets.set(market.ticker, { ...market, rank: exact ? 0 : rank });
  };
  // Plain search matches any word, so its loose hits rank below the semantic series matches.
  for (const hit of plain.status === "fulfilled" ? plain.value?.suggestions || [] : []) {
    add({ ticker: hit?.ticker, title: hit?.title || hit?.ticker, subtitle: hit?.subtitle || "" }, 2);
  }
  for (const hit of semantic.status === "fulfilled" ? semantic.value?.suggestions || [] : []) {
    for (const market of (hit?.markets || []).slice(0, MARKETS_PER_SERIES)) {
      add({ ticker: market?.ticker, title: hit.title || market?.ticker, subtitle: market?.yes_subtitle || market?.subtitle || "" }, 1);
    }
  }
  return [...markets.values()].sort((a, b) => a.rank - b.rank).slice(0, SEARCH_LIMIT);
}

const wait = (ms, signal) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

async function fetchPage(url, signal) {
  for (let attempt = 0; ; attempt += 1) {
    const res = await fetch(url, { signal });
    if (res.status === 429 && attempt < 3) {
      const retryAfter = Number(res.headers.get("Retry-After"));
      await wait(Math.min(10, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 2 ** attempt) * 1000, signal);
      continue;
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(res.status === 429 ? "Too many requests. Wait a minute and try again." : body?.error || "Couldn't load trades.");
    return body;
  }
}

/** Recent trades come from the live API and older ones from Kalshi's historical archive. */
async function loadTrades(ticker, signal, onRows) {
  const rows = [];
  const seen = new Set();
  for (const path of ["/api/integrations/kalshi-live/markets/trades", "/api/integrations/kalshi-live/historical/trades"]) {
    let cursor = "";
    while (rows.length < MAX_TRADES) {
      const params = new URLSearchParams({ ticker, limit: String(PAGE_SIZE) });
      if (cursor) params.set("cursor", cursor);
      const body = await fetchPage(`${path}?${params}`, signal);
      const page = Array.isArray(body?.trades) ? body.trades : [];
      for (const trade of normalizeKalshiLiveTrades(page)) {
        if (!trade.trade_id || seen.has(trade.trade_id)) continue;
        seen.add(trade.trade_id);
        rows.push(trade);
        if (rows.length >= MAX_TRADES) break;
      }
      onRows(rows.slice());
      cursor = body?.cursor || "";
      if (!cursor || !page.length) break;
    }
  }
  return { rows, truncated: rows.length >= MAX_TRADES };
}

function MarketResults({ results, highlighted, onPick, onHover }) {
  return (
    <ul role="listbox" aria-label="Markets" className="max-h-80 overflow-y-auto p-1">
      {results.map((market, index) => (
        <li key={market.ticker} role="option" aria-selected={index === highlighted}>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onPick(market)}
            onMouseEnter={() => onHover(index)}
            className={cn(
              "flex w-full items-baseline gap-3 rounded-md px-3 py-2 text-left",
              index === highlighted ? "bg-muted" : "hover:bg-muted/60",
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-foreground">{market.title}</span>
              {market.subtitle ? (
                <span className="block truncate text-[12px] text-muted-foreground">{market.subtitle}</span>
              ) : null}
            </span>
            <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{market.ticker}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function KalshiTradeHistoryRecipe({ onBack, withClose = false }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [market, setMarket] = useState(null);
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState("idle");
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const loadRef = useRef(null);
  const volume = useMemo(() => records.reduce((sum, row) => sum + (Number(row.count_fp) || 0), 0), [records]);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
    return () => loadRef.current?.abort();
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || q === market?.title) {
      setResults([]);
      setSearching(false);
      return undefined;
    }
    const controller = new AbortController();
    setSearching(true);
    const timer = setTimeout(() => {
      searchMarkets(q, controller.signal)
        .then((found) => {
          setResults(found);
          setHighlighted(0);
        })
        .catch(() => {})
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, market?.title]);

  const pick = (next) => {
    loadRef.current?.abort();
    const controller = new AbortController();
    loadRef.current = controller;
    setMarket(next);
    setQuery(next.title);
    setOpen(false);
    setRecords([]);
    setTruncated(false);
    setError("");
    setStatus("loading");
    loadTrades(next.ticker, controller.signal, setRecords)
      .then((result) => {
        setTruncated(result.truncated);
        setStatus("done");
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setError(err?.message || "Couldn't load trades.");
        setStatus("error");
      });
  };

  const onKeyDown = (event) => {
    if (event.key === "Escape" && open) {
      event.stopPropagation();
      setOpen(false);
      return;
    }
    if (!results.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlighted((index) => Math.min(results.length - 1, index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((index) => Math.max(0, index - 1));
    } else if (event.key === "Enter" && open) {
      event.preventDefault();
      pick(results[highlighted] || results[0]);
    }
  };

  const download = () => {
    if (!market || !records.length) return;
    exportSheet({ title: `${market.ticker} trades`, columns: COLUMNS, records }, "csv");
  };

  const showResults = open && query.trim().length >= 2 && query.trim() !== market?.title;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div className={cn("flex items-start gap-3 border-b border-border px-6 pb-4 pt-5", withClose && "pr-14")}>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to integrations"
            className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Download Kalshi Trade History</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Search a market to view its trades and download a CSV.</p>
        </div>
        <Button type="button" onClick={download} disabled={!records.length || status === "loading"} className="shrink-0 gap-1.5">
          <Download className="size-4" />
          Download CSV
        </Button>
      </div>

      <div className="px-6 pt-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={onKeyDown}
            placeholder="Search a Kalshi market by name or ticker"
            aria-label="Search Kalshi markets"
            className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-9 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-foreground/30 focus:ring-2 focus:ring-ring/20"
          />
          {searching ? (
            <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />
          ) : null}
          {showResults ? (
            <div className="absolute inset-x-0 top-full z-20 mt-1 rounded-lg border border-border bg-popover shadow-lg">
              {results.length ? (
                <MarketResults results={results} highlighted={highlighted} onPick={pick} onHover={setHighlighted} />
              ) : (
                <p className="px-4 py-3 text-[13px] text-muted-foreground">
                  {searching ? "Searching markets…" : "No open markets match. Try another name or paste a ticker."}
                </p>
              )}
            </div>
          ) : null}
        </div>
        {market ? (
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3 text-[13px]">
            <span className="font-mono text-[12px] text-muted-foreground">{market.ticker}</span>
            {market.subtitle ? <span className="text-muted-foreground">{market.subtitle}</span> : null}
            <span className="ml-auto tabular-nums text-muted-foreground" aria-live="polite">
              {status === "loading"
                ? `Loading trades… ${records.length.toLocaleString()}`
                : status === "done"
                  ? `${records.length.toLocaleString()} trades · ${volume.toLocaleString()} contracts${truncated ? ` · first ${MAX_TRADES.toLocaleString()} shown` : ""}`
                  : null}
            </span>
          </div>
        ) : null}
      </div>

      <div className={cn("mx-6 mb-6 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border", !market && "mt-4")}>
        {error ? (
          <div className="flex flex-1 items-center justify-center p-6 text-sm text-destructive">{error}</div>
        ) : records.length ? (
          <RecipeGrid columns={COLUMNS} records={records} />
        ) : status === "loading" ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading trades
          </div>
        ) : market ? (
          <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
            This market has no trades yet.
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-muted-foreground">Pick a market to load its full trade history.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {EXAMPLE_QUERIES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => {
                    setQuery(example);
                    setOpen(true);
                    inputRef.current?.focus();
                  }}
                  className="rounded-full border border-border px-3 py-1 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
