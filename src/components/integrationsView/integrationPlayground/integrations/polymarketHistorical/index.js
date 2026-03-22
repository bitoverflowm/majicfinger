"use client";

import DataLakeParquetPanel from "./DataLakeParquetPanel";
import { ConnectProgressWithLabel } from "./ConnectProgressWithLabel";
import { usePolymarketHistoricalBoot } from "./usePolymarketHistoricalBoot";
import { Button } from "@/components/ui/button";

/**
 * Polymarket Historical — archived Becker / Lychee Parquet in S3, queried via DuckDB-WASM in the browser.
 * (Live Polymarket API + WS remain under the “Polymarket” integration.)
 */
export default function PolymarketHistorical({ setConnectedData }) {
  const { label, progress, ready, error, retry } = usePolymarketHistoricalBoot();

  if (error) {
    return (
      <div className="text-sm space-y-4 min-w-0 max-w-full overflow-hidden">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold tracking-tight">Polymarket Historical</h3>
          <p className="text-[11px] text-destructive break-words">{error}</p>
        </div>
        <ConnectProgressWithLabel label={label} progress={progress} />
        <Button type="button" size="sm" className="h-8 text-xs w-fit" variant="secondary" onClick={retry}>
          Try again
        </Button>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="text-sm space-y-4 min-w-0 max-w-full overflow-hidden">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold tracking-tight">Polymarket Historical</h3>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Hang tight — we&apos;re connecting to your data lake and spinning up DuckDB in this tab.
          </p>
        </div>
        <ConnectProgressWithLabel label={label} progress={progress} />
        <p className="text-[10px] text-muted-foreground leading-snug">
          First load downloads the WASM engine; later visits reuse it from cache.
        </p>
      </div>
    );
  }

  return (
    <div className="text-sm space-y-3 min-w-0 max-w-full overflow-hidden">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold tracking-tight">Polymarket Historical</h3>
        <p className="text-[11px] text-muted-foreground leading-snug">
          Query public or proxied Parquet shards from your S3 data lake. Pick a sample, set max rows, then load into the
          active sheet.
        </p>
      </div>
      <DataLakeParquetPanel setConnectedData={setConnectedData} />
    </div>
  );
}
