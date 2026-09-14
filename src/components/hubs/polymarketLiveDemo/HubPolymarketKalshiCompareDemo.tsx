"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, Search } from "lucide-react";

import { PolymarketLiveSearch } from "@/components/connectData/polymarketLive/PolymarketLiveSearch";
import { MarketTickerSearch } from "@/components/connectData/MarketTickerSearch";
import { HubKalshiLiveDemoTradesLiveline } from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveDemoTradesLiveline";
import {
  defaultSeriesColorToken,
  resolveDemoChartColor,
} from "@/components/hubs/kalshiLiveDemo/demoChartColors";
import {
  featuredPolymarketMarketToDemoMarket,
  useHubPolymarketLiveDemo,
  type HubPolymarketLiveDemoMarket,
} from "@/components/hubs/polymarketLiveDemo/HubPolymarketLiveDemoSelection";
import {
  polymarketRealtimeMarketFromSuggestion,
  polymarketRealtimeMarketKey,
  polymarketRealtimeMarketsFromEventSuggestion,
} from "@/lib/polymarketLive/polymarketRealtimeCompose";
import { Button } from "@/components/ui/button";
import { fetchKalshiLiveMarket } from "@/lib/kalshiLive/fetchKalshiLiveMarket";
import { impliedChancePctFromMarketRow } from "@/lib/kalshiLive/eventCandlesticksPowerMove";
import { openPolymarketLastTradeSocket } from "@/lib/polymarketLive/openPolymarketMarketSocket";
import { normalizePolymarketRealtimeHistoryRows } from "@/lib/polymarketLive/polymarketRealtimeSeed";
import {
  findKalshiLiveMatchesForPolymarket,
  matchTierLabel,
  polymarketOutcomeShape,
} from "@/lib/predictionMarkets/matchPolymarketToKalshiLive";
import { trackPolymarketLiveHubEvent } from "@/lib/analytics/polymarketLiveHubEvents";
import { formatPolymarketVolume } from "@/lib/polymarketLive/polymarketPublicSearch";
import { cn } from "@/lib/utils";

const COMPARE_FEATURED_LIMIT = 10;

type CompareFeaturedCard = {
  id: string;
  slug?: string;
  conditionId: string;
  title: string;
  volume24h: number | null;
  featured?: boolean;
  imageUrl?: string;
  tags?: string[];
  eventTitle?: string;
  outcomes: { tokenId: string; outcome: string; lastPrice: number | null }[];
};

function compareFeaturedKey(market: CompareFeaturedCard) {
  return String(market.conditionId || market.id || market.slug || "").trim();
}

