"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { HubInPageLink } from "@/components/hubs/HubCtaButton";
import { Braces, Download, LineChart, Loader2, RefreshCw, Table2 } from "lucide-react";
import { toJpeg, toPng, toSvg } from "html-to-image";
import * as XLSX from "xlsx";

import {
  HubKalshiLiveDemoTabs,
  type HubKalshiLiveDemoTabDef,
} from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveDemoTabs";
import { HubKalshiLiveDemoTradesLiveline } from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveDemoTradesLiveline";
import {
  defaultSeriesColorToken,
  type DemoChartColorTokenId,
  resolveDemoChartColor,
} from "@/components/hubs/kalshiLiveDemo/demoChartColors";
import { HubPolymarketLiveOrderbookDepthChart } from "@/components/hubs/polymarketLiveDemo/HubPolymarketLiveOrderbookDepthChart";
import {
  useHubPolymarketLiveDemo,
  type HubPolymarketLiveDemoMarket,
} from "@/components/hubs/polymarketLiveDemo/HubPolymarketLiveDemoSelection";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { openPolymarketQuoteSocket } from "@/lib/polymarketLive/openPolymarketMarketSocket";
import { cn } from "@/lib/utils";

type SpreadTabId = "best-bid" | "best-ask" | "spread" | "liquidity" | "orderbook";
type ViewMode = "chart" | "sheet" | "json";

type SeriesSpec = {
  id: string;
  tokenId: string;
  label: string;
  outcome: string;
};

type QuoteTick = {
  asset_id: string;
  best_bid: number | null;
  best_ask: number | null;
  spread: number | null;
  bid_size: number | null;
  ask_size: number | null;
  time: string;
  timestamp: string;
  source: string;
};

type BookSnapshot = {
  asset_id: string;
  bids: { price: number; size: number }[];
  asks: { price: number; size: number }[];
  time: string;
  timestamp: string;
};

const MAX_QUOTE_POINTS = 240;
const SEARCH_HREF = "#find-polymarket-markets";
const BOOK_POLL_MS = 12_000;

const SPREAD_TABS: HubKalshiLiveDemoTabDef[] = [
  {
    id: "best-bid",
    title: "Best Bid",
    description: "The highest current price a buyer is offering.",
  },
  {
    id: "best-ask",
    title: "Best Ask",
    description: "The lowest current price a seller is offering.",
  },
  {
    id: "spread",
    title: "Spread",
    description: "The difference between the best ask and best bid.",
  },
  {
    id: "liquidity",
    title: "Liquidity",
    description: "Size available at the best bid and best ask.",
  },
  {
    id: "orderbook",
    title: "Order book snapshot",
    description: "Full bid and ask depth from the CLOB book endpoint.",
    separatorBefore: true,
  },
];

const QUOTE_SHEET_COLUMNS = [
  "market_title",
  "created_time",
  "best_bid",
  "best_ask",
  "spread",
  "bid_size",
  "ask_size",
  "asset_id",
  "source",
];

const BOOK_SHEET_COLUMNS = [
  "market_title",
  "side",
  "price",
  "size",
  "asset_id",
  "time",
];

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

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

function priceToCents(price: number | null | undefined): number | null {
  if (price == null || !Number.isFinite(price)) return null;
  return price <= 1 ? Math.round(price * 100) : Math.round(price);
}

function formatCents(price: number | null | undefined): string {
  const cents = priceToCents(price);
  return cents == null ? "—" : `${cents}¢`;
}

function formatQty(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      notation: value >= 10_000 ? "compact" : "standard",
      maximumFractionDigits: value >= 10_000 ? 1 : 0,
    }).format(value);
  } catch {
    return String(Math.round(value));
  }
}

function parseLevels(raw: unknown): { price: number; size: number }[] {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value
    .map((level) => {
      if (Array.isArray(level)) {
        return { price: Number(level[0]), size: Number(level[1]) };
      }
      if (level && typeof level === "object") {
        const row = level as { price?: unknown; size?: unknown };
        return { price: Number(row.price), size: Number(row.size) };
      }
      return { price: NaN, size: NaN };
    })
    .filter((row) => Number.isFinite(row.price) && Number.isFinite(row.size) && row.size >= 0);
}

function bookAssetId(book: Record<string, unknown>, fallback = ""): string {
  return String(
    book.asset_id || book.assetId || book.token_id || book.tokenId || fallback,
  ).trim();
}

