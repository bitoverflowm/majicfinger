"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { HubKalshiLiveDemoTradesLiveline } from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveDemoTradesLiveline";
import { HeroConfettiBurst } from "@/components/hubs/kalshiLiveDemo/HeroConfettiBurst";
import {
  HUB_HERO_CHART_EMBED_HEIGHT,
  HubHeroChartEmbedSkeleton,
} from "@/components/publicEmbed/ChartEmbedSkeleton";
import { cn } from "@/lib/utils";

const DEFAULT_POLL_MS = 20_000;
/** How long each market stays on the hero chart before swapping. */
const MARKET_DWELL_MS = 2 * 60_000;
/** Start prefetching the next market while the current one is still live. */
const PREFETCH_AFTER_MS = 40_000;
/** Hold the "Market ended" celebration before rotating. */
const MARKET_ENDED_CELEBRATION_MS = 2600;
const FEATURED_POOL_LIMIT = 8;
const SEED_TRADE_LIMIT = 40;
const POLL_TRADE_LIMIT = 25;

/** Shadcn-style palette — hex so Liveline can paint (no CSS vars). */
const HERO_LINE_COLORS = [
  { id: "fuchsia", hex: "#d946ef" },
  { id: "rose", hex: "#f43f5e" },
  { id: "teal", hex: "#14b8a6" },
  { id: "indigo", hex: "#6366f1" },
  { id: "red", hex: "#ef4444" },
] as const;

type FeaturedMarket = {
  ticker: string;
  title?: string;
  subtitle?: string;
  volume24h?: number | null;
  lastPriceDollars?: number | null;
};

type PrefetchedMarket = {
  market: FeaturedMarket;
  trades: Record<string, unknown>[];
};

type HeroLiveChartCopy = {
  eyebrow?: string;
  caption?: string;
  captionLink?: { label: string; href: string };
  pollIntervalMs?: number;
};

type HubKalshiLiveHeroTradesChartProps = {
  copy?: HeroLiveChartCopy;
  className?: string;
};

function tradeKey(row: Record<string, unknown>): string {
  const id = row.trade_id ?? row.id;
  if (id != null && String(id).trim()) return `id:${String(id)}`;
  const t = row.created_time ?? row.created_ts ?? row.ts;
  const p = row.yes_price_dollars ?? row.yes_price;
  return `t:${String(t)}|p:${String(p)}`;
}

function parseTradeTimeMs(row: Record<string, unknown>): number {
  const raw = row.created_time ?? row.created_ts ?? row.ts;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw < 1e12 ? raw * 1000 : raw;
  }
  const ms = Date.parse(String(raw || ""));
  return Number.isFinite(ms) ? ms : 0;
}

function mergeTrades(
  prev: Record<string, unknown>[],
  next: Record<string, unknown>[],
  max = 200,
): Record<string, unknown>[] {
  const map = new Map<string, Record<string, unknown>>();
  for (const row of [...prev, ...next]) {
    if (!row || typeof row !== "object") continue;
    map.set(tradeKey(row), row);
  }
  return [...map.values()]
    .sort((a, b) => parseTradeTimeMs(a) - parseTradeTimeMs(b))
    .slice(-max);
}

