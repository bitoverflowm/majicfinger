"use client";

import { forwardRef, useEffect, useMemo, useState } from "react";
import { Liveline } from "liveline";

import { cn } from "@/lib/utils";

type TradeRow = Record<string, unknown>;

export type HubKalshiLiveDemoTradesLivelineSeries = {
  id: string;
  label: string;
  color: string;
  trades: TradeRow[];
};

type HubKalshiLiveDemoTradesLivelineProps = {
  series: HubKalshiLiveDemoTradesLivelineSeries[];
  className?: string;
  paused?: boolean;
};

const SERIES_COLORS = ["#2563EB", "#EA580C"] as const;
/** Floor so a sparse first few polls still have room to breathe. */
const LIVE_WINDOW_MIN_SECS = 45;
/**
 * Live demo only runs ~1 minute; frame the chart around recent activity so
 * older seed trades don't compress the view into a 15-minute timeline.
 */
const LIVE_FOCUS_SECS = 90;
const LIVE_WINDOW_MAX_SECS = 2 * 60;

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

/** Fit Liveline's wall-clock window to recent points so short live sessions aren't compressed. */
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
  // Liveline shows [now - window, now]; cover from oldest visible point through now.
  const coverOldest = Math.max(0, nowSec - oldest);
  const padded = Math.ceil(Math.max(spanSecs, coverOldest) * 1.2) + 8;
  return Math.min(
    LIVE_WINDOW_MAX_SECS,
    Math.max(LIVE_WINDOW_MIN_SECS, padded),
  );
}

function focusRecentPoints(points: { time: number; value: number }[]) {
  if (!points.length) return points;
  const nowSec = Date.now() / 1000;
  const cutoff = nowSec - LIVE_FOCUS_SECS;
  const recent = points.filter((p) => p.time >= cutoff);
  // If nothing falls in the live focus window yet, keep a short tail so the chart isn't empty.
  return recent.length ? recent : points.slice(-Math.min(40, points.length));
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
>(function HubKalshiLiveDemoTradesLiveline({ series, className, paused = false }, ref) {
  const dark = useIsDarkTheme();

  const mapped = useMemo(() => {
    return series.map((item, index) => {
      const data = focusRecentPoints(tradesToPoints(item.trades));
      return {
        id: item.id,
        label: item.label,
        color: item.color || SERIES_COLORS[index % SERIES_COLORS.length],
        data,
        value: data[data.length - 1]?.value ?? 0,
      };
    });
  }, [series]);

  const windowSecs = useMemo(
    () => windowSecsForPoints(mapped.map((s) => s.data)),
    [mapped],
  );

  const primary = mapped[0];
  if (!primary?.data.length) {
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
      className={cn("flex h-full min-h-[32rem] w-full flex-1 flex-col", className)}
    >
      <div className="min-h-[32rem] w-full flex-1 px-1 pb-3 pt-1 sm:px-2">
        <Liveline
          data={primary.data}
          value={primary.value}
          series={
            mapped.length > 1
              ? mapped.map((s) => ({
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
          seriesToggleCompact={mapped.length > 1}
          window={windowSecs}
          formatValue={(v) => `${Math.round(Number(v))}¢`}
          padding={{ top: 28, right: 92, bottom: 52, left: 18 }}
          className="h-full w-full"
          style={{ height: "100%", minHeight: "32rem" }}
        />
      </div>
    </div>
  );
});
