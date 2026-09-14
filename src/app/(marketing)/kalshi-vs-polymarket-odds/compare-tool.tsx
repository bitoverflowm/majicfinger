"use client";

import dynamic from "next/dynamic";

import { HubPolymarketLiveDemoProvider } from "@/components/hubs/polymarketLiveDemo/HubPolymarketLiveDemoSelection";

const HubPolymarketKalshiCompareDemo = dynamic(
  () =>
    import("@/components/hubs/polymarketLiveDemo/HubPolymarketKalshiCompareDemo").then(
      (m) => m.HubPolymarketKalshiCompareDemo,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[28rem] w-full animate-pulse rounded-xl bg-muted/40 ring-1 ring-border/50" />
    ),
  },
);

export function KalshiVsPolymarketCompareTool() {
  return (
    <HubPolymarketLiveDemoProvider>
      <HubPolymarketKalshiCompareDemo />
    </HubPolymarketLiveDemoProvider>
  );
}
