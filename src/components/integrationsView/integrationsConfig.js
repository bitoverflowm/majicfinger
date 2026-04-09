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
    name: "Polymarket data feed",
    description: "All real-time decentralized polymarket, prediction market API.",
    guide: {
      href: "/guides/polymarket-events-endpoint-no-code",
      title: "Polymarket Events Endpoint Step-by-Step Guide",
      label: "Guide",
    },
    tags: ["featured", "crypto", "finance", "trading", "prediction"],
    live: true,
  },
  {
    color: "#0f172a",
    icon: <IntegrationLogoImage src="/polymarket.png" />,
    clickHandler: "polymarketHistorical",
    name: "Polymarket Historical",
    description:
      "Access and analyze Polymarket historical data — download time-series market data for backtesting and trading dashboards.",
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
    description: "Access and analyze Kalshi historical data — download order book and trade history for backtesting and real-time trading dashboards.",
    guide: {
      href: "/guides/kalshi-historical-data",
      title: "Kalshi Historical Data Step-by-Step Guide",
      label: "Guide",
    },
    tags: ["featured", "crypto", "finance", "trading", "prediction", "data lake"],
    live: true,
  },
  {
    color: "#E7F0DC",
    icon: <IntegrationLogoImage src="/coinGecko.png" />,
    clickHandler: "coinGecko",
    name: "CoinGecko",
    description: "Real-time crypto prices, historical data, and market analytics from CoinGecko.",
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
    description: "Pull real-time and historical market data from Binance.",
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
    description: "Access decentralized oracle data feeds for smart contracts and blockchain apps. Retrieve real-world data, integrate secure external inputs, and monitor live on-chain information.",
    playgroundDescription: "Select a trading pair to start pulling live prices",
    guide: {
      href: "/guides/polymarket-live-prices",
      title: "Polymarket Live Prices Step-by-Step Guide",
      label: "Guide",
    },
    tags: ["crypto", "finance", "oracles"],
    live: true,
  },
  {
    color: "#000",
    icon: <IntegrationLogoImage src="/geckoDex1.png" />,
    clickHandler: "geckoDex",
    name: "GeckoTerminal",
    description:
      "Access real-time multi-chain cryptocurrency market data. Track token prices, DEX trading volumes, liquidity metrics, and historical charts for DeFi projects. Integrate GeckoTerminal endpoints for automated insights into blockchain markets.",
    tags: ["featured", "crypto", "finance", "trading", "coming soon"],
    live: false,
  },
  {
    color: "#AE82FE",
    icon: <IntegrationLogoImage src="/productHunt.png" />,
    clickHandler: "productHunt",
    name: "Product Hunt",
    description: "Access real-time and historical product launch data. Track trending startups, upvote metrics, launch dates, and platform analytics. Pull Product Hunt endpoints directly for automated insights into new tech products and market trends.",
    tags: ["indieHackers", "coming July 24", "coming soon"],
  },
  {
    color: "#000",
    icon: <IntegrationLogoImage src="/x.png" />,
    clickHandler: "twitter",
    name: "Twitter",
    description: "Access real-time social media data, including tweets, user profiles, trends, and engagement metrics. Track mentions, hashtags, and sentiment, automate posting, and pull Twitter endpoints for analytics, monitoring, and social media insights.",
    tags: ["social", "marketing", "coming soon"],
    live: false,
  },
  {
    color: "#3572EF",
    icon: <IntegrationLogoImage src="/wallStreetBets.png" />,
    clickHandler: "wallStreetBets",
    name: "Wall Street Bets",
    description: "Access real-time and historical posts, comments, and sentiment from retail trading communities. Track stock mentions, market-moving discussions, crowd-sourced investment insights, and trading trends from Wall Street Bets to analyze retail investor behavior and gauge social market sentiment.",
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
