/**
 * Logo strip for marketing hub pages — mirrors dashboard `integrations_list`
 * (including coming-soon), without importing client JSX from integrationsConfig.
 */

import { PRIMARY_INTEGRATION_HUB_PATHS } from "@/lib/integrations/marketing-catalog";

export type IntegrationLogoStripItem = {
  id: string;
  label: string;
  /** Public asset path, or null for text-only badge. */
  src: string | null;
  href: string;
  comingSoon?: boolean;
};

function hubOrPlaceholder(id: string): string {
  return PRIMARY_INTEGRATION_HUB_PATHS[id] ?? `/integrations/${id}`;
}

/** Same order as the data-sheet integration picker. */
export const INTEGRATION_LOGO_STRIP: IntegrationLogoStripItem[] = [
  {
    id: "polymarket",
    label: "Polymarket Live",
    src: "/polymarket.png",
    href: hubOrPlaceholder("polymarket"),
  },
  {
    id: "polymarketHistorical",
    label: "Polymarket Historical",
    src: "/polymarket.png",
    href: hubOrPlaceholder("polymarketHistorical"),
  },
  {
    id: "kalshiHistorical",
    label: "Kalshi Historical",
    src: "/kalshi.png",
    href: hubOrPlaceholder("kalshiHistorical"),
  },
  {
    id: "kalshiHistoricalV2",
    label: "Kalshi Historical v2",
    src: "/kalshi.png",
    href: "/kalshi-historical-data",
  },
  {
    id: "kalshiLive",
    label: "Kalshi Live",
    src: "/kalshi.png",
    href: hubOrPlaceholder("kalshiLive"),
  },
  {
    id: "coinGecko",
    label: "CoinGecko",
    src: "/coinGecko.png",
    href: hubOrPlaceholder("coinGecko"),
    comingSoon: true,
  },
  {
    id: "binance",
    label: "Binance",
    src: "/binance.jpeg",
    href: hubOrPlaceholder("binance"),
  },
  {
    id: "chainlink",
    label: "Chainlink",
    src: "/chainlink.png",
    href: hubOrPlaceholder("chainlink"),
  },
  {
    id: "geckoDex",
    label: "GeckoTerminal",
    src: "/geckoDex1.png",
    href: hubOrPlaceholder("geckoDex"),
    comingSoon: true,
  },
  {
    id: "productHunt",
    label: "Product Hunt",
    src: "/productHunt.png",
    href: hubOrPlaceholder("productHunt"),
    comingSoon: true,
  },
  {
    id: "twitter",
    label: "X",
    src: "/x.png",
    href: hubOrPlaceholder("twitter"),
    comingSoon: true,
  },
  {
    id: "wallStreetBets",
    label: "Wall Street Bets",
    src: "/wallStreetBets.png",
    href: hubOrPlaceholder("wallStreetBets"),
    comingSoon: true,
  },
  {
    id: "shortSqueeze",
    label: "Short Squeeze Scanner",
    src: "/shortSqueeze.png",
    href: hubOrPlaceholder("shortSqueeze"),
    comingSoon: true,
  },
  {
    id: "secEdgar",
    label: "SEC EDGAR",
    src: "/sec.png",
    href: hubOrPlaceholder("secEdgar"),
    comingSoon: true,
  },
  {
    id: "censusGov",
    label: "Census.gov",
    src: "/censusGov.png",
    href: hubOrPlaceholder("censusGov"),
    comingSoon: true,
  },
  {
    id: "crunchbase",
    label: "Crunchbase",
    src: "/crunchbase.png",
    href: hubOrPlaceholder("crunchbase"),
    comingSoon: true,
  },
  {
    id: "hackerNews",
    label: "Hacker News",
    src: "/hackerNews.png",
    href: hubOrPlaceholder("hackerNews"),
    comingSoon: true,
  },
  {
    id: "usTreasuries",
    label: "US Treasuries",
    src: "/usTreasuries.png",
    href: hubOrPlaceholder("usTreasuries"),
    comingSoon: true,
  },
];
