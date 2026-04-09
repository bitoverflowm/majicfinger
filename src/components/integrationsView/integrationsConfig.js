"use client";

import Image from "next/image";

/** Integrations that open the datasheet with a right-side API pull panel */
export const API_INTEGRATIONS = [
  "polymarket",
  "polymarketHistorical",
  "kalshiHistorical",
  "coinGecko",
  "twitter",
  "wallStreetBets",
  "geckoDex",
  "binance",
  "chainlink",
];

/** Fixed visual size for every integration logo (data picker + integrations views). */
const LOGO_PX = 56;

/**
 * @param {{ src: string; className?: string; imageClassName?: string }} props
 */
function IntegrationLogoImage({ src, className = "", imageClassName = "" }) {
  return (
    <div
      className={`integration-logo-avatar relative mx-auto flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--integration-card-bg)] shadow-md ${className}`}
    >
      <Image
        src={src}
        alt=""
        fill
        className={`object-contain p-1.5 ${imageClassName}`}
        sizes={`${LOGO_PX}px`}
      />
    </div>
  );
}

export const integrations_list = [
  {
    color: "#2E5CFF",
    icon: <IntegrationLogoImage src="/polymarket.png" />,
    clickHandler: "polymarket",
    name: "Polymarket",
    description: "All the data you could want on the world's largest prediction market.",
    tags: ["featured", "crypto", "finance", "trading", "prediction"],
    live: true,
  },
  {
    color: "#0f172a",
    icon: <IntegrationLogoImage src="/polymarket.png" />,
    clickHandler: "polymarketHistorical",
    name: "Polymarket Historical",
    description:
      "Load archived Polymarket Parquet from your S3 data lake into the sheet (DuckDB in the browser).",
    tags: ["featured", "crypto", "finance", "trading", "prediction", "data lake"],
    live: true,
  },
  {
    color: "#28CC95",
    icon: (
      <div className="integration-logo-avatar relative mx-auto flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--integration-card-bg)] shadow-md">
        <Image
          src="/kalshi.png"
          alt=""
          fill
          className="object-contain p-1.5"
          sizes={`${LOGO_PX}px`}
        />
      </div>
    ),
    clickHandler: "kalshiHistorical",
    name: "Kalshi Historical",
    description: "Archived Kalshi Parquet from the Becker data lake — same flow as Polymarket Historical.",
    tags: ["featured", "crypto", "finance", "trading", "prediction", "data lake"],
    live: true,
  },
  {
    color: "#E7F0DC",
    icon: <IntegrationLogoImage src="/coinGecko.png" />,
    clickHandler: "coinGecko",
    name: "CoinGecko",
    description: "Connect to the most reliable and comprehensive cryptocurrency data API for traders and developers.",
    tags: ["featured", "crypto", "finance", "trading", "coming soon"],
    live: false,
  },
  {
    color: "#000",
    icon: (
      <div className="integration-logo-avatar relative mx-auto flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--integration-card-bg)] shadow-md">
        <Image
          src="/binance.jpeg"
          alt=""
          fill
          className="rounded-full object-contain p-1.5"
          sizes={`${LOGO_PX}px`}
        />
      </div>
    ),
    clickHandler: "binance",
    name: "Binance",
    description: "Real-time cryptocurrency price data from: Binance",
    tags: ["crypto", "finance", "trading"],
    live: true,
  },
  {
    color: "#375BD2",
    icon: (
      <div className="integration-logo-avatar relative mx-auto flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--integration-card-bg)] shadow-md">
        <Image
          src="/chainlink.png"
          alt=""
          fill
          className="rounded-full object-contain p-1.5"
          sizes={`${LOGO_PX}px`}
        />
      </div>
    ),
    clickHandler: "chainlink",
    name: "Chainlink",
    description: "Real-time cryptocurrency price data from Chainlink — the world's #1 oracle",
    playgroundDescription: "Select a trading pair to start pulling live prices",
    tags: ["crypto", "finance", "oracles"],
    live: true,
  },
  {
    color: "#000",
    icon: <IntegrationLogoImage src="/geckoDex1.png" />,
    clickHandler: "geckoDex",
    name: "GeckoTerminal from CoinGecko",
    description:
      "GeckoTerminal is a DeFi and DEX aggregator. Explore the market data & prices of any tokens traded across 110+ blockchain networks across 900+ DEXes – brought to you by the same team behind CoinGecko.",
    tags: ["featured", "crypto", "finance", "trading", "coming soon"],
    live: false,
  },
  {
    color: "#AE82FE",
    icon: <IntegrationLogoImage src="/productHunt.png" />,
    clickHandler: "productHunt",
    name: "Product Hunt",
    description: "Discover the latest tech products, startups, and trends with real-time updates from Product Hunt.",
    tags: ["indieHackers", "coming July 24", "coming soon"],
  },
  {
    color: "#000",
    icon: <IntegrationLogoImage src="/x.png" />,
    clickHandler: "twitter",
    name: "Twitter",
    description: "Access and analyze a wealth of Twitter data, from tweets and user profiles to trends and hashtags.",
    tags: ["social", "marketing", "coming soon"],
    live: false,
  },
  {
    color: "#3572EF",
    icon: <IntegrationLogoImage src="/wallStreetBets.png" />,
    clickHandler: "wallStreetBets",
    name: "Wall Street Bets",
    description: "Sentiment analysis on the top 50 stocks discussed on Reddit sub- wallStreetBets.",
    tags: ["finance", "trading", "coming soon"],
    live: false,
  },
  {
    color: "#FF4500",
    icon: <IntegrationLogoImage src="/shortSqueeze.png" />,
    clickHandler: "shortSqueeze",
    name: "Short Squeeze Stock Scanner",
    description: "Get a list of stocks that are in TTM Squeeze or out of squeeze.",
    tags: ["finance", "trading", "coming soon"],
    live: false,
  },
  {
    color: "#3AA6B9",
    icon: <IntegrationLogoImage src="/sec.png" />,
    clickHandler: "secEdgar",
    name: "SEC EDGAR",
    description: "Access comprehensive financial statements, filings, and disclosures from the SEC's EDGAR database.",
    tags: ["finance", "regulation", "compliance", "coming soon", "coming July 24"],
  },
  {
    color: "#004080",
    icon: <IntegrationLogoImage src="/censusGov.png" />,
    clickHandler: "censusGov",
    name: "Census.gov",
    description: "Retrieve detailed demographic, economic, and population data from the U.S. Census Bureau.",
    tags: ["data", "demographics", "population", "coming soon", "coming July 24"],
  },
  {
    color: "#0099CC",
    icon: <IntegrationLogoImage src="/crunchbase.png" imageClassName="rounded-md" />,
    clickHandler: "crunchbase",
    name: "Crunchbase",
    description: "Get access to comprehensive information about companies, startups, investments, and industry trends.",
    tags: ["business", "startups", "investment", "coming soon", "coming July 24"],
  },
  {
    color: "#FF6600",
    icon: (
      <div className="integration-logo-avatar relative mx-auto flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--integration-card-bg)] shadow-md">
        <Image
          src="/hackerNews.png"
          alt=""
          fill
          className="object-contain p-1"
          sizes={`${LOGO_PX}px`}
        />
      </div>
    ),
    clickHandler: "hackerNews",
    name: "Hacker News",
    description: "Stay updated with the latest tech news, discussions, and trends from the Hacker News community.",
    tags: ["tech", "news", "community", "coming soon", "coming July 24"],
  },
  {
    color: "#000080",
    icon: (
      <div className="integration-logo-avatar flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--integration-card-bg)] px-1 text-center text-[10px] font-semibold leading-tight text-white shadow-md [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]">
        US Treasuries
      </div>
    ),
    clickHandler: "usTreasuries",
    name: "US Treasuries",
    description: "Access real-time and historical data on U.S. Treasury securities, yields, and auctions.",
    tags: ["finance", "government", "coming soon", "coming July 24"],
  },
];
