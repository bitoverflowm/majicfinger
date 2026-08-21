"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { HubInPageLink } from "@/components/hubs/HubCtaButton";
import {
  HubKalshiLiveDemoCandlesticksChart,
  type DemoCandlePeriod,
} from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveDemoCandlesticksChart";
import { HubKalshiLiveDemoCandlesticksProfessionalChart } from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveDemoCandlesticksProfessionalChart";
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
import {
  advancePolymarketCandles,
  applyPolymarketCandleOverlay,
  buildPolymarketCandlestickSeedRows,
  polymarketCandleIntervalMs,
  upsertPolymarketTradeCandle,
} from "@/lib/polymarketLive/polymarketCandlesticks";
import {
  openPolymarketLastTradeSocket,
  openPolymarketQuoteSocket,
} from "@/lib/polymarketLive/openPolymarketMarketSocket";
import { normalizePolymarketRealtimeHistoryRows } from "@/lib/polymarketLive/polymarketRealtimeSeed";
import { cn } from "@/lib/utils";
import { Braces, CandlestickChart, Download, Loader2, Table2 } from "lucide-react";
import { toJpeg, toPng, toSvg } from "html-to-image";
import * as XLSX from "xlsx";

type ViewMode = "chart" | "sheet" | "json";
type ChartEngine = "basic" | "professional";
type DemoInterval = "1m" | "1h" | "1d";

type OutcomeSpec = {
  id: string;
  tokenId: string;
  label: string;
  outcome: string;
};

type HistoryPoint = {
  asset_id: string;
  timestamp: number;
  price: number;
  size: number;
  transaction_hash?: string;
};

const INTERVAL_OPTIONS: {
  id: DemoInterval;
  label: string;
  chartPeriod: DemoCandlePeriod;
}[] = [
  { id: "1m", label: "Minute", chartPeriod: 1 },
  { id: "1h", label: "Hour", chartPeriod: 60 },
  { id: "1d", label: "Day", chartPeriod: 1440 },
];

const SEARCH_HREF = "#find-polymarket-markets";
const TRADE_HISTORY_LIMIT = 1000;
const MAX_LIVE_TRADES = 2500;

