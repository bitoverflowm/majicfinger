/* eslint-disable react/no-unescaped-entities */
"use client";

import { StateProvider } from "@/context/stateContext";
import { StateProviderV2 } from "@/context/stateContextV2";

import DashBody from "@/app/dashboard/dashBody";
import LiveStreamManager from "@/app/dashboard/components/liveStreamManager";
import { DemoWindowMockup } from "@/components/sections/demo-window-mockup";

export function DashboardDemoSection() {
  return (
    <section
      id="demo"
      className="relative z-30 mx-auto mb-0 w-full max-w-[min(100%,84rem)] mt-14 px-6 pb-6 pt-0 sm:mt-12 sm:px-8 md:mt-8 lg:mt-6 lg:px-10"
    >
      <DemoWindowMockup
        id="demo-mockup"
        data-demo-mockup
        contentClassName="h-[min(90vh,920px)] min-h-[720px] overflow-hidden"
      >
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
            <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
              <DashBody user={null} />
            </div>
          </StateProviderV2>
        </StateProvider>
      </DemoWindowMockup>
    </section>
  );
}

