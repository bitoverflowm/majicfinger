
import {
  ArrowLeft,
  } from "lucide-react"
  
import { Badge } from "@/components/ui/badge"


import { useMyStateV2  } from '@/context/stateContextV2'

import PreviewGrid from "@/components/gridView/previewGrid"
import WallStreetBets from "./integrations/wallStreetBets"
import CoinGecko from "./integrations/coinGecko"
import Twitter from "./integrations/twitter"
import GeckoDex from "./integrations/geckoDex"
  
const IntegrationPlayground = ({playView, setPlayView}) => {
    const contextStateV2 = useMyStateV2()

    const connectedData = contextStateV2?.connectedData || [];
    const setConnectedData = contextStateV2?.setConnectedData || [];
    const setViewing = contextStateV2?.setViewing

    return (
      <div className="py-3 px-2 sm:px-5">
          <div className="w-48 text-[10px] sm:text-xs hover:bg-lychee_green/40 cursor-pointer flex place-item-center gap-2 py-2 px-2" onClick={()=>setPlayView()}> <ArrowLeft className="h-4 w-4"/> Go Back</div>
          <main className="grid grid-cols-1 pl-2 md:grid-cols-3 gap-4 sm:w-full">
              <div className="relative flex-col items-start gap-8 md:flex" x-chunk="dashboard-03-chunk-0">
                <form className="w-full">
                  <fieldset className="rounded-lg border px-4 py-2">
                    <legend className="-ml-1 px-1 text-xs font-medium">Select an action</legend>
                    {
                      playView === 'twitter' && <Twitter setConnectedData={setConnectedData}/>
                      
                    }
                    {
                      playView === "wallStreetBets" &&
                        <>
                          <WallStreetBets setConnectedData={setConnectedData}/>
                        </>
                    }
                    { 
                      playView === "coinGecko" &&
                        <>
                          <CoinGecko setConnectedData={setConnectedData}/>
                        </>
                    }
                    {
                      playView === 'geckoDex' &&
                        <>
                          <GeckoDex setConnectedData={setConnectedData}/>
                        </>
                    }
                    
                  </fieldset>
                </form>
              </div>
              <div className="relative flex flex-col min-h-[90vh] rounded-xl bg-muted/30 p-2 sm:p-4 sm:col-span-2">
                <div className="flex place-items-center place-content-center gap-2">
                  <div className="text-[10px] xl:text-xs">Next steps: </div>
                  <Badge className="text-[8px] xl:text-xs bg-[#402E7A] text-white cursor-pointer" onClick={()=>setViewing('dataStart')}>
                    View Full Data Set 
                  </Badge>
                  <Badge className="text-[8px] xl:text-xs bg-[#4C3BCF] text-white cursor-pointer" onClick={()=>setViewing('charts')}>
                    Start Charting
                  </Badge>
                  <Badge className="text-[8px] xl:text-xs bg-[#4B70F5] text-white cursor-pointer" onClick={()=>setViewing('ai')}>
                    Analyze/Create a report with AI
                  </Badge>
                  <Badge className="text-[8px] xl:text-xs bg-[#3DC2EC] text-slate-800 cursor-pointer" onClick={()=>setViewing('presentation')}>
                    Generate a Full Website
                  </Badge>
                </div>
                <div variant="outline" className="mx-auto text-xs flex place-items-center gap-1 pt-3 py-1">
                    <div className="text-xs">Below is a Data preview of the first 10 rows</div>
                </div>
                <div className="flex-1 pt-2">
                  {
                      connectedData && <PreviewGrid h="h-[650px]" w="w-full"/>
                  }
                </div> 
              </div>
          </main>
      </div>
    )
  }

  export default IntegrationPlayground
  