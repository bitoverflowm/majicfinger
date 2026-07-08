"use client";

import { useState, useEffect, useCallback } from "react";
import { isDuckDbWasmReady } from "@/lib/duckdb/duckdbWasmClient";
import { CONNECT_PHASE_MESSAGES } from "./connectProgressMessages";
import { warmBeckerParquetConnect } from "./warmBeckerParquetConnect";

/**
 * After Connect (or opening the panel), warm DuckDB and preload the Becker Parquet panel chunk.
 * @param {{ skipWarm?: boolean }} [options]
 *   When skipWarm is true (connect-home / guided pull bridge), mount the panel immediately.
 *   DuckDB warms in the background during Athena; ingest registers the view after rows return.
 */
export function useBeckerParquetBoot(options = {}) {
  const skipWarm = !!options.skipWarm;
  const [label, setLabel] = useState(CONNECT_PHASE_MESSAGES[0].text);
  const [progress, setProgress] = useState(skipWarm ? 100 : 4);
  const [ready, setReady] = useState(skipWarm);
  const [error, setError] = useState(null);

  const runBoot = useCallback(async () => {
    if (skipWarm) {
      setError(null);
      setReady(true);
      setProgress(100);
      setLabel("Ready");
      return;
    }

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
      await warmBeckerParquetConnect({
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
  }, [skipWarm]);

  useEffect(() => {
    runBoot();
  }, [runBoot]);

  return { label, progress, ready, error, retry: runBoot };
}
