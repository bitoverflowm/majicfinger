import { createIntegrationHubSections } from "@/lib/hubs/createIntegrationHubSections";
import type { HubPageConfig } from "@/types/hub";

export const kalshiLiveHub: HubPageConfig = {
  id: "kalshi-live",
  slug: "kalshi-live-data",
  title: "Kalshi Live Data — Real-Time Prediction Market Prices & Streaming",
  seoTitle:
    "Kalshi Live Data — Real-Time Prediction Market Prices & Streaming | Lychee",
  description:
    "Stream live Kalshi market prices, monitor real-time prediction market activity, and build live charts on Kalshi data. Guides and workflows for live Kalshi analysis in Lychee.",
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
  featured: true,
  readingTime: "4 min",
  twitterCard: "summary_large_image",
  canonical: "https://lycheedata.com/kalshi-live-data",
  keywords: [
    "kalshi live data",
    "kalshi live prices",
    "kalshi real time data",
    "kalshi streaming",
    "kalshi websocket",
    "kalshi prediction markets live",
    "prediction market live charts",
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
  sections: createIntegrationHubSections({
    hubId: "kalshi-live",
    heroSubtitle:
      "Monitor live Kalshi prediction market prices, track real-time probability shifts, and build streaming charts on Kalshi data.",
    heroMicrotext:
      "Live Kalshi workflows for traders, researchers, and builders who need up-to-the-second market activity.",
    introTitle: "What is Kalshi Live Data?",
    introContent:
      "Kalshi live data reflects order flow and price updates as they happen across regulated prediction markets — politics, economics, weather, and more. Lychee is building no-code paths to stream Kalshi activity, visualize intraday moves, and publish live dashboards. This hub will collect guides, research, and dashboards as live Kalshi coverage expands.",
    linkGroupTitle: "Kalshi Live Guides & Resources",
    useCasesTitle: "Use Cases for Kalshi Live Data",
    useCasesContent:
      "Kalshi live data supports intraday trading decisions, event-driven research, and real-time monitoring of macro and political markets. Teams use live feeds to compare market reactions against news headlines, build alerting systems around probability thresholds, and embed live Kalshi charts in reports and social posts.",
    ctaTitle: "Explore Kalshi Live Data",
    ctaDescription:
      "Start analyzing live Kalshi prediction market activity with Lychee.",
    extraSections: [
      {
        type: "published_charts",
        anchorId: "published-charts",
        title: "Kalshi Live Charts",
        description:
          "Published charts on live and streaming Kalshi data — more coming as live coverage grows.",
      },
    ],
  }),
};
