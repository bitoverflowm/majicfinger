import type { HubComparisonTableSection } from "@/types/hub";

/** Reviewed August 24, 2026 — factual access-model comparison for Polymarket Historical hub. */
export const polymarketHistoricalComparisonTable: HubComparisonTableSection = {
  type: "comparison_table",
  anchorId: "compare-providers",
  title: "How Lychee Compares With Polymarket APIs, Public Datasets, and Data Providers",
  intro:
    "There is no single best access method for every team. Official endpoints are useful when you want to build directly against Polymarket. Public archives can be useful for reproducible file-based work. Warehouses support SQL analysis. Specialist vendors may focus on high-frequency market data. Lychee is designed for researchers who want a connected historical workspace, visual analysis tools, and exports without first building the data pipeline.",
  featuredColumnId: "lychee",
  columns: [
    { id: "lychee", label: "Lychee", badge: "No-code research workspace" },
    { id: "polymarket_apis", label: "Polymarket APIs" },
    { id: "public_archives", label: "Public GitHub, Hugging Face, or Kaggle datasets" },
    { id: "dune_allium", label: "Dune or Allium" },
    { id: "specialist", label: "Specialist providers" },
    { id: "diy", label: "DIY scripts" },
  ],
  rows: [
    {
      feature: "Primary access model",
      cells: {
        lychee: "No-code browser workspace plus exports",
        polymarket_apis: "REST APIs and WebSockets",
        public_archives: "Downloadable files and toolkits",
        dune_allium: "SQL and warehouse analytics",
        specialist: "API or downloadable data products",
        diy: "Custom collectors, databases, and notebooks",
      },
    },
    {
      feature: "Launch-to-present continuity",
      cells: {
        lychee: "Yes, through Historical plus Live",
        polymarket_apis:
          "Source endpoints are available; the user assembles storage, ranges, and linked tables",
        public_archives: "Varies by dataset, version, and collection window",
        dune_allium: "Depends on indexed contracts, schemas, and provider coverage",
        specialist: "Varies by vendor, product, data type, and date",
        diy: "Only what the team collects or successfully backfills",
      },
    },
    {
      feature: "Markets and events",
      cells: {
        lychee: "Connected historical tables plus live discovery",
        polymarket_apis: "Available through platform endpoints",
        public_archives: "Often available, but schema and completeness vary",
        dune_allium: "Queryable where indexed",
        specialist: "Varies",
        diy: "Must be collected and normalized",
      },
    },
    {
      feature: "Executed historical trades",
      cells: {
        lychee: "404M+ records in the indexed archive",
        polymarket_apis: "Available through relevant endpoints and on-chain sources",
        public_archives: "Often included in archive-specific formats",
        dune_allium: "Queryable where indexed",
        specialist: "Commonly available",
        diy: "Must be collected, decoded, deduplicated, and stored",
      },
    },
    {
      feature: "Historical price data",
      cells: {
        lychee: "Queryable Price History table",
        polymarket_apis: "Price-history endpoint for specified market assets and time parameters",
        public_archives: "Varies",
        dune_allium: "Can be derived or queried where indexed",
        specialist: "Often available",
        diy: "Must be requested, generated, or stored",
      },
    },
    {
      feature: "Resolutions",
      cells: {
        lychee: "Connected for resolved-market research",
        polymarket_apis: "Available through market metadata and platform data",
        public_archives: "Varies",
        dune_allium: "Can be joined where modeled",
        specialist: "Varies",
        diy: "Must be modeled and joined",
      },
    },
    {
      feature: "Natural-language market discovery",
      cells: {
        lychee: "Yes",
        polymarket_apis: "No built-in research workflow",
        public_archives: "No",
        dune_allium: "No standard built-in market-search workflow",
        specialist: "Varies",
        diy: "Must be built",
      },
    },
    {
      feature: "Visual joins and transformations",
      cells: {
        lychee: "Yes",
        polymarket_apis: "No",
        public_archives: "No",
        dune_allium: "SQL-based",
        specialist: "Varies",
        diy: "Custom code",
      },
    },
    {
      feature: "Charts and dashboards",
      cells: {
        lychee: "Built into the workspace",
        polymarket_apis: "Must be built",
        public_archives: "Must be built",
        dune_allium: "Supported through provider tools",
        specialist: "Varies",
        diy: "Must be built",
      },
    },
    {
      feature: "Backtesting workflow",
      cells: {
        lychee: "No-code historical analysis tools",
        polymarket_apis: "Must be built",
        public_archives: "Usually notebook or code based",
        dune_allium: "SQL plus external tooling",
        specialist: "Varies",
        diy: "Fully custom",
      },
    },
    {
      feature: "CSV, XLSX, and JSON exports",
      cells: {
        lychee: "Yes, within plan limits",
        polymarket_apis: "Responses require user-managed export logic",
        public_archives: "Dataset-native formats",
        dune_allium: "Query exports",
        specialist: "Varies",
        diy: "Fully custom",
      },
    },
    {
      feature: "Polymarket plus Kalshi in one product",
      cells: {
        lychee: "Yes",
        polymarket_apis: "No",
        public_archives: "Usually separate archives",
        dune_allium: "Available in some warehouse products",
        specialist: "Varies",
        diy: "Must be integrated",
      },
    },
    {
      feature: "Best fit",
      cells: {
        lychee:
          "Analysts, researchers, traders, and quants who want to explore and build without a data pipeline",
        polymarket_apis: "Developers building custom applications",
        public_archives: "Teams comfortable managing files and notebooks",
        dune_allium: "SQL-native analysts",
        specialist: "Teams needing a provider’s specific feed",
        diy: "Engineering teams needing total infrastructure control",
      },
    },
  ],
  punchline:
    "Coverage and product capabilities change. Verify current provider documentation before making a purchase or architecture decision. As one public-archive example, the SII-WANGZJ Polymarket dataset currently states that its public CLOB archive begins on November 21, 2022 and excludes the earlier 2020–November 2022 FPMM/AMM era. Sources: docs.polymarket.com (price history, blockchain data), huggingface.co/datasets/SII-WANGZJ/Polymarket_data, dune.com Polymarket and Kalshi overview. Last reviewed August 24, 2026.",
  cta: {
    label: "Explore Historical Data",
    href: "#explore-data",
    ariaLabel: "Explore Polymarket Historical Data",
    eventLabel: "polymarket_historical_compare_explore",
    tracking: {
      page: "/polymarket-historical-data",
      destination: "explore-data",
    },
  },
};
