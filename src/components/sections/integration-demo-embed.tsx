"use client";

import { HubLazyWhenVisible } from "@/components/hubs/HubLazyWhenVisible";
import { EMBEDDED_DEMO_SECTION_CLASS } from "@/components/sections/dashboard-demo-layout";
import { DashboardDemoSectionLazy, DashboardDemoSkeleton } from "@/components/sections/dashboard-demo-section-lazy";

type IntegrationDemoEmbedProps = {
  /** Picker id: `kalshiHistorical`, `kalshiLive`, `polymarketHistorical`, `polymarket` (live), … */
  integrationId: string;
  sectionId: string;
};

/**
 * The homepage demo for guide and hub pages, opened on one integration's build step.
 * The dashboard bundle only loads once the slot nears the viewport.
 */
export function IntegrationDemoEmbed({ integrationId, sectionId }: IntegrationDemoEmbedProps) {
  return (
    <HubLazyWhenVisible
      fallback={<DashboardDemoSkeleton sectionId={sectionId} className={EMBEDDED_DEMO_SECTION_CLASS} />}
    >
      <DashboardDemoSectionLazy
        integrationId={integrationId}
        sectionId={sectionId}
        className={EMBEDDED_DEMO_SECTION_CLASS}
      />
    </HubLazyWhenVisible>
  );
}