function quoteFromBook(book: Record<string, unknown>, fallbackId = ""): {
  quote: QuoteTick;
  snapshot: BookSnapshot;
} {
  const bidsAsc = parseLevels(book.bids).sort((a, b) => a.price - b.price);
  const asksAsc = parseLevels(book.asks).sort((a, b) => a.price - b.price);
  const bestBid = bidsAsc[bidsAsc.length - 1];
  const bestAsk = asksAsc[0];
  const assetId = bookAssetId(book, fallbackId);
  const rawTs = Number(book.timestamp);
  const ms = Number.isFinite(rawTs) ? (rawTs < 1e12 ? rawTs * 1000 : rawTs) : Date.now();
  const time = new Date(ms).toISOString();
  const best_bid = bestBid ? bestBid.price : null;
  const best_ask = bestAsk ? bestAsk.price : null;
  return {
    quote: {
      asset_id: assetId,
      best_bid,
      best_ask,
      spread: best_bid != null && best_ask != null ? best_ask - best_bid : null,
      bid_size: bestBid?.size ?? null,
      ask_size: bestAsk?.size ?? null,
      time,
      timestamp: String(ms),
      source: "rest",
    },
    snapshot: {
      asset_id: assetId,
      bids: [...bidsAsc].reverse(),
      asks: asksAsc,
      time,
      timestamp: String(ms),
    },
  };
}

function appendQuote(prev: QuoteTick[], next: QuoteTick, max: number): QuoteTick[] {
  const last = prev[prev.length - 1];
  if (
    last &&
    last.best_bid === next.best_bid &&
    last.best_ask === next.best_ask &&
    last.spread === next.spread &&
    last.bid_size === next.bid_size &&
    last.ask_size === next.ask_size
  ) {
    return prev;
  }
  return [...prev, next].slice(-max);
}

function outcomePairsFromMarket(
  market: HubPolymarketLiveDemoMarket,
): { tokenId: string; outcome: string }[] {
  const rawPairs = Array.isArray(market.outcomePairs) ? market.outcomePairs : [];
  if (rawPairs.length) {
    return rawPairs
      .map((pair) => {
        if (!pair || typeof pair !== "object") return null;
        const item = pair as { tokenId?: string; outcome?: string };
        const tokenId = String(item.tokenId || "").trim();
        if (!tokenId) return null;
        return {
          tokenId,
          outcome: String(item.outcome || "").trim() || "Outcome",
        };
      })
      .filter(Boolean) as { tokenId: string; outcome: string }[];
  }
  const tokenIds = Array.isArray(market.tokenIds)
    ? market.tokenIds.map((id) => String(id).trim()).filter(Boolean)
    : [];
  const outcomes = Array.isArray(market.outcomes)
    ? market.outcomes.map((name) => String(name).trim())
    : [];
  return tokenIds.map((tokenId, index) => ({
    tokenId,
    outcome:
      outcomes[index] ||
      (index === 0 ? "Yes" : index === 1 ? "No" : `Outcome ${index + 1}`),
  }));
}

function seriesSpecsFromMarkets(markets: HubPolymarketLiveDemoMarket[]): SeriesSpec[] {
  const multiMarket = markets.length > 1;
  const usedLabels = new Map<string, number>();
  const out: SeriesSpec[] = [];
  for (const market of markets) {
    const title =
      String(market.title || market.slug || market.id || "Market").trim() || "Market";
    for (const pair of outcomePairsFromMarket(market)) {
      const base = multiMarket ? `${title} · ${pair.outcome}` : pair.outcome;
      const count = (usedLabels.get(base) || 0) + 1;
      usedLabels.set(base, count);
      out.push({
        id: pair.tokenId,
        tokenId: pair.tokenId,
        outcome: pair.outcome,
        label: count > 1 ? `${base} (${count})` : base,
      });
    }
  }
  return out;
}

function colorTokenForSpec(spec: SeriesSpec, index: number): DemoChartColorTokenId {
  const outcome = spec.outcome.toLowerCase();
  if (outcome === "yes") return "chart-3";
  if (outcome === "no") return "chart-1";
  return defaultSeriesColorToken(index);
}

function objectList(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    if (payload.length === 1 && Array.isArray(payload[0])) {
      return (payload[0] as unknown[]).filter(
        (row) => row && typeof row === "object",
      ) as Record<string, unknown>[];
    }
    return payload.filter((row) => row && typeof row === "object") as Record<
      string,
      unknown
    >[];
  }
  return payload && typeof payload === "object" ? [payload as Record<string, unknown>] : [];
}

