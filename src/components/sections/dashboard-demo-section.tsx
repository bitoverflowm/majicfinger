/* eslint-disable react/no-unescaped-entities */
"use client";

import { StateProvider } from "@/context/stateContext";
import { StateProviderV2 } from "@/context/stateContextV2";

import DashBody from "@/app/dashboard/dashBody";
import LiveStreamManager from "@/app/dashboard/components/liveStreamManager";

export function DashboardDemoSection() {
  return (
    <section id="demo" className="relative z-10 px-8 pb-14 pt-0 sm:px-10 lg:px-14">
      <div className="relative size-full overflow-hidden overscroll-none rounded-2xl border border-border bg-background shadow-xl">
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

