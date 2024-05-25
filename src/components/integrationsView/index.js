"use client";

import { useEffect, useId, useRef, useState } from "react";

import IntegrationPlayground from "./integrationPlayground";

import { FaXTwitter } from "react-icons/fa6";
import { FaCat } from "react-icons/fa";
import { Shrink } from "lucide-react";



export function IntegrationsView() {
  const [playView, setPlayView] = useState()

  return (
    <div>
      {
        playView ?
          <div>
              <IntegrationPlayground setPlayView={setPlayView} playView={playView}/>
            </div>
          :
          <>
            <div className="text-justify leading-loose">
              <div className="text-4xl font-black text-center py-8">
                On a mission to connect 100,000 + data sources by 2026
              </div>
            </div>
            <div>
                <div className="">Connect to any of the following:</div>
                <div className="mx-auto w-9/12 grid grid-cols-3 rounded-xl gap-10 bg-muted/50 p-20">
                        <div className="p-10 text-sm object-cover transition-all hover:scale-105 cursor-pointer" onClick={()=>setPlayView('twitter')}>
                            <div className='py-4'><FaXTwitter /></div>
                            <h3 className="pb-1 font-medium leading-none">Twitter / X</h3>
                            <p className="text-xs text-muted-foreground">Upload your own .csv, excel</p>
                            <p className="pt-1 text-xs text-muted-foreground">.json, and more coming soon</p>
                        </div>
                        <div className="p-10 text-sm object-cover transition-all hover:scale-105 cursor-pointer" onClick={()=>setPlayView('wallStreetBets')}>
                            <div className='py-4'><FaCat /></div>
                            <h3 className="pb-1 font-medium leading-none">Wall Street Bets</h3>
                            <p className="text-xs text-muted-foreground">Get the sentiment of the to 50 stocks discussed on Reddit subreddit - wallStreetBets</p>
                            <p className="pt-1 text-xs text-muted-foreground">Also view historical data</p>
                        </div>
                        <div className="p-10 text-sm object-cover transition-all hover:scale-105 cursor-pointer" onClick={()=>setPlayView('shortSqueeze')}>
                            <div className='py-4'><Shrink /></div>
                            <h3 className="pb-1 font-medium leading-none">Short Squeeze Stock Scanner</h3>
                            <p className="text-xs text-muted-foreground">Get a list of stocks that are in TTM Squeeze or out of squeeze</p>
                        </div>
                    </div>
            </div>
            <div>
                Some Example flows
            </div>
            <div>
                Integrations coming soon
            </div>
          </>
      }
    </div>
  );
}
