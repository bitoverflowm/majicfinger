import { Suspense } from "react";
import { FooterSection } from "@/components/sections/footer-section";
import { HubAssetSection } from "@/components/hubs/HubAssetSection";
import { HubAssetSectionSkeleton } from "@/components/hubs/HubAssetSectionSkeleton";
import { HubHashScrollManager } from "@/components/hubs/HubHashScrollManager";
import { HubSectionRenderer } from "@/components/hubs/HubSections";
import { EMPTY_HUB_ASSETS } from "@/lib/hubs/loadHubPage";
import { buildHubJsonLd } from "@/lib/hubs/metadata";
import type {
  HubPageConfig,
  HubPublishedChartsSection,
  HubPublishedDashboardsSection,
  HubSection,
} from "@/types/hub";

type HubPageProps = {
  config: HubPageConfig;
  slug: string;
};

type HubAssetSectionType = HubPublishedChartsSection | HubPublishedDashboardsSection;

function isHubAssetSection(section: HubSection): section is HubAssetSectionType {
  return section.type === "published_charts" || section.type === "published_dashboards";
}

export function HubPage({ config, slug }: HubPageProps) {
  const { collectionPage, breadcrumb, faqPage } = buildHubJsonLd(config);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPage) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {faqPage ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }}
        />
      ) : null}

      <HubHashScrollManager />

      <main className="flex min-h-screen w-full flex-col items-stretch overflow-x-visible bg-background font-sans antialiased theme-landing scroll-smooth">
        {config.sections.map((section, index) => {
          if (isHubAssetSection(section)) {
            return (
              <Suspense
                key={`${section.type}-${index}`}
                fallback={<HubAssetSectionSkeleton section={section} />}
              >
                <HubAssetSection slug={slug} section={section} index={index} />
              </Suspense>
            );
          }

          return (
            <HubSectionRenderer
              key={`${section.type}-${index}`}
              section={section}
              assets={EMPTY_HUB_ASSETS}
              index={index}
            />
          );
        })}
        <FooterSection />
      </main>
    </>
  );
}
