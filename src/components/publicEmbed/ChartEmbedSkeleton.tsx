import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Default height class for hub-published chart embeds. */
export const HUB_CHART_EMBED_HEIGHT = "h-[570px] md:h-[630px]";

/** Default height class for standalone public chart pages. */
export const PUBLIC_CHART_EMBED_HEIGHT =
  "h-[420px] min-h-[320px] md:h-[750px] w-full max-w-[1040px]";

type ChartEmbedSkeletonProps = {
  className?: string;
  /** Show a small title bar skeleton above the chart area. */
  showTitle?: boolean;
};

/**
 * Pulse skeleton used while chart data / Recharts canvas is loading.
 * Used on dashboards, hub embeds, and public chart pages.
 */
export function ChartEmbedSkeleton({
  className,
  showTitle = true,
}: ChartEmbedSkeletonProps) {
  return (
    <div
      className={cn(
        "flex min-h-[200px] flex-1 flex-col gap-3 rounded-md border border-border/60 bg-card/50 p-4",
        className,
      )}
      aria-hidden="true"
      aria-label="Loading chart"
    >
      {showTitle ? <Skeleton className="h-3 w-24 shrink-0" /> : null}
      <Skeleton className="min-h-0 w-full flex-1 rounded-lg" />
    </div>
  );
}

export function HubChartEmbedSkeleton() {
  return (
    <ChartEmbedSkeleton
      className={cn("border-0 bg-transparent", HUB_CHART_EMBED_HEIGHT)}
    />
  );
}

export function PublicChartPageSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col px-4 py-5 md:px-6 md:py-6">
      <ChartEmbedSkeleton
        className={cn("mx-auto border-0 bg-transparent p-2", PUBLIC_CHART_EMBED_HEIGHT)}
        showTitle={false}
      />
      <div className="mt-4 flex justify-center gap-2">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
  );
}
