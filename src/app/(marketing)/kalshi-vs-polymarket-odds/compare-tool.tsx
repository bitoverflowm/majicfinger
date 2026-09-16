"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

import { HubPolymarketKalshiCompareDemoSkeleton } from "@/components/hubs/polymarketLiveDemo/HubPolymarketKalshiCompareDemoSkeleton";
import { CompareMarketPrefill } from "./compare-market-prefill";

const HubPolymarketKalshiCompareDemo = dynamic(
  () =>
    import("@/components/hubs/polymarketLiveDemo/HubPolymarketKalshiCompareDemo").then(
      (m) => m.HubPolymarketKalshiCompareDemo,
    ),
  {
    ssr: false,
    loading: () => <HubPolymarketKalshiCompareDemoSkeleton />,
  },
);

export function KalshiVsPolymarketCompareTool() {
  return (
    <>
      <Suspense fallback={null}>
        <CompareMarketPrefill />
      </Suspense>
      <noscript>
        <p className="mx-auto max-w-2xl text-center text-sm leading-relaxed text-muted-foreground">
          Search a Polymarket or Kalshi market, review scored matches on the other venue, reverse YES/NO if needed,
          then compare live odds, charts, and trading activity. JavaScript is required to load the live comparison.
        </p>
      </noscript>
      <HubPolymarketKalshiCompareDemo />
    </>
  );
}
