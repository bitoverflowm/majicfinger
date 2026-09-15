import { canonicalUrl } from "@/lib/site";
import type { HubCard, HubCta, HubFaqItem, HubLink } from "@/types/hub";

export const KALSHI_VS_POLYMARKET_PATH = "/kalshi-vs-polymarket-odds";
export const KALSHI_VS_POLYMARKET_CANONICAL = canonicalUrl(
  KALSHI_VS_POLYMARKET_PATH,
);

export const kalshiVsPolymarketLanding = {
  seoTitle: "Kalshi vs Polymarket: Free Live Odds Comparison | Lychee",
  metaDescription:
    "Compare Kalshi and Polymarket odds in real time. Search by event or ticker, match markets and explore live charts, prices and activity. Free, no signup.",
  ogTitle: "Kalshi vs Polymarket: Compare Live Odds for Free",
  ogDescription:
    "Find matching markets. Compare live odds, charts and trading activity. Open a dashboard preview, then save your workspace with a paid Lychee plan.",
  ogImage: "/ogImage2.png",
  ogImageAlt:
    "Kalshi vs Polymarket. Live. Compare odds, charts and activity for free.",
  navLabel: "Compare markets",
  keywords: [
    "Kalshi vs Polymarket",
    "Kalshi Polymarket odds",
    "prediction market comparison",
    "live odds comparison",
    "Kalshi live data",
    "Polymarket live data",
    "prediction market arbitrage",
  ],
  hero: {
    eyebrow: "Real time Polymarket vs Kalshi",
    title: "Compare Kalshi and Polymarket Odds in Real Time",
    description:
      "Search for an event in plain English or enter a market ticker. Find matching markets across Kalshi and Polymarket, then compare live odds, charts and trading activity in one view.",
    compareCta: {
      label: "Click to Begin",
      href: "#compare",
      requiresAuth: false,
      ariaLabel: "Scroll to the live Kalshi and Polymarket comparison",
    } satisfies HubCta,
    trustLine: "Free to use. No signup required.",
    belowTool:
      "Want to monitor the situation your way? Create your own custom dashboard for the markets that matter to you.",
    cta: {
      label: "Monitor on a live dashboard",
      href: "#demo",
      requiresAuth: false,
      ariaLabel: "Open the free live dashboard preview",
    } satisfies HubCta,
    ctaHelper:
      "customize charts, execute quant operations, analyze historical data, and gain your edge by being informed with deep data insights.",
  },
  bento: {
    id: "features",
    eyebrow: "BOTH MARKETS, ONE VIEW",
    title: "See how the same event is trading on Kalshi and Polymarket",
    description:
      "Find the contracts you want to follow and explore the prices, movement and activity behind them. The comparison keeps updating while you watch.",
    items: [
      {
        id: "search",
        title: "Search in your own words",
        description:
          "Describe the event you’re interested in. Natural-language search helps you find markets without knowing their exact names. Already have a ticker? Use that instead.",
      },
      {
        id: "match",
        title: "Find matching markets",
        description:
          "Discover corresponding markets across Kalshi and Polymarket where available. If an automatic match isn’t found, search each platform and choose the contracts yourself.",
      },
      {
        id: "prices",
        title: "Compare live YES and NO prices",
        description:
          "See where the two markets agree and where their prices differ. View each contract’s YES and NO prices alongside its name and market status.",
      },
      {
        id: "charts",
        title: "Follow both charts in real time",
        description:
          "Overlay the price charts or view them side by side. Explore 15 minutes, 1 hour, 6 hours, 1 day or all available chart data to see how the comparison changes over time.",
      },
      {
        id: "activity",
        title: "See the trading behind the move",
        description:
          "Compare volume, recent trades, last-trade prices and trade times. Put a price movement in context with the activity happening on each platform.",
      },
      {
        id: "orderbooks",
        title: "Inspect spreads and order books",
        description:
          "Look at bids, asks and available order sizes on both markets. Explore the liquidity behind the displayed prices as the order books change.",
      },
    ],
  },
  whyItMatters: {
    title: "What changes when you can see both markets?",
    content:
      "A price move raises questions. Is the other platform moving too? Did trading activity pick up? Has the spread widened?\n\nBring the two markets together to investigate what changed and how each is responding. Whether you’re following an event, researching a trade or exploring a price difference, you can start with the live comparison.",
  },
  dashboard: {
    eyebrow: "YOUR NEXT MARKET SESSION STARTS HERE",
    title: "Turn this comparison into a dashboard you can return to",
    intro:
      "Start with the markets you’re viewing. Open them in a live dashboard preview and explore a layout built around your comparison.\n\nWhen you’re ready to make it part of your daily routine, save your dashboard with a paid Lychee account. Reopen your chosen markets and layout, load the latest data, and continue your research.",
    cards: [
      {
        title: "Keep your markets together",
        description:
          "Build a workspace for the events you follow. Organize Kalshi and Polymarket comparisons into separate tabs so you can move between markets throughout the day.",
      },
      {
        title: "Make the view your own",
        description:
          "Arrange charts and market details around your workflow. Bring prices, candlesticks, trades and order books into the layout you want to use.",
      },
      {
        title: "Pick up where you left off",
        description:
          "Save your dashboard to your Lychee account and return to the same setup next time. Your selected markets and layout are ready for another session.",
      },
    ] satisfies HubCard[],
    primaryCta: {
      label: "Check it out",
      href: "#demo",
      requiresAuth: false,
      ariaLabel: "Check out the live dashboard preview",
    } satisfies HubCta,
    secondaryCta: {
      label: "View Lychee plans",
      href: "#pricing",
      requiresAuth: false,
      ariaLabel: "View Lychee plans",
    } satisfies HubCta,
  },
  platform: {
    eyebrow: "GO DEEPER WITH LYCHEE",
    title: "Investigate the question behind the price move",
    intro:
      "The full Lychee workspace gives you room to develop the analysis. Bring together live market feeds, historical data and other sources, then work with them in sheets, custom charts and dashboards. No code required.",
    cards: [
      {
        title: "Put today’s market in historical context",
        description:
          "Explore historical prices, trades and resolved markets. Study how similar events developed and test whether the pattern you’re seeing has appeared before.",
      },
      {
        title: "Build the analysis your question needs",
        description:
          "Filter data, group it by time, calculate measures and create custom charts. Use Lychee’s spreadsheet and quantitative tools to explore volatility, volume, price movement and market outcomes.",
      },
      {
        title: "Bring the surrounding information into view",
        description:
          "Explore market activity alongside news, X posts, Reddit discussions and other data sources. Build a dashboard around the event and the information you want to follow.",
      },
    ] satisfies HubCard[],
  },
  pricing: {
    eyebrow: "MAKE IT YOUR WORKSPACE",
    title: "Choose your Lychee plan",
    description:
      "Save your dashboards, follow multiple markets and take your analysis further. Choose a plan for the amount of data and research you want to work with.",
    below:
      "The comparison tool is free to use. A paid Lychee plan gives you saved dashboards and access to the broader research workspace, within your plan’s limits.",
  },
  faq: {
    title: "Questions about comparing Kalshi and Polymarket",
    items: [
      {
        question: "Is the Kalshi and Polymarket comparison tool free?",
        answer:
          "Yes. You can search for markets and use the live comparison on this page without creating an account or paying. You can also explore a temporary dashboard preview. Saving a dashboard requires a paid Lychee account.",
      },
      {
        question: "Are the odds and charts live?",
        answer:
          "Yes. The comparison uses live market data and updates while you’re viewing it. Follow changes in prices, charts, trading activity and order books as the markets move.",
      },
      {
        question: "How do I find the same event on Kalshi and Polymarket?",
        answer:
          "Search using an event description or a market ticker. Lychee looks for corresponding markets on both platforms. Review the contracts it finds, or search each platform manually to choose your comparison.",
      },
      {
        question: "What if there’s no matching market on one platform?",
        answer:
          "You can search manually to look for a counterpart. Some events are only listed on one platform, and an unsuccessful automatic match does not necessarily mean no counterpart exists.",
      },
      {
        question: "Why are Kalshi and Polymarket odds different?",
        answer:
          "Each platform has its own trading activity and order book, so prices can differ. Similar market titles can also describe different outcomes or resolution conditions. Compare the exact contracts as well as their prices.",
      },
      {
        question: "Can I use this to research Kalshi and Polymarket arbitrage?",
        answer:
          "Yes. Compare prices, spreads and order books to investigate potential opportunities. A price difference alone does not confirm arbitrage: contract terms, fees, available size and the prices at which trades can actually execute all matter.",
      },
      {
        question: "Can I save a comparison and monitor multiple markets?",
        answer:
          "Open your comparison in the dashboard preview to explore the layout. Register and choose a paid Lychee plan to save dashboards and organize multiple markets into tabs. You can then return to your saved workspace and view current market data.",
      },
      {
        question: "Can I analyze historical Kalshi and Polymarket data too?",
        answer:
          "Yes. The full Lychee platform includes live and historical prediction market data, sheets, custom charts, dashboards and quantitative analysis tools. Use it to study earlier trading activity, explore resolved markets and develop your own research.",
      },
    ] satisfies HubFaqItem[],
  },
  related: {
    title: "Explore more prediction market data",
    links: [
      {
        title: "Kalshi live data",
        href: "/kalshi-live-data",
        description:
          "Explore live Kalshi prices, trades, order books and candlesticks.",
      },
      {
        title: "Polymarket live data",
        href: "/polymarket-live-data",
        description:
          "Explore the live data behind Polymarket prices and activity.",
      },
      {
        title: "Kalshi historical data",
        href: "/kalshi-historical-data",
        description: "Research past markets and trading activity.",
      },
      {
        title: "Polymarket historical data",
        href: "/polymarket-historical-data",
        description: "Work with historical markets, prices and trades.",
      },
      {
        title: "Polymarket metadata lookup",
        href: "/polymarket-metadata",
        description: "Find market IDs, event IDs, slugs and token identifiers.",
      },
    ] satisfies HubLink[],
  },
  closing: {
    title: "What market are you watching?",
    description:
      "Find it on Kalshi and Polymarket. Compare the live odds, explore the activity and see how both markets move in real time.",
    cta: {
      label: "Compare markets for free",
      href: "#compare",
      requiresAuth: false,
      ariaLabel: "Compare Kalshi and Polymarket markets for free",
    } satisfies HubCta,
    secondaryCta: {
      label: "View Lychee plans",
      href: "#pricing",
      requiresAuth: false,
      ariaLabel: "View Lychee plans",
    } satisfies HubCta,
    supportLine:
      "No signup needed to compare. Save your dashboard when you’re ready with a paid Lychee plan.",
  },
} as const;
