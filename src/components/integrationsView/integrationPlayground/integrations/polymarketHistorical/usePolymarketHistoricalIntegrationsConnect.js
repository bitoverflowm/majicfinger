"use client";

import { useState, useCallback } from "react";
import { CONNECT_PHASE_MESSAGES } from "./connectProgressMessages";
import { warmPolymarketHistoricalConnect } from "./warmPolymarketHistoricalConnect";

/**
 * Warm DuckDB + preload panel on the Integrations (or data-start) page, then run navigate().
 */
export function usePolymarketHistoricalIntegrationsConnect(navigate) {
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState(CONNECT_PHASE_MESSAGES[0].text);
  const [progress, setProgress] = useState(4);
  const [error, setError] = useState(null);

  const start = useCallback(async () => {
    setBusy(true);
    setError(null);
    setLabel(CONNECT_PHASE_MESSAGES[0].text);
    setProgress(4);
    try {
      await warmPolymarketHistoricalConnect({
        onLabel: setLabel,
        onProgress: setProgress,
      });
      navigate?.();
    } catch (e) {
      setError(e?.message || String(e));
      setLabel("Something went wrong while starting DuckDB");
      setProgress(0);
    } finally {
      setBusy(false);
    }
  }, [navigate]);

  return { busy, label, progress, error, start };
}
