"use client";

import { useState } from "react";

import { HubKalshiLiveDemoMockup } from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveDemoMockup";
import {
  HubKalshiLiveDemoTabs,
  type HubKalshiLiveDemoTabDef,
} from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveDemoTabs";
import { cn } from "@/lib/utils";

export type HubKalshiLiveBonusFeatureId =
  | "event_forecasts"
  | "batch_event_candlesticks"
  | "leaderboards";

const BONUS_TABS: HubKalshiLiveDemoTabDef[] = [
  {
    id: "event_forecasts",
    title: "Event Forecasts",
    description:
      "Explore event-level forecast percentile history and how market expectations shift over time.",
  },
  {
    id: "batch_event_candlesticks",
    title: "Batch Event candlesticks",
    description:
      "Pull candlestick history across an event’s markets in one batch for comparison and charting.",
  },
  {
    id: "leaderboards",
    title: "Leaderboards",
    description:
      "Browse Kalshi leaderboard standings and trader performance metrics from the live exchange.",
  },
];

type HubKalshiLiveBonusFeaturesProps = {
  className?: string;
};

/**
 * Placeholder tabbed playground for Kalshi Live bonus endpoints.
 * Panels are stubs for now — wired like the main live demo rail.
 */
export function HubKalshiLiveBonusFeatures({
  className,
}: HubKalshiLiveBonusFeaturesProps) {
  const [activeId, setActiveId] =
    useState<HubKalshiLiveBonusFeatureId>("event_forecasts");

  const activeTab =
    BONUS_TABS.find((tab) => tab.id === activeId) || BONUS_TABS[0]!;

  return (
    <div className={cn("w-full", className)}>
      <HubKalshiLiveDemoMockup>
        <div className="flex w-full flex-col gap-4 px-4 py-6 sm:gap-5 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Bonus features · placeholders
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-5 py-8 lg:grid-cols-5 lg:gap-6 lg:items-stretch">
            <div className="lg:col-span-1">
              <HubKalshiLiveDemoTabs
                tabs={BONUS_TABS}
                activeId={activeId}
                onChange={(id) =>
                  setActiveId(id as HubKalshiLiveBonusFeatureId)
                }
              />
            </div>

            <div
              className="flex min-h-0 min-w-0 flex-col lg:col-span-4"
              role="tabpanel"
            >
              <div className="flex min-h-[22rem] flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-6 py-16 text-center">
                <p className="text-sm font-medium text-foreground">
                  {activeTab.title}
                </p>
                <p className="max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
                  {activeTab.description}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  UI placeholder for now — endpoint pull comes next.
                </p>
              </div>
            </div>
          </div>
        </div>
      </HubKalshiLiveDemoMockup>
    </div>
  );
}
