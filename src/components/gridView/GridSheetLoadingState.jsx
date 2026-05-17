import { ConnectProgressWithLabel } from "@/components/integrationsView/integrationPlayground/integrations/polymarketHistorical/ConnectProgressWithLabel";
import { GridTableSkeleton } from "@/components/gridView/GridViewLoadingSkeleton";
import { cn } from "@/lib/utils";

/** Connect Step 2 — progress + animated table skeleton while sheet data loads. */
export function GridSheetLoadingState({
  label = "Loading data…",
  progress = 0,
  fillViewport = false,
  compact = false,
  className,
}) {
  return (
    <div
      className={cn(
        "flex min-h-0 w-full flex-1 flex-col gap-2 overflow-hidden",
        className,
      )}
      aria-busy="true"
      aria-live="polite"
    >
      <ConnectProgressWithLabel
        label={label}
        progress={progress}
        className="w-full min-w-0 shrink-0"
      />
      <GridTableSkeleton
        fillViewport={fillViewport}
        compact={compact}
        className="min-h-0 flex-1"
      />
    </div>
  );
}