function formatCompareFeaturedPrice(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Math.round(value * 100)}¢`;
}

function shuffleCompareFeatured<T>(items: T[], count: number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = current;
  }
  return copy.slice(0, count);
}

function normalizeCompareFeaturedCard(raw: unknown): CompareFeaturedCard | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const outcomesRaw = Array.isArray(row.outcomes) ? row.outcomes : [];
  const outcomes = outcomesRaw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const outcome = item as Record<string, unknown>;
      const tokenId = String(outcome.tokenId || "").trim();
      if (!tokenId) return null;
      return {
        tokenId,
        outcome: String(outcome.outcome || "").trim() || "Outcome",
        lastPrice:
          outcome.lastPrice != null && Number.isFinite(Number(outcome.lastPrice))
            ? Number(outcome.lastPrice)
            : null,
      };
    })
    .filter(Boolean) as CompareFeaturedCard["outcomes"];
  const id = String(row.id || row.conditionId || row.slug || "").trim();
  const title = String(row.title || "").trim() || id;
  if (!id || !title || outcomes.length < 1) return null;
  return {
    id,
    slug: String(row.slug || "").trim() || undefined,
    conditionId: String(row.conditionId || id).trim(),
    title,
    volume24h:
      row.volume24h != null && Number.isFinite(Number(row.volume24h))
        ? Number(row.volume24h)
        : null,
    featured: row.featured === true,
    imageUrl: String(row.imageUrl || "").trim() || undefined,
    tags: Array.isArray(row.tags)
      ? row.tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 4)
      : [],
    eventTitle: String(row.eventTitle || "").trim() || undefined,
    outcomes,
  };
}

type IntervalId = "15m" | "1h" | "6h" | "1d" | "all";

/** Kalshi brand-forward green for the comparison line. */
const KALSHI_LINE_GREEN = "#22c55e";
const INTERVALS: { id: IntervalId; label: string; ms: number | null }[] = [
  { id: "15m", label: "15m", ms: 15 * 60 * 1000 },
  { id: "1h", label: "1h", ms: 60 * 60 * 1000 },
  { id: "6h", label: "6h", ms: 6 * 60 * 60 * 1000 },
  { id: "1d", label: "1d", ms: 24 * 60 * 60 * 1000 },
  { id: "all", label: "All", ms: null },
];

function yesTokenId(market: Record<string, unknown> | null): string {
  if (!market) return "";
  const pairs = Array.isArray(market.outcomePairs)
    ? (market.outcomePairs as Array<{ tokenId?: string; outcome?: string }>)
    : [];
  if (pairs.length) {
    const yes = pairs.find((p) => String(p.outcome || "").toLowerCase() === "yes");
    if (yes?.tokenId) return String(yes.tokenId).trim();
    if (pairs[0]?.tokenId) return String(pairs[0].tokenId).trim();
  }
  const outcomes = Array.isArray(market.outcomes) ? market.outcomes.map(String) : [];
  const tokens = Array.isArray(market.tokenIds) ? market.tokenIds.map(String) : [];
  const yesIdx = outcomes.findIndex((o) => o.toLowerCase() === "yes");
  if (yesIdx >= 0 && tokens[yesIdx]) return tokens[yesIdx];
  return tokens[0] || "";
}

function parseTs(row: Record<string, unknown>): number | null {
  const raw = row.created_time ?? row.time ?? row.timestamp ?? row.created_ts ?? row.ts ?? row.t;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw > 1e12 ? raw : raw * 1000;
  }
  const asNum = Number(raw);
  // Epoch seconds/ms often arrive as numeric strings ("1712345678") — Date.parse fails on those.
  if (Number.isFinite(asNum) && asNum > 0 && String(raw).trim() !== "") {
    const rawStr = String(raw).trim();
    if (/^\d+(\.\d+)?$/.test(rawStr)) {
      return asNum > 1e12 ? asNum : asNum * 1000;
    }
  }
  const ms = Date.parse(String(raw || "").trim());
  return Number.isFinite(ms) ? ms : null;
}

function toPctPoint(row: Record<string, unknown>, platform: string): Record<string, unknown> | null {
  const ts = parseTs(row);
  if (ts == null) return null;
  const priceRaw =
    row.yes_price_dollars ?? row.price ?? row.last_price_dollars ?? row.yes_price;
  const price = Number(priceRaw);
  if (!Number.isFinite(price)) return null;
  // Dollars (0–1) → %, cents/already-% (0–100) stay as %.
  const pct = price <= 1.5 ? price * 100 : price;
  if (pct < 0 || pct > 100) return null;
  return {
    ...row,
    created_time: new Date(ts).toISOString(),
    time: new Date(ts).toISOString(),
    timestamp: String(ts),
    yes_price_dollars: pct / 100,
    price: pct / 100,
    _platform: platform,
    _probability_pct: pct,
  };
}

function formatPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}%`;
}

function formatAgo(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "—";
  const sec = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

function filterByInterval(
  rows: Record<string, unknown>[],
  interval: IntervalId,
): Record<string, unknown>[] {
  const spec = INTERVALS.find((item) => item.id === interval);
  if (!spec?.ms) return rows;
  const cutoff = Date.now() - spec.ms;
  return rows.filter((row) => {
    const ts = parseTs(row);
    return ts != null && ts >= cutoff;
  });
}

async function fetchPolymarketHistory(
  tokenId: string,
  signal: AbortSignal,
): Promise<Record<string, unknown>[]> {
  // Pull a wide archive once; interval buttons filter client-side (same as prices demo cache).
  const res = await fetch("/api/integrations/polymarket?query=getBatchPricesHistory", {
    method: "POST",
    credentials: "same-origin",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      markets: [tokenId],
      interval: "max",
      fidelity: 60,
    }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof payload?.error === "string" ? payload.error : "Failed to load Polymarket history",
    );
  }
  const rows = normalizePolymarketRealtimeHistoryRows(payload);
  const forToken = rows.filter(
    (row) => !row.asset_id || String(row.asset_id) === tokenId,
  );
  return forToken.length ? forToken : rows;
}

async function fetchKalshiTrades(
  ticker: string,
  signal: AbortSignal,
): Promise<Record<string, unknown>[]> {
  const qs = new URLSearchParams({ ticker, limit: "200" });
  const res = await fetch(`/api/integrations/kalshi-live/markets/trades?${qs.toString()}`, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    signal,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body?.error === "string" ? body.error : "Failed to load Kalshi trades");
  }
  return (Array.isArray(body?.trades) ? body.trades : []).filter(
    (row: unknown) => row && typeof row === "object",
  ) as Record<string, unknown>[];
}


