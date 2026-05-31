import type { HubPageConfig } from "@/types/hub";

export const kalshiHistoricalHub: HubPageConfig = {
  id: "kalshi-historical",
  slug: "kalshi-historical-data",
  title: "Kalshi Historical Data API, Trade History & Orderbook Data (36GB+ Dataset)",
  seoTitle: "Kalshi Historical Data API, Trade History & Orderbook Data | 36GB+ Dataset",
  description:
    "Access 36GB+ of Kalshi historical data including trade history, orderbook data, and full market datasets. Search, download, and analyze prediction market data for backtesting, volume analysis, and research.",
  publishedAt: "2026-05-31",
  author: "misterrpink",
  topics: [
    "kalshi",
    "prediction markets",
    "market data",
    "historical data",
    "time series",
    "backtesting",
  ],
  integration: ["Kalshi", "Lychee"],
  coverImage: "/images/hubs/kalshi-historical-data/main.png",
  ogImage: "https://lycheedata.com/images/hubs/kalshi-historical-data/main.png",
  featured: true,
  readingTime: "8 min",
  twitterCard: "summary_large_image",
  canonical: "https://lycheedata.com/kalshi-historical-data",
  keywords: [
    "kalshi historical data",
    "kalshi historical data api",
    "kalshi trade history",
    "kalshi orderbook data",
    "kalshi data download",
    "kalshi market data api",
    "kalshi backtesting data",
    "prediction market historical data",
    "kalshi csv export",
    "kalshi data api download",
    "kalshi trade history download",
    "kalshi historical market data",
    "kalshi dataset",
    "kalshi analysis",
    "kalshi volume data",
    "kalshi weather markets data",
    "kalshi data for backtesting",
  ],

  assetFilter: {
    username: "misterrpink",
    chartSearchAllUsers: true,
    chartLake: "kalshi",
    dashboardTags: ["kalshi", "historical data", "volume"],
    chartKeywords: ["kalshi"],
    chartSlugs: [
      { username: "misterrpink", slug: "kalshi-quaterly-volume" },
      { username: "misterrpink", slug: "kalshi-quaterly-volume-chart" },
      { username: "misterrpink", slug: "kalshi-volume-by-category" },
      { username: "misterrpink", slug: "kalshi-weather-probability-convergence-jan-2025-2" },
      { username: "misterrpink", slug: "kalshi-weather-probability-convergence-jan-2025" },
      { username: "misterrpink", slug: "weather-market-calibration-curve" },
      { username: "misterrpink", slug: "nyc-weather-market-intraday-volatility-clustering" },
      { username: "misterrpink", slug: "high-temp-nov-nyc-probability-convergence" },
    ],
  },

  sections: [
    {
      type: "hero",
      title: "Kalshi Historical Data",
      subtitle:
        "36GB+ of Kalshi historical data including market data, trade history, and full orderbook data across all markets. Access Kalshi historical data API, download datasets, and perform backtesting on prediction markets.",
      microtext:
        "Search Kalshi historical data, analyze market behavior, and download historical trade and orderbook data for backtesting strategies.",
      primaryCTAs: [
        {
          label: "Take me to the data",
          href: "#explore-data",
        },
      ],
      secondaryCTAs: [
        {
          label: "Get Inspired",
          href: "#get-inspired",
        },
      ],
    },

    {
      type: "stats",
      title: "Kalshi Historical Dataset",
      stats: [
        { label: "Dataset Size", value: "36GB+" },
        { label: "Kalshi Historical Markets", value: "All markets" },
        { label: "Historical Trade Data", value: "Full trade history" },
        { label: "API Access", value: "Kalshi historical data API supported" },
        { label: "Download Formats", value: "JSON, CSV, XLSX" },
        { label: "In-Browser Access", value: "Query, explore, and export without code" },
        { label: "Backtesting Support", value: "Yes" },
      ],
    },

    {
      type: "text_block",
      title: "What is Included in Kalshi Historical Data",
      content:
        "Kalshi historical data includes full market data, trade history and historical price movements across all Kalshi prediction markets. This dataset supports Kalshi backtesting, trade analysis, and prediction market research. Users can access Kalshi historical market data via Lychee's browser based tools or download formats for offline analysis.",
    },

    {
      type: "text_block",
      title: "Download & Export Formats",
      content:
        "Kalshi historical data can be exported for analysis and backtesting. Common formats include CSV, JSON, and structured dataset exports. Users often use this data for offline analysis, research, and machine learning workflows. GitHub-style dataset usage and reproducible research workflows are supported through structured exports.",
    },

    {
      type: "query",
      anchorId: "explore-data",
      title: "Kalshi Historical Data API & Search",
      description:
        "Run queries on Kalshi historical data, including trade history, orderbook data, and market-level datasets. Supports backtesting and analysis workflows.",
      examples: [
        "Kalshi historical data download",
        "Kalshi historical orderbook data",
        "Kalshi trade history CSV export",
        "Kalshi backtesting historical data",
        "Kalshi market data analysis",
        "Find markets with highest volume",
        "Show Kalshi historical data by category",
        "Analyze Kalshi trading volume trends",
      ],
      examplesTitle: "Example queries you can build",
    },

    {
      type: "link_group",
      anchorId: "get-inspired",
      title: "Kalshi Historical Data Guides",
      groups: [
        {
          label: "Overview",
          links: [
            {
              title: "Kalshi Historical Data",
              href: "/guides/kalshi-historical-data",
              description:
                "Overview of Kalshi historical data, market structure, and dataset usage.",
            },
          ],
        },
        {
          label: "Volume Analysis",
          links: [
            {
              title: "Kalshi Volume Meaning",
              href: "/guides/kalshi-volume",
            },
            {
              title: "Kalshi Volume Chart Guide",
              href: "/guides/kalshi-volume-chart-guide",
            },
            {
              title: "Kalshi Volume Dashboard",
              href: "/misterrpink/dashboards/kalshi-volume-dashboard",
            },
          ],
        },
        {
          label: "Weather Markets",
          links: [
            {
              title: "Kalshi Weather Prediction Markets Analysis",
              href: "/guides/kalshi-weather-prediction-markets-analysis",
            },
            {
              title: "Kalshi Weather Probability Convergence Chart",
              href: "/guides/kalshi-weather-probability-convergence-chart",
            },
            {
              title: "Kalshi Weather Probability Calibration Chart",
              href: "/guides/kalshi-weather-probability-calibration-chart",
            },
          ],
        },
      ],
    },

    {
      type: "published_charts",
      title: "Kalshi Historical Data Charts",
      description:
        "Every published chart built on Kalshi historical data — volume trends, probability convergence, calibration curves, and more. Run any chart for yourself with your own parameters.",
    },

    {
      type: "text_block",
      title: "Kalshi Backtesting with Historical Data",
      content:
        "Kalshi historical data is commonly used for backtesting trading strategies on prediction markets. Users analyze historical trade data, orderbook movements, and market outcomes to evaluate strategy performance. The dataset supports Kalshi backtesting workflows including trade simulation, probability analysis, and market efficiency research.",
    },

    {
      type: "link_group",
      title: "Kalshi Dashboards",
      groups: [
        {
          label: "Volume & Market Analysis",
          links: [
            {
              title: "Kalshi Volume Dashboard",
              href: "/misterrpink/dashboards/kalshi-volume-dashboard",
              description:
                "Quarterly volume trends, category activity, and shareable Kalshi market insights.",
            },
          ],
        },
        {
          label: "Probability Analysis",
          links: [
            {
              title: "Weather Probability Convergence Chart",
              href: "/misterrpink/charts/kalshi-weather-probability-convergence-jan-2025-2",
            },
            {
              title: "Weather Market Calibration Curve",
              href: "/misterrpink/charts/weather-market-calibration-curve",
            },
          ],
        },
      ],
    },

    {
      type: "text_block",
      title: "Use Cases for Kalshi Historical Data",
      content:
        "Kalshi historical data is used for trade analysis, backtesting trading strategies, building prediction market dashboards, analyzing market efficiency, studying Kalshi trading volume, and exporting historical trade data for research. It is commonly used by analysts, researchers, and developers working with prediction market data.",
    },

    {
      type: "cta",
      title: "Start Analyzing Kalshi Historical Data",
      description:
        "Search Kalshi historical data, analyze trade history, and run backtests on real prediction market data.",
      cta: {
        label: "Start Free Query",
        href: "#explore-data",
        requiresAuth: false,
      },
      secondaryCta: {
        label: "Get Full Access",
        href: "/#pricing",
        requiresAuth: false,
      },
    },
  ],
};
