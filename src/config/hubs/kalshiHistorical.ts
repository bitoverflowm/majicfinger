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
    dashboardSearchAllUsers: true,
    dashboardTags: ["kalshi", "historical data", "volume"],
    maxCharts: 12,
    maxDashboards: 12,
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
      type: "published_charts",
      anchorId: "get-inspired",
      title: "Kalshi Historical Data Charts",
      description:
        "Every published chart built on Kalshi historical data — volume trends, probability convergence, calibration curves, and more. Run any chart for yourself with your own parameters.",
    },

    {
      type: "link_group",
      anchorId: "guides",
      title: "Kalshi Historical Data Guides",
      groups: [],
    },

    {
      type: "video_carousel",
      anchorId: "video-instructions",
      title: "Video Instructions",
      description:
        "Step-by-step walkthroughs for building Kalshi weather market charts on historical data — probability convergence, calibration, and volatility.",
      videos: [
        {
          videoId: "6puApqBkg3A",
          title: "Build a Kalshi Probability Convergence Chart",
          description:
            "Watch how to pull historical trades, bucket by time, and chart VWPA-style probability convergence for weather markets.",
          guideHref: "/guides/kalshi-weather-probability-convergence-chart",
        },
        {
          videoId: "75-Ox-ciLbY",
          title: "Build a Kalshi Weather Probability Calibration Chart",
          description:
            "See how to bucket market outcomes and compare implied probabilities to long-run resolution rates.",
          guideHref: "/guides/kalshi-weather-probability-calibration-chart",
        },
        {
          videoId: "qdtTWOsU-yQ",
          title: "Build a Kalshi Weather Volatility Chart",
          description:
            "Follow the full workflow for returns, rolling standard deviation, and intraday volatility clustering on weather trades.",
          guideHref: "/guides/kalshi-weather-volatility-chart",
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
      type: "published_dashboards",
      anchorId: "published-dashboards",
      title: "Kalshi Dashboards",
      description:
        "Live, shareable Kalshi dashboards — volume trends, market analysis, and weather prediction market insights built on historical data.",
    },

    {
      type: "text_block",
      title: "Kalshi Political Market Research",
      content:
        "Beyond volume and weather, Kalshi historical data supports deep political market research — calibration curves, forecast error by probability bucket, and lifecycle accuracy across thousands of resolved elections and policy markets. Explore the political research guides below for calibration analysis, lifecycle forecasting, and election market behavior.",
    },

    {
      type: "link_group",
      title: "Kalshi Resources",
      groups: [
        {
          label: "Political Market Research",
          links: [
            {
              title: "Are Political Prediction Markets Accurate at 90%?",
              href: "/guides/kalshi-political-prediction-market-accuracy",
              description:
                "Calibration analysis of 3,000+ resolved Kalshi political markets — probability buckets, forecast error, and reliability diagrams.",
            },
            {
              title: "When Do Prediction Markets Become Accurate?",
              href: "/guides/kalshi-historical-political-prediction-market-accuracy-lifecycle",
              description:
                "Lifecycle analysis across 25,552 market snapshots — when political odds become reliable.",
            },
            {
              title: "Political Prediction Markets & Election Forecasting",
              href: "/guides/kalshi-political-prediction-markets-analysis",
              description:
                "How political markets compare to polls and what historical pricing reveals.",
            },
          ],
        },
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
