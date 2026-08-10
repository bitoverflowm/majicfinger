"use client";

import { forwardRef, useMemo } from "react";
import { CartesianGrid, Legend, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export type HubKalshiLiveDemoTradesChartSeries = {
  key: string;
  label: string;
  trades: Record<string, unknown>[];
};

type HubKalshiLiveDemoTradesChartProps = {
  series: HubKalshiLiveDemoTradesChartSeries[];
  className?: string;
};

const SERIES_THEMES = [
  {
    light: "#2563EB",
    dark: "#7DD3FC",
  },
  {
    light: "#EA580C",
    dark: "#FB923C",
  },
] as const;

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
>(function HubKalshiLiveDemoTradesChart({ series, className }, ref) {
  const chartConfig = useMemo(() => {
    const config: Record<
      string,
      { label: string; theme: { light: string; dark: string } }
    > = {};
    series.forEach((item, index) => {
      config[item.key] = {
        label: item.label,
        theme: SERIES_THEMES[index % SERIES_THEMES.length],
      };
    });
    return config;
  }, [series]);

  const data = useMemo(() => {
    /** @type {Map<number, Record<string, unknown>>} */
    const byTime = new Map<number, Record<string, unknown>>();

    for (const item of series) {
      for (const row of item.trades) {
        if (!row || typeof row !== "object") continue;
        const t = parseTradeTime(row);
        const yesPrice = parseYesPriceCents(row);
        if (t == null || yesPrice == null) continue;
        const point = byTime.get(t) || { t, label: formatAxisTime(t) };
        point[item.key] = yesPrice;
        byTime.set(t, point);
      }
    }

    return [...byTime.values()].sort(
      (a, b) => Number(a.t) - Number(b.t),
    ) as Array<Record<string, unknown>>;
  }, [series]);

  if (!data.length || !series.length) {
    return (
      <div ref={ref} className={className}>
        <p className="px-3 py-8 text-center text-sm text-muted-foreground">
          No plottable trade points (need created time and yes price).
        </p>
      </div>
    );
  }

  return (
    <div ref={ref} className={className}>
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-[22rem] w-full px-2 py-3 sm:px-3"
      >
        <LineChart
          accessibilityLayer
          data={data}
          margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
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
          {series.length > 1 ? (
            <Legend
              verticalAlign="top"
              height={28}
              formatter={(value) => chartConfig[String(value)]?.label || String(value)}
            />
          ) : null}
          {series.map((item) => (
            <Line
              key={item.key}
              type="monotone"
              dataKey={item.key}
              name={item.key}
              stroke={`var(--color-${item.key})`}
              strokeWidth={2}
              connectNulls
              dot={{
                r: 2.5,
                fill: `var(--color-${item.key})`,
                strokeWidth: 0,
              }}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ChartContainer>
    </div>
  );
});
