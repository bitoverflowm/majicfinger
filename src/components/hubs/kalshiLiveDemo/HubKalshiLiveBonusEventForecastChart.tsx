"use client";

import { forwardRef, useMemo } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  DEMO_CHART_COLOR_TOKENS,
  type DemoChartColorTokenId,
  demoChartCssVar,
} from "@/components/hubs/kalshiLiveDemo/demoChartColors";
import { HubKalshiLiveDemoTradeSeriesLegend } from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveDemoTradeSeriesLegend";
import { formatForecastPercentilePct } from "@/lib/kalshiLive/eventForecastColumns";
import { cn } from "@/lib/utils";

export type HubKalshiLiveBonusEventForecastChartSeries = {
  key: string;
  /** Display percentile, e.g. 50 */
  percentilePct: number;
  label: string;
  colorToken?: DemoChartColorTokenId;
};

type HubKalshiLiveBonusEventForecastChartProps = {
  /** Flattened forecast rows (one per percentile point per period). */
  rows: Record<string, unknown>[];
  series: HubKalshiLiveBonusEventForecastChartSeries[];
  hiddenSeriesIds?: ReadonlySet<string>;
  onToggleSeries?: (id: string) => void;
  onChangeSeriesColor?: (id: string, tokenId: DemoChartColorTokenId) => void;
  className?: string;
};

function parsePeriodMs(row: Record<string, unknown>): number | null {
  const raw = row.end_period_ts;
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return null;
  return n < 1e12 ? n * 1000 : n;
}

function parseNumerical(row: Record<string, unknown>): number | null {
  const raw = row.numerical_forecast ?? row.raw_numerical_forecast;
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
}

function formatAxisTime(ms: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toLocaleString();
  }
}

function formatTooltipTime(ms: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toISOString();
  }
}

function formatForecastValue(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
  if (abs >= 10) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

/** Compact y-axis labels so wide values (e.g. 100,000) stay inside the chart. */
function formatAxisForecastValue(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 })}M`;
  }
  if (abs >= 10_000) {
    return `${(value / 1_000).toLocaleString(undefined, { maximumFractionDigits: 0 })}k`;
  }
  if (abs >= 1000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  if (abs >= 10) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function seriesColorToken(
  index: number,
  override?: DemoChartColorTokenId,
): DemoChartColorTokenId {
  if (override) return override;
  return DEMO_CHART_COLOR_TOKENS[index % DEMO_CHART_COLOR_TOKENS.length]!.id;
}

export const HubKalshiLiveBonusEventForecastChart = forwardRef<
  HTMLDivElement,
  HubKalshiLiveBonusEventForecastChartProps
>(function HubKalshiLiveBonusEventForecastChart(
  {
    rows,
    series,
    hiddenSeriesIds,
    onToggleSeries,
    onChangeSeriesColor,
    className,
  },
  ref,
) {
  const hidden = hiddenSeriesIds ?? new Set();

  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {};
    series.forEach((item, index) => {
      const token = seriesColorToken(index, item.colorToken);
      config[item.key] = {
        label: item.label,
        color: demoChartCssVar(token),
      };
    });
    return config;
  }, [series]);

  const legendItems = useMemo(
    () =>
      series.map((item, index) => {
        const token = seriesColorToken(index, item.colorToken);
        return {
          id: item.key,
          label: item.label,
          color: demoChartCssVar(token),
          colorToken: token,
        };
      }),
    [series],
  );

  const data = useMemo(() => {
    const byTime = new Map<number, Record<string, unknown>>();
    const keyByPct = new Map(
      series.map((s) => [Math.round(s.percentilePct * 100), s.key] as const),
    );

    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const t = parsePeriodMs(row);
      const value = parseNumerical(row);
      if (t == null || value == null) continue;

      let apiPct = Math.floor(Number(row.percentile));
      if (!Number.isFinite(apiPct)) {
        const displayPct = Number(row.percentile_pct);
        apiPct = Number.isFinite(displayPct)
          ? Math.round(displayPct * 100)
          : NaN;
      }
      if (!Number.isFinite(apiPct)) continue;
      const key = keyByPct.get(apiPct);
      if (!key) continue;

      const point = byTime.get(t) || { t, label: formatAxisTime(t) };
      point[key] = value;
      const formatted = row.formatted_forecast;
      if (formatted != null && String(formatted).trim()) {
        point[`${key}__fmt`] = String(formatted);
      }
      byTime.set(t, point);
    }

    return [...byTime.values()].sort(
      (a, b) => Number(a.t) - Number(b.t),
    ) as Array<Record<string, unknown>>;
  }, [rows, series]);

  const visibleSeries = useMemo(
    () => series.filter((item) => !hidden.has(item.key)),
    [series, hidden],
  );

  if (!data.length || !series.length) {
    return (
      <div
        ref={ref}
        className={cn(
          "flex min-h-0 w-full flex-1 flex-col items-center justify-center",
          className,
        )}
      >
        <p className="px-3 py-8 text-center text-sm text-muted-foreground">
          No plottable forecast points yet.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn("flex min-h-0 w-full flex-1 flex-col", className)}
    >
      {onToggleSeries ? (
        <HubKalshiLiveDemoTradeSeriesLegend
          items={legendItems}
          hiddenIds={hidden}
          onToggle={onToggleSeries}
          onChangeColor={onChangeSeriesColor}
          className="shrink-0"
        />
      ) : null}
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-full min-h-0 w-full flex-1 px-2 py-2 sm:px-3 sm:py-3"
      >
        <LineChart
          accessibilityLayer
          data={data}
          margin={{ top: 8, right: 12, left: 8, bottom: 4 }}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            minTickGap={28}
            tickMargin={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={56}
            tickMargin={8}
            tickFormatter={(v) => formatAxisForecastValue(Number(v))}
          />
          <ChartTooltip
            cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => {
                  const point = payload?.[0]?.payload as
                    | { t?: number }
                    | undefined;
                  return point?.t != null ? formatTooltipTime(point.t) : "";
                }}
                formatter={(value, name, item) => {
                  const key = String(name);
                  const payload = item?.payload as
                    | Record<string, unknown>
                    | undefined;
                  const fmt = payload?.[`${key}__fmt`];
                  const display =
                    fmt != null && String(fmt).trim()
                      ? String(fmt)
                      : formatForecastValue(Number(value));
                  return (
                    <div className="flex w-full items-center justify-between gap-4">
                      <span className="text-muted-foreground">
                        {chartConfig[key]?.label || key}
                      </span>
                      <span className="font-mono font-medium text-foreground tabular-nums">
                        {display}
                      </span>
                    </div>
                  );
                }}
              />
            }
          />
          {visibleSeries.map((item) => (
            <Line
              key={item.key}
              type="monotone"
              dataKey={item.key}
              name={item.key}
              stroke={`var(--color-${item.key})`}
              strokeWidth={item.percentilePct === 50 ? 2.5 : 1.75}
              connectNulls
              dot={false}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ChartContainer>
      {!visibleSeries.length ? (
        <p className="px-3 pb-4 text-center text-xs text-muted-foreground">
          All series hidden — click a legend item to show it again.
        </p>
      ) : null}
    </div>
  );
});

export function forecastSeriesKey(pct: number): string {
  return `p${formatForecastPercentilePct(pct).replace("%", "").replace(".", "_")}`;
}

export function buildForecastChartSeries(
  percentilePcts: number[],
): HubKalshiLiveBonusEventForecastChartSeries[] {
  return percentilePcts.map((pct, index) => ({
    key: forecastSeriesKey(pct),
    percentilePct: pct,
    label: `${formatForecastPercentilePct(pct)}ile`,
    colorToken: DEMO_CHART_COLOR_TOKENS[index % DEMO_CHART_COLOR_TOKENS.length]!
      .id,
  }));
}
