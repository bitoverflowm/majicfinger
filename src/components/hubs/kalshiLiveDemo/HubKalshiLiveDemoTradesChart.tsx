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

function parseYesPrice(row: Record<string, unknown>): number | null {
  const raw = row.yes_price_dollars ?? row.yes_price;
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
      second: "2-digit",
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toISOString();
  }
}

function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return "—";
  // Kalshi yes prices are dollars (0–1); show cents for readability.
  if (value >= 0 && value <= 1) return `${Math.round(value * 100)}¢`;
  return value.toFixed(2);
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
      const yesPrice = parseYesPrice(row);
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
            tickFormatter={(v) => formatPrice(Number(v))}
            domain={["auto", "auto"]}
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
                      {formatPrice(Number(value))}
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
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
