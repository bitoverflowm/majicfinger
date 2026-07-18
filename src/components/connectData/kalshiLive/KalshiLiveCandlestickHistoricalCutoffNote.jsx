"use client";

import { useCallback, useEffect, useState } from "react";

import { useMyStateV2 } from "@/context/stateContextV2";
import { cn } from "@/lib/utils";

/**
 * @param {string | undefined} iso
 * @returns {string | null}
 */
function formatCutoffLocal(iso) {
  const raw = String(iso || "").trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * Live vs historical candlestick cutoff note.
 *
 * @param {{
 *   className?: string;
 *   direction: "before" | "after";
 *   targetIntegration: "kalshiHistorical" | "kalshiLive";
 *   targetLabel: string;
 * }} props
 */
export function KalshiCandlestickCutoffNote({
  className,
  direction,
  targetIntegration,
  targetLabel,
}) {
  const ctx = useMyStateV2() ?? {};
  const { requestConnectWorkspace, setIntegrationSidebar, setRightPanelTab } = ctx;

  const [localDate, setLocalDate] = useState(/** @type {string | null} */ (null));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch("/api/integrations/kalshi-live/historical/cutoff", {
          headers: { Accept: "application/json" },
          credentials: "same-origin",
          signal: ac.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (ac.signal.aborted) return;
        if (!res.ok) {
          setLocalDate(null);
          return;
        }
        setLocalDate(formatCutoffLocal(data?.market_settled_ts));
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setLocalDate(null);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  const goToTarget = useCallback(() => {
    setRightPanelTab?.("integrations");
    setIntegrationSidebar?.(targetIntegration);
    requestConnectWorkspace?.(targetIntegration);
  }, [requestConnectWorkspace, setIntegrationSidebar, setRightPanelTab, targetIntegration]);

  if (loading) {
    return (
      <p className={cn("text-[11px] leading-snug text-muted-foreground", className)}>
        Checking historical data cutoff…
      </p>
    );
  }

  if (!localDate) return null;

  return (
    <p className={cn("text-[11px] leading-snug text-muted-foreground", className)}>
      Note: if you are looking for candlestick data {direction}{" "}
      <span className="font-medium text-foreground">{localDate}</span>, go{" "}
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
    />
  );
}
