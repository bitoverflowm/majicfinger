"use client";

import { forwardRef, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  /** Longer name shown in native title tooltips when labels are abbreviated. */
  fullLabel?: string;
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
  /**
   * Size strictly to the parent box. Required inside content-sized containers,
   * where a min-height lets the canvas grow the layout that measures it.
   */
  fill?: boolean;
  /**
   * Plot every point instead of framing the last seconds of live activity, and
   * widen the window to cover them. For feeds seeded with REST history, where
   * the seeded line must stay on screen through quiet stretches.
   */
  persistHistory?: boolean;
  /**
   * Show the entire seeded archive at real timestamps (oldest REST seed through
   * now) while live ticks continue to append. Skips live-window compression.
   */
  fullHistory?: boolean;
  /**
   * When two or more series are visible, pin the Y-axis to this domain
   * (e.g. price 0–100). Hidden again as soon as only one line remains.
   */
  fixedValueDomain?: { min: number; max: number };
  /** Override Liveline’s cents formatter (e.g. compact size). */
  formatValue?: (value: number) => string;
  /** Override trade → numeric value (defaults to yes price in cents). */
  parseRowValue?: (row: TradeRow) => number | null;
  emptyMessage?: string;
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
/**
 * persistHistory framing: wide enough that a seeded line always fills the chart,
 * narrow enough that individual live ticks still move it.
 */
const PERSIST_WINDOW_MAX_SECS = 60 * 60;
const PERSIST_MAX_POINTS = 3000;
/** Full-history mode: span from oldest seed through live now (up to ~1 year). */
const FULL_HISTORY_MAX_SECS = 365 * 24 * 60 * 60;

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

function tradesToPoints(
  trades: TradeRow[],
  parseValue: (row: TradeRow) => number | null = parseYesPriceCents,
) {
  const points: { time: number; value: number }[] = [];
  for (const row of trades) {
    const time = parseTradeTimeSec(row);
    const value = parseValue(row);
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
  if (seed.length === 1) {
    const only = seed[0]!;
    return [
      { time: only.time - 8, value: only.value },
      only,
    ];
  }
  if (seed.length < 2) return seed;

  const nowSec = Date.now() / 1000;
  const cutoff = nowSec - LIVE_FOCUS_SECS;
  const recent = points.filter((p) => p.time >= cutoff);
  if (recent.length >= 2) return recent;
  if (recent.length === 1) {
    const only = recent[0]!;
    return [
      { time: only.time - 8, value: only.value },
      only,
    ];
  }
  return seed;
}

/**
 * Liveline needs two points to draw, so a lone reading is widened rather than
 * dropped — otherwise a seeded series with a single snapshot renders as empty.
 */
function persistedPoints(
  points: { time: number; value: number }[],
  fullHistory = false,
) {
  if (points.length === 1) {
    const only = points[0]!;
    return [{ time: only.time - 8, value: only.value }, only];
  }
  if (fullHistory) return points;
  return points.length > PERSIST_MAX_POINTS ? points.slice(-PERSIST_MAX_POINTS) : points;
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

function windowSecsForPoints(
  pointSets: { time: number; value: number }[][],
  maxSecs: number = LIVE_WINDOW_MAX_SECS,
  fullHistory = false,
) {
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
  if (fullHistory) {
    const coverOldest = Math.max(0, nowSec - oldest);
    const spanSecs = Math.max(0, newest - oldest);
    const padded = Math.ceil(Math.max(spanSecs, coverOldest) * 1.08) + 12;
    return Math.min(
      FULL_HISTORY_MAX_SECS,
      Math.max(LIVE_WINDOW_MIN_SECS, padded),
    );
  }

  const spanSecs = Math.max(0, newest - oldest);
  // If seed is stale, use a compact live window — points will be aligned into it.
  if (newest < nowSec - maxSecs) {
    return Math.min(
      maxSecs,
      Math.max(LIVE_WINDOW_MIN_SECS, Math.ceil(spanSecs * 1.25) + 12),
    );
  }

  const coverOldest = Math.max(0, nowSec - oldest);
  const padded = Math.ceil(Math.max(spanSecs, coverOldest) * 1.15) + 8;
  return Math.min(maxSecs, Math.max(LIVE_WINDOW_MIN_SECS, padded));
}

const EMPTY_HIDDEN_IDS: ReadonlySet<string> = new Set();
const DOMAIN_SENTINEL_PREFIX = "__liveline_domain_";
const DOMAIN_SENTINEL_COLOR = "rgba(0,0,0,0)";

function buildDomainSentinelSeries(
  domain: { min: number; max: number },
  existing: { data: { time: number; value: number }[] }[],
) {
  let tMin = Number.POSITIVE_INFINITY;
  let tMax = Number.NEGATIVE_INFINITY;
  for (const s of existing) {
    for (const p of s.data) {
      if (p.time < tMin) tMin = p.time;
      if (p.time > tMax) tMax = p.time;
    }
  }
  if (!Number.isFinite(tMin) || !Number.isFinite(tMax) || tMax <= tMin) {
    return [];
  }
  return [
    {
      id: `${DOMAIN_SENTINEL_PREFIX}min`,
      label: "",
      color: DOMAIN_SENTINEL_COLOR,
      data: [
        { time: tMin, value: domain.min },
        { time: tMax, value: domain.min },
      ],
      value: domain.min,
    },
    {
      id: `${DOMAIN_SENTINEL_PREFIX}max`,
      label: "",
      color: DOMAIN_SENTINEL_COLOR,
      data: [
        { time: tMin, value: domain.max },
        { time: tMax, value: domain.max },
      ],
      value: domain.max,
    },
  ];
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
  fill = false,
  persistHistory = false,
  fullHistory = false,
  fixedValueDomain,
  formatValue,
  parseRowValue,
  emptyMessage,
}, ref) {
  const dark = useIsDarkTheme();
  const hidden = hiddenSeriesIds ?? EMPTY_HIDDEN_IDS;
  const useFullArchive = fullHistory || persistHistory;
  const parseValue = parseRowValue ?? parseYesPriceCents;
  const formatTick =
    formatValue ?? ((v: number) => `${Math.round(Number(v))}¢`);

  const mapped = useMemo(() => {
    const seeded = series.map((item, index) => {
      const points = tradesToPoints(item.trades, parseValue);
      const rawPoints = useFullArchive
        ? persistedPoints(points, fullHistory)
        : seedLivePoints(points);
      const token = item.colorToken ?? defaultSeriesColorToken(index);
      const resolved = resolveDemoChartColor(token);
      const explicit =
        item.color && !item.color.startsWith("var(") ? item.color : null;
      return {
        id: item.id,
        label: item.label,
        fullLabel: item.fullLabel || item.label,
        colorToken: explicit && !item.colorToken ? undefined : token,
        color:
          explicit ||
          (resolved && !resolved.startsWith("var(") ? resolved : null) ||
          resolved ||
          item.color ||
          demoChartCssVar(token),
        rawPoints,
      };
    });

    const windowSecs = windowSecsForPoints(
      seeded.map((s) => s.rawPoints).filter((p) => p.length > 0),
      fullHistory
        ? FULL_HISTORY_MAX_SECS
        : persistHistory
          ? PERSIST_WINDOW_MAX_SECS
          : LIVE_WINDOW_MAX_SECS,
      fullHistory,
    );

    return {
      windowSecs,
      series: seeded.map((s) => {
        const data = fullHistory
          ? s.rawPoints
          : alignPointsToLiveWindow(s.rawPoints, windowSecs);
        return {
          id: s.id,
          label: s.label,
          fullLabel: s.fullLabel,
          colorToken: s.colorToken,
          color: s.color,
          data,
          value: data[data.length - 1]?.value ?? 0,
        };
      }),
    };
  }, [fullHistory, parseValue, persistHistory, series, useFullArchive]);

  const visible = useMemo(
    () => mapped.series.filter((s) => !hidden.has(s.id) && s.data.length > 0),
    [mapped.series, hidden],
  );

  const plotSeries = useMemo(() => {
    if (visible.length <= 1 || !fixedValueDomain) return visible;
    const sentinels = buildDomainSentinelSeries(fixedValueDomain, visible);
    return sentinels.length ? [...visible, ...sentinels] : visible;
  }, [fixedValueDomain, visible]);

  const hideBuiltInSeriesToggle = Boolean(onToggleSeries) || plotSeries.length > visible.length;

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
  const chartWrapRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const root = chartWrapRef.current;
    if (!root) return;
    const titles = new Map(
      mapped.series.map((item) => [item.label, item.fullLabel || item.label]),
    );
    for (const button of root.querySelectorAll("button")) {
      const text = button.textContent?.replace(/\s+/g, " ").trim();
      const title = text ? titles.get(text) : "";
      if (title) button.setAttribute("title", title);
    }
  }, [mapped.series, visible]);

  if (!mapped.series.some((s) => s.data.length)) {
    return (
      <div ref={ref} className={className}>
        <p className="px-3 py-8 text-center text-sm text-muted-foreground">
          {emptyMessage || "No plottable live trade points yet."}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn(
        "flex h-full min-h-0 w-full flex-1 flex-col",
        fill && "overflow-hidden",
        className,
      )}
    >
      {onToggleSeries ? (
        <HubKalshiLiveDemoTradeSeriesLegend
          items={legendItems}
          hiddenIds={hidden}
          onToggle={onToggleSeries}
          onChangeColor={onChangeSeriesColor}
          className={cn("shrink-0", compact && "py-1")}
        />
      ) : null}
      {!primary ? (
        <p className="flex flex-1 items-center justify-center px-3 py-8 text-center text-sm text-muted-foreground">
          All series hidden — click a legend item to show it again.
        </p>
      ) : (
        <div
          ref={chartWrapRef}
          className="flex min-h-0 w-full flex-1 flex-col overflow-hidden px-1 pb-3 pt-1 sm:px-2"
        >
          <Liveline
            data={primary.data}
            value={primary.value}
            series={
              plotSeries.length > 1
                ? plotSeries.map((s) => ({
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
            formatValue={(v) => formatTick(Number(v))}
            padding={{ top: 28, right: 92, bottom: 52, left: 18 }}
            className={cn(
              "w-full min-h-0 flex-1",
              !fill && !compact && "h-full",
              hideBuiltInSeriesToggle &&
                "[&>div:first-child:not(:last-child)]:hidden",
            )}
            style={
              fill || compact
                ? { minHeight: 0, flex: "1 1 0%", height: "auto" }
                : {
                    height: "100%",
                    minHeight: "32rem",
                  }
            }
          />
        </div>
      )}
    </div>
  );
});
