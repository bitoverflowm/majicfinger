"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { HubInPageLink } from "@/components/hubs/HubCtaButton";
import { Braces, Download, Filter, LineChart, Loader2, Table2 } from "lucide-react";
import { toJpeg, toPng, toSvg } from "html-to-image";
import * as XLSX from "xlsx";

import { HubKalshiLiveDemoTradesChart } from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveDemoTradesChart";
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
import { cn } from "@/lib/utils";

type ViewMode = "chart" | "sheet" | "json";
type ChartTimeframe = "all" | "minute" | "hour" | "day";
type MinNotional = 10 | 100 | 1000 | null;

const TIMEFRAME_OPTIONS: { id: ChartTimeframe; label: string }[] = [
  { id: "all", label: "All trades" },
  { id: "minute", label: "Minute" },
  { id: "hour", label: "Hour" },
  { id: "day", label: "Day" },
];

const SIZE_FILTER_OPTIONS: { value: MinNotional; label: string }[] = [
  { value: 10, label: "$10+" },
  { value: 100, label: "$100+" },
  { value: 1000, label: "$1,000+" },
  { value: null, label: "Cancel filter" },
];

const TIMEFRAME_BUCKET_MS: Record<ChartTimeframe, number | null> = {
  all: null,
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
};

const MAX_LIVE_TAPE = 80;

type SeriesSpec = {
  id: string;
  tokenId: string;
  label: string;
  outcome: string;
};

const MAX_HISTORY_POINTS = 2500;
const MAX_MERGED_POINTS = 2800;
const TRADE_HISTORY_LIMIT = 1000;
const SEARCH_HREF = "#find-polymarket-markets";

const SHEET_PREFERRED_COLUMNS = [
  "market_title",
  "created_time",
  "time",
  "outcome",
  "side",
  "size",
  "yes_price_dollars",
  "price",
  "asset_id",
  "source",
  "transaction_hash",
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

function tradeNotionalUsd(row: Record<string, unknown>): number | null {
  const price = Number(row.yes_price_dollars ?? row.price);
  const size = Number(row.size);
  if (!Number.isFinite(price) || !Number.isFinite(size) || size <= 0) return null;
  return size * price;
}

function passesSizeFilter(row: Record<string, unknown>, minNotional: MinNotional): boolean {
  if (minNotional == null) return true;
  const notional = tradeNotionalUsd(row);
  return notional != null && notional >= minNotional;
}

function bucketTrades(
  trades: Record<string, unknown>[],
  timeframe: ChartTimeframe,
): Record<string, unknown>[] {
  const bucketMs = TIMEFRAME_BUCKET_MS[timeframe];
  if (bucketMs == null) return trades;
  const buckets = new Map<number, Record<string, unknown>>();
  for (const row of trades) {
    const t = parseTradeTimeMs(row);
    if (!t) continue;
    const key = Math.floor(t / bucketMs) * bucketMs;
    buckets.set(key, {
      ...row,
      created_time: new Date(key).toISOString(),
      time: new Date(key).toISOString(),
      timestamp: String(key),
    });
  }
  return [...buckets.values()].sort((a, b) => parseTradeTimeMs(a) - parseTradeTimeMs(b));
}

function formatTapeTime(ms: number): string {
  if (!ms) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toLocaleTimeString();
  }
}

function formatTapePrice(price: unknown): string {
  const n = Number(price);
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n <= 1 ? n * 100 : n)}¢`;
}

function formatTapeSide(side: unknown): string {
  const s = String(side || "").trim();
  if (!s) return "—";
  return s.toUpperCase();
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

function toChartRow(
  row: Record<string, unknown>,
  tokenId: string,
  marketTitle: string,
  source: string,
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
    outcome: row.outcome != null ? String(row.outcome) : "",
    side: row.side != null ? String(row.side) : "",
    size: row.size != null && row.size !== "" ? String(row.size) : "",
    transaction_hash: row.transaction_hash ?? row.transactionHash ?? row.hash ?? "",
    source,
  };
}

function mergeTrades(
  prev: Record<string, unknown>[],
  next: Record<string, unknown>[],
  tokenId: string,
  marketTitle: string,
  source: string,
  max: number,
): Record<string, unknown>[] {
  const map = new Map<string, Record<string, unknown>>();
  for (const raw of [...prev, ...next]) {
    const row = toChartRow(raw, tokenId, marketTitle, String(raw.source || source));
    if (!row) continue;
    const key = tradeKey(row);
    const existing = map.get(key);
    if (existing && String(existing.source) === "live") continue;
    map.set(key, row);
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

function conditionIdsFromMarkets(markets: HubPolymarketLiveDemoMarket[]): string[] {
  return [
    ...new Set(
      markets
        .map((market) => String(market.conditionId || "").trim())
        .filter(Boolean),
    ),
  ];
}

function specForExecutedTrade(
  trade: Record<string, unknown>,
  specs: SeriesSpec[],
): SeriesSpec | null {
  const asset = String(trade.asset || trade.asset_id || "").trim();
  if (asset) {
    const byAsset = specs.find((spec) => spec.tokenId === asset);
    if (byAsset) return byAsset;
  }
  const outcome = String(trade.outcome || "").trim().toLowerCase();
  if (!outcome) return null;
  return specs.find((spec) => spec.outcome.toLowerCase() === outcome) || null;
}

async function fetchExecutedTrades(
  markets: HubPolymarketLiveDemoMarket[],
  specs: SeriesSpec[],
  signal: AbortSignal,
): Promise<Record<string, Record<string, unknown>[]>> {
  const conditionIds = conditionIdsFromMarkets(markets);
  if (!conditionIds.length) {
    throw new Error("Selected markets are missing condition IDs for trade history.");
  }

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
            : typeof payload?.error === "string"
              ? payload.error
              : "Failed to load trade history",
        );
      }
      return Array.isArray(payload) ? payload : [];
    }),
  );

  const byToken: Record<string, Record<string, unknown>[]> = {};
  for (const spec of specs) byToken[spec.tokenId] = [];

  for (const raw of pages.flat()) {
    if (!raw || typeof raw !== "object") continue;
    const trade = raw as Record<string, unknown>;
    const spec = specForExecutedTrade(trade, specs);
    if (!spec) continue;
    const mapped = toChartRow(
      {
        ...trade,
        asset_id: spec.tokenId,
        outcome: trade.outcome || spec.outcome,
        transaction_hash: trade.transactionHash ?? trade.transaction_hash,
      },
      spec.tokenId,
      spec.label,
      "history",
    );
    if (!mapped) continue;
    byToken[spec.tokenId].push(mapped);
  }

  for (const spec of specs) {
    byToken[spec.tokenId] = mergeTrades(
      [],
      byToken[spec.tokenId] || [],
      spec.tokenId,
      spec.label,
      "history",
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

export function HubPolymarketLiveTradesDemo({
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

  const [viewMode, setViewMode] = useState<ViewMode>("chart");
  const [pointsByToken, setPointsByToken] = useState<
    Record<string, Record<string, unknown>[]>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socketLive, setSocketLive] = useState(false);
  const [livePaused, setLivePaused] = useState(false);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const [chartExporting, setChartExporting] = useState(false);
  const [hiddenSeriesIds, setHiddenSeriesIds] = useState<Set<string>>(() => new Set());
  const [seriesColorTokens, setSeriesColorTokens] = useState<
    Record<string, DemoChartColorTokenId>
  >({});
  const [timeframe, setTimeframe] = useState<ChartTimeframe>("all");
  const [minNotional, setMinNotional] = useState<MinNotional>(null);
  const [liveTape, setLiveTape] = useState<Record<string, unknown>[]>([]);

  const rootRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const socketStopRef = useRef<(() => void) | null>(null);
  const historyAbortRef = useRef<AbortController | null>(null);

  const pollingActive = hasSelection && inView && tabVisible && !livePaused;

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
    setPointsByToken({});
    setLiveTape([]);
    setError(null);
    setLivePaused(false);
    setHiddenSeriesIds(new Set());
    setSeriesColorTokens({});
    if (!hasSelection) {
      setLoading(false);
      stopSocket();
    }
  }, [hasSelection, marketsKey, stopSocket]);

  useEffect(() => {
    if (!hasSelection) return undefined;
    historyAbortRef.current?.abort();
    const ac = new AbortController();
    historyAbortRef.current = ac;
    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        const byToken = await fetchExecutedTrades(markets, seriesSpecs, ac.signal);
        if (ac.signal.aborted) return;
        setPointsByToken(byToken);
        setLoading(false);
        setError(null);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (ac.signal.aborted) return;
        setPointsByToken({});
        setLoading(false);
        setError(err instanceof Error ? err.message : "Failed to load trade history");
      }
    };
    void load();
    return () => ac.abort();
  }, [hasSelection, markets, marketsKey, seriesSpecs]);

  useEffect(() => {
    stopSocket();
    if (!pollingActive) return undefined;
    socketStopRef.current = openPolymarketLastTradeSocket({
      assetIds: seriesSpecs.map((spec) => spec.tokenId),
      onStatus: (status: "open" | "closed" | "error") => {
        setSocketLive(status === "open");
      },
      onTrade: (row) => {
        const tokenId = String(row.asset_id || "");
        const spec = seriesSpecs.find((item) => item.tokenId === tokenId);
        if (!spec) return;
        const liveRow = {
          ...row,
          yes_price_dollars: row.price,
          source: "live",
          outcome: spec.outcome,
          market_title: spec.label,
        };
        setLiveTape((prev) => {
          const next = [liveRow, ...prev.filter((item) => tradeKey(item) !== tradeKey(liveRow))];
          return next.slice(0, MAX_LIVE_TAPE);
        });
        setPointsByToken((prev) => ({
          ...prev,
          [tokenId]: mergeTrades(
            prev[tokenId] || [],
            [liveRow],
            tokenId,
            spec.label,
            "live",
            MAX_MERGED_POINTS,
          ),
        }));
      },
    });
    return () => {
      stopSocket();
    };
  }, [pollingActive, seriesSpecs, stopSocket]);

  const chartSeries = useMemo(
    () =>
      seriesSpecs.map((spec, index) => {
        const colorToken = seriesColorTokens[spec.id] ?? colorTokenForSpec(spec, index);
        const filtered = (pointsByToken[spec.tokenId] || []).filter((row) =>
          passesSizeFilter(row, minNotional),
        );
        return {
          key: spec.id,
          id: spec.id,
          label: spec.label,
          colorToken,
          color: resolveDemoChartColor(colorToken),
          trades: bucketTrades(filtered, timeframe),
        };
      }),
    [minNotional, pointsByToken, seriesColorTokens, seriesSpecs, timeframe],
  );

  const liveTapeRows = useMemo(
    () => liveTape.filter((row) => passesSizeFilter(row, minNotional)),
    [liveTape, minNotional],
  );

  const sheetRows = useMemo(
    () => chartSeries.flatMap((item) => item.trades),
    [chartSeries],
  );
  const hasData = useMemo(
    () => Object.values(pointsByToken).some((rows) => rows.length > 0),
    [pointsByToken],
  );
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
  const liveCount = useMemo(
    () => sheetRows.filter((row) => String(row.source) === "live").length,
    [sheetRows],
  );

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

  const exportBasename = `polymarket-live-trades-${Date.now()}`;

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
      sheetColumns.map((col) => escapeCsv(cellValue(row[col]))).join(","),
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
      for (const col of sheetColumns) out[col] = cellValue(row[col]);
      return out;
    });
    const ws = XLSX.utils.json_to_sheet(table);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Trades");
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
        if (format === "png") downloadDataUrl(await toPng(el, opts), `${exportBasename}.png`);
        else if (format === "svg") downloadDataUrl(await toSvg(el, opts), `${exportBasename}.svg`);
        else downloadDataUrl(await toJpeg(el, { ...opts, quality: 0.95 }), `${exportBasename}.jpg`);
      } catch (e) {
        console.error("[HubPolymarketLiveTradesDemo] chart export failed", e);
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
          aria-label="Live trades with executed history"
        >
          <div className="flex shrink-0 flex-col gap-2 border-b border-border/60 px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                  Executed trades with live prints
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
                  {liveCount ? ` · ${liveCount} live` : ""}
                  {markets.length > 1 ? ` · ${markets.length} markets` : ""}
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

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div
                className="inline-flex h-7 items-center rounded-md border border-border/70 bg-background p-0.5"
                role="group"
                aria-label="Chart time frame"
              >
                {TIMEFRAME_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setTimeframe(option.id)}
                    className={cn(
                      "inline-flex h-6 items-center rounded px-2 text-[11px] font-medium transition-colors",
                      timeframe === option.id
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                    )}
                    aria-pressed={timeframe === option.id}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="inline-flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">
                  filter by trade size
                </span>
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label="Filter by trade size"
                    className={cn(
                      "h-7 gap-1.5 px-2 text-[11px] font-medium text-muted-foreground",
                      minNotional != null &&
                        "border-secondary/40 bg-secondary/10 text-foreground",
                    )}
                  >
                    <Filter className="size-3.5" aria-hidden />
                    {minNotional == null
                      ? "Size"
                      : minNotional === 1000
                        ? "$1,000+"
                        : `$${minNotional}+`}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[9.5rem]">
                  {SIZE_FILTER_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={String(option.value)}
                      className="text-xs"
                      onSelect={() => setMinNotional(option.value)}
                    >
                      <span
                        className={cn(
                          "mr-2 inline-block w-3 text-center",
                          minNotional === option.value ? "opacity-100" : "opacity-0",
                        )}
                        aria-hidden
                      >
                        ✓
                      </span>
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
            </div>
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
              Waiting for trade history and live prints…
            </p>
          ) : viewMode === "chart" ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <HubKalshiLiveDemoTradesChart
                ref={chartRef}
                series={chartSeries}
                hiddenSeriesIds={hiddenSeriesIds}
                onToggleSeries={toggleSeries}
                onChangeSeriesColor={changeSeriesColor}
                emphasizeLiveDots
                livePulse={!livePaused && socketLive}
                animate
                className="min-h-[12rem] flex-1"
              />
              <div className="flex max-h-[10.5rem] min-h-[7.5rem] shrink-0 flex-col border-t border-border/60 bg-background/40">
                <div className="flex shrink-0 items-center gap-2 px-3 py-1.5">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Live trades
                  </p>
                </div>
                <div className="min-h-0 flex-1 overflow-auto">
                  <table className="w-full min-w-0 border-collapse text-left text-[11px] sm:text-xs">
                    <thead className="sticky top-0 z-[1] bg-muted/90 backdrop-blur">
                      <tr className="border-b border-border/60">
                        <th className="whitespace-nowrap px-3 py-1.5 font-medium text-muted-foreground">
                          Time
                        </th>
                        <th className="whitespace-nowrap px-3 py-1.5 font-medium text-muted-foreground">
                          Outcome
                        </th>
                        <th className="whitespace-nowrap px-3 py-1.5 font-medium text-muted-foreground">
                          Side
                        </th>
                        <th className="whitespace-nowrap px-3 py-1.5 font-medium text-muted-foreground">
                          Price
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {liveTapeRows.length ? (
                        liveTapeRows.map((row, rowIndex) => (
                          <tr
                            key={tradeKey(row) || String(rowIndex)}
                            className="border-b border-border/40 last:border-0"
                          >
                            <td className="whitespace-nowrap px-3 py-1.5 font-mono tabular-nums text-foreground">
                              {formatTapeTime(parseTradeTimeMs(row))}
                            </td>
                            <td className="whitespace-nowrap px-3 py-1.5 text-foreground">
                              {String(row.outcome || row.market_title || "—")}
                            </td>
                            <td className="whitespace-nowrap px-3 py-1.5 text-foreground">
                              {formatTapeSide(row.side)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-1.5 font-mono tabular-nums text-foreground">
                              {formatTapePrice(row.yes_price_dollars ?? row.price)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-3 py-4 text-center text-muted-foreground"
                          >
                            No live trades yet
                            {minNotional != null ? ` at $${minNotional}+` : ""}.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
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
      )}
    </div>
  );
}