async function fetchOrderBooks(
  tokenIds: string[],
  signal?: AbortSignal,
): Promise<Record<string, unknown>[]> {
  const res = await fetch("/api/integrations/polymarket?query=getOrderBooks", {
    method: "POST",
    credentials: "same-origin",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(tokenIds.map((token_id) => ({ token_id }))),
    signal,
  });
  const payload = await res.json().catch(() => ([]));
  if (!res.ok) {
    throw new Error(
      typeof payload?.message === "string"
        ? payload.message
        : typeof payload?.error === "string"
          ? payload.error
          : "Failed to load order books",
    );
  }
  return objectList(payload);
}

function quoteMetric(quote: QuoteTick, tab: SpreadTabId): number | null {
  if (tab === "best-bid") return quote.best_bid;
  if (tab === "best-ask") return quote.best_ask;
  if (tab === "spread") return quote.spread;
  return null;
}

function toPriceRow(
  quote: QuoteTick,
  spec: SeriesSpec,
  tab: SpreadTabId,
): Record<string, unknown> | null {
  const value = quoteMetric(quote, tab);
  if (value == null || !Number.isFinite(value)) return null;
  return {
    market_title: spec.label,
    asset_id: spec.tokenId,
    created_time: quote.time,
    time: quote.time,
    timestamp: quote.timestamp,
    yes_price_dollars: value,
    best_bid: quote.best_bid,
    best_ask: quote.best_ask,
    spread: quote.spread,
    bid_size: quote.bid_size,
    ask_size: quote.ask_size,
    source: quote.source,
  };
}

function parseSizeValue(row: Record<string, unknown>): number | null {
  const raw = row.value ?? row.size;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function ChartSkeleton() {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-3 px-3 py-3" aria-hidden>
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
        </div>
      </div>
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

function SheetTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-2 p-3" aria-hidden>
      <div className="h-8 w-full rounded bg-muted/80" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-2">
          <div className="h-7 w-[18%] rounded bg-muted/70" />
          <div className="h-7 w-[22%] rounded bg-muted/60" />
          <div className="h-7 flex-1 rounded bg-muted/50" />
        </div>
      ))}
    </div>
  );
}

