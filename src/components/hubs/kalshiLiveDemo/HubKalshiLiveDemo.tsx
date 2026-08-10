"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Braces, Download, LineChart, Loader2, RefreshCw, Table2 } from "lucide-react";
import * as XLSX from "xlsx";
import { toJpeg, toPng, toSvg } from "html-to-image";

import { MarketTickerSearch } from "@/components/connectData/MarketTickerSearch";
import { HubKalshiLiveDemoMockup } from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveDemoMockup";
import {
  HubKalshiLiveDemoTabs,
  type HubKalshiLiveDemoTabId,
} from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveDemoTabs";
import {
  HubKalshiLiveDemoCandlesticksChart,
  type DemoCandlePeriod,
} from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveDemoCandlesticksChart";
import { HubKalshiLiveDemoOrderbookChart } from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveDemoOrderbookChart";
import { HubKalshiLiveDemoTradesChart } from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveDemoTradesChart";
import { HubKalshiLiveDemoTradesLiveline } from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveDemoTradesLiveline";
import {
  defaultSeriesColorToken,
  type DemoChartColorTokenId,
  resolveDemoChartColor,
} from "@/components/hubs/kalshiLiveDemo/demoChartColors";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isKalshiMarketLiveStatus } from "@/lib/kalshiLive/kalshiMarketTiming";
import { KALSHI_LIVE_CANDLESTICK_COLUMNS } from "@/lib/kalshiLive/candlesticksColumns";
import { normalizeKalshiLiveOrderbook } from "@/lib/kalshiLive/normalizeOrderbookRow";
import {
  flattenKalshiLiveCandlestickGroups,
} from "@/lib/kalshiLive/normalizeCandlestickRow";
import { KALSHI_LIVE_ORDERBOOK_COLUMNS } from "@/lib/kalshiLive/orderbookColumns";
import { KALSHI_LIVE_TRADES_COLUMNS } from "@/lib/kalshiLive/tradesColumns";
import {
  buildCandlestickLiveFlashRows,
  liveSheetRowKey,
  upsertCandlestickRowsByEndPeriodTs,
} from "@/lib/liveFeeds/merge/kalshiCandlestickUpsert";
import {
  buildOrderbookLiveFlashRows,
  liveOrderbookRowKey,
  normalizeOrderbookSnapshotRows,
} from "@/lib/liveFeeds/merge/kalshiOrderbookReplace";
import { cn } from "@/lib/utils";

const DEMO_MAX_TICKERS = 2;
const FEATURED_LIMIT = 5;
const DEMO_TRADES_LIMIT = 20;
/**
 * Anonymous trades proxy is ~30 req/min. With 2 markets each poll costs 2 requests,
 * so use 5s when dual-selected; 3s is fine for a single market.
 */
const DEMO_TRADES_LIVE_POLL_MS_SINGLE = 3_000;
const DEMO_TRADES_LIVE_POLL_MS_MULTI = 5_000;
const DEMO_TRADES_LIVE_DURATION_MS = 60_000;
/** Soft cap while live so charts stay complete without unbounded memory growth. */
const DEMO_TRADES_LIVE_MEMORY_CAP = 1_000;
const DEMO_TRADES_FLASH_MS = 2_000;
/** Demo orderbook depth per side (Kalshi depth query). */
const DEMO_ORDERBOOK_DEPTH = 20;
const DEMO_ORDERBOOK_LIVE_POLL_MS_SINGLE = 3_000;
const DEMO_ORDERBOOK_LIVE_POLL_MS_MULTI = 5_000;
const DEMO_ORDERBOOK_LIVE_DURATION_MS = 60_000;
const DEMO_ORDERBOOK_FLASH_MS = 2_000;
const DEMO_ORDERBOOK_SOFT_ROW_CAP = 500;
const DEMO_CANDLES_LIVE_POLL_MS_SINGLE = 3_000;
const DEMO_CANDLES_LIVE_POLL_MS_MULTI = 5_000;
const DEMO_CANDLES_LIVE_DURATION_MS = 60_000;
const DEMO_CANDLES_FLASH_MS = 2_000;
const DEMO_CANDLES_SOFT_ROW_CAP = 500;

const TRADES_PREFERRED_COLUMNS = KALSHI_LIVE_TRADES_COLUMNS.map((c) => c.name);
const ORDERBOOK_PREFERRED_COLUMNS = KALSHI_LIVE_ORDERBOOK_COLUMNS.map(
  (c) => c.name,
);
const CANDLES_PREFERRED_COLUMNS = KALSHI_LIVE_CANDLESTICK_COLUMNS.map(
  (c) => c.name,
);

type ViewMode = "sheet" | "json";
type TradesViewMode = ViewMode | "chart";
type OrderbookViewMode = ViewMode | "chart";
type CandlesticksViewMode = ViewMode | "chart";

type TradesGroup = {
  ticker: string;
  /** Short tab label — preferably Kalshi yes_sub_title (e.g. "Republicans"). */
  label: string;
  trades: Record<string, unknown>[];
};

type OrderbookGroup = {
  ticker: string;
  label: string;
  levels: Record<string, unknown>[];
};

type OrderbookFlashMap = Record<
  string,
  { isNew: boolean; columns?: string[] }
>;

type CandlesGroup = {
  ticker: string;
  label: string;
  candles: Record<string, unknown>[];
};

type CandlesFlashMap = Record<
  string,
  { isNew: boolean; columns?: string[] }
>;

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

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
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

/** Prefer the trailing ticker segment that differs across siblings (e.g. R vs D). */
function tickerDifferentiator(ticker: string, allTickers: string[]): string {
  if (allTickers.length < 2) return ticker;
  const parts = allTickers.map((t) => t.split("-").filter(Boolean));
  const maxLen = Math.max(0, ...parts.map((p) => p.length));
  for (let offset = 1; offset <= maxLen; offset += 1) {
    const segs = parts.map((p) => p[p.length - offset] || "");
    if (new Set(segs).size > 1) {
      const mine = ticker.split("-").filter(Boolean);
      return mine[mine.length - offset] || ticker;
    }
  }
  return ticker;
}

function shortTradeSheetLabel(
  ticker: string,
  allTickers: string[],
  yesSubTitle?: string,
): string {
  const yes = String(yesSubTitle || "").trim();
  if (yes) return yes;
  return tickerDifferentiator(ticker, allTickers);
}

function demoCandleRangeSec(period: DemoCandlePeriod): number {
  if (period === 1) return 2 * 60 * 60;
  if (period === 60) return 3 * 24 * 60 * 60;
  return 60 * 24 * 60 * 60;
}

function tradeRowId(row: Record<string, unknown>): string {
  const id = row.trade_id ?? row.id;
  if (id != null && String(id).trim()) return String(id).trim();
  const t = String(row.ticker || "").trim().toUpperCase();
  const ts = String(row.created_time ?? row.created_ts ?? "");
  const yes = String(row.yes_price_dollars ?? row.yes_price ?? "");
  const count = String(row.count_fp ?? row.count ?? "");
  return `${t}|${ts}|${yes}|${count}`;
}

function tradeRowTimeMs(row: Record<string, unknown>): number {
  const raw = row.created_time ?? row.created_ts ?? row.ts;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw < 1e12 ? raw * 1000 : raw;
  }
  const ms = Date.parse(String(raw || ""));
  return Number.isFinite(ms) ? ms : 0;
}

function mergeNewestTrades(
  previous: Record<string, unknown>[],
  incoming: Record<string, unknown>[],
  limit: number,
): { trades: Record<string, unknown>[]; newIds: string[] } {
  const prevIds = new Set(previous.map(tradeRowId).filter(Boolean));
  const byId = new Map<string, Record<string, unknown>>();
  for (const row of previous) {
    const id = tradeRowId(row);
    if (id) byId.set(id, row);
  }
  const discovered = new Set<string>();
  for (const row of incoming) {
    const id = tradeRowId(row);
    if (!id) continue;
    if (!prevIds.has(id)) discovered.add(id);
    byId.set(id, row);
  }
  const trades = [...byId.values()]
    .sort((a, b) => tradeRowTimeMs(b) - tradeRowTimeMs(a))
    .slice(0, Math.max(1, limit));
  const visible = new Set(trades.map(tradeRowId));
  return {
    trades,
    newIds: [...discovered].filter((id) => visible.has(id)),
  };
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

function SheetTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-2 p-3" aria-hidden>
      <div className="h-8 w-full rounded bg-muted/80" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-2">
          <div className="h-7 w-[18%] rounded bg-muted/70" />
          <div className="h-7 w-[22%] rounded bg-muted/60" />
          <div className="h-7 w-[14%] rounded bg-muted/70" />
          <div className="h-7 flex-1 rounded bg-muted/50" />
        </div>
      ))}
    </div>
  );
}

