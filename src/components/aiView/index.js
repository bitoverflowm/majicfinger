import { useState, useEffect  } from "react"

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
import { toast } from "sonner"
import { Progress } from "@/components/ui/progress"

import { Textarea } from "@/components/ui/textarea"

import { useMyStateV2  } from '@/context/stateContextV2'

import PreviewGrid from "../gridView/previewGrid"

import { prompts } from "./prompts"
import { PiCornersOutLight } from "react-icons/pi"

import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
  
const AiView = ({playView, setPlayView}) => {
    const contextStateV2 = useMyStateV2()

    const savedDataSets = contextStateV2?.savedDataSets
    const connectedData = contextStateV2?.connectedData
    const setConnectedData = contextStateV2?.setConnectedData
    const loadedDataMeta = contextStateV2?.loadedDataMeta
    const setLoadedDataMeta = contextStateV2?.setLoadedDataMeta

    const [loading, setLoading] = useState()
    const [progress, setProgress] = useState(0); // Progress state

    const [query, setQuery] = useState()
    const [response, setResponse] = useState()

    // Creates a new editor instance.
    const editor = useCreateBlockNote();

    const analyzeData = async () => {
        setLoading(true);
        setProgress(0); // Reset progress bar

        if(connectedData){
            try {
                const timer = setInterval(() => {
                    setProgress((prev) => Math.min(prev + 10, 90)); // Increment progress
                  }, 500);

                let res = await fetch('/api/ai/analyzeData', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ data: connectedData, prompt: query}),
                });
    
                if (res.status === 200) {
                    let resData = await res.json();
                    console.log(resData);
                    setResponse(resData.analysis)
                } else {
                    console.error("Error analyzing data");
                }

                clearInterval(timer);
                setProgress(100); // Complete progress
                
            } catch (error) {
                console.error("Fetch error:", error);
            } finally {
                setLoading(false);
            }
        } else {
            alert("no data connected. Connect some data first")
        }
    }

    const loadDataSheet = async (dataSetId, dataSet) => {
        if(loadedDataMeta && dataSetId === loadedDataMeta._id){
          return
        }else{
          fetch(`/api/dataSets/dataSet/${dataSetId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }).then(response => response.json())
            .then(res =>{
              setConnectedData(res.data.data)
              setLoadedDataMeta(dataSet)
              toast.success(`Data: ${res.data.data_set_name} loaded`, {
                duration: 2000
              })
            })
        }    
      }
    

      useEffect(() => {
        const appendToEditorContent = async () => {
          if (response) {
            // Convert the new response to blocks
            const newBlocks = await editor.tryParseMarkdownToBlocks(response);
    
            // Get the current top-level blocks in the document
            const currentBlocks = editor.document;
            
            if (currentBlocks.length === 0) {
              // If no blocks exist, insert at the start
              editor.insertBlocks(newBlocks, { id: editor.document.children[0].id }, "before");
            } else {
              // Insert the new blocks after the last block
              const lastBlock = currentBlocks[currentBlocks.length - 1];
              editor.insertBlocks(newBlocks, lastBlock.id, "after");
            }
          }
        };
        appendToEditorContent();
      }, [response, editor]);

    return (
        <main className="grid flex-1 gap-4 p-4 py-20 w-full md:grid-cols-2 lg:grid-cols-3">
            <div className="relative hidden flex-col items-start gap-8 md:flex" x-chunk="dashboard-03-chunk-0">
                <form className="grid w-full items-start gap-6">
                    <fieldset className="grid gap-6 rounded-lg border p-4">
                        <legend className="-ml-1 px-1 text-sm font-medium">
                        Control Panel
                        </legend>
                        <div>Pick dataset to work with</div>
                        <Select onValueChange={(value) => {
                                const selectedDataSet = savedDataSets.find(dataSet => dataSet._id === value);
                                if (selectedDataSet) {
                                    loadDataSheet(value, selectedDataSet);
                                }
                                }}>
                                <SelectTrigger
                                    id="model"
                                    className="items-start [&_[data-description]]:hidden"
                                >
                                    <SelectValue placeholder={loadedDataMeta ? loadedDataMeta.data_set_name : "Pick a dataset to work with"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {savedDataSets && savedDataSets.length > 0 && savedDataSets.map(
                                    (dataSet) =>
                                        <SelectItem value={dataSet._id} key={dataSet._id}>
                                        <div className="flex items-start gap-3 text-muted-foreground">
                                            <Rabbit className="size-5" />
                                            <div className="grid gap-0.5">
                                            <p>
                                                {dataSet.data_set_name}
                                            </p>
                                            <p className="text-xs" data-description>
                                                Our fastest model for general use cases.
                                            </p>
                                            </div>
                                        </div>
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                            <div>What do you want to do?</div>
                            <div>
                                <div className="text-xs py-1">General Data Actions</div>
                                <div className="flex flex-wrap gap-2 place-content-center">
                                    {
                                        prompts && prompts.analyzingDatasets.map((p)=>
                                            <Badge onClick={()=>setQuery(p.prompt)} className={`${query && query === p.prompt ? 'bg-lychee_black': 'bg-lychee_green text-black cursor-pointer hover:bg-lychee_black hover:text-lychee_green'}`}>{p.val}</Badge>
                                        )
                                    }
                                </div>
                                <div className="py-1">Financial Data Specific Actions</div>
                                <div className="flex flex-wrap gap-2">
                                    {
                                        prompts.analyzingFinancialData.map((p)=>
                                            <Badge onClick={()=>setQuery(p.prompt)} className={`${query && query === p.prompt ? 'bg-lychee_black': 'bg-lychee_green text-black cursor-pointer hover:bg-lychee_black hover:text-lychee_green'}`}>{p.val}</Badge>
                                        )
                                    }
                                </div>
                            </div>
                            <div onClick={() => analyzeData()} className="bg-lychee_black text-white w-20 text-center rounded-md text-sm py-1 cursor-pointer hover:bg-lychee_blue">Go</div>
                    </fieldset>
                </form>
            </div>
            <div className="relative flex h-full min-h-[50vh] flex-col rounded-xl bg-muted/50 p-4 lg:col-span-2">
                <Badge variant="outline" className="w-16 mb-6">
                Output
                </Badge>
                <div className="flex-1">
                {
                        connectedData && <div className="w-1/2"><PreviewGrid w="w-[660px]" /></div>
                }
                {
                    loading && <Progress value={progress} className="w-[60%]" />
                }
                {
                    response && <div>
                            <BlockNoteView editor={editor} editable={true}/>
                        </div>
                }
                </div>
            </div>
        </main>
        )
    }

export default AiView
  





