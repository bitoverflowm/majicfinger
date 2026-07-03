import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { HubPage } from "@/components/hubs/HubPage";
import { getHubBySlug } from "@/config/hubs";
import { enrichHubConfig } from "@/lib/hubs/enrichHubConfig";
import { buildHubMetadata } from "@/lib/hubs/metadata";
import { queryHubPublishedAssets } from "@/lib/hubs/queryPublishedAssets";
import type { HubPublishedAssets } from "@/types/hub";

/** ISR — hub text/metadata can cache; asset sections stream in via Suspense. */
export const hubPageRevalidate = 300;

export const EMPTY_HUB_ASSETS: HubPublishedAssets = { charts: [], dashboards: [] };

async function loadHubAssets(slug: string): Promise<HubPublishedAssets> {
  const config = getHubBySlug(slug);
  if (!config?.assetFilter) return EMPTY_HUB_ASSETS;

  try {
    return await queryHubPublishedAssets(config.assetFilter);
  } catch (err) {
    console.error(`[${slug}] asset query failed:`, err);
    return EMPTY_HUB_ASSETS;
  }
}

/** Deduped per-request asset fetch for Suspense asset sections. */
export const getHubAssets = cache(loadHubAssets);

export function createHubMetadata(slug: string): Metadata | Record<string, never> {
  const config = getHubBySlug(slug);
  if (!config) return {};
  return buildHubMetadata(config);
}

export async function renderHubPage(slug: string) {
  const config = getHubBySlug(slug);
  if (!config) notFound();

  const enriched = enrichHubConfig(config);

  return <HubPage config={enriched} slug={slug} />;
}
