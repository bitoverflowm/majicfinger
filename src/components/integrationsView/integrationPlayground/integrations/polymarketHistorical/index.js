"use client";

import DataLakeParquetPanel from "./DataLakeParquetPanel";
import { ConnectProgressWithLabel } from "./ConnectProgressWithLabel";
import { useBeckerParquetBoot } from "./useBeckerParquetBoot";
import { Button } from "@/components/ui/button";

/**
 * Polymarket Historical — archived Becker / Lychee Parquet in S3, queried via DuckDB-WASM in the browser.
 */
export default function PolymarketHistorical({ setConnectedData }) {
  const { label, progress, ready, error, retry } = useBeckerParquetBoot();

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
