import type { HubLinkGroupSection } from "@/types/hub";

export const kalshiHistoricalResearchGuides: HubLinkGroupSection = {
  type: "link_group",
  anchorId: "guides",
  title: "Research and Guides",
  categories: [
    {
      subgroups: [
        {
          label: "Guides",
          links: [
            {
              title: "How to Get Kalshi Historical Data",
              href: "/guides/kalshi-historical-data",
              description:
                "Access, query, export, and backtest Kalshi historical data — CSV, Excel, and JSON without coding.",
            },
          ],
        },
      ],
    },
    {
      label: "Volume",
      subgroups: [
        {
          label: "Guides",
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
          ],
        },
        {
          label: "Dashboards",
          links: [
            {
              title: "Kalshi Volume Dashboard",
              href: "/misterrpink/dashboards/kalshi-volume-dashboard",
              description:
                "Quarterly volume trends, category activity, and shareable Kalshi market insights.",
            },
          ],
        },
      ],
    },
    {
      label: "Politics",
      subgroups: [
        {
          label: "Research",
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
      label: "Weather",
      subgroups: [
        {
          label: "Research",
          links: [
            {
              title: "Kalshi Weather Prediction Markets Analysis",
              href: "/guides/kalshi-weather-prediction-markets-analysis",
              description:
                "Research on weather market behavior, pricing, and historical patterns.",
            },
          ],
        },
        {
          label: "Charts",
          links: [
            {
              title: "Weather Probability Convergence Chart",
              href: "/misterrpink/charts/kalshi-weather-probability-convergence-jan-2025-2",
              description:
                "Published VWPA-style convergence view built on historical Kalshi weather trades.",
            },
            {
              title: "Weather Market Calibration Curve",
              href: "/misterrpink/charts/weather-market-calibration-curve",
              description:
                "Implied probability vs resolution rate across historical weather market buckets.",
            },
          ],
        },
        {
          label: "Guides",
          links: [
            {
              title: "Build a Probability Convergence Chart",
              href: "/guides/kalshi-weather-probability-convergence-chart",
              description:
                "Step-by-step workflow for VWPA-style probability convergence on weather trades.",
            },
            {
              title: "Build a Weather Calibration Chart",
              href: "/guides/kalshi-weather-probability-calibration-chart",
              description:
                "Bucket outcomes and compare implied probabilities to long-run resolution rates.",
            },
            {
              title: "Build a Weather Volatility Chart",
              href: "/guides/kalshi-weather-volatility-chart",
              description:
                "Returns, rolling standard deviation, and intraday volatility on weather markets.",
            },
          ],
        },
        {
          label: "Dashboards",
          links: [
            {
              title: "Kalshi Historical Weather Dashboard",
              href: "/misterrpink/dashboards/kalshi-historical-weather-data",
              description:
                "Shareable dashboard for historical Kalshi weather market data.",
            },
          ],
        },
      ],
    },
  ],
};
