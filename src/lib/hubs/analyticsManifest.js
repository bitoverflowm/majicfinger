import { INTEGRATION_HUBS } from "@/lib/content/taxonomy";

const HUB_PATHS = Object.values(INTEGRATION_HUBS).map((hub) => {
  const path = hub.href;
  return {
    slug: path.replace(/^\//, ""),
    name: hub.label,
    path,
  };
});

/** @param {string} pathname */
export function resolveHubAnalyticsFromPath(pathname) {
  const normalized = String(pathname || "").replace(/\/+$/, "") || "/";
  const match = HUB_PATHS.find((hub) => normalized === hub.path);
  if (!match) return null;

  return {
    pageType: "hub",
    slug: match.slug,
    name: match.name,
    path: match.path,
  };
}

/** Lightweight list for client-side path matching. */
export function getHubPathPrefixes() {
  return HUB_PATHS.map((hub) => hub.path);
}
