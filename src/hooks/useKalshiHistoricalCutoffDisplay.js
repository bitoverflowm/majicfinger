"use client";

import { useEffect, useMemo, useState } from "react";

import { formatKalshiCutoffDisplay } from "@/lib/kalshiLive/marketTickerSearch";

let cached = {
  dayKey: /** @type {string | null} */ (null),
  cutoffIso: /** @type {string | null} */ (null),
  cutoffLabel: /** @type {string | null} */ (null),
  cutoffLabelWithTime: /** @type {string | null} */ (null),
};

let inFlightPromise = /** @type {Promise<void> | null} */ (null);

function dayKeyNow() {
  // UTC day key is stable across different local timezones.
  return new Date().toISOString().slice(0, 10);
}

async function fetchAndCacheCutoff() {
  // De-dupe concurrent fetches inside a single browser session.
  if (inFlightPromise) return inFlightPromise;

  inFlightPromise = (async () => {
    const res = await fetch("/api/integrations/kalshi-live/historical/cutoff", {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      cached = {
        dayKey: dayKeyNow(),
        cutoffIso: null,
        cutoffLabel: null,
        cutoffLabelWithTime: null,
      };
      return;
    }

    const iso = String(data?.market_settled_ts || "").trim() || null;
    const cutoffLabel = iso
      ? formatKalshiCutoffDisplay(iso, { withTime: false })
      : null;
    const cutoffLabelWithTime = iso
      ? formatKalshiCutoffDisplay(iso, { withTime: true })
      : null;

    cached = {
      dayKey: dayKeyNow(),
      cutoffIso: iso,
      cutoffLabel,
      cutoffLabelWithTime,
    };
  })();

  try {
    await inFlightPromise;
  } finally {
    inFlightPromise = null;
  }
}

/**
 * Fetches Kalshi live/historical cutoff (`market_settled_ts`) and formats a date label.
 * Same cutoff used across Kalshi Live compose (candles, trades, markets, etc.).
 *
 * Cache strategy:
 * - De-dupe concurrent requests (module in-flight promise).
 * - Reuse the value for the current UTC day (cutoff is stable for the full day).
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
  const [cutoffIso, setCutoffIso] = useState(/** @type {string | null} */ (cached.cutoffIso));
  const [cutoffLabel, setCutoffLabel] = useState(/** @type {string | null} */ (cached.cutoffLabel));
  const [cutoffLabelWithTime, setCutoffLabelWithTime] = useState(
    /** @type {string | null} */ (cached.cutoffLabelWithTime),
  );
  const [loading, setLoading] = useState(true);

  const ms = useMemo(() => {
    if (!cutoffIso) return null;
    const parsed = Date.parse(String(cutoffIso).trim());
    return Number.isFinite(parsed) ? parsed : null;
  }, [cutoffIso]);

  useEffect(() => {
    let alive = true;
    const currentDayKey = dayKeyNow();

    if (cached.dayKey === currentDayKey) {
      setCutoffIso(cached.cutoffIso);
      setCutoffLabel(cached.cutoffLabel);
      setCutoffLabelWithTime(cached.cutoffLabelWithTime);
      setLoading(false);
      return () => {
        alive = false;
      };
    }

    setLoading(true);
    void (async () => {
      try {
        await fetchAndCacheCutoff();
        if (!alive) return;
        setCutoffIso(cached.cutoffIso);
        setCutoffLabel(cached.cutoffLabel);
        setCutoffLabelWithTime(cached.cutoffLabelWithTime);
      } catch {
        if (!alive) return;
        setCutoffIso(null);
        setCutoffLabel(null);
        setCutoffLabelWithTime(null);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return {
    cutoffIso,
    cutoffMs: ms,
    cutoffLabel,
    cutoffLabelWithTime,
    loading,
  };
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
