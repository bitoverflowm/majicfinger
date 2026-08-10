"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Braces, Download, Loader2, Table2 } from "lucide-react";
import * as XLSX from "xlsx";

import { MarketTickerSearch } from "@/components/connectData/MarketTickerSearch";
import { HubKalshiLiveDemoMockup } from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveDemoMockup";
import {
  HubKalshiLiveDemoTabs,
  type HubKalshiLiveDemoTabId,
} from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveDemoTabs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isKalshiMarketLiveStatus } from "@/lib/kalshiLive/kalshiMarketTiming";
import { cn } from "@/lib/utils";

const DEMO_MAX_TICKERS = 2;
const FEATURED_LIMIT = 5;

type ViewMode = "sheet" | "json";

type FeaturedMarket = {
  ticker: string;
  eventTicker?: string;
  seriesTicker?: string;
  title: string;
  subtitle?: string;
  status: string;
  lastPriceDollars: number | null;
  volume24h: number | null;
  volume: number | null;
  openInterest: number | null;
  imageUrl?: string;
  seriesTitle?: string;
  category?: string;
  /** Full Kalshi market object from the featured pull — reuse on click. */
  raw?: Record<string, unknown>;
};

type HubKalshiLiveDemoProps = {
  className?: string;
};

function cellValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatCompactNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return String(Math.round(value));
  }
}

function formatLastPrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const cents = Math.round(value * 100);
  return `${cents}¢`;
}

