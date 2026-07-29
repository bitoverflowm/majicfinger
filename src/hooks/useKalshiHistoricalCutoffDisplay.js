"use client";

import { useEffect, useState } from "react";

import { formatKalshiCutoffDisplay } from "@/lib/kalshiLive/marketTickerSearch";

/**
 * Fetches Kalshi live/historical cutoff (`market_settled_ts`) and formats a date label.
 * Same cutoff used across Kalshi Live compose (candles, trades, markets, etc.).
 *
 * @returns {{ cutoffLabel: string | null; loading: boolean }}
 */
export function useKalshiHistoricalCutoffDisplay() {
  const [cutoffLabel, setCutoffLabel] = useState(/** @type {string | null} */ (null));
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
          setCutoffLabel(null);
          return;
        }
        const iso = String(data?.market_settled_ts || "").trim();
        const label = formatKalshiCutoffDisplay(iso, { withTime: false });
        setCutoffLabel(label || null);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setCutoffLabel(null);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  return { cutoffLabel, loading };
}

/**
 * @param {string | null | undefined} cutoffLabel
 * @returns {string}
 */
export function kalshiHistoricalV2Caption(cutoffLabel) {
  if (cutoffLabel) return `most recent historical data until: ${cutoffLabel}`;
  return "most recent historical data until: …";
}

export const KALSHI_HISTORICAL_DEEP_CAPTION =
  "Deep historical data: Kalshi Launch - Dec 2025";
