"use client";

import { forwardRef, useEffect, useMemo, useState } from "react";
import { Liveline } from "liveline";

import {
  defaultSeriesColorToken,
  demoChartCssVar,
  type DemoChartColorTokenId,
  resolveDemoChartColor,
} from "@/components/hubs/kalshiLiveDemo/demoChartColors";
import { HubKalshiLiveDemoTradeSeriesLegend } from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveDemoTradeSeriesLegend";
import { cn } from "@/lib/utils";

type TradeRow = Record<string, unknown>;

export type HubKalshiLiveDemoTradesLivelineSeries = {
  id: string;
  label: string;
  color: string;
  colorToken?: DemoChartColorTokenId;
  trades: TradeRow[];
};

type HubKalshiLiveDemoTradesLivelineProps = {
  series: HubKalshiLiveDemoTradesLivelineSeries[];
  hiddenSeriesIds?: ReadonlySet<string>;
  onToggleSeries?: (id: string) => void;
  onChangeSeriesColor?: (id: string, tokenId: DemoChartColorTokenId) => void;
  className?: string;
  paused?: boolean;
  /** Shorter canvas for hero / compact embeds. */
  compact?: boolean;
};
/** Floor so a sparse first few polls still have room to breathe. */
const LIVE_WINDOW_MIN_SECS = 45;
/**
 * Prefer framing around recent live activity; older seed trades are kept and
 * either covered by a wider window or time-aligned into the live viewport.
 */
const LIVE_FOCUS_SECS = 90;
const LIVE_WINDOW_MAX_SECS = 15 * 60;
/** Always keep at least this many seed trades visible while waiting for live ticks. */
const LIVE_SEED_TRADE_COUNT = 20;

function parseTradeTimeSec(row: TradeRow): number | null {
  const raw = row.created_time ?? row.created_ts ?? row.ts;
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw < 1e12 ? raw : raw / 1000;
  }
  const ms = Date.parse(String(raw));
  return Number.isFinite(ms) ? ms / 1000 : null;
}

