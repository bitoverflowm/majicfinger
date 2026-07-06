import type { HubPageConfig } from "@/types/hub";
import { kalshiHistoricalComparisonTable } from "./kalshiHistoricalComparisonTable";
import { kalshiHistoricalResearchGuides } from "./kalshiHistoricalResearchGuides";

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
      variant: "premium",
      eyebrow: "The complete Kalshi historical archive",
      title: "Kalshi Historical Data",
      subtitle: "Every Kalshi market and trade — ready to query, chart, export, and backtest.",
      heroChart: {
        username: "misterrpink",
        slug: "kalshi-historical-data-hero",
        eyebrow: "NYC weather market historical volatility signal",
        caption: "Analysis built form Kalshi historical market and trades using rolling intraday price movement using Lychee no-code browser based charting and quant tools.",
        captionLink: {
          label: "How to guide",
          href: "/guides/kalshi-weather-volatility-chart",
        },
      },
      heroBody: {
        parts: [
          { type: "text", value: "Instantly access " },
          { type: "metric", value: "7.68M+" },
          { type: "text", value: " unique markets and " },
          { type: "metric", value: "72.1M+" },
          {
            type: "text",
            value:
              " historical trades since July 2021, including prices, volume, outcomes, and orderbook history — no code, no setup or data pipeline required.",
          },
        ],
      },
      primaryCTAs: [
        {
          label: "Get Access Now",
          href: "/#pricing",
          ariaLabel: "Access Kalshi Historical Data now",
          eventLabel: "kalshi_historical_access_now",
          tracking: {
            page: "/kalshi-historical-data",
            destination: "pricing / signup / full access",
          },
        },
      ],
      secondaryCTAs: [
        {
          label: "Explore for free",
          href: "#explore-data",
          ariaLabel: "Explore Kalshi Historical Data for free",
          eventLabel: "kalshi_historical_explore_free",
          tracking: {
            page: "/kalshi-historical-data",
            destination: "free demo / templates (#explore-data)",
          },
        },
      ],
      capabilityPills: [
        "Trade history",
        "Orderbook history",
        "CSV/XLSX/JSON exports",
        "No-code querying",
        "Backtesting-ready",
      ],
    },

    {
      type: "proof_metrics",
      heading: "10,000+ researchers, traders, quants, and analysts use Lychee.",
      subheading:
        "43,400,000+ historical data requests were served from the archive in June 2026 alone.",
      primaryMetrics: [
        {
          value: "7.68M+",
          label: "unique markets",
          tickerValue: 7.68,
          decimalPlaces: 2,
          suffix: "M+",
        },
        {
          value: "72.1M+",
          label: "historical trades",
          tickerValue: 72.1,
          decimalPlaces: 1,
          suffix: "M+",
        },
        {
          value: "36GB+",
          label: "compressed archive",
          tickerValue: 36,
          decimalPlaces: 0,
          suffix: "GB+",
        },
        {
          value: "Since July 2021",
          label: "Every Kalshi market and trade since launch",
          static: true,
        },
      ],
      trustMetrics: [],
    },

    {
      type: "cards",
      title: "What's inside the Kalshi historical dataset?",
      intro:
        "Complete Kalshi market history, trades, prices, outcomes, categories, and orderbook behavior — ready to query, chart, export, and backtest from your browser.",
      cards: [
        {
          title: "Markets",
          description:
            "Tickers, titles, categories, open/close times, market status, volume, event metadata, and final outcomes.",
        },
        {
          title: "Trades",
          description:
            "Historical executions with timestamps, prices, quantities, tickers, market IDs, and YES/NO side data.",
        },
        {
          title: "Orderbook history",
          description:
            "Historical bid/ask behavior, spreads, liquidity, market depth, and orderbook changes where available.",
        },
        {
          title: "Categories and events",
          description:
            "Weather, politics, sports, finance, crypto, economics, culture, and other Kalshi market categories.",
        },
        {
          title: "Resolution data",
          description:
            "Final outcomes for calibration, accuracy studies, backtesting, lifecycle analysis, and strategy research.",
        },
        {
          title: "Exports",
          description:
            "Download query results as CSV, XLSX, or JSON depending on your plan limits.",
        },
      ],
      note:
        "Kalshi Historical is just one layer of Lychee.\n\nEvery paid plan also includes Kalshi Live, Polymarket Historical, Polymarket Live, no-code charts, dashboards, exports, alerts, and quant workflows — so you can compare historical markets against what is happening now.",
      cta: {
        label: "Get Access Now",
        href: "/#pricing",
        ariaLabel: "Go to Lychee pricing",
        requiresAuth: false,
      },
    },

    kalshiHistoricalComparisonTable,

    {
      type: "query",
      anchorId: "explore-data",
      title: "Search Kalshi historical data",
      description:
        "Run no-code queries on historical Kalshi markets, trades, prices, volume, outcomes, and Kalshi orderbook history. Export results as CSV, XLSX, or JSON within your plan limits.",
      examples: [
        "Kalshi historical data download",
        "Kalshi historical order book data",
        "Kalshi trade history CSV export",
        "Kalshi backtesting historical data",
        "Kalshi market data analysis",
        "Find markets with highest volume",
        "Show Kalshi past markets by category",
        "Analyze Kalshi trading volume trends",
      ],
      examplesTitle: "Example queries you can build",
    },

    {
      type: "cards",
      anchorId: "example-workflows",
      title: "Example Kalshi historical workflows",
      intro: "Start with simple workflows, then scale into deeper research.",
      note: "Guided query recipes are coming soon. For now, start with a free Kalshi query or explore the example research below.",
      cards: [
        {
          title: "Top Kalshi markets by volume",
          description:
            "Find the highest-volume historical Kalshi markets since launch.",
        },
        {
          title: "Resolved politics markets",
          description:
            "Filter finalized political markets and study probability, volume, and outcome behavior.",
        },
        {
          title: "Weather market history",
          description:
            "Pull historical weather markets by location, contract type, or time window.",
        },
        {
          title: "Trade history export",
          description:
            "Select trades, choose fields, and export a clean CSV/XLSX/JSON sample.",
        },
        {
          title: "Volume by category",
          description:
            "Group markets by category to see where Kalshi trading activity concentrates.",
        },
        {
          title: "Backtesting dataset",
          description:
            "Use resolved markets, prices, volume, and outcomes to test prediction market strategies.",
        },
      ],
    },

    kalshiHistoricalResearchGuides,

    {
      type: "published_charts",
      anchorId: "get-inspired",
      title: "Charts",
      description:
        "Every published chart built on Kalshi historical data — volume trends, probability convergence, calibration curves, and more. Run any chart for yourself with your own parameters.",
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
      type: "faq",
      title: "Kalshi Historical FAQ",
      items: [
        {
          question: "Does Lychee include all Kalshi historical markets?",
          answer:
            "Lychee is built around a complete Kalshi historical archive covering markets, trades, prices, volume, outcomes, and orderbook history since Kalshi launched. It is designed for users who want to search, analyze, chart, export, and backtest Kalshi data without building their own data pipeline.",
        },
        {
          question: "Can I download Kalshi historical data?",
          answer:
            "Yes. Lychee supports CSV, XLSX, and JSON exports from query results. Export size depends on your plan limits, so you can start with small samples and upgrade for larger historical pulls.",
        },
        {
          question: "Does Lychee provide a Kalshi historical data API?",
          answer:
            "Not yet. Lychee currently provides no-code browser access, query tools, charts, dashboards, exports, and research workflows. The point is to let you use Kalshi historical data without writing API scripts or maintaining your own pipeline.",
        },
        {
          question: "Can I use Lychee for Kalshi backtesting?",
          answer:
            "Yes. Lychee's historical Kalshi data can be used for backtesting and research workflows involving historical trades, market outcomes, price movement, volume, category behavior, and orderbook history.",
        },
        {
          question: "What is the difference between Kalshi Historical and Kalshi Live?",
          answer:
            "Kalshi Historical is for analyzing past markets, trades, outcomes, and historical market behavior. Kalshi Live is for current and recent market monitoring. Lychee lets users combine historical and live Kalshi workflows inside the same platform.",
        },
        {
          question: "Do I need Python or SQL?",
          answer:
            "No. You can search, filter, sort, chart, dashboard, and export Kalshi historical data through Lychee's visual workspace. Developers can still export data for their own stack, but code is not required to start.",
        },
      ],
    },

    {
      type: "cta",
      title: "Start analyzing Kalshi historical data",
      description:
        "Run a free sample query, inspect historical markets and trades, then unlock larger pulls, exports, dashboards, and backtesting workflows.",
      cta: {
        label: "Start free Kalshi query",
        href: "#explore-data",
        requiresAuth: false,
      },
      secondaryCta: {
        label: "View pricing",
        href: "/#pricing",
        requiresAuth: false,
      },
    },
  ],
};
