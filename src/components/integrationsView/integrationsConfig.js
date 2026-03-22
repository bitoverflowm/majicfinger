"use client";

import Image from "next/image";

/** Integrations that open the datasheet with a right-side API pull panel */
export const API_INTEGRATIONS = [
  "polymarket",
  "polymarketHistorical",
  "coinGecko",
  "twitter",
  "wallStreetBets",
  "geckoDex",
  "binance",
  "chainlink",
];

export const integrations_list = [
  {
    color: "#2E5CFF",
    icon: <div className="p-1 rounded-full shadow-2xl"><Image src={'/polymarket.png'} height={60} width={60} /></div>,
    clickHandler: "polymarket",
    name: "Polymarket",
    description: "All the data you could want on the world's largest prediction market.",
    tags: ['featured', 'crypto', 'finance', 'trading', 'prediction'],
    live: true,
  },
  {
    color: "#0f172a",
    icon: (
      <div className="p-1 rounded-full shadow-2xl ring-2 ring-slate-600/50">
        <Image src="/polymarket.png" height={60} width={60} alt="" />
      </div>
    ),
    clickHandler: "polymarketHistorical",
    name: "Polymarket Historical",
    description:
      "Load archived Polymarket Parquet from your S3 data lake into the sheet (DuckDB in the browser).",
    tags: ["featured", "crypto", "finance", "trading", "prediction", "data lake"],
    live: true,
  },
  {
    color: "#E7F0DC",
    icon: <div className="p-1 rounded-full shadow-2xl"><Image src={'/coinGecko.png'} height={60} width={60} /></div>,
    clickHandler: "coinGecko",
    name: "CoinGecko",
    description: "Connect to the most reliable and comprehensive cryptocurrency data API for traders and developers.",
    tags: ['featured', 'crypto', 'finance', 'trading', 'coming soon'],
    live: false,
  },
  {
    color: "#000",
    icon: (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <Image src={'/binance.jpeg'} height={60} width={60} className="rounded-full object-contain" />
      </div>
    ),
    clickHandler: "binance",
    name: "Binance",
    description: "Real-time cryptocurrency price data from: Binance",
    tags: ['crypto', 'finance', 'trading'],
    live: true,
  },
  {
    color: "#375BD2",
    icon: (
      <div className="w-full h-full flex items-center justify-center bg-[#375BD2]">
        <Image src={'/chainlink.png'} height={60} width={60} className="rounded-full object-contain" />
      </div>
    ),
    clickHandler: "chainlink",
    name: "Chainlink",
    description: "Real-time cryptocurrency price data from Chainlink — the world's #1 oracle",
    playgroundDescription: "Select a trading pair to start pulling live prices",
    tags: ['crypto', 'finance', 'oracles'],
    live: true,
  },
  {
    color: "#000",
    icon: <Image src={'/geckoDex1.png'} height={75} width={75} />,
    clickHandler: "geckoDex",
    name: "GeckoTerminal from CoinGecko",
    description: "GeckoTerminal is a DeFi and DEX aggregator. Explore the market data & prices of any tokens traded across 110+ blockchain networks across 900+ DEXes – brought to you by the same team behind CoinGecko.",
    tags: ['featured', 'crypto', 'finance', 'trading', 'coming soon'],
    live: false,
  },
  {
    color: "#AE82FE",
    icon: <Image src={'/productHunt.png'} height={80} width={80} />,
    clickHandler: "productHunt",
    name: "Product Hunt",
    description: "Discover the latest tech products, startups, and trends with real-time updates from Product Hunt.",
    tags: ['indieHackers', 'coming July 24', 'coming soon']
  },
  {
    color: "#000",
    icon: <Image src={'/x.png'} height={60} width={60} />,
    clickHandler: "twitter",
    name: "Twitter",
    description: "Access and analyze a wealth of Twitter data, from tweets and user profiles to trends and hashtags.",
    tags: ['social', 'marketing', 'coming soon'],
    live: false,
  },
  {
    color: "#3572EF",
    icon: <Image src={'/wallStreetBets.png'} height={80} width={80} />,
    clickHandler: "wallStreetBets",
    name: "Wall Street Bets",
    description: "Sentiment analysis on the top 50 stocks discussed on Reddit sub- wallStreetBets.",
    tags: ['finance', 'trading', 'coming soon'],
    live: false,
  },
  {
    color: "#FF4500",
    icon: <Image src={'/shortSqueeze.png'} height={60} width={60} />,
    clickHandler: "shortSqueeze",
    name: "Short Squeeze Stock Scanner",
    description: "Get a list of stocks that are in TTM Squeeze or out of squeeze.",
    tags: ['finance', 'trading', 'coming soon'],
    live: false,
  },
  {
    color: "#3AA6B9",
    icon: <Image src={'/sec.png'} height={60} width={60} />,
    clickHandler: "secEdgar",
    name: "SEC EDGAR",
    description: "Access comprehensive financial statements, filings, and disclosures from the SEC's EDGAR database.",
    tags: ['finance', 'regulation', 'compliance','coming soon', 'coming July 24']
  },
  {
    color: "#004080",
    icon: <Image src={'/censusGov.png'} height={60} width={60} />,
    clickHandler: "censusGov",
    name: "Census.gov",
    description: "Retrieve detailed demographic, economic, and population data from the U.S. Census Bureau.",
    tags: ['data', 'demographics', 'population', 'coming soon', 'coming July 24']
  },
  {
    color: "#0099CC",
    icon: <Image src={'/crunchbase.png'} height={60} width={60} className="rounded-md shadow-2xl"/>,
    clickHandler: "crunchbase",
    name: "Crunchbase",
    description: "Get access to comprehensive information about companies, startups, investments, and industry trends.",
    tags: ['business', 'startups', 'investment', 'coming soon', 'coming July 24']
  },
  {
    color: "#FF6600",
    icon: <div className="bg-white p-1 rounded-md shadow-2xl"><Image src={'/hackerNews.png'} height={50} width={50} /></div>,
    clickHandler: "hackerNews",
    name: "Hacker News",
    description: "Stay updated with the latest tech news, discussions, and trends from the Hacker News community.",
    tags: ['tech', 'news', 'community', 'coming soon', 'coming July 24']
  },
  {
    color: "#000080",
    icon: <div className="text-white">USTreasuries</div>,
    clickHandler: "usTreasuries",
    name: "US Treasuries",
    description: "Access real-time and historical data on U.S. Treasury securities, yields, and auctions.",
    tags: ['finance', 'government', 'coming soon', 'coming July 24']
  }
];
