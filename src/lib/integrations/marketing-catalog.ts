/** Server-safe integration catalog for marketing nav and hub landing pages. */

export type MarketingIntegrationEntry = {
  id: string;
  label: string;
  description: string;
  /** Marketing hub URL — existing data hubs or `/integrations/{id}`. */
  href: string;
};

/** Maps in-app integration handlers to existing prediction-market hub paths. */
export const PRIMARY_INTEGRATION_HUB_PATHS: Record<string, string> = {
  polymarket: "/polymarket-live-data",
  polymarketHistorical: "/polymarket-historical-data",
  kalshiHistorical: "/kalshi-historical-data",
  kalshiLive: "/kalshi-live-data",
};

const PRIMARY_HANDLER_IDS = new Set(Object.keys(PRIMARY_INTEGRATION_HUB_PATHS));

function integrationPath(id: string): string {
  return PRIMARY_INTEGRATION_HUB_PATHS[id] ?? `/integrations/${id}`;
}

/** All integrations shown in the data sheet picker (mirrors integrationsConfig). */
export const MARKETING_INTEGRATIONS: MarketingIntegrationEntry[] = [
  {
    id: "polymarket",
    label: "Polymarket Live",
    description:
      "Real-time decentralized Polymarket prediction market API — live prices, events, and streaming charts.",
    href: integrationPath("polymarket"),
  },
  {
    id: "polymarketHistorical",
    label: "Polymarket Historical",
    description:
      "Access and analyze Polymarket historical data — download time-series market data for backtesting and dashboards.",
    href: integrationPath("polymarketHistorical"),
  },
  {
    id: "kalshiHistorical",
    label: "Kalshi Historical",
    description:
      "Access Kalshi historical trade history and order book data for backtesting and research.",
    href: integrationPath("kalshiHistorical"),
  },
  {
    id: "kalshiLive",
    label: "Kalshi Live",
    description:
      "Real-time Kalshi market data, prices, and order flow for live dashboards and alerts.",
    href: integrationPath("kalshiLive"),
  },
  {
    id: "binance",
    label: "Binance",
    description: "Pull real-time and historical market data from Binance.",
    href: integrationPath("binance"),
  },
  {
    id: "chainlink",
    label: "Chainlink",
    description:
      "Decentralized oracle data feeds for smart contracts — live on-chain reference prices.",
    href: integrationPath("chainlink"),
  },
  {
    id: "coinGecko",
    label: "CoinGecko",
    description:
      "Real-time crypto prices, historical data, and market analytics from CoinGecko.",
    href: integrationPath("coinGecko"),
  },
  {
    id: "geckoDex",
    label: "GeckoTerminal",
    description:
      "Multi-chain DEX prices, liquidity, and volume from GeckoTerminal.",
    href: integrationPath("geckoDex"),
  },
  {
    id: "productHunt",
    label: "Product Hunt",
    description:
      "Product launch data — trending startups, upvotes, and launch analytics.",
    href: integrationPath("productHunt"),
  },
  {
    id: "twitter",
    label: "Twitter",
    description:
      "Social data — tweets, profiles, trends, and engagement metrics.",
    href: integrationPath("twitter"),
  },
  {
    id: "wallStreetBets",
    label: "Wall Street Bets",
    description:
      "Retail trading community posts, mentions, and sentiment signals.",
    href: integrationPath("wallStreetBets"),
  },
  {
    id: "shortSqueeze",
    label: "Short Squeeze Scanner",
    description: "Stocks in or out of TTM Squeeze for technical screening.",
    href: integrationPath("shortSqueeze"),
  },
  {
    id: "secEdgar",
    label: "SEC EDGAR",
    description: "Financial statements, filings, and disclosures from SEC EDGAR.",
    href: integrationPath("secEdgar"),
  },
  {
    id: "censusGov",
    label: "Census.gov",
    description: "Demographic, economic, and population data from the U.S. Census Bureau.",
    href: integrationPath("censusGov"),
  },
  {
    id: "crunchbase",
    label: "Crunchbase",
    description: "Company, startup, investment, and industry trend data.",
    href: integrationPath("crunchbase"),
  },
  {
    id: "hackerNews",
    label: "Hacker News",
    description: "Tech news, discussions, and community trends from Hacker News.",
    href: integrationPath("hackerNews"),
  },
  {
    id: "usTreasuries",
    label: "US Treasuries",
    description: "U.S. Treasury securities, yields, and auction data.",
    href: integrationPath("usTreasuries"),
  },
];

export function getMarketingIntegrationById(
  id: string,
): MarketingIntegrationEntry | null {
  return MARKETING_INTEGRATIONS.find((entry) => entry.id === id) ?? null;
}

/** Placeholder hub pages under `/integrations/[slug]` (excludes primary data hubs). */
export function getPlaceholderIntegrationHubSlugs(): string[] {
  return MARKETING_INTEGRATIONS.filter(
    (entry) => !PRIMARY_HANDLER_IDS.has(entry.id),
  ).map((entry) => entry.id);
}

export function isPrimaryIntegrationHubPath(href: string): boolean {
  return Object.values(PRIMARY_INTEGRATION_HUB_PATHS).includes(href);
}
