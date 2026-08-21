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
import {
  HubPolymarketLiveOrderbookDepthChart,
  polymarketBookFlashKey,
} from "@/components/hubs/polymarketLiveDemo/HubPolymarketLiveOrderbookDepthChart";
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

type BookTabId = "live" | "snapshot";
type ViewMode = "chart" | "sheet" | "json";

type SeriesSpec = {
  id: string;
  tokenId: string;
  label: string;
  outcome: string;
};

type BookSnapshot = {
  asset_id: string;
  bids: { price: number; size: number }[];
  asks: { price: number; size: number }[];
  time: string;
  timestamp: string;
  source: string;
};

const SEARCH_HREF = "#find-polymarket-markets";
const FLASH_MS = 700;

const BOOK_TABS: HubKalshiLiveDemoTabDef[] = [
  {
    id: "live",
    title: "Live order book",
    description: "Bids, asks, and depth as the CLOB book updates over the websocket.",
  },
  {
    id: "snapshot",
    title: "Order book snapshot",
    description: "A point-in-time book from the REST order-book endpoint.",
    separatorBefore: true,
  },
];

const SHEET_COLUMNS = [
  "market_title",
  "side",
  "price",
  "size",
  "asset_id",
  "time",
  "source",
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

function samePrice(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-8;
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

function snapshotFromBook(
  book: Record<string, unknown>,
  fallbackId = "",
  source = "rest",
): BookSnapshot {
  const bidsAsc = parseLevels(book.bids).sort((a, b) => a.price - b.price);
  const asksAsc = parseLevels(book.asks).sort((a, b) => a.price - b.price);
  const rawTs = Number(book.timestamp);
  const ms = Number.isFinite(rawTs) ? (rawTs < 1e12 ? rawTs * 1000 : rawTs) : Date.now();
  return {
    asset_id: bookAssetId(book, fallbackId),
    bids: [...bidsAsc].reverse(),
    asks: asksAsc,
    time: new Date(ms).toISOString(),
    timestamp: String(ms),
    source,
  };
}

function applyLevelChange(
  book: BookSnapshot,
  change: { side: string; price: number; size: number; time: string; timestamp: string },
): BookSnapshot {
  const isAsk = change.side === "SELL" || change.side === "ASK";
  const key = isAsk ? "asks" : "bids";
  const next = book[key].filter((level) => !samePrice(level.price, change.price));
  if (change.size > 0) next.push({ price: change.price, size: change.size });
  next.sort(isAsk ? (a, b) => a.price - b.price : (a, b) => b.price - a.price);
  return {
    ...book,
    [key]: next,
    time: change.time,
    timestamp: change.timestamp,
    source: "websocket",
  };
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

function BookQuoteStrip({ book }: { book: BookSnapshot | undefined }) {
  if (!book) return null;
  const bestBid = book.bids[0];
  const bestAsk = book.asks[0];
  const spread =
    bestBid && bestAsk ? bestAsk.price - bestBid.price : null;
  const bidDepth = book.bids.reduce((sum, row) => sum + row.size, 0);
  const askDepth = book.asks.reduce((sum, row) => sum + row.size, 0);
  const total = bidDepth + askDepth;
  const imbalance = total > 0 ? (bidDepth - askDepth) / total : null;
  return (
    <div className="grid shrink-0 gap-2 border-b border-border/50 px-3 py-2 sm:grid-cols-2">
      <div className="rounded-md border border-border/50 bg-background/70 px-3 py-2">
        <p className="text-[11px] font-semibold tracking-tight text-foreground">Top of book</p>
        <p className="mt-1 font-mono text-[11px] tabular-nums leading-relaxed text-foreground">
          <span className="text-muted-foreground">Bid </span>
          {formatCents(bestBid?.price)}
          <span className="text-muted-foreground"> × {formatQty(bestBid?.size)}</span>
          <span className="text-muted-foreground"> · Ask </span>
          {formatCents(bestAsk?.price)}
          <span className="text-muted-foreground"> × {formatQty(bestAsk?.size)}</span>
          <span className="text-muted-foreground"> · Spread </span>
          {formatCents(spread)}
        </p>
      </div>
      <div className="rounded-md border border-border/50 bg-background/70 px-3 py-2">
        <p className="text-[11px] font-semibold tracking-tight text-foreground">Visible depth</p>
        <p className="mt-1 font-mono text-[11px] tabular-nums leading-relaxed text-foreground">
          <span className="text-muted-foreground">Bids </span>
          {formatQty(bidDepth)}
          <span className="text-muted-foreground"> · Asks </span>
          {formatQty(askDepth)}
          <span className="text-muted-foreground"> · Imbalance </span>
          {imbalance == null
            ? "—"
            : `${imbalance > 0 ? "+" : ""}${Math.round(imbalance * 100)}%`}
        </p>
      </div>
    </div>
  );
}

export function HubPolymarketLiveOrderbookDemo({
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
  lockedTab?: BookTabId;
}) {
  const selection = useHubPolymarketLiveDemo();
  const markets = selection?.markets ?? [];
  const seriesSpecs = useMemo(() => seriesSpecsFromMarkets(markets), [markets]);
  const marketsKey = seriesSpecs.map((spec) => spec.tokenId).join(",");
  const hasSelection = seriesSpecs.length > 0;

  const [activeTab, setActiveTab] = useState<BookTabId>(lockedTab || "live");
  const resolvedTab = lockedTab || activeTab;
  const [viewMode, setViewMode] = useState<ViewMode>("chart");
  const [liveBooks, setLiveBooks] = useState<Record<string, BookSnapshot>>({});
  const [snapshotBooks, setSnapshotBooks] = useState<Record<string, BookSnapshot>>({});
  const [bookTokenId, setBookTokenId] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socketLive, setSocketLive] = useState(false);
  const [livePaused, setLivePaused] = useState(false);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const [chartExporting, setChartExporting] = useState(false);
  const [flashKeys, setFlashKeys] = useState<Set<string>>(() => new Set());

  const rootRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const socketStopRef = useRef<(() => void) | null>(null);
  const booksAbortRef = useRef<AbortController | null>(null);
  const flashTimerRef = useRef<number | null>(null);

  const pollingActive = hasSelection && inView && tabVisible && !livePaused;

  const stopSocket = useCallback(() => {
    socketStopRef.current?.();
    socketStopRef.current = null;
    setSocketLive(false);
  }, []);

  const flashLevel = useCallback((side: "bid" | "ask", price: number) => {
    const key = polymarketBookFlashKey(side, price);
    setFlashKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => {
      setFlashKeys(new Set());
      flashTimerRef.current = null;
    }, FLASH_MS);
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
    setLiveBooks({});
    setSnapshotBooks({});
    setError(null);
    setLivePaused(false);
    setFlashKeys(new Set());
    setBookTokenId(marketsKey.split(",")[0] || "");
    if (!hasSelection) {
      setLoading(false);
      stopSocket();
    }
  }, [hasSelection, marketsKey, stopSocket]);

  const ingestRestBooks = useCallback(
    (books: Record<string, unknown>[], opts: { live: boolean; snapshot: boolean }) => {
      const next: Record<string, BookSnapshot> = {};
      for (const spec of seriesSpecs) {
        const book =
          books.find((row) => bookAssetId(row, spec.tokenId) === spec.tokenId) ||
          books.find((row) => bookAssetId(row) === spec.tokenId);
        if (!book) continue;
        next[spec.tokenId] = snapshotFromBook(book, spec.tokenId, "rest");
      }
      if (opts.live) {
        setLiveBooks((prev) => ({ ...prev, ...next }));
      }
      if (opts.snapshot) setSnapshotBooks(next);
    },
    [seriesSpecs],
  );

  const loadBooks = useCallback(
    async (opts: { initial?: boolean; live: boolean; snapshot: boolean; silent?: boolean }) => {
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
        ingestRestBooks(books, { live: opts.live, snapshot: opts.snapshot });
        setError(null);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (ac.signal.aborted) return;
        if (!opts.silent) {
          setError(err instanceof Error ? err.message : "Failed to load order books");
        }
      } finally {
        if (!ac.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [ingestRestBooks, seriesSpecs],
  );

  useEffect(() => {
    if (!hasSelection) return undefined;
    void loadBooks({ initial: true, live: true, snapshot: true });
    return () => booksAbortRef.current?.abort();
  }, [hasSelection, loadBooks, marketsKey]);

  useEffect(() => {
    stopSocket();
    if (!pollingActive) return undefined;
    const allowed = new Set(seriesSpecs.map((spec) => spec.tokenId));
    socketStopRef.current = openPolymarketQuoteSocket({
      assetIds: seriesSpecs.map((spec) => spec.tokenId),
      onStatus: (status: "open" | "closed" | "error") => {
        setSocketLive(status === "open");
      },
      onBook: (row) => {
        const tokenId = String(row.asset_id || "");
        if (!allowed.has(tokenId)) return;
        setLiveBooks((prev) => ({
          ...prev,
          [tokenId]: {
            asset_id: tokenId,
            bids: row.bids,
            asks: row.asks,
            time: row.time,
            timestamp: row.timestamp,
            source: "websocket",
          },
        }));
      },
      onPriceChange: (row) => {
        const tokenId = String(row.asset_id || "");
        if (!allowed.has(tokenId)) return;
        const isAsk = row.side === "SELL" || row.side === "ASK";
        flashLevel(isAsk ? "ask" : "bid", row.price);
        setLiveBooks((prev) => {
          const current = prev[tokenId] || {
            asset_id: tokenId,
            bids: [],
            asks: [],
            time: row.time,
            timestamp: row.timestamp,
            source: "websocket",
          };
          return {
            ...prev,
            [tokenId]: applyLevelChange(current, row),
          };
        });
      },
    });
    return () => {
      stopSocket();
    };
  }, [flashLevel, pollingActive, seriesSpecs, stopSocket]);

  useEffect(
    () => () => {
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    },
    [],
  );

  const booksByToken = resolvedTab === "live" ? liveBooks : snapshotBooks;
  const activeBook =
    booksByToken[bookTokenId] || booksByToken[seriesSpecs[0]?.tokenId || ""];
  const activeSpec =
    seriesSpecs.find((spec) => spec.tokenId === (activeBook?.asset_id || bookTokenId)) ||
    seriesSpecs[0];

  const sheetRows = useMemo(() => {
    if (!activeBook || !activeSpec) return [];
    const title = activeSpec.label;
    return [
      ...activeBook.bids.map((level) => ({
        market_title: title,
        side: "BUY",
        price: level.price,
        size: level.size,
        asset_id: activeBook.asset_id,
        time: activeBook.time,
        source: activeBook.source,
      })),
      ...activeBook.asks.map((level) => ({
        market_title: title,
        side: "SELL",
        price: level.price,
        size: level.size,
        asset_id: activeBook.asset_id,
        time: activeBook.time,
        source: activeBook.source,
      })),
    ];
  }, [activeBook, activeSpec]);

  const hasData = sheetRows.length > 0;
  const jsonText = useMemo(() => JSON.stringify(sheetRows, null, 2), [sheetRows]);
  const exportBasename = `polymarket-live-orderbook-${resolvedTab}-${Date.now()}`;

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
    if (!sheetRows.length) return;
    const header = SHEET_COLUMNS.map(escapeCsv).join(",");
    const lines = sheetRows.map((row) =>
      SHEET_COLUMNS.map((col) => escapeCsv(cellValue((row as Record<string, unknown>)[col]))).join(
        ",",
      ),
    );
    downloadBlob(
      new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8;" }),
      `${exportBasename}.csv`,
    );
  }, [exportBasename, sheetRows]);

  const exportXlsx = useCallback(() => {
    if (!sheetRows.length) return;
    const table = sheetRows.map((row) => {
      const out: Record<string, string> = {};
      for (const col of SHEET_COLUMNS) out[col] = cellValue((row as Record<string, unknown>)[col]);
      return out;
    });
    const ws = XLSX.utils.json_to_sheet(table);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orderbook");
    XLSX.writeFile(wb, `${exportBasename}.xlsx`);
  }, [exportBasename, sheetRows]);

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
        if (format === "png") downloadDataUrl(await toPng(el, opts), `${exportBasename}.png`);
        else if (format === "svg") downloadDataUrl(await toSvg(el, opts), `${exportBasename}.svg`);
        else downloadDataUrl(await toJpeg(el, { ...opts, quality: 0.95 }), `${exportBasename}.jpg`);
      } catch (e) {
        console.error("[HubPolymarketLiveOrderbookDemo] chart export failed", e);
      } finally {
        setChartExporting(false);
      }
    },
    [chartExporting, exportBasename],
  );

  const tabs = useMemo(
    () => BOOK_TABS.map((tab) => ({ ...tab, disabled: !hasSelection })),
    [hasSelection],
  );

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
                onChange={(id) => setActiveTab(id as BookTabId)}
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
                <p className="text-xs font-medium text-muted-foreground">
                  {resolvedTab === "live" ? "Live order book" : "Order book snapshot"}
                </p>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {loading ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      Loading…
                    </span>
                  ) : hasData ? (
                    <span className="text-xs text-muted-foreground">
                      {sheetRows.length} level{sheetRows.length === 1 ? "" : "s"}
                      {markets.length > 1 ? ` · ${markets.length} markets` : ""}
                    </span>
                  ) : null}

                  {resolvedTab === "live" ? (
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
                      onClick={() =>
                        void loadBooks({ live: false, snapshot: true })
                      }
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

              {seriesSpecs.length > 1 ? (
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

              <BookQuoteStrip book={activeBook} />

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
                  {resolvedTab === "live"
                    ? "Waiting for live order-book updates…"
                    : "No order-book snapshot available for this market."}
                </p>
              ) : viewMode === "chart" ? (
                <HubPolymarketLiveOrderbookDepthChart
                  ref={chartRef}
                  bids={activeBook?.bids || []}
                  asks={activeBook?.asks || []}
                  label={activeSpec?.label}
                  flashKeys={resolvedTab === "live" ? flashKeys : undefined}
                  className="min-h-0 flex-1"
                />
              ) : viewMode === "json" ? (
                <pre className="max-h-[28rem] overflow-auto px-3 py-3 font-mono text-[11px] leading-relaxed text-foreground sm:text-xs">
                  {jsonText}
                </pre>
              ) : (
                <div className="max-h-[28rem] overflow-auto">
                  <table className="w-max min-w-full border-collapse text-left text-[11px] sm:text-xs">
                    <thead className="sticky top-0 z-[1] bg-muted/80 backdrop-blur">
                      <tr className="border-b border-border/60">
                        {SHEET_COLUMNS.map((col) => (
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
                          key={`${row.side}-${row.price}-${rowIndex}`}
                          className="border-b border-border/40 last:border-0"
                        >
                          {SHEET_COLUMNS.map((col) => (
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