function ComparePolymarketMarketSearch() {
  const selection = useHubPolymarketLiveDemo();
  const selectMarket = selection?.selectMarket;
  const [error, setError] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventMarkets, setEventMarkets] = useState<HubPolymarketLiveDemoMarket[] | null>(
    null,
  );
  const [featured, setFeatured] = useState<CompareFeaturedCard[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [featuredRefreshing, setFeaturedRefreshing] = useState(false);
  const [featuredError, setFeaturedError] = useState<string | null>(null);

  const loadFeatured = useCallback(async (opts?: { excludeIds?: string[] }) => {
    const exclude = opts?.excludeIds || [];
    const refreshing = exclude.length > 0;
    if (refreshing) setFeaturedRefreshing(true);
    else setFeaturedLoading(true);
    setFeaturedError(null);
    try {
      const params = new URLSearchParams({ limit: "12" });
      if (exclude.length) params.set("exclude", exclude.join(","));
      const res = await fetch(
        `/api/integrations/polymarket-live/markets/featured?${params.toString()}`,
        { credentials: "same-origin", headers: { Accept: "application/json" } },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof body?.error === "string" ? body.error : "Failed to load featured markets",
        );
      }
      const parsed = (Array.isArray(body?.markets) ? body.markets : [])
        .map(normalizeCompareFeaturedCard)
        .filter(Boolean) as CompareFeaturedCard[];
      setFeatured(shuffleCompareFeatured(parsed, COMPARE_FEATURED_LIMIT));
    } catch (e) {
      setFeatured([]);
      setFeaturedError(e instanceof Error ? e.message : "Failed to load featured markets");
    } finally {
      setFeaturedLoading(false);
      setFeaturedRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadFeatured();
  }, [loadFeatured]);

  const applyMarket = useCallback(
    (market: HubPolymarketLiveDemoMarket, source: "compare_search" | "compare_featured") => {
      if (!selectMarket) return;
      trackPolymarketLiveHubEvent("polymarket_live_market_selected", {
        source,
        title: String(market.title || ""),
        conditionId: String(market.conditionId || market.id || ""),
      });
      selectMarket(market);
      setEventMarkets(null);
      setEventTitle("");
      setError("");
    },
    [selectMarket],
  );

  const selectFeatured = useCallback(
    (card: CompareFeaturedCard) => {
      const market = featuredPolymarketMarketToDemoMarket(card);
      if (!market) {
        setError("That featured market does not expose streamable outcome token IDs.");
        return;
      }
      applyMarket(market, "compare_featured");
    },
    [applyMarket],
  );

  const handleSearchSelection = useCallback(
    (suggestion: Record<string, unknown>) => {
      setError("");
      const entity = String(suggestion?.entity || "");
      if (entity === "event") {
        const nested = polymarketRealtimeMarketsFromEventSuggestion(
          suggestion,
        ) as HubPolymarketLiveDemoMarket[];
        if (!nested.length) {
          setError("That event does not include any streamable markets with outcome token IDs.");
          return;
        }
        if (nested.length === 1) {
          applyMarket(nested[0]!, "compare_search");
          return;
        }
        setEventTitle(String(suggestion.title || "Select a market in this event"));
        setEventMarkets(nested);
        return;
      }
      if (entity !== "market") {
        setError("Pick a market or event to start the comparison.");
        return;
      }
      const market = polymarketRealtimeMarketFromSuggestion(suggestion) as
        | HubPolymarketLiveDemoMarket
        | null;
      if (!market) {
        setError("That market does not expose streamable outcome token IDs.");
        return;
      }
      applyMarket(market, "compare_search");
    },
    [applyMarket],
  );

  const handleSearchAll = useCallback(
    (suggestions: Array<Record<string, unknown>>) => {
      for (const suggestion of suggestions || []) {
        if (suggestion?.entity === "market") {
          handleSearchSelection(suggestion);
          return;
        }
      }
      for (const suggestion of suggestions || []) {
        if (suggestion?.entity === "event") {
          handleSearchSelection(suggestion);
          return;
        }
      }
      setError("No comparable Polymarket markets found for that search.");
    },
    [handleSearchSelection],
  );

  return (
    <div className="space-y-3 text-left">
      <div className="space-y-1 text-center">
        <p className="text-sm font-medium text-foreground">
          Find a Polymarket market to compare with Kalshi Live
        </p>
        <p className="text-sm text-muted-foreground">
          Search in plain English, then we&apos;ll match it against Kalshi.
        </p>
      </div>
      <PolymarketLiveSearch
        layout="panel"
        dismissAfterSelect
        searchTags
        searchProfiles={false}
        keepClosedMarkets={false}
        limitPerType={50}
        className="mx-auto w-full max-w-2xl"
        resultsClassName="max-h-56 flex-none"
        placeholder="Search Polymarket markets in plain English…"
        onSelect={handleSearchSelection}
        onSubmitAll={handleSearchAll}
        onFocus={() => {
          trackPolymarketLiveHubEvent("polymarket_live_market_search_start", {
            source: "compare_demo",
          });
        }}
      />
      <div className="space-y-2">
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          Or try one of these trending live markets
        </p>
        <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/20">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
            <p className="text-xs font-medium text-muted-foreground">Featured live markets</p>
            {featuredLoading ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Loading…
              </span>
            ) : featured.length ? (
              <button
                type="button"
                onClick={() =>
                  void loadFeatured({
                    excludeIds: featured.map((item) => compareFeaturedKey(item)),
                  })
                }
                disabled={featuredLoading || featuredRefreshing}
                className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                aria-label="Show different featured live markets"
                title="Show different featured live markets"
              >
                <RefreshCw
                  className={cn("size-3.5", featuredRefreshing && "animate-spin")}
                  aria-hidden
                />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void loadFeatured()}
                disabled={featuredLoading}
                className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                aria-label="Refresh featured live markets"
              >
                <RefreshCw className="size-3.5" aria-hidden />
              </button>
            )}
          </div>

          {featuredLoading ? (
            <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2" aria-hidden>
              {Array.from({ length: COMPARE_FEATURED_LIMIT }).map((_, index) => (
                <div
                  key={index}
                  className="flex animate-pulse items-start gap-2 rounded-lg border border-border/60 bg-background/80 p-2"
                >
                  <div className="size-8 shrink-0 rounded-md bg-muted" />
                  <div className="min-w-0 flex-1 space-y-1.5 py-0.5">
                    <div className="h-3 w-4/5 rounded bg-muted" />
                    <div className="h-3 w-1/2 rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : featuredError ? (
            <p className="px-3 py-4 text-sm text-destructive">{featuredError}</p>
          ) : !featured.length ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No featured markets available right now. Try searching above.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
              {featured.map((market) => {
                const yes = market.outcomes[0];
                return (
                  <li key={compareFeaturedKey(market)}>
                    <button
                      type="button"
                      onClick={() => selectFeatured(market)}
                      className="flex h-full w-full items-start gap-2 rounded-lg border border-border/70 bg-background p-2 text-left shadow-sm transition-colors hover:border-border hover:bg-muted/30"
                    >
                      <div className="relative size-8 shrink-0 overflow-hidden rounded-md border border-border/60 bg-black">
                        {market.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={market.imageUrl}
                            alt=""
                            className="size-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                            PM
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-1.5">
                          <p className="line-clamp-2 text-xs font-medium leading-snug text-foreground">
                            {market.title}
                          </p>
                          <span className="inline-flex shrink-0 items-center gap-1 pt-0.5 text-[10px] font-medium text-muted-foreground">
                            <span className="size-1.5 animate-pulse rounded-full bg-green-500" aria-hidden />
                            Live
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                          <span>
                            {yes?.outcome || "Yes"}{" "}
                            <span className="font-medium text-foreground">
                              {formatCompareFeaturedPrice(yes?.lastPrice)}
                            </span>
                          </span>
                          <span>
                            vol{" "}
                            <span className="font-medium text-foreground">
                              {formatPolymarketVolume(market.volume24h) || "—"}
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
      {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}
      {eventMarkets?.length ? (
        <div className="space-y-2 rounded-lg border border-border/60 bg-background/80 p-3">
          <p className="text-xs font-medium text-muted-foreground">{eventTitle}</p>
          <ul className="grid gap-1.5">
            {eventMarkets.slice(0, 8).map((market) => {
              const key = polymarketRealtimeMarketKey(market);
              return (
                <li key={key}>
                  <button
                    type="button"
                    className="w-full rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted/40"
                    onClick={() => applyMarket(market, "compare_search")}
                  >
                    {String(market.title || market.slug || "Market")}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function HubPolymarketKalshiCompareDemo() {
  const selection = useHubPolymarketLiveDemo();
  const polyMarket = selection?.markets?.[0] || null;
  const polyKey = String(polyMarket?.conditionId || polyMarket?.id || polyMarket?.slug || "");

  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<
    Awaited<ReturnType<typeof findKalshiLiveMatchesForPolymarket>>["candidates"]
  >([]);
  const [selectedTicker, setSelectedTicker] = useState<string>("");
  const [emptyMessage, setEmptyMessage] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualTickers, setManualTickers] = useState("");

  const [kalshiMarket, setKalshiMarket] = useState<Record<string, unknown> | null>(null);
  const [polyPoints, setPolyPoints] = useState<Record<string, unknown>[]>([]);
  const [kalshiPoints, setKalshiPoints] = useState<Record<string, unknown>[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [seriesError, setSeriesError] = useState<string | null>(null);
  const [interval, setIntervalId] = useState<IntervalId>("1d");
  const [livePaused, setLivePaused] = useState(false);

  const polySocketStop = useRef<(() => void) | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const matchAbort = useRef<AbortController | null>(null);
  const seriesAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => setInView(Boolean(entry?.isIntersecting)),
      { threshold: 0.12, rootMargin: "120px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      matchAbort.current?.abort();
      seriesAbort.current?.abort();
      polySocketStop.current?.();
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, []);

  // Match when Polymarket selection changes and section is in view.
  useEffect(() => {
    if (!inView || !polyMarket || !polyKey) {
      setCandidates([]);
      setSelectedTicker("");
      setEmptyMessage(null);
      return undefined;
    }

    matchAbort.current?.abort();
    const ac = new AbortController();
    matchAbort.current = ac;
    setMatchLoading(true);
    setMatchError(null);
    setEmptyMessage(null);
    setSelectedTicker("");
    setKalshiMarket(null);

    void findKalshiLiveMatchesForPolymarket(polyMarket, { signal: ac.signal })
      .then((result) => {
        if (ac.signal.aborted) return;
        trackPolymarketLiveHubEvent("polymarket_kalshi_compare_attempt", {
          query: result.query,
          candidateCount: result.candidates.length,
          hasPreselected: Boolean(result.preselected),
        });
        setCandidates(result.candidates);
        setEmptyMessage(result.emptyMessage);
        if (result.preselected) {
          trackPolymarketLiveHubEvent("polymarket_kalshi_compare_match", {
            tier: result.preselected.tier,
            ticker: result.preselected.market.marketTicker,
            auto: true,
          });
          setSelectedTicker(result.preselected.market.marketTicker);
        } else if (result.candidates.length === 1) {
          trackPolymarketLiveHubEvent("polymarket_kalshi_compare_match", {
            tier: result.candidates[0]!.tier,
            ticker: result.candidates[0]!.market.marketTicker,
            auto: false,
          });
          setSelectedTicker(result.candidates[0]!.market.marketTicker);
        }
      })
      .catch((err) => {
        if (ac.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) return;
        setMatchError(err instanceof Error ? err.message : "Match search failed");
        setCandidates([]);
      })
      .finally(() => {
        if (!ac.signal.aborted) setMatchLoading(false);
      });

    return () => ac.abort();
  }, [inView, polyKey, polyMarket]);

  const selectedCandidate = useMemo(
    () => candidates.find((c) => c.market.marketTicker === selectedTicker) || null,
    [candidates, selectedTicker],
  );

  const loadSeries = useCallback(async () => {
    if (!polyMarket || !selectedTicker || !inView) return;
    const tokenId = yesTokenId(polyMarket);
    if (!tokenId) {
      setSeriesError("This Polymarket market has no YES token to chart.");
      return;
    }

    seriesAbort.current?.abort();
    const ac = new AbortController();
    seriesAbort.current = ac;
    setSeriesLoading(true);
    setSeriesError(null);

    try {
      const [market, polyHist, kalshiTrades] = await Promise.all([
        fetchKalshiLiveMarket({ marketTicker: selectedTicker, signal: ac.signal }),
        fetchPolymarketHistory(tokenId, ac.signal),
        fetchKalshiTrades(selectedTicker, ac.signal),
      ]);
      if (ac.signal.aborted) return;
      setKalshiMarket(market);
      setPolyPoints(
        polyHist
          .map((row) => toPctPoint(row, "Polymarket"))
          .filter(Boolean) as Record<string, unknown>[],
      );
      setKalshiPoints(
        kalshiTrades
          .map((row) => toPctPoint(row, "Kalshi"))
          .filter(Boolean) as Record<string, unknown>[],
      );
    } catch (err) {
      if (ac.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) return;
      setSeriesError(err instanceof Error ? err.message : "Failed to load comparison series");
    } finally {
      if (!ac.signal.aborted) setSeriesLoading(false);
    }
  }, [inView, polyMarket, selectedTicker]);

  useEffect(() => {
    void loadSeries();
  }, [loadSeries]);

  // Live updates: Polymarket WS + Kalshi poll while in view.
  useEffect(() => {
    polySocketStop.current?.();
    polySocketStop.current = null;
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }

    if (!inView || livePaused || !polyMarket || !selectedTicker) return undefined;

    const tokenId = yesTokenId(polyMarket);
    if (tokenId) {
      polySocketStop.current = openPolymarketLastTradeSocket({
        assetIds: [tokenId],
        onTrade: (row) => {
          const asset = String(row.asset_id || "");
          if (asset && asset !== tokenId) return;
          const point = toPctPoint(
            {
              created_time: row.timestamp || row.time || new Date().toISOString(),
              price: row.price,
              yes_price_dollars: row.price,
              size: row.size,
              side: row.side,
            },
            "Polymarket",
          );
          if (!point) return;
          setPolyPoints((prev) => [...prev.slice(-2000), point]);
        },
      });
    }

    pollTimer.current = setInterval(() => {
      void (async () => {
        try {
          const [market, trades] = await Promise.all([
            fetchKalshiLiveMarket({ marketTicker: selectedTicker }),
            fetchKalshiTrades(selectedTicker, new AbortController().signal),
          ]);
          setKalshiMarket(market);
          const mapped = trades
            .map((row) => toPctPoint(row, "Kalshi"))
            .filter(Boolean) as Record<string, unknown>[];
          if (mapped.length) {
            setKalshiPoints((prev) => {
              const byTime = new Map<string, Record<string, unknown>>();
              for (const row of [...prev, ...mapped]) {
                const key = String(row.created_time || "");
                if (key) byTime.set(key, row);
              }
              return [...byTime.values()]
                .sort((a, b) => (parseTs(a) || 0) - (parseTs(b) || 0))
                .slice(-2000);
            });
          }
        } catch {
          /* ignore poll errors */
        }
      })();
    }, 12_000);

    return () => {
      polySocketStop.current?.();
      polySocketStop.current = null;
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    };
  }, [inView, livePaused, polyMarket, selectedTicker]);

  const polyFiltered = useMemo(
    () => filterByInterval(polyPoints, interval),
    [polyPoints, interval],
  );
  const kalshiFiltered = useMemo(
    () => filterByInterval(kalshiPoints, interval),
    [kalshiPoints, interval],
  );

  const polySeries = useMemo(
    () => [
      {
        id: "polymarket",
        label: "Polymarket",
        colorToken: defaultSeriesColorToken(0),
        color: resolveDemoChartColor(defaultSeriesColorToken(0)),
        trades: polyFiltered,
      },
    ],
    [polyFiltered],
  );

  const kalshiSeries = useMemo(
    () => [
      {
        id: "kalshi",
        label: "Kalshi",
        colorToken: "chart-3" as const,
        color: KALSHI_LINE_GREEN,
        trades: kalshiFiltered,
      },
    ],
    [kalshiFiltered],
  );

  const polyYesPct = useMemo(() => {
    const last = polyFiltered[polyFiltered.length - 1];
    if (last && Number.isFinite(Number(last._probability_pct))) {
      return Number(last._probability_pct);
    }
    return null;
  }, [polyFiltered]);

  const kalshiYesPct = useMemo(() => {
    if (kalshiMarket) {
      const fromMarket = impliedChancePctFromMarketRow(kalshiMarket);
      if (fromMarket != null) return fromMarket;
    }
    const last = kalshiFiltered[kalshiFiltered.length - 1];
    if (last && Number.isFinite(Number(last._probability_pct))) {
      return Number(last._probability_pct);
    }
    return null;
  }, [kalshiFiltered, kalshiMarket]);

  const divergence =
    polyYesPct != null && kalshiYesPct != null ? polyYesPct - kalshiYesPct : null;

  const polyLast = polyFiltered[polyFiltered.length - 1] || null;
  const kalshiLast = kalshiFiltered[kalshiFiltered.length - 1] || null;
  const shape = polymarketOutcomeShape(polyMarket || {});

  const relatedWarning =
    selectedCandidate &&
    (selectedCandidate.tier === "related" || selectedCandidate.tier === "close");

  return (
    <div ref={rootRef} className="space-y-5">
      {!polyMarket ? (
        <div className="rounded-xl border border-border/70 bg-muted/15 px-4 py-5 sm:px-5 sm:py-6">
          <ComparePolymarketMarketSearch />
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border/60 bg-muted/10 px-3 py-2.5 text-sm">
            <span className="text-muted-foreground">Polymarket selected: </span>
            <span className="font-medium text-foreground">
              {String(polyMarket.title || polyMarket.slug || "Market")}
            </span>
            {!shape.isBinary ? (
              <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                Multi-outcome market — comparison uses the YES (or first) outcome only.
              </p>
            ) : null}
          </div>

          {matchLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Searching Kalshi Live for comparable markets…
            </div>
          ) : null}

          {matchError ? (
            <p className="text-sm text-destructive">{matchError}</p>
          ) : null}

          {emptyMessage && !matchLoading ? (
            <div className="space-y-3 rounded-xl border border-border/70 bg-muted/15 px-4 py-4">
              <p className="text-sm text-muted-foreground">{emptyMessage}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setManualOpen(true)}
              >
                <Search className="size-3.5" aria-hidden />
                Search Kalshi manually
              </Button>
            </div>
          ) : null}

          {candidates.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {selectedCandidate && !candidates.slice(1).some((c) => c.score > selectedCandidate.score - 0.05)
                  ? "Matched Kalshi market"
                  : "Select the correct Kalshi market"}
              </p>
              <div className="grid gap-2">
                {candidates.slice(0, 6).map((candidate) => {
                  const selected = candidate.market.marketTicker === selectedTicker;
                  return (
                    <label
                      key={candidate.market.marketTicker}
                      className={cn(
                        "flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors",
                        selected
                          ? "border-secondary/40 bg-secondary/10"
                          : "border-border/60 bg-background hover:bg-muted/30",
                      )}
                    >
                      <input
                        type="radio"
                        name="kalshi-match"
                        className="mt-1 size-4 accent-secondary"
                        checked={selected}
                        onChange={() => setSelectedTicker(candidate.market.marketTicker)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {candidate.market.title}
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                              candidate.tier === "exact"
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                : candidate.tier === "close"
                                  ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                                  : "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                            )}
                          >
                            {matchTierLabel(candidate.tier)}
                          </span>
                        </span>
                        <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                          {candidate.market.marketTicker}
                          {candidate.market.chancePct != null
                            ? ` · ${candidate.market.chancePct.toFixed(1)}% YES`
                            : ""}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 gap-1.5 px-2 text-xs"
                onClick={() => setManualOpen((v) => !v)}
              >
                <Search className="size-3.5" aria-hidden />
                Search Kalshi manually
              </Button>
            </div>
          ) : null}

          {manualOpen ? (
            <div className="rounded-xl border border-border/70 bg-muted/10 p-3">
              <MarketTickerSearch
                value={manualTickers}
                onChange={setManualTickers}
                onSelectionsChange={(selections) => {
                  const s = selections?.[0];
                  const ticker = String(s?.ticker || "").trim().toUpperCase();
                  if (!ticker) return;
                  setSelectedTicker(ticker);
                  setCandidates((prev) => {
                    if (prev.some((c) => c.market.marketTicker === ticker)) return prev;
                    return [
                      {
                        market: {
                          marketTicker: ticker,
                          title: String(s?.title || ticker),
                          raw: {},
                        },
                        score: 0.5,
                        tier: "related" as const,
                        reasons: ["Manually selected"],
                        warnings: [
                          "Manual selection — verify event, resolution window, and settlement rules",
                        ],
                      },
                      ...prev,
                    ];
                  });
                  setEmptyMessage(null);
                }}
                maxTickers={1}
                dataSource="live"
                searchScope="events_semantic"
                showCutoffNotes={false}
                required={false}
                placeholder="Search Kalshi events in natural language"
                className="w-full"
              />
            </div>
          ) : null}

          {selectedTicker && relatedWarning ? (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
              These markets cover a similar event but may use different rules or resolution
              criteria.
            </p>
          ) : null}

          {selectedTicker ? (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-xl border border-border/70">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-muted/30 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium"> </th>
                      <th className="px-3 py-2 font-medium">Polymarket</th>
                      <th className="px-3 py-2 font-medium">Kalshi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    <tr>
                      <td className="px-3 py-2 text-muted-foreground">Market</td>
                      <td className="px-3 py-2 font-medium text-foreground">
                        {String(polyMarket.title || "—")}
                      </td>
                      <td className="px-3 py-2 font-medium text-foreground">
                        {String(
                          kalshiMarket?.title ||
                            selectedCandidate?.market.title ||
                            selectedTicker,
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-muted-foreground">YES</td>
                      <td className="px-3 py-2">{formatPct(polyYesPct)}</td>
                      <td className="px-3 py-2">{formatPct(kalshiYesPct)}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-muted-foreground">NO</td>
                      <td className="px-3 py-2">
                        {formatPct(polyYesPct != null ? 100 - polyYesPct : null)}
                      </td>
                      <td className="px-3 py-2">
                        {formatPct(kalshiYesPct != null ? 100 - kalshiYesPct : null)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-muted-foreground">Last trade</td>
                      <td className="px-3 py-2">
                        {formatAgo(String(polyLast?.created_time || "") || null)}
                      </td>
                      <td className="px-3 py-2">
                        {formatAgo(String(kalshiLast?.created_time || "") || null)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-muted-foreground">Activity</td>
                      <td className="px-3 py-2">
                        {polyFiltered.length} prints in view
                        {polyMarket.volume24h != null
                          ? ` · 24h vol $${Number(polyMarket.volume24h).toLocaleString()}`
                          : ""}
                      </td>
                      <td className="px-3 py-2">
                        {kalshiFiltered.length} trades in view
                        {kalshiMarket?.volume != null
                          ? ` · vol ${Number(kalshiMarket.volume).toLocaleString()} contracts`
                          : kalshiMarket?.volume_fp != null
                            ? ` · vol ${Number(kalshiMarket.volume_fp).toLocaleString()} contracts`
                            : ""}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-muted-foreground">Status</td>
                      <td className="px-3 py-2">
                        {polyMarket.closed ? "Closed" : "Live"}
                      </td>
                      <td className="px-3 py-2">
                        {String(kalshiMarket?.status || selectedCandidate?.market.status || "—")}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {divergence != null ? (
                <p className="text-sm text-muted-foreground">
                  Polymarket is pricing YES{" "}
                  <span className="font-medium text-foreground">
                    {Math.abs(divergence).toFixed(1)} percentage points{" "}
                    {divergence >= 0 ? "higher" : "lower"}
                  </span>{" "}
                  than Kalshi. Descriptive only — not an arbitrage signal.
                </p>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div
                  className="inline-flex h-8 items-center rounded-md border border-border/70 bg-background p-0.5"
                  role="group"
                  aria-label="Comparison interval"
                >
                  {INTERVALS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setIntervalId(item.id)}
                      className={cn(
                        "h-7 rounded px-2.5 text-[11px] font-medium transition-colors",
                        interval === item.id
                          ? "bg-muted text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => setLivePaused((v) => !v)}
                >
                  {livePaused ? "Resume live" : "Pause live"}
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col overflow-hidden rounded-xl border border-border/70 bg-muted/10">
                  <div className="flex shrink-0 items-center gap-2 border-b border-border/50 px-3 py-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: resolveDemoChartColor(defaultSeriesColorToken(0)) }}
                      aria-hidden
                    />
                    <p className="text-xs font-semibold text-foreground">Polymarket</p>
                  </div>
                  <div className="h-56 min-h-0 w-full shrink-0 sm:h-64">
                    {seriesLoading && !polyFiltered.length ? (
                      <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                        Loading…
                      </div>
                    ) : !polyFiltered.length ? (
                      <p className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
                        No chart at present
                      </p>
                    ) : (
                      <HubKalshiLiveDemoTradesLiveline
                        series={polySeries}
                        persistHistory
                        fullHistory={interval === "all"}
                        fill
                        fixedValueDomain={{ min: 0, max: 100 }}
                        formatValue={(v) => `${v.toFixed(1)}%`}
                        parseRowValue={(row) => {
                          const n = Number(row._probability_pct);
                          return Number.isFinite(n) ? n : null;
                        }}
                        className="h-full min-h-0"
                        emptyMessage="No chart at present"
                      />
                    )}
                  </div>
                </div>

                <div className="flex flex-col overflow-hidden rounded-xl border border-border/70 bg-muted/10">
                  <div className="flex shrink-0 items-center gap-2 border-b border-border/50 px-3 py-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: KALSHI_LINE_GREEN }}
                      aria-hidden
                    />
                    <p className="text-xs font-semibold text-foreground">Kalshi</p>
                  </div>
                  <div className="h-56 min-h-0 w-full shrink-0 sm:h-64">
                    {seriesLoading && !kalshiFiltered.length ? (
                      <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                        Loading…
                      </div>
                    ) : !kalshiFiltered.length ? (
                      <p className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
                        No chart at present
                      </p>
                    ) : (
                      <HubKalshiLiveDemoTradesLiveline
                        series={kalshiSeries}
                        persistHistory
                        fullHistory={interval === "all"}
                        fill
                        fixedValueDomain={{ min: 0, max: 100 }}
                        formatValue={(v) => `${v.toFixed(1)}%`}
                        parseRowValue={(row) => {
                          const n = Number(row._probability_pct);
                          return Number.isFinite(n) ? n : null;
                        }}
                        className="h-full min-h-0"
                        emptyMessage="No chart at present"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    platform: "Polymarket",
                    trades: polyFiltered.length,
                    volumeLabel:
                      polyMarket.volume24h != null
                        ? `24h notional ≈ $${Number(polyMarket.volume24h).toLocaleString()}`
                        : "Volume metric: platform 24h notional (USDC)",
                    lastPrice: formatPct(polyYesPct),
                    lastSize:
                      polyLast?.size != null ? String(polyLast.size) : "—",
                    since: formatAgo(String(polyLast?.created_time || "") || null),
                  },
                  {
                    platform: "Kalshi",
                    trades: kalshiFiltered.length,
                    volumeLabel:
                      kalshiMarket?.volume != null || kalshiMarket?.volume_fp != null
                        ? `Contract volume ${Number(
                            kalshiMarket.volume ?? kalshiMarket.volume_fp,
                          ).toLocaleString()}`
                        : "Volume metric: Kalshi contracts (not USDC)",
                    lastPrice: formatPct(kalshiYesPct),
                    lastSize:
                      kalshiLast?.count != null || kalshiLast?.count_fp != null
                        ? String(kalshiLast.count ?? kalshiLast.count_fp)
                        : "—",
                    since: formatAgo(String(kalshiLast?.created_time || "") || null),
                  },
                ].map((panel) => (
                  <div
                    key={panel.platform}
                    className="rounded-xl border border-border/70 bg-background px-3 py-3"
                  >
                    <p className="text-xs font-semibold text-foreground">{panel.platform} activity</p>
                    <dl className="mt-2 space-y-1.5 text-[11px]">
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">Trades in interval</dt>
                        <dd className="font-medium text-foreground">{panel.trades}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">Volume</dt>
                        <dd className="max-w-[60%] text-right font-medium text-foreground">
                          {panel.volumeLabel}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">Last execution</dt>
                        <dd className="font-medium text-foreground">{panel.lastPrice}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">Last size</dt>
                        <dd className="font-medium text-foreground">{panel.lastSize}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">Since last trade</dt>
                        <dd className="font-medium text-foreground">{panel.since}</dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <Button type="button" size="sm" asChild>
                  <Link href="#polymarket-live-pricing">Compare Markets in Lychee</Link>
                </Button>
                <Button type="button" size="sm" variant="outline" asChild>
                  <Link href="#polymarket-live-pricing">Add Both to a Live Dashboard</Link>
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
