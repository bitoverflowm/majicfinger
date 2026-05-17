/* eslint-disable react/no-unescaped-entities */
"use client";

import { StateProvider } from "@/context/stateContext";
import { StateProviderV2 } from "@/context/stateContextV2";

import DashBody from "@/app/dashboard/dashBody";
import LiveStreamManager from "@/app/dashboard/components/liveStreamManager";

export function DashboardDemoSection() {
  return (
    <section
      id="demo"
      className="relative z-30 mx-auto mb-10 w-full max-w-[min(100%,84rem)] -mt-8 px-6 pb-14 pt-0 sm:-mt-10 sm:px-8 md:-mt-12 lg:-mt-14 lg:px-10"
    >
      <div className="relative isolate size-full overflow-hidden overscroll-none rounded-2xl border border-border bg-background shadow-xl ring-1 ring-border/60">
        <StateProvider>
          <StateProviderV2
            initialSettings={{
              demo: true,
              viewing: "connectDataHome",
              rightPanelOpen: false,
              rightPanelTab: "integrations",
              integrationSidebar: null,
            }}
          >
            <LiveStreamManager />
            <div className="flex h-[min(90vh,920px)] min-h-[720px] w-full flex-col overflow-hidden">
              <DashBody user={null} />
            </div>
          </StateProviderV2>
        </StateProvider>
      </div>
    </section>
  );
}

