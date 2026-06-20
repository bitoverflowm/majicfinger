import { createIntegrationHubSections } from "@/lib/hubs/createIntegrationHubSections";
import type { HubPageConfig } from "@/types/hub";

export const polymarketLiveHub: HubPageConfig = {
  id: "polymarket-live",
  slug: "polymarket-live-data",
  title: "Polymarket Live Data — Real-Time Prices, WebSockets & Streaming Charts",
  seoTitle:
    "Polymarket Live Data — Real-Time Prices, WebSockets & Streaming Charts | Lychee",
  description:
    "Stream live Polymarket prices, build real-time prediction market charts, and analyze event data with no-code tools. Guides for WebSocket streaming, odds over time, and market metadata.",
  publishedAt: "2026-06-20",
  author: "misterrpink",
  topics: [
    "polymarket",
    "prediction markets",
    "live data",
    "websockets",
    "real-time",
    "market data",
  ],
  integration: ["Polymarket", "Lychee"],
  ogImage: "https://lycheedata.com/ogImage2.png",
  featured: true,
  readingTime: "5 min",
  twitterCard: "summary_large_image",
  canonical: "https://lycheedata.com/polymarket-live-data",
  keywords: [
    "polymarket live prices",
    "polymarket websocket",
    "polymarket real time data",
    "polymarket streaming",
    "polymarket odds over time",
    "polymarket market id",
    "polymarket event data",
    "prediction market live charts",
  ],
  assetFilter: {
    username: "misterrpink",
    chartSearchAllUsers: true,
    dashboardSearchAllUsers: true,
    dashboardTags: ["polymarket", "live"],
    chartKeywords: ["polymarket"],
    maxCharts: 8,
    maxDashboards: 8,
  },
  sections: createIntegrationHubSections({
    hubId: "polymarket-live",
    heroSubtitle:
      "Stream live Polymarket prices, pull event data, and build real-time prediction market charts — without writing code.",
    heroMicrotext:
      "Guides for WebSocket streaming, market IDs, odds-over-time analysis, and live chart workflows on Polymarket.",
    introTitle: "What is Polymarket Live Data?",
    introContent:
      "Polymarket live data covers real-time order book updates, trade prints, and probability shifts as markets react to news. Lychee helps you connect to streaming feeds, visualize odds over time, and turn live market activity into shareable charts and dashboards — useful for traders tracking short-term moves and analysts monitoring event-driven markets.",
    linkGroupTitle: "Polymarket Live Guides & Resources",
    useCasesTitle: "Use Cases for Polymarket Live Data",
    useCasesContent:
      "Polymarket live data is used to monitor breaking-news markets, stream prices into custom dashboards, compare implied probabilities across related events, and build alerting workflows around large probability swings. Researchers use live feeds to study market microstructure; builders use them to embed real-time charts in blogs, newsletters, and internal tools.",
    ctaTitle: "Start Streaming Polymarket Live Data",
    ctaDescription:
      "Connect to live Polymarket feeds and build real-time charts with no setup.",
    extraSections: [
      {
        type: "published_charts",
        anchorId: "published-charts",
        title: "Polymarket Live Charts",
        description:
          "Published charts built on live and streaming Polymarket data — run any chart for yourself with your own parameters.",
      },
    ],
  }),
};
