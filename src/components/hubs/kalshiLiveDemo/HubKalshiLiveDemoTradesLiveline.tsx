"use client";

import { forwardRef, useEffect, useMemo, useState } from "react";
import { Liveline } from "liveline";

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
      const data = tradesToPoints(item.trades);
      return {
        id: item.id,
        label: item.label,
        color: item.color || SERIES_COLORS[index % SERIES_COLORS.length],
        data,
        value: data[data.length - 1]?.value ?? 0,
      };
    });
  }, [series]);

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
    <div ref={ref} className={className}>
      <div className="h-[22rem] w-full px-2 py-3 sm:px-3">
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
          window={900}
          formatValue={(v) => `${Math.round(Number(v))}¢`}
        />
      </div>
    </div>
  );
});
