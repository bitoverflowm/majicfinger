"use client";

import { useEffect, useId, useRef, useState } from "react";

import IntegrationPlayground from "./integrationPlayground";

import { FaXTwitter } from "react-icons/fa6";
import { FaCat } from "react-icons/fa";
import { Shrink } from "lucide-react";
import { Card, CardContent, CardHeader } from "../ui/card";

import { useMyStateV2  } from '@/context/stateContextV2'
import { useUser } from "@/lib/hooks";


export function IntegrationsView() {
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
          <div className="text-sm flex flex-wrap gap-4 place-items-center place-content-center">
            <Card className="w-full lg:w-1/3">
              <CardHeader className="font-[600]">Why did I build Integrations by Lychee?</CardHeader>
              <CardContent className="text-xs">
                <p className="pb-1 text-muted-foreground">There are thousands of data sources out there that enrich data, and enable you to make better analysis, assessments, and models.</p>
                <p className="pb-1 text-muted-foreground">While Lychee does have a <span className="underline cursor-pointer hover:text-blue-400" onClick={()=>setViewing('scrape')}>scraper</span>, the best, cleanest sources of data are via APIs - straight from the origin.</p>
                <p className="pb-1 text-muted-foreground">Each  API has its own structure data format and networking protocols. Finding and connecting to the right one is difficult and time consiming</p>
                <p className="pb-1 text-muted-foreground">That's where Lychee Integrations comes in</p>
                <p className="pb-1 text-muted-foreground">Lychee will be the world's largest no-code API integrations platform </p>
                <p className="pb-1 text-muted-foreground"> Now You can search for and connect directly to thousands of APIs </p>
              </CardContent>
            </Card>
            <div className="w-full lg:w-3/5 text-center">
              <div className="text-4xl font-black px-4">Pull Data Cleaner Than a Nun's Browser History</div>
              <div className="text-justify leading-loose">
                <div className="text-center py-4">
                  On a mission to connect 100,000+ data sources (APIs) by 2026
                </div>
                <div className="w-28 mx-auto text-center bg-black rounded-md text-white text-xs py-2 cursor-pointer hover:bg-lychee_green hover:text-black" onClick={()=>setViewing('pricing')}>Get Full Access</div>
              </div>
            </div>
            <Card onClick={()=>clickHandler('twitter')} className="w-64 h-44 flex flex-col gap-2 place-items-center place-content-center cursor-pointer hover:bg-lychee_green">
              <div>Twitter</div> <div><FaXTwitter /></div>
              <div></div>
            </Card>
            <Card onClick={()=>clickHandler('wallStreetBets')} className="w-64 h-44 flex flex-col gap-2 place-items-center place-content-center text-center cursor-pointer hover:bg-lychee_green">
              <div>Wall Street Bets</div> <div><FaCat /></div><p className="text-xs text-muted-foreground px-10">Sentiment analysis on the top 50 stocks discussed on Reddit sub- wallStreetBets</p>
            </Card>
            <Card onClick={()=>clickHandler('shortSqueeze')} className="w-64 h-44 flex flex-col gap-2 place-items-center place-content-center text-center cursor-pointer hover:bg-lychee_green">
              <div>Short Squeeze Stock Scanner</div> <div><Shrink /></div><p className="text-xs text-muted-foreground px-10">Get a list of stocks that are in TTM Squeeze or out of squeeze</p>
            </Card>
            <Card onClick={()=>clickHandler('coinGecko')} className="w-64 h-44 flex flex-col gap-2 place-items-center place-content-center text-center cursor-pointer hover:bg-lychee_green">
              <div>CoinGecko </div> <div><Shrink /></div><p className="text-xs text-muted-foreground px-10">Connect to The most reliable and comprehensive cryptocurrency data API for traders and developers</p>
            </Card>
          </div>
      }
    </div>
  );
}
