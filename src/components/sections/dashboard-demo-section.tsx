/* eslint-disable react/no-unescaped-entities */
"use client";

import { StateProvider } from "@/context/stateContext";
import { StateProviderV2 } from "@/context/stateContextV2";

import DashBody from "@/app/dashboard/dashBody";
import LiveStreamManager from "@/app/dashboard/components/liveStreamManager";

export function DashboardDemoSection() {
  return (
    <section id="demo" className="relative mt-10 px-8 sm:px-10">
      <div className="relative size-full shadow-xl rounded-2xl overflow-hidden border border-border bg-background">
        <StateProvider>
          <StateProviderV2
            initialSettings={{
              demo: true,
              viewing: "charts",
              rightPanelOpen: true,
              rightPanelTab: "integrations",
              integrationSidebar: "polymarket",
            }}
          >
            <LiveStreamManager />
            <div className="h-[80vh] min-h-[680px] w-full">
              <DashBody user={null} />
            </div>
          </StateProviderV2>
        </StateProvider>
      </div>
    </section>
  );
}

