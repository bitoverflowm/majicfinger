"use client";

import DataLakeParquetPanel from "../polymarketHistorical/DataLakeParquetPanel";
import { ConnectProgressWithLabel } from "../polymarketHistorical/ConnectProgressWithLabel";
import { useBeckerParquetBoot } from "../polymarketHistorical/useBeckerParquetBoot";
import { Button } from "@/components/ui/button";

/** Kalshi Historical — Becker Parquet under `kalshi/` in the same S3 bucket as Polymarket historical. */
export default function KalshiHistorical({ setConnectedData }) {
  const { label, progress, ready, error, retry } = useBeckerParquetBoot();

  if (error) {
    return (
      <div className="text-sm space-y-4 min-w-0 max-w-full overflow-hidden">
        <h3 className="text-sm font-semibold tracking-tight">Kalshi Historical</h3>
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
        <h3 className="text-sm font-semibold tracking-tight">Kalshi Historical</h3>
        <ConnectProgressWithLabel label={label} progress={progress} />
      </div>
    );
  }

  return (
    <div className="text-sm space-y-3 min-w-0 max-w-full overflow-hidden">
      <h3 className="text-sm font-semibold tracking-tight">Kalshi Historical</h3>
      <DataLakeParquetPanel setConnectedData={setConnectedData} dataset="kalshi" />
    </div>
  );
}
