import { Skeleton } from "@/components/ui/skeleton";
import { connectGridFillViewportClass, connectGridToolbarCompactClass } from "@/lib/connectGridCompact";
import { cn } from "@/lib/utils";

/** Toolbar placeholders while sheet data is loading (Connect home pull, rehydrate, etc.). */
export function GridToolbarSkeleton({ className, compact = false }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-b py-2",
        compact && connectGridToolbarCompactClass,
        className,
      )}
      aria-busy="true"
      aria-label="Loading sheet toolbar"
    >
      <Skeleton className={cn("rounded-md", compact ? "h-7 w-[8rem]" : "h-9 w-[8.75rem]")} />
      <div className="h-4 w-px shrink-0 bg-border" aria-hidden />
      <Skeleton className={cn("rounded-md", compact ? "h-7 w-[7rem]" : "h-8 w-[7.75rem]")} />
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className={cn("shrink-0 rounded-md", compact ? "h-7 w-7" : "h-8 w-8")} />
      ))}
      <div className="ml-auto" aria-hidden />
      <Skeleton className={cn("shrink-0 rounded-md", compact ? "h-7 w-7" : "h-8 w-8")} />
    </div>
  );
}

const TABLE_COLS = 5;
const TABLE_ROWS = 9;

/** AG Grid–shaped table placeholder. */
export function GridTableSkeleton({ fillViewport = false, className, compact = false }) {
  const rowCount = compact ? 14 : TABLE_ROWS;
  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-md border border-border/60 bg-white dark:bg-slate-950",
        fillViewport ? connectGridFillViewportClass : "h-[550px]",
        className,
      )}
      aria-busy="true"
      aria-label="Loading sheet data"
    >
      <div className={cn("flex gap-1.5 border-b bg-muted/20 px-2", compact ? "py-1.5" : "py-2.5")}>
        {Array.from({ length: TABLE_COLS }, (_, i) => (
          <Skeleton
            key={`h-${i}`}
            className={cn("min-w-[3rem] flex-1 rounded-sm", compact ? "h-5" : "h-7")}
          />
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {Array.from({ length: rowCount }, (_, r) => (
          <div
            key={`r-${r}`}
            className={cn(
              "flex gap-1.5 border-b border-border/40 px-2 last:border-0",
              compact ? "py-1.5" : "py-2.5",
            )}
          >
            {Array.from({ length: TABLE_COLS }, (_, c) => (
              <Skeleton
                key={`c-${r}-${c}`}
                className={cn("min-w-[3rem] flex-1 rounded-sm", compact ? "h-3.5" : "h-5")}
              />
            ))}
          </div>
        ))}
      </div>
      <div
        className={cn(
          "flex flex-wrap items-center justify-between border-t px-2",
          compact ? "gap-2 py-1.5" : "gap-3 px-3 py-2.5",
        )}
      >
        <Skeleton className={cn("rounded-md", compact ? "h-6 w-24" : "h-7 w-28")} />
        <Skeleton className={cn("rounded-md", compact ? "h-4 w-28" : "h-5 w-32")} />
        <div className="flex gap-1">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={`p-${i}`} className={cn("rounded-md", compact ? "h-6 w-6" : "h-7 w-7")} />
          ))}
        </div>
      </div>
    </div>
  );
}
