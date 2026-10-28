import { Fragment, Suspense } from "react";
import { NewsletterInline } from "@/components/newsletter/newsletter-signup";
import { FooterSection } from "@/components/sections/footer-section";
import { HubAssetSection } from "@/components/hubs/HubAssetSection";
import { HubAssetSectionSkeleton } from "@/components/hubs/HubAssetSectionSkeleton";
import { HubHashScrollManager } from "@/components/hubs/HubHashScrollManager";
import { HubSectionRenderer } from "@/components/hubs/HubSections";
import { HubPolymarketLiveDemoProvider } from "@/components/hubs/polymarketLiveDemo/HubPolymarketLiveDemoSelection";
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

function HubPageSections({ config, slug }: HubPageProps) {
  const newsletterAfter = Math.max(0, Math.floor(config.sections.length / 2) - 1);
  return (
    <>
      {config.sections.map((section, index) => {
        const rendered = isHubAssetSection(section) ? (
          <Suspense fallback={<HubAssetSectionSkeleton section={section} />}>
            <HubAssetSection slug={slug} section={section} index={index} />
          </Suspense>
        ) : (
          <HubSectionRenderer section={section} assets={EMPTY_HUB_ASSETS} index={index} />
        );

        return (
          <Fragment key={`${section.type}-${index}`}>
            {rendered}
            {index === newsletterAfter ? <NewsletterInline band /> : null}
          </Fragment>
        );
      })}
    </>
  );
}

export function HubPage({ config, slug }: HubPageProps) {
  const { webPage, breadcrumb, faqPage, softwareApplication, dataset } = buildHubJsonLd(config);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {softwareApplication ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplication) }}
        />
      ) : null}
      {dataset ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(dataset) }}
        />
      ) : null}
      {faqPage ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }}
        />
      ) : null}

      <HubHashScrollManager />

      <main className="flex min-h-screen w-full flex-col items-stretch overflow-x-visible bg-background font-sans antialiased theme-landing scroll-smooth">
        {config.id === "polymarket-live" ||
        config.id === "polymarket-historical" ||
        config.id === "kalshi-live" ||
        config.id === "kalshi-historical" ? (
          <HubPolymarketLiveDemoProvider>
            <HubPageSections config={config} slug={slug} />
          </HubPolymarketLiveDemoProvider>
        ) : (
          <HubPageSections config={config} slug={slug} />
        )}
        <FooterSection />
      </main>
    </>
  );
}
