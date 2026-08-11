"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  defaultSeriesColorToken,
  resolveDemoChartColor,
} from "@/components/hubs/kalshiLiveDemo/demoChartColors";
import { HubKalshiLiveDemoTradesLiveline } from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveDemoTradesLiveline";
import {
  HUB_HERO_CHART_EMBED_HEIGHT,
  HubHeroChartEmbedSkeleton,
} from "@/components/publicEmbed/ChartEmbedSkeleton";
import { cn } from "@/lib/utils";

const DEFAULT_POLL_MS = 20_000;
const SEED_TRADE_LIMIT = 40;
const POLL_TRADE_LIMIT = 25;

type FeaturedMarket = {
  ticker: string;
  title?: string;
  subtitle?: string;
  volume24h?: number | null;
  lastPriceDollars?: number | null;
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
    .sort((a, b) => {
      const ta = Date.parse(String(a.created_time || a.created_ts || 0));
      const tb = Date.parse(String(b.created_time || b.created_ts || 0));
      return (Number.isFinite(ta) ? ta : 0) - (Number.isFinite(tb) ? tb : 0);
    })
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
  const cents = Math.round(dollars * 100);
  return `${cents}¢`;
}

async function fetchFeaturedMarket(signal: AbortSignal): Promise<FeaturedMarket | null> {
  const res = await fetch("/api/integrations/kalshi-live/markets/featured?limit=3", {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    signal,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof body?.error === "string" ? body.error : "Failed to load featured markets",
    );
  }
  const markets = Array.isArray(body?.markets) ? body.markets : [];
  const top = markets[0];
  if (!top || typeof top !== "object") return null;
  return {
    ticker: String(top.ticker || "").trim().toUpperCase(),
    title: String(top.title || "").trim() || undefined,
    subtitle: String(top.subtitle || top.yes_sub_title || "").trim() || undefined,
    volume24h:
      top.volume24h != null && Number.isFinite(Number(top.volume24h))
        ? Number(top.volume24h)
        : null,
    lastPriceDollars:
      top.lastPriceDollars != null && Number.isFinite(Number(top.lastPriceDollars))
        ? Number(top.lastPriceDollars)
        : null,
  };
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
  const trades = Array.isArray(body?.trades)
    ? body.trades
    : Array.isArray(body?.market_trades)
      ? body.market_trades
      : Array.isArray(body)
        ? body
        : [];
  return trades.filter((row: unknown) => row && typeof row === "object") as Record<
    string,
    unknown
  >[];
}

/**
 * Premium hero right column: high-volume Kalshi market + Liveline trades with
 * slow polling. Pauses off-screen / hidden tab, and freezes after demo interaction.
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
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickerRef = useRef("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [market, setMarket] = useState<FeaturedMarket | null>(null);
  const [trades, setTrades] = useState<Record<string, unknown>[]>([]);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const [demoFrozen, setDemoFrozen] = useState(false);

  const pollingActive = inView && tabVisible && !demoFrozen;

  const clearPollTimer = useCallback(() => {
    if (pollTimerRef.current != null) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const pullTrades = useCallback(
    async (ticker: string, limit: number, signal: AbortSignal) => {
      const batch = await fetchTrades(ticker, limit, signal);
      setTrades((prev) => mergeTrades(prev, batch));
    },
    [],
  );

  const bootstrap = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError(null);

    try {
      const featured = await fetchFeaturedMarket(ac.signal);
      if (!featured?.ticker) {
        throw new Error("No high-volume live market available right now.");
      }
      tickerRef.current = featured.ticker;
      setMarket(featured);
      await pullTrades(featured.ticker, SEED_TRADE_LIMIT, ac.signal);
    } catch (e) {
      if (ac.signal.aborted || (e instanceof DOMException && e.name === "AbortError")) {
        return;
      }
      setError(e instanceof Error ? e.message : "Could not load live trades.");
      setMarket(null);
      setTrades([]);
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, [pullTrades]);

  // Bootstrap once on mount
  useEffect(() => {
    void bootstrap();
    return () => {
      abortRef.current?.abort();
      clearPollTimer();
    };
  }, [bootstrap, clearPollTimer]);

  // Visibility of this chart
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

  // Tab visibility
  useEffect(() => {
    const onVis = () => setTabVisible(document.visibilityState === "visible");
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Freeze once the live demo is interacted with
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
      if (cancelled || !tickerRef.current) return;
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        await pullTrades(tickerRef.current, POLL_TRADE_LIMIT, ac.signal);
      } catch {
        // Keep showing last good seed; next tick may recover.
      }
      if (cancelled) return;
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
  }, [pollingActive, loading, pollMs, pullTrades, clearPollTimer, market?.ticker]);

  const series = useMemo(() => {
    if (!market?.ticker || !trades.length) return [];
    const token = defaultSeriesColorToken(0);
    return [
      {
        id: market.ticker,
        label: market.subtitle || market.title || market.ticker,
        color: resolveDemoChartColor(token),
        colorToken: token,
        trades,
      },
    ];
  }, [market, trades]);

  const volLabel = formatVolume(market?.volume24h);
  const priceLabel = formatLastPrice(market?.lastPriceDollars);
  const eyebrow =
    market?.title ||
    copy?.eyebrow ||
    "Live trades · high-volume Kalshi market";
  const metaBits = [
    market?.ticker,
    priceLabel ? `Last ${priceLabel}` : null,
    volLabel ? `24h vol ${volLabel}` : null,
    pollingActive ? "Live" : demoFrozen ? "Paused" : "Paused",
  ].filter(Boolean);

  return (
    <div
      ref={rootRef}
      className={cn("w-full overflow-hidden rounded-xl bg-card/40 text-left", className)}
    >
      <div className="mb-3 flex items-start justify-between gap-3 px-4 pt-4 sm:mb-4 sm:px-5 sm:pt-5">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex size-2 shrink-0 rounded-full",
                pollingActive
                  ? "animate-pulse bg-emerald-500"
                  : "bg-muted-foreground/50",
              )}
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
        <div className={cn("w-full", HUB_HERO_CHART_EMBED_HEIGHT)}>
          <HubKalshiLiveDemoTradesLiveline
            series={series}
            compact
            paused={!pollingActive}
            className="h-full min-h-0"
          />
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

      {copy?.caption || copy?.captionLink || copy?.eyebrow ? (
        <div className="px-4 pb-4 pt-3 text-left sm:px-5 sm:pb-5 sm:pt-4">
          {copy?.eyebrow && !market?.title ? (
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {copy.eyebrow}
            </p>
          ) : (
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Live YES trade prints via Lychee
            </p>
          )}
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
          ) : null}
        </div>
      ) : (
        <div className="px-4 pb-4 pt-3 text-left sm:px-5 sm:pb-5 sm:pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Live YES trade prints via Lychee
          </p>
          <p className="mt-2 text-xs text-muted-foreground/75">
            High-volume Kalshi market updating from live trades — no code, no API
            key.
          </p>
        </div>
      )}
    </div>
  );
}
