"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { HubKalshiLiveDemoTradesLiveline } from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveDemoTradesLiveline";
import {
  HUB_HERO_CHART_EMBED_HEIGHT,
  HubHeroChartEmbedSkeleton,
} from "@/components/publicEmbed/ChartEmbedSkeleton";
import { openPolymarketLastTradeSocket } from "@/lib/polymarketLive/openPolymarketMarketSocket";
import { normalizePolymarketRealtimeHistoryRows } from "@/lib/polymarketLive/polymarketRealtimeSeed";
import { cn } from "@/lib/utils";

const MARKET_DWELL_MS = 2 * 60_000;
const PREFETCH_AFTER_MS = 40_000;
const FEED_QUIET_MS = 90_000;
const FEATURED_POOL_LIMIT = 8;
const MAX_POINTS_PER_OUTCOME = 240;

const YES_COLOR = "#14b8a6";
const NO_COLOR = "#f43f5e";

type FeaturedOutcome = {
  tokenId: string;
  outcome: string;
  lastPrice: number | null;
};

type FeaturedMarket = {
  id: string;
  slug?: string;
  conditionId: string;
  title: string;
  volume24h?: number | null;
  featured?: boolean;
  outcomes: FeaturedOutcome[];
};

type PrefetchedMarket = {
  market: FeaturedMarket;
  tradesByToken: Record<string, Record<string, unknown>[]>;
};

type HeroLiveChartCopy = {
  eyebrow?: string;
  caption?: string;
  captionLink?: { label: string; href: string };
  freezeOnAnchorId?: string;
};

type HubPolymarketLiveHeroTradesChartProps = {
  copy?: HeroLiveChartCopy;
  className?: string;
};

function marketKey(market: FeaturedMarket): string {
  return String(market.conditionId || market.id || market.slug || "").trim();
}

function tradeKey(row: Record<string, unknown>): string {
  const id = row.transaction_hash ?? row.hash ?? row.id;
  if (id != null && String(id).trim()) return `id:${String(id)}`;
  return `t:${String(row.time || row.timestamp || "")}|p:${String(row.price ?? row.yes_price_dollars ?? "")}|a:${String(row.asset_id || "")}`;
}

function parseTradeTimeMs(row: Record<string, unknown>): number {
  const raw = row.created_time ?? row.time ?? row.timestamp ?? row.ts;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw < 1e12 ? raw * 1000 : raw;
  }
  const asNum = Number(raw);
  if (Number.isFinite(asNum) && asNum > 0) {
    return asNum < 1e12 ? asNum * 1000 : asNum;
  }
  const ms = Date.parse(String(raw || ""));
  return Number.isFinite(ms) ? ms : 0;
}

function toLivelineRow(
  row: Record<string, unknown>,
  tokenId: string,
): Record<string, unknown> | null {
  const priceRaw = row.yes_price_dollars ?? row.price;
  const price = Number(priceRaw);
  if (!Number.isFinite(price)) return null;
  const ms = parseTradeTimeMs(row);
  const time = ms > 0 ? new Date(ms).toISOString() : String(row.time || "");
  if (!time) return null;
  return {
    asset_id: tokenId,
    created_time: time,
    time,
    timestamp: String(ms || Date.parse(time) || Date.now()),
    yes_price_dollars: price,
    transaction_hash: row.transaction_hash ?? row.hash ?? "",
  };
}

function mergeTrades(
  prev: Record<string, unknown>[],
  next: Record<string, unknown>[],
  tokenId: string,
  max = MAX_POINTS_PER_OUTCOME,
): Record<string, unknown>[] {
  const map = new Map<string, Record<string, unknown>>();
  for (const raw of [...prev, ...next]) {
    const row = toLivelineRow(raw, tokenId);
    if (!row) continue;
    map.set(tradeKey(row), row);
  }
  return [...map.values()]
    .sort((a, b) => parseTradeTimeMs(a) - parseTradeTimeMs(b))
    .slice(-max);
}

