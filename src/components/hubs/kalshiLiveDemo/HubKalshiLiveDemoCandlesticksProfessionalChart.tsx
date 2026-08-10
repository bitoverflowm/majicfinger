"use client";

import { forwardRef, useEffect, useMemo, useState } from "react";

import { CandlestickChartView } from "@/components/chartView/CandlestickChart";
import { mapRowsToCandlestickSeriesData } from "@/lib/chartCandlestick";
import { cn } from "@/lib/utils";

type HubKalshiLiveDemoCandlesticksProfessionalChartProps = {
  candles: Record<string, unknown>[];
  label?: string;
  className?: string;
};

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

/**
 * Dashboard-style TradingView Lightweight Charts candlesticks for the hub demo.
 */
export const HubKalshiLiveDemoCandlesticksProfessionalChart = forwardRef<
  HTMLDivElement,
  HubKalshiLiveDemoCandlesticksProfessionalChartProps
>(function HubKalshiLiveDemoCandlesticksProfessionalChart(
  { candles, label, className },
  ref,
) {
  const dark = useIsDarkTheme();

  const mapped = useMemo(
    () =>
      mapRowsToCandlestickSeriesData(candles, {
        ohlcSetId: "price",
      }),
    [candles],
  );

  if (!mapped.ok || !mapped.data.length) {
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
      {label ? (
        <div className="flex shrink-0 items-center justify-center px-2 py-2 text-[11px] font-medium text-muted-foreground">
          {label}
        </div>
      ) : null}
      <div className="min-h-0 w-full flex-1 px-1 pb-2 pt-1 sm:px-2">
        <CandlestickChartView
          data={mapped.data}
          dark={dark}
          className="h-full min-h-[28rem] w-full rounded-md border border-border/40 bg-background"
        />
      </div>
    </div>
  );
});
