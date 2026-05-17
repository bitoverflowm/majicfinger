"use client";

import { useEffect } from "react";

import DataLakeParquetPanel from "./DataLakeParquetPanel";
import { ConnectProgressWithLabel } from "./ConnectProgressWithLabel";
import { useBeckerParquetBoot } from "./useBeckerParquetBoot";
import { useMyStateV2 } from "@/context/stateContextV2";
import { Button } from "@/components/ui/button";

/**
 * Polymarket Historical — archived Becker / Lychee Parquet in S3, queried via DuckDB-WASM in the browser.
 */
export default function PolymarketHistorical({ setConnectedData }) {
  const ctx = useMyStateV2();
  const connectHomeDataLake =
    ctx?.viewing === "connectDataHome" && ctx?.connectWorkspace === "polymarketHistorical";
  const setConnectDataLakePullState = ctx?.setConnectDataLakePullState;
  const ingestLoading = !!ctx?.connectDataLakePullState?.loading;

  const { label, progress, ready, error, retry } = useBeckerParquetBoot();

  useEffect(() => {
    if (!connectHomeDataLake || !setConnectDataLakePullState) return;
    if (ready) {
      setConnectDataLakePullState((prev) => {
        const p = Number(prev.progress) || 0;
        if (prev.loading && p < 10) {
          return { ...prev, loading: false, label: "", progress: 0, error: null };
        }
        if (!prev.loading && p > 0 && p < 100) {
          return { ...prev, label: "", progress: 0 };
        }
        return prev;
      });
      return;
    }
    if (error || ingestLoading) return;
    setConnectDataLakePullState((prev) => ({
      ...prev,
      loading: true,
      error: null,
      label: label || prev.label || "Preparing workspace…",
      progress: Math.max(Number(prev.progress) || 0, Number(progress) || 2),
    }));
  }, [
    connectHomeDataLake,
    setConnectDataLakePullState,
    ingestLoading,
    ready,
    error,
    label,
    progress,
  ]);

  if (error) {
    return (
      <div className="text-sm space-y-4 min-w-0 max-w-full overflow-hidden">
        <ConnectProgressWithLabel label={label} progress={progress} />
        <p className="text-[11px] text-destructive break-words min-w-0 max-w-full">{error}</p>
        <Button type="button" size="sm" className="h-8 text-xs w-fit" variant="secondary" onClick={retry}>
          Try again
        </Button>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="text-sm space-y-4 min-w-0 max-w-full overflow-hidden">
        <ConnectProgressWithLabel label={label} progress={progress} />
      </div>
    );
  }

  return (
    <div className="text-sm space-y-3 min-w-0 max-w-full overflow-hidden">
      <DataLakeParquetPanel setConnectedData={setConnectedData} dataset="polymarket" />
    </div>
  );
}