function formatVolume(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function formatLastPrice(dollars: number | null | undefined): string {
  if (dollars == null || !Number.isFinite(dollars)) return "";
  return `${Math.round(dollars * 100)}¢`;
}

function lastPriceFromTrades(
  trades: Record<string, unknown>[],
): number | null {
  for (let i = trades.length - 1; i >= 0; i -= 1) {
    const row = trades[i]!;
    const dollarsRaw = row.yes_price_dollars;
    if (dollarsRaw != null && dollarsRaw !== "") {
      const dollars = Number(dollarsRaw);
      if (Number.isFinite(dollars)) return dollars;
    }
    const centsRaw = row.yes_price;
    if (centsRaw != null && centsRaw !== "") {
      const cents = Number(centsRaw);
      if (!Number.isFinite(cents)) continue;
      return cents <= 1 ? cents : cents / 100;
    }
  }
  return null;
}

function normalizeFeatured(raw: unknown): FeaturedMarket | null {
  if (!raw || typeof raw !== "object") return null;
  const top = raw as Record<string, unknown>;
  const ticker = String(top.ticker || "").trim().toUpperCase();
  if (!ticker) return null;
  return {
    ticker,
    title: String(top.title || "").trim() || undefined,
    subtitle:
      String(top.subtitle || top.yes_sub_title || "").trim() || undefined,
    volume24h:
      top.volume24h != null && Number.isFinite(Number(top.volume24h))
        ? Number(top.volume24h)
        : null,
    lastPriceDollars:
      top.lastPriceDollars != null &&
      Number.isFinite(Number(top.lastPriceDollars))
        ? Number(top.lastPriceDollars)
        : null,
  };
}

async function fetchFeaturedPool(
  signal: AbortSignal,
): Promise<FeaturedMarket[]> {
  const res = await fetch(
    `/api/integrations/kalshi-live/markets/featured?limit=${FEATURED_POOL_LIMIT}`,
    {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      signal,
    },
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof body?.error === "string"
        ? body.error
        : "Failed to load featured markets",
    );
  }
  const markets = Array.isArray(body?.markets) ? body.markets : [];
  const out: FeaturedMarket[] = [];
  const seen = new Set<string>();
  for (const raw of markets) {
    const m = normalizeFeatured(raw);
    if (!m || seen.has(m.ticker)) continue;
    seen.add(m.ticker);
    out.push(m);
  }
  return out;
}

async function fetchTrades(
  ticker: string,
  limit: number,
  signal: AbortSignal,
): Promise<Record<string, unknown>[]> {
  const qs = new URLSearchParams({
    ticker,
    limit: String(limit),
  });
  const res = await fetch(
    `/api/integrations/kalshi-live/markets/trades?${qs.toString()}`,
    {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      signal,
    },
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof body?.error === "string"
        ? body.error
        : typeof body?.message === "string"
          ? body.message
          : "Failed to load trades",
    );
  }
  const trades = Array.isArray(body?.trades) ? body.trades : [];
  return trades.filter((row: unknown) => row && typeof row === "object") as Record<
    string,
    unknown
  >[];
}

function pickNextMarket(
  pool: FeaturedMarket[],
  currentTicker: string,
  preferIndex: number,
): FeaturedMarket | null {
  if (!pool.length) return null;
  for (let offset = 0; offset < pool.length; offset += 1) {
    const m = pool[(preferIndex + offset) % pool.length]!;
    if (m.ticker !== currentTicker) return m;
  }
  return pool[0] || null;
}

function isMarketEndedStatus(status: string, closeTime?: string): boolean {
  const s = String(status || "").trim().toLowerCase();
  if (
    s === "closed" ||
    s === "settled" ||
    s === "determined" ||
    s === "finalized"
  ) {
    return true;
  }
  if (closeTime) {
    const ms = Date.parse(closeTime);
    // Short markets (e.g. 15m BTC) can lag status updates — treat past close as ended.
    if (Number.isFinite(ms) && Date.now() > ms + 5_000) return true;
  }
  return false;
}