function FeaturedMarketSkeleton() {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: FEATURED_LIMIT }).map((_, i) => (
        <div
          key={i}
          className="flex animate-pulse gap-3 rounded-xl border border-border/60 bg-background/80 p-3"
        >
          <div className="size-12 shrink-0 rounded-lg bg-muted" />
          <div className="min-w-0 flex-1 space-y-2 py-0.5">
            <div className="h-3.5 w-3/4 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
            <div className="h-3 w-2/5 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Contained Kalshi Live hub demo: featured live markets → search → metadata sheet/JSON.
 * Local state only — does not mount dashboard connect/sheets.
 */
export function HubKalshiLiveDemo({ className }: HubKalshiLiveDemoProps) {
  const [tickersValue, setTickersValue] = useState("");
  const [markets, setMarkets] = useState<Record<string, unknown>[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("json");
  const [activeTab, setActiveTab] = useState<HubKalshiLiveDemoTabId>("search");
  const [featured, setFeatured] = useState<FeaturedMarket[]>([]);
  const prevHasDataRef = useRef(false);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [featuredError, setFeaturedError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);

  const tickersKey = useMemo(
    () =>
      tickersValue
        .split(",")
        .map((t) => t.trim().toUpperCase())
        .filter(Boolean)
        .slice(0, DEMO_MAX_TICKERS)
        .join(","),
    [tickersValue],
  );

  const tickers = useMemo(
    () => (tickersKey ? tickersKey.split(",") : []),
    [tickersKey],
  );

  useEffect(() => {
    const ac = new AbortController();
    setFeaturedLoading(true);
    setFeaturedError(null);

    fetch(`/api/integrations/kalshi-live/markets/featured?limit=${FEATURED_LIMIT}`, {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
      signal: ac.signal,
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof body?.error === "string" ? body.error : "Failed to load live markets",
          );
        }
        const list = Array.isArray(body?.markets) ? body.markets : [];
        setFeatured(list);
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setFeatured([]);
        setFeaturedError(e instanceof Error ? e.message : "Failed to load live markets");
      })
      .finally(() => {
        if (!ac.signal.aborted) setFeaturedLoading(false);
      });

    return () => ac.abort();
  }, []);

  useEffect(() => {
    abortRef.current?.abort();
    const mySeq = ++seqRef.current;

    if (tickers.length === 0) {
      setMarkets(null);
      setError(null);
      setLoading(false);
      return;
    }

    const featuredRawByTicker = new Map<string, Record<string, unknown>>();
    for (const item of featured) {
      const t = String(item?.ticker || "").trim().toUpperCase();
      if (!t || !item?.raw || typeof item.raw !== "object") continue;
      featuredRawByTicker.set(t, item.raw);
    }

    /** @type {Array<Record<string, unknown> | null>} */
    const resolved: Array<Record<string, unknown> | null> = tickers.map(
      (t) => featuredRawByTicker.get(t) ?? null,
    );
    const missing = tickers.filter((_, i) => !resolved[i]);

    // All selected tickers already came from the featured pull — no refetch.
    if (missing.length === 0) {
      setMarkets(resolved as Record<string, unknown>[]);
      setError(null);
      setLoading(false);
      return;
    }

    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      tickers: missing.join(","),
      limit: String(missing.length),
    });

    fetch(`/api/integrations/kalshi-live/markets?${params.toString()}`, {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
      signal: ac.signal,
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (mySeq !== seqRef.current) return;
        if (!res.ok) {
          setMarkets(null);
          setError(
            typeof body?.error === "string"
              ? body.error
              : res.status === 429
                ? "Too many requests — slow down and try again."
                : "Failed to load market metadata",
          );
          return;
        }
        const fetched = Array.isArray(body?.markets) ? body.markets : [];
        const fetchedByTicker = new Map<string, Record<string, unknown>>();
        for (const row of fetched) {
          if (!row || typeof row !== "object") continue;
          const t = String(row.ticker || "").trim().toUpperCase();
          if (t) fetchedByTicker.set(t, row);
        }

        const merged = tickers
          .map((t) => featuredRawByTicker.get(t) || fetchedByTicker.get(t) || null)
          .filter(Boolean) as Record<string, unknown>[];

        setMarkets(merged);
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (mySeq !== seqRef.current) return;
        setMarkets(null);
        setError(e instanceof Error ? e.message : "Failed to load market metadata");
      })
      .finally(() => {
        if (mySeq === seqRef.current) setLoading(false);
      });

    return () => {
      ac.abort();
    };
  }, [tickers, tickersKey, featured]);

  const jsonText = useMemo(() => {
    if (!markets) return "";
    return JSON.stringify(markets, null, 2);
  }, [markets]);

  const sheetColumns = useMemo(() => {
    if (!markets?.length) return [] as string[];
    const keys = new Set<string>();
    for (const row of markets) {
      if (!row || typeof row !== "object") continue;
      for (const key of Object.keys(row)) keys.add(key);
    }
    const preferred = [
      "ticker",
      "title",
      "status",
      "event_ticker",
      "yes_bid_dollars",
      "yes_ask_dollars",
      "last_price_dollars",
      "volume",
      "open_interest",
      "close_time",
    ];
    const ordered = preferred.filter((k) => keys.has(k));
    for (const key of keys) {
      if (!ordered.includes(key)) ordered.push(key);
    }
    return ordered;
  }, [markets]);

  const hasData = Boolean(markets?.length);

  const exportJson = useCallback(() => {
    if (!markets?.length) return;
    const blob = new Blob([JSON.stringify(markets, null, 2)], {
      type: "application/json;charset=utf-8;",
    });
    downloadBlob(blob, `kalshi-live-markets-${Date.now()}.json`);
  }, [markets]);

  const exportCsv = useCallback(() => {
    if (!markets?.length || !sheetColumns.length) return;
    const header = sheetColumns.map(escapeCsv).join(",");
    const rows = markets.map((row) =>
      sheetColumns.map((col) => escapeCsv(cellValue(row[col]))).join(","),
    );
    const csv = [header, ...rows].join("\n");
    downloadBlob(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
      `kalshi-live-markets-${Date.now()}.csv`,
    );
  }, [markets, sheetColumns]);

  const exportXlsx = useCallback(() => {
    if (!markets?.length || !sheetColumns.length) return;
    const rows = markets.map((row) => {
      const out: Record<string, string> = {};
      for (const col of sheetColumns) out[col] = cellValue(row[col]);
      return out;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Markets");
    XLSX.writeFile(wb, `kalshi-live-markets-${Date.now()}.xlsx`);
  }, [markets, sheetColumns]);

  const selectFeaturedMarket = useCallback((market: FeaturedMarket) => {
    const t = String(market?.ticker || "").trim().toUpperCase();
    if (!t) return;
    if (market.raw && typeof market.raw === "object") {
      setMarkets([market.raw]);
      setError(null);
      setLoading(false);
    }
    setTickersValue(t);
    setViewMode("json");
    setActiveTab("metadata");
  }, []);

  useEffect(() => {
    if (hasData && !prevHasDataRef.current) {
      setActiveTab((prev) => (prev === "search" ? "metadata" : prev));
    }
    if (!hasData && prevHasDataRef.current) {
      setActiveTab("search");
    }
    prevHasDataRef.current = hasData;
  }, [hasData]);

  const tabs = useMemo(
    () => [
      {
        id: "search" as const,
        title: "The best Natural Language",
        description:
          "The best search capabilities available anywhere for Markets, Events and Series",
      },
      {
        id: "metadata" as const,
        title: "Market metadata",
        description:
          "Inspect the full Kalshi market payload — prices, volume, status, and more — as JSON or a sheet.",
        disabled: !hasData,
      },
      {
        id: "trades" as const,
        title: "Trades",
        description: "Pull recent trades for the selected market.",
        disabled: !hasData,
      },
      {
        id: "orderbook" as const,
        title: "Orderbook",
        description: "Inspect the live order book for the selected market.",
        disabled: !hasData,
      },
      {
        id: "candlesticks" as const,
        title: "Candlesticks",
        description: "Load candlestick history for the selected market.",
        disabled: !hasData,
      },
      {
        id: "event_forecast" as const,
        title: "Event forecast",
        description: "Explore event-level forecast data for the selected market.",
        disabled: !hasData,
      },
    ],
    [hasData],
  );

  const comingSoonPanel = (label: string) => (
    <div className="flex min-h-[22rem] flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground text-pretty">
        UI placeholder for now — endpoint pull comes next.
      </p>
    </div>
  );

  return (
    <div className={cn("w-full", className)}>
      <HubKalshiLiveDemoMockup>
        <div className="flex w-full flex-col gap-4 px-4 py-6 sm:gap-5 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <div className="space-y-1.5">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium tracking-wider text-muted-foreground">
              <span className="uppercase">
                Live demo · up to {DEMO_MAX_TICKERS} markets
              </span>
              <Link
                href="/#pricing"
                className="normal-case tracking-normal underline underline-offset-2 hover:text-foreground"
              >
                Sign up for unlimited markets, events, series, orderbooks,
                candlesticks, trades, full coverage of everything Polymarket and
                Kalshi
              </Link>
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-5 py-12 lg:grid-cols-5 lg:gap-6 lg:items-start">
            <div className="lg:col-span-1">
              <HubKalshiLiveDemoTabs
                tabs={tabs}
                activeId={activeTab}
                onChange={setActiveTab}
                contentLoading={
                  activeTab === "search"
                    ? featuredLoading
                    : activeTab === "metadata"
                      ? loading
                      : false
                }
              />
            </div>

            <div className="min-w-0 lg:col-span-4" role="tabpanel">
              {activeTab === "search" ? (
                <div className="flex w-full flex-col gap-4 px-2 sm:px-4 lg:px-6">
                  <MarketTickerSearch
                    value={tickersValue}
                    onChange={setTickersValue}
                    maxTickers={DEMO_MAX_TICKERS}
                    dataSource="live"
                    searchScope="markets"
                    showCutoffNotes={false}
                    required={false}
                    placeholder="Start typing to search for anything on Kalshi here"
                    className="w-full"
                  />

                  <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                    or click on any of the following markets as a starting point
                  </p>

                  <div className="min-h-[12rem] overflow-hidden rounded-xl border border-border/70 bg-muted/20">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        Highest volume live markets
                      </p>
                      {featuredLoading ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Loader2 className="size-3.5 animate-spin" aria-hidden />
                          Loading…
                        </span>
                      ) : featured.length ? (
                        <span className="text-xs text-muted-foreground">
                          {featured.length} market{featured.length === 1 ? "" : "s"}
                        </span>
                      ) : null}
                    </div>

                    {featuredLoading ? (
                      <FeaturedMarketSkeleton />
                    ) : featuredError ? (
                      <p className="px-3 py-4 text-sm text-destructive">{featuredError}</p>
                    ) : !featured.length ? (
                      <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                        No live markets available right now. Try searching above.
                      </p>
                    ) : (
                      <ul className="space-y-2 p-3">
                        {featured.map((market) => {
                          const live = isKalshiMarketLiveStatus(market.status);
                          return (
                            <li key={market.ticker}>
                              <button
                                type="button"
                                onClick={() => selectFeaturedMarket(market)}
                                className="flex w-full items-start gap-3 rounded-xl border border-border/70 bg-background p-3 text-left shadow-sm transition-colors hover:border-border hover:bg-muted/30"
                              >
                                <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted">
                                  {market.imageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={market.imageUrl}
                                      alt=""
                                      className="size-full object-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="flex size-full items-center justify-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                      Kalshi
                                    </div>
                                  )}
                                </div>

                                <div className="min-w-0 flex-1 space-y-1.5">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-medium leading-snug text-foreground text-pretty">
                                      {market.title}
                                    </p>
                                    <span className="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                                      <span
                                        className={cn(
                                          "size-2 rounded-full",
                                          live
                                            ? "animate-pulse bg-green-500"
                                            : "bg-slate-400 dark:bg-slate-500",
                                        )}
                                        aria-hidden
                                      />
                                      {live ? "Live" : market.status || "—"}
                                    </span>
                                  </div>
                                  <p className="font-mono text-[10px] text-muted-foreground">
                                    {market.ticker}
                                  </p>
                                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                                    <span>
                                      Last{" "}
                                      <span className="font-medium text-foreground">
                                        {formatLastPrice(market.lastPriceDollars)}
                                      </span>
                                    </span>
                                    <span>
                                      24h vol{" "}
                                      <span className="font-medium text-foreground">
                                        {formatCompactNumber(market.volume24h)}
                                      </span>
                                    </span>
                                    <span>
                                      OI{" "}
                                      <span className="font-medium text-foreground">
                                        {formatCompactNumber(market.openInterest)}
                                      </span>
                                    </span>
                                  </div>
                                </div>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              ) : null}

              {activeTab === "metadata" ? (
                <div className="px-2 sm:px-4 lg:px-6">
                <div className="min-h-[12rem] overflow-hidden rounded-xl border border-border/70 bg-muted/20">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Market metadata
                    </p>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {loading ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Loader2 className="size-3.5 animate-spin" aria-hidden />
                          Loading…
                        </span>
                      ) : markets ? (
                        <span className="text-xs text-muted-foreground">
                          {markets.length} market{markets.length === 1 ? "" : "s"}
                        </span>
                      ) : null}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!hasData}
                            className="h-7 gap-1.5 px-2 text-[11px] font-medium text-muted-foreground"
                          >
                            <Download className="size-3.5" aria-hidden />
                            Export
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[8rem]">
                          <DropdownMenuItem
                            className="text-xs"
                            disabled={!hasData}
                            onSelect={exportJson}
                          >
                            JSON
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-xs"
                            disabled={!hasData}
                            onSelect={exportCsv}
                          >
                            CSV
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-xs"
                            disabled={!hasData}
                            onSelect={exportXlsx}
                          >
                            XLSX
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <div
                        className="inline-flex h-7 items-center rounded-md border border-border/70 bg-background p-0.5"
                        role="group"
                        aria-label="Result view"
                      >
                        <button
                          type="button"
                          disabled={!hasData && !loading}
                          onClick={() =>
                            setViewMode(viewMode === "json" ? "sheet" : "json")
                          }
                          className="inline-flex h-6 items-center gap-1 rounded px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          aria-label={
                            viewMode === "json"
                              ? "Switch to sheet view"
                              : "Switch to JSON view"
                          }
                        >
                          {viewMode === "json" ? (
                            <>
                              <Table2 className="size-3.5" aria-hidden />
                              Sheet
                            </>
                          ) : (
                            <>
                              <Braces className="size-3.5" aria-hidden />
                              JSON
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {error ? (
                    <p className="px-3 py-4 text-sm text-destructive">{error}</p>
                  ) : loading && !markets ? (
                    <div className="flex items-center justify-center gap-2 px-3 py-10 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Fetching market metadata…
                    </div>
                  ) : viewMode === "json" ? (
                    <pre className="max-h-[28rem] overflow-auto px-3 py-3 font-mono text-[11px] leading-relaxed text-foreground sm:text-xs">
                      {jsonText}
                    </pre>
                  ) : (
                    <div className="max-h-[28rem] overflow-auto">
                      <table className="w-max min-w-full border-collapse text-left text-[11px] sm:text-xs">
                        <thead className="sticky top-0 z-[1] bg-muted/80 backdrop-blur">
                          <tr className="border-b border-border/60">
                            {sheetColumns.map((col) => (
                              <th
                                key={col}
                                className="whitespace-nowrap px-3 py-2 font-medium text-muted-foreground"
                              >
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(markets || []).map((row, rowIndex) => (
                            <tr
                              key={String(row.ticker || rowIndex)}
                              className="border-b border-border/40 last:border-0"
                            >
                              {sheetColumns.map((col) => (
                                <td
                                  key={`${rowIndex}-${col}`}
                                  className="max-w-[16rem] truncate whitespace-nowrap px-3 py-2 text-foreground"
                                  title={cellValue(row[col])}
                                >
                                  {cellValue(row[col])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                </div>
              ) : null}

              {activeTab === "trades" ? (
                <div className="px-2 sm:px-4 lg:px-6">{comingSoonPanel("Trades")}</div>
              ) : null}
              {activeTab === "orderbook" ? (
                <div className="px-2 sm:px-4 lg:px-6">{comingSoonPanel("Orderbook")}</div>
              ) : null}
              {activeTab === "candlesticks" ? (
                <div className="px-2 sm:px-4 lg:px-6">{comingSoonPanel("Candlesticks")}</div>
              ) : null}
              {activeTab === "event_forecast" ? (
                <div className="px-2 sm:px-4 lg:px-6">{comingSoonPanel("Event forecast")}</div>
              ) : null}
            </div>
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground text-pretty">
            This preview is limited to search and raw market metadata.{" "}
            <Link
              href="/#pricing"
              className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
            >
              Register for full access
            </Link>{" "}
            to pull trades, order books, candlesticks, charts, exports, and dashboards.
          </p>
        </div>
      </HubKalshiLiveDemoMockup>
    </div>
  );
}