const SHEET_PREFERRED_COLUMNS = [
  "time",
  "end_period_ts",
  "price_open_dollars",
  "price_high_dollars",
  "price_low_dollars",
  "price_close_dollars",
  "volume",
  "asset_id",
  "best_bid",
  "best_ask",
  "spread",
  "source",
  "is_final",
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

function parseTimeMs(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 1e12 ? value * 1000 : value;
  }
  const asNum = Number(value);
  if (Number.isFinite(asNum) && asNum > 0) {
    return asNum < 1e12 ? asNum * 1000 : asNum;
  }
  const ms = Date.parse(String(value));
  return Number.isFinite(ms) ? ms : null;
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

function outcomeSpecsFromMarkets(markets: HubPolymarketLiveDemoMarket[]): OutcomeSpec[] {
  const multiMarket = markets.length > 1;
  const usedLabels = new Map<string, number>();
  const out: OutcomeSpec[] = [];
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

function conditionIdsFromMarkets(markets: HubPolymarketLiveDemoMarket[]): string[] {
  return [
    ...new Set(
      markets
        .map((market) => String(market.conditionId || "").trim())
        .filter(Boolean),
    ),
  ];
}

function candleFlashKey(row: Record<string, unknown>): string | null {
  const ts = Math.floor(Number(row.end_period_ts));
  if (!Number.isFinite(ts)) return null;
  return `ts:${ts}`;
}

async function fetchTradeSeedRows(
  markets: HubPolymarketLiveDemoMarket[],
  specs: OutcomeSpec[],
  signal: AbortSignal,
): Promise<HistoryPoint[]> {
  const conditionIds = conditionIdsFromMarkets(markets);
  if (!conditionIds.length) return [];
  const tokenSet = new Set(specs.map((spec) => spec.tokenId));
  const pages = await Promise.all(
    conditionIds.map(async (market) => {
      const params = new URLSearchParams({
        query: "getTradesByMarket",
        market,
        limit: String(TRADE_HISTORY_LIMIT),
        takerOnly: "true",
        skipFlatten: "true",
      });
      const res = await fetch(`/api/integrations/polymarket?${params.toString()}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal,
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof payload?.message === "string"
            ? payload.message
            : "Failed to load trade history",
        );
      }
      return Array.isArray(payload) ? payload : [];
    }),
  );
  const rows: HistoryPoint[] = [];
  for (const raw of pages.flat()) {
    if (!raw || typeof raw !== "object") continue;
    const trade = raw as Record<string, unknown>;
    const assetId = String(trade.asset || trade.asset_id || "").trim();
    if (!assetId || !tokenSet.has(assetId)) continue;
    const price = Number(trade.price);
    const time = parseTimeMs(trade.timestamp ?? trade.time);
    if (!Number.isFinite(price) || time == null) continue;
    const size = Number(trade.size);
    rows.push({
      asset_id: assetId,
      timestamp: time,
      price,
      size: Number.isFinite(size) ? size : 0,
      transaction_hash: String(trade.transactionHash || trade.transaction_hash || ""),
    });
  }
  return rows.sort((a, b) => a.timestamp - b.timestamp);
}

async function fetchPriceHistorySeed(
  specs: OutcomeSpec[],
  signal: AbortSignal,
): Promise<HistoryPoint[]> {
  const tokenIds = specs.map((spec) => spec.tokenId);
  const res = await fetch("/api/integrations/polymarket?query=getBatchPricesHistory", {
    method: "POST",
    credentials: "same-origin",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ markets: tokenIds, interval: "max", fidelity: 60 }),
    signal,
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof payload?.message === "string"
        ? payload.message
        : "Failed to load price history",
    );
  }
  return normalizePolymarketRealtimeHistoryRows(payload)
    .map((row) => {
      const price = Number(row.price);
      const time = parseTimeMs(row.timestamp ?? row.time);
      const assetId = String(row.asset_id || "").trim();
      if (!assetId || !Number.isFinite(price) || time == null) return null;
      return { asset_id: assetId, timestamp: time, price, size: 0 };
    })
    .filter(Boolean) as HistoryPoint[];
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

export function HubPolymarketLiveCandlesticksDemo({
  heading,
  helper,
  placeholder,
}: {
  heading?: string;
  helper?: string;
  placeholder?: string;
}) {
  const selection = useHubPolymarketLiveDemo();
  const markets = selection?.markets ?? [];
  const outcomeSpecs = useMemo(() => outcomeSpecsFromMarkets(markets), [markets]);
  const marketsKey = outcomeSpecs.map((spec) => spec.tokenId).join(",");
  const hasSelection = outcomeSpecs.length > 0;

  const [viewMode, setViewMode] = useState<ViewMode>("chart");
  const [chartEngine, setChartEngine] = useState<ChartEngine>("professional");
  const [interval, setIntervalId] = useState<DemoInterval>("1d");
  const [activeTokenId, setActiveTokenId] = useState("");
  const [seedRows, setSeedRows] = useState<HistoryPoint[]>([]);
  const [liveTrades, setLiveTrades] = useState<HistoryPoint[]>([]);
  const [overlays, setOverlays] = useState<Record<string, { best_bid: number; best_ask: number }>>(
    {},
  );
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socketLive, setSocketLive] = useState(false);
  const [livePaused, setLivePaused] = useState(false);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const [chartExporting, setChartExporting] = useState(false);
  const [flashKeys, setFlashKeys] = useState<Set<string>>(() => new Set());

  const rootRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const tradeSocketStopRef = useRef<(() => void) | null>(null);
  const quoteSocketStopRef = useRef<(() => void) | null>(null);
  const historyAbortRef = useRef<AbortController | null>(null);
  const seenHashesRef = useRef<Set<string>>(new Set());

  const pollingActive = hasSelection && inView && tabVisible && !livePaused;
  const chartPeriod =
    INTERVAL_OPTIONS.find((option) => option.id === interval)?.chartPeriod ?? 1;

  const stopSockets = useCallback(() => {
    tradeSocketStopRef.current?.();
    quoteSocketStopRef.current?.();
    tradeSocketStopRef.current = null;
    quoteSocketStopRef.current = null;
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
    setSeedRows([]);
    setLiveTrades([]);
    setOverlays({});
    setError(null);
    setLivePaused(false);
    setActiveTokenId(outcomeSpecs[0]?.tokenId || "");
    seenHashesRef.current = new Set();
    if (!hasSelection) {
      setLoading(false);
      stopSockets();
    }
  }, [hasSelection, marketsKey, outcomeSpecs, stopSockets]);

  useEffect(() => {
    if (!hasSelection) return undefined;
    historyAbortRef.current?.abort();
    const ac = new AbortController();
    historyAbortRef.current = ac;
    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        let rows = await fetchTradeSeedRows(markets, outcomeSpecs, ac.signal);
        if (ac.signal.aborted) return;
        if (!rows.length) {
          rows = await fetchPriceHistorySeed(outcomeSpecs, ac.signal);
        }
        if (ac.signal.aborted) return;
        setSeedRows(rows);
        setLoading(false);
        setError(null);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (ac.signal.aborted) return;
        setSeedRows([]);
        setLoading(false);
        setError(err instanceof Error ? err.message : "Failed to load candlestick history");
      }
    };
    void load();
    return () => ac.abort();
  }, [hasSelection, markets, marketsKey, outcomeSpecs]);

  useEffect(() => {
    stopSockets();
    if (!pollingActive) return undefined;
    const assetIds = outcomeSpecs.map((spec) => spec.tokenId);
    let tradeOpen = false;
    let quoteOpen = false;
    const syncStatus = () => setSocketLive(tradeOpen || quoteOpen);

    tradeSocketStopRef.current = openPolymarketLastTradeSocket({
      assetIds,
      onStatus: (status) => {
        tradeOpen = status === "open";
        syncStatus();
      },
      onTrade: (row) => {
        const hash = String(row.transaction_hash || "");
        if (hash) {
          if (seenHashesRef.current.has(hash)) return;
          seenHashesRef.current.add(hash);
          if (seenHashesRef.current.size > 10_000) {
            const first = seenHashesRef.current.values().next().value;
            if (first) seenHashesRef.current.delete(first);
          }
        }
        const time = parseTimeMs(row.timestamp ?? row.time) ?? Date.now();
        const price = Number(row.price);
        if (!Number.isFinite(price)) return;
        const size = Number(row.size);
        setLiveTrades((prev) =>
          [
            ...prev,
            {
              asset_id: String(row.asset_id),
              timestamp: time,
              price,
              size: Number.isFinite(size) ? size : 0,
              transaction_hash: hash,
            },
          ].slice(-MAX_LIVE_TRADES),
        );
      },
    });

    quoteSocketStopRef.current = openPolymarketQuoteSocket({
      assetIds,
      onStatus: (status) => {
        quoteOpen = status === "open";
        syncStatus();
      },
      onQuote: (row) => {
        const bid = Number(row.best_bid);
        const ask = Number(row.best_ask);
        if (!Number.isFinite(bid) && !Number.isFinite(ask)) return;
        setOverlays((prev) => ({
          ...prev,
          [row.asset_id]: {
            best_bid: Number.isFinite(bid) ? bid : prev[row.asset_id]?.best_bid ?? NaN,
            best_ask: Number.isFinite(ask) ? ask : prev[row.asset_id]?.best_ask ?? NaN,
          },
        }));
      },
    });

    return () => {
      stopSockets();
    };
  }, [outcomeSpecs, pollingActive, stopSockets]);

  useEffect(() => {
    if (!pollingActive) return undefined;
    const intervalMs = polymarketCandleIntervalMs(interval);
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      const delay = Math.max(250, intervalMs - (Date.now() % intervalMs) + 25);
      timer = setTimeout(() => {
        setNowTick(Date.now());
        schedule();
      }, delay);
    };
    setNowTick(Date.now());
    schedule();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [interval, pollingActive]);

  const allCandles = useMemo(() => {
    let rows = buildPolymarketCandlestickSeedRows(seedRows, interval);
    for (const trade of liveTrades) {
      rows = upsertPolymarketTradeCandle(
        rows,
        {
          asset_id: trade.asset_id,
          timestamp: trade.timestamp,
          price: trade.price,
          size: trade.size,
          transaction_hash: trade.transaction_hash,
        },
        interval,
      );
    }
    rows = advancePolymarketCandles(rows, nowTick, interval);
    for (const [assetId, quote] of Object.entries(overlays)) {
      rows = applyPolymarketCandleOverlay(rows, {
        asset_id: assetId,
        best_bid: quote.best_bid,
        best_ask: quote.best_ask,
      });
    }
    return rows;
  }, [interval, liveTrades, nowTick, overlays, seedRows]);

  const availableSpecs = useMemo(() => {
    const withData = new Set(allCandles.map((row) => String(row.asset_id || "")));
    const matched = outcomeSpecs.filter((spec) => withData.has(spec.tokenId));
    return matched.length ? matched : outcomeSpecs;
  }, [allCandles, outcomeSpecs]);

  const tokenId =
    availableSpecs.some((spec) => spec.tokenId === activeTokenId)
      ? activeTokenId
      : availableSpecs[0]?.tokenId || "";

  const activeSpec = availableSpecs.find((spec) => spec.tokenId === tokenId);
  const candles = useMemo(
    () =>
      tokenId
        ? allCandles.filter((row) => String(row.asset_id || "") === tokenId)
        : allCandles,
    [allCandles, tokenId],
  );

  useEffect(() => {
    const last = liveTrades[liveTrades.length - 1];
    if (!last || last.asset_id !== tokenId) return;
    const intervalMs = polymarketCandleIntervalMs(interval);
    const bucketStart = Math.floor(last.timestamp / intervalMs) * intervalMs;
    const key = `ts:${Math.floor((bucketStart + intervalMs) / 1000)}`;
    setFlashKeys(new Set([key]));
    const timer = setTimeout(() => setFlashKeys(new Set()), 900);
    return () => clearTimeout(timer);
  }, [interval, liveTrades, tokenId]);

  const hasData = candles.length > 0;
  const jsonText = useMemo(() => JSON.stringify(candles, null, 2), [candles]);
  const sheetColumns = useMemo(() => {
    const keys = new Set<string>();
    for (const row of candles) {
      for (const key of Object.keys(row)) keys.add(key);
    }
    const ordered = SHEET_PREFERRED_COLUMNS.filter((key) => keys.has(key));
    for (const key of keys) {
      if (!ordered.includes(key)) ordered.push(key);
    }
    return ordered;
  }, [candles]);

  const exportBasename = `polymarket-live-candles-${interval}-${Date.now()}`;

  const exportJson = useCallback(() => {
    if (!candles.length) return;
    downloadBlob(
      new Blob([JSON.stringify(candles, null, 2)], {
        type: "application/json;charset=utf-8;",
      }),
      `${exportBasename}.json`,
    );
  }, [candles, exportBasename]);

  const exportCsv = useCallback(() => {
    if (!candles.length || !sheetColumns.length) return;
    const header = sheetColumns.map(escapeCsv).join(",");
    const lines = candles.map((row) =>
      sheetColumns.map((col) => escapeCsv(cellValue(row[col]))).join(","),
    );
    downloadBlob(
      new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8;" }),
      `${exportBasename}.csv`,
    );
  }, [candles, exportBasename, sheetColumns]);

  const exportXlsx = useCallback(() => {
    if (!candles.length || !sheetColumns.length) return;
    const table = candles.map((row) => {
      const out: Record<string, string> = {};
      for (const col of sheetColumns) out[col] = cellValue(row[col]);
      return out;
    });
    const ws = XLSX.utils.json_to_sheet(table);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Candles");
    XLSX.writeFile(wb, `${exportBasename}.xlsx`);
  }, [candles, exportBasename, sheetColumns]);

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
        console.error("[HubPolymarketLiveCandlesticksDemo] chart export failed", e);
      } finally {
        setChartExporting(false);
      }
    },
    [chartExporting, exportBasename],
  );

  return (
    <div
      ref={rootRef}
      className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5"
    >
      <div className="shrink-0 space-y-1">
        {heading ? (
          <h3 className="text-lg font-semibold tracking-tight text-foreground">{heading}</h3>
        ) : null}
        {helper ? (
          <p className="text-pretty text-sm leading-relaxed text-muted-foreground">{helper}</p>
        ) : null}
      </div>

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
            "flex min-h-[12rem] flex-1 flex-col overflow-hidden rounded-xl border border-border/70 bg-muted/20",
            viewMode === "chart" && "min-h-[28rem]",
          )}
          role="region"
          aria-label="Live candlestick chart"
        >
          <div className="flex shrink-0 flex-col gap-2 border-b border-border/60 px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-medium text-muted-foreground">Candlesticks</p>
                <div
                  className="inline-flex h-7 items-center rounded-md border border-border/70 bg-background p-0.5"
                  role="group"
                  aria-label="Candlestick interval"
                >
                  {INTERVAL_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setIntervalId(option.id)}
                      className={cn(
                        "inline-flex h-6 items-center rounded px-2 text-[11px] font-medium transition-colors",
                        interval === option.id
                          ? "bg-muted text-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                      )}
                      aria-pressed={interval === option.id}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div
                  className="inline-flex h-7 items-center rounded-md border border-border/70 bg-background p-0.5"
                  role="group"
                  aria-label="Candlestick chart style"
                >
                  {(
                    [
                      { label: "Basic", value: "basic" as const },
                      { label: "Professional", value: "professional" as const },
                    ] as const
                  ).map(({ label, value }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setChartEngine(value);
                        if (value === "professional") setViewMode("chart");
                      }}
                      className={cn(
                        "inline-flex h-6 items-center rounded px-2 text-[11px] font-medium transition-colors",
                        chartEngine === value
                          ? "bg-muted text-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                      )}
                      aria-pressed={chartEngine === value}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                {loading ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    Loading…
                  </span>
                ) : hasData ? (
                  <span className="text-xs text-muted-foreground">
                    {candles.length} candle{candles.length === 1 ? "" : "s"}
                    {liveTrades.length ? ` · ${liveTrades.length} live` : ""}
                  </span>
                ) : null}

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
                  <CandlestickChart className="size-3.5" aria-hidden />
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
          </div>

          {availableSpecs.length > 1 ? (
            <div
              className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-border/40 px-2 py-2 sm:px-3"
              role="tablist"
              aria-label="Outcome"
            >
              {availableSpecs.map((spec) => {
                const selected = spec.tokenId === tokenId;
                return (
                  <button
                    key={spec.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveTokenId(spec.tokenId)}
                    className={cn(
                      "inline-flex max-w-full items-center rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                      selected
                        ? "bg-background text-foreground shadow-sm ring-1 ring-border/70"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    )}
                  >
                    <span className="truncate">{spec.label}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          <p className="shrink-0 border-b border-border/40 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground text-pretty">
            {!livePaused && socketLive ? (
              <>
                Live trades update the active candle. Quiet intervals carry the previous close.
                Top-of-book bid/ask overlays the latest bar.{" "}
              </>
            ) : (
              <>
                Showing {interval === "1m" ? "minute" : interval === "1h" ? "hour" : "day"} candles
                built from executed trades
                {activeSpec ? ` for ${activeSpec.label}` : ""}.{" "}
              </>
            )}
          </p>

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
              Waiting for candlestick history or the first trade…
            </p>
          ) : viewMode === "chart" ? (
            <div className="flex min-h-0 flex-1 flex-col">
              {chartEngine === "professional" ? (
                <HubKalshiLiveDemoCandlesticksProfessionalChart
                  ref={chartRef}
                  candles={candles}
                  label={activeSpec?.label}
                  className="min-h-0 flex-1"
                  chartClassName="min-h-0 border-0 rounded-none"
                />
              ) : (
                <HubKalshiLiveDemoCandlesticksChart
                  ref={chartRef}
                  candles={candles}
                  periodInterval={chartPeriod}
                  flashKeys={flashKeys}
                  label={activeSpec?.label}
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
                  {candles.map((row, rowIndex) => (
                    <tr
                      key={candleFlashKey(row) || String(rowIndex)}
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
      )}
    </div>
  );
}
