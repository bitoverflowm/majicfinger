"use client";

import { useCallback } from "react";

import { useMyStateV2 } from "@/context/stateContextV2";
import { useKalshiHistoricalCutoffDisplay } from "@/hooks/useKalshiHistoricalCutoffDisplay";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Live vs historical candlestick cutoff note.
 *
 * @param {{
 *   className?: string;
 *   direction: "before" | "after";
 *   targetIntegration: "kalshiHistorical" | "kalshiLive";
 *   targetLabel: string;
 *   dataLabel?: string;
 * }} props
 */
export function KalshiCandlestickCutoffNote({
  className,
  direction,
  targetIntegration,
  targetLabel,
  dataLabel = "candlestick data",
}) {
  const ctx = useMyStateV2() ?? {};
  const { requestConnectWorkspace, setIntegrationSidebar, setRightPanelTab } = ctx;

  const { cutoffLabelWithTime, loading } = useKalshiHistoricalCutoffDisplay();

  const goToTarget = useCallback(() => {
    setRightPanelTab?.("integrations");
    setIntegrationSidebar?.(targetIntegration);
    requestConnectWorkspace?.(targetIntegration);
  }, [requestConnectWorkspace, setIntegrationSidebar, setRightPanelTab, targetIntegration]);

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Skeleton className="h-4 w-[10rem] bg-muted-foreground/20" />
      </div>
    );
  }

  if (!cutoffLabelWithTime) return null;

  return (
    <p className={cn("text-[11px] leading-snug text-muted-foreground", className)}>
      Note: if you are looking for {dataLabel} {direction}{" "}
      <span className="font-medium text-foreground">{cutoffLabelWithTime}</span>, go{" "}
      <button
        type="button"
        onClick={goToTarget}
        className="font-medium text-secondary underline underline-offset-2 hover:text-secondary/80"
      >
        here
      </button>{" "}
      to use {targetLabel}.
    </p>
  );
}

/**
 * Note under Get Market Candlesticks: cutoff + link to Kalshi Historical.
 *
 * @param {{ className?: string }} props
 */
export function KalshiLiveCandlestickHistoricalCutoffNote({ className }) {
  return (
    <KalshiCandlestickCutoffNote
      className={className}
      direction="before"
      targetIntegration="kalshiHistorical"
      targetLabel="Kalshi Historical"
    />
  );
}

/**
 * Note under Get Trades: same cutoff timestamp as candlesticks + link to Kalshi Historical.
 *
 * @param {{ className?: string }} props
 */
export function KalshiLiveTradesHistoricalCutoffNote({ className }) {
  return (
    <KalshiCandlestickCutoffNote
      className={className}
      direction="before"
      targetIntegration="kalshiHistorical"
      targetLabel="Kalshi Historical"
      dataLabel="trade data"
    />
  );
}

/**
 * Note on Kalshi Historical hub: cutoff + link to Kalshi Live.
 *
 * @param {{ className?: string }} props
 */
export function KalshiHistoricalCandlestickLiveCutoffNote({ className }) {
  return (
    <KalshiCandlestickCutoffNote
      className={className}
      direction="after"
      targetIntegration="kalshiLive"
      targetLabel="Kalshi Live"
      dataLabel="kalshi data"
    />
  );
}
