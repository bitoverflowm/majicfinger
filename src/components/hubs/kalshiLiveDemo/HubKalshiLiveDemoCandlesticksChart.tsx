"use client";

import { forwardRef, useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

export type DemoCandlePeriod = 1 | 60 | 1440;

type CandlePoint = {
  time: number;
  label: string;
  open: number;
  high: number;
  low: number;
  close: number;
  key: string;
  up: boolean;
};

type HubKalshiLiveDemoCandlesticksChartProps = {
  candles: Record<string, unknown>[];
  periodInterval: DemoCandlePeriod;
  flashKeys?: ReadonlySet<string>;
  label?: string;
  className?: string;
};

const UP_COLOR = "var(--chart-2)";
const DOWN_COLOR = "var(--chart-1)";
const UP_FLASH = "oklch(0.78 0.14 162)";
const DOWN_FLASH = "oklch(0.78 0.16 41)";

function dollarsToCents(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

function formatCents(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${Math.round(value)}¢`;
}

function formatAxisTime(tsSec: number, period: DemoCandlePeriod): string {
  try {
    const d = new Date(tsSec * 1000);
    if (period >= 1440) {
      return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
      }).format(d);
    }
    if (period >= 60) {
      return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
      }).format(d);
    }
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
  } catch {
    return String(tsSec);
  }
}

function formatTooltipTime(tsSec: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(tsSec * 1000));
  } catch {
    return new Date(tsSec * 1000).toISOString();
  }
}

function candleRowKey(row: Record<string, unknown>): string | null {
  const ts = Math.floor(Number(row.end_period_ts));
  if (!Number.isFinite(ts)) return null;
  return `ts:${ts}`;
}

/** Map normalized Kalshi candle rows → Recharts OHLC (cents). */
export function mapDemoCandlesToChartPoints(
  candles: Record<string, unknown>[],
  periodInterval: DemoCandlePeriod,
): CandlePoint[] {
  const out: CandlePoint[] = [];
  for (const row of candles) {
    if (!row || typeof row !== "object") continue;
    const time = Math.floor(Number(row.end_period_ts));
    const open = dollarsToCents(row.price_open_dollars);
    const high = dollarsToCents(row.price_high_dollars);
    const low = dollarsToCents(row.price_low_dollars);
    const close = dollarsToCents(row.price_close_dollars);
    if (
      !Number.isFinite(time) ||
      open == null ||
      high == null ||
      low == null ||
      close == null
    ) {
      continue;
    }
    out.push({
      time,
      label: formatAxisTime(time, periodInterval),
      open,
      high,
      low,
      close,
      key: candleRowKey(row) || `ts:${time}`,
      up: close >= open,
    });
  }
  out.sort((a, b) => a.time - b.time);
  return out;
}

/**
 * Custom Bar shape: full high–low span as the bar range, body drawn inside.
 * Matches the Recharts Candlestick example approach, styled for shadcn charts.
 */
function CandlestickShape(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: CandlePoint & { flash?: boolean };
}) {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props;
  if (!payload || height <= 0) return null;

  const { open, close, low, high, up, flash } = payload;
  const range = high - low;
  if (!Number.isFinite(range) || range < 0) return null;

  const color = flash
    ? up
      ? UP_FLASH
      : DOWN_FLASH
    : up
      ? UP_COLOR
      : DOWN_COLOR;
  const stroke = flash
    ? up
      ? "oklch(0.55 0.14 162)"
      : "oklch(0.55 0.16 41)"
    : color;

  const pxPerUnit = range > 0 ? height / range : 0;
  const bodyTop = Math.max(open, close);
  const bodyBot = Math.min(open, close);
  const bodyY = y + (high - bodyTop) * pxPerUnit;
  const bodyH = Math.max(range > 0 ? (bodyTop - bodyBot) * pxPerUnit : 1, 1.5);
  const cx = x + width / 2;
  const bodyW = Math.max(Math.min(width * 0.62, 14), 3);
  const bodyX = cx - bodyW / 2;

  return (
    <g className="recharts-candlestick">
      <line
        x1={cx}
        y1={y}
        x2={cx}
        y2={y + height}
        stroke={stroke}
        strokeWidth={flash ? 2 : 1.25}
        strokeLinecap="round"
      />
      <rect
        x={bodyX}
        y={bodyY}
        width={bodyW}
        height={bodyH}
        fill={color}
        stroke={flash ? stroke : "transparent"}
        strokeWidth={flash ? 1.25 : 0}
        rx={1.5}
        ry={1.5}
      />
    </g>
  );
}

export const HubKalshiLiveDemoCandlesticksChart = forwardRef<
  HTMLDivElement,
  HubKalshiLiveDemoCandlesticksChartProps
>(function HubKalshiLiveDemoCandlesticksChart(
  { candles, periodInterval, flashKeys, label, className },
  ref,
) {
  const flash = flashKeys ?? new Set<string>();

  const data = useMemo(() => {
    return mapDemoCandlesToChartPoints(candles, periodInterval).map((p) => ({
      ...p,
      // Ranged bar from low→high so the custom shape can place wick + body.
      span: [p.low, p.high] as [number, number],
      flash: flash.has(p.key),
    }));
  }, [candles, periodInterval, flash]);

  const chartConfig = {
    span: { label: "Price", color: "var(--chart-2)" },
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
          No plottable candlesticks (need trade OHLC for each period).
        </p>
      </div>
    );
  }

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
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: UP_COLOR }}
            aria-hidden
          />
          Close ≥ open
        </span>
        <span className="inline-flex items-center gap-1.5 text-foreground">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: DOWN_COLOR }}
            aria-hidden
          />
          Close &lt; open
        </span>
      </div>
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-full min-h-0 w-full flex-1 px-2 py-2 sm:px-3 sm:py-3"
      >
        <BarChart
          accessibilityLayer
          data={data}
          margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
          barCategoryGap="18%"
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
            cursor={{ fill: "var(--muted)", opacity: 0.35 }}
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => {
                  const point = payload?.[0]?.payload as
                    | CandlePoint
                    | undefined;
                  return point?.time != null
                    ? formatTooltipTime(point.time)
                    : "";
                }}
                formatter={(_value, _name, item) => {
                  const point = item?.payload as CandlePoint | undefined;
                  if (!point) return null;
                  return (
                    <div className="grid min-w-[8rem] gap-1">
                      {(
                        [
                          ["Open", point.open],
                          ["High", point.high],
                          ["Low", point.low],
                          ["Close", point.close],
                        ] as const
                      ).map(([name, val]) => (
                        <div
                          key={name}
                          className="flex items-center justify-between gap-4"
                        >
                          <span className="text-muted-foreground">{name}</span>
                          <span className="font-mono font-medium text-foreground tabular-nums">
                            {formatCents(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
            }
          />
          <Bar
            dataKey="span"
            name="span"
            isAnimationActive={false}
            // @ts-expect-error recharts shape props include payload
            shape={CandlestickShape}
            maxBarSize={22}
          >
            {data.map((entry) => (
              <Cell key={entry.key} fill={entry.up ? UP_COLOR : DOWN_COLOR} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
});
