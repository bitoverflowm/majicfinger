import { HUB_REGISTRY } from "@/config/hubs";
import {
  getLycheeContentNavData,
  type LycheeContentNavSection,
  type LycheeContentNavTopic,
} from "@/lib/content/lychee-content-nav";
import {
  type IntegrationHub,
} from "@/lib/content/taxonomy";
import type { HubPageConfig } from "@/types/hub";

export type ProductsNavLink = {
  label: string;
  href: string;
};

export type ProductsNavBucket = {
  id: string;
  label: string;
  items: ProductsNavLink[];
};

export type ProductsNavTopic = {
  id: string;
  label: string;
  buckets: ProductsNavBucket[];
};

export type ProductsNavHub = {
  id: string;
  label: string;
  href: string;
  topics: ProductsNavTopic[];
  charts: ProductsNavLink[];
};

export type ProductsNavProduct = {
  id: string;
  label: string;
  href: string;
  description: string;
};

export type ProductsNavData = {
  integrations: ProductsNavHub[];
  products: ProductsNavProduct[];
};

const INTEGRATION_HUB_IDS = new Set<IntegrationHub>([
  "kalshi-historical",
  "kalshi-live",
  "polymarket-historical",
  "polymarket-live",
]);

function slugToTitle(slug: string): string {
  return String(slug || "")
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getHubConfigById(hubId: string): HubPageConfig | null {
  return (
    Object.values(HUB_REGISTRY).find((config) => config.id === hubId) ?? null
  );
}

function buildHubCharts(hubId: string): ProductsNavLink[] {
  const config = getHubConfigById(hubId);
  const chartSlugs = config?.assetFilter?.chartSlugs;
  if (!chartSlugs?.length) return [];

  return chartSlugs.map(({ username, slug }) => ({
    label: slugToTitle(slug),
    href: `/${username}/charts/${slug}`,
  }));
}

function sectionToHub(section: LycheeContentNavSection): ProductsNavHub | null {
  if (!section.hubHref || !section.topics?.length) return null;

  return {
    id: section.id,
    label: section.label,
    href: section.hubHref,
    topics: section.topics.map((topic: LycheeContentNavTopic) => ({
      id: topic.id,
      label: topic.label,
      buckets: topic.buckets.map((bucket) => ({
        id: bucket.id,
        label: bucket.label,
        items: bucket.items.map((item) => ({
          label: item.label,
          href: item.href,
        })),
      })),
    })),
    charts: buildHubCharts(section.id),
  };
}

/** Server-side Products mega-menu tree (Integrations + product links). */
export function getProductsNavData(): ProductsNavData {
  const navData = getLycheeContentNavData();

  const integrations = navData.sections
    .filter((section) => INTEGRATION_HUB_IDS.has(section.id as IntegrationHub))
    .map(sectionToHub)
    .filter((hub): hub is ProductsNavHub => hub !== null);

  return {
    integrations,
    products: [
      {
        id: "charts",
        label: "Charts",
        href: "/charts",
        description: "Build and publish interactive charts on prediction market data.",
      },
      {
        id: "dashboards",
        label: "Dashboards",
        href: "/dashboards-gallery",
        description: "Browse published dashboards and narrative data stories.",
      },
      {
        id: "data-sheet",
        label: "Data sheet",
        href: "/data-sheet",
        description: "Spreadsheet-style exploration for connected datasets.",
      },
      {
        id: "csv-exports",
        label: "CSV exports",
        href: "/csv-exports",
        description: "Download historical and live data as CSV.",
      },
      {
        id: "quant-analysis",
        label: "Quant Analysis",
        href: "/quant-analysis",
        description: "Run quantitative workflows on market and reference data.",
      },
    ],
  };
}