function JsonSkeleton({ lines = 12 }: { lines?: number }) {
  return (
    <div className="animate-pulse space-y-2 px-3 py-3" aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 rounded bg-muted/70"
          style={{ width: `${58 + ((i * 17) % 36)}%` }}
        />
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div
      className="flex min-h-0 w-full flex-1 flex-col gap-3 px-3 py-3"
      aria-hidden
    >
      <div className="flex min-h-0 flex-1 gap-3">
        <div className="flex w-10 shrink-0 flex-col justify-between py-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-2.5 w-full animate-pulse rounded bg-muted/70" />
          ))}
        </div>
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-md border border-border/40 bg-muted/15">
          <div className="absolute inset-x-0 top-[20%] h-px bg-border/40" />
          <div className="absolute inset-x-0 top-[40%] h-px bg-border/40" />
          <div className="absolute inset-x-0 top-[60%] h-px bg-border/40" />
          <div className="absolute inset-x-0 top-[80%] h-px bg-border/40" />
          <div className="absolute inset-[18%_8%_22%_6%] animate-pulse rounded-full bg-muted/50" />
          <div className="absolute inset-[42%_12%_28%_10%] animate-pulse rounded-full bg-muted/40" />
        </div>
      </div>
      <div className="flex gap-2 pl-12">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-2.5 flex-1 animate-pulse rounded bg-muted/60" />
        ))}
      </div>
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
  const [tradesViewMode, setTradesViewMode] = useState<TradesViewMode>("sheet");
  const [orderbookViewMode, setOrderbookViewMode] =
    useState<OrderbookViewMode>("sheet");
  const [candlesViewMode, setCandlesViewMode] =
    useState<CandlesticksViewMode>("sheet");
  const [candlePeriod, setCandlePeriod] = useState<DemoCandlePeriod>(1);
  const [activeTab, setActiveTab] = useState<HubKalshiLiveDemoTabId>("search");
  const [featured, setFeatured] = useState<FeaturedMarket[]>([]);
  const prevHasSelectionRef = useRef(false);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [featuredRefreshing, setFeaturedRefreshing] = useState(false);
  const [featuredError, setFeaturedError] = useState<string | null>(null);
  const [tradesGroups, setTradesGroups] = useState<TradesGroup[] | null>(null);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [tradesError, setTradesError] = useState<string | null>(null);
  const [activeTradesSheetIndex, setActiveTradesSheetIndex] = useState(0);
  const [orderbookGroups, setOrderbookGroups] = useState<OrderbookGroup[] | null>(
    null,
  );
  const [orderbookLoading, setOrderbookLoading] = useState(false);
  const [orderbookError, setOrderbookError] = useState<string | null>(null);
  const [activeOrderbookSheetIndex, setActiveOrderbookSheetIndex] = useState(0);
  const [candlesGroups, setCandlesGroups] = useState<CandlesGroup[] | null>(
    null,
  );
  const [candlesLoading, setCandlesLoading] = useState(false);
  const [candlesError, setCandlesError] = useState<string | null>(null);
  const [activeCandlesSheetIndex, setActiveCandlesSheetIndex] = useState(0);
  const [liveEmbedOpen, setLiveEmbedOpen] = useState(false);
  const [liveLimitOpen, setLiveLimitOpen] = useState(false);
  const [tradesLive, setTradesLive] = useState(false);
  const [orderbookLive, setOrderbookLive] = useState(false);
  const [candlesLive, setCandlesLive] = useState(false);
  const [newTradeIds, setNewTradeIds] = useState<Set<string>>(() => new Set());
  const [orderbookFlash, setOrderbookFlash] = useState<OrderbookFlashMap>({});
  const [candlesFlash, setCandlesFlash] = useState<CandlesFlashMap>({});
  const [hiddenTradeSeriesIds, setHiddenTradeSeriesIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [tradeSeriesColorTokens, setTradeSeriesColorTokens] = useState<
    Record<string, DemoChartColorTokenId>
  >({});
  const [chartExporting, setChartExporting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);
  const tradesAbortRef = useRef<AbortController | null>(null);
  const tradesSeqRef = useRef(0);
  const tradesLiveAbortRef = useRef<AbortController | null>(null);
  const tradesLiveStartedAtRef = useRef<number | null>(null);
  const tradesGroupsRef = useRef<TradesGroup[] | null>(null);
  const tradesChartRef = useRef<HTMLDivElement | null>(null);
  const orderbookAbortRef = useRef<AbortController | null>(null);
  const orderbookSeqRef = useRef(0);
  const orderbookLiveAbortRef = useRef<AbortController | null>(null);
  const orderbookLiveStartedAtRef = useRef<number | null>(null);
  const orderbookGroupsRef = useRef<OrderbookGroup[] | null>(null);
  const orderbookChartRef = useRef<HTMLDivElement | null>(null);
  const candlesAbortRef = useRef<AbortController | null>(null);
  const candlesSeqRef = useRef(0);
  const candlesLiveAbortRef = useRef<AbortController | null>(null);
  const candlesLiveStartedAtRef = useRef<number | null>(null);
  const candlesGroupsRef = useRef<CandlesGroup[] | null>(null);
  const candlesChartRef = useRef<HTMLDivElement | null>(null);
  const demoShellRef = useRef<HTMLDivElement | null>(null);
  const [demoShellMinHeight, setDemoShellMinHeight] = useState<number | null>(null);

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
    tradesGroupsRef.current = tradesGroups;
  }, [tradesGroups]);

  useEffect(() => {
    orderbookGroupsRef.current = orderbookGroups;
  }, [orderbookGroups]);

  useEffect(() => {
    candlesGroupsRef.current = candlesGroups;
  }, [candlesGroups]);

  useEffect(() => {
    if (!newTradeIds.size) return;
    const timer = window.setTimeout(() => setNewTradeIds(new Set()), DEMO_TRADES_FLASH_MS);
    return () => window.clearTimeout(timer);
  }, [newTradeIds]);

  useEffect(() => {
    if (!Object.keys(orderbookFlash).length) return;
    const timer = window.setTimeout(
      () => setOrderbookFlash({}),
      DEMO_ORDERBOOK_FLASH_MS,
    );
    return () => window.clearTimeout(timer);
  }, [orderbookFlash]);

  useEffect(() => {
    if (!Object.keys(candlesFlash).length) return;
    const timer = window.setTimeout(
      () => setCandlesFlash({}),
      DEMO_CANDLES_FLASH_MS,
    );
    return () => window.clearTimeout(timer);
  }, [candlesFlash]);

  const stopTradesLive = useCallback((opts?: { limitReached?: boolean }) => {
    tradesLiveAbortRef.current?.abort();
    tradesLiveAbortRef.current = null;
    tradesLiveStartedAtRef.current = null;
    setTradesLive(false);
    if (opts?.limitReached) setLiveLimitOpen(true);
  }, []);

  const stopOrderbookLive = useCallback((opts?: { limitReached?: boolean }) => {
    orderbookLiveAbortRef.current?.abort();
    orderbookLiveAbortRef.current = null;
    orderbookLiveStartedAtRef.current = null;
    setOrderbookLive(false);
    if (opts?.limitReached) setLiveLimitOpen(true);
  }, []);

  const stopCandlesLive = useCallback((opts?: { limitReached?: boolean }) => {
    candlesLiveAbortRef.current?.abort();
    candlesLiveAbortRef.current = null;
    candlesLiveStartedAtRef.current = null;
    setCandlesLive(false);
    if (opts?.limitReached) setLiveLimitOpen(true);
  }, []);

  const startTradesLive = useCallback(() => {
    if (!tickers.length) return;
    stopOrderbookLive();
    stopCandlesLive();
    tradesLiveStartedAtRef.current = Date.now();
    setNewTradeIds(new Set());
    setTradesLive(true);
  }, [tickers.length, stopOrderbookLive, stopCandlesLive]);

  const startOrderbookLive = useCallback(() => {
    if (!tickers.length) return;
    stopTradesLive();
    stopCandlesLive();
    orderbookLiveStartedAtRef.current = Date.now();
    setOrderbookFlash({});
    setOrderbookLive(true);
  }, [tickers.length, stopTradesLive, stopCandlesLive]);

  const startCandlesLive = useCallback(() => {
    if (!tickers.length) return;
    stopTradesLive();
    stopOrderbookLive();
    candlesLiveStartedAtRef.current = Date.now();
    setCandlesFlash({});
    setCandlesLive(true);
  }, [tickers.length, stopTradesLive, stopOrderbookLive]);

  const loadFeaturedMarkets = useCallback(async (opts?: { excludeTickers?: string[] }) => {
    const exclude = (opts?.excludeTickers || [])
      .map((t) => String(t || "").trim().toUpperCase())
      .filter(Boolean);
    const refreshing = exclude.length > 0;

    if (refreshing) setFeaturedRefreshing(true);
    else {
      setFeaturedLoading(true);
      setFeaturedError(null);
    }

    const params = new URLSearchParams({ limit: String(FEATURED_LIMIT) });
    if (exclude.length) params.set("exclude", exclude.join(","));

    try {
      const res = await fetch(
        `/api/integrations/kalshi-live/markets/featured?${params.toString()}`,
        {
          headers: { Accept: "application/json" },
          credentials: "same-origin",
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof body?.error === "string" ? body.error : "Failed to load live markets",
        );
      }
      const list = Array.isArray(body?.markets) ? body.markets : [];
      setFeatured(list);
      setFeaturedError(null);
    } catch (e) {
      if (!refreshing) {
        setFeatured([]);
        setFeaturedError(e instanceof Error ? e.message : "Failed to load live markets");
      }
    } finally {
      setFeaturedLoading(false);
      setFeaturedRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadFeaturedMarkets();
  }, [loadFeaturedMarkets]);

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
    setMarkets(null);
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

  useEffect(() => {
    tradesAbortRef.current?.abort();

    if (activeTab !== "trades" || tickers.length === 0) {
      if (tickers.length === 0) {
        setTradesGroups(null);
        setTradesError(null);
        setTradesLoading(false);
        setActiveTradesSheetIndex(0);
      }
      return;
    }

    // Live polling owns refreshes while the feed is running.
    if (tradesLive) return;

    const mySeq = ++tradesSeqRef.current;
    const ac = new AbortController();
    tradesAbortRef.current = ac;
    setTradesGroups(null);
    setTradesLoading(true);
    setTradesError(null);
    setActiveTradesSheetIndex(0);

    const yesSubByTicker = new Map<string, string>();
    for (const market of markets || []) {
      const t = String(market?.ticker || "").trim().toUpperCase();
      if (!t) continue;
      const yesSub = String(market?.yes_sub_title || "").trim();
      if (yesSub) yesSubByTicker.set(t, yesSub);
    }
    for (const item of featured) {
      const t = String(item?.ticker || "").trim().toUpperCase();
      if (!t || yesSubByTicker.has(t)) continue;
      const yesSub = String(item?.subtitle || "").trim();
      if (yesSub) yesSubByTicker.set(t, yesSub);
    }

    Promise.all(
      tickers.map(async (ticker) => {
        const params = new URLSearchParams({
          ticker,
          limit: String(DEMO_TRADES_LIMIT),
        });
        const res = await fetch(
          `/api/integrations/kalshi-live/markets/trades?${params.toString()}`,
          {
            headers: { Accept: "application/json" },
            credentials: "same-origin",
            signal: ac.signal,
          },
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof body?.error === "string"
              ? body.error
              : res.status === 429
                ? "Too many requests — slow down and try again."
                : `Failed to load trades for ${ticker}`,
          );
        }
        const list = Array.isArray(body?.trades) ? body.trades : [];
        return {
          ticker,
          label: shortTradeSheetLabel(ticker, tickers, yesSubByTicker.get(ticker)),
          trades: list.slice(0, DEMO_TRADES_LIMIT) as Record<string, unknown>[],
        } satisfies TradesGroup;
      }),
    )
      .then((groups) => {
        if (mySeq !== tradesSeqRef.current) return;
        setTradesGroups(groups);
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (mySeq !== tradesSeqRef.current) return;
        setTradesGroups(null);
        setTradesError(e instanceof Error ? e.message : "Failed to load trades");
      })
      .finally(() => {
        if (mySeq === tradesSeqRef.current) setTradesLoading(false);
      });

    return () => {
      ac.abort();
    };
  }, [activeTab, tickers, tickersKey, markets, featured, tradesLive]);

  useEffect(() => {
    if (!tradesLive) return;
    if (activeTab !== "trades" || tickers.length === 0) {
      stopTradesLive();
      return;
    }

    let cancelled = false;
    let inFlight = false;

    const yesSubByTicker = new Map<string, string>();
    for (const market of markets || []) {
      const t = String(market?.ticker || "").trim().toUpperCase();
      if (!t) continue;
      const yesSub = String(market?.yes_sub_title || "").trim();
      if (yesSub) yesSubByTicker.set(t, yesSub);
    }
    for (const item of featured) {
      const t = String(item?.ticker || "").trim().toUpperCase();
      if (!t || yesSubByTicker.has(t)) continue;
      const yesSub = String(item?.subtitle || "").trim();
      if (yesSub) yesSubByTicker.set(t, yesSub);
    }

    const pollOnce = async () => {
      if (cancelled || inFlight) return;
      const startedAt = tradesLiveStartedAtRef.current;
      if (startedAt != null && Date.now() - startedAt >= DEMO_TRADES_LIVE_DURATION_MS) {
        stopTradesLive({ limitReached: true });
        return;
      }

      inFlight = true;
      tradesLiveAbortRef.current?.abort();
      const ac = new AbortController();
      tradesLiveAbortRef.current = ac;

      try {
        const previous = tradesGroupsRef.current || [];
        const prevByTicker = new Map(previous.map((g) => [g.ticker, g]));
        const flashIds: string[] = [];

        const nextGroups = await Promise.all(
          tickers.map(async (ticker) => {
            const params = new URLSearchParams({
              ticker,
              limit: String(DEMO_TRADES_LIMIT),
            });
            const res = await fetch(
              `/api/integrations/kalshi-live/markets/trades?${params.toString()}`,
              {
                headers: { Accept: "application/json" },
                credentials: "same-origin",
                signal: ac.signal,
              },
            );
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
              throw new Error(
                typeof body?.error === "string"
                  ? body.error
                  : res.status === 429
                    ? "Too many requests — slow down and try again."
                    : `Failed to load trades for ${ticker}`,
              );
            }
            // Each poll only asks Kalshi for the newest page; we merge into local memory
            // (deduped by trade_id) so the chart keeps a continuous history.
            const list = (
              Array.isArray(body?.trades) ? body.trades : []
            ).slice(0, DEMO_TRADES_LIMIT) as Record<string, unknown>[];
            const prevGroup = prevByTicker.get(ticker);
            const merged = mergeNewestTrades(
              prevGroup?.trades || [],
              list,
              DEMO_TRADES_LIVE_MEMORY_CAP,
            );
            flashIds.push(...merged.newIds);
            return {
              ticker,
              label:
                prevGroup?.label ||
                shortTradeSheetLabel(ticker, tickers, yesSubByTicker.get(ticker)),
              trades: merged.trades,
            } satisfies TradesGroup;
          }),
        );

        if (cancelled || ac.signal.aborted) return;
        setTradesGroups(nextGroups);
        setTradesError(null);
        if (flashIds.length) {
          setNewTradeIds(new Set(flashIds));
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (cancelled) return;
        setTradesError(e instanceof Error ? e.message : "Failed to refresh live trades");
      } finally {
        inFlight = false;
      }
    };

    void pollOnce();
    const pollMs =
      tickers.length > 1
        ? DEMO_TRADES_LIVE_POLL_MS_MULTI
        : DEMO_TRADES_LIVE_POLL_MS_SINGLE;
    const intervalId = window.setInterval(() => {
      void pollOnce();
    }, pollMs);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      tradesLiveAbortRef.current?.abort();
    };
  }, [
    tradesLive,
    activeTab,
    tickers,
    tickersKey,
    markets,
    featured,
    stopTradesLive,
  ]);

  useEffect(() => {
    orderbookAbortRef.current?.abort();

    if (activeTab !== "orderbook" || tickers.length === 0) {
      if (tickers.length === 0) {
        setOrderbookGroups(null);
        setOrderbookError(null);
        setOrderbookLoading(false);
        setActiveOrderbookSheetIndex(0);
        setOrderbookFlash({});
      }
      return;
    }

    if (orderbookLive) return;

    const mySeq = ++orderbookSeqRef.current;
    const ac = new AbortController();
    orderbookAbortRef.current = ac;
    setOrderbookGroups(null);
    setOrderbookLoading(true);
    setOrderbookError(null);
    setActiveOrderbookSheetIndex(0);
    setOrderbookFlash({});

    const yesSubByTicker = new Map<string, string>();
    for (const market of markets || []) {
      const t = String(market?.ticker || "").trim().toUpperCase();
      if (!t) continue;
      const yesSub = String(market?.yes_sub_title || "").trim();
      if (yesSub) yesSubByTicker.set(t, yesSub);
    }
    for (const item of featured) {
      const t = String(item?.ticker || "").trim().toUpperCase();
      if (!t || yesSubByTicker.has(t)) continue;
      const yesSub = String(item?.subtitle || "").trim();
      if (yesSub) yesSubByTicker.set(t, yesSub);
    }

    Promise.all(
      tickers.map(async (ticker) => {
        const params = new URLSearchParams({
          ticker,
          depth: String(DEMO_ORDERBOOK_DEPTH),
        });
        const res = await fetch(
          `/api/integrations/kalshi-live/markets/orderbook?${params.toString()}`,
          {
            headers: { Accept: "application/json" },
            credentials: "same-origin",
            signal: ac.signal,
          },
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof body?.error === "string"
              ? body.error
              : res.status === 429
                ? "Too many requests — slow down and try again."
                : `Failed to load orderbook for ${ticker}`,
          );
        }
        const levels = normalizeOrderbookSnapshotRows(
          normalizeKalshiLiveOrderbook(ticker, body?.orderbook_fp),
          { softRowCap: DEMO_ORDERBOOK_SOFT_ROW_CAP },
        );
        return {
          ticker,
          label: shortTradeSheetLabel(ticker, tickers, yesSubByTicker.get(ticker)),
          levels,
        } satisfies OrderbookGroup;
      }),
    )
      .then((groups) => {
        if (mySeq !== orderbookSeqRef.current) return;
        setOrderbookGroups(groups);
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (mySeq !== orderbookSeqRef.current) return;
        setOrderbookGroups(null);
        setOrderbookError(
          e instanceof Error ? e.message : "Failed to load orderbook",
        );
      })
      .finally(() => {
        if (mySeq === orderbookSeqRef.current) setOrderbookLoading(false);
      });

    return () => {
      ac.abort();
    };
  }, [activeTab, tickers, tickersKey, markets, featured, orderbookLive]);

  useEffect(() => {
    if (!orderbookLive) return;
    if (activeTab !== "orderbook" || tickers.length === 0) {
      stopOrderbookLive();
      return;
    }

    let cancelled = false;
    let inFlight = false;

    const yesSubByTicker = new Map<string, string>();
    for (const market of markets || []) {
      const t = String(market?.ticker || "").trim().toUpperCase();
      if (!t) continue;
      const yesSub = String(market?.yes_sub_title || "").trim();
      if (yesSub) yesSubByTicker.set(t, yesSub);
    }
    for (const item of featured) {
      const t = String(item?.ticker || "").trim().toUpperCase();
      if (!t || yesSubByTicker.has(t)) continue;
      const yesSub = String(item?.subtitle || "").trim();
      if (yesSub) yesSubByTicker.set(t, yesSub);
    }

    const pollOnce = async () => {
      if (cancelled || inFlight) return;
      const startedAt = orderbookLiveStartedAtRef.current;
      if (
        startedAt != null &&
        Date.now() - startedAt >= DEMO_ORDERBOOK_LIVE_DURATION_MS
      ) {
        stopOrderbookLive({ limitReached: true });
        return;
      }

      inFlight = true;
      orderbookLiveAbortRef.current?.abort();
      const ac = new AbortController();
      orderbookLiveAbortRef.current = ac;

      try {
        const previous = orderbookGroupsRef.current || [];
        const prevByTicker = new Map(previous.map((g) => [g.ticker, g]));
        const flashRows: OrderbookFlashMap = {};

        const nextGroups = await Promise.all(
          tickers.map(async (ticker) => {
            const params = new URLSearchParams({
              ticker,
              depth: String(DEMO_ORDERBOOK_DEPTH),
            });
            const res = await fetch(
              `/api/integrations/kalshi-live/markets/orderbook?${params.toString()}`,
              {
                headers: { Accept: "application/json" },
                credentials: "same-origin",
                signal: ac.signal,
              },
            );
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
              throw new Error(
                typeof body?.error === "string"
                  ? body.error
                  : res.status === 429
                    ? "Too many requests — slow down and try again."
                    : `Failed to load orderbook for ${ticker}`,
              );
            }
            const prevGroup = prevByTicker.get(ticker);
            const snapshot = normalizeOrderbookSnapshotRows(
              normalizeKalshiLiveOrderbook(ticker, body?.orderbook_fp),
              { softRowCap: DEMO_ORDERBOOK_SOFT_ROW_CAP },
            );
            const flash = buildOrderbookLiveFlashRows(
              prevGroup?.levels || [],
              snapshot,
            );
            Object.assign(flashRows, flash);
            return {
              ticker,
              label:
                prevGroup?.label ||
                shortTradeSheetLabel(ticker, tickers, yesSubByTicker.get(ticker)),
              levels: snapshot,
            } satisfies OrderbookGroup;
          }),
        );

        if (cancelled || ac.signal.aborted) return;
        setOrderbookGroups(nextGroups);
        setOrderbookError(null);
        if (Object.keys(flashRows).length) {
          setOrderbookFlash(flashRows);
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (cancelled) return;
        setOrderbookError(
          e instanceof Error ? e.message : "Failed to refresh live orderbook",
        );
      } finally {
        inFlight = false;
      }
    };

    void pollOnce();
    const pollMs =
      tickers.length > 1
        ? DEMO_ORDERBOOK_LIVE_POLL_MS_MULTI
        : DEMO_ORDERBOOK_LIVE_POLL_MS_SINGLE;
    const intervalId = window.setInterval(() => {
      void pollOnce();
    }, pollMs);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      orderbookLiveAbortRef.current?.abort();
    };
  }, [
    orderbookLive,
    activeTab,
    tickers,
    tickersKey,
    markets,
    featured,
    stopOrderbookLive,
  ]);

  useEffect(() => {
    candlesAbortRef.current?.abort();

    if (activeTab !== "candlesticks" || tickers.length === 0) {
      if (tickers.length === 0) {
        setCandlesGroups(null);
        setCandlesError(null);
        setCandlesLoading(false);
        setActiveCandlesSheetIndex(0);
        setCandlesFlash({});
      }
      return;
    }

    if (candlesLive) return;

    const mySeq = ++candlesSeqRef.current;
    const ac = new AbortController();
    candlesAbortRef.current = ac;
    setCandlesGroups(null);
    setCandlesLoading(true);
    setCandlesError(null);
    setActiveCandlesSheetIndex(0);
    setCandlesFlash({});

    const yesSubByTicker = new Map<string, string>();
    for (const market of markets || []) {
      const t = String(market?.ticker || "").trim().toUpperCase();
      if (!t) continue;
      const yesSub = String(market?.yes_sub_title || "").trim();
      if (yesSub) yesSubByTicker.set(t, yesSub);
    }
    for (const item of featured) {
      const t = String(item?.ticker || "").trim().toUpperCase();
      if (!t || yesSubByTicker.has(t)) continue;
      const yesSub = String(item?.subtitle || "").trim();
      if (yesSub) yesSubByTicker.set(t, yesSub);
    }

    const endTs = Math.floor(Date.now() / 1000);
    const startTs = endTs - demoCandleRangeSec(candlePeriod);

    Promise.all(
      tickers.map(async (ticker) => {
        const params = new URLSearchParams({
          market_tickers: ticker,
          start_ts: String(startTs),
          end_ts: String(endTs),
          period_interval: String(candlePeriod),
          per_ticker: "1",
        });
        const res = await fetch(
          `/api/integrations/kalshi-live/markets/candlesticks?${params.toString()}`,
          {
            headers: { Accept: "application/json" },
            credentials: "same-origin",
            signal: ac.signal,
          },
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof body?.error === "string"
              ? body.error
              : res.status === 429
                ? "Too many requests — slow down and try again."
                : `Failed to load candlesticks for ${ticker}`,
          );
        }
        const candles = flattenKalshiLiveCandlestickGroups(body?.markets).filter(
          (row) =>
            String(row.market_ticker || "")
              .trim()
              .toUpperCase() === ticker,
        );
        return {
          ticker,
          label: shortTradeSheetLabel(ticker, tickers, yesSubByTicker.get(ticker)),
          candles: upsertCandlestickRowsByEndPeriodTs([], candles, {
            softRowCap: DEMO_CANDLES_SOFT_ROW_CAP,
          }),
        } satisfies CandlesGroup;
      }),
    )
      .then((groups) => {
        if (mySeq !== candlesSeqRef.current) return;
        setCandlesGroups(groups);
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (mySeq !== candlesSeqRef.current) return;
        setCandlesGroups(null);
        setCandlesError(
          e instanceof Error ? e.message : "Failed to load candlesticks",
        );
      })
      .finally(() => {
        if (mySeq === candlesSeqRef.current) setCandlesLoading(false);
      });

    return () => {
      ac.abort();
    };
  }, [
    activeTab,
    tickers,
    tickersKey,
    markets,
    featured,
    candlesLive,
    candlePeriod,
  ]);

  useEffect(() => {
    if (!candlesLive) return;
    if (activeTab !== "candlesticks" || tickers.length === 0) {
      stopCandlesLive();
      return;
    }

    let cancelled = false;
    let inFlight = false;

    const yesSubByTicker = new Map<string, string>();
    for (const market of markets || []) {
      const t = String(market?.ticker || "").trim().toUpperCase();
      if (!t) continue;
      const yesSub = String(market?.yes_sub_title || "").trim();
      if (yesSub) yesSubByTicker.set(t, yesSub);
    }
    for (const item of featured) {
      const t = String(item?.ticker || "").trim().toUpperCase();
      if (!t || yesSubByTicker.has(t)) continue;
      const yesSub = String(item?.subtitle || "").trim();
      if (yesSub) yesSubByTicker.set(t, yesSub);
    }

    const pollOnce = async () => {
      if (cancelled || inFlight) return;
      const startedAt = candlesLiveStartedAtRef.current;
      if (
        startedAt != null &&
        Date.now() - startedAt >= DEMO_CANDLES_LIVE_DURATION_MS
      ) {
        stopCandlesLive({ limitReached: true });
        return;
      }

      inFlight = true;
      candlesLiveAbortRef.current?.abort();
      const ac = new AbortController();
      candlesLiveAbortRef.current = ac;

      try {
        const previous = candlesGroupsRef.current || [];
        const prevByTicker = new Map(previous.map((g) => [g.ticker, g]));
        const flashRows: CandlesFlashMap = {};

        const endTs = Math.floor(Date.now() / 1000);
        const lookbackSec = 5 * candlePeriod * 60;
        const startTs = endTs - lookbackSec;

        const nextGroups = await Promise.all(
          tickers.map(async (ticker) => {
            const params = new URLSearchParams({
              market_tickers: ticker,
              start_ts: String(startTs),
              end_ts: String(endTs),
              period_interval: String(candlePeriod),
              per_ticker: "1",
            });
            const res = await fetch(
              `/api/integrations/kalshi-live/markets/candlesticks?${params.toString()}`,
              {
                headers: { Accept: "application/json" },
                credentials: "same-origin",
                signal: ac.signal,
              },
            );
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
              throw new Error(
                typeof body?.error === "string"
                  ? body.error
                  : res.status === 429
                    ? "Too many requests — slow down and try again."
                    : `Failed to load candlesticks for ${ticker}`,
              );
            }
            const prevGroup = prevByTicker.get(ticker);
            const incoming = flattenKalshiLiveCandlestickGroups(
              body?.markets,
            ).filter(
              (row) =>
                String(row.market_ticker || "")
                  .trim()
                  .toUpperCase() === ticker,
            );
            const merged = upsertCandlestickRowsByEndPeriodTs(
              prevGroup?.candles || [],
              incoming,
              { softRowCap: DEMO_CANDLES_SOFT_ROW_CAP },
            );
            const flash = buildCandlestickLiveFlashRows(
              prevGroup?.candles || [],
              incoming,
            );
            Object.assign(flashRows, flash);
            return {
              ticker,
              label:
                prevGroup?.label ||
                shortTradeSheetLabel(ticker, tickers, yesSubByTicker.get(ticker)),
              candles: merged,
            } satisfies CandlesGroup;
          }),
        );

        if (cancelled || ac.signal.aborted) return;
        setCandlesGroups(nextGroups);
        setCandlesError(null);
        if (Object.keys(flashRows).length) {
          setCandlesFlash(flashRows);
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (cancelled) return;
        setCandlesError(
          e instanceof Error ? e.message : "Failed to refresh live candlesticks",
        );
      } finally {
        inFlight = false;
      }
    };

    void pollOnce();
    const pollMs =
      tickers.length > 1
        ? DEMO_CANDLES_LIVE_POLL_MS_MULTI
        : DEMO_CANDLES_LIVE_POLL_MS_SINGLE;
    const intervalId = window.setInterval(() => {
      void pollOnce();
    }, pollMs);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      candlesLiveAbortRef.current?.abort();
    };
  }, [
    candlesLive,
    activeTab,
    tickers,
    tickersKey,
    markets,
    featured,
    candlePeriod,
    stopCandlesLive,
  ]);

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

  const activeTradesGroup =
    tradesGroups && tradesGroups.length
      ? tradesGroups[
          Math.min(activeTradesSheetIndex, Math.max(0, tradesGroups.length - 1))
        ]
      : null;

  const activeTrades = activeTradesGroup?.trades ?? null;

  const tradesSheetColumns = useMemo(() => {
    if (!activeTrades?.length) return [] as string[];
    const keys = new Set<string>();
    for (const row of activeTrades) {
      if (!row || typeof row !== "object") continue;
      for (const key of Object.keys(row)) keys.add(key);
    }
    const ordered = TRADES_PREFERRED_COLUMNS.filter((k) => keys.has(k));
    for (const key of keys) {
      if (!ordered.includes(key)) ordered.push(key);
    }
    return ordered;
  }, [activeTrades]);

  const tradesChartSeries = useMemo(
    () =>
      (tradesGroups || []).map((group, index) => {
        const key = `m${index}`;
        const colorToken =
          tradeSeriesColorTokens[key] ?? defaultSeriesColorToken(index);
        return {
          key,
          label: group.label,
          colorToken,
          color: resolveDemoChartColor(colorToken),
          trades: group.trades,
        };
      }),
    [tradesGroups, tradeSeriesColorTokens],
  );

  const tradesLivelineSeries = useMemo(
    () =>
      (tradesGroups || []).map((group, index) => {
        const id = `m${index}`;
        const colorToken =
          tradeSeriesColorTokens[id] ?? defaultSeriesColorToken(index);
        return {
          id,
          label: group.label,
          colorToken,
          color: resolveDemoChartColor(colorToken),
          trades: group.trades,
        };
      }),
    [tradesGroups, tradeSeriesColorTokens],
  );

  useEffect(() => {
    const valid = new Set(tradesChartSeries.map((s) => s.key));
    setHiddenTradeSeriesIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (valid.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
    setTradeSeriesColorTokens((prev) => {
      let changed = false;
      const next: Record<string, DemoChartColorTokenId> = {};
      for (const [id, token] of Object.entries(prev)) {
        if (valid.has(id)) next[id] = token;
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [tradesChartSeries]);

  const toggleTradeSeries = useCallback((id: string) => {
    setHiddenTradeSeriesIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const changeTradeSeriesColor = useCallback(
    (id: string, tokenId: DemoChartColorTokenId) => {
      setTradeSeriesColorTokens((prev) => {
        if (prev[id] === tokenId) return prev;
        return { ...prev, [id]: tokenId };
      });
    },
    [],
  );

  const hasData = Boolean(markets?.length);
  const tradesCount = (tradesGroups || []).reduce(
    (sum, group) => sum + group.trades.length,
    0,
  );
  const hasTrades = tradesCount > 0;
  const orderbookLevelCount = (orderbookGroups || []).reduce(
    (sum, group) => sum + group.levels.length,
    0,
  );
  const hasOrderbook = orderbookLevelCount > 0;
  const candlesCount = (candlesGroups || []).reduce(
    (sum, group) => sum + group.candles.length,
    0,
  );
  const hasCandles = candlesCount > 0;

  const activeOrderbookGroup =
    orderbookGroups && orderbookGroups.length
      ? orderbookGroups[
          Math.min(
            activeOrderbookSheetIndex,
            Math.max(0, orderbookGroups.length - 1),
          )
        ]
      : null;
  const activeOrderbookLevels = activeOrderbookGroup?.levels ?? null;

  const orderbookSheetColumns = useMemo(() => {
    if (!activeOrderbookLevels?.length) return [] as string[];
    const keys = new Set<string>();
    for (const row of activeOrderbookLevels) {
      if (!row || typeof row !== "object") continue;
      for (const key of Object.keys(row)) keys.add(key);
    }
    const ordered = ORDERBOOK_PREFERRED_COLUMNS.filter((k) => keys.has(k));
    for (const key of keys) {
      if (!ordered.includes(key)) ordered.push(key);
    }
    return ordered;
  }, [activeOrderbookLevels]);

  const orderbookFlashKeys = useMemo(
    () => new Set(Object.keys(orderbookFlash)),
    [orderbookFlash],
  );

  const activeCandlesGroup =
    candlesGroups && candlesGroups.length
      ? candlesGroups[
          Math.min(
            activeCandlesSheetIndex,
            Math.max(0, candlesGroups.length - 1),
          )
        ]
      : null;
  const activeCandles = activeCandlesGroup?.candles ?? null;

  const candlesSheetColumns = useMemo(() => {
    if (!activeCandles?.length) return [] as string[];
    const keys = new Set<string>();
    for (const row of activeCandles) {
      if (!row || typeof row !== "object") continue;
      for (const key of Object.keys(row)) keys.add(key);
    }
    const ordered = CANDLES_PREFERRED_COLUMNS.filter((k) => keys.has(k));
    for (const key of keys) {
      if (!ordered.includes(key)) ordered.push(key);
    }
    return ordered;
  }, [activeCandles]);

  const candlesFlashKeys = useMemo(
    () => new Set(Object.keys(candlesFlash)),
    [candlesFlash],
  );

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

  const exportTradesJson = useCallback(() => {
    if (!activeTrades?.length) return;
    const blob = new Blob([JSON.stringify(activeTrades, null, 2)], {
      type: "application/json;charset=utf-8;",
    });
    const suffix = activeTradesGroup?.ticker
      ? `-${activeTradesGroup.ticker}`
      : "";
    downloadBlob(blob, `kalshi-live-trades${suffix}-${Date.now()}.json`);
  }, [activeTrades, activeTradesGroup]);

  const exportTradesCsv = useCallback(() => {
    if (!activeTrades?.length || !tradesSheetColumns.length) return;
    const header = tradesSheetColumns.map(escapeCsv).join(",");
    const rows = activeTrades.map((row) =>
      tradesSheetColumns.map((col) => escapeCsv(cellValue(row[col]))).join(","),
    );
    const csv = [header, ...rows].join("\n");
    const suffix = activeTradesGroup?.ticker
      ? `-${activeTradesGroup.ticker}`
      : "";
    downloadBlob(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
      `kalshi-live-trades${suffix}-${Date.now()}.csv`,
    );
  }, [activeTrades, activeTradesGroup, tradesSheetColumns]);

  const exportTradesXlsx = useCallback(() => {
    if (!tradesGroups?.length) return;
    const wb = XLSX.utils.book_new();
    for (const group of tradesGroups) {
      if (!group.trades.length) continue;
      const keys = new Set<string>();
      for (const row of group.trades) {
        for (const key of Object.keys(row)) keys.add(key);
      }
      const cols = TRADES_PREFERRED_COLUMNS.filter((k) => keys.has(k));
      for (const key of keys) {
        if (!cols.includes(key)) cols.push(key);
      }
      const rows = group.trades.map((row) => {
        const out: Record<string, string> = {};
        for (const col of cols) out[col] = cellValue(row[col]);
        return out;
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      const sheetName = group.ticker.slice(0, 31) || "Trades";
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }
    if (!wb.SheetNames.length) return;
    XLSX.writeFile(wb, `kalshi-live-trades-${Date.now()}.xlsx`);
  }, [tradesGroups]);

  const exportTradesChart = useCallback(
    async (format: "png" | "svg" | "jpg") => {
      const el = tradesChartRef.current;
      if (!el || chartExporting) return;
      setChartExporting(true);
      const opts = {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor:
          typeof window !== "undefined"
            ? getComputedStyle(el).backgroundColor || "#ffffff"
            : "#ffffff",
      };
      const filename = `kalshi-live-trades-chart-${Date.now()}`;
      try {
        if (format === "png") {
          downloadDataUrl(await toPng(el, opts), `${filename}.png`);
        } else if (format === "svg") {
          downloadDataUrl(await toSvg(el, opts), `${filename}.svg`);
        } else {
          downloadDataUrl(
            await toJpeg(el, { ...opts, quality: 0.95 }),
            `${filename}.jpg`,
          );
        }
      } catch (e) {
        console.error("[HubKalshiLiveDemo] chart export failed", e);
      } finally {
        setChartExporting(false);
      }
    },
    [chartExporting],
  );

  const exportOrderbookJson = useCallback(() => {
    if (!activeOrderbookLevels?.length) return;
    const blob = new Blob([JSON.stringify(activeOrderbookLevels, null, 2)], {
      type: "application/json;charset=utf-8;",
    });
    const suffix = activeOrderbookGroup?.ticker
      ? `-${activeOrderbookGroup.ticker}`
      : "";
    downloadBlob(blob, `kalshi-live-orderbook${suffix}-${Date.now()}.json`);
  }, [activeOrderbookLevels, activeOrderbookGroup]);

  const exportOrderbookCsv = useCallback(() => {
    if (!activeOrderbookLevels?.length || !orderbookSheetColumns.length) return;
    const header = orderbookSheetColumns.map(escapeCsv).join(",");
    const rows = activeOrderbookLevels.map((row) =>
      orderbookSheetColumns.map((col) => escapeCsv(cellValue(row[col]))).join(","),
    );
    const csv = [header, ...rows].join("\n");
    const suffix = activeOrderbookGroup?.ticker
      ? `-${activeOrderbookGroup.ticker}`
      : "";
    downloadBlob(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
      `kalshi-live-orderbook${suffix}-${Date.now()}.csv`,
    );
  }, [activeOrderbookLevels, activeOrderbookGroup, orderbookSheetColumns]);

  const exportOrderbookXlsx = useCallback(() => {
    if (!orderbookGroups?.length) return;
    const wb = XLSX.utils.book_new();
    for (const group of orderbookGroups) {
      if (!group.levels.length) continue;
      const keys = new Set<string>();
      for (const row of group.levels) {
        for (const key of Object.keys(row)) keys.add(key);
      }
      const cols = ORDERBOOK_PREFERRED_COLUMNS.filter((k) => keys.has(k));
      for (const key of keys) {
        if (!cols.includes(key)) cols.push(key);
      }
      const rows = group.levels.map((row) => {
        const out: Record<string, string> = {};
        for (const col of cols) out[col] = cellValue(row[col]);
        return out;
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      const sheetName = group.ticker.slice(0, 31) || "Orderbook";
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }
    if (!wb.SheetNames.length) return;
    XLSX.writeFile(wb, `kalshi-live-orderbook-${Date.now()}.xlsx`);
  }, [orderbookGroups]);

  const exportOrderbookChart = useCallback(
    async (format: "png" | "svg" | "jpg") => {
      const el = orderbookChartRef.current;
      if (!el || chartExporting) return;
      setChartExporting(true);
      const opts = {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor:
          typeof window !== "undefined"
            ? getComputedStyle(el).backgroundColor || "#ffffff"
            : "#ffffff",
      };
      const filename = `kalshi-live-orderbook-chart-${Date.now()}`;
      try {
        if (format === "png") {
          downloadDataUrl(await toPng(el, opts), `${filename}.png`);
        } else if (format === "svg") {
          downloadDataUrl(await toSvg(el, opts), `${filename}.svg`);
        } else {
          downloadDataUrl(
            await toJpeg(el, { ...opts, quality: 0.95 }),
            `${filename}.jpg`,
          );
        }
      } catch (e) {
        console.error("[HubKalshiLiveDemo] orderbook chart export failed", e);
      } finally {
        setChartExporting(false);
      }
    },
    [chartExporting],
  );

  const exportCandlesJson = useCallback(() => {
    if (!activeCandles?.length) return;
    const blob = new Blob([JSON.stringify(activeCandles, null, 2)], {
      type: "application/json;charset=utf-8;",
    });
    const suffix = activeCandlesGroup?.ticker
      ? `-${activeCandlesGroup.ticker}`
      : "";
    downloadBlob(blob, `kalshi-live-candlesticks${suffix}-${Date.now()}.json`);
  }, [activeCandles, activeCandlesGroup]);

  const exportCandlesCsv = useCallback(() => {
    if (!activeCandles?.length || !candlesSheetColumns.length) return;
    const header = candlesSheetColumns.map(escapeCsv).join(",");
    const rows = activeCandles.map((row) =>
      candlesSheetColumns.map((col) => escapeCsv(cellValue(row[col]))).join(","),
    );
    const csv = [header, ...rows].join("\n");
    const suffix = activeCandlesGroup?.ticker
      ? `-${activeCandlesGroup.ticker}`
      : "";
    downloadBlob(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
      `kalshi-live-candlesticks${suffix}-${Date.now()}.csv`,
    );
  }, [activeCandles, activeCandlesGroup, candlesSheetColumns]);

  const exportCandlesXlsx = useCallback(() => {
    if (!candlesGroups?.length) return;
    const wb = XLSX.utils.book_new();
    for (const group of candlesGroups) {
      if (!group.candles.length) continue;
      const keys = new Set<string>();
      for (const row of group.candles) {
        for (const key of Object.keys(row)) keys.add(key);
      }
      const cols = CANDLES_PREFERRED_COLUMNS.filter((k) => keys.has(k));
      for (const key of keys) {
        if (!cols.includes(key)) cols.push(key);
      }
      const rows = group.candles.map((row) => {
        const out: Record<string, string> = {};
        for (const col of cols) out[col] = cellValue(row[col]);
        return out;
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      const sheetName = group.ticker.slice(0, 31) || "Candles";
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }
    if (!wb.SheetNames.length) return;
    XLSX.writeFile(wb, `kalshi-live-candlesticks-${Date.now()}.xlsx`);
  }, [candlesGroups]);

  const exportCandlesChart = useCallback(
    async (format: "png" | "svg" | "jpg") => {
      const el = candlesChartRef.current;
      if (!el || chartExporting) return;
      setChartExporting(true);
      const opts = {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor:
          typeof window !== "undefined"
            ? getComputedStyle(el).backgroundColor || "#ffffff"
            : "#ffffff",
      };
      const filename = `kalshi-live-candlesticks-chart-${Date.now()}`;
      try {
        if (format === "png") {
          downloadDataUrl(await toPng(el, opts), `${filename}.png`);
        } else if (format === "svg") {
          downloadDataUrl(await toSvg(el, opts), `${filename}.svg`);
        } else {
          downloadDataUrl(
            await toJpeg(el, { ...opts, quality: 0.95 }),
            `${filename}.jpg`,
          );
        }
      } catch (e) {
        console.error("[HubKalshiLiveDemo] candlesticks chart export failed", e);
      } finally {
        setChartExporting(false);
      }
    },
    [chartExporting],
  );

  const selectFeaturedMarket = useCallback((market: FeaturedMarket) => {
    const t = String(market?.ticker || "").trim().toUpperCase();
    if (!t) return;
    if (market.raw && typeof market.raw === "object") {
      setMarkets([market.raw]);
      setError(null);
      setLoading(false);
    } else {
      setMarkets(null);
      setLoading(true);
      setError(null);
    }
    setTickersValue(t);
    setViewMode("json");
    setActiveTab("metadata");
  }, []);

  const handleTickersChange = useCallback((next: string) => {
    setTickersValue(next);
    const hasSelection = next
      .split(",")
      .some((part) => Boolean(String(part || "").trim()));
    if (!hasSelection) {
      setMarkets(null);
      setError(null);
      setLoading(false);
      setActiveTab("search");
      return;
    }
    // Leave search immediately so the metadata skeleton shows while we fetch.
    setActiveTab("metadata");
    setLoading(true);
    setError(null);
    setMarkets(null);
  }, []);

  useEffect(() => {
    const hasSelection = tickers.length > 0;
    if (hasSelection && !prevHasSelectionRef.current) {
      setActiveTab((prev) => (prev === "search" ? "metadata" : prev));
    }
    if (!hasSelection && prevHasSelectionRef.current) {
      setActiveTab("search");
    }
    prevHasSelectionRef.current = hasSelection;
  }, [tickers.length]);

  // Lock demo shell height to the Natural Language search layout so other tabs don't shrink it.
  useLayoutEffect(() => {
    if (activeTab !== "search") return;
    const el = demoShellRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const update = () => {
      const next = Math.ceil(el.getBoundingClientRect().height);
      if (next <= 0) return;
      setDemoShellMinHeight((prev) => (prev == null ? next : Math.max(prev, next)));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [activeTab, featuredLoading, featured.length]);

  const tabs = useMemo(
    () => [
      {
        id: "search" as const,
        title: "Search",
        description:
          "The best search capabilities available anywhere for Markets, Events and Series",
      },
      {
        id: "metadata" as const,
        title: "Market metadata",
        description:
          "Inspect the full Kalshi market payload — prices, volume, status, and more — as JSON or a sheet.",
        disabled: tickers.length === 0,
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
    [hasData, tickers.length],
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
        <div
          ref={demoShellRef}
          className="flex w-full flex-col gap-4 px-4 py-6 sm:gap-5 sm:px-6 sm:py-8 lg:px-8 lg:py-10"
          style={demoShellMinHeight ? { minHeight: demoShellMinHeight } : undefined}
        >
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

          <div className="grid w-full grid-cols-1 gap-5 py-12 lg:grid-cols-5 lg:gap-6 lg:items-stretch">
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
                      : activeTab === "trades"
                        ? tradesLoading
                        : activeTab === "orderbook"
                          ? orderbookLoading
                          : activeTab === "candlesticks"
                            ? candlesLoading
                            : false
                }
              />
            </div>

            <div className="flex min-h-0 min-w-0 flex-col lg:col-span-4" role="tabpanel">
              {activeTab === "search" ? (
                <div className="flex w-full flex-col gap-4 px-2 sm:px-4 lg:px-6">
                  <MarketTickerSearch
                    value={tickersValue}
                    onChange={handleTickersChange}
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
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span>
                            {featured.length} market{featured.length === 1 ? "" : "s"}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              void loadFeaturedMarkets({
                                excludeTickers: featured.map((m) => m.ticker),
                              })
                            }
                            disabled={featuredLoading || featuredRefreshing}
                            className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                            aria-label="Refresh featured live markets"
                            title="Show different high-volume live markets"
                          >
                            <RefreshCw
                              className={cn(
                                "size-3.5",
                                featuredRefreshing && "animate-spin",
                              )}
                              aria-hidden
                            />
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void loadFeaturedMarkets()}
                          disabled={featuredLoading}
                          className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                          aria-label="Refresh featured live markets"
                          title="Refresh high-volume live markets"
                        >
                          <RefreshCw className="size-3.5" aria-hidden />
                        </button>
                      )}
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
                                <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-black">
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
                  ) : loading ? (
                    viewMode === "json" ? (
                      <JsonSkeleton />
                    ) : (
                      <SheetTableSkeleton rows={8} />
                    )
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
                <div className="flex min-h-0 flex-1 flex-col px-2 sm:px-4 lg:px-6">
                  <div
                    className={cn(
                      "flex min-h-[12rem] flex-1 flex-col overflow-hidden rounded-xl border border-border/70 bg-muted/20",
                      tradesViewMode === "chart" && "min-h-[36rem]",
                    )}
                  >
                    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        Recent trades
                      </p>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {tradesLoading ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Loader2 className="size-3.5 animate-spin" aria-hidden />
                            Loading…
                          </span>
                        ) : tradesGroups ? (
                          <span className="text-xs text-muted-foreground">
                            {tradesCount} trade{tradesCount === 1 ? "" : "s"}
                            {tradesGroups.length > 1
                              ? ` · ${tradesGroups.length} markets`
                              : ""}
                          </span>
                        ) : null}

                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!hasTrades || tradesLoading}
                            onClick={() => {
                              if (tradesLive) return;
                              startTradesLive();
                            }}
                            className={cn(
                              "h-7 gap-1.5 px-2 text-[11px] font-medium text-muted-foreground",
                              tradesLive &&
                                "border-emerald-500/40 bg-emerald-500/10 text-foreground",
                            )}
                            aria-pressed={tradesLive}
                          >
                            <span
                              className={cn(
                                "size-2 shrink-0 rounded-full",
                                tradesLive
                                  ? "bg-emerald-500 animate-pulse"
                                  : "bg-amber-500 animate-pulse",
                              )}
                              aria-hidden
                            />
                            Live
                          </Button>
                          {tradesLive ? (
                            <button
                              type="button"
                              aria-label="Stop live feed"
                              title="Stop live feed"
                              onClick={() => stopTradesLive()}
                              className="inline-flex size-7 items-center justify-center rounded-md border border-border/70 bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                              <span className="size-2.5 rounded-full bg-red-500" aria-hidden />
                            </button>
                          ) : null}
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!hasTrades}
                          onClick={() => setTradesViewMode("chart")}
                          className={cn(
                            "h-7 gap-1.5 px-2 text-[11px] font-medium text-muted-foreground",
                            tradesViewMode === "chart" &&
                              "border-secondary/40 bg-secondary/10 text-foreground",
                          )}
                        >
                          <LineChart className="size-3.5" aria-hidden />
                          Chart
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={!hasTrades || chartExporting}
                              className="h-7 gap-1.5 px-2 text-[11px] font-medium text-muted-foreground"
                            >
                              <Download className="size-3.5" aria-hidden />
                              Export
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-[9.5rem]">
                            {tradesViewMode === "chart" ? (
                              <>
                                <DropdownMenuItem
                                  className="text-xs"
                                  disabled={!hasTrades || chartExporting}
                                  onSelect={() => void exportTradesChart("png")}
                                >
                                  PNG
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-xs"
                                  disabled={!hasTrades || chartExporting}
                                  onSelect={() => void exportTradesChart("svg")}
                                >
                                  SVG
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-xs"
                                  disabled={!hasTrades || chartExporting}
                                  onSelect={() => void exportTradesChart("jpg")}
                                >
                                  JPG
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-xs"
                                  onSelect={() => setLiveEmbedOpen(true)}
                                >
                                  Live embed
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            ) : null}
                            <DropdownMenuItem
                              className="text-xs"
                              disabled={!hasTrades}
                              onSelect={exportTradesJson}
                            >
                              JSON
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-xs"
                              disabled={!hasTrades}
                              onSelect={exportTradesCsv}
                            >
                              CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-xs"
                              disabled={!hasTrades}
                              onSelect={exportTradesXlsx}
                            >
                              XLSX
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <div
                          className="inline-flex h-7 items-center rounded-md border border-border/70 bg-background p-0.5"
                          role="group"
                          aria-label="Trades result view"
                        >
                          <button
                            type="button"
                            disabled={!hasTrades && !tradesLoading}
                            onClick={() => {
                              if (tradesViewMode === "chart") {
                                setTradesViewMode("sheet");
                                return;
                              }
                              setTradesViewMode(
                                tradesViewMode === "json" ? "sheet" : "json",
                              );
                            }}
                            className="inline-flex h-6 items-center gap-1 rounded px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            aria-label={
                              tradesViewMode === "chart"
                                ? "Switch to data sheet"
                                : tradesViewMode === "json"
                                  ? "Switch to sheet view"
                                  : "Switch to JSON view"
                            }
                          >
                            {tradesViewMode === "chart" ? (
                              <>
                                <Table2 className="size-3.5" aria-hidden />
                                Data Sheet
                              </>
                            ) : tradesViewMode === "json" ? (
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

                    <p className="shrink-0 border-b border-border/40 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground text-pretty">
                      {tradesLive ? (
                        <>
                          Live feed is accumulating trades in this session (newest
                          first, duplicates skipped). Demo live pulls pause after 1
                          minute.{" "}
                        </>
                      ) : (
                        <>
                          Only {DEMO_TRADES_LIMIT} most recent trades shown
                          {tickers.length > 1 ? " per market" : ""}.{" "}
                        </>
                      )}
                      <Link
                        href="/#pricing"
                        className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
                      >
                        Sign up
                      </Link>{" "}
                      to get full trades and historical trades all the way from
                      Kalshi launch in 2021.
                    </p>

                    {tradesViewMode !== "chart" &&
                    (tradesGroups?.length || 0) > 1 ? (
                      <div
                        className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-border/40 px-2 py-2 sm:px-3"
                        role="tablist"
                        aria-label="Trade sheets"
                      >
                        {tradesGroups?.map((group, index) => {
                          const selected = index === activeTradesSheetIndex;
                          return (
                            <button
                              key={group.ticker}
                              type="button"
                              role="tab"
                              aria-selected={selected}
                              title={`${group.label} · ${group.ticker}`}
                              onClick={() => setActiveTradesSheetIndex(index)}
                              className={cn(
                                "inline-flex max-w-full items-center rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                                selected
                                  ? "bg-background text-foreground shadow-sm ring-1 ring-border/70"
                                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                              )}
                            >
                              <span className="truncate">{group.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    {tradesError ? (
                      <p className="px-3 py-4 text-sm text-destructive">{tradesError}</p>
                    ) : tradesLoading ? (
                      tradesViewMode === "chart" ? (
                        <ChartSkeleton />
                      ) : tradesViewMode === "json" ? (
                        <JsonSkeleton />
                      ) : (
                        <SheetTableSkeleton rows={8} />
                      )
                    ) : !hasTrades ? (
                      <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                        No recent trades for this market.
                      </p>
                    ) : tradesViewMode === "chart" ? (
                      <div className="flex min-h-0 flex-1 flex-col">
                        {tradesLive ? (
                          <HubKalshiLiveDemoTradesLiveline
                            ref={tradesChartRef}
                            series={tradesLivelineSeries}
                            hiddenSeriesIds={hiddenTradeSeriesIds}
                            onToggleSeries={toggleTradeSeries}
                            onChangeSeriesColor={changeTradeSeriesColor}
                            className="min-h-0 flex-1"
                          />
                        ) : (
                          <HubKalshiLiveDemoTradesChart
                            ref={tradesChartRef}
                            series={tradesChartSeries}
                            hiddenSeriesIds={hiddenTradeSeriesIds}
                            onToggleSeries={toggleTradeSeries}
                            onChangeSeriesColor={changeTradeSeriesColor}
                            className="min-h-0 flex-1"
                          />
                        )}
                      </div>
                    ) : tradesViewMode === "json" ? (
                      <div className="max-h-[28rem] overflow-auto px-3 py-3 font-mono text-[11px] leading-relaxed text-foreground sm:text-xs">
                        <span className="text-muted-foreground">[</span>
                        {(activeTrades || []).map((row, rowIndex) => {
                          const id = tradeRowId(row);
                          const isNew = newTradeIds.has(id);
                          return (
                            <div
                              key={id || rowIndex}
                              className={cn(
                                "rounded-sm px-1 transition-colors duration-500",
                                isNew && "bg-amber-400/25 ring-1 ring-amber-400/40",
                              )}
                            >
                              <pre className="whitespace-pre-wrap break-all">
                                {JSON.stringify(row, null, 2)}
                                {rowIndex < (activeTrades?.length || 0) - 1 ? "," : ""}
                              </pre>
                            </div>
                          );
                        })}
                        <span className="text-muted-foreground">]</span>
                      </div>
                    ) : !activeTrades?.length ? (
                      <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                        No recent trades for this market.
                      </p>
                    ) : (
                      <div className="max-h-[28rem] overflow-auto">
                        <table className="w-max min-w-full border-collapse text-left text-[11px] sm:text-xs">
                          <thead className="sticky top-0 z-[1] bg-muted/80 backdrop-blur">
                            <tr className="border-b border-border/60">
                              {tradesSheetColumns.map((col) => (
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
                            {activeTrades.map((row, rowIndex) => {
                              const id = tradeRowId(row);
                              const isNew = newTradeIds.has(id);
                              return (
                                <tr
                                  key={id || rowIndex}
                                  className={cn(
                                    "border-b border-border/40 last:border-0 transition-colors duration-500",
                                    isNew && "bg-amber-400/25",
                                  )}
                                >
                                  {tradesSheetColumns.map((col) => (
                                    <td
                                      key={`${rowIndex}-${col}`}
                                      className="max-w-[16rem] truncate whitespace-nowrap px-3 py-2 text-foreground"
                                      title={cellValue(row[col])}
                                    >
                                      {cellValue(row[col])}
                                    </td>
                                  ))}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
              {activeTab === "orderbook" ? (
                <div className="flex min-h-0 flex-1 flex-col px-2 sm:px-4 lg:px-6">
                  <div
                    className={cn(
                      "flex min-h-[12rem] flex-1 flex-col overflow-hidden rounded-xl border border-border/70 bg-muted/20",
                      orderbookViewMode === "chart" && "min-h-[36rem]",
                    )}
                  >
                    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        Orderbook
                      </p>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {orderbookLoading ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Loader2 className="size-3.5 animate-spin" aria-hidden />
                            Loading…
                          </span>
                        ) : orderbookGroups ? (
                          <span className="text-xs text-muted-foreground">
                            {orderbookLevelCount} level
                            {orderbookLevelCount === 1 ? "" : "s"}
                            {orderbookGroups.length > 1
                              ? ` · ${orderbookGroups.length} markets`
                              : ""}
                          </span>
                        ) : null}

                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!hasOrderbook || orderbookLoading}
                            onClick={() => {
                              if (orderbookLive) return;
                              startOrderbookLive();
                            }}
                            className={cn(
                              "h-7 gap-1.5 px-2 text-[11px] font-medium text-muted-foreground",
                              orderbookLive &&
                                "border-emerald-500/40 bg-emerald-500/10 text-foreground",
                            )}
                            aria-pressed={orderbookLive}
                          >
                            <span
                              className={cn(
                                "size-2 shrink-0 rounded-full",
                                orderbookLive
                                  ? "bg-emerald-500 animate-pulse"
                                  : "bg-amber-500 animate-pulse",
                              )}
                              aria-hidden
                            />
                            Live
                          </Button>
                          {orderbookLive ? (
                            <button
                              type="button"
                              aria-label="Stop live feed"
                              title="Stop live feed"
                              onClick={() => stopOrderbookLive()}
                              className="inline-flex size-7 items-center justify-center rounded-md border border-border/70 bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                              <span
                                className="size-2.5 rounded-full bg-red-500"
                                aria-hidden
                              />
                            </button>
                          ) : null}
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!hasOrderbook}
                          onClick={() => setOrderbookViewMode("chart")}
                          className={cn(
                            "h-7 gap-1.5 px-2 text-[11px] font-medium text-muted-foreground",
                            orderbookViewMode === "chart" &&
                              "border-secondary/40 bg-secondary/10 text-foreground",
                          )}
                        >
                          <LineChart className="size-3.5" aria-hidden />
                          Chart
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={!hasOrderbook || chartExporting}
                              className="h-7 gap-1.5 px-2 text-[11px] font-medium text-muted-foreground"
                            >
                              <Download className="size-3.5" aria-hidden />
                              Export
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-[9.5rem]">
                            {orderbookViewMode === "chart" ? (
                              <>
                                <DropdownMenuItem
                                  className="text-xs"
                                  disabled={!hasOrderbook || chartExporting}
                                  onSelect={() => void exportOrderbookChart("png")}
                                >
                                  PNG
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-xs"
                                  disabled={!hasOrderbook || chartExporting}
                                  onSelect={() => void exportOrderbookChart("svg")}
                                >
                                  SVG
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-xs"
                                  disabled={!hasOrderbook || chartExporting}
                                  onSelect={() => void exportOrderbookChart("jpg")}
                                >
                                  JPG
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-xs"
                                  onSelect={() => setLiveEmbedOpen(true)}
                                >
                                  Live embed
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            ) : null}
                            <DropdownMenuItem
                              className="text-xs"
                              disabled={!hasOrderbook}
                              onSelect={exportOrderbookJson}
                            >
                              JSON
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-xs"
                              disabled={!hasOrderbook}
                              onSelect={exportOrderbookCsv}
                            >
                              CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-xs"
                              disabled={!hasOrderbook}
                              onSelect={exportOrderbookXlsx}
                            >
                              XLSX
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <div
                          className="inline-flex h-7 items-center rounded-md border border-border/70 bg-background p-0.5"
                          role="group"
                          aria-label="Orderbook result view"
                        >
                          <button
                            type="button"
                            disabled={!hasOrderbook && !orderbookLoading}
                            onClick={() => {
                              if (orderbookViewMode === "chart") {
                                setOrderbookViewMode("sheet");
                                return;
                              }
                              setOrderbookViewMode(
                                orderbookViewMode === "json" ? "sheet" : "json",
                              );
                            }}
                            className="inline-flex h-6 items-center gap-1 rounded px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            aria-label={
                              orderbookViewMode === "chart"
                                ? "Switch to data sheet"
                                : orderbookViewMode === "json"
                                  ? "Switch to sheet view"
                                  : "Switch to JSON view"
                            }
                          >
                            {orderbookViewMode === "chart" ? (
                              <>
                                <Table2 className="size-3.5" aria-hidden />
                                Data Sheet
                              </>
                            ) : orderbookViewMode === "json" ? (
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

                    <p className="shrink-0 border-b border-border/40 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground text-pretty">
                      {orderbookLive ? (
                        <>
                          Live feed replaces the book snapshot each refresh and
                          flashes changed levels. Demo live pulls pause after 1
                          minute.{" "}
                        </>
                      ) : (
                        <>
                          Showing top {DEMO_ORDERBOOK_DEPTH} levels per side
                          {tickers.length > 1 ? " per market" : ""}.{" "}
                        </>
                      )}
                      <Link
                        href="/#pricing"
                        className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
                      >
                        Sign up
                      </Link>{" "}
                      for full depth, continuous live books, and multi-market
                      dashboards.
                    </p>

                    {(orderbookGroups?.length || 0) > 1 ? (
                      <div
                        className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-border/40 px-2 py-2 sm:px-3"
                        role="tablist"
                        aria-label="Orderbook sheets"
                      >
                        {orderbookGroups?.map((group, index) => {
                          const selected = index === activeOrderbookSheetIndex;
                          return (
                            <button
                              key={group.ticker}
                              type="button"
                              role="tab"
                              aria-selected={selected}
                              title={`${group.label} · ${group.ticker}`}
                              onClick={() => setActiveOrderbookSheetIndex(index)}
                              className={cn(
                                "inline-flex max-w-full items-center rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                                selected
                                  ? "bg-background text-foreground shadow-sm ring-1 ring-border/70"
                                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                              )}
                            >
                              <span className="truncate">{group.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    {orderbookError ? (
                      <p className="px-3 py-4 text-sm text-destructive">
                        {orderbookError}
                      </p>
                    ) : orderbookLoading ? (
                      orderbookViewMode === "chart" ? (
                        <ChartSkeleton />
                      ) : orderbookViewMode === "json" ? (
                        <JsonSkeleton />
                      ) : (
                        <SheetTableSkeleton rows={8} />
                      )
                    ) : !hasOrderbook ? (
                      <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                        No orderbook levels for this market.
                      </p>
                    ) : orderbookViewMode === "chart" ? (
                      <div className="flex min-h-0 flex-1 flex-col">
                        <HubKalshiLiveDemoOrderbookChart
                          ref={orderbookChartRef}
                          levels={activeOrderbookLevels || []}
                          flashKeys={orderbookFlashKeys}
                          label={activeOrderbookGroup?.label}
                          className="min-h-0 flex-1"
                        />
                      </div>
                    ) : orderbookViewMode === "json" ? (
                      <div className="max-h-[28rem] overflow-auto px-3 py-3 font-mono text-[11px] leading-relaxed text-foreground sm:text-xs">
                        <span className="text-muted-foreground">[</span>
                        {(activeOrderbookLevels || []).map((row, rowIndex) => {
                          const id = liveOrderbookRowKey(row) || String(rowIndex);
                          const flash = orderbookFlash[id];
                          return (
                            <div
                              key={id}
                              className={cn(
                                "rounded-sm px-1 transition-colors duration-500",
                                flash &&
                                  "bg-amber-400/25 ring-1 ring-amber-400/40",
                              )}
                            >
                              <pre className="whitespace-pre-wrap break-all">
                                {JSON.stringify(row, null, 2)}
                                {rowIndex <
                                (activeOrderbookLevels?.length || 0) - 1
                                  ? ","
                                  : ""}
                              </pre>
                            </div>
                          );
                        })}
                        <span className="text-muted-foreground">]</span>
                      </div>
                    ) : !activeOrderbookLevels?.length ? (
                      <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                        No orderbook levels for this market.
                      </p>
                    ) : (
                      <div className="max-h-[28rem] overflow-auto">
                        <table className="w-max min-w-full border-collapse text-left text-[11px] sm:text-xs">
                          <thead className="sticky top-0 z-[1] bg-muted/80 backdrop-blur">
                            <tr className="border-b border-border/60">
                              {orderbookSheetColumns.map((col) => (
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
                            {activeOrderbookLevels.map((row, rowIndex) => {
                              const id =
                                liveOrderbookRowKey(row) || String(rowIndex);
                              const flash = orderbookFlash[id];
                              return (
                                <tr
                                  key={id}
                                  className={cn(
                                    "border-b border-border/40 last:border-0 transition-colors duration-500",
                                    flash?.isNew && "bg-amber-400/25",
                                  )}
                                >
                                  {orderbookSheetColumns.map((col) => {
                                    const cellLit =
                                      Boolean(flash) &&
                                      (flash?.isNew ||
                                        flash?.columns?.includes(col));
                                    return (
                                      <td
                                        key={`${rowIndex}-${col}`}
                                        className={cn(
                                          "max-w-[16rem] truncate whitespace-nowrap px-3 py-2 text-foreground transition-colors duration-500",
                                          cellLit &&
                                            !flash?.isNew &&
                                            "bg-amber-400/30",
                                        )}
                                        title={cellValue(row[col])}
                                      >
                                        {cellValue(row[col])}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
              {activeTab === "candlesticks" ? (
                <div className="flex min-h-0 flex-1 flex-col px-2 sm:px-4 lg:px-6">
                  <div
                    className={cn(
                      "flex min-h-[12rem] flex-1 flex-col overflow-hidden rounded-xl border border-border/70 bg-muted/20",
                      candlesViewMode === "chart" && "min-h-[36rem]",
                    )}
                  >
                    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Candlesticks
                        </p>
                        <div
                          className="inline-flex h-7 items-center rounded-md border border-border/70 bg-background p-0.5"
                          role="group"
                          aria-label="Candlestick interval"
                        >
                          {(
                            [
                              { label: "Minute", value: 1 },
                              { label: "Hour", value: 60 },
                              { label: "Day", value: 1440 },
                            ] as const
                          ).map(({ label, value }) => (
                            <button
                              key={value}
                              type="button"
                              disabled={candlesLive}
                              onClick={() => {
                                if (candlePeriod === value) return;
                                stopCandlesLive();
                                setCandlePeriod(value);
                                setCandlesGroups(null);
                                setActiveCandlesSheetIndex(0);
                                setCandlesFlash({});
                              }}
                              className={cn(
                                "inline-flex h-6 items-center rounded px-2 text-[11px] font-medium transition-colors",
                                candlePeriod === value
                                  ? "bg-muted text-foreground shadow-sm"
                                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                              )}
                              aria-pressed={candlePeriod === value}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {candlesLoading ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Loader2 className="size-3.5 animate-spin" aria-hidden />
                            Loading…
                          </span>
                        ) : candlesGroups ? (
                          <span className="text-xs text-muted-foreground">
                            {candlesCount} candle{candlesCount === 1 ? "" : "s"}
                            {candlesGroups.length > 1
                              ? ` · ${candlesGroups.length} markets`
                              : ""}
                          </span>
                        ) : null}

                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!hasCandles || candlesLoading}
                            onClick={() => {
                              if (candlesLive) return;
                              startCandlesLive();
                            }}
                            className={cn(
                              "h-7 gap-1.5 px-2 text-[11px] font-medium text-muted-foreground",
                              candlesLive &&
                                "border-emerald-500/40 bg-emerald-500/10 text-foreground",
                            )}
                            aria-pressed={candlesLive}
                          >
                            <span
                              className={cn(
                                "size-2 shrink-0 rounded-full",
                                candlesLive
                                  ? "bg-emerald-500 animate-pulse"
                                  : "bg-amber-500 animate-pulse",
                              )}
                              aria-hidden
                            />
                            Live
                          </Button>
                          {candlesLive ? (
                            <button
                              type="button"
                              aria-label="Stop live feed"
                              title="Stop live feed"
                              onClick={() => stopCandlesLive()}
                              className="inline-flex size-7 items-center justify-center rounded-md border border-border/70 bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                              <span className="size-2.5 rounded-full bg-red-500" aria-hidden />
                            </button>
                          ) : null}
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!hasCandles}
                          onClick={() => setCandlesViewMode("chart")}
                          className={cn(
                            "h-7 gap-1.5 px-2 text-[11px] font-medium text-muted-foreground",
                            candlesViewMode === "chart" &&
                              "border-secondary/40 bg-secondary/10 text-foreground",
                          )}
                        >
                          <LineChart className="size-3.5" aria-hidden />
                          Chart
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={!hasCandles || chartExporting}
                              className="h-7 gap-1.5 px-2 text-[11px] font-medium text-muted-foreground"
                            >
                              <Download className="size-3.5" aria-hidden />
                              Export
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-[9.5rem]">
                            {candlesViewMode === "chart" ? (
                              <>
                                <DropdownMenuItem
                                  className="text-xs"
                                  disabled={!hasCandles || chartExporting}
                                  onSelect={() => void exportCandlesChart("png")}
                                >
                                  PNG
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-xs"
                                  disabled={!hasCandles || chartExporting}
                                  onSelect={() => void exportCandlesChart("svg")}
                                >
                                  SVG
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-xs"
                                  disabled={!hasCandles || chartExporting}
                                  onSelect={() => void exportCandlesChart("jpg")}
                                >
                                  JPG
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-xs"
                                  onSelect={() => setLiveEmbedOpen(true)}
                                >
                                  Live embed
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            ) : null}
                            <DropdownMenuItem
                              className="text-xs"
                              disabled={!hasCandles}
                              onSelect={exportCandlesJson}
                            >
                              JSON
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-xs"
                              disabled={!hasCandles}
                              onSelect={exportCandlesCsv}
                            >
                              CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-xs"
                              disabled={!hasCandles}
                              onSelect={exportCandlesXlsx}
                            >
                              XLSX
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <div
                          className="inline-flex h-7 items-center rounded-md border border-border/70 bg-background p-0.5"
                          role="group"
                          aria-label="Candlesticks result view"
                        >
                          <button
                            type="button"
                            disabled={!hasCandles && !candlesLoading}
                            onClick={() => {
                              if (candlesViewMode === "chart") {
                                setCandlesViewMode("sheet");
                                return;
                              }
                              setCandlesViewMode(
                                candlesViewMode === "json" ? "sheet" : "json",
                              );
                            }}
                            className="inline-flex h-6 items-center gap-1 rounded px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            aria-label={
                              candlesViewMode === "chart"
                                ? "Switch to data sheet"
                                : candlesViewMode === "json"
                                  ? "Switch to sheet view"
                                  : "Switch to JSON view"
                            }
                          >
                            {candlesViewMode === "chart" ? (
                              <>
                                <Table2 className="size-3.5" aria-hidden />
                                Data Sheet
                              </>
                            ) : candlesViewMode === "json" ? (
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

                    <p className="shrink-0 border-b border-border/40 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground text-pretty">
                      {candlesLive ? (
                        <>
                          Live feed upserts candlesticks by period end and flashes
                          changed bars. Demo live pulls pause after 1 minute.{" "}
                        </>
                      ) : (
                        <>
                          Showing{" "}
                          {candlePeriod === 1
                            ? "minute"
                            : candlePeriod === 60
                              ? "hour"
                              : "day"}{" "}
                          candles for the last{" "}
                          {candlePeriod === 1
                            ? "2 hours"
                            : candlePeriod === 60
                              ? "3 days"
                              : "60 days"}
                          {tickers.length > 1 ? " per market" : ""}.{" "}
                        </>
                      )}
                      <Link
                        href="/#pricing"
                        className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
                      >
                        Sign up
                      </Link>{" "}
                      for full candlestick history, continuous live updates, and
                      multi-market dashboards.
                    </p>

                    {(candlesGroups?.length || 0) > 1 ? (
                      <div
                        className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-border/40 px-2 py-2 sm:px-3"
                        role="tablist"
                        aria-label="Candlestick sheets"
                      >
                        {candlesGroups?.map((group, index) => {
                          const selected = index === activeCandlesSheetIndex;
                          return (
                            <button
                              key={group.ticker}
                              type="button"
                              role="tab"
                              aria-selected={selected}
                              title={`${group.label} · ${group.ticker}`}
                              onClick={() => setActiveCandlesSheetIndex(index)}
                              className={cn(
                                "inline-flex max-w-full items-center rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                                selected
                                  ? "bg-background text-foreground shadow-sm ring-1 ring-border/70"
                                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                              )}
                            >
                              <span className="truncate">{group.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    {candlesError ? (
                      <p className="px-3 py-4 text-sm text-destructive">
                        {candlesError}
                      </p>
                    ) : candlesLoading ? (
                      candlesViewMode === "chart" ? (
                        <ChartSkeleton />
                      ) : candlesViewMode === "json" ? (
                        <JsonSkeleton />
                      ) : (
                        <SheetTableSkeleton rows={8} />
                      )
                    ) : !hasCandles ? (
                      <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                        No candlesticks for this market.
                      </p>
                    ) : candlesViewMode === "chart" ? (
                      <div className="flex min-h-0 flex-1 flex-col">
                        <HubKalshiLiveDemoCandlesticksChart
                          ref={candlesChartRef}
                          candles={activeCandlesGroup?.candles || []}
                          periodInterval={candlePeriod}
                          flashKeys={candlesFlashKeys}
                          label={activeCandlesGroup?.label}
                          className="min-h-0 flex-1"
                        />
                      </div>
                    ) : candlesViewMode === "json" ? (
                      <div className="max-h-[28rem] overflow-auto px-3 py-3 font-mono text-[11px] leading-relaxed text-foreground sm:text-xs">
                        <span className="text-muted-foreground">[</span>
                        {(activeCandles || []).map((row, rowIndex) => {
                          const id = liveSheetRowKey(row) || String(rowIndex);
                          const flash = candlesFlash[id];
                          return (
                            <div
                              key={id}
                              className={cn(
                                "rounded-sm px-1 transition-colors duration-500",
                                flash &&
                                  "bg-amber-400/25 ring-1 ring-amber-400/40",
                              )}
                            >
                              <pre className="whitespace-pre-wrap break-all">
                                {JSON.stringify(row, null, 2)}
                                {rowIndex < (activeCandles?.length || 0) - 1
                                  ? ","
                                  : ""}
                              </pre>
                            </div>
                          );
                        })}
                        <span className="text-muted-foreground">]</span>
                      </div>
                    ) : !activeCandles?.length ? (
                      <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                        No candlesticks for this market.
                      </p>
                    ) : (
                      <div className="max-h-[28rem] overflow-auto">
                        <table className="w-max min-w-full border-collapse text-left text-[11px] sm:text-xs">
                          <thead className="sticky top-0 z-[1] bg-muted/80 backdrop-blur">
                            <tr className="border-b border-border/60">
                              {candlesSheetColumns.map((col) => (
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
                            {activeCandles.map((row, rowIndex) => {
                              const id =
                                liveSheetRowKey(row) || String(rowIndex);
                              const flash = candlesFlash[id];
                              return (
                                <tr
                                  key={id}
                                  className={cn(
                                    "border-b border-border/40 last:border-0 transition-colors duration-500",
                                    flash?.isNew && "bg-amber-400/25",
                                  )}
                                >
                                  {candlesSheetColumns.map((col) => {
                                    const cellLit =
                                      Boolean(flash) &&
                                      (flash?.isNew ||
                                        flash?.columns?.includes(col));
                                    return (
                                      <td
                                        key={`${rowIndex}-${col}`}
                                        className={cn(
                                          "max-w-[16rem] truncate whitespace-nowrap px-3 py-2 text-foreground transition-colors duration-500",
                                          cellLit &&
                                            !flash?.isNew &&
                                            "bg-amber-400/30",
                                        )}
                                        title={cellValue(row[col])}
                                      >
                                        {cellValue(row[col])}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
              {activeTab === "event_forecast" ? (
                <div className="px-2 sm:px-4 lg:px-6">{comingSoonPanel("Event forecast")}</div>
              ) : null}
            </div>
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground text-pretty">
            This preview is limited to search, market metadata, the{" "}
            {DEMO_TRADES_LIMIT} most recent trades, orderbook depth (
            {DEMO_ORDERBOOK_DEPTH} levels/side), and candlesticks (minute/hour/day
            intervals).{" "}
            <Link
              href="/#pricing"
              className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
            >
              Register for full access
            </Link>{" "}
            to pull full trade history, order books, candlesticks, charts, exports,
            and dashboards.
          </p>
        </div>
      </HubKalshiLiveDemoMockup>

      <Dialog open={liveEmbedOpen} onOpenChange={setLiveEmbedOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Live embed</DialogTitle>
            <DialogDescription>
              Live chart embeds are only available for subscribers. Upgrade to
              publish and embed updating Kalshi charts on your site.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLiveEmbedOpen(false)}
            >
              Close
            </Button>
            <Button type="button" asChild>
              <Link href="/#pricing" onClick={() => setLiveEmbedOpen(false)}>
                Get Access Now
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={liveLimitOpen} onOpenChange={setLiveLimitOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Demo live feed paused</DialogTitle>
            <DialogDescription>
              This preview streams live trades, orderbooks, and candlesticks for 1
              minute so you can feel the product. Upgrade for unlimited live pulls,
              deeper history, custom refresh rates, multi-market dashboards, and
              full export/embed controls.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLiveLimitOpen(false)}
            >
              Close
            </Button>
            <Button type="button" asChild>
              <Link href="/#pricing" onClick={() => setLiveLimitOpen(false)}>
                Get Access Now
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
