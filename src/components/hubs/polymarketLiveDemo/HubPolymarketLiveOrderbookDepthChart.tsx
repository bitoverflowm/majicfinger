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

export type PolymarketBookLevel = {
  price: number;
  size: number;
};

export type HubPolymarketLiveOrderbookDepthChartProps = {
  bids: PolymarketBookLevel[];
  asks: PolymarketBookLevel[];
  label?: string;
  className?: string;
  maxLevels?: number;
  /** Keys like `bid:62` / `ask:64` that should flash. */
  flashKeys?: ReadonlySet<string>;
};

const FLASH_BID = "oklch(0.75 0.15 162)";
const FLASH_ASK = "oklch(0.75 0.18 41)";

export function polymarketBookFlashKey(side: "bid" | "ask", price: number): string {
  const cents = price <= 1 ? Math.round(price * 100) : Math.round(price);
  return `${side}:${cents}`;
}

const BID_COLOR = "var(--chart-3)";
const ASK_COLOR = "var(--chart-1)";
const EMPTY_FLASH: ReadonlySet<string> = new Set();

function formatCents(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${Math.round(value)}¢`;
}

function formatQty(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  try {
    return new Intl.NumberFormat(undefined, {
      notation: abs >= 10_000 ? "compact" : "standard",
      maximumFractionDigits: abs >= 10_000 ? 1 : 0,
    }).format(abs);
  } catch {
    return String(Math.round(abs));
  }
}

function toCents(price: number): number {
  if (price <= 1) return Math.round(price * 100);
  return Math.round(price);
}

type DepthPoint = {
  priceCents: number;
  label: string;
  bidSize: number;
  askSize: number;
};

/**
 * Classic CLOB depth: bids (left, green) and asks (right, red) by price.
 */
export const HubPolymarketLiveOrderbookDepthChart = forwardRef<
  HTMLDivElement,
  HubPolymarketLiveOrderbookDepthChartProps
>(function HubPolymarketLiveOrderbookDepthChart(
  { bids, asks, label, className, maxLevels = 12, flashKeys },
  ref,
) {
  const flash = flashKeys ?? EMPTY_FLASH;
  const { data, peak } = useMemo(() => {
    const byPrice = new Map<number, DepthPoint>();

    const topBids = [...bids]
      .filter((row) => Number.isFinite(row.price) && Number.isFinite(row.size) && row.size > 0)
      .sort((a, b) => b.price - a.price)
      .slice(0, maxLevels);
    const topAsks = [...asks]
      .filter((row) => Number.isFinite(row.price) && Number.isFinite(row.size) && row.size > 0)
      .sort((a, b) => a.price - b.price)
      .slice(0, maxLevels);

    for (const row of topBids) {
      const cents = toCents(row.price);
      const point = byPrice.get(cents) || {
        priceCents: cents,
        label: formatCents(cents),
        bidSize: 0,
        askSize: 0,
      };
      point.bidSize += row.size;
      byPrice.set(cents, point);
    }
    for (const row of topAsks) {
      const cents = toCents(row.price);
      const point = byPrice.get(cents) || {
        priceCents: cents,
        label: formatCents(cents),
        bidSize: 0,
        askSize: 0,
      };
      point.askSize += row.size;
      byPrice.set(cents, point);
    }

    const sorted = [...byPrice.values()].sort((a, b) => a.priceCents - b.priceCents);
    let maxQty = 0;
    for (const point of sorted) {
      maxQty = Math.max(maxQty, point.bidSize, point.askSize);
    }
    return { data: sorted, peak: maxQty };
  }, [asks, bids, maxLevels]);

  const chartConfig = {
    bidSize: { label: "Bids", color: BID_COLOR },
    askSize: { label: "Asks", color: ASK_COLOR },
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
          No order-book levels to chart.
        </p>
      </div>
    );
  }

  const domainMax = Math.max(1, Math.ceil(peak * 1.08));

  return (
    <div ref={ref} className={cn("flex min-h-0 w-full flex-1 flex-col", className)}>
      <div className="flex shrink-0 flex-wrap items-center justify-center gap-4 px-2 py-2 text-[11px] font-medium">
        {label ? <span className="text-muted-foreground">{label}</span> : null}
        <span className="inline-flex items-center gap-1.5 text-foreground">
          <span className="h-2 w-2.5 rounded-sm" style={{ backgroundColor: BID_COLOR }} aria-hidden />
          Bids
        </span>
        <span className="inline-flex items-center gap-1.5 text-foreground">
          <span className="h-2 w-2.5 rounded-sm" style={{ backgroundColor: ASK_COLOR }} aria-hidden />
          Asks
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
                  const point = payload?.[0]?.payload as DepthPoint | undefined;
                  return point?.label ? `Price ${point.label}` : "";
                }}
                formatter={(value, name) => (
                  <div className="flex w-full items-center justify-between gap-4">
                    <span className="text-muted-foreground">
                      {name === "bidSize" ? "Bid size" : "Ask size"}
                    </span>
                    <span className="font-mono font-medium tabular-nums text-foreground">
                      {formatQty(Number(value))}
                    </span>
                  </div>
                )}
              />
            }
          />
          <Bar
            dataKey="bidSize"
            name="bidSize"
            fill={BID_COLOR}
            radius={[0, 3, 3, 0]}
            maxBarSize={18}
            isAnimationActive={false}
          >
            {data.map((entry) => {
              const lit = flash.has(`bid:${entry.priceCents}`);
              return (
                <Cell
                  key={`bid-${entry.priceCents}`}
                  fill={lit ? FLASH_BID : BID_COLOR}
                  stroke={lit ? "oklch(0.55 0.14 162)" : "transparent"}
                  strokeWidth={lit ? 1.5 : 0}
                />
              );
            })}
          </Bar>
          <Bar
            dataKey="askSize"
            name="askSize"
            fill={ASK_COLOR}
            radius={[0, 3, 3, 0]}
            maxBarSize={18}
            isAnimationActive={false}
          >
            {data.map((entry) => {
              const lit = flash.has(`ask:${entry.priceCents}`);
              return (
                <Cell
                  key={`ask-${entry.priceCents}`}
                  fill={lit ? FLASH_ASK : ASK_COLOR}
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
