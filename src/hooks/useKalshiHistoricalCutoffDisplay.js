"use client";

import { useMemo } from "react";

import { formatKalshiCutoffDisplay } from "@/lib/kalshiLive/marketTickerSearch";

/** Kalshi moves data older than about this many days from its live API to the historical one. */
const KALSHI_CUTOFF_DAYS = 90;

/** Midnight UTC, `KALSHI_CUTOFF_DAYS` before today. */
export function approximateKalshiCutoffIso(now = Date.now()) {
  const day = new Date(now);
  day.setUTCHours(0, 0, 0, 0);
  day.setUTCDate(day.getUTCDate() - KALSHI_CUTOFF_DAYS);
  return day.toISOString();
}

/**
 * Kalshi's live vs historical boundary, estimated as today minus 90 days so nothing waits on Kalshi.
 * Same cutoff used across Kalshi Live compose (candles, trades, markets, etc.).
 *
 * @returns {{
 *  cutoffIso: string | null;
 *  cutoffMs: number | null;
 *  cutoffLabel: string | null;
 *  cutoffLabelWithTime: string | null;
 *  loading: boolean;
 * }}
 */
export function useKalshiHistoricalCutoffDisplay() {
  return useMemo(() => {
    const cutoffIso = approximateKalshiCutoffIso();
    return {
      cutoffIso,
      cutoffMs: Date.parse(cutoffIso),
      cutoffLabel: formatKalshiCutoffDisplay(cutoffIso, { withTime: false }),
      cutoffLabelWithTime: formatKalshiCutoffDisplay(cutoffIso, { withTime: true }),
      loading: false,
    };
  }, []);
}

/**
 * @param {string | null | undefined} cutoffLabel
 * @returns {string}
 */
export function kalshiHistoricalV2Caption(cutoffLabel) {
  if (cutoffLabel) return `most recent historical data until: ${cutoffLabel}`;
  return "most recent historical data until: …";
}

/**
 * @param {string | null | undefined} cutoffLabel
 * @returns {string}
 */
export function kalshiLiveCaption(cutoffLabel) {
  if (cutoffLabel) return `recent and live kalshi data ${cutoffLabel} - now`;
  return "recent and live kalshi data … - now";
}

export const KALSHI_HISTORICAL_DEEP_CAPTION =
  "Deep historical data: Kalshi Launch - Dec 2025";

/** Same cutoff lines the integration picker uses. */
export function kalshiSourceCutoffCaption(integrationId, cutoffLabel) {
  if (integrationId === "kalshiHistorical") return KALSHI_HISTORICAL_DEEP_CAPTION;
  if (integrationId === "kalshiHistoricalV2") return kalshiHistoricalV2Caption(cutoffLabel);
  if (integrationId === "kalshiLive") return kalshiLiveCaption(cutoffLabel);
  return "";
}
