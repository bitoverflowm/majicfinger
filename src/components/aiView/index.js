import { useState } from "react"

import {
  ArrowLeft,
    Bird,
    Rabbit,
    Turtle,
  } from "lucide-react"
  
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import { Textarea } from "@/components/ui/textarea"

import { useMyStateV2  } from '@/context/stateContextV2'

import PreviewGrid from "../gridView/previewGrid"

  
const AiView = ({playView, setPlayView}) => {
    const contextStateV2 = useMyStateV2()

    const connectedData = contextStateV2?.connectedData || [];
    const setConnectedData = contextStateV2?.setConnectedData || [];
    const [loading, setLoading] = useState()

    const analyzeData = async () => {
        setLoading(true);
        if(connectedData){
            try {
                let res = await fetch('/api/ai/analyzeData', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ data: connectedData}),
                });
    
                if (res.status === 200) {
                    let resUserData = await res.json();
                    console.log(resUserData);
                } else {
                    console.error("Error analyzing data");
                }
                
            } catch (error) {
                console.error("Fetch error:", error);
            } finally {
                setLoading(false);
            }
        } else {
            alert("no data connected. Connect some data first")
        }
    }

    return (
      <div className="grid h-screen w-full pl-[56px]">
        <div className="flex flex-col">
          <div className="text-xs hover:text-lychee_blue cursor-pointer flex place-item-center py-2" onClick={()=>setPlayView()}> <ArrowLeft className="h-4 w-4"/> Go Back</div>
          <main className="grid flex-1 gap-4 overflow-auto p-4 md:grid-cols-2 lg:grid-cols-3">
            <div
              className="relative hidden flex-col items-start gap-8 md:flex" x-chunk="dashboard-03-chunk-0"
            >
              <form className="grid w-full items-start gap-6">
                <fieldset className="grid gap-6 rounded-lg border p-4">
                  <legend className="-ml-1 px-1 text-sm font-medium">
                    Settings
                  </legend>
                  <div>What data do you want to analyze? </div>
                  <div onClick={()=>analyzeData()}>go</div>
                </fieldset>
              </form>
            </div>
            <div className="relative flex h-full min-h-[50vh] flex-col rounded-xl bg-muted/50 p-4 lg:col-span-2">
              <Badge variant="outline" className="absolute right-3 top-3">
                Output
              </Badge>
              <div className="flex-1">
                {
                     connectedData && <PreviewGrid />
                }
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  export default AiView
  