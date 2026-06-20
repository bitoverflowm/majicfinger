import { HUB_REGISTRY } from "@/config/hubs";
import {
  getLycheeContentNavData,
  type LycheeContentNavSection,
  type LycheeContentNavTopic,
} from "@/lib/content/lychee-content-nav";
import {
  INTEGRATION_HUB_ORDER,
  INTEGRATION_HUBS,
  integrationTopicLabel,
  type IntegrationHub,
} from "@/lib/content/taxonomy";
import {
  MARKETING_INTEGRATIONS,
  PRIMARY_INTEGRATION_HUB_PATHS,
} from "@/lib/integrations/marketing-catalog";
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
  description: string;
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

const PREDICTION_MARKET_HUBS = INTEGRATION_HUB_ORDER.filter(
  (id): id is IntegrationHub =>
    id === "kalshi-historical" ||
    id === "kalshi-live" ||
    id === "polymarket-historical" ||
    id === "polymarket-live",
);

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

function mapSectionTopics(section: LycheeContentNavSection): ProductsNavTopic[] {
  return (section.topics ?? []).map((topic: LycheeContentNavTopic) => ({
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
  }));
}

function buildPredictionMarketHub(
  hubId: IntegrationHub,
  section: LycheeContentNavSection | undefined,
): ProductsNavHub {
  const meta = INTEGRATION_HUBS[hubId];
  const config = getHubConfigById(hubId);
  const catalogEntry = MARKETING_INTEGRATIONS.find(
    (entry) => PRIMARY_INTEGRATION_HUB_PATHS[entry.id] === meta.href,
  );

  return {
    id: hubId,
    label: meta.label,
    href: meta.href,
    description:
      config?.description ??
      catalogEntry?.description ??
      `Explore ${meta.label} guides, dashboards, and charts in Lychee.`,
    topics: section?.topics?.length ? mapSectionTopics(section) : [],
    charts: buildHubCharts(hubId),
  };
}

function buildCatalogHub(entry: {
  id: string;
  label: string;
  href: string;
  description: string;
}): ProductsNavHub {
  return {
    id: entry.id,
    label: entry.label,
    href: entry.href,
    description: entry.description,
    topics: [],
    charts: [],
  };
}

/** Server-side Products mega-menu tree (Integrations + product links). */
export function getProductsNavData(): ProductsNavData {
  const navData = getLycheeContentNavData();
  const sectionById = new Map(
    navData.sections.map((section) => [section.id, section]),
  );

  const predictionMarketIntegrations = PREDICTION_MARKET_HUBS.map((hubId) =>
    buildPredictionMarketHub(hubId, sectionById.get(hubId)),
  );

  const primaryPaths = new Set(Object.values(PRIMARY_INTEGRATION_HUB_PATHS));
  const otherIntegrations = MARKETING_INTEGRATIONS.filter(
    (entry) => !primaryPaths.has(entry.href),
  ).map(buildCatalogHub);

  return {
    integrations: [...predictionMarketIntegrations, ...otherIntegrations],
    products: [
      {
        id: "charts",
        label: "Charts",
        href: "/charts",
        description:
          "Build and publish interactive charts on prediction market data.",
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
