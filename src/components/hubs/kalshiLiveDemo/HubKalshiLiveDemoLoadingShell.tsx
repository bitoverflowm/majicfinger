"use client";

import { Loader2 } from "lucide-react";

import { HubKalshiLiveDemoMockup } from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveDemoMockup";
import { cn } from "@/lib/utils";

const SHELL_TABS = [
  {
    id: "search",
    title: "Search",
    description:
      "The best search capabilities available anywhere for Markets, Events and Series",
    open: true,
  },
  { id: "metadata", title: "Market metadata", open: false },
  { id: "trades", title: "Trades", open: false },
  { id: "orderbook", title: "Orderbook", open: false },
  { id: "candlesticks", title: "Candlesticks", open: false },
  { id: "event_forecasts", title: "Event forecast", open: false, separatorBefore: true },
  { id: "leaderboards", title: "Leaderboards", open: false },
  { id: "batch_candlesticks", title: "Batch Candlesticks", open: false },
] as const;

const FEATURED_SKELETON_COUNT = 5;

function FeaturedMarketListSkeleton({ count = FEATURED_SKELETON_COUNT }: { count?: number }) {
  return (
    <div className="space-y-2 p-3" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex animate-pulse gap-3 rounded-xl border border-border/60 bg-background/80 p-3"
        >
          <div className="size-12 shrink-0 rounded-lg bg-muted" />
          <div className="min-w-0 flex-1 space-y-2 py-0.5">
            <div className="h-3.5 w-3/4 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
            <div className="h-3 w-2/5 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

type HubKalshiLiveDemoLoadingShellProps = {
  className?: string;
  /** When true, show Loading… in the featured header (chunk / data pending). */
  showFeaturedSpinner?: boolean;
};

/**
 * Instant-looking demo chrome for lazy/dynamic load: tabs + search stay visible,
 * while highest-volume markets use a skeleton until the real demo mounts.
 */
export function HubKalshiLiveDemoLoadingShell({
  className,
  showFeaturedSpinner = true,
}: HubKalshiLiveDemoLoadingShellProps) {
  return (
    <div className={cn("w-full", className)} aria-busy="true" aria-live="polite">
      <HubKalshiLiveDemoMockup>
        <div className="flex w-full flex-col gap-4 px-4 py-6 sm:gap-5 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Live demo · up to 2 markets
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-5 py-12 lg:grid-cols-5 lg:gap-6 lg:items-stretch">
            <div className="lg:col-span-1">
              <div className="flex w-full flex-col gap-2 lg:gap-2.5" role="presentation">
                {SHELL_TABS.map((tab) => (
                  <div key={tab.id} className="w-full">
                    {tab.separatorBefore ? (
                      <div
                        className="mb-2 mt-1 border-t border-border/60 pt-2"
                        aria-hidden
                      />
                    ) : null}
                    <div
                      className={cn(
                        "relative w-full overflow-hidden rounded-md text-left",
                        tab.open
                          ? "bg-white shadow-[0px_0px_1px_0px_rgba(0,0,0,0.16),0px_1px_2px_-0.5px_rgba(0,0,0,0.16)] dark:bg-[#27272A] dark:shadow-[0px_0px_0px_1px_rgba(249,250,251,0.06),0px_0px_0px_1px_var(--color-zinc-800,#27272A),0px_1px_2px_-0.5px_rgba(0,0,0,0.24),0px_2px_4px_-1px_rgba(0,0,0,0.24)]"
                          : "rounded-none opacity-45",
                      )}
                    >
                      <div className="px-2.5 py-2">
                        <p className="text-xs font-semibold tracking-tight text-foreground sm:text-[13px]">
                          {tab.title}
                        </p>
                        {tab.open && "description" in tab && tab.description ? (
                          <p className="mt-1 text-[11px] font-medium leading-snug text-muted-foreground text-pretty">
                            {tab.description}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex min-h-0 min-w-0 flex-col lg:col-span-4">
              <div className="flex w-full flex-col gap-4 px-2 sm:px-4 lg:px-6">
                <div className="flex h-11 w-full items-center gap-2 rounded-xl border border-border/70 bg-background px-3 text-sm text-muted-foreground">
                  <span className="size-4 shrink-0 rounded-full bg-muted" aria-hidden />
                  <span className="truncate">
                    Start typing to search for anything on Kalshi here
                  </span>
                </div>

                <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                  If you don&apos;t know your ticker, search anything and suggestions
                  will populate — or click on any of the following markets as a
                  starting point
                </p>

                <div className="min-h-[12rem] overflow-hidden rounded-xl border border-border/70 bg-muted/20">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Highest volume live markets
                    </p>
                    {showFeaturedSpinner ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Loader2 className="size-3.5 animate-spin" aria-hidden />
                        Loading…
                      </span>
                    ) : null}
                  </div>
                  <FeaturedMarketListSkeleton />
                </div>
              </div>
            </div>
          </div>
        </div>
      </HubKalshiLiveDemoMockup>
    </div>
  );
}

export { FeaturedMarketListSkeleton };
