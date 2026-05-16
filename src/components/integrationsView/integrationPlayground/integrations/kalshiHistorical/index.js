"use client";

import { useEffect } from "react";

import DataLakeParquetPanel from "../polymarketHistorical/DataLakeParquetPanel";
import { ConnectProgressWithLabel } from "../polymarketHistorical/ConnectProgressWithLabel";
import { useBeckerParquetBoot } from "../polymarketHistorical/useBeckerParquetBoot";
import { useMyStateV2 } from "@/context/stateContextV2";
import { Button } from "@/components/ui/button";

/** Kalshi Historical — Becker Parquet under `kalshi/` in the same S3 bucket as Polymarket historical. */
export default function KalshiHistorical({ setConnectedData }) {
  const ctx = useMyStateV2();
  const connectHomeKalshi =
    ctx?.viewing === "connectDataHome" && ctx?.connectWorkspace === "kalshiHistorical";
  const setConnectDataLakePullState = ctx?.setConnectDataLakePullState;
  const ingestLoading = !!ctx?.connectDataLakePullState?.loading;

  const { label, progress, ready, error, retry } = useBeckerParquetBoot();

  useEffect(() => {
    if (!connectHomeKalshi || !setConnectDataLakePullState || ingestLoading) return;
    if (ready || error) return;
    setConnectDataLakePullState((prev) => ({
      ...prev,
      loading: true,
      error: null,
      label: label || prev.label || "Preparing workspace…",
      progress: Math.max(Number(prev.progress) || 0, Number(progress) || 2),
    }));
  }, [
    connectHomeKalshi,
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
      <DataLakeParquetPanel setConnectedData={setConnectedData} dataset="kalshi" />
    </div>
  );
}
