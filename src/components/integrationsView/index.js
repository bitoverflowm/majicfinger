"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { ExternalLink } from "lucide-react";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BorderBeam } from "@/components/magicui/border-beam";

import { useMyStateV2 } from "@/context/stateContextV2";

/** Integrations that open the datasheet with a right-side API pull panel */
const API_INTEGRATIONS = ["polymarket", "coinGecko", "twitter", "wallStreetBets", "geckoDex"];

const integrations_list = [
  {
    color: "#2E5CFF",
    icon: <div className="p-1 rounded-full shadow-2xl"><Image src={'/polymarket.png'} height={60} width={60} /></div>,
    clickHandler: "polymarket",
    name: "Polymarket",
    description: "All the data you could want on the world’s largest prediction market.",
    tags: ['featured', 'crypto', 'finance', 'trading', 'prediction'],
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

// Extract tags categories
const tags_categories = [...new Set(integrations_list.flatMap(integration => integration.tags))];

const IntegrationsView = () => {
  const [selectedTag, setSelectedTag] = useState(null);
  const context = useMyStateV2();
  const setViewing = context?.setViewing;
  const setIntegrationSidebar = context?.setIntegrationSidebar;
  const setConnectedData = context?.setConnectedData;
  const setConnectedCols = context?.setConnectedCols;

  const clickHandler = (clickHandlerId) => {
    if (API_INTEGRATIONS.includes(clickHandlerId)) {
      setConnectedData?.([]);
      setConnectedCols?.([]);
      setViewing?.("dataStart");
      setIntegrationSidebar?.(clickHandlerId);
    }
  };

  const handleTagClick = (tag) => {
    setSelectedTag(tag);
  };

  return (
    <div className="">
      <div className="pt-4 p-10 md:p-12 lg:p-16 xl:p-32">
            <div className="w-full pb-20">
              <Card className="relative overflow-hidden flex flex-row w-full">
                <BorderBeam size={250} duration={12} colorFrom="#2E5CFF" colorTo="#60a5fa" className="pointer-events-none" />
                <div className="flex w-full min-h-[180px]">
                  <div className="w-48 sm:w-64 shrink-0 flex items-center justify-center bg-[#2E5CFF] p-6">
                    <Image src="/polymarket.png" height={80} width={80} alt="Polymarket" className="rounded-full" />
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-6 relative z-10">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-2xl font-bold">Polymarket</h3>
                        <Badge className="bg-amber-500 text-white shrink-0">New</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">All the data you could want on the world&apos;s largest prediction market.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-4">
                      <Button onClick={() => clickHandler("polymarket")} className="w-fit">Connect</Button>
                      <Button variant="outline" className="w-fit bg-white rounded-md border border-input">Guide</Button>
                      <Button variant="outline" className="w-fit bg-white rounded-md border border-input" asChild>
                        <a href="https://docs.polymarket.com/" target="_blank" rel="noopener noreferrer">View Official Docs</a>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
            <div className="mx-auto grid w-full lg:w-5/6 md:grid-cols-2 pb-16 gap-10 lg:gap-6 place-items-center place-content-center">
              <div className="max-w-xl"> 
                <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
                  All your favorite data sources under one roof.
                </h1> 
              </div>
              <div className="max-w-md">
                <p className="text-sm text-muted-foreground pb-4">
                  Lychee makes it easy by taking care of everything, end-to-end so you can you can focus on <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] mr-2 font-mono font-semibold"> discovering something great. </code> Instantly pull data cleaner than a nun's browser history.
                </p>
                <p className="text-xs text-muted-foreground pb-2">Want to see how to use Lychee Integrations?</p>
                <Link className="text-xs pt-1 pb-1 px-2 underline font-bold bg-lychee_green flex w-96 place-items-center gap-2" rel="noopener noreferrer" target="_blank" href="https://misterrpink.beehiiv.com/p/how-to-use-lychee-integrations-coingecko"><code> CoinGecko API: Pull Crypto Market Data </code> <ExternalLink className="w-4 h-4"/></Link>
              </div>
            </div>
            <div className="p-10 flex flex-wrap gap-1">
              <Badge key={777} variant="outline" onClick={() => handleTagClick()} className="cursor-pointer hover:bg-lychee_green/30">
                all
              </Badge>
              {tags_categories.map((tag, index) => (
                <Badge key={index} variant="outline" onClick={() => handleTagClick(tag)} className={`cursor-pointer hover:bg-lychee_green/30 ${tag === 'coming July 24' && 'bg-lychee_blue text-white shadow-2xl hover:text-lychee_blue'}`}>
                  {tag}
                </Badge>
              ))}
            </div>
            {/* Featured Polymarket card - full width, image left, text right */}
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
              {integrations_list
                .filter(integration => !selectedTag || integration.tags.includes(selectedTag))
                .map((integration, index) => (
                <Card key={index} className="flex flex-col h-full">
                  <CardHeader className={`w-full items-center rounded-md py-20`} style={{backgroundColor: integration.color}}>
                    {integration.icon}
                  </CardHeader>
                  <CardContent className="py-4 grow">
                    <small className="text-sm font-medium leading-none">{integration.name}</small>
                    <p className="text-sm pt-1 text-muted-foreground pb-2">{integration.description}</p>
                  </CardContent>
                  <CardFooter className="flex place-content-end">
                    {
                      !integration.live || integration.tags.includes('coming soon') ? <Button disabled>Coming soon</Button> : <Button onClick={() => clickHandler(integration.clickHandler)}>Connect</Button>
                    }
                  </CardFooter>
                </Card>
              ))}
            </div>
            <div className="mx-auto text-center py-20 w-1/2">
              <div className="text-4xl font-black px-4"></div>
              <div className="text-4xl font-black px-4">On a mission to connect 100,000+ data sources by the end of 2026</div>
            </div>
      </div>
    </div>
  );
}


export default IntegrationsView