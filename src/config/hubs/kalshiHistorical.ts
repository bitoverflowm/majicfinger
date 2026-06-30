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
      variant: "premium",
      eyebrow: "The complete Kalshi historical archive",
      title: "Kalshi Historical Data",
      subtitle: "Every Kalshi market and trade — ready to query, chart, export, and backtest.",
      heroChart: {
        username: "misterrpink",
        slug: "nyc-weather-market-intraday-volatility-clustering",
      },
      heroBody: {
        parts: [
          { type: "text", value: "Access " },
          { type: "metric", value: "7.68M+" },
          { type: "text", value: " unique markets and " },
          { type: "metric", value: "72.1M+" },
          {
            type: "text",
            value:
              " historical trades since July 2021, including prices, volume, outcomes, and orderbook history — no code or data pipeline required.",
          },
        ],
      },
      primaryCTAs: [
        {
          label: "Access Now",
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
    },

    {
      type: "proof_metrics",
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
          label: "Kalshi public launch",
          static: true,
        },
      ],
      trustMetrics: [
        {
          value: "43.4M+",
          label: "S3 data requests this month",
          tickerValue: 43.4,
          decimalPlaces: 1,
          suffix: "M+",
        },
        {
          value: "10K+",
          label: "free and paid users",
          tickerValue: 10,
          decimalPlaces: 0,
          suffix: "K+",
        },
      ],
      capabilityPills: [
        "Orderbook history",
        "CSV/XLSX/JSON exports",
        "No-code querying",
        "Backtesting-ready",
      ],
    },

    {
      type: "cards",
      title: "What's inside the Kalshi historical dataset?",
      intro:
        "Lychee gives you browser-based access to historical Kalshi markets, trades, prices, volume, outcomes, categories, and orderbook history. Use it to search past markets, inspect trade behavior, compare categories, export datasets, and build research workflows without managing files or API pipelines. Lychee's Kalshi Historical archive currently includes 7.68M+ unique markets and 72.1M+ historical trades, compressed into a 36GB+ hosted dataset you can query without code.",
      cards: [
        {
          title: "Markets",
          description:
            "Tickers, titles, categories, open and close times, market status, outcomes, volume, and event metadata.",
        },
        {
          title: "Trades",
          description:
            "Historical trade executions, prices, quantities, timestamps, market identifiers, and outcome-side information.",
        },
        {
          title: "Orderbook history",
          description:
            "Historical bid/ask behavior, liquidity, spreads, and market depth where available.",
        },
        {
          title: "Categories and events",
          description:
            "Weather, politics, sports, finance, crypto, economics, culture, and other Kalshi market categories.",
        },
        {
          title: "Outcomes and resolution data",
          description:
            "Resolved market outcomes for calibration, accuracy analysis, backtesting, and market-behavior research.",
        },
        {
          title: "Export-ready datasets",
          description:
            "Download query results as CSV, XLSX, or JSON within your plan limits.",
        },
      ],
    },

    {
      type: "bullets",
      title: "Why Kalshi historical data is hard to use without Lychee",
      intro:
        "Raw historical prediction market analysis usually requires collecting data, storing large files, stitching markets to trades, handling live vs historical endpoints, cleaning fields, and building your own charts. Lychee turns the archive into a hosted no-code workspace.",
      bullets: [
        "No data pipeline to build",
        "No local 36GB+ archive to manage",
        "No Python required",
        "No manual CSV wrangling",
        "No stitching markets, trades, and outcomes by hand",
        "Query, chart, export, and backtest from one workspace",
      ],
    },

    {
      type: "text_block",
      title: "Looking for a Kalshi historical data API?",
      content:
        "Lychee is not a public API product yet. It is a no-code workspace for people who want to use Kalshi historical data without building and maintaining their own API pipeline. You can search markets, inspect trades, chart results, export CSV/XLSX/JSON, and build research workflows directly in the browser.",
    },

    {
      type: "cards",
      title: "What you can do with Kalshi historical data",
      cards: [
        {
          title: "Find high-volume markets",
          description:
            "Sort historical Kalshi markets by volume to find the contracts that attracted the most trading activity.",
        },
        {
          title: "Analyze category behavior",
          description:
            "Compare weather, politics, sports, crypto, economics, and other categories across volume, outcomes, and price behavior.",
        },
        {
          title: "Study trades and price movement",
          description:
            "Inspect historical trades, price changes, liquidity, and market behavior around major events.",
        },
        {
          title: "Build charts and dashboards",
          description:
            "Turn historical queries into charts, dashboards, calibration curves, convergence views, and volume breakdowns.",
        },
        {
          title: "Export data",
          description:
            "Download CSV, XLSX, or JSON samples and larger plan-based exports for your own research stack.",
        },
        {
          title: "Backtest ideas",
          description:
            "Test market hypotheses against resolved historical markets, trade behavior, outcomes, volume, and pricing patterns.",
        },
      ],
    },

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

    {
      type: "link_group",
      anchorId: "guides",
      title: "Start here",
      groups: [],
    },

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
      type: "published_dashboards",
      anchorId: "published-dashboards",
      title: "Dashboards",
      description:
        "Live, shareable Kalshi dashboards — volume trends, market analysis, and weather prediction market insights built on historical data.",
    },

    {
      type: "link_group",
      title: "Kalshi historical research & resources",
      groups: [
        {
          label: "Volume analysis",
          links: [
            {
              title: "What Does Volume Mean on Kalshi?",
              href: "/guides/what-does-volume-mean-on-kalshi",
              description:
                "Trading volume, liquidity, and market activity explained for beginners.",
            },
            {
              title: "Kalshi Volume Guide",
              href: "/guides/kalshi-volume",
              description:
                "How to analyze Kalshi trading volume trends and category activity.",
            },
            {
              title: "Kalshi Volume Chart Guide",
              href: "/guides/kalshi-volume-chart-guide",
              description:
                "Build volume charts and breakdowns from historical Kalshi market data.",
            },
            {
              title: "Kalshi Volume Dashboard",
              href: "/misterrpink/dashboards/kalshi-volume-dashboard",
              description:
                "Quarterly volume trends, category activity, and shareable Kalshi market insights.",
            },
          ],
        },
        {
          label: "Weather analysis",
          links: [
            {
              title: "Kalshi Weather Prediction Markets Analysis",
              href: "/guides/kalshi-weather-prediction-markets-analysis",
              description:
                "Research on weather market behavior, pricing, and historical patterns.",
            },
            {
              title: "Kalshi Historical Weather Dashboard",
              href: "/misterrpink/dashboards/kalshi-historical-weather-datas",
              description:
                "Shareable dashboard for historical Kalshi weather market data.",
            },
            {
              title: "Weather Probability Convergence Chart",
              href: "/misterrpink/charts/kalshi-weather-probability-convergence-jan-2025-2",
            },
            {
              title: "Weather Market Calibration Curve",
              href: "/misterrpink/charts/weather-market-calibration-curve",
            },
            {
              title: "Build a Probability Convergence Chart",
              href: "/guides/kalshi-weather-probability-convergence-chart",
            },
            {
              title: "Build a Weather Calibration Chart",
              href: "/guides/kalshi-weather-probability-calibration-chart",
            },
            {
              title: "Build a Weather Volatility Chart",
              href: "/guides/kalshi-weather-volatility-chart",
            },
          ],
        },
        {
          label: "Political market research",
          links: [
            {
              title: "Are 90% Prediction Markets Reliable?",
              href: "/guides/kalshi-political-prediction-market-accuracy",
              description:
                "Kalshi political market calibration study — final-price reliability at 90–100% and the 90% trap in prediction markets.",
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
