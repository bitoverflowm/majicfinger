import {
  getMarketingIntegrationById,
  getPlaceholderIntegrationHubSlugs,
  type MarketingIntegrationEntry,
} from "@/lib/integrations/marketing-catalog";

export function getAllIntegrationHubSlugs(): string[] {
  return getPlaceholderIntegrationHubSlugs();
}

export function getIntegrationHubPage(
  slug: string,
): MarketingIntegrationEntry | null {
  return getMarketingIntegrationById(slug);
}
