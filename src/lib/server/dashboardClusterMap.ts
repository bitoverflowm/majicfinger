import { getHubBySlug } from "@/config/hubs";
import { INTEGRATION_HUBS, type IntegrationHub } from "@/lib/content/taxonomy";
import { hubSlugFromTags } from "@/lib/dashboardHubTags";

export type DashboardCluster = {
  slug: string;
  title: string;
  href: string;
};

export function clusterForHubSlug(hubSlug: string | null | undefined): DashboardCluster | null {
  if (!hubSlug) return null;
  const hub = getHubBySlug(hubSlug);
  if (!hub) return null;
  const label = INTEGRATION_HUBS[hub.id as IntegrationHub]?.label;
  return {
    slug: hub.slug,
    title: label ? `${label} Data` : hub.title.split("|")[0]?.trim() || hub.title,
    href: `/${hub.slug.replace(/^\//, "")}`,
  };
}

/**
 * Content cluster (hub page) from tags alone. Prefer the provenance-based hub
 * (resolveDashboardSourceHub); tags are only a fallback and may return null.
 */
export function resolveClusterForTags(tags: string[] | undefined | null): DashboardCluster | null {
  return clusterForHubSlug(hubSlugFromTags(tags || []));
}
