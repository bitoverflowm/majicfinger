"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { HubInPageLink } from "@/components/hubs/HubCtaButton";
import { Braces, Download, LineChart, Loader2, Table2 } from "lucide-react";
import { toJpeg, toPng, toSvg } from "html-to-image";
import * as XLSX from "xlsx";

import {
  HubKalshiLiveDemoTabs,
  type HubKalshiLiveDemoTabDef,
} from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveDemoTabs";
import { HubKalshiLiveDemoTradesChart } from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveDemoTradesChart";
import { HubKalshiLiveDemoTradesLiveline } from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveDemoTradesLiveline";
import {
  defaultSeriesColorToken,
  type DemoChartColorTokenId,
  resolveDemoChartColor,
} from "@/components/hubs/kalshiLiveDemo/demoChartColors";
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
import { openPolymarketLastTradeSocket } from "@/lib/polymarketLive/openPolymarketMarketSocket";
import {
  minimumPolymarketPricesHistoryFidelity,
  POLYMARKET_PRICES_HISTORY_INTERVAL_OPTIONS,
} from "@/lib/polymarketLive/pricesHistoryCompose";
import { normalizePolymarketRealtimeHistoryRows } from "@/lib/polymarketLive/polymarketRealtimeSeed";
import { cn } from "@/lib/utils";

type PriceTabId = "liveline" | "history";
type ViewMode = "chart" | "sheet" | "json";
type HistoryInterval = (typeof POLYMARKET_PRICES_HISTORY_INTERVAL_OPTIONS)[number]["value"];

type SeriesSpec = {
  id: string;
  tokenId: string;
  label: string;
  outcome: string;
};

const MAX_LIVE_POINTS = 240;
const MAX_HISTORY_POINTS = 2500;
const SEARCH_HREF = "#find-polymarket-markets";
const HISTORY_WATERFALL_ORDER: HistoryInterval[] = [
  "max",
  "all",
  "1m",
  "1w",
  "1d",
  "6h",
  "1h",
];

function fidelityForHistoryInterval(interval: HistoryInterval): number {
  if (interval === "max" || interval === "all") return 60;
  return minimumPolymarketPricesHistoryFidelity(interval);
}

const SHEET_PREFERRED_COLUMNS = [
  "market_title",
  "created_time",
  "time",
  "yes_price_dollars",
  "price",
  "asset_id",
  "side",
  "size",
  "transaction_hash",
];

const PRICE_TABS: HubKalshiLiveDemoTabDef[] = [
  {
    id: "liveline",
    title: "Real time price",
    description: "Live last-trade prices as they print for the selected market.",
  },
  {
    id: "history",
    title: "Full Price History",
    description: "The complete price path pulled from Polymarket, plotted on one chart.",
  },
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
  marketTitle: string,
): Record<string, unknown> | null {
  const priceRaw = row.yes_price_dollars ?? row.price;
  const price = Number(priceRaw);
  if (!Number.isFinite(price)) return null;
  const ms = parseTradeTimeMs(row);
  const time = ms > 0 ? new Date(ms).toISOString() : String(row.time || "");
  if (!time) return null;
  return {
    market_title: marketTitle,
    asset_id: tokenId,
    created_time: time,
    time,
    timestamp: String(ms || Date.parse(time) || Date.now()),
    yes_price_dollars: price,
    price,
    side: row.side != null ? String(row.side) : "",
    size: row.size != null ? String(row.size) : "",
    transaction_hash: row.transaction_hash ?? row.hash ?? "",
  };
}

