import { FooterSection } from "@/components/sections/footer-section";
import { HubSectionRenderer } from "@/components/hubs/HubSections";
import { buildHubJsonLd } from "@/lib/hubs/metadata";
import type { HubPageConfig, HubPublishedAssets } from "@/types/hub";

type HubPageProps = {
  config: HubPageConfig;
  assets: HubPublishedAssets;
};

export function HubPage({ config, assets }: HubPageProps) {
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

      <main className="flex min-h-screen w-full flex-col items-stretch overflow-x-visible bg-background font-sans antialiased theme-landing scroll-smooth">
        {config.sections.map((section, index) => (
          <HubSectionRenderer
            key={`${section.type}-${index}`}
            section={section}
            assets={assets}
            index={index}
          />
        ))}
        <FooterSection />
      </main>
    </>
  );
}
