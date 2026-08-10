"use client";

import { forwardRef, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

export type HubKalshiLiveDemoOrderbookChartProps = {
  levels: Record<string, unknown>[];
  /** Keys from liveOrderbookRowKey that should flash. */
  flashKeys?: ReadonlySet<string>;
  label?: string;
  className?: string;
};

const YES_COLOR = "var(--chart-2)";
const NO_COLOR = "var(--chart-1)";
const FLASH_YES = "oklch(0.75 0.15 162)";
const FLASH_NO = "oklch(0.75 0.18 41)";

function rowKey(row: Record<string, unknown>): string | null {
  const ticker = String(row.ticker || "").trim().toUpperCase();
  const side = String(row.side || "").trim().toLowerCase();
  const price = Number(row.price_dollars);
  if (!ticker || (side !== "yes" && side !== "no") || !Number.isFinite(price)) {
    return null;
  }
  return `ob:${ticker}|${side}|${price}`;
}

function priceToCents(priceDollars: number): number {
  return Math.round(priceDollars * 100);
}

function formatCents(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${Math.round(value)}¢`;
}

function formatQty(value: number): string {
  if (!Number.isFinite(value)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      notation: value >= 10_000 ? "compact" : "standard",
      maximumFractionDigits: value >= 10_000 ? 1 : 0,
    }).format(value);
  } catch {
    return String(Math.round(value));
  }
}

type DepthPoint = {
  priceCents: number;
  label: string;
  yesQty: number;
  noQty: number;
  yesKey: string | null;
  noKey: string | null;
};

/**
 * Depth histogram for Kalshi yes/no bids.
 * Yes bids plot at their price; no bids plot at implied yes ask (100¢ − no bid).
 * That gives a classic left/right book around mid without inventing ask arrays.
 */
export const HubKalshiLiveDemoOrderbookChart = forwardRef<
  HTMLDivElement,
  HubKalshiLiveDemoOrderbookChartProps
>(function HubKalshiLiveDemoOrderbookChart(
  { levels, flashKeys, label, className },
  ref,
) {
  const flash = flashKeys ?? new Set<string>();

  const { data, maxQty } = useMemo(() => {
    const byPrice = new Map<number, DepthPoint>();

    for (const row of levels) {
      if (!row || typeof row !== "object") continue;
      const side = String(row.side || "").trim().toLowerCase();
      const price = Number(row.price_dollars);
      const qty = Number(row.quantity_fp);
      if (!Number.isFinite(price) || !Number.isFinite(qty) || qty <= 0) continue;

      const key = rowKey(row);
      if (side === "yes") {
        const cents = priceToCents(price);
        const point = byPrice.get(cents) || {
          priceCents: cents,
          label: formatCents(cents),
          yesQty: 0,
          noQty: 0,
          yesKey: null,
          noKey: null,
        };
        point.yesQty += qty;
        point.yesKey = key;
        byPrice.set(cents, point);
      } else if (side === "no") {
        // No bid at X ≈ willing to sell yes at 1−X
        const cents = priceToCents(1 - price);
        const point = byPrice.get(cents) || {
          priceCents: cents,
          label: formatCents(cents),
          yesQty: 0,
          noQty: 0,
          yesKey: null,
          noKey: null,
        };
        point.noQty += qty;
        point.noKey = key;
        byPrice.set(cents, point);
      }
    }

    const sorted = [...byPrice.values()].sort(
      (a, b) => a.priceCents - b.priceCents,
    );
    let peak = 0;
    for (const p of sorted) {
      peak = Math.max(peak, p.yesQty, p.noQty);
    }
    return { data: sorted, maxQty: peak };
  }, [levels]);

  const chartConfig = {
    yesQty: { label: "Yes bids", color: YES_COLOR },
    noQty: { label: "Implied yes asks (no bids)", color: NO_COLOR },
  };

  if (!data.length) {
    return (
      <div
        ref={ref}
        className={cn(
          "flex min-h-0 w-full flex-1 flex-col items-center justify-center",
          className,
        )}
      >
        <p className="px-3 py-8 text-center text-sm text-muted-foreground">
          No orderbook levels to chart.
        </p>
      </div>
    );
  }

  const domainMax = Math.max(1, Math.ceil(maxQty * 1.08));

  return (
    <div
      ref={ref}
      className={cn("flex min-h-0 w-full flex-1 flex-col", className)}
    >
      <div className="flex shrink-0 flex-wrap items-center justify-center gap-4 px-2 py-2 text-[11px] font-medium">
        {label ? (
          <span className="text-muted-foreground">{label}</span>
        ) : null}
        <span className="inline-flex items-center gap-1.5 text-foreground">
          <span
            className="h-2 w-2.5 rounded-sm"
            style={{ backgroundColor: YES_COLOR }}
            aria-hidden
          />
          Yes bids
        </span>
        <span className="inline-flex items-center gap-1.5 text-foreground">
          <span
            className="h-2 w-2.5 rounded-sm"
            style={{ backgroundColor: NO_COLOR }}
            aria-hidden
          />
          No bids → yes asks
        </span>
      </div>
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-full min-h-0 w-full flex-1 px-2 py-2 sm:px-3 sm:py-3"
      >
        <BarChart
          accessibilityLayer
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 16, left: 4, bottom: 4 }}
          barCategoryGap="18%"
        >
          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
          <XAxis
            type="number"
            domain={[0, domainMax]}
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            tickFormatter={(v) => formatQty(Number(v))}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={44}
            tickLine={false}
            axisLine={false}
            tickMargin={6}
          />
          <ReferenceLine x={0} stroke="var(--border)" />
          <ChartTooltip
            cursor={{ fill: "var(--muted)", opacity: 0.35 }}
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => {
                  const point = payload?.[0]?.payload as
                    | DepthPoint
                    | undefined;
                  return point?.label
                    ? `Yes price ${point.label}`
                    : "";
                }}
                formatter={(value, name) => (
                  <div className="flex w-full items-center justify-between gap-4">
                    <span className="text-muted-foreground">
                      {name === "yesQty"
                        ? "Yes bid qty"
                        : "No bid qty (as yes ask)"}
                    </span>
                    <span className="font-mono font-medium text-foreground tabular-nums">
                      {formatQty(Number(value))}
                    </span>
                  </div>
                )}
              />
            }
          />
          <Bar
            dataKey="yesQty"
            name="yesQty"
            fill={YES_COLOR}
            radius={[0, 3, 3, 0]}
            maxBarSize={18}
            isAnimationActive={false}
          >
            {data.map((entry) => {
              const lit = entry.yesKey ? flash.has(entry.yesKey) : false;
              return (
                <Cell
                  key={`yes-${entry.priceCents}`}
                  fill={lit ? FLASH_YES : YES_COLOR}
                  stroke={lit ? "oklch(0.55 0.14 162)" : "transparent"}
                  strokeWidth={lit ? 1.5 : 0}
                />
              );
            })}
          </Bar>
          <Bar
            dataKey="noQty"
            name="noQty"
            fill={NO_COLOR}
            radius={[0, 3, 3, 0]}
            maxBarSize={18}
            isAnimationActive={false}
          >
            {data.map((entry) => {
              const lit = entry.noKey ? flash.has(entry.noKey) : false;
              return (
                <Cell
                  key={`no-${entry.priceCents}`}
                  fill={lit ? FLASH_NO : NO_COLOR}
                  stroke={lit ? "oklch(0.55 0.16 41)" : "transparent"}
                  strokeWidth={lit ? 1.5 : 0}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
});
