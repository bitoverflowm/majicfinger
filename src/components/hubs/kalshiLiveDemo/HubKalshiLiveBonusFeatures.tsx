"use client";

import { useEffect, useState } from "react";

import { HubKalshiLiveBonusBatchCandlesticks } from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveBonusBatchCandlesticks";
import { HubKalshiLiveBonusEventForecasts } from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveBonusEventForecasts";
import { HubKalshiLiveBonusLeaderboards } from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveBonusLeaderboards";
import { HubKalshiLiveDemoMockup } from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveDemoMockup";
import {
  HubKalshiLiveDemoTabs,
  type HubKalshiLiveDemoTabDef,
} from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveDemoTabs";
import {
  HUB_KALSHI_BONUS_TAB_EVENT,
  HUB_KALSHI_BONUS_TAB_STORAGE_KEY,
  type HubKalshiLiveBonusFeatureId,
} from "@/components/hubs/kalshiLiveDemo/bonusFeaturesNav";
import { cn } from "@/lib/utils";

const BONUS_TABS: HubKalshiLiveDemoTabDef[] = [
  {
    id: "event_forecasts",
    title: "Event Forecasts",
    description:
      "Explore event-level forecast percentile history and how market expectations shift over time.",
  },
  {
    id: "leaderboards",
    title: "Leaderboards",
    description:
      "Browse Kalshi leaderboard standings and trader performance metrics from the live exchange.",
  },
  {
    id: "batch_candlesticks",
    title: "Batch Candlesticks",
    description:
      "Search an event and instantly preview a multi-market candlestick dashboard — no code, no signup, no nonsense.",
  },
];

const LIVE_BONUS_TABS = new Set<HubKalshiLiveBonusFeatureId>([
  "event_forecasts",
  "leaderboards",
  "batch_candlesticks",
]);

const BONUS_IDS = new Set(BONUS_TABS.map((t) => t.id));

function isBonusFeatureId(id: string): id is HubKalshiLiveBonusFeatureId {
  return BONUS_IDS.has(id);
}

type HubKalshiLiveBonusFeaturesProps = {
  className?: string;
};

/**
 * Tabbed playground for Kalshi Live bonus endpoints.
 * Event Forecasts, Leaderboards, and Batch Candlesticks are live demos.
 */
export function HubKalshiLiveBonusFeatures({
  className,
}: HubKalshiLiveBonusFeaturesProps) {
  const [activeId, setActiveId] =
    useState<HubKalshiLiveBonusFeatureId>("event_forecasts");

  useEffect(() => {
    const apply = (raw: string | null | undefined) => {
      if (!raw || !isBonusFeatureId(raw)) return;
      setActiveId(raw);
    };

    try {
      apply(sessionStorage.getItem(HUB_KALSHI_BONUS_TAB_STORAGE_KEY));
    } catch {
      // ignore
    }

    const onNavigate = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      apply(detail);
    };
    window.addEventListener(HUB_KALSHI_BONUS_TAB_EVENT, onNavigate);
    return () => {
      window.removeEventListener(HUB_KALSHI_BONUS_TAB_EVENT, onNavigate);
    };
  }, []);

  const isLive = LIVE_BONUS_TABS.has(activeId);

  return (
    <div className={cn("w-full", className)}>
      <HubKalshiLiveDemoMockup>
        <div className="flex w-full flex-col gap-4 px-4 py-6 sm:gap-5 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Bonus features
              {isLive ? " · live preview" : " · placeholders"}
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-5 py-8 lg:grid-cols-5 lg:gap-6 lg:items-stretch">
            <div className="lg:col-span-1">
              <HubKalshiLiveDemoTabs
                tabs={BONUS_TABS}
                activeId={activeId}
                contentLoading={false}
                onChange={(id) => {
                  if (isBonusFeatureId(id)) setActiveId(id);
                }}
              />
            </div>

            <div
              className="flex min-h-0 min-w-0 flex-col lg:col-span-4"
              role="tabpanel"
            >
              {activeId === "event_forecasts" ? (
                <HubKalshiLiveBonusEventForecasts className="px-2 sm:px-4 lg:px-6" />
              ) : activeId === "leaderboards" ? (
                <HubKalshiLiveBonusLeaderboards className="px-2 sm:px-4 lg:px-6" />
              ) : (
                <HubKalshiLiveBonusBatchCandlesticks className="px-2 sm:px-4 lg:px-6" />
              )}
            </div>
          </div>
        </div>
      </HubKalshiLiveDemoMockup>
    </div>
  );
}
