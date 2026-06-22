import type { HubPageConfig } from "@/types/hub";

export const polymarketHistoricalHub: HubPageConfig = {
  id: "polymarket-historical",
  slug: "polymarket-historical-data",
  title: "Polymarket Historical Data — Market History, Odds & Event Archives",
  seoTitle:
    "Polymarket Historical Data — Market History, Odds & Event Archives | Lychee",
  description:
    "Explore Polymarket historical data — archived odds, resolved markets, event metadata, and research workflows. Guides and tools for analyzing Polymarket market history in Lychee.",
  publishedAt: "2026-06-20",
  author: "misterrpink",
  topics: [
    "polymarket",
    "prediction markets",
    "historical data",
    "market data",
    "odds",
    "archives",
  ],
  integration: ["Polymarket", "Lychee"],
  ogImage: "https://lycheedata.com/ogImage2.png",
  featured: true,
  readingTime: "4 min",
  twitterCard: "summary_large_image",
  canonical: "https://lycheedata.com/polymarket-historical-data",
  keywords: [
    "polymarket historical data",
    "polymarket odds history",
    "polymarket market history",
    "polymarket archived markets",
    "polymarket event data",
    "polymarket metadata",
    "prediction market historical analysis",
  ],
  assetFilter: {
    username: "misterrpink",
    chartSearchAllUsers: true,
    dashboardSearchAllUsers: true,
    dashboardTags: ["polymarket", "historical"],
    chartKeywords: ["polymarket"],
    maxCharts: 8,
    maxDashboards: 8,
  },
  sections: [
    {
      type: "hero",
      title: "Polymarket Historical",
      subtitle:
        "Analyze Polymarket market history — archived odds, resolved outcomes, event metadata, and long-run probability trends.",
      microtext:
        "Historical Polymarket workflows for researchers studying how prediction markets price events over time.",
      primaryCTAs: [{ label: "Metadata lookup", href: "/polymarket-metadata" }],
      secondaryCTAs: [{ label: "Browse guides", href: "#guides" }],
    },
    {
      type: "text_block",
      title: "What is Polymarket Historical Data?",
      content:
        "Polymarket historical data includes past market prices, resolution outcomes, event metadata, and category-level activity across crypto-native prediction markets. Lychee helps you look up market identifiers, pull event archives, and build charts that show how implied probabilities evolved before resolution — useful for calibration studies, strategy backtests, and market-efficiency research.",
    },
    {
      type: "link_group",
      anchorId: "guides",
      title: "Polymarket Historical Guides",
      groups: [],
    },
    {
      type: "link_group",
      anchorId: "tools",
      title: "Polymarket Historical Tools",
      groups: [
        {
          label: "API & Metadata",
          links: [
            {
              title: "Polymarket CLOB WebSocket Market Channel",
              href: "/guides/polymarket-clob-websocket-market-channel",
              description:
                "Subscribe with asset IDs for live orderbooks, price changes, and market events.",
            },
            {
              title: "Polymarket Gamma API Events Slug",
              href: "/guides/polymarket-gamma-api-events-slug",
              description:
                "Query Polymarket events by slug and extract market IDs, condition IDs, and clobTokenIds.",
            },
            {
              title: "Polymarket Metadata Lookup",
              href: "/polymarket-metadata",
              description:
                "Find Polymarket market IDs, event IDs, slugs, and structured metadata without API calls.",
            },
          ],
        },
      ],
    },
    {
      type: "text_block",
      title: "Use Cases for Polymarket Historical Data",
      content:
        "Polymarket historical data supports election and macro post-mortems, calibration analysis against realized outcomes, and comparison of market-implied probabilities with polls and fundamentals. Analysts export historical odds series for research papers; builders use metadata tools to wire the right market IDs into live and batch pipelines.",
    },
    {
      type: "published_charts",
      anchorId: "published-charts",
      title: "Polymarket Historical Charts",
      description:
        "Published charts built on Polymarket historical data — run any chart for yourself with your own parameters.",
    },
    {
      type: "cta",
      title: "Start Exploring Polymarket History",
      description:
        "Look up Polymarket metadata and analyze historical prediction market data in Lychee.",
      cta: {
        label: "Metadata Lookup",
        href: "/polymarket-metadata",
        requiresAuth: false,
      },
      secondaryCta: {
        label: "Start Free Query",
        href: "/#demo",
        requiresAuth: false,
      },
    },
  ],
};