function mergeTrades(
  prev: Record<string, unknown>[],
  next: Record<string, unknown>[],
  tokenId: string,
  marketTitle: string,
  max: number,
): Record<string, unknown>[] {
  const map = new Map<string, Record<string, unknown>>();
  for (const raw of [...prev, ...next]) {
    const row = toLivelineRow(raw, tokenId, marketTitle);
    if (!row) continue;
    map.set(tradeKey(row), row);
  }
  return [...map.values()]
    .sort((a, b) => parseTradeTimeMs(a) - parseTradeTimeMs(b))
    .slice(-max);
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

async function fetchHistoryByToken(
  specs: SeriesSpec[],
  opts: { interval: string; fidelity: number },
  signal: AbortSignal,
): Promise<Record<string, Record<string, unknown>[]>> {
  const tokenIds = specs.map((spec) => spec.tokenId);
  const titleByToken = new Map(specs.map((spec) => [spec.tokenId, spec.label]));
  const res = await fetch("/api/integrations/polymarket?query=getBatchPricesHistory", {
    method: "POST",
    credentials: "same-origin",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      markets: tokenIds,
      interval: opts.interval,
      fidelity: opts.fidelity,
    }),
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
  const byToken: Record<string, Record<string, unknown>[]> = {};
  for (const spec of specs) byToken[spec.tokenId] = [];
  for (const row of rows) {
    const tokenId = String(row.asset_id || "");
    const title = titleByToken.get(tokenId) || "";
    const mapped = toLivelineRow(row, tokenId, title);
    if (!mapped) continue;
    if (!byToken[tokenId]) byToken[tokenId] = [];
    byToken[tokenId].push(mapped);
  }
  for (const spec of specs) {
    byToken[spec.tokenId] = mergeTrades(
      [],
      byToken[spec.tokenId] || [],
      spec.tokenId,
      spec.label,
      MAX_HISTORY_POINTS,
    );
  }
  return byToken;
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

export function HubPolymarketLivePricesDemo({
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
  const seriesSpecs = useMemo(() => seriesSpecsFromMarkets(markets), [markets]);
  const marketsKey = seriesSpecs.map((spec) => spec.tokenId).join(",");
  const hasSelection = seriesSpecs.length > 0;

  const [activeTab, setActiveTab] = useState<PriceTabId>("liveline");
  const [viewMode, setViewMode] = useState<ViewMode>("chart");
  const [livePoints, setLivePoints] = useState<Record<string, Record<string, unknown>[]>>(
    {},
  );
  const [historyByInterval, setHistoryByInterval] = useState<
    Partial<Record<HistoryInterval, Record<string, Record<string, unknown>[]>>>
  >({});
  const [historyInterval, setHistoryInterval] = useState<HistoryInterval>("max");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
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
  const liveAbortRef = useRef<AbortController | null>(null);
  const historyCacheRef = useRef<
    Partial<Record<HistoryInterval, Record<string, Record<string, unknown>[]>>>
  >({});
  const historyInflightRef = useRef<Set<HistoryInterval>>(new Set());
  const historyIntervalRef = useRef<HistoryInterval>("max");
  const historyAbortRef = useRef<AbortController | null>(null);

  const pollingActive =
    hasSelection && inView && tabVisible && !livePaused && activeTab === "liveline";

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
    setLivePoints({});
    setHistoryByInterval({});
    historyCacheRef.current = {};
    historyInflightRef.current = new Set();
    setHistoryInterval("max");
    historyIntervalRef.current = "max";
    setLiveError(null);
    setHistoryError(null);
    setLivePaused(false);
    setHiddenSeriesIds(new Set());
    setSeriesColorTokens({});
    setChartKey((k) => k + 1);
    if (!hasSelection) {
      setLiveLoading(false);
      setHistoryLoading(false);
      stopSocket();
    }
  }, [marketsKey, hasSelection, stopSocket]);

  useEffect(() => {
    if (!hasSelection) return undefined;
    liveAbortRef.current?.abort();
    const ac = new AbortController();
    liveAbortRef.current = ac;
    setLiveLoading(true);
    setLiveError(null);
    void fetchHistoryByToken(seriesSpecs, { interval: "1h", fidelity: 1 }, ac.signal)
      .then((byToken) => {
        if (ac.signal.aborted) return;
        setLivePoints(byToken);
        setLiveLoading(false);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (ac.signal.aborted) return;
        setLivePoints({});
        setLiveLoading(false);
        setLiveError(
          error instanceof Error ? error.message : "Failed to seed live prices",
        );
      });
    return () => ac.abort();
  }, [hasSelection, marketsKey, seriesSpecs]);

  useEffect(() => {
    historyIntervalRef.current = historyInterval;
  }, [historyInterval]);

  useEffect(() => {
    if (!hasSelection) return undefined;
    historyAbortRef.current?.abort();
    const ac = new AbortController();
    historyAbortRef.current = ac;

    const persist = (
      interval: HistoryInterval,
      byToken: Record<string, Record<string, unknown>[]>,
    ) => {
      historyCacheRef.current[interval] = byToken;
      setHistoryByInterval({ ...historyCacheRef.current });
      if (historyIntervalRef.current === interval) {
        setHistoryLoading(false);
        setHistoryError(null);
      }
    };

    const loadInterval = async (interval: HistoryInterval) => {
      if (ac.signal.aborted) return;
      if (historyCacheRef.current[interval]) return;
      if (historyInflightRef.current.has(interval)) return;
      historyInflightRef.current.add(interval);
      try {
        const byToken = await fetchHistoryByToken(
          seriesSpecs,
          { interval, fidelity: fidelityForHistoryInterval(interval) },
          ac.signal,
        );
        if (ac.signal.aborted) return;
        persist(interval, byToken);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (ac.signal.aborted) return;
        if (historyIntervalRef.current === interval && !historyCacheRef.current[interval]) {
          setHistoryError(
            error instanceof Error ? error.message : "Failed to load price history",
          );
          setHistoryLoading(false);
        }
      } finally {
        historyInflightRef.current.delete(interval);
      }
    };

    const waterfall = async () => {
      const selected = historyIntervalRef.current;
      if (!historyCacheRef.current[selected]) {
        setHistoryLoading(true);
        setHistoryError(null);
      }
      while (!ac.signal.aborted) {
        const preferred = historyIntervalRef.current;
        const next =
          !historyCacheRef.current[preferred] && !historyInflightRef.current.has(preferred)
            ? preferred
            : HISTORY_WATERFALL_ORDER.find(
                (interval) =>
                  !historyCacheRef.current[interval] &&
                  !historyInflightRef.current.has(interval),
              );
        if (!next) break;
        await loadInterval(next);
      }
      if (!ac.signal.aborted && !historyCacheRef.current[historyIntervalRef.current]) {
        setHistoryLoading(false);
      }
    };

    void waterfall();
    return () => ac.abort();
  }, [hasSelection, marketsKey, seriesSpecs]);

  useEffect(() => {
    stopSocket();
    if (!pollingActive) return undefined;
    const titleByToken = new Map(seriesSpecs.map((spec) => [spec.tokenId, spec.label]));
    socketStopRef.current = openPolymarketLastTradeSocket({
      assetIds: seriesSpecs.map((spec) => spec.tokenId),
      onStatus: (status: "open" | "closed" | "error") => {
        setSocketLive(status === "open");
      },
      onTrade: (row: {
        asset_id: string;
        price: number;
        time: string;
        timestamp: string;
        side?: string;
        size?: string;
        transaction_hash?: string;
      }) => {
        const tokenId = String(row.asset_id || "");
        const title = titleByToken.get(tokenId);
        if (!title) return;
        setLivePoints((prev) => ({
          ...prev,
          [tokenId]: mergeTrades(
            prev[tokenId] || [],
            [
              {
                ...row,
                yes_price_dollars: row.price,
              },
            ],
            tokenId,
            title,
            MAX_LIVE_POINTS,
          ),
        }));
      },
    });
    return () => {
      stopSocket();
    };
  }, [pollingActive, seriesSpecs, stopSocket, chartKey]);

  const historyPoints = historyByInterval[historyInterval];
  const historyReady = historyPoints != null;
  const pointsByToken = activeTab === "history" ? historyPoints || {} : livePoints;
  const loading = activeTab === "history" ? historyLoading && !historyReady : liveLoading;
  const error = activeTab === "history" ? historyError : liveError;

  const chartSeries = useMemo(
    () =>
      seriesSpecs.map((spec, index) => {
        const colorToken =
          seriesColorTokens[spec.id] ?? colorTokenForSpec(spec, index);
        const trades = pointsByToken[spec.tokenId] || [];
        return {
          key: spec.id,
          id: spec.id,
          label: spec.label,
          colorToken,
          color: resolveDemoChartColor(colorToken),
          trades,
        };
      }),
    [pointsByToken, seriesColorTokens, seriesSpecs],
  );

  const sheetRows = useMemo(
    () => chartSeries.flatMap((item) => item.trades),
    [chartSeries],
  );
  const hasData = sheetRows.length > 0;
  const jsonText = useMemo(() => JSON.stringify(sheetRows, null, 2), [sheetRows]);
  const sheetColumns = useMemo(() => {
    const keys = new Set<string>();
    for (const row of sheetRows) {
      for (const key of Object.keys(row)) keys.add(key);
    }
    const ordered = SHEET_PREFERRED_COLUMNS.filter((key) => keys.has(key));
    for (const key of keys) {
      if (!ordered.includes(key)) ordered.push(key);
    }
    return ordered;
  }, [sheetRows]);

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

  const exportJson = useCallback(() => {
    if (!sheetRows.length) return;
    downloadBlob(
      new Blob([JSON.stringify(sheetRows, null, 2)], {
        type: "application/json;charset=utf-8;",
      }),
      `polymarket-live-prices-${Date.now()}.json`,
    );
  }, [sheetRows]);

  const exportCsv = useCallback(() => {
    if (!sheetRows.length || !sheetColumns.length) return;
    const header = sheetColumns.map(escapeCsv).join(",");
    const lines = sheetRows.map((row) =>
      sheetColumns.map((col) => escapeCsv(cellValue(row[col]))).join(","),
    );
    downloadBlob(
      new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8;" }),
      `polymarket-live-prices-${Date.now()}.csv`,
    );
  }, [sheetColumns, sheetRows]);

  const exportXlsx = useCallback(() => {
    if (!sheetRows.length || !sheetColumns.length) return;
    const table = sheetRows.map((row) => {
      const out: Record<string, string> = {};
      for (const col of sheetColumns) out[col] = cellValue(row[col]);
      return out;
    });
    const ws = XLSX.utils.json_to_sheet(table);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Prices");
    XLSX.writeFile(wb, `polymarket-live-prices-${Date.now()}.xlsx`);
  }, [sheetColumns, sheetRows]);

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
      const filename = `polymarket-live-prices-chart-${Date.now()}`;
      try {
        if (format === "png") {
          downloadDataUrl(await toPng(el, opts), `${filename}.png`);
        } else if (format === "svg") {
          downloadDataUrl(await toSvg(el, opts), `${filename}.svg`);
        } else {
          downloadDataUrl(await toJpeg(el, { ...opts, quality: 0.95 }), `${filename}.jpg`);
        }
      } catch (e) {
        console.error("[HubPolymarketLivePricesDemo] chart export failed", e);
      } finally {
        setChartExporting(false);
      }
    },
    [chartExporting],
  );

  const tabs = useMemo(
    () => PRICE_TABS.map((tab) => ({ ...tab, disabled: !hasSelection })),
    [hasSelection],
  );

  return (
    <div
      ref={rootRef}
      className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5"
    >
      <div className="shrink-0 space-y-1">
        {heading ? (
          <h3 className="text-lg font-semibold tracking-tight text-foreground">
            {heading}
          </h3>
        ) : null}
        {helper ? (
          <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
            {helper}
          </p>
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
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-5 lg:items-stretch">
          <div className="lg:col-span-1">
            <HubKalshiLiveDemoTabs
              tabs={tabs}
              activeId={activeTab}
              onChange={(id) => setActiveTab(id as PriceTabId)}
              contentLoading={loading}
            />
          </div>

          <div className="flex min-h-0 min-w-0 flex-col lg:col-span-4" role="tabpanel">
            <div
              className={cn(
                "flex min-h-[12rem] flex-1 flex-col overflow-hidden rounded-xl border border-border/70 bg-muted/20",
                viewMode === "chart" && "min-h-[28rem]",
              )}
            >
              <div className="flex shrink-0 flex-col gap-2 border-b border-border/60 px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {activeTab === "liveline" ? "Live prices" : "Price history"}
                </p>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {loading ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      Loading…
                    </span>
                  ) : hasData ? (
                    <span className="text-xs text-muted-foreground">
                      {sheetRows.length} point{sheetRows.length === 1 ? "" : "s"}
                      {markets.length > 1 ? ` · ${markets.length} markets` : ""}
                    </span>
                  ) : null}

                  {activeTab === "liveline" ? (
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
                  ) : null}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!hasData || loading}
                    onClick={() => setViewMode("chart")}
                    className={cn(
                      "h-7 gap-1.5 px-2 text-[11px] font-medium text-muted-foreground",
                      viewMode === "chart" &&
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
              {activeTab === "history" ? (
                <div
                  className="inline-flex h-7 w-fit max-w-full items-center overflow-x-auto rounded-md border border-border/70 bg-background p-0.5"
                  role="group"
                  aria-label="Price history interval"
                >
                  {POLYMARKET_PRICES_HISTORY_INTERVAL_OPTIONS.map((option) => {
                    const cached = historyByInterval[option.value] != null;
                    const selected = historyInterval === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          if (historyInterval === option.value) return;
                          setHistoryInterval(option.value);
                          setHistoryLoading(!cached);
                        }}
                        className={cn(
                          "inline-flex h-6 shrink-0 items-center rounded px-2 text-[11px] font-medium transition-colors",
                          selected
                            ? "bg-muted text-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                        )}
                        aria-pressed={selected}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              </div>

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
                  {activeTab === "liveline"
                    ? "Waiting for live market activity…"
                    : "No price history available for this market."}
                </p>
              ) : viewMode === "chart" ? (
                <div className="flex min-h-0 flex-1 flex-col">
                  {activeTab === "liveline" ? (
                    <HubKalshiLiveDemoTradesLiveline
                      key={chartKey}
                      ref={chartRef}
                      series={chartSeries}
                      hiddenSeriesIds={hiddenSeriesIds}
                      onToggleSeries={toggleSeries}
                      onChangeSeriesColor={changeSeriesColor}
                      persistHistory
                      fill
                      paused={livePaused || !pollingActive}
                      fixedValueDomain={
                        seriesSpecs.length > 1 ? { min: 0, max: 100 } : undefined
                      }
                      className="min-h-0 flex-1"
                    />
                  ) : (
                    <HubKalshiLiveDemoTradesChart
                      ref={chartRef}
                      series={chartSeries}
                      hiddenSeriesIds={hiddenSeriesIds}
                      onToggleSeries={toggleSeries}
                      onChangeSeriesColor={changeSeriesColor}
                      animate
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
                          key={tradeKey(row) || String(rowIndex)}
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
        </div>
      )}
    </div>
  );
}
