"use client";

import { useState, useEffect, useCallback } from "react";
import { isDuckDbWasmReady } from "@/lib/duckdb/duckdbWasmClient";
import { CONNECT_PHASE_MESSAGES } from "./connectProgressMessages";
import { warmPolymarketHistoricalConnect } from "./warmPolymarketHistoricalConnect";

/**
 * After navigating from Integrations (post-warm), finish mounting the panel — fast if DuckDB is already hot.
 */
export function usePolymarketHistoricalBoot() {
  const [label, setLabel] = useState(CONNECT_PHASE_MESSAGES[0].text);
  const [progress, setProgress] = useState(4);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  const runBoot = useCallback(async () => {
    setError(null);
    setReady(false);
    setProgress(4);
    setLabel(CONNECT_PHASE_MESSAGES[0].text);

    try {
      if (isDuckDbWasmReady()) {
        setLabel("Resuming workspace…");
        setProgress(96);
        await import("./DataLakeParquetPanel");
        setProgress(100);
        await new Promise((r) => setTimeout(r, 160));
        setReady(true);
        return;
      }
      await warmPolymarketHistoricalConnect({
        onLabel: setLabel,
        onProgress: setProgress,
      });
      setLabel("Ready — pick a dataset below");
      setReady(true);
    } catch (e) {
      const msg = e?.message || String(e);
      setError(msg);
      setLabel("Something went wrong while starting DuckDB");
      setProgress(0);
    }
  }, []);

  useEffect(() => {
    runBoot();
  }, [runBoot]);

  return { label, progress, ready, error, retry: runBoot };
}