function lastPriceFromTrades(trades: Record<string, unknown>[]): number | null {
  for (let i = trades.length - 1; i >= 0; i -= 1) {
    const dollars = Number(trades[i]?.yes_price_dollars);
    if (Number.isFinite(dollars)) return dollars;
  }
  return null;
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

function normalizeFeatured(raw: unknown): FeaturedMarket | null {
  if (!raw || typeof raw !== "object") return null;
  const top = raw as Record<string, unknown>;
  const outcomesRaw = Array.isArray(top.outcomes) ? top.outcomes : [];
  const outcomes: FeaturedOutcome[] = [];
  for (const item of outcomesRaw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const tokenId = String(row.tokenId || "").trim();
    if (!tokenId) continue;
    outcomes.push({
      tokenId,
      outcome: String(row.outcome || "").trim() || `Outcome ${outcomes.length + 1}`,
      lastPrice:
        row.lastPrice != null && Number.isFinite(Number(row.lastPrice))
          ? Number(row.lastPrice)
          : null,
    });
  }
  if (outcomes.length < 2) return null;
  const id = String(top.id || top.conditionId || top.slug || "").trim();
  const title = String(top.title || "").trim() || id;
  if (!id || !title) return null;
  return {
    id,
    slug: String(top.slug || "").trim() || undefined,
    conditionId: String(top.conditionId || id).trim(),
    title,
    volume24h:
      top.volume24h != null && Number.isFinite(Number(top.volume24h))
        ? Number(top.volume24h)
        : null,
    featured: top.featured === true,
    outcomes: outcomes.slice(0, 2),
  };
}

async function fetchFeaturedPool(signal: AbortSignal): Promise<FeaturedMarket[]> {
  const res = await fetch(
    `/api/integrations/polymarket-live/markets/featured?limit=${FEATURED_POOL_LIMIT}`,
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
    if (!m) continue;
    const key = marketKey(m);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  return out;
}

async function fetchHistoryByToken(
  tokenIds: string[],
  signal: AbortSignal,
): Promise<Record<string, Record<string, unknown>[]>> {
  const res = await fetch("/api/integrations/polymarket?query=getBatchPricesHistory", {
    method: "POST",
    credentials: "same-origin",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ markets: tokenIds, interval: "1h", fidelity: 1 }),
    signal,
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof payload?.message === "string"
        ? payload.message
        : typeof payload?.error === "string"
          ? payload.error
          : "Failed to load price history",
    );
  }
  const rows = normalizePolymarketRealtimeHistoryRows(payload);
  /** @type {Record<string, Record<string, unknown>[]>} */
  const byToken: Record<string, Record<string, unknown>[]> = {};
  for (const tokenId of tokenIds) byToken[tokenId] = [];
  for (const row of rows) {
    const tokenId = String(row.asset_id || "");
    if (!byToken[tokenId]) byToken[tokenId] = [];
    const mapped = toLivelineRow(row, tokenId);
    if (mapped) byToken[tokenId].push(mapped);
  }
  for (const tokenId of Object.keys(byToken)) {
    byToken[tokenId] = mergeTrades([], byToken[tokenId] || [], tokenId);
  }
  return byToken;
}

function pickNextMarket(
  pool: FeaturedMarket[],
  currentKey: string,
  preferIndex: number,
): FeaturedMarket | null {
  if (!pool.length) return null;
  for (let offset = 0; offset < pool.length; offset += 1) {
    const m = pool[(preferIndex + offset) % pool.length]!;
    if (marketKey(m) !== currentKey) return m;
  }
  return pool[0] || null;
}

function outcomeColor(label: string, index: number): string {
  const lower = label.toLowerCase();
  if (lower === "yes") return YES_COLOR;
  if (lower === "no") return NO_COLOR;
  return index === 0 ? YES_COLOR : NO_COLOR;
}

/**
 * Premium hero right column: high-volume Polymarket market with YES + NO
 * Liveline series, seeded from REST history and updated over the CLOB socket.
 */
