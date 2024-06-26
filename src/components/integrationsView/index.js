"use client";

import { useEffect, useId, useRef, useState } from "react";

import IntegrationPlayground from "./integrationPlayground";

import { FaXTwitter } from "react-icons/fa6";
import { FaCat } from "react-icons/fa";
import { ExternalLink, Shrink } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";
import { buttonVariants } from "@/components/ui/button"
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"



import { useMyStateV2  } from '@/context/stateContextV2'
import { useUser } from "@/lib/hooks";

const integrations_list = [
  {
    color: "#1DA1F2",
    icon: <FaXTwitter className='w-16 h-16 text-lychee_white' />,
    clickHandler: "twitter",
    name: "Twitter",
    description: "Access and analyze a wealth of Twitter data, from tweets and user profiles to trends and hashtags."
  },
  {
    color: "#FF4500",
    icon: <FaCat className='w-16 h-16 text-lychee_white' />,
    clickHandler: "wallStreetBets",
    name: "Wall Street Bets",
    description: "Sentiment analysis on the top 50 stocks discussed on Reddit sub- wallStreetBets."
  },
  {
    color: "#FFD700",
    icon: <Shrink className='w-16 h-16 text-lychee_white' />,
    clickHandler: "shortSqueeze",
    name: "Short Squeeze Stock Scanner",
    description: "Get a list of stocks that are in TTM Squeeze or out of squeeze."
  },
  {
    color: "#8B4513",
    icon: <Shrink className='w-16 h-16 text-lychee_white' />,
    clickHandler: "coinGecko",
    name: "CoinGecko",
    description: "Connect to the most reliable and comprehensive cryptocurrency data API for traders and developers."
  }
];

const IntegrationsView = () => {
  const contextStateV2 = useMyStateV2()
  const user = useUser()

  const [playView, setPlayView] = useState()
  const [view, setView] = useState()

  const setViewing = contextStateV2?.setViewing 

  const clickHandler = (val) =>{
    !user && setViewing('pricing')
    setPlayView(val)
  }

  return (
    <div className="">
      {
        playView ?
          <div>
              <IntegrationPlayground setPlayView={setPlayView} playView={playView}/>
          </div>
          :
          <div className="p-32">
            <div className="mx-auto grid sm:w-5/6 sm:grid-cols-2 pb-16 gap-6 place-items-center place-content-center">
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
            <div className="">
              <Badge variant="outline">Badge</Badge>
            </div>
            <div className="grid grid-cols-4 gap-10">
              {integrations_list.map((integration, index) => (
                <Card key={index} className="">
                  <CardHeader className={`w-full items-center rounded-md py-20`} style={{backgroundColor: integration.color}}>
                    {integration.icon}
                  </CardHeader>
                  <CardContent className="py-4">
                    <small className="text-sm font-medium leading-none">{integration.name}</small>
                    <p className="text-sm pt-1 text-muted-foreground pb-2">{integration.description}</p>
                  </CardContent>
                  <CardFooter className="flex place-content-end">
                    <Button onClick={() => clickHandler(integration.clickHandler)}>Connect</Button>
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