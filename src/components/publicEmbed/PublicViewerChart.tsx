"use client";

import { useMemo, useState, type ComponentType } from "react";
import dynamic from "next/dynamic";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MarketChart as MarketChartJs } from "@/components/spectrumui/charts/market-chart";
import { IndicatorChart as IndicatorChartJs } from "@/components/spectrumui/charts/indicator-chart";
import { seriesVarsClassName } from "@/components/spectrumui/charts/chart-engine";
import {
  ohlcRowsToCandles as ohlcRowsToCandlesJs,
  rangesForCandles as rangesForCandlesJs,
} from "@/components/dashboardComposer/tradeMarketCandles";
import { ChartPaneSkeleton } from "@/components/publicEmbed/PublicDashboardSkeletons";
import type { ViewerChartPayload } from "@/lib/publicChartViewerPayload";
import { cn } from "@/lib/utils";

type LooseComponent = ComponentType<Record<string, unknown>>;
type Range = { label: string; ms: number | null };

const MarketChart = MarketChartJs as unknown as LooseComponent;
const IndicatorChart = IndicatorChartJs as unknown as LooseComponent;
const ohlcRowsToCandles = ohlcRowsToCandlesJs as unknown as (
  columns: Array<{ id: string; title: string }>,
  rows: unknown[][],
) => { candles: Array<{ t: number }>; volumeLabel?: string; units?: string };
const rangesForCandles = rangesForCandlesJs as unknown as (points: Array<{ t: number } | number>) => Range[];

const LegacyChartBlock = dynamic(
  () =>
    import("@/components/dashboardComposer/PublicDashboardChartBlock").then(
      (m) => m.PublicDashboardChartBlock as unknown as LooseComponent,
    ),
  { loading: () => <ChartPaneSkeleton /> },
);

type Builder = {
  v?: number;
  selChartType?: string;
  selX?: string | null;
  selY?: string[];
  candlestickSheetId?: string;
  normalizeMode?: string | null;
  lineSeriesValues?: unknown[];
  chartLineFilters?: unknown[];
  chartFilterColumn?: string | null;
  title?: string;
};

type Sheet = { name?: string; data?: Record<string, unknown>[]; columns?: string[] };

const LINE_COLORS = ["var(--spectrum-series-1)", "var(--spectrum-series-3)", "var(--spectrum-series-4)", "var(--spectrum-series-2)"];

export function readChartBuilder(payload: ViewerChartPayload | null | undefined): Builder | null {
  const chart = payload?.chart as { rechartsBuilder?: Builder; chart_properties?: Array<{ rechartsBuilder?: Builder }> } | undefined;
  if (chart?.rechartsBuilder?.v === 1) return chart.rechartsBuilder;
  const cp = Array.isArray(chart?.chart_properties) ? chart?.chart_properties[0]?.rechartsBuilder : null;
  return cp?.v === 1 ? cp : null;
}

export type ViewerChartKind = "candles" | "line" | "bars" | "legacy";

function splitKey(key: string | null | undefined): { sheetId: string | null; column: string } {
  const raw = String(key || "");
  const idx = raw.indexOf("::");
  return idx > -1 ? { sheetId: raw.slice(0, idx), column: raw.slice(idx + 2) } : { sheetId: null, column: raw };
}

function sheetEntries(payload: ViewerChartPayload): Array<[string, Sheet]> {
  return Object.entries((payload.dataSheets || {}) as Record<string, Sheet>);
}

function candleSheet(payload: ViewerChartPayload, rb: Builder): Sheet | null {
  const sheets = (payload.dataSheets || {}) as Record<string, Sheet>;
  const preferred = rb.candlestickSheetId ? sheets[rb.candlestickSheetId] : null;
  const hasOhlc = (s: Sheet | null | undefined) =>
    !!s && Array.isArray(s.data) && s.data.length > 0 && "price_close_dollars" in (s.data[0] || {});
  if (hasOhlc(preferred)) return preferred;
  if (payload.rowsSheetId && hasOhlc(sheets[payload.rowsSheetId])) return sheets[payload.rowsSheetId];
  return sheetEntries(payload).map(([, s]) => s).find(hasOhlc) || null;
}

function toMatrix(sheet: Sheet) {
  const rows = Array.isArray(sheet.data) ? sheet.data : [];
  const ids = Array.isArray(sheet.columns) && sheet.columns.length ? sheet.columns : Object.keys(rows[0] || {});
  const columns = ids.map((id) => ({ id, title: id }));
  return { columns, rows: rows.map((row) => ids.map((id) => row?.[id])) };
}

function parseTime(value: unknown): number {
  if (value == null || value === "") return NaN;
  const n = Number(value);
  if (Number.isFinite(n) && n > 1e9) return n > 1e12 ? n : n * 1000;
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : NaN;
}

function lineSeries(payload: ViewerChartPayload, rb: Builder) {
  const x = splitKey(rb.selX);
  const ys = (Array.isArray(rb.selY) ? rb.selY : []).map(splitKey).filter((y) => y.column);
  if (!x.column || !ys.length) return null;
  const sheetIds = new Set([x.sheetId, ...ys.map((y) => y.sheetId)].filter(Boolean));
  if (sheetIds.size > 1) return null;
  const sheets = (payload.dataSheets || {}) as Record<string, Sheet>;
  const sheetId = [...sheetIds][0] as string | undefined;
  const rows =
    (sheetId && Array.isArray(sheets[sheetId]?.data) ? sheets[sheetId].data : null) ||
    (Array.isArray(payload.rows) ? (payload.rows as Record<string, unknown>[]) : []);
  if (rows.length < 2) return null;

  let timed = 0;
  const series = ys.map((y) => ({ id: y.column, points: [] as Array<{ t: number; price: number }> }));
  for (const row of rows) {
    const t = parseTime(row?.[x.column]);
    if (!Number.isFinite(t)) continue;
    timed += 1;
    ys.forEach((y, i) => {
      const v = Number(row?.[y.column]);
      if (row?.[y.column] != null && row?.[y.column] !== "" && Number.isFinite(v)) series[i].points.push({ t, price: v });
    });
  }
  if (timed / rows.length < 0.9) return null;
  for (const s of series) s.points.sort((a, b) => a.t - b.t);
  if (!series[0].points.length) return null;
  return series;
}

const MAX_BARS = 60;

type BarDatum = { label: string } & Record<string, number | string>;

function formatBarDates(times: number[]): (t: number) => string {
  const dates = times.map((t) => new Date(t));
  const allJan1 = dates.every((d) => d.getMonth() === 0 && d.getDate() === 1);
  const allFirst = dates.every((d) => d.getDate() === 1);
  const fmt = new Intl.DateTimeFormat("en-US", allJan1 ? { year: "numeric" } : allFirst ? { month: "short", year: "2-digit" } : { month: "short", day: "numeric" });
  return (t) => fmt.format(new Date(t));
}

function barSeries(payload: ViewerChartPayload, rb: Builder) {
  const x = splitKey(rb.selX);
  const ys = (Array.isArray(rb.selY) ? rb.selY : []).map(splitKey).filter((y) => y.column);
  if (!x.column || !ys.length) return null;
  const sheetIds = new Set([x.sheetId, ...ys.map((y) => y.sheetId)].filter(Boolean));
  if (sheetIds.size > 1) return null;
  const sheets = (payload.dataSheets || {}) as Record<string, Sheet>;
  const sheetId = [...sheetIds][0] as string | undefined;
  const rows = (
    (sheetId && Array.isArray(sheets[sheetId]?.data) ? sheets[sheetId].data : null) ||
    (Array.isArray(payload.rows) ? (payload.rows as Record<string, unknown>[]) : [])
  ).slice(0, MAX_BARS);
  if (!rows.length) return null;
  // Repeated X values mean grouped/stacked bars, which only the legacy renderer draws correctly.
  if (new Set(rows.map((row) => String(row?.[x.column] ?? ""))).size < rows.length) return null;

  const times = rows.map((row) => parseTime(row?.[x.column]));
  const first = rows[0]?.[x.column];
  const yearLike = typeof first === "number" && first < 1e9;
  const timed = !yearLike && times.filter(Number.isFinite).length / rows.length >= 0.9;
  const order = rows.map((_, i) => i);
  if (timed) order.sort((a, b) => (times[a] || 0) - (times[b] || 0));
  const dateLabel = timed ? formatBarDates(times.filter(Number.isFinite)) : null;

  const data: BarDatum[] = order.map((i) => {
    const row = rows[i];
    const datum: BarDatum = {
      label: dateLabel && Number.isFinite(times[i]) ? dateLabel(times[i]) : String(row?.[x.column] ?? ""),
    };
    for (const y of ys) {
      const v = Number(row?.[y.column]);
      datum[y.column] = Number.isFinite(v) ? v : 0;
    }
    return datum;
  });
  return { data, keys: ys.map((y) => y.column) };
}

function plainConfig(rb: Builder) {
  return (
    !rb.normalizeMode &&
    !(Array.isArray(rb.lineSeriesValues) && rb.lineSeriesValues.length) &&
    !(Array.isArray(rb.chartLineFilters) && rb.chartLineFilters.length) &&
    !rb.chartFilterColumn
  );
}

/** Which renderer a published chart gets: the current market/indicator charts where the config maps cleanly. */
export function viewerChartKind(payload: ViewerChartPayload | null | undefined): ViewerChartKind {
  const rb = payload ? readChartBuilder(payload) : null;
  if (!payload || !rb) return "legacy";
  const type = String(rb.selChartType || "");
  if (type === "candlestick") return candleSheet(payload, rb) ? "candles" : "legacy";
  if (!plainConfig(rb)) return "legacy";
  if (type === "line" || type === "area") return lineSeries(payload, rb) ? "line" : "legacy";
  if (type === "bar") return barSeries(payload, rb) ? "bars" : "legacy";
  return "legacy";
}

function prettyColumn(id: string) {
  const words = id.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  return words ? words[0].toUpperCase() + words.slice(1) : "Value";
}

function CandlesView({ payload, rb, live }: { payload: ViewerChartPayload; rb: Builder; live: boolean }) {
  const sheet = candleSheet(payload, rb);
  const built = useMemo(() => {
    if (!sheet) return { candles: [] as Array<{ t: number }>, volumeLabel: "Volume fp", units: undefined as string | undefined };
    const { columns, rows } = toMatrix(sheet);
    return ohlcRowsToCandles(columns, rows);
  }, [sheet]);
  const ranges = useMemo(() => rangesForCandles(built.candles), [built.candles]);
  const [range, setRange] = useState("All");
  const symbol = String(sheet?.name || "").toUpperCase();
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col pt-1", seriesVarsClassName)}>
      <MarketChart
        data={built.candles}
        symbol={symbol}
        variant="candles"
        name="Price"
        units={built.units || "currency"}
        volumeLabel={built.volumeLabel || "Volume fp"}
        ranges={ranges}
        defaultRange="All"
        rangeValue={range}
        onRangeChange={setRange}
        live={live}
        status={built.candles.length ? "ready" : "empty"}
        emptyLabel="No price bars yet."
      />
    </div>
  );
}

function LineView({ payload, rb, live }: { payload: ViewerChartPayload; rb: Builder; live: boolean }) {
  const series = useMemo(() => lineSeries(payload, rb) || [], [payload, rb]);
  const main = series[0];
  const overlays = useMemo(
    () =>
      series.slice(1).map((s, i) => ({
        id: s.id,
        label: prettyColumn(s.id),
        points: s.points,
        color: LINE_COLORS[(i + 1) % LINE_COLORS.length],
      })),
    [series],
  );
  const ranges = useMemo(() => rangesForCandles((main?.points || []).map((p) => p.t)), [main]);
  const [range, setRange] = useState("All");
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col pt-1", seriesVarsClassName)}>
      <IndicatorChart
        points={main?.points || []}
        overlays={overlays}
        indicators={[]}
        name={prettyColumn(main?.id || "")}
        lineLabel={overlays.length ? prettyColumn(main?.id || "") : ""}
        color={overlays.length ? LINE_COLORS[0] : ""}
        ranges={ranges}
        defaultRange="All"
        rangeValue={range}
        onRangeChange={setRange}
        live={live}
        status={main?.points.length ? "ready" : "empty"}
        emptyLabel="No points to chart yet."
        units="number"
        curve="monotone"
      />
    </div>
  );
}

const BAR_COLORS = ["#0d99ff", "#0d9488", "#7c3aed", "#f59e0b"];
const compactNumber = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

function BarsView({ payload, rb }: { payload: ViewerChartPayload; rb: Builder }) {
  const built = useMemo(() => barSeries(payload, rb), [payload, rb]);
  if (!built) return null;
  return (
    <div className="flex min-h-0 flex-1 flex-col px-2 pb-2">
      <p className="px-1 pb-1 text-[11px] text-muted-foreground">{built.keys.map(prettyColumn).join(" · ")}</p>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={built.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} className="stroke-border/60" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--muted-foreground, #737373)" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={16}
              tickFormatter={(v: string) => (v.length > 14 ? `${v.slice(0, 13)}…` : v)}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--muted-foreground, #737373)" }}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v: number) => compactNumber.format(v)}
            />
            <Tooltip
              cursor={{ fill: "rgba(13,153,255,0.06)" }}
              formatter={(v: number, name: string) => [compactNumber.format(v), prettyColumn(name)]}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            {built.keys.map((key, i) => (
              <Bar key={key} dataKey={key} fill={BAR_COLORS[i % BAR_COLORS.length]} radius={[3, 3, 0, 0]} maxBarSize={48} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function PublicViewerChart({
  payload,
  live = false,
  legacyProps,
}: {
  payload: ViewerChartPayload;
  live?: boolean;
  legacyProps: {
    ownerHandle?: string;
    chartSlug?: string;
    chartId?: string;
    layoutColumnKey?: string;
    dashboardSlug?: string;
    chartTitle?: string;
  };
}) {
  const kind = viewerChartKind(payload);
  const rb = readChartBuilder(payload);
  if (kind === "candles" && rb) return <CandlesView payload={payload} rb={rb} live={live} />;
  if (kind === "line" && rb) return <LineView payload={payload} rb={rb} live={live} />;
  if (kind === "bars" && rb) return <BarsView payload={payload} rb={rb} />;
  return (
    <div className="flex min-h-0 flex-1 flex-col px-2 pb-2">
      <LegacyChartBlock chartPayload={payload} bare {...legacyProps} />
    </div>
  );
}