export function HubPolymarketLiveHeroTradesChart({
  copy,
  className,
}: HubPolymarketLiveHeroTradesChartProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const prefetchAbortRef = useRef<AbortController | null>(null);
  const dwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketStopRef = useRef<(() => void) | null>(null);
  const marketKeyRef = useRef("");
  const poolRef = useRef<FeaturedMarket[]>([]);
  const poolCursorRef = useRef(0);
  const prefetchedRef = useRef<PrefetchedMarket | null>(null);
  const swapWhenReadyRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [market, setMarket] = useState<FeaturedMarket | null>(null);
  const [tradesByToken, setTradesByToken] = useState<
    Record<string, Record<string, unknown>[]>
  >({});
  const [chartKey, setChartKey] = useState(0);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const [demoFrozen, setDemoFrozen] = useState(false);
  const [socketLive, setSocketLive] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const pollingActive = inView && tabVisible && !demoFrozen;

  const clearTimer = useCallback(
    (ref: { current: ReturnType<typeof setTimeout> | null }) => {
      if (ref.current != null) {
        clearTimeout(ref.current);
        ref.current = null;
      }
    },
    [],
  );

  const stopSocket = useCallback(() => {
    socketStopRef.current?.();
    socketStopRef.current = null;
    setSocketLive(false);
  }, []);

  const applyMarket = useCallback((next: PrefetchedMarket) => {
    marketKeyRef.current = marketKey(next.market);
    prefetchedRef.current = null;
    swapWhenReadyRef.current = false;
    setMarket(next.market);
    setTradesByToken(next.tradesByToken);
    setChartKey((k) => k + 1);
    setError(null);
    setLoading(false);
  }, []);

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
        marketKeyRef.current,
        poolCursorRef.current + 1,
      );
      if (!nextMarket || ac.signal.aborted) return;
      const tokenIds = nextMarket.outcomes.map((o) => o.tokenId);
      const trades = await fetchHistoryByToken(tokenIds, ac.signal);
      if (ac.signal.aborted) return;
      const prepared: PrefetchedMarket = { market: nextMarket, tradesByToken: trades };
      prefetchedRef.current = prepared;
      const idx = pool.findIndex((m) => marketKey(m) === marketKey(nextMarket));
      poolCursorRef.current = idx >= 0 ? idx : poolCursorRef.current + 1;
      if (swapWhenReadyRef.current) applyMarket(prepared);
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
      if (ready && marketKey(ready.market) !== marketKeyRef.current) {
        applyMarket(ready);
        return;
      }
      swapWhenReadyRef.current = true;
      void prefetchNext();
    }, MARKET_DWELL_MS);
  }, [applyMarket, clearTimer, demoFrozen, prefetchNext]);

  useEffect(() => {
    if (!market || loading || demoFrozen) return undefined;
    scheduleDwellAndPrefetch();
    return () => {
      clearTimer(dwellTimerRef);
      clearTimer(prefetchTimerRef);
    };
  }, [
    market,
    chartKey,
    loading,
    demoFrozen,
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
      if (!featured) {
        throw new Error("No high-volume live market available right now.");
      }
      poolCursorRef.current = 0;
      const trades = await fetchHistoryByToken(
        featured.outcomes.map((o) => o.tokenId),
        ac.signal,
      );
      if (ac.signal.aborted) return;
      applyMarket({ market: featured, tradesByToken: trades });
    } catch (e) {
      if (
        ac.signal.aborted ||
        (e instanceof DOMException && e.name === "AbortError")
      ) {
        return;
      }
      setError(e instanceof Error ? e.message : "Could not load live Polymarket prices.");
      setMarket(null);
      setTradesByToken({});
      setLoading(false);
    }
  }, [applyMarket]);

  useEffect(() => {
    void bootstrap();
    return () => {
      abortRef.current?.abort();
      prefetchAbortRef.current?.abort();
      stopSocket();
      clearTimer(dwellTimerRef);
      clearTimer(prefetchTimerRef);
    };
  }, [bootstrap, clearTimer, stopSocket]);

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
    const freezeId = copy?.freezeOnAnchorId || "find-polymarket-markets";
    const demo = document.getElementById(freezeId);
    if (!demo) return undefined;
    const freeze = () => setDemoFrozen(true);
    demo.addEventListener("pointerdown", freeze, { once: true, capture: true });
    demo.addEventListener("focusin", freeze, { once: true, capture: true });
    return () => {
      demo.removeEventListener("pointerdown", freeze, true);
      demo.removeEventListener("focusin", freeze, true);
    };
  }, [copy?.freezeOnAnchorId]);

  useEffect(() => {
    stopSocket();
    if (!pollingActive || !market || loading) return undefined;
    const assetIds = market.outcomes.map((o) => o.tokenId);
    const activeKey = marketKey(market);
    socketStopRef.current = openPolymarketLastTradeSocket({
      assetIds,
      onStatus: (status) => {
        setSocketLive(status === "open");
      },
      onTrade: (row) => {
        if (marketKeyRef.current !== activeKey) return;
        const mapped = toLivelineRow(
          {
            ...row,
            yes_price_dollars: row.price,
            created_time: row.time,
          },
          row.asset_id,
        );
        if (!mapped) return;
        setTradesByToken((prev) => ({
          ...prev,
          [row.asset_id]: mergeTrades(prev[row.asset_id] || [], [mapped], row.asset_id),
        }));
      },
    });
    return () => {
      stopSocket();
    };
  }, [pollingActive, loading, market, stopSocket, chartKey]);

  useEffect(() => {
    if (!pollingActive) return undefined;
    const id = setInterval(() => setNowTick(Date.now()), 5_000);
    return () => clearInterval(id);
  }, [pollingActive]);

  const lastTradeMs = useMemo(() => {
    let newest = 0;
    for (const trades of Object.values(tradesByToken)) {
      for (const row of trades) {
        const ms = parseTradeTimeMs(row);
        if (ms > newest) newest = ms;
      }
    }
    return newest;
  }, [tradesByToken]);

  const feedQuiet = lastTradeMs > 0 && nowTick - lastTradeMs > FEED_QUIET_MS;
  const livelinePaused = !pollingActive || feedQuiet;

  const series = useMemo(() => {
    if (!market) return [];
    return market.outcomes.map((outcome, index) => ({
      id: outcome.tokenId,
      label: outcome.outcome,
      color: outcomeColor(outcome.outcome, index),
      trades: tradesByToken[outcome.tokenId] || [],
    })).filter((item) => item.trades.length > 0);
  }, [market, tradesByToken]);

  const yes = market?.outcomes[0];
  const no = market?.outcomes[1];
  const yesLast =
    lastPriceFromTrades(tradesByToken[yes?.tokenId || ""] || []) ??
    yes?.lastPrice ??
    null;
  const noLast =
    lastPriceFromTrades(tradesByToken[no?.tokenId || ""] || []) ??
    no?.lastPrice ??
    null;
  const volLabel = formatVolume(market?.volume24h);
  const eyebrow = market?.title || copy?.eyebrow || "Live Polymarket market";
  const metaBits = [
    yesLast != null ? `${yes?.outcome || "Yes"} ${formatLastPrice(yesLast)}` : null,
    noLast != null ? `${no?.outcome || "No"} ${formatLastPrice(noLast)}` : null,
    volLabel ? `24h vol ${volLabel}` : null,
    market?.featured ? "Featured" : null,
    feedQuiet ? "Holding last print" : pollingActive && socketLive ? "Live" : "Paused",
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
                pollingActive && socketLive ? "animate-pulse" : "opacity-50",
              )}
              style={{ backgroundColor: YES_COLOR }}
              aria-hidden
            />
            <p className="text-balance text-lg font-semibold leading-tight text-foreground sm:text-xl">
              {eyebrow}
            </p>
          </div>
          {metaBits.length ? (
            <p className="text-sm text-muted-foreground">{metaBits.join(" · ")}</p>
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
            persistHistory
            paused={livelinePaused}
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
          Connecting to live market activity…
        </div>
      ) : null}

      <div className="px-4 pb-4 pt-3 text-left sm:px-5 sm:pb-5 sm:pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Live YES and NO prices via Lychee
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
            Highest-volume Polymarket markets rotating live — no code, no data pipeline.
          </p>
        )}
      </div>
    </div>
  );
}
