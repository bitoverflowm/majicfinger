import { INTEGRATION_HUBS } from "@/lib/content/taxonomy";

const HUB_PATHS = Object.values(INTEGRATION_HUBS).map((hub) => {
  const path = hub.href;
  return {
    slug: path.replace(/^\//, ""),
    name: hub.label,
    path,
  };
});

/** Standalone marketing pages outside INTEGRATION_HUBS. */
const MARKETING_PAGES = [
  { path: "/polymarket-metadata", name: "Polymarket Metadata Lookup" },
  { path: "/dashboards-gallery", name: "Dashboards Gallery" },
  { path: "/csv-exports", name: "CSV Exports" },
  { path: "/quant-analysis", name: "Quant Analysis" },
  { path: "/data-sheet", name: "Data Sheet" },
  { path: "/guides", name: "Guides index" },
];

const ALL_MARKETING_PATHS = [...HUB_PATHS, ...MARKETING_PAGES];

/** @param {string} pathname */
export function resolveHubAnalyticsFromPath(pathname) {
  const normalized = String(pathname || "").replace(/\/+$/, "") || "/";
  const match = ALL_MARKETING_PATHS.find((hub) => normalized === hub.path);
  if (match) {
    return {
      pageType: "hub",
      slug: match.slug || match.path.replace(/^\//, ""),
      name: match.name,
      path: match.path,
    };
  }

  if (normalized.startsWith("/integrations/")) {
    const slug = normalized.slice("/integrations/".length);
    if (slug) {
      return {
        pageType: "hub",
        slug,
        name: `Integration: ${slug}`,
        path: normalized,
      };
    }
  }

  return null;
}

/** Lightweight list for client-side path matching. */
export function getHubPathPrefixes() {
  return ALL_MARKETING_PATHS.map((hub) => hub.path);
}