function QuoteStrip({
  specs,
  latestByToken,
}: {
  specs: SeriesSpec[];
  latestByToken: Record<string, QuoteTick | undefined>;
}) {
  if (!specs.length) return null;
  return (
    <div className="grid shrink-0 gap-2 border-b border-border/50 px-3 py-2 sm:grid-cols-2">
      {specs.map((spec) => {
        const quote = latestByToken[spec.tokenId];
        return (
          <div
            key={spec.id}
            className="rounded-md border border-border/50 bg-background/70 px-3 py-2"
          >
            <p className="text-[11px] font-semibold tracking-tight text-foreground">
              {spec.label}
            </p>
            <p className="mt-1 font-mono text-[11px] tabular-nums leading-relaxed text-foreground">
              <span className="text-muted-foreground">Bid </span>
              {formatCents(quote?.best_bid)}
              <span className="text-muted-foreground"> × {formatQty(quote?.bid_size)}</span>
              <span className="text-muted-foreground"> · Ask </span>
              {formatCents(quote?.best_ask)}
              <span className="text-muted-foreground"> × {formatQty(quote?.ask_size)}</span>
              <span className="text-muted-foreground"> · Spread </span>
              {formatCents(quote?.spread)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function HubPolymarketLiveSpreadDemo({
  heading,
  helper,
  placeholder,
  panelMode = false,
  lockedTab,
}: {
  heading?: string;
  helper?: string;
  placeholder?: string;
  panelMode?: boolean;
  lockedTab?: SpreadTabId;
}) {
  const selection = useHubPolymarketLiveDemo();
  const markets = selection?.markets ?? [];
  const seriesSpecs = useMemo(() => seriesSpecsFromMarkets(markets), [markets]);
  const marketsKey = seriesSpecs.map((spec) => spec.tokenId).join(",");
  const hasSelection = seriesSpecs.length > 0;

  const [activeTab, setActiveTab] = useState<SpreadTabId>(lockedTab || "best-bid");
  const resolvedTab = lockedTab || activeTab;
  const [viewMode, setViewMode] = useState<ViewMode>("chart");
  const [quotesByToken, setQuotesByToken] = useState<Record<string, QuoteTick[]>>({});
  const [booksByToken, setBooksByToken] = useState<Record<string, BookSnapshot>>({});
  const [bookTokenId, setBookTokenId] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socketLive, setSocketLive] = useState(false);
  const [livePaused, setLivePaused] = useState(false);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const [chartKey, setChartKey] = useState(0);
  const [chartExporting, setChartExporting] = useState(false);
  const [hiddenSeriesIds, setHiddenSeriesIds] = useState<Set<string>>(() => new Set());
  const [seriesColorTokens, setSeriesColorTokens] = useState<
    Record<string, DemoChartColorTokenId>
  >({});

  const rootRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const socketStopRef = useRef<(() => void) | null>(null);
  const booksAbortRef = useRef<AbortController | null>(null);

  const pollingActive = hasSelection && inView && tabVisible && !livePaused;
  const liveTab = resolvedTab !== "orderbook";

  const stopSocket = useCallback(() => {
    socketStopRef.current?.();
    socketStopRef.current = null;
    setSocketLive(false);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => setInView(Boolean(entry?.isIntersecting)),
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onVis = () => setTabVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    setQuotesByToken({});
    setBooksByToken({});
    setError(null);
    setLivePaused(false);
    setHiddenSeriesIds(new Set());
    setSeriesColorTokens({});
    setChartKey((k) => k + 1);
    setBookTokenId(marketsKey.split(",")[0] || "");
    if (!hasSelection) {
      setLoading(false);
      stopSocket();
    }
  }, [marketsKey, hasSelection, stopSocket]);

  const ingestBooks = useCallback(
    (books: Record<string, unknown>[], { replaceSnapshot }: { replaceSnapshot: boolean }) => {
      const titleByToken = new Map(seriesSpecs.map((spec) => [spec.tokenId, spec.id]));
      setQuotesByToken((prev) => {
        const next = { ...prev };
        for (const spec of seriesSpecs) {
          const book =
            books.find((row) => bookAssetId(row, spec.tokenId) === spec.tokenId) ||
            books.find((row) => bookAssetId(row) === spec.tokenId);
          if (!book) continue;
          const { quote } = quoteFromBook(book, spec.tokenId);
          if (!titleByToken.has(quote.asset_id)) continue;
          next[spec.tokenId] = appendQuote(next[spec.tokenId] || [], quote, MAX_QUOTE_POINTS);
        }
        return next;
      });
      if (replaceSnapshot) {
        const nextBooks: Record<string, BookSnapshot> = {};
        for (const spec of seriesSpecs) {
          const book =
            books.find((row) => bookAssetId(row, spec.tokenId) === spec.tokenId) ||
            books.find((row) => bookAssetId(row) === spec.tokenId);
          if (!book) continue;
          nextBooks[spec.tokenId] = quoteFromBook(book, spec.tokenId).snapshot;
        }
        setBooksByToken(nextBooks);
      }
    },
    [seriesSpecs],
  );

  const loadBooks = useCallback(
    async (opts: { initial?: boolean; replaceSnapshot: boolean; silent?: boolean }) => {
      if (!seriesSpecs.length) return;
      const ac = new AbortController();
      if (!opts.silent) {
        booksAbortRef.current?.abort();
        booksAbortRef.current = ac;
      }
      if (opts.initial) {
        setLoading(true);
        setError(null);
      } else if (!opts.silent) {
        setRefreshing(true);
      }
      try {
        const books = await fetchOrderBooks(
          seriesSpecs.map((spec) => spec.tokenId),
          ac.signal,
        );
        if (ac.signal.aborted) return;
        ingestBooks(books, { replaceSnapshot: opts.replaceSnapshot });
        setError(null);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (ac.signal.aborted) return;
        if (!opts.silent) {
          setError(err instanceof Error ? err.message : "Failed to load quotes");
        }
      } finally {
        if (!ac.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [ingestBooks, seriesSpecs],
  );

  useEffect(() => {
    if (!hasSelection) return undefined;
    void loadBooks({ initial: true, replaceSnapshot: true });
    return () => booksAbortRef.current?.abort();
  }, [hasSelection, loadBooks, marketsKey]);

  useEffect(() => {
    if (!pollingActive) return undefined;
    const timer = window.setInterval(() => {
      void loadBooks({ replaceSnapshot: false, silent: true });
    }, BOOK_POLL_MS);
    return () => window.clearInterval(timer);
  }, [loadBooks, pollingActive]);

  useEffect(() => {
    stopSocket();
    if (!pollingActive) return undefined;
    const allowed = new Set(seriesSpecs.map((spec) => spec.tokenId));
    socketStopRef.current = openPolymarketQuoteSocket({
      assetIds: seriesSpecs.map((spec) => spec.tokenId),
      onStatus: (status: "open" | "closed" | "error") => {
        setSocketLive(status === "open");
      },
      onQuote: (row) => {
        const tokenId = String(row.asset_id || "");
        if (!allowed.has(tokenId)) return;
        const quote: QuoteTick = {
          asset_id: tokenId,
          best_bid: row.best_bid,
          best_ask: row.best_ask,
          spread: row.spread,
          bid_size: row.bid_size,
          ask_size: row.ask_size,
          time: row.time,
          timestamp: row.timestamp,
          source: row.source,
        };
        setQuotesByToken((prev) => ({
          ...prev,
          [tokenId]: appendQuote(prev[tokenId] || [], quote, MAX_QUOTE_POINTS),
        }));
      },
    });
    return () => {
      stopSocket();
    };
  }, [pollingActive, seriesSpecs, stopSocket, chartKey]);

  const latestByToken = useMemo(() => {
    const out: Record<string, QuoteTick | undefined> = {};
    for (const spec of seriesSpecs) {
      const ticks = quotesByToken[spec.tokenId] || [];
      out[spec.tokenId] = ticks[ticks.length - 1];
    }
    return out;
  }, [quotesByToken, seriesSpecs]);

  const activeBook = booksByToken[bookTokenId] || booksByToken[seriesSpecs[0]?.tokenId || ""];
  const activeBookSpec =
    seriesSpecs.find((spec) => spec.tokenId === (activeBook?.asset_id || bookTokenId)) ||
    seriesSpecs[0];

  const priceSeries = useMemo(() => {
    if (resolvedTab === "orderbook" || resolvedTab === "liquidity") return [];
    return seriesSpecs.map((spec, index) => {
      const colorToken = seriesColorTokens[spec.id] ?? colorTokenForSpec(spec, index);
      const trades = (quotesByToken[spec.tokenId] || [])
        .map((quote) => toPriceRow(quote, spec, resolvedTab))
        .filter(Boolean) as Record<string, unknown>[];
      return {
        key: spec.id,
        id: spec.id,
        label: spec.label,
        colorToken,
        color: resolveDemoChartColor(colorToken),
        trades,
      };
    });
  }, [resolvedTab, quotesByToken, seriesColorTokens, seriesSpecs]);

  const liquiditySeries = useMemo(() => {
    if (resolvedTab !== "liquidity") return [];
    const out: {
      key: string;
      id: string;
      label: string;
      colorToken: DemoChartColorTokenId;
      color: string;
      trades: Record<string, unknown>[];
    }[] = [];
    seriesSpecs.forEach((spec, index) => {
      const bidToken: DemoChartColorTokenId =
        seriesColorTokens[`${spec.id}:bid`] ?? (index === 0 ? "chart-3" : "chart-2");
      const askToken: DemoChartColorTokenId =
        seriesColorTokens[`${spec.id}:ask`] ?? (index === 0 ? "chart-1" : "chart-4");
      const ticks = quotesByToken[spec.tokenId] || [];
      out.push({
        key: `${spec.id}:bid`,
        id: `${spec.id}:bid`,
        label: `${spec.label} bid size`,
        colorToken: bidToken,
        color: resolveDemoChartColor(bidToken),
        trades: ticks
          .filter((quote) => quote.bid_size != null && Number.isFinite(quote.bid_size))
          .map((quote) => ({
            market_title: spec.label,
            asset_id: spec.tokenId,
            created_time: quote.time,
            time: quote.time,
            timestamp: quote.timestamp,
            value: quote.bid_size,
            size: quote.bid_size,
            side: "BUY",
            best_bid: quote.best_bid,
            best_ask: quote.best_ask,
            bid_size: quote.bid_size,
            ask_size: quote.ask_size,
            source: quote.source,
          })),
      });
      out.push({
        key: `${spec.id}:ask`,
        id: `${spec.id}:ask`,
        label: `${spec.label} ask size`,
        colorToken: askToken,
        color: resolveDemoChartColor(askToken),
        trades: ticks
          .filter((quote) => quote.ask_size != null && Number.isFinite(quote.ask_size))
          .map((quote) => ({
            market_title: spec.label,
            asset_id: spec.tokenId,
            created_time: quote.time,
            time: quote.time,
            timestamp: quote.timestamp,
            value: quote.ask_size,
            size: quote.ask_size,
            side: "SELL",
            best_bid: quote.best_bid,
            best_ask: quote.best_ask,
            bid_size: quote.bid_size,
            ask_size: quote.ask_size,
            source: quote.source,
          })),
      });
    });
    return out;
  }, [resolvedTab, quotesByToken, seriesColorTokens, seriesSpecs]);

  const bookRows = useMemo(() => {
    if (!activeBook || !activeBookSpec) return [];
    const title = activeBookSpec.label;
    return [
      ...activeBook.bids.map((level) => ({
        market_title: title,
        side: "BUY",
        price: level.price,
        size: level.size,
        asset_id: activeBook.asset_id,
        time: activeBook.time,
      })),
      ...activeBook.asks.map((level) => ({
        market_title: title,
        side: "SELL",
        price: level.price,
        size: level.size,
        asset_id: activeBook.asset_id,
        time: activeBook.time,
      })),
    ];
  }, [activeBook, activeBookSpec]);

  const chartSeries = resolvedTab === "liquidity" ? liquiditySeries : priceSeries;
  const sheetRows =
    resolvedTab === "orderbook"
      ? bookRows
      : resolvedTab === "liquidity"
        ? liquiditySeries.flatMap((item) => item.trades)
        : priceSeries.flatMap((item) => item.trades);
  const sheetColumns = resolvedTab === "orderbook" ? BOOK_SHEET_COLUMNS : QUOTE_SHEET_COLUMNS;
  const hasData = sheetRows.length > 0;
  const jsonText = useMemo(() => JSON.stringify(sheetRows, null, 2), [sheetRows]);

  const toggleSeries = useCallback((id: string) => {
    setHiddenSeriesIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const changeSeriesColor = useCallback((id: string, tokenId: DemoChartColorTokenId) => {
    setSeriesColorTokens((prev) => {
      if (prev[id] === tokenId) return prev;
      return { ...prev, [id]: tokenId };
    });
  }, []);

  const exportBasename = `polymarket-live-spread-${resolvedTab}-${Date.now()}`;

  const exportJson = useCallback(() => {
    if (!sheetRows.length) return;
    downloadBlob(
      new Blob([JSON.stringify(sheetRows, null, 2)], {
        type: "application/json;charset=utf-8;",
      }),
      `${exportBasename}.json`,
    );
  }, [exportBasename, sheetRows]);

  const exportCsv = useCallback(() => {
    if (!sheetRows.length || !sheetColumns.length) return;
    const header = sheetColumns.map(escapeCsv).join(",");
    const lines = sheetRows.map((row) =>
      sheetColumns.map((col) => escapeCsv(cellValue((row as Record<string, unknown>)[col]))).join(","),
    );
    downloadBlob(
      new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8;" }),
      `${exportBasename}.csv`,
    );
  }, [exportBasename, sheetColumns, sheetRows]);

  const exportXlsx = useCallback(() => {
    if (!sheetRows.length || !sheetColumns.length) return;
    const table = sheetRows.map((row) => {
      const out: Record<string, string> = {};
      for (const col of sheetColumns) out[col] = cellValue((row as Record<string, unknown>)[col]);
      return out;
    });
    const ws = XLSX.utils.json_to_sheet(table);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Spread");
    XLSX.writeFile(wb, `${exportBasename}.xlsx`);
  }, [exportBasename, sheetColumns, sheetRows]);

  const exportChart = useCallback(
    async (format: "png" | "svg" | "jpg") => {
      const el = chartRef.current;
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
      try {
        if (format === "png") {
          downloadDataUrl(await toPng(el, opts), `${exportBasename}.png`);
        } else if (format === "svg") {
          downloadDataUrl(await toSvg(el, opts), `${exportBasename}.svg`);
        } else {
          downloadDataUrl(await toJpeg(el, { ...opts, quality: 0.95 }), `${exportBasename}.jpg`);
        }
      } catch (e) {
        console.error("[HubPolymarketLiveSpreadDemo] chart export failed", e);
      } finally {
        setChartExporting(false);
      }
    },
    [chartExporting, exportBasename],
  );

  const tabs = useMemo(
    () => SPREAD_TABS.map((tab) => ({ ...tab, disabled: !hasSelection })),
    [hasSelection],
  );

  const toolbarLabel =
    resolvedTab === "best-bid"
      ? "Live best bid"
      : resolvedTab === "best-ask"
        ? "Live best ask"
        : resolvedTab === "spread"
          ? "Live spread"
          : resolvedTab === "liquidity"
            ? "Live liquidity"
            : "Order book snapshot";

  return (
    <div
      ref={rootRef}
      className={cn(
        "flex h-full min-h-0 flex-1 flex-col",
        panelMode
          ? "gap-0 overflow-hidden p-0"
          : "gap-4 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5",
      )}
    >
      {!panelMode ? (
        <div className="shrink-0 space-y-1">
          {heading ? (
            <h3 className="text-lg font-semibold tracking-tight text-foreground">{heading}</h3>
          ) : null}
          {helper ? (
            <p className="text-pretty text-sm leading-relaxed text-muted-foreground">{helper}</p>
          ) : null}
        </div>
      ) : null}

      {!hasSelection ? (
        <div className="flex min-h-[16rem] flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
          <p className="text-sm text-muted-foreground">
            {placeholder || "Search for a Polymarket market to load this view."}
          </p>
          <HubInPageLink
            href={SEARCH_HREF}
            className="text-sm font-medium text-foreground underline underline-offset-4 hover:text-primary"
          >
            Select a market above
          </HubInPageLink>
        </div>
      ) : (
        <div
          className={cn(
            "grid min-h-0 flex-1 grid-cols-1 gap-4 lg:items-stretch",
            panelMode ? "lg:grid-cols-1" : "lg:grid-cols-5",
          )}
        >
          {!panelMode ? (
            <div className="lg:col-span-1">
              <HubKalshiLiveDemoTabs
                tabs={tabs}
                activeId={resolvedTab}
                onChange={(id) => setActiveTab(id as SpreadTabId)}
                contentLoading={loading}
              />
            </div>
          ) : null}

          <div
            className={cn(
              "flex min-h-0 min-w-0 flex-col",
              panelMode ? "col-span-1" : "lg:col-span-4",
            )}
            role="tabpanel"
          >
            <div
              className={cn(
                "flex min-h-[12rem] flex-1 flex-col overflow-hidden rounded-xl border border-border/70 bg-muted/20",
                viewMode === "chart" && "min-h-[28rem]",
              )}
            >
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
                <p className="text-xs font-medium text-muted-foreground">{toolbarLabel}</p>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {loading ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      Loading…
                    </span>
                  ) : hasData ? (
                    <span className="text-xs text-muted-foreground">
                      {sheetRows.length} {resolvedTab === "orderbook" ? "level" : "point"}
                      {sheetRows.length === 1 ? "" : "s"}
                      {markets.length > 1 ? ` · ${markets.length} markets` : ""}
                    </span>
                  ) : null}

                  {liveTab ? (
                    <div className="inline-flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!hasSelection}
                        onClick={() => {
                          if (!livePaused) return;
                          setLivePaused(false);
                        }}
                        className={cn(
                          "h-7 gap-1.5 px-2 text-[11px] font-medium text-muted-foreground",
                          !livePaused &&
                            socketLive &&
                            "border-emerald-500/40 bg-emerald-500/10 text-foreground",
                        )}
                        aria-pressed={!livePaused}
                      >
                        <span
                          className={cn(
                            "size-2 shrink-0 rounded-full",
                            !livePaused && socketLive
                              ? "bg-emerald-500 animate-pulse"
                              : "bg-amber-500 animate-pulse",
                          )}
                          aria-hidden
                        />
                        Live
                      </Button>
                      {!livePaused ? (
                        <button
                          type="button"
                          aria-label="Stop live feed"
                          title="Stop live feed"
                          onClick={() => setLivePaused(true)}
                          className="inline-flex size-7 items-center justify-center rounded-md border border-border/70 bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <span className="size-2.5 rounded-full bg-red-500" aria-hidden />
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={refreshing || loading}
                      onClick={() => void loadBooks({ replaceSnapshot: true })}
                      className="h-7 gap-1.5 px-2 text-[11px] font-medium text-muted-foreground"
                    >
                      <RefreshCw
                        className={cn("size-3.5", refreshing && "animate-spin")}
                        aria-hidden
                      />
                      Refresh
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!hasData || loading}
                    onClick={() => setViewMode("chart")}
                    className={cn(
                      "h-7 gap-1.5 px-2 text-[11px] font-medium text-muted-foreground",
                      viewMode === "chart" && "border-secondary/40 bg-secondary/10 text-foreground",
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
                        disabled={!hasData || chartExporting}
                        className="h-7 gap-1.5 px-2 text-[11px] font-medium text-muted-foreground"
                      >
                        <Download className="size-3.5" aria-hidden />
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[9.5rem]">
                      {viewMode === "chart" ? (
                        <>
                          <DropdownMenuItem
                            className="text-xs"
                            disabled={!hasData || chartExporting}
                            onSelect={() => void exportChart("png")}
                          >
                            PNG
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-xs"
                            disabled={!hasData || chartExporting}
                            onSelect={() => void exportChart("svg")}
                          >
                            SVG
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-xs"
                            disabled={!hasData || chartExporting}
                            onSelect={() => void exportChart("jpg")}
                          >
                            JPG
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      ) : null}
                      <DropdownMenuItem className="text-xs" disabled={!hasData} onSelect={exportJson}>
                        JSON
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-xs" disabled={!hasData} onSelect={exportCsv}>
                        CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-xs" disabled={!hasData} onSelect={exportXlsx}>
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
                      onClick={() => {
                        if (viewMode === "chart") {
                          setViewMode("sheet");
                          return;
                        }
                        setViewMode(viewMode === "json" ? "sheet" : "json");
                      }}
                      className="inline-flex h-6 items-center gap-1 rounded px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label={
                        viewMode === "chart"
                          ? "Switch to data sheet"
                          : viewMode === "json"
                            ? "Switch to sheet view"
                            : "Switch to JSON view"
                      }
                    >
                      {viewMode === "chart" ? (
                        <>
                          <Table2 className="size-3.5" aria-hidden />
                          Data Sheet
                        </>
                      ) : viewMode === "json" ? (
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

              {liveTab ? <QuoteStrip specs={seriesSpecs} latestByToken={latestByToken} /> : null}

              {resolvedTab === "orderbook" && seriesSpecs.length > 1 ? (
                <div className="flex shrink-0 flex-wrap gap-1.5 border-b border-border/50 px-3 py-2">
                  {seriesSpecs.map((spec) => {
                    const selected = (bookTokenId || seriesSpecs[0]?.tokenId) === spec.tokenId;
                    return (
                      <button
                        key={spec.id}
                        type="button"
                        onClick={() => setBookTokenId(spec.tokenId)}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                          selected
                            ? "border-secondary/40 bg-secondary/10 text-foreground"
                            : "border-border/60 text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                        )}
                      >
                        {spec.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {error && !hasData ? (
                <p className="px-3 py-4 text-sm text-destructive">{error}</p>
              ) : loading && !hasData ? (
                viewMode === "chart" ? (
                  <ChartSkeleton />
                ) : viewMode === "json" ? (
                  <JsonSkeleton />
                ) : (
                  <SheetTableSkeleton rows={8} />
                )
              ) : !hasData ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  {resolvedTab === "orderbook"
                    ? "No order-book snapshot available for this market."
                    : "Waiting for live quotes…"}
                </p>
              ) : viewMode === "chart" ? (
                <div className="flex min-h-0 flex-1 flex-col">
                  {resolvedTab === "orderbook" ? (
                    <HubPolymarketLiveOrderbookDepthChart
                      ref={chartRef}
                      bids={activeBook?.bids || []}
                      asks={activeBook?.asks || []}
                      label={activeBookSpec?.label}
                      className="min-h-0 flex-1"
                    />
                  ) : (
                    <HubKalshiLiveDemoTradesLiveline
                      key={`${chartKey}-${resolvedTab}`}
                      ref={chartRef}
                      series={chartSeries}
                      hiddenSeriesIds={hiddenSeriesIds}
                      onToggleSeries={toggleSeries}
                      onChangeSeriesColor={changeSeriesColor}
                      fill
                      paused={livePaused || !pollingActive}
                      fixedValueDomain={
                        (resolvedTab === "best-bid" || resolvedTab === "best-ask") &&
                        seriesSpecs.length > 1
                          ? { min: 0, max: 100 }
                          : undefined
                      }
                      parseRowValue={resolvedTab === "liquidity" ? parseSizeValue : undefined}
                      formatValue={resolvedTab === "liquidity" ? formatQty : undefined}
                      emptyMessage="Waiting for live quotes…"
                      className="min-h-0 flex-1"
                    />
                  )}
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
                      {sheetRows.map((row, rowIndex) => (
                        <tr
                          key={`${cellValue((row as Record<string, unknown>).asset_id)}-${rowIndex}`}
                          className="border-b border-border/40 last:border-0"
                        >
                          {sheetColumns.map((col) => (
                            <td
                              key={`${rowIndex}-${col}`}
                              className="max-w-[16rem] truncate whitespace-nowrap px-3 py-2 text-foreground"
                              title={cellValue((row as Record<string, unknown>)[col])}
                            >
                              {cellValue((row as Record<string, unknown>)[col])}
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
        </div>
      )}
    </div>
  );
}
