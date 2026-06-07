import { getAllHubSlugs, getHubBySlug } from "@/config/hubs";

export type DashboardCluster = {
  slug: string;
  title: string;
  href: string;
};

const TAG_CLUSTER_RULES: Array<{ match: string[]; hubSlug: string }> = [
  { match: ["kalshi", "prediction market"], hubSlug: "kalshi-historical-data" },
  { match: ["polymarket"], hubSlug: "kalshi-historical-data" },
  { match: ["weather"], hubSlug: "kalshi-historical-data" },
  { match: ["volume"], hubSlug: "kalshi-historical-data" },
];

/**
 * Resolve the best-matching content cluster (hub page) for a dashboard's tags.
 */
export function resolveClusterForTags(tags: string[] | undefined | null): DashboardCluster | null {
  const normalized = (tags || []).map((t) => String(t || "").trim().toLowerCase()).filter(Boolean);
  if (!normalized.length) return null;

  for (const rule of TAG_CLUSTER_RULES) {
    const hit = rule.match.some((keyword) =>
      normalized.some((tag) => tag.includes(keyword) || keyword.includes(tag)),
    );
    if (!hit) continue;
    const hub = getHubBySlug(rule.hubSlug);
    if (!hub) continue;
    return {
      slug: hub.slug,
      title: hub.title.split("|")[0]?.trim() || hub.title,
      href: `/${hub.slug.replace(/^\//, "")}`,
    };
  }

  const firstHubSlug = getAllHubSlugs()[0];
  if (!firstHubSlug) return null;
  const hub = getHubBySlug(firstHubSlug);
  if (!hub) return null;
  return {
    slug: hub.slug,
    title: hub.title.split("|")[0]?.trim() || hub.title,
    href: `/${hub.slug.replace(/^\//, "")}`,
  };
}
