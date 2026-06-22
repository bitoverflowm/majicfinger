/**
 * Guides shown on the dashboard "Connect data" hub — keep in reverse chronological
 * order by publishedAt (newest first). Update when publishing a new guide.
 */
export const CONNECT_HOME_GUIDES = [
  {
    slug: "polymarket-clob-websocket-market-channel",
    title: "Polymarket CLOB WebSocket Market Channel: Asset IDs, Prices & Trades",
    publishedAt: "2026-06-22",
  },
  {
    slug: "polymarket-gamma-api-events-slug",
    title: "Polymarket Gamma API Events Slug: How to Query Events by Slug",
    publishedAt: "2026-06-22",
  },
  {
    slug: "what-does-volume-mean-on-kalshi",
    title: "What Does Volume Mean on Kalshi? Trading Volume Explained",
    publishedAt: "2026-06-21",
  },
  {
    slug: "kalshi-historical-political-prediction-market-accuracy-lifecycle",
    title: "When Do Prediction Markets Become Accurate? A Kalshi Political Market Lifecycle Analysis",
    publishedAt: "2026-06-17",
  },
  {
    slug: "kalshi-political-prediction-market-accuracy",
    title: "Are 90% Prediction Markets Reliable? A Kalshi Political Calibration Study",
    publishedAt: "2026-06-12",
  },
  {
    slug: "kalshi-weather-prediction-markets-analysis",
    title: "Kalshi Weather Prediction Markets Explained: How They Work, How Prices Are Set, and What Historical Data Reveals",
    publishedAt: "2026-05-10",
  },
  {
    slug: "kalshi-volume-chart-guide",
    title: "How to Build Kalshi Volume Charts Using Historical Data (Step-by-Step Guide)",
    publishedAt: "2026-04-29",
  },
  {
    slug: "kalshi-volume",
    title: "Kalshi Volume Explained: Quarterly Trends, Historical Growth, and Market Activity Data",
    publishedAt: "2026-04-27",
  },
  {
    slug: "polymarket-market-id",
    title: "How to Find Polymarket Market ID (CLOB, Token, Condition & Slug Explained)",
    publishedAt: "2026-04-21",
  },
  {
    slug: "polymarket-odds-over-time",
    title: "How to Track Polymarket Odds Over Time (Visualize Probability Changes)",
    publishedAt: "2026-04-16",
  },
  {
    slug: "kalshi-historical-data",
    title: "How to Get Kalshi Historical Data (CSV, EXCEL, No-Code Guide)",
    publishedAt: "2026-04-05",
  },
  {
    slug: "every-sql-query-you-ever-need",
    title: "Every SQL query you ever need",
    publishedAt: "2026-03-30",
  },
  {
    slug: "polymarket-live-prices",
    title: "How to Stream Live Polymarket Prices and Build Real-Time Charts (No-Code)",
    publishedAt: "2026-03-12",
  },
  {
    slug: "polymarket-events-endpoint-no-code",
    title: "How to Pull and Analyze Polymarket Event Data (No-Code)",
    publishedAt: "2026-03-01",
  },
].slice().sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));
