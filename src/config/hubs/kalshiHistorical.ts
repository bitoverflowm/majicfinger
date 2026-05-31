import type { HubPageConfig } from "@/types/hub";

export const kalshiHistoricalHub: HubPageConfig = {
  id: "kalshi-historical",
  slug: "kalshi-historical-data",
  title: "Kalshi Historical Data",
  description:
    "Kalshi historical data, including market data, trade history, orderbook data, API access, and downloadable datasets for backtesting and analysis.",
  keywords: [
    "kalshi historical data",
    "kalshi historical data api",
    "kalshi trade history",
    "kalshi orderbook data",
    "kalshi backtesting",
    "kalshi market data",
    "prediction market historical data",
    "kalshi data download",
  ],
  ogImage: "/images/guides/kalshi-historical-data/main.png",

  assetFilter: {
    username: "misterrpink",
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
          label: "Search Kalshi Historical Data",
          href: "/guides/kalshi-historical-data#download-kalshi-historical-data-csv-excel-json",
        },
        {
          label: "Browse Markets",
          href: "/try",
        },
      ],
      secondaryCTAs: [
        {
          label: "Browse Trade History",
          href: "/guides/kalshi-historical-data",
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
        { label: "Orderbook Data", value: "Full depth snapshots" },
        { label: "API Access", value: "Kalshi historical data API supported" },
        { label: "Backtesting Support", value: "Yes" },
      ],
    },

    {
      type: "query",
      title: "Kalshi Historical Data API & Search",
      description:
        "Run queries on Kalshi historical data, including trade history, orderbook data, and market-level datasets. Supports backtesting and analysis workflows.",
      examples: [
        "Kalshi historical data API download",
        "Kalshi historical orderbook data",
        "Kalshi trade history CSV export",
        "Kalshi backtesting historical data",
        "Kalshi market data analysis",
        "Find markets with highest volume",
        "Show Kalshi historical data by category",
        "Analyze Kalshi trading volume trends",
      ],
      cta: {
        label: "Run Query (Free)",
        href: "/guides/kalshi-historical-data#download-kalshi-historical-data-csv-excel-json",
        requiresAuth: false,
      },
    },

    {
      type: "text_block",
      title: "What is Included in Kalshi Historical Data",
      content:
        "Kalshi historical data includes full market data, trade history, orderbook data, and historical price movements across all Kalshi prediction markets. This dataset supports Kalshi backtesting, trade analysis, and prediction market research. Users can access Kalshi historical market data via API or download formats for offline analysis.",
    },

    {
      type: "text_block",
      title: "Download & Export Formats",
      content:
        "Kalshi historical data can be exported for analysis and backtesting. Common formats include CSV, JSON, and structured dataset exports. Users often use this data for offline analysis, research, and machine learning workflows. GitHub-style dataset usage and reproducible research workflows are supported through structured exports.",
    },

    {
      type: "link_group",
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
      type: "published_charts",
      title: "Kalshi Historical Data Charts",
      description:
        "Interactive charts built on Kalshi historical data — volume trends, probability convergence, calibration curves, and more.",
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
        href: "/guides/kalshi-historical-data#download-kalshi-historical-data-csv-excel-json",
        requiresAuth: false,
      },
    },
  ],
};