async function fetchMarketStatus(
  ticker: string,
  signal: AbortSignal,
): Promise<{ status: string; closeTime?: string } | null> {
  const qs = new URLSearchParams({ ticker });
  const res = await fetch(
    `/api/integrations/kalshi-live/markets/get?${qs.toString()}`,
    {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      signal,
    },
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return null;
  const market = body?.market;
  if (!market || typeof market !== "object") return null;
  return {
    status: String(market.status || "").trim(),
    closeTime:
      String(
        market.close_time || market.close_ts || market.expiration_time || "",
      ).trim() || undefined,
  };
}

/**
 * Premium hero right column: high-volume Kalshi market + Liveline trades.
 * Dwells ~2 minutes per market, prefetches the next feed in the background,
 * then hard-swaps when ready. Line color rotates fuchsia → rose → teal → indigo → red.
 */
export function HubKalshiLiveHeroTradesChart({
  copy,
  className,
}: HubKalshiLiveHeroTradesChartProps) {
  const pollMs = Math.max(
    15_000,
    Math.floor(Number(copy?.pollIntervalMs) || DEFAULT_POLL_MS),
  );

  const rootRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const prefetchAbortRef = useRef<AbortController | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickerRef = useRef("");
  const poolRef = useRef<FeaturedMarket[]>([]);
  const poolCursorRef = useRef(0);
  const prefetchedRef = useRef<PrefetchedMarket | null>(null);
  const colorIndexRef = useRef(0);
  const dwellStartedAtRef = useRef(0);
  const swapWhenReadyRef = useRef(false);
  const celebratingRef = useRef(false);
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [market, setMarket] = useState<FeaturedMarket | null>(null);
  const [trades, setTrades] = useState<Record<string, unknown>[]>([]);
  const [colorIndex, setColorIndex] = useState(0);
  const [chartKey, setChartKey] = useState(0);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const [demoFrozen, setDemoFrozen] = useState(false);
  const [marketEnded, setMarketEnded] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);

  const pollingActive = inView && tabVisible && !demoFrozen && !marketEnded;

  const clearTimer = useCallback(
    (ref: { current: ReturnType<typeof setTimeout> | null }) => {
      if (ref.current != null) {
        clearTimeout(ref.current);
        ref.current = null;
      }
    },
    [],
  );

  const clearPollTimer = useCallback(() => {
    clearTimer(pollTimerRef);
  }, [clearTimer]);

  const pullTradesIntoState = useCallback(
    async (ticker: string, limit: number, signal: AbortSignal) => {
      const batch = await fetchTrades(ticker, limit, signal);
      setTrades((prev) => mergeTrades(prev, batch));
      const last = lastPriceFromTrades(batch);
      if (last != null) {
        setMarket((prev) =>
          prev && prev.ticker === ticker
            ? { ...prev, lastPriceDollars: last }
            : prev,
        );
      }
    },
    [],
  );

  const applyMarket = useCallback(
    (next: PrefetchedMarket, advanceColor: boolean) => {
      tickerRef.current = next.market.ticker;
      prefetchedRef.current = null;
      swapWhenReadyRef.current = false;
      celebratingRef.current = false;
      dwellStartedAtRef.current = Date.now();
      clearTimer(celebrationTimerRef);

      if (advanceColor) {
        const nextColor =
          (colorIndexRef.current + 1) % HERO_LINE_COLORS.length;
        colorIndexRef.current = nextColor;
        setColorIndex(nextColor);
      } else {
        colorIndexRef.current = 0;
        setColorIndex(0);
      }

      setMarketEnded(false);
      setMarket(next.market);
      setTrades(next.trades);
      setChartKey((k) => k + 1);
      setError(null);
      setLoading(false);
    },
    [clearTimer],
  );

  const rotateToNextMarket = useCallback(async () => {
    const ready = prefetchedRef.current;
    if (ready && ready.market.ticker !== tickerRef.current) {
      applyMarket(ready, true);
      return;
    }

    prefetchAbortRef.current?.abort();
    const ac = new AbortController();
    prefetchAbortRef.current = ac;
    try {
      let pool = poolRef.current;
      if (pool.length < 2) {
        pool = await fetchFeaturedPool(ac.signal);
        // Drop the ended ticker from the local pool.
        pool = pool.filter((m) => m.ticker !== tickerRef.current);
        poolRef.current = pool;
      } else {
        poolRef.current = pool.filter((m) => m.ticker !== tickerRef.current);
        pool = poolRef.current;
      }
      const nextMarket = pickNextMarket(
        pool,
        tickerRef.current,
        poolCursorRef.current + 1,
      );
      if (!nextMarket?.ticker || ac.signal.aborted) {
        setMarketEnded(false);
        celebratingRef.current = false;
        return;
      }
      const batch = await fetchTrades(
        nextMarket.ticker,
        SEED_TRADE_LIMIT,
        ac.signal,
      );
      if (ac.signal.aborted) return;
      const last = lastPriceFromTrades(batch);
      applyMarket(
        {
          market: {
            ...nextMarket,
            lastPriceDollars: last ?? nextMarket.lastPriceDollars,
          },
          trades: batch,
        },
        true,
      );
      poolCursorRef.current =
        pool.findIndex((m) => m.ticker === nextMarket.ticker) >= 0
          ? pool.findIndex((m) => m.ticker === nextMarket.ticker)
          : poolCursorRef.current + 1;
    } catch {
      setMarketEnded(false);
      celebratingRef.current = false;
    }
  }, [applyMarket]);

  const celebrateMarketEnded = useCallback(() => {
    if (celebratingRef.current || demoFrozen) return;
    celebratingRef.current = true;
    setMarketEnded(true);
    setConfettiKey((k) => k + 1);
    clearTimer(dwellTimerRef);
    clearTimer(prefetchTimerRef);
    clearTimer(celebrationTimerRef);
    celebrationTimerRef.current = setTimeout(() => {
      void rotateToNextMarket();
    }, MARKET_ENDED_CELEBRATION_MS);
  }, [clearTimer, demoFrozen, rotateToNextMarket]);

  const prefetchNext = useCallback(async () => {
    if (demoFrozen) return;
    prefetchAbortRef.current?.abort();
    const ac = new AbortController();
    prefetchAbortRef.current = ac;

    try {
      let pool = poolRef.current;
      if (pool.length < 2) {
        pool = await fetchFeaturedPool(ac.signal);
        poolRef.current = pool;
      }
      const nextMarket = pickNextMarket(
        pool,
        tickerRef.current,
        poolCursorRef.current + 1,
      );
      if (!nextMarket?.ticker || ac.signal.aborted) return;

      const batch = await fetchTrades(
        nextMarket.ticker,
        SEED_TRADE_LIMIT,
        ac.signal,
      );
      if (ac.signal.aborted) return;
      if (!batch.length) return;

      const last = lastPriceFromTrades(batch);
      const prepared: PrefetchedMarket = {
        market: {
          ...nextMarket,
          lastPriceDollars: last ?? nextMarket.lastPriceDollars,
        },
        trades: batch,
      };
      prefetchedRef.current = prepared;
      poolCursorRef.current =
        pool.findIndex((m) => m.ticker === nextMarket.ticker) >= 0
          ? pool.findIndex((m) => m.ticker === nextMarket.ticker)
          : poolCursorRef.current + 1;

      if (swapWhenReadyRef.current) {
        applyMarket(prepared, true);
      }
    } catch {
      // Keep current chart; next dwell will try again.
    }
  }, [applyMarket, demoFrozen]);

  const scheduleDwellAndPrefetch = useCallback(() => {
    clearTimer(dwellTimerRef);
    clearTimer(prefetchTimerRef);
    if (demoFrozen) return;

    prefetchTimerRef.current = setTimeout(() => {
      void prefetchNext();
    }, PREFETCH_AFTER_MS);

    dwellTimerRef.current = setTimeout(() => {
      const ready = prefetchedRef.current;
      if (ready && ready.market.ticker !== tickerRef.current) {
        applyMarket(ready, true);
        return;
      }
      // Dwell elapsed but next feed not ready yet — swap as soon as prefetch lands.
      swapWhenReadyRef.current = true;
      void prefetchNext();
    }, MARKET_DWELL_MS);
  }, [applyMarket, clearTimer, demoFrozen, prefetchNext]);

  // Re-arm dwell/prefetch whenever the active market changes
  useEffect(() => {
    if (!market?.ticker || loading || demoFrozen || marketEnded) return undefined;
    scheduleDwellAndPrefetch();
    return () => {
      clearTimer(dwellTimerRef);
      clearTimer(prefetchTimerRef);
    };
  }, [
    market?.ticker,
    chartKey,
    loading,
    demoFrozen,
    marketEnded,
    scheduleDwellAndPrefetch,
    clearTimer,
  ]);

  const bootstrap = useCallback(async () => {
    abortRef.current?.abort();
    prefetchAbortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError(null);

    try {
      const pool = await fetchFeaturedPool(ac.signal);
      poolRef.current = pool;
      const featured = pool[0];
      if (!featured?.ticker) {
        throw new Error("No high-volume live market available right now.");
      }
      poolCursorRef.current = 0;
      const batch = await fetchTrades(
        featured.ticker,
        SEED_TRADE_LIMIT,
        ac.signal,
      );
      if (ac.signal.aborted) return;
      const last = lastPriceFromTrades(batch);
      applyMarket(
        {
          market: {
            ...featured,
            lastPriceDollars: last ?? featured.lastPriceDollars,
          },
          trades: batch,
        },
        false,
      );
    } catch (e) {
      if (
        ac.signal.aborted ||
        (e instanceof DOMException && e.name === "AbortError")
      ) {
        return;
      }
      setError(e instanceof Error ? e.message : "Could not load live trades.");
      setMarket(null);
      setTrades([]);
      setLoading(false);
    }
  }, [applyMarket]);

  useEffect(() => {
    void bootstrap();
    return () => {
      abortRef.current?.abort();
      prefetchAbortRef.current?.abort();
      clearPollTimer();
      clearTimer(dwellTimerRef);
      clearTimer(prefetchTimerRef);
      clearTimer(celebrationTimerRef);
    };
  }, [bootstrap, clearPollTimer, clearTimer]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(Boolean(entry?.isIntersecting));
      },
      { rootMargin: "80px 0px", threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onVis = () => setTabVisible(document.visibilityState === "visible");
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    const demo = document.getElementById("live-demo");
    if (!demo) return undefined;
    const freeze = () => setDemoFrozen(true);
    demo.addEventListener("pointerdown", freeze, { once: true, capture: true });
    demo.addEventListener("focusin", freeze, { once: true, capture: true });
    return () => {
      demo.removeEventListener("pointerdown", freeze, true);
      demo.removeEventListener("focusin", freeze, true);
    };
  }, []);

  // Slow poll while active
  useEffect(() => {
    clearPollTimer();
    if (!pollingActive || !tickerRef.current || loading) return undefined;

    let cancelled = false;

    const tick = async () => {
      if (cancelled || !tickerRef.current || celebratingRef.current) return;
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        const [statusInfo] = await Promise.all([
          fetchMarketStatus(tickerRef.current, ac.signal),
          pullTradesIntoState(tickerRef.current, POLL_TRADE_LIMIT, ac.signal),
        ]);
        if (
          statusInfo &&
          isMarketEndedStatus(statusInfo.status, statusInfo.closeTime)
        ) {
          celebrateMarketEnded();
          return;
        }
      } catch {
        // Keep last good seed.
      }
      if (cancelled || celebratingRef.current) return;
      pollTimerRef.current = setTimeout(() => {
        void tick();
      }, pollMs);
    };

    pollTimerRef.current = setTimeout(() => {
      void tick();
    }, pollMs);

    return () => {
      cancelled = true;
      clearPollTimer();
    };
  }, [
    pollingActive,
    loading,
    pollMs,
    pullTradesIntoState,
    clearPollTimer,
    market?.ticker,
    chartKey,
    celebrateMarketEnded,
  ]);

  const lineColor = HERO_LINE_COLORS[colorIndex % HERO_LINE_COLORS.length]!;

  const series = useMemo(() => {
    if (!market?.ticker || !trades.length) return [];
    return [
      {
        id: market.ticker,
        label: market.subtitle || market.title || market.ticker,
        color: lineColor.hex,
        trades,
      },
    ];
  }, [market, trades, lineColor.hex]);

  const liveLast =
    lastPriceFromTrades(trades) ?? market?.lastPriceDollars ?? null;
  const volLabel = formatVolume(market?.volume24h);
  const priceLabel = formatLastPrice(liveLast);
  const eyebrow =
    market?.title ||
    copy?.eyebrow ||
    "Live trades · high-volume Kalshi market";
  const metaBits = [
    market?.ticker,
    priceLabel ? `Last ${priceLabel}` : null,
    volLabel ? `24h vol ${volLabel}` : null,
    marketEnded ? "Ended" : pollingActive ? "Live" : "Paused",
  ].filter(Boolean);

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative w-full overflow-hidden rounded-xl bg-card/40 text-left",
        className,
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3 px-4 pt-4 sm:mb-4 sm:px-5 sm:pt-5">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex size-2 shrink-0 rounded-full",
                marketEnded
                  ? "bg-amber-400"
                  : pollingActive
                    ? "animate-pulse"
                    : "opacity-50",
              )}
              style={
                marketEnded ? undefined : { backgroundColor: lineColor.hex }
              }
              aria-hidden
            />
            <h2 className="text-balance text-lg font-semibold leading-tight text-foreground sm:text-xl">
              {eyebrow}
            </h2>
          </div>
          {metaBits.length ? (
            <p className="text-sm text-muted-foreground">
              {metaBits.join(" · ")}
            </p>
          ) : null}
        </div>
      </div>

      {loading ? <HubHeroChartEmbedSkeleton /> : null}

      {!loading && error ? (
        <div
          className={cn(
            "flex items-center justify-center px-6 text-center text-sm text-muted-foreground",
            HUB_HERO_CHART_EMBED_HEIGHT,
          )}
        >
          {error}
        </div>
      ) : null}

      {!loading && !error && series.length ? (
        <div className={cn("relative w-full", HUB_HERO_CHART_EMBED_HEIGHT)}>
          <HubKalshiLiveDemoTradesLiveline
            key={chartKey}
            series={series}
            compact
            paused={!pollingActive}
            className="h-full min-h-0"
          />
          {marketEnded ? (
            <>
              <HeroConfettiBurst
                burstKey={confettiKey}
                className="pointer-events-none absolute inset-0 z-20 h-full w-full"
              />
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/55 backdrop-blur-[2px]">
                <div className="rounded-full border border-border/70 bg-background/90 px-5 py-2.5 shadow-lg">
                  <p className="text-sm font-semibold tracking-tight text-foreground">
                    Market ended
                  </p>
                </div>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {!loading && !error && !series.length ? (
        <div
          className={cn(
            "flex items-center justify-center px-6 text-center text-sm text-muted-foreground",
            HUB_HERO_CHART_EMBED_HEIGHT,
          )}
        >
          Waiting for recent trades on this market…
        </div>
      ) : null}

      <div className="px-4 pb-4 pt-3 text-left sm:px-5 sm:pb-5 sm:pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Live YES trade prints via Lychee
        </p>
        {copy?.caption || copy?.captionLink ? (
          <p className="mt-2 text-xs text-muted-foreground/75">
            {copy?.caption}
            {copy?.captionLink ? (
              <>
                {" "}
                <Link
                  href={copy.captionLink.href}
                  className="group/link inline font-medium text-primary underline underline-offset-2 transition-colors hover:text-primary/80"
                >
                  {copy.captionLink.label}
                  <ArrowRight
                    className="ml-0.5 inline-block h-3 w-3 align-text-bottom motion-reduce:transform-none group-hover/link:animate-[link-arrow-nudge-right_0.45s_cubic-bezier(0.165,0.84,0.44,1)]"
                    aria-hidden
                  />
                </Link>
              </>
            ) : null}
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground/75">
            High-volume Kalshi markets rotating live — no code, no API key.
          </p>
        )}
      </div>
    </div>
  );
}
