import type { HubPageConfig } from "@/types/hub";

export const kalshiLiveHub: HubPageConfig = {
  id: "kalshi-live",
  slug: "kalshi-live-data",
  title: "Kalshi Live Data",
  heroTitle: "Live Kalshi Market Data Without Code",
  seoTitle: "Kalshi Market Data: Live Prices, Trades & Order Books | Lychee",
  description:
    "Access live Kalshi market data, including prices, trades, order books and candlesticks. Analyze, chart, export and publish without writing code.",
  socialTitle: "Live Kalshi Market Data Without Code | Lychee",
  socialDescription:
    "Explore live Kalshi markets, prices, trades, order books and candlesticks. Build charts, exports and dashboards directly from your browser.",
  publishedAt: "2026-06-20",
  author: "misterrpink",
  topics: [
    "kalshi",
    "prediction markets",
    "live data",
    "real-time",
    "market data",
    "streaming",
  ],
  integration: ["Kalshi", "Lychee"],
  ogImage: "https://lycheedata.com/ogImage2.png",
  ogImageAlt:
    "Live Kalshi market data dashboard showing prices, trades and candlestick charts in Lychee",
  featured: true,
  readingTime: "4 min",
  twitterCard: "summary_large_image",
  canonical: "https://lycheedata.com/kalshi-live-data",
  keywords: [
    "Kalshi market data",
    "Kalshi live data",
    "Kalshi real-time data",
    "Kalshi API",
    "Kalshi live prices",
    "Kalshi trade data",
    "Kalshi order book data",
    "Kalshi candlestick data",
    "Kalshi data download",
    "Kalshi charts",
  ],
  assetFilter: {
    username: "misterrpink",
    chartSearchAllUsers: true,
    dashboardSearchAllUsers: true,
    dashboardTags: ["kalshi", "live"],
    chartKeywords: ["kalshi"],
    maxCharts: 8,
    maxDashboards: 8,
  },
  sections: [
    {
      type: "hero",
      title: "Kalshi Live",
      subtitle:
        "Access live Kalshi markets, prices, trades, order books and candlesticks—then analyze, chart, export and publish the data directly from your browser.",
      microtext:
        "No code. No setup. No Kalshi API key required for public market data.",
      primaryCTAs: [
        {
          label: "Get Access Now",
          href: "/#pricing",
          requiresAuth: false,
        },
      ],
      secondaryCTAs: [
        {
          label: "Try for Free",
          href: "#live-demo",
          requiresAuth: false,
        },
      ],
    },
    {
      type: "text_block",
      title: "What Kalshi market data can you access?",
      content:
        "Lychee turns Kalshi’s public market-data endpoints into a visual workspace. Browse series, events and markets; pull live prices, recent trades, order books, candlesticks, volume and open interest; then filter, transform, chart and export the results without building or maintaining an API integration.\n\nSearch for any Kalshi market in plain English. Select an event or contract, then instantly explore its current prices, market metadata, recent trades, order book, candlesticks, volume and open interest—directly on this page.",
      footerLink: {
        label: "Check it out below",
        href: "#live-demo",
      },
      connectBelow: true,
    },
    {
      type: "kalshi_live_demo",
      anchorId: "live-demo",
      connectAbove: true,
    },
    {
      type: "text_block",
      title: "Explore the Kalshi API Without Writing Code",
      content:
        "Select a Kalshi market-data endpoint, configure the request visually and preview its response before loading the data into your workspace. Access markets, events, trades, order books and candlesticks without writing Python, handling pagination or maintaining a data pipeline. Developers can inspect the structured response fields, while non-technical users can work with the same data through a guided interface.",
      supportingText:
        "No Kalshi API key is required for the public market-data endpoints available through Lychee.",
    },
    {
      type: "text_block",
      title: "Analyze Kalshi Markets as They Move",
      content:
        "Monitor real-time probability changes as events unfold, compare prices across related contracts, inspect liquidity and trading activity, analyze candlestick trends, track volume and open interest, and publish live Kalshi charts or dashboards. Use current market data for intraday research, event monitoring, trading analysis and shareable reports.",
    },
    {
      type: "published_charts",
      anchorId: "live-charts",
      title: "Live Kalshi Price & Candlestick Charts",
      description:
        "Explore published charts built from current Kalshi prices, candlesticks, volume and open interest. Open any chart to inspect the underlying data, then fork the workflow for another market, event or time window.",
    },
    {
      type: "text_block",
      title: "Kalshi Live Data vs. Kalshi Historical Data",
      content:
        "Kalshi separates current and recent exchange data from older archived records. Use Kalshi Live for active and recently closed markets, live prices, recent trades, current order books and recent candlesticks. Use Kalshi Historical Data for older settled markets, deep trade history, historical order books, outcomes, backtesting and long-range research. Lychee brings both workflows into one platform.",
      contentParts: [
        {
          type: "text",
          value:
            "Kalshi separates current and recent exchange data from older archived records. Use Kalshi Live for active and recently closed markets, live prices, recent trades, current order books and recent candlesticks. Use ",
        },
        {
          type: "link",
          label: "Kalshi Historical Data",
          href: "/kalshi-historical-data",
        },
        {
          type: "text",
          value:
            " for older settled markets, deep trade history, historical order books, outcomes, backtesting and long-range research. Lychee brings both workflows into one platform.",
        },
      ],
    },
    {
      type: "link_group",
      anchorId: "guides",
      title: "Kalshi Market Data Guides",
      description:
        "Learn how to query and analyze Kalshi trades, order books, candlesticks and other live market data without writing code.",
      groups: [],
    },
    {
      type: "cta",
      title: "Start Analyzing Live Kalshi Market Data",
      description:
        "Choose a Kalshi endpoint, configure your request and turn the results into a table, chart, export or live dashboard—without writing code.",
      cta: {
        label: "Explore Kalshi Live",
        href: "/#demo",
        requiresAuth: false,
      },
      secondaryCta: {
        label: "Browse Live Dashboards",
        href: "/dashboards-gallery",
        requiresAuth: false,
      },
    },
    {
      type: "faq",
      title: "Kalshi Live FAQ",
      items: [
        {
          question: "What is Kalshi market data?",
          answer:
            "Kalshi market data includes information about series, events, markets, prices, trades, order books, candlesticks, volume, open interest and market status. Lychee provides a visual interface for accessing and analyzing this data without writing API requests.",
        },
        {
          question: "Is Kalshi market data real-time?",
          answer:
            "Kalshi’s live endpoints return current exchange data when queried. Lychee lets you refresh, analyze and visualize that data through tables, charts and dashboards. Authenticated WebSocket connections are required for direct streaming updates from Kalshi.",
        },
        {
          question: "Do I need a Kalshi API key?",
          answer:
            "No Kalshi API key is required for the public market-data endpoints available through Lychee. Private account data, trading endpoints and direct WebSocket connections require authentication with Kalshi.",
        },
        {
          question: "Can I download Kalshi market data?",
          answer:
            "Yes. Lychee lets you download query results as CSV, XLSX or JSON, subject to your plan limits. You can filter and transform the data before exporting it.",
          answerParts: [
            {
              type: "text",
              value: "Yes. Lychee lets you download query results as ",
            },
            {
              type: "link",
              label: "CSV, XLSX or JSON",
              href: "/csv-exports",
            },
            {
              type: "text",
              value:
                ", subject to your plan limits. You can filter and transform the data before exporting it.",
            },
          ],
        },
        {
          question: "What is the difference between Kalshi Live and Kalshi Historical?",
          answer:
            "Kalshi Live covers current and recent exchange data, including active markets, recent trades, current order books and recent candlesticks. Kalshi Historical is designed for older markets, complete market history, historical trades, outcomes, backtesting and long-range research.",
        },
        {
          question: "Can I build Kalshi charts without coding?",
          answer:
            "Yes. You can turn Kalshi prices, trades, candlesticks, volume and open interest into interactive charts without writing code. Charts can be saved, published, embedded in dashboards and forked for other markets.",
          answerParts: [
            {
              type: "text",
              value:
                "Yes. You can turn Kalshi prices, trades, candlesticks, volume and open interest into interactive ",
            },
            {
              type: "link",
              label: "charts",
              href: "/charts",
            },
            {
              type: "text",
              value: " without writing code. Charts can be saved, published, embedded in ",
            },
            {
              type: "link",
              label: "dashboards",
              href: "/dashboards-gallery",
            },
            {
              type: "text",
              value: " and forked for other markets.",
            },
          ],
        },
        {
          question: "Is the Kalshi API free?",
          answer:
            "Kalshi provides public market-data endpoints that can be accessed without authentication. Authenticated endpoints remain subject to Kalshi’s access requirements and rate limits. Lychee provides a visual interface for public market data, with its own plan and usage limits.",
        },
      ],
    },
  ],
};
