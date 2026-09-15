export const COMPARE_FEATURED_LIMIT = 10;

export function CompareFeaturedSkeletonList() {
  return (
    <div className="grid auto-rows-fr gap-1.5 p-2" aria-hidden>
      {Array.from({ length: COMPARE_FEATURED_LIMIT }).map((_, index) => (
        <div
          key={index}
          className="flex h-[4.75rem] animate-pulse items-center gap-2 rounded-md border border-border/60 bg-background p-1.5"
        >
          <div className="size-11 shrink-0 rounded-md bg-muted" />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-1">
            <div className="h-[1.75rem] space-y-1">
              <div className="h-2.5 w-full rounded bg-muted" />
              <div className="h-2.5 w-2/3 rounded bg-muted" />
            </div>
            <div className="flex h-4 items-center gap-1.5">
              <div className="h-4 w-14 rounded bg-muted" />
              <div className="h-4 w-12 rounded bg-muted" />
            </div>
          </div>
          <div className="flex h-full shrink-0 flex-col items-end justify-center gap-1">
            <div className="h-2 w-7 rounded bg-muted" />
            <div className="h-4 w-10 rounded bg-muted" />
            <div className="h-3.5 w-12 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CompareFeaturedColumnSkeleton({ label }: { label: string }) {
  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-muted/20">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <span className="inline-flex size-6 items-center justify-center" aria-hidden>
          <span className="size-3.5 animate-pulse rounded bg-muted" />
        </span>
      </div>
      <CompareFeaturedSkeletonList />
    </div>
  );
}

export function HubPolymarketKalshiCompareDemoSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading comparison markets</span>
      <div className="rounded-xl border border-border/70 bg-muted/15 px-4 py-5 sm:px-5 sm:py-6">
        <div className="space-y-3 text-left">
          <div className="space-y-1 text-center">
            <p className="text-sm font-medium text-foreground">
              Find a Polymarket market to compare with Kalshi Live
            </p>
            <p className="text-sm text-muted-foreground">
              Search in plain English, then we&apos;ll match it against Kalshi.
            </p>
          </div>
          <div className="relative mx-auto w-full max-w-2xl">
            <span
              className="pointer-events-none absolute left-3 top-1/2 z-[1] size-4 -translate-y-1/2 rounded-full bg-muted"
              aria-hidden
            />
            <div className="flex h-9 w-full items-center rounded-lg border border-border bg-background py-2 pl-9 pr-3">
              <span className="text-xs text-muted-foreground">
                Search Polymarket markets in plain English…
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
              Or try one of these trending live markets
            </p>
            <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2">
              <CompareFeaturedColumnSkeleton label="Polymarket" />
              <CompareFeaturedColumnSkeleton label="Kalshi" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
