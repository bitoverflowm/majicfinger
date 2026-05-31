import { kalshiHistoricalHub } from "./kalshiHistorical";
import type { HubPageConfig } from "@/types/hub";

/** Registry of all hub pages keyed by URL slug. */
export const HUB_REGISTRY: Record<string, HubPageConfig> = {
  [kalshiHistoricalHub.slug]: kalshiHistoricalHub,
};

export function getHubBySlug(slug: string): HubPageConfig | null {
  return HUB_REGISTRY[slug] ?? null;
}

export function getAllHubSlugs(): string[] {
  return Object.keys(HUB_REGISTRY);
}
