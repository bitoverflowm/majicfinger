import { HubSectionRenderer } from "@/components/hubs/HubSections";
import { getHubAssets } from "@/lib/hubs/loadHubPage";
import type { HubPublishedChartsSection, HubPublishedDashboardsSection } from "@/types/hub";

type HubAssetSectionProps = {
  slug: string;
  section: HubPublishedChartsSection | HubPublishedDashboardsSection;
  index: number;
};

/** Async server section — loads published chart/dashboard assets without blocking the page shell. */
export async function HubAssetSection({ slug, section, index }: HubAssetSectionProps) {
  const assets = await getHubAssets(slug);
  return <HubSectionRenderer section={section} assets={assets} index={index} />;
}
