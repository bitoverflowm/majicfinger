export const KALSHI_HISTORICAL_DATA_HUB_PATH = "/kalshi-historical-data";

export const KALSHI_HUB_GUIDE_BACK_LINK =
  "Learn more about Kalshi historical data on Lychee";

/** Guides in the Kalshi historical data hub cluster (slug prefix). */
export function isKalshiHistoricalHubGuide(slug: string): boolean {
  return slug.startsWith("kalshi-");
}
