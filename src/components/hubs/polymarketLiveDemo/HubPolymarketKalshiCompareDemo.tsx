"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, Search, Undo2 } from "lucide-react";

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
import {
  formatPolymarketVolume,
  isPolymarketPublicSearchEligible,
} from "@/lib/polymarketLive/polymarketPublicSearch";
import { cn } from "@/lib/utils";
import {
  COMPARE_FEATURED_LIMIT,
  CompareFeaturedSkeletonList,
} from "@/components/hubs/polymarketLiveDemo/HubPolymarketKalshiCompareDemoSkeleton";

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

type CompareKalshiFeaturedCard = {
  ticker: string;
  title: string;
  lastPriceDollars: number | null;
  volume24h: number | null;
  imageUrl?: string;
  featured?: boolean;
  status?: string;
  tags?: string[];
  eventTitle?: string;
};

type PinnedKalshiFeatured = {
  ticker: string;
  title: string;
};

function compareFeaturedKey(market: CompareFeaturedCard) {
  return String(market.conditionId || market.id || market.slug || "").trim();
}

function formatCompareFeaturedPrice(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Math.round(value * 100)}¢`;
}

function formatCompareCompactNumber(value: number | null | undefined) {
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

function formatCompareKalshiVolume(value: number | null | undefined) {
  const formatted = formatCompareCompactNumber(value);
  return formatted === "—" ? "—" : `$${formatted}`;
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

function normalizeCompareKalshiFeaturedCard(raw: unknown): CompareKalshiFeaturedCard | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const ticker = String(row.ticker || "").trim().toUpperCase();
  const title = String(row.title || row.subtitle || ticker).trim() || ticker;
  if (!ticker || !title) return null;
  return {
    ticker,
    title,
    lastPriceDollars:
      row.lastPriceDollars != null && Number.isFinite(Number(row.lastPriceDollars))
        ? Number(row.lastPriceDollars)
        : null,
    volume24h:
      row.volume24h != null && Number.isFinite(Number(row.volume24h))
        ? Number(row.volume24h)
        : null,
    imageUrl: String(row.imageUrl || "").trim() || undefined,
    featured: row.featured === true,
    status: String(row.status || "").trim() || undefined,
    eventTitle: String(row.eventTitle || "").trim() || undefined,
    tags: Array.isArray(row.tags)
      ? row.tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 4)
      : [],
  };
}

type IntervalId = "15m" | "1h" | "6h" | "1d" | "all";

/** Kalshi brand-forward green for the comparison line. */
const KALSHI_LINE_GREEN = "#22c55e";
const INTERVALS: { id: IntervalId; label: "15m" | "1h" | "6h" | "1d" | "All"; ms: number | null }[] = [
  { id: "15m", label: "15m", ms: 15 * 60 * 1000 },
  { id: "1h", label: "1h", ms: 60 * 60 * 1000 },
  { id: "6h", label: "6h", ms: 6 * 60 * 60 * 1000 },
  { id: "1d", label: "1d", ms: 24 * 60 * 60 * 1000 },
  { id: "all", label: "All", ms: null },
];

function CompareFieldSkeleton({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-block h-3 animate-pulse rounded bg-muted/70 align-middle", className)}
      aria-hidden
    />
  );
}

function ComparePendingValue({
  pending,
  children,
  skeletonClassName = "w-20",
}: {
  pending: boolean;
  children: ReactNode;
  skeletonClassName?: string;
}) {
  if (pending) return <CompareFieldSkeleton className={skeletonClassName} />;
  return children;
}

function CompareChartSkeleton({ animate = true }: { animate?: boolean }) {
  const pulse = animate ? "animate-pulse" : "";
  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3 px-3 py-3" aria-hidden>
      <div className="flex min-h-0 flex-1 gap-3">
        <div className="flex w-10 shrink-0 flex-col justify-between py-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={cn("h-2.5 w-full rounded bg-muted/70", pulse)} />
          ))}
        </div>
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-md border border-border/40 bg-muted/15">
          <div className="absolute inset-x-0 top-[20%] h-px bg-border/40" />
          <div className="absolute inset-x-0 top-[40%] h-px bg-border/40" />
          <div className="absolute inset-x-0 top-[60%] h-px bg-border/40" />
          <div className="absolute inset-x-0 top-[80%] h-px bg-border/40" />
          <div className={cn("absolute inset-[18%_8%_22%_6%] rounded-full bg-muted/50", pulse)} />
          <div className={cn("absolute inset-[42%_12%_28%_10%] rounded-full bg-muted/40", pulse)} />
        </div>
      </div>
      <div className="flex gap-2 pl-12">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={cn("h-2.5 flex-1 rounded bg-muted/60", pulse)} />
        ))}
      </div>
    </div>
  );
}

function CompareChartBody({
  pending,
  hasData,
  waitingMessage,
  children,
}: {
  pending: boolean;
  hasData: boolean;
  waitingMessage?: string;
  children: ReactNode;
}) {
  if (hasData) return children;
  if (pending) return <CompareChartSkeleton />;
  return (
    <div className="relative h-full min-h-0">
      <CompareChartSkeleton animate={false} />
      {waitingMessage ? (
        <p className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-muted-foreground">
          {waitingMessage}
        </p>
      ) : null}
    </div>
  );
}

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

function isOpaqueHttpErrorMessage(raw: string): boolean {
  const msg = String(raw || "")
    .trim()
    .toLowerCase();
  return (
    !msg ||
    msg.includes("bad request") ||
    msg.includes("bad_request") ||
    msg.includes("not found") ||
    msg.includes("not_found") ||
    msg.includes("internal server error") ||
    msg.includes("invalid_parameters") ||
    msg.includes("field validation") ||
    msg.includes("not valid")
  );
}

function taggedError(message: string, code: string, status?: number): Error {
  const err = new Error(message);
  Object.assign(err, { code, status });
  return err;
}

function humanizeMatchError(raw: string, side: "kalshi" | "polymarket" = "kalshi"): string {
  const other = side === "kalshi" ? "Kalshi" : "Polymarket";
  const origin = side === "kalshi" ? "Polymarket" : "Kalshi";
  if (/too many requests|rate limit/i.test(raw)) {
    return `${other} search is rate-limited. Wait a moment, then try again or search ${other} manually.`;
  }
  if (isOpaqueHttpErrorMessage(raw) || /failed to fetch|network|search failed/i.test(raw)) {
    return `We couldn’t search ${other} for a matching market. Search ${other} manually, or try another ${origin} market.`;
  }
  return raw;
}

function humanizeSeriesError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err || "");
  const extra = err && typeof err === "object" ? (err as { code?: string; status?: number }) : {};
  const code = String(extra.code || "");
  const status = Number(extra.status);
  if (/too many requests|rate limit/i.test(raw)) {
    return "Kalshi data is rate-limited. Wait a moment, then try again.";
  }
  if (code === "polymarket_history" || /this polymarket market has no yes token/i.test(raw)) {
    if (/no YES token/i.test(raw)) return raw;
    return "This Polymarket market does not exist (or could not be loaded). Pick another Polymarket market.";
  }
  if (
    isOpaqueHttpErrorMessage(raw) ||
    status === 400 ||
    status === 404 ||
    /not found|not_found|does not exist|no market/i.test(raw)
  ) {
    return "This Kalshi market does not exist (or is no longer listed). Search Kalshi manually to pick another.";
  }
  return raw || "Failed to load comparison series";
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
    throw taggedError(
      typeof payload?.error === "string" ? payload.error : "Failed to load Polymarket history",
      "polymarket_history",
      res.status,
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
    throw taggedError(
      typeof body?.error === "string" ? body.error : "Failed to load Kalshi trades",
      "kalshi_trades",
      res.status,
    );
  }
  return (Array.isArray(body?.trades) ? body.trades : []).filter(
    (row: unknown) => row && typeof row === "object",
  ) as Record<string, unknown>[];
}

async function fetchPolymarketMatchesForKalshi(
  query: string,
  signal: AbortSignal,
): Promise<HubPolymarketLiveDemoMarket[]> {
  const params = new URLSearchParams({
    query: "metadataSuggestions",
    q: query,
    limit_per_type: "12",
    search_tags: "true",
    search_profiles: "false",
    keep_closed_markets: "0",
  });
  const res = await fetch(`/api/integrations/polymarket?${params.toString()}`, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.message === "string" ? data.message : "Polymarket search failed",
    );
  }
  const list = Array.isArray(data?.suggestions) ? data.suggestions : [];
  const markets: HubPolymarketLiveDemoMarket[] = [];
  const seen = new Set<string>();
  const push = (market: HubPolymarketLiveDemoMarket | null | undefined) => {
    if (!market) return;
    const key = polymarketRealtimeMarketKey(market);
    if (!key || seen.has(key)) return;
    seen.add(key);
    markets.push(market);
  };
  for (const row of list) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    const entity = String(item.entity || "");
    const closed = item.closed === true || item.closed === "true";
    if (entity === "market" && !closed) {
      push(polymarketRealtimeMarketFromSuggestion(item) as HubPolymarketLiveDemoMarket | null);
    } else if (entity === "event") {
      for (const nested of polymarketRealtimeMarketsFromEventSuggestion(
        item,
      ) as HubPolymarketLiveDemoMarket[]) {
        push(nested);
      }
    }
  }
  return markets.slice(0, 6);
}


function CompareFeaturedTags({
  tags,
  featured,
}: {
  tags?: string[];
  featured?: boolean;
}) {
  const list = Array.isArray(tags) ? tags.filter(Boolean).slice(0, 2) : [];
  return (
    <div className="flex min-w-0 flex-nowrap items-center gap-1.5">
      {featured ? (
        <span className="inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-medium leading-none text-fuchsia-500 ring-1 ring-fuchsia-500">
          Featured
        </span>
      ) : null}
      {list.map((tag) => (
        <span
          key={tag}
          className="inline-flex shrink-0 items-center rounded bg-muted/80 px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground ring-1 ring-current"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

function CompareMarketCard({
  imageUrl,
  fallback,
  title,
  tags,
  featured,
  priceLabel,
  price,
  volume,
  onClick,
  disabled,
}: {
  imageUrl?: string;
  fallback: string;
  title: string;
  tags?: string[];
  featured?: boolean;
  priceLabel: string;
  price: string;
  volume: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-[4.75rem] w-full items-center gap-2 overflow-hidden rounded-md border border-border/70 bg-background p-1.5 text-left shadow-sm transition-colors hover:border-border hover:bg-muted/30 disabled:opacity-60"
    >
      <div className="relative size-11 shrink-0 overflow-hidden rounded-md border border-border/60 bg-black">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="size-full object-cover" loading="lazy" />
        ) : (
          <div className="flex size-full items-center justify-center text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
            {fallback}
          </div>
        )}
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-1">
        <p className="line-clamp-2 h-[1.75rem] text-[11px] font-medium leading-[0.875rem] text-foreground">
          {title}
        </p>
        <CompareFeaturedTags tags={tags} featured={featured} />
      </div>
      <div className="flex h-full shrink-0 flex-col items-end justify-center gap-0.5">
        <span className="text-[10px] leading-none text-muted-foreground">
          {priceLabel}{" "}
          <span className="text-base font-semibold tabular-nums leading-none text-foreground">
            {price}
          </span>
        </span>
        <span className="text-[10px] leading-none text-muted-foreground">
          vol{" "}
          <span className="text-sm font-semibold tabular-nums leading-none text-foreground">
            {volume}
          </span>
        </span>
      </div>
    </button>
  );
}

function CompareFeaturedColumn({
  label,
  loading,
  refreshing,
  error,
  hasItems,
  onRefresh,
  children,
}: {
  label: string;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  hasItems: boolean;
  onRefresh: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-muted/20">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-muted-foreground">
            <span className="size-1.5 animate-pulse rounded-full bg-green-500" aria-hidden />
            Live
          </span>
          {loading ? (
            <span
              className="inline-flex size-6 items-center justify-center text-muted-foreground"
              aria-label={`Loading ${label} markets`}
            >
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            </span>
          ) : (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading || refreshing}
              className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              aria-label={`Show different ${label} markets`}
              title={`Show different ${label} markets`}
            >
              <RefreshCw
                className={cn("size-3.5", refreshing && "animate-spin")}
                aria-hidden
              />
            </button>
          )}
        </div>
      </div>
      {loading ? (
        <CompareFeaturedSkeletonList />
      ) : error ? (
        <p className="px-3 py-4 text-sm text-destructive">{error}</p>
      ) : !hasItems ? (
        <p className="px-3 py-8 text-center text-sm text-muted-foreground">
          No featured markets available right now.
        </p>
      ) : (
        children
      )}
    </div>
  );
}

function ComparePolymarketMarketSearch({
  onSelectKalshiFeatured,
  kalshiPickLoading,
}: {
  onSelectKalshiFeatured?: (card: CompareKalshiFeaturedCard) => void;
  kalshiPickLoading?: boolean;
}) {
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
  const [kalshiFeatured, setKalshiFeatured] = useState<CompareKalshiFeaturedCard[]>([]);
  const [kalshiFeaturedLoading, setKalshiFeaturedLoading] = useState(true);
  const [kalshiFeaturedRefreshing, setKalshiFeaturedRefreshing] = useState(false);
  const [kalshiFeaturedError, setKalshiFeaturedError] = useState<string | null>(null);

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

  const loadKalshiFeatured = useCallback(async (opts?: { excludeTickers?: string[] }) => {
    const exclude = opts?.excludeTickers || [];
    const refreshing = exclude.length > 0;
    if (refreshing) setKalshiFeaturedRefreshing(true);
    else setKalshiFeaturedLoading(true);
    setKalshiFeaturedError(null);
    try {
      const params = new URLSearchParams({
        limit: String(COMPARE_FEATURED_LIMIT),
        source: "discovery",
        v: "3",
      });
      if (exclude.length) params.set("exclude", exclude.join(","));
      const res = await fetch(
        `/api/integrations/kalshi-live/markets/featured?${params.toString()}`,
        { credentials: "same-origin", headers: { Accept: "application/json" } },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof body?.error === "string" ? body.error : "Failed to load Kalshi markets",
        );
      }
      const parsed = (Array.isArray(body?.markets) ? body.markets : [])
        .map(normalizeCompareKalshiFeaturedCard)
        .filter(Boolean) as CompareKalshiFeaturedCard[];
      setKalshiFeatured(parsed.slice(0, COMPARE_FEATURED_LIMIT));
    } catch (e) {
      if (!refreshing) {
        setKalshiFeatured([]);
        setKalshiFeaturedError(
          e instanceof Error ? e.message : "Failed to load Kalshi markets",
        );
      }
    } finally {
      setKalshiFeaturedLoading(false);
      setKalshiFeaturedRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadFeatured();
    void loadKalshiFeatured();
  }, [loadFeatured, loadKalshiFeatured]);

  const applyMarket = useCallback(
    (
      market: HubPolymarketLiveDemoMarket,
      source: "compare_search" | "compare_featured" | "compare_kalshi_featured",
    ) => {
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

  const selectKalshiFeatured = useCallback(
    (card: CompareKalshiFeaturedCard) => {
      onSelectKalshiFeatured?.(card);
    },
    [onSelectKalshiFeatured],
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
        <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2">
          <CompareFeaturedColumn
            label="Polymarket"
            loading={featuredLoading}
            refreshing={featuredRefreshing}
            error={featuredError}
            hasItems={featured.length > 0}
            onRefresh={() =>
              void loadFeatured({
                excludeIds: featured.map((item) => compareFeaturedKey(item)),
              })
            }
          >
            <ul className="grid auto-rows-fr gap-1.5 p-2">
              {featured.map((market) => {
                const yes = market.outcomes[0];
                return (
                  <li key={compareFeaturedKey(market)} className="h-full">
                    <CompareMarketCard
                      imageUrl={market.imageUrl}
                      fallback="PM"
                      title={market.title}
                      tags={market.tags}
                      featured={market.featured}
                      priceLabel={yes?.outcome || "Yes"}
                      price={formatCompareFeaturedPrice(yes?.lastPrice)}
                      volume={formatPolymarketVolume(market.volume24h) || "—"}
                      onClick={() => selectFeatured(market)}
                    />
                  </li>
                );
              })}
            </ul>
          </CompareFeaturedColumn>

          <CompareFeaturedColumn
            label="Kalshi"
            loading={kalshiFeaturedLoading}
            refreshing={kalshiFeaturedRefreshing}
            error={kalshiFeaturedError}
            hasItems={kalshiFeatured.length > 0}
            onRefresh={() =>
              void loadKalshiFeatured({
                excludeTickers: kalshiFeatured.map((item) => item.ticker),
              })
            }
          >
            <ul className="grid auto-rows-fr gap-1.5 p-2">
              {kalshiFeatured.map((market) => (
                <li key={market.ticker} className="h-full">
                  <CompareMarketCard
                    imageUrl={market.imageUrl}
                    fallback="KL"
                    title={market.title}
                    tags={market.tags}
                    featured={market.featured}
                    priceLabel="Yes"
                    price={formatCompareFeaturedPrice(market.lastPriceDollars)}
                    volume={formatCompareKalshiVolume(market.volume24h)}
                    disabled={kalshiPickLoading}
                    onClick={() => selectKalshiFeatured(market)}
                  />
                </li>
              ))}
            </ul>
          </CompareFeaturedColumn>
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
  const setMarkets = selection?.setMarkets;
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
  const [kalshiAnchor, setKalshiAnchor] = useState<PinnedKalshiFeatured | null>(null);
  const [polyCandidates, setPolyCandidates] = useState<HubPolymarketLiveDemoMarket[]>([]);

  const [kalshiMarket, setKalshiMarket] = useState<Record<string, unknown> | null>(null);
  const [polyPoints, setPolyPoints] = useState<Record<string, unknown>[]>([]);
  const [kalshiPoints, setKalshiPoints] = useState<Record<string, unknown>[]>([]);
  const [polyLoading, setPolyLoading] = useState(false);
  const [kalshiLoading, setKalshiLoading] = useState(false);
  const [seriesError, setSeriesError] = useState<string | null>(null);
  const [interval, setIntervalId] = useState<IntervalId>("1d");
  const [livePaused, setLivePaused] = useState(false);

  const polySocketStop = useRef<(() => void) | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const matchAbort = useRef<AbortController | null>(null);
  const polyHistAbort = useRef<AbortController | null>(null);
  const kalshiSeriesAbort = useRef<AbortController | null>(null);

  const startOver = useCallback(() => {
    matchAbort.current?.abort();
    polyHistAbort.current?.abort();
    kalshiSeriesAbort.current?.abort();
    polySocketStop.current?.();
    polySocketStop.current = null;
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
    setMatchLoading(false);
    setMatchError(null);
    setCandidates([]);
    setPolyCandidates([]);
    setSelectedTicker("");
    setEmptyMessage(null);
    setManualOpen(false);
    setManualTickers("");
    setKalshiMarket(null);
    setPolyPoints([]);
    setKalshiPoints([]);
    setPolyLoading(false);
    setKalshiLoading(false);
    setSeriesError(null);
    setKalshiAnchor(null);
    setMarkets?.([]);
  }, [setMarkets]);

  const applyPolyMatch = useCallback(
    (market: HubPolymarketLiveDemoMarket) => {
      if (!setMarkets) return;
      trackPolymarketLiveHubEvent("polymarket_live_market_selected", {
        source: "compare_kalshi_featured",
        title: String(market.title || ""),
        conditionId: String(market.conditionId || market.id || ""),
      });
      setMarkets([market]);
    },
    [setMarkets],
  );

  const startFromKalshi = useCallback(
    (card: CompareKalshiFeaturedCard) => {
      matchAbort.current?.abort();
      const ac = new AbortController();
      matchAbort.current = ac;
      setKalshiAnchor({ ticker: card.ticker, title: card.title });
      setSelectedTicker(card.ticker);
      setCandidates([]);
      setPolyCandidates([]);
      setMatchLoading(true);
      setMatchError(null);
      setEmptyMessage(null);
      setManualOpen(false);
      setSeriesError(null);
      setMarkets?.([]);

      const query = card.title.trim();
      if (!isPolymarketPublicSearchEligible(query)) {
        setMatchLoading(false);
        setEmptyMessage(
          "That Kalshi market does not have a title we can search on Polymarket.",
        );
        setManualOpen(true);
        return;
      }

      trackPolymarketLiveHubEvent("polymarket_kalshi_compare_attempt", {
        query,
        candidateCount: 0,
        hasPreselected: false,
        origin: "kalshi",
      });

      void fetchPolymarketMatchesForKalshi(query, ac.signal)
        .then((matches) => {
          if (ac.signal.aborted) return;
          setPolyCandidates(matches);
          if (!matches.length) {
            setEmptyMessage(
              "Couldn’t find a Polymarket market for that Kalshi contract. Search Polymarket manually, or try another Kalshi market.",
            );
            setManualOpen(true);
            return;
          }
          trackPolymarketLiveHubEvent("polymarket_kalshi_compare_match", {
            ticker: card.ticker,
            auto: matches.length === 1,
            origin: "kalshi",
            candidateCount: matches.length,
          });
          if (matches.length === 1 && matches[0]) applyPolyMatch(matches[0]);
        })
        .catch((err) => {
          if (ac.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) {
            return;
          }
          setMatchError(
            humanizeMatchError(
              err instanceof Error ? err.message : "Polymarket search failed",
              "polymarket",
            ),
          );
          setPolyCandidates([]);
          setManualOpen(true);
        })
        .finally(() => {
          if (!ac.signal.aborted) setMatchLoading(false);
        });
    },
    [applyPolyMatch, setMarkets],
  );

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
      polyHistAbort.current?.abort();
      kalshiSeriesAbort.current?.abort();
      polySocketStop.current?.();
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, []);

  // Match Kalshi only when the user started from a Polymarket market.
  useEffect(() => {
    if (kalshiAnchor) return undefined;
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
    setKalshiPoints([]);
    setManualOpen(false);
    setSeriesError(null);

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
        if (!result.candidates.length) setManualOpen(true);
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
        setMatchError(
          humanizeMatchError(err instanceof Error ? err.message : "Match search failed"),
        );
        setCandidates([]);
        setManualOpen(true);
      })
      .finally(() => {
        if (!ac.signal.aborted) setMatchLoading(false);
      });

    return () => ac.abort();
  }, [inView, kalshiAnchor, polyKey, polyMarket]);

  const selectedCandidate = useMemo(
    () => candidates.find((c) => c.market.marketTicker === selectedTicker) || null,
    [candidates, selectedTicker],
  );

  useEffect(() => {
    if (!polyMarket || !polyKey) {
      setPolyPoints([]);
      setPolyLoading(false);
      return undefined;
    }
    if (!inView) return undefined;

    const tokenId = yesTokenId(polyMarket);
    if (!tokenId) {
      setPolyPoints([]);
      setPolyLoading(false);
      setSeriesError("This Polymarket market has no YES token to chart.");
      return undefined;
    }

    polyHistAbort.current?.abort();
    const ac = new AbortController();
    polyHistAbort.current = ac;
    setPolyLoading(true);

    void fetchPolymarketHistory(tokenId, ac.signal)
      .then((polyHist) => {
        if (ac.signal.aborted) return;
        setPolyPoints(
          polyHist
            .map((row) => toPctPoint(row, "Polymarket"))
            .filter(Boolean) as Record<string, unknown>[],
        );
      })
      .catch((err) => {
        if (ac.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) return;
        setSeriesError(humanizeSeriesError(err));
      })
      .finally(() => {
        if (!ac.signal.aborted) setPolyLoading(false);
      });

    return () => ac.abort();
  }, [inView, polyKey, polyMarket]);

  useEffect(() => {
    if (!selectedTicker) {
      setKalshiMarket(null);
      setKalshiPoints([]);
      setKalshiLoading(false);
      return undefined;
    }
    if (!inView) return undefined;

    kalshiSeriesAbort.current?.abort();
    const ac = new AbortController();
    kalshiSeriesAbort.current = ac;
    setKalshiLoading(true);
    setSeriesError(null);

    void Promise.all([
      fetchKalshiLiveMarket({ marketTicker: selectedTicker, signal: ac.signal }),
      fetchKalshiTrades(selectedTicker, ac.signal),
    ])
      .then(([market, kalshiTrades]) => {
        if (ac.signal.aborted) return;
        setKalshiMarket(market);
        setKalshiPoints(
          kalshiTrades
            .map((row) => toPctPoint(row, "Kalshi"))
            .filter(Boolean) as Record<string, unknown>[],
        );
      })
      .catch((err) => {
        if (ac.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) return;
        setSeriesError(humanizeSeriesError(err));
        setManualOpen(true);
      })
      .finally(() => {
        if (!ac.signal.aborted) setKalshiLoading(false);
      });

    return () => ac.abort();
  }, [inView, selectedTicker]);

  // Live Polymarket trades while the selected market is in view.
  useEffect(() => {
    polySocketStop.current?.();
    polySocketStop.current = null;

    if (!inView || livePaused || !polyMarket) return undefined;

    const tokenId = yesTokenId(polyMarket);
    if (!tokenId) return undefined;

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

    return () => {
      polySocketStop.current?.();
      polySocketStop.current = null;
    };
  }, [inView, livePaused, polyMarket]);

  // Live Kalshi poll while a matched ticker is in view.
  useEffect(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }

    if (!inView || livePaused || !selectedTicker) return undefined;

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
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    };
  }, [inView, livePaused, selectedTicker]);

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
    !kalshiAnchor &&
    selectedCandidate &&
    (selectedCandidate.tier === "related" || selectedCandidate.tier === "close");

  const polyChartPending = Boolean(polyMarket) && polyLoading && !polyFiltered.length;
  const kalshiChartPending =
    (kalshiLoading || (!kalshiAnchor && matchLoading)) && !kalshiFiltered.length;
  const kalshiFieldsPending = !selectedTicker || (kalshiLoading && !kalshiMarket);
  const polyFieldsPending = !polyMarket || (polyLoading && polyYesPct == null);
  const matchFromKalshi = Boolean(kalshiAnchor);
  const selectedPolyKey = polyMarket ? polymarketRealtimeMarketKey(polyMarket) : "";
  const counterpartName = matchFromKalshi ? "Polymarket" : "Kalshi";
  const manualSearchLabel = `Search ${counterpartName} manually`;

  return (
    <div ref={rootRef} className="space-y-5">
      {!polyMarket && !kalshiAnchor ? (
        <div className="rounded-xl border border-border/70 bg-muted/15 px-4 py-5 sm:px-5 sm:py-6">
          <ComparePolymarketMarketSearch
            onSelectKalshiFeatured={startFromKalshi}
            kalshiPickLoading={matchLoading}
          />
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-muted/10 px-3 py-2.5 text-sm">
            <div className="min-w-0">
              {matchFromKalshi ? (
                <>
                  <span className="text-muted-foreground">Kalshi selected: </span>
                  <span className="font-medium text-foreground">
                    {kalshiAnchor?.title || selectedTicker || "Market"}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-muted-foreground">Polymarket selected: </span>
                  <span className="font-medium text-foreground">
                    {String(polyMarket?.title || polyMarket?.slug || "Market")}
                  </span>
                </>
              )}
              {polyMarket && !shape.isBinary ? (
                <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                  Multi-outcome market — comparison uses the YES (or first) outcome only.
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 shrink-0 gap-1.5 px-2 text-xs"
              onClick={startOver}
            >
              <Undo2 className="size-3.5" aria-hidden />
              Start over
            </Button>
          </div>

          {matchLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {matchFromKalshi
                ? "Searching Polymarket for comparable markets…"
                : "Searching Kalshi Live for comparable markets…"}
            </div>
          ) : null}

          {matchError ? (
            <div className="space-y-3 rounded-xl border border-border/70 bg-muted/15 px-4 py-4">
              <p className="text-sm text-destructive">{matchError}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={startOver}
                >
                  <Undo2 className="size-3.5" aria-hidden />
                  Start over
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setManualOpen(true)}
                >
                  <Search className="size-3.5" aria-hidden />
                  {manualSearchLabel}
                </Button>
              </div>
            </div>
          ) : null}

          {emptyMessage && !matchLoading && !matchError ? (
            <div className="space-y-3 rounded-xl border border-border/70 bg-muted/15 px-4 py-4">
              <p className="text-sm text-muted-foreground">{emptyMessage}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={startOver}
                >
                  <Undo2 className="size-3.5" aria-hidden />
                  Start over
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setManualOpen(true)}
                >
                  <Search className="size-3.5" aria-hidden />
                  {manualSearchLabel}
                </Button>
              </div>
            </div>
          ) : null}

          {matchFromKalshi && polyCandidates.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {selectedPolyKey &&
                polyCandidates.some((item) => polymarketRealtimeMarketKey(item) === selectedPolyKey)
                  ? polyCandidates.length === 1
                    ? "Matched Polymarket market"
                    : "Select the correct Polymarket market"
                  : "Select the correct Polymarket market"}
              </p>
              <div className="grid gap-2">
                {polyCandidates.map((candidate) => {
                  const key = polymarketRealtimeMarketKey(candidate);
                  const selected = Boolean(key) && key === selectedPolyKey;
                  const volume = formatPolymarketVolume(candidate.volume24h);
                  return (
                    <label
                      key={key}
                      className={cn(
                        "flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors",
                        selected
                          ? "border-secondary/40 bg-secondary/10"
                          : "border-border/60 bg-background hover:bg-muted/30",
                      )}
                    >
                      <input
                        type="radio"
                        name="polymarket-match"
                        className="mt-1 size-4 accent-secondary"
                        checked={selected}
                        onChange={() => applyPolyMatch(candidate)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="text-sm font-medium text-foreground">
                          {String(candidate.title || candidate.slug || "Market")}
                        </span>
                        <span className="mt-0.5 block text-[10px] text-muted-foreground">
                          {volume ? `24h vol ${volume}` : "Polymarket"}
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
                {manualSearchLabel}
              </Button>
            </div>
          ) : null}

          {!matchFromKalshi && candidates.length > 0 ? (
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
              {matchFromKalshi ? (
                <>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Search Polymarket in plain English
                  </p>
                  <PolymarketLiveSearch
                    layout="panel"
                    dismissAfterSelect
                    searchTags
                    searchProfiles={false}
                    keepClosedMarkets={false}
                    limitPerType={50}
                    className="w-full"
                    resultsClassName="max-h-56 flex-none"
                    placeholder="Search Polymarket markets in plain English…"
                    onSelect={(suggestion) => {
                      const entity = String(suggestion?.entity || "");
                      if (entity === "event") {
                        const nested = polymarketRealtimeMarketsFromEventSuggestion(
                          suggestion,
                        ) as HubPolymarketLiveDemoMarket[];
                        if (nested[0]) applyPolyMatch(nested[0]);
                        return;
                      }
                      if (entity !== "market") return;
                      const market = polymarketRealtimeMarketFromSuggestion(suggestion) as
                        | HubPolymarketLiveDemoMarket
                        | null;
                      if (market) applyPolyMatch(market);
                    }}
                    onSubmitAll={(suggestions) => {
                      for (const suggestion of suggestions || []) {
                        if (suggestion?.entity === "market") {
                          const market = polymarketRealtimeMarketFromSuggestion(
                            suggestion,
                          ) as HubPolymarketLiveDemoMarket | null;
                          if (market) {
                            applyPolyMatch(market);
                            return;
                          }
                        }
                      }
                      for (const suggestion of suggestions || []) {
                        if (suggestion?.entity === "event") {
                          const nested = polymarketRealtimeMarketsFromEventSuggestion(
                            suggestion,
                          ) as HubPolymarketLiveDemoMarket[];
                          if (nested[0]) applyPolyMatch(nested[0]);
                          return;
                        }
                      }
                    }}
                  />
                </>
              ) : (
                <>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Search Kalshi by event name
                  </p>
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
                </>
              )}
            </div>
          ) : null}

          {selectedTicker && relatedWarning ? (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
              These markets cover a similar event but may use different rules or resolution
              criteria.
            </p>
          ) : null}

          <div className="space-y-4">
              {seriesError ? (
                <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-4">
                  <p className="text-sm text-destructive">{seriesError}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={startOver}
                    >
                      <Undo2 className="size-3.5" aria-hidden />
                      Start over
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => setManualOpen(true)}
                    >
                      <Search className="size-3.5" aria-hidden />
                      Search {counterpartName} manually
                    </Button>
                  </div>
                </div>
              ) : null}
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
                        {String(polyMarket?.title || "—")}
                      </td>
                      <td className="px-3 py-2 font-medium text-foreground">
                        <ComparePendingValue
                          pending={kalshiFieldsPending && !selectedCandidate?.market.title}
                          skeletonClassName="h-3.5 w-40 max-w-full"
                        >
                          {String(
                            kalshiMarket?.title ||
                              selectedCandidate?.market.title ||
                              kalshiAnchor?.title ||
                              selectedTicker ||
                              "—",
                          )}
                        </ComparePendingValue>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-muted-foreground">YES</td>
                      <td className="px-3 py-2">
                        <ComparePendingValue pending={polyFieldsPending}>
                          {formatPct(polyYesPct)}
                        </ComparePendingValue>
                      </td>
                      <td className="px-3 py-2">
                        <ComparePendingValue pending={kalshiFieldsPending || (kalshiLoading && kalshiYesPct == null)}>
                          {formatPct(kalshiYesPct)}
                        </ComparePendingValue>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-muted-foreground">NO</td>
                      <td className="px-3 py-2">
                        <ComparePendingValue pending={polyFieldsPending}>
                          {formatPct(polyYesPct != null ? 100 - polyYesPct : null)}
                        </ComparePendingValue>
                      </td>
                      <td className="px-3 py-2">
                        <ComparePendingValue pending={kalshiFieldsPending || (kalshiLoading && kalshiYesPct == null)}>
                          {formatPct(kalshiYesPct != null ? 100 - kalshiYesPct : null)}
                        </ComparePendingValue>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-muted-foreground">Last trade</td>
                      <td className="px-3 py-2">
                        <ComparePendingValue pending={polyFieldsPending}>
                          {formatAgo(String(polyLast?.created_time || "") || null)}
                        </ComparePendingValue>
                      </td>
                      <td className="px-3 py-2">
                        <ComparePendingValue pending={kalshiFieldsPending || (kalshiLoading && !kalshiLast)}>
                          {formatAgo(String(kalshiLast?.created_time || "") || null)}
                        </ComparePendingValue>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-muted-foreground">Activity</td>
                      <td className="px-3 py-2">
                        <ComparePendingValue pending={polyChartPending} skeletonClassName="h-3 w-36">
                          {polyFiltered.length} prints in view
                          {polyMarket?.volume24h != null
                            ? ` · 24h vol $${Number(polyMarket.volume24h).toLocaleString()}`
                            : ""}
                        </ComparePendingValue>
                      </td>
                      <td className="px-3 py-2">
                        <ComparePendingValue pending={kalshiFieldsPending || kalshiChartPending} skeletonClassName="h-3 w-36">
                          {kalshiFiltered.length} trades in view
                          {kalshiMarket?.volume != null
                            ? ` · vol ${Number(kalshiMarket.volume).toLocaleString()} contracts`
                            : kalshiMarket?.volume_fp != null
                              ? ` · vol ${Number(kalshiMarket.volume_fp).toLocaleString()} contracts`
                              : ""}
                        </ComparePendingValue>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-muted-foreground">Status</td>
                      <td className="px-3 py-2">
                        {polyMarket?.closed ? "Closed" : polyMarket ? "Live" : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <ComparePendingValue pending={kalshiFieldsPending && !selectedCandidate?.market.status}>
                          {String(kalshiMarket?.status || selectedCandidate?.market.status || "—")}
                        </ComparePendingValue>
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
                    <CompareChartBody
                      pending={polyChartPending}
                      hasData={polyFiltered.length > 0}
                      waitingMessage={
                        polyMarket
                          ? "No chart at present"
                          : "Search Polymarket above to plot this chart"
                      }
                    >
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
                    </CompareChartBody>
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
                    <CompareChartBody
                      pending={kalshiChartPending}
                      hasData={kalshiFiltered.length > 0}
                      waitingMessage={
                        selectedTicker
                          ? "No chart at present"
                          : "Search Kalshi above to plot this chart"
                      }
                    >
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
                    </CompareChartBody>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    {
                      platform: "Polymarket",
                      pending: polyFieldsPending || polyChartPending,
                      trades: polyFiltered.length,
                      volumeLabel:
                        polyMarket?.volume24h != null
                          ? `24h notional ≈ $${Number(polyMarket.volume24h).toLocaleString()}`
                          : "Volume metric: platform 24h notional (USDC)",
                      lastPrice: formatPct(polyYesPct),
                      lastSize:
                        polyLast?.size != null ? String(polyLast.size) : "—",
                      since: formatAgo(String(polyLast?.created_time || "") || null),
                    },
                    {
                      platform: "Kalshi",
                      pending: kalshiFieldsPending || kalshiChartPending,
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
                  ] as const
                ).map((panel) => (
                  <div
                    key={panel.platform}
                    className="rounded-xl border border-border/70 bg-background px-3 py-3"
                  >
                    <p className="text-xs font-semibold text-foreground">{panel.platform} activity</p>
                    <dl className="mt-2 space-y-1.5 text-[11px]">
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">Trades in interval</dt>
                        <dd className="font-medium text-foreground">
                          <ComparePendingValue pending={panel.pending} skeletonClassName="h-3 w-10">
                            {panel.trades}
                          </ComparePendingValue>
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">Volume</dt>
                        <dd className="max-w-[60%] text-right font-medium text-foreground">
                          <ComparePendingValue pending={panel.pending} skeletonClassName="h-3 w-28">
                            {panel.volumeLabel}
                          </ComparePendingValue>
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">Last execution</dt>
                        <dd className="font-medium text-foreground">
                          <ComparePendingValue pending={panel.pending} skeletonClassName="h-3 w-12">
                            {panel.lastPrice}
                          </ComparePendingValue>
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">Last size</dt>
                        <dd className="font-medium text-foreground">
                          <ComparePendingValue pending={panel.pending} skeletonClassName="h-3 w-12">
                            {panel.lastSize}
                          </ComparePendingValue>
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">Since last trade</dt>
                        <dd className="font-medium text-foreground">
                          <ComparePendingValue pending={panel.pending} skeletonClassName="h-3 w-14">
                            {panel.since}
                          </ComparePendingValue>
                        </dd>
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
        </>
      )}
    </div>
  );
}
