import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { HubPage } from "@/components/hubs/HubPage";
import { getHubBySlug } from "@/config/hubs";
import { enrichHubConfig } from "@/lib/hubs/enrichHubConfig";
import { buildHubMetadata } from "@/lib/hubs/metadata";
import { queryHubPublishedAssets } from "@/lib/hubs/queryPublishedAssets";
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

  const assets = await loadHubAssets(slug);
  return <HubPage config={enrichHubConfig(config)} assets={assets} />;
}
