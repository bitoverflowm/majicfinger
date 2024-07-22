
import {
  ArrowLeft,
    Rabbit,
  } from "lucide-react"
  
import { Badge } from "@/components/ui/badge"


import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

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
                <Badge variant="outline" className="mx-auto sm:absolute sm:right-3 sm:top-3">
                  Here is your data preview
                </Badge>
                <div className="flex-1 pt-2 sm:pt-10">
                  {
                      connectedData && <PreviewGrid />
                  }
                </div>
                <Alert className="text-xs sm:mt-auto bg-lychee_green">
                  <Rabbit className=""/>
                  <AlertTitle>A snippet of your query will appear above. You can then head over to</AlertTitle>
                  <AlertDescription>
                    <div className="text-xs">
                      <div><span className="underline cursor-pointer hover:bg-lychee_green" onClick={()=>setViewing('dataStart')}>Data Sheets</span> to view and work with the full dataset</div>
                      <div><span className="underline cursor-pointer hover:bg-lychee_green" onClick={()=>setViewing('ai')}>AI</span> see what you can discover with AI analysis</div>
                      <div><span className="underline cursor-pointer hover:bg-lychee_green" onClick={()=>setViewing('charts')}>Charts</span> to start 
                      visualizing your data</div>
                      <div><span className="hidden underline cursor-pointer hover:bg-lychee_green" onClick={()=>setViewing('presentation')}>Presentation</span> to start creating your presentation and share with your audience</div></div>
                  </AlertDescription>                
                </Alert>    
              </div>
          </main>
      </div>
    )
  }

  export default IntegrationPlayground
  