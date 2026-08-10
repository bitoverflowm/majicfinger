"use client";

import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

type HubKalshiLiveDemoTradesChartProps = {
  trades: Record<string, unknown>[];
  className?: string;
};

const chartConfig = {
  yesPrice: {
    label: "Yes price",
    theme: {
      light: "#2563EB",
      dark: "#7DD3FC",
    },
  },
};

function parseTradeTime(row: Record<string, unknown>): number | null {
  const raw = row.created_time ?? row.created_ts ?? row.ts;
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    // Kalshi sometimes returns unix seconds.
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
    // Legacy yes_price is usually cents (0–100); dollars would be ≤ 1.
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

export function HubKalshiLiveDemoTradesChart({
  trades,
  className,
}: HubKalshiLiveDemoTradesChartProps) {
  const data = useMemo(() => {
    const points: { t: number; label: string; yesPrice: number }[] = [];
    for (const row of trades) {
      if (!row || typeof row !== "object") continue;
      const t = parseTradeTime(row);
      const yesPrice = parseYesPriceCents(row);
      if (t == null || yesPrice == null) continue;
      points.push({ t, label: formatAxisTime(t), yesPrice });
    }
    points.sort((a, b) => a.t - b.t);
    return points;
  }, [trades]);

  if (!data.length) {
    return (
      <p className="px-3 py-8 text-center text-sm text-muted-foreground">
        No plottable trade points (need created time and yes price).
      </p>
    );
  }

  return (
    <div className={className}>
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
            dataKey="yesPrice"
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
                formatter={(value) => (
                  <div className="flex w-full items-center justify-between gap-4">
                    <span className="text-muted-foreground">Yes price</span>
                    <span className="font-mono font-medium text-foreground tabular-nums">
                      {formatCents(Number(value))}
                    </span>
                  </div>
                )}
              />
            }
          />
          <Line
            type="monotone"
            dataKey="yesPrice"
            stroke="var(--color-yesPrice)"
            strokeWidth={2}
            dot={{ r: 2.5, fill: "var(--color-yesPrice)", strokeWidth: 0 }}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
