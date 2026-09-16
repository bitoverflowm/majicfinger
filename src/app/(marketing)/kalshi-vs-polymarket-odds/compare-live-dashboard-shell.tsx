"use client";

import type { ReactNode } from "react";

import { HubPolymarketLiveDemoProvider } from "@/components/hubs/polymarketLiveDemo/HubPolymarketLiveDemoSelection";
import { CompareLiveDashboardPopout } from "@/components/hubs/polymarketLiveDemo/compareLiveDashboard/CompareLiveDashboardPopout";
import { CompareLiveDashboardProvider } from "@/components/hubs/polymarketLiveDemo/compareLiveDashboard/CompareLiveDashboardContext";

export function CompareLiveDashboardShell({ children }: { children: ReactNode }) {
  return (
    <HubPolymarketLiveDemoProvider>
      <CompareLiveDashboardProvider>
        {children}
        <CompareLiveDashboardPopout />
      </CompareLiveDashboardProvider>
    </HubPolymarketLiveDemoProvider>
  );
}
