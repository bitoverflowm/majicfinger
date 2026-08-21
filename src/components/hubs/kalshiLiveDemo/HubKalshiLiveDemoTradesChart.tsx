"use client";

import { forwardRef, useMemo } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  defaultSeriesColorToken,
  demoChartCssVar,
  type DemoChartColorTokenId,
} from "@/components/hubs/kalshiLiveDemo/demoChartColors";
import { HubKalshiLiveDemoTradeSeriesLegend } from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveDemoTradeSeriesLegend";
import { cn } from "@/lib/utils";

export type HubKalshiLiveDemoTradesChartSeries = {
  key: string;
  label: string;
  color?: string;
  colorToken?: DemoChartColorTokenId;
  trades: Record<string, unknown>[];
};

type HubKalshiLiveDemoTradesChartProps = {
  series: HubKalshiLiveDemoTradesChartSeries[];
  hiddenSeriesIds?: ReadonlySet<string>;
  onToggleSeries?: (id: string) => void;
  onChangeSeriesColor?: (id: string, tokenId: DemoChartColorTokenId) => void;
  className?: string;
  /** When false, draw the line without per-point dots. Default true. */
  showDots?: boolean;
  /**
   * Draw the full path as a line and only mark points tagged `source: "live"`
   * so websocket prints sit on top of REST history.
   */
  emphasizeLiveDots?: boolean;
  /** Pulsing tip on the latest point of each visible series. */
  livePulse?: boolean;
  /** Smooth line transitions when points, filters, or windows change. */
  animate?: boolean;
};

function LivePulseDot({
  cx,
  cy,
  color,
}: {
  cx: number;
  cy: number;
  color: string;
}) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={4} fill={color} opacity={0.35}>
        <animate attributeName="r" values="4;12" dur="1.5s" repeatCount="indefinite" />
        <animate
          attributeName="opacity"
          values="0.4;0"
          dur="1.5s"
          repeatCount="indefinite"
        />
      </circle>
      <circle
        cx={cx}
        cy={cy}
        r={4.25}
        fill={color}
        stroke="var(--background)"
        strokeWidth={1.5}
      />
    </g>
  );
}

function parseTradeTime(row: Record<string, unknown>): number | null {
  const raw = row.created_time ?? row.created_ts ?? row.ts;
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw < 1e12 ? raw * 1000 : raw;
  }
  const ms = Date.parse(String(raw));
  return Number.isFinite(ms) ? ms : null;
}

function parseYesPriceCents(row: Record<string, unknown>): number | null {
  const dollarsRaw = row.yes_price_dollars;
  if (dollarsRaw != null && dollarsRaw !== "") {
    const dollars = typeof dollarsRaw === "number" ? dollarsRaw : Number(dollarsRaw);
    if (Number.isFinite(dollars)) return Math.round(dollars * 100);
  }
  const centsRaw = row.yes_price;
  if (centsRaw != null && centsRaw !== "") {
    const cents = typeof centsRaw === "number" ? centsRaw : Number(centsRaw);
    if (!Number.isFinite(cents)) return null;
    return cents <= 1 ? Math.round(cents * 100) : Math.round(cents);
  }
  return null;
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
      second: "2-digit",
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toISOString();
  }
}

function formatCents(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${Math.round(value)}¢`;
}

export const HubKalshiLiveDemoTradesChart = forwardRef<
  HTMLDivElement,
  HubKalshiLiveDemoTradesChartProps
>(function HubKalshiLiveDemoTradesChart({
  series,
  hiddenSeriesIds,
  onToggleSeries,
  onChangeSeriesColor,
  className,
  showDots = true,
  emphasizeLiveDots = false,
  livePulse = false,
  animate = false,
}, ref) {
  const hidden = hiddenSeriesIds ?? new Set<string>();

  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {};
    series.forEach((item, index) => {
      const token = item.colorToken ?? defaultSeriesColorToken(index);
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
        const token = item.colorToken ?? defaultSeriesColorToken(index);
        return {
          id: item.key,
          label: item.label,
          color: item.color || demoChartCssVar(token),
          colorToken: token,
        };
      }),
    [series],
  );

  const data = useMemo(() => {
    const byTime = new Map<number, Record<string, unknown>>();

    for (const item of series) {
      for (const row of item.trades) {
        if (!row || typeof row !== "object") continue;
        const t = parseTradeTime(row);
        const yesPrice = parseYesPriceCents(row);
        if (t == null || yesPrice == null) continue;
        const point = byTime.get(t) || { t, label: formatAxisTime(t) };
        point[item.key] = yesPrice;
        const source = String(row.source || "").toLowerCase();
        if (source === "live" || source === "websocket") {
          point[`${item.key}Live`] = true;
        }
        byTime.set(t, point);
      }
    }

    return [...byTime.values()].sort(
      (a, b) => Number(a.t) - Number(b.t),
    ) as Array<Record<string, unknown>>;
  }, [series]);

  const lastPointByKey = useMemo(() => {
    const last: Record<string, Record<string, unknown>> = {};
    for (const item of series) {
      for (let i = data.length - 1; i >= 0; i -= 1) {
        const point = data[i];
        if (point && point[item.key] != null) {
          last[item.key] = point;
          break;
        }
      }
    }
    return last;
  }, [data, series]);

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
          No plottable trade points (need created time and yes price).
        </p>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn(
        "flex min-h-0 w-full flex-1 flex-col",
        className,
      )}
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
          margin={{ top: 10, right: 18, left: 4, bottom: 4 }}
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
            width={44}
            tickMargin={6}
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            allowDataOverflow
            tickFormatter={(v) => formatCents(Number(v))}
          />
          <ChartTooltip
            cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => {
                  const point = payload?.[0]?.payload as { t?: number } | undefined;
                  return point?.t != null ? formatTooltipTime(point.t) : "";
                }}
                formatter={(value, name) => (
                  <div className="flex w-full items-center justify-between gap-4">
                    <span className="text-muted-foreground">
                      {chartConfig[String(name)]?.label || String(name)}
                    </span>
                    <span className="font-mono font-medium text-foreground tabular-nums">
                      {formatCents(Number(value))}
                    </span>
                  </div>
                )}
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
              strokeWidth={2}
              connectNulls
              dot={
                (props: {
                  cx?: number;
                  cy?: number;
                  payload?: Record<string, unknown>;
                }) => {
                  if (props.cx == null || props.cy == null) {
                    return <g key={`${item.key}-empty`} />;
                  }
                  const last = lastPointByKey[item.key];
                  const isTip = last != null && props.payload?.t === last.t;
                  if (isTip) {
                    if (livePulse) {
                      return (
                        <LivePulseDot
                          key={`${item.key}-pulse`}
                          cx={props.cx}
                          cy={props.cy}
                          color={`var(--color-${item.key})`}
                        />
                      );
                    }
                    return (
                      <circle
                        key={`${item.key}-tip`}
                        cx={props.cx}
                        cy={props.cy}
                        r={4.25}
                        fill={`var(--color-${item.key})`}
                        stroke="var(--background)"
                        strokeWidth={1.5}
                      />
                    );
                  }
                  if (emphasizeLiveDots) {
                    if (!props.payload?.[`${item.key}Live`]) {
                      return <g key={`${item.key}-skip-${props.cx}-${props.cy}`} />;
                    }
                    return (
                      <circle
                        key={`${item.key}-live-${props.cx}-${props.cy}`}
                        cx={props.cx}
                        cy={props.cy}
                        r={3.25}
                        fill={`var(--color-${item.key})`}
                        stroke="var(--background)"
                        strokeWidth={1}
                      />
                    );
                  }
                  if (!showDots) {
                    return <g key={`${item.key}-hidden-${props.cx}-${props.cy}`} />;
                  }
                  return (
                    <circle
                      key={`${item.key}-dot-${props.cx}-${props.cy}`}
                      cx={props.cx}
                      cy={props.cy}
                      r={2.5}
                      fill={`var(--color-${item.key})`}
                    />
                  );
                }
              }
              activeDot={{ r: 4 }}
              isAnimationActive={animate}
              animationDuration={animate ? 450 : 0}
              animationEasing="ease-in-out"
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
