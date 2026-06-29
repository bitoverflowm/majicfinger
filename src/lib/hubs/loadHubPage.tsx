import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { HubPage } from "@/components/hubs/HubPage";
import { getHubBySlug } from "@/config/hubs";
import { enrichHubConfig } from "@/lib/hubs/enrichHubConfig";
import { buildHubMetadata } from "@/lib/hubs/metadata";
import { queryHubPublishedAssets } from "@/lib/hubs/queryPublishedAssets";
import { fetchPublicChartPayload } from "@/lib/server/fetchPublicChartPayload";
import type { HubPublishedAssets } from "@/types/hub";

/** Hub assets come from Mongo at request time — avoid blocking static generation at build. */
export const hubPageDynamic = "force-dynamic" as const;

const EMPTY_ASSETS: HubPublishedAssets = { charts: [], dashboards: [] };

async function loadHubAssets(slug: string): Promise<HubPublishedAssets> {
  const config = getHubBySlug(slug);
  if (!config?.assetFilter) return EMPTY_ASSETS;

  try {
    return await queryHubPublishedAssets(config.assetFilter);
  } catch (err) {
    console.error(`[${slug}] asset query failed:`, err);
    return EMPTY_ASSETS;
  }
}

export function createHubMetadata(slug: string): Metadata | Record<string, never> {
  const config = getHubBySlug(slug);
  if (!config) return {};
  return buildHubMetadata(config);
}

export async function renderHubPage(slug: string) {
  const config = getHubBySlug(slug);
  if (!config) notFound();

  const enriched = enrichHubConfig(config);
  const heroSection = enriched.sections.find((section) => section.type === "hero");
  const heroChart =
    heroSection?.type === "hero" ? heroSection.heroChart : undefined;

  const [assets, heroChartPayload] = await Promise.all([
    loadHubAssets(slug),
    heroChart
      ? fetchPublicChartPayload(heroChart.username, heroChart.slug)
      : Promise.resolve(null),
  ]);

  return (
    <HubPage
      config={enriched}
      assets={assets}
      heroChartPayload={heroChartPayload}
    />
  );
}
