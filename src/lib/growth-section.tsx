export const growthSection = {
  title: "Research past markets. Build on what you learn.",
  items: [
    {
      id: 1,
      title: "Investigate what happened before a market resolved.",
      description:
        "Explore historical Kalshi and Polymarket prices, trades, and outcomes. Compare similar markets, group activity into time intervals, and examine how prices and volume changed as resolution approached.",
      ctas: [
        { label: "Explore Kalshi historical data", href: "/kalshi-historical-data" },
        { label: "Explore Polymarket historical data", href: "/polymarket-historical-data" },
      ],
    },
    {
      id: 2,
      title: "Save your work. Share the analysis.",
      description:
        "Save queries, sheets, charts, and terminals so you can build on your research. Export results as CSV, Excel, or JSON, or publish interactive charts and dashboards for others to explore.",
      ctas: [],
    },
  ],
} as const;
