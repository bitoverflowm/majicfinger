"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { ExternalLink } from "lucide-react";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"

import IntegrationPlayground from "./integrationPlayground";


const integrations_list = [
  {
    color: "#35af00",
    icon: <div className="p-1 rounded-full shadow-2xl"><Image src={'/coinGecko.png'} height={60} width={60} /></div>,
    clickHandler: "coinGecko",
    name: "CoinGecko",
    description: "Connect to the most reliable and comprehensive cryptocurrency data API for traders and developers.",
    tags: ['featured', 'crypto', 'finance', 'trading']
  },
  {
    color: "#000",
    icon: <Image src={'/coinGecko.png'} height={60} width={60} />,
    clickHandler: "coinGeckoTerminal",
    name: "GeckoTerminal from CoinGecko",
    description: "GeckoTerminal is a DeFi and DEX aggregator. Explore the market data & prices of any tokens traded across 110+ blockchain networks across 900+ DEXes – brought to you by the same team behind CoinGecko.",
    tags: ['featured', 'crypto', 'finance', 'trading', 'coming July 24', 'coming soon']
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
    tags: ['social', 'marketing']
  },
  {
    color: "#3572EF",
    icon: <Image src={'/wallStreetBets.png'} height={80} width={80} />,
    clickHandler: "wallStreetBets",
    name: "Wall Street Bets",
    description: "Sentiment analysis on the top 50 stocks discussed on Reddit sub- wallStreetBets.",
    tags: ['finance', 'trading']
  },
  {
    color: "#FF4500",
    icon: <Image src={'/shortSqueeze.png'} height={60} width={60} />,
    clickHandler: "shortSqueeze",
    name: "Short Squeeze Stock Scanner",
    description: "Get a list of stocks that are in TTM Squeeze or out of squeeze.",
    tags: ['finance', 'trading']
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

  const [playView, setPlayView] = useState()
  const [selectedTag, setSelectedTag] = useState(null);

  const clickHandler = (val) =>{
    setPlayView(val)
  }

  const handleTagClick = (tag) => {
    setSelectedTag(tag);
  };

  return (
    <div className="">
      {
        playView ?
          <div>
              <IntegrationPlayground setPlayView={setPlayView} playView={playView}/>
          </div>
          :
          <div className="p-10 md:p-12 lg:p-16 xl:p-32">
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
                <p className="text-xs text-muted-foreground pb-2">Want to see it in action?</p>
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
                      integration.tags.includes('coming soon') ? <Button disabled onClick={() => clickHandler(integration.clickHandler)}>Coming Soon</Button> :<Button onClick={() => clickHandler(integration.clickHandler)}>Connect</Button>
                    }
                  </CardFooter>
                </Card>
              ))}
            </div>
            <div className="mx-auto text-center py-20 w-1/2">
              <div className="text-4xl font-black px-4"></div>
              <div className="text-4xl font-black px-4">On a mission to connect 100,000+ data sources by the end of 2024</div>
            </div>            
          </div>
      }
    </div>
  );
}


export default IntegrationsView