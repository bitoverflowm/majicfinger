"use client";

import dynamic from "next/dynamic";

import { HubPolymarketKalshiCompareDemoSkeleton } from "@/components/hubs/polymarketLiveDemo/HubPolymarketKalshiCompareDemoSkeleton";

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
  return <HubPolymarketKalshiCompareDemo />;
}
