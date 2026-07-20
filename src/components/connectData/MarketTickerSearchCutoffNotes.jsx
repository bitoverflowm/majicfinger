"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useMyStateV2 } from "@/context/stateContextV2";
import {
  classifyMarketVsHistoricalCutoff,
  formatKalshiCutoffDisplay,
  parseKalshiHistoricalCutoffMs,
} from "@/lib/kalshiLive/marketTickerSearch";
import { cn } from "@/lib/utils";

/** @typedef {import("@/lib/kalshiLive/marketTickerSearch").MarketTickerSelection} MarketTickerSelection */
/** @typedef {import("@/lib/kalshiLive/marketTickerSearch").KalshiTickerSearchDataSource} KalshiTickerSearchDataSource */

/**
 * @param {"trades" | "candlesticks" | "data"} historyEntity
 */
function entityCopy(historyEntity) {
  if (historyEntity === "trades") {
    return {
      singular: "trade",
      plural: "trades",
      historyNoun: "trade history",
      pullNoun: "trades",
    };
  }
  if (historyEntity === "candlesticks") {
    return {
      singular: "candlestick",
      plural: "candlesticks",
      historyNoun: "candlestick history",
      pullNoun: "candlesticks",
    };
  }
  return {
    singular: "data",
    plural: "data",
    historyNoun: "history",
    pullNoun: "data",
  };
}

/**
 * Cutoff-aware notes for selected markets in Market Ticker Search.
 * Live: warn when a market ended before cutoff or spans the cutoff.
 * Historical: placeholder for inverse messaging once that search is wired.
 *
 * @param {{
 *   selections: MarketTickerSelection[];
 *   dataSource?: KalshiTickerSearchDataSource;
 *   historyEntity?: "trades" | "candlesticks" | "data";
 *   className?: string;
 * }} props
 */
export function MarketTickerSearchCutoffNotes({
  selections,
  dataSource = "live",
  historyEntity = "data",
  className,
}) {
  const ctx = useMyStateV2() ?? {};
  const { requestConnectWorkspace, setIntegrationSidebar, setRightPanelTab } = ctx;

  const [cutoffIso, setCutoffIso] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    if (!selections.length) return;
    const ac = new AbortController();
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
          setCutoffIso(null);
          return;
        }
        const iso = String(data?.market_settled_ts || "").trim();
        setCutoffIso(iso || null);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setCutoffIso(null);
      }
    })();
    return () => ac.abort();
  }, [selections.length]);

  const goToHistorical = useCallback(() => {
    setRightPanelTab?.("integrations");
    setIntegrationSidebar?.("kalshiHistorical");
    requestConnectWorkspace?.("kalshiHistorical");
  }, [requestConnectWorkspace, setIntegrationSidebar, setRightPanelTab]);

  const cutoffMs = parseKalshiHistoricalCutoffMs(cutoffIso);
  const cutoffLabel = formatKalshiCutoffDisplay(cutoffIso, { withTime: true });
  const copy = entityCopy(historyEntity);

  const { endedBefore, spans } = useMemo(() => {
    /** @type {MarketTickerSelection[]} */
    const ended = [];
    /** @type {MarketTickerSelection[]} */
    const spanning = [];
    if (!Number.isFinite(cutoffMs)) return { endedBefore: ended, spans: spanning };
    for (const s of selections || []) {
      const rel = classifyMarketVsHistoricalCutoff(s, cutoffMs);
      if (rel === "ended_before_cutoff") ended.push(s);
      else if (rel === "spans_cutoff") spanning.push(s);
    }
    return { endedBefore: ended, spans: spanning };
  }, [selections, cutoffMs]);

  // Historical search will get inverse notes later — do not show live messaging there.
  if (dataSource === "historical") {
    return null;
  }

  if (!selections.length || !cutoffLabel) return null;
  if (!endedBefore.length && !spans.length) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {endedBefore.map((s) => {
        const resolvedOn =
          formatKalshiCutoffDisplay(s.closeTime, { withTime: false }) || "an earlier date";
        return (
          <div
            key={`ended-${s.ticker}`}
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-2 text-[11px] leading-snug text-destructive"
          >
            <span className="font-mono font-medium text-destructive">{s.ticker}</span>
            {" — "}
            This market was resolved on{" "}
            <span className="font-medium">{resolvedOn}</span>. Live cannot get this{" "}
            {copy.historyNoun}.{" "}
            <button
              type="button"
              onClick={goToHistorical}
              className="font-medium underline underline-offset-2 hover:opacity-80"
            >
              Click here
            </button>{" "}
            to go to Kalshi Historical to pull {copy.pullNoun} for this ticker.
          </div>
        );
      })}

      {spans.length > 0 ? (
        <div
          role="status"
          className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-[11px] leading-snug text-amber-950 dark:text-amber-100"
        >
          {spans.length === 1 ? (
            <>
              <span className="font-mono font-medium">{spans[0].ticker}</span>
              {" — "}
            </>
          ) : (
            <>
              <span className="font-medium">
                {spans.map((s) => s.ticker).join(", ")}
              </span>
              {" — "}
            </>
          )}
          Only {copy.plural} after{" "}
          <span className="font-medium">{cutoffLabel}</span> will be available in this pull.{" "}
          {copy.plural.charAt(0).toUpperCase() + copy.plural.slice(1)} before{" "}
          <span className="font-medium">{cutoffLabel}</span> require you to make a request in{" "}
          <button
            type="button"
            onClick={goToHistorical}
            className="font-medium underline underline-offset-2 hover:opacity-80"
          >
            Kalshi Historical
          </button>
          .
        </div>
      ) : null}
    </div>
  );
}
