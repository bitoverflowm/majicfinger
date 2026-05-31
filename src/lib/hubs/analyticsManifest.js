import { getAllHubSlugs, getHubBySlug } from "@/config/hubs";

/** @param {string} pathname */
export function resolveHubAnalyticsFromPath(pathname) {
  const slug = String(pathname || "")
    .replace(/\/+$/, "")
    .split("/")
    .filter(Boolean)
    .pop();
  if (!slug) return null;

  const hub = getHubBySlug(slug);
  if (!hub) return null;

  const hero = hub.sections?.find((s) => s.type === "hero");
  const displayName =
    (hero && hero.type === "hero" ? hero.title : null) ||
    hub.title?.split("|")[0]?.trim() ||
    slug;

  return {
    pageType: "hub",
    slug: hub.slug,
    name: displayName,
    path: `/${hub.slug}`,
  };
}

/** Lightweight list for client-side path matching. */
export function getHubPathPrefixes() {
  return getAllHubSlugs().map((slug) => `/${slug}`);
}