function parseYesPriceCents(row: TradeRow): number | null {
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

function tradesToPoints(trades: TradeRow[]) {
  const points: { time: number; value: number }[] = [];
  for (const row of trades) {
    const time = parseTradeTimeSec(row);
    const value = parseYesPriceCents(row);
    if (time == null || value == null) continue;
    points.push({ time, value });
  }
  points.sort((a, b) => a.time - b.time);
  return points;
}

/**
 * Prefer recent live points; if the book is quiet, keep the last N seed trades
 * so Liveline never boots empty while waiting on the next pull.
 */
function seedLivePoints(points: { time: number; value: number }[]) {
  if (!points.length) return points;
  const seed = points.slice(-LIVE_SEED_TRADE_COUNT);
  if (seed.length < 2) return seed;

  const nowSec = Date.now() / 1000;
  const cutoff = nowSec - LIVE_FOCUS_SECS;
  const recent = points.filter((p) => p.time >= cutoff);
  if (recent.length >= 2) return recent;
  return seed;
}

/**
 * Liveline only renders points inside [now − window, now]. When the last trades
 * are older than that (quiet market / slow first poll), shift them into the
 * viewport while preserving relative spacing so the seed series stays visible.
 */
function alignPointsToLiveWindow(
  points: { time: number; value: number }[],
  windowSecs: number,
) {
  if (points.length < 2) return points;
  const nowSec = Date.now() / 1000;
  const newest = points[points.length - 1]!.time;
  const leftEdge = nowSec - windowSecs + 2;
  if (newest >= leftEdge) return points;

  const oldest = points[0]!.time;
  const span = Math.max(newest - oldest, 1e-3);
  const targetSpan = Math.min(span, Math.max(8, windowSecs * 0.85));
  const anchor = nowSec - 2;
  return points.map((p) => ({
    time: anchor - ((newest - p.time) / span) * targetSpan,
    value: p.value,
  }));
}

function windowSecsForPoints(pointSets: { time: number; value: number }[][]) {
  let oldest = Number.POSITIVE_INFINITY;
  let newest = Number.NEGATIVE_INFINITY;
  for (const points of pointSets) {
    for (const p of points) {
      if (!Number.isFinite(p.time)) continue;
      if (p.time < oldest) oldest = p.time;
      if (p.time > newest) newest = p.time;
    }
  }
  if (!Number.isFinite(oldest) || !Number.isFinite(newest)) {
    return LIVE_WINDOW_MIN_SECS;
  }

  const nowSec = Date.now() / 1000;
  const spanSecs = Math.max(0, newest - oldest);
  // If seed is stale, use a compact live window — points will be aligned into it.
  if (newest < nowSec - LIVE_WINDOW_MAX_SECS) {
    return Math.min(
      LIVE_WINDOW_MAX_SECS,
      Math.max(LIVE_WINDOW_MIN_SECS, Math.ceil(spanSecs * 1.25) + 12),
    );
  }

  const coverOldest = Math.max(0, nowSec - oldest);
  const padded = Math.ceil(Math.max(spanSecs, coverOldest) * 1.15) + 8;
  return Math.min(
    LIVE_WINDOW_MAX_SECS,
    Math.max(LIVE_WINDOW_MIN_SECS, padded),
  );
}

function useIsDarkTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setDark(root.classList.contains("dark"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

export const HubKalshiLiveDemoTradesLiveline = forwardRef<
  HTMLDivElement,
  HubKalshiLiveDemoTradesLivelineProps
>(function HubKalshiLiveDemoTradesLiveline({
  series,
  hiddenSeriesIds,
  onToggleSeries,
  onChangeSeriesColor,
  className,
  paused = false,
  compact = false,
}, ref) {
  const dark = useIsDarkTheme();
  const hidden = hiddenSeriesIds ?? new Set<string>();

  const mapped = useMemo(() => {
    const seeded = series.map((item, index) => {
      const rawPoints = seedLivePoints(tradesToPoints(item.trades));
      const token = item.colorToken ?? defaultSeriesColorToken(index);
      const resolved = resolveDemoChartColor(token);
      return {
        id: item.id,
        label: item.label,
        colorToken: token,
        color:
          (resolved && !resolved.startsWith("var(") ? resolved : null) ||
          (item.color && !item.color.startsWith("var(") ? item.color : null) ||
          resolved ||
          item.color ||
          demoChartCssVar(token),
        rawPoints,
      };
    });

    const windowSecs = windowSecsForPoints(
      seeded.map((s) => s.rawPoints).filter((p) => p.length > 0),
    );

    return {
      windowSecs,
      series: seeded.map((s) => {
        const data = alignPointsToLiveWindow(s.rawPoints, windowSecs);
        return {
          id: s.id,
          label: s.label,
          colorToken: s.colorToken,
          color: s.color,
          data,
          value: data[data.length - 1]?.value ?? 0,
        };
      }),
    };
  }, [series]);

  const visible = useMemo(
    () => mapped.series.filter((s) => !hidden.has(s.id) && s.data.length > 0),
    [mapped.series, hidden],
  );

  const windowSecs = mapped.windowSecs;

  const legendItems = useMemo(
    () =>
      mapped.series.map((s) => ({
        id: s.id,
        label: s.label,
        color: s.color,
        colorToken: s.colorToken,
      })),
    [mapped.series],
  );

  const primary = visible[0];
  if (!mapped.series.some((s) => s.data.length)) {
    return (
      <div ref={ref} className={className}>
        <p className="px-3 py-8 text-center text-sm text-muted-foreground">
          No plottable live trade points yet.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn("flex h-full min-h-0 w-full flex-1 flex-col", className)}
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
      {!primary ? (
        <p className="flex flex-1 items-center justify-center px-3 py-8 text-center text-sm text-muted-foreground">
          All series hidden — click a legend item to show it again.
        </p>
      ) : (
        <div className="min-h-0 w-full flex-1 px-1 pb-3 pt-1 sm:px-2">
          <Liveline
            data={primary.data}
            value={primary.value}
            series={
              visible.length > 1
                ? visible.map((s) => ({
                    id: s.id,
                    label: s.label,
                    color: s.color,
                    data: s.data,
                    value: s.value,
                  }))
                : undefined
            }
            color={primary.color}
            theme={dark ? "dark" : "light"}
            momentum
            scrub
            badge
            paused={paused}
            seriesToggleCompact={false}
            window={windowSecs}
            formatValue={(v) => `${Math.round(Number(v))}¢`}
            padding={{ top: 28, right: 92, bottom: 52, left: 18 }}
            className="h-full w-full"
            style={{
              height: "100%",
              minHeight: compact ? "16rem" : "32rem",
            }}
          />
        </div>
      )}
    </div>
  );
});
