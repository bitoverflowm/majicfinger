import { useState, useEffect  } from "react"
import { useUser } from '@/lib/hooks';

import {
  ArrowLeft,
    Bird,
    ChevronDown,
    ChevronUp,
    Rabbit,
    Turtle,
  } from "lucide-react"
  
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
import * as Collapsible from '@radix-ui/react-collapsible';
  
const AiView = ({playView, setPlayView}) => {
    const user = useUser()

    const contextStateV2 = useMyStateV2()

    const savedDataSets = contextStateV2?.savedDataSets
    const connectedData = contextStateV2?.connectedData
    const setConnectedData = contextStateV2?.setConnectedData
    const loadedDataMeta = contextStateV2?.loadedDataMeta
    const setLoadedDataMeta = contextStateV2?.setLoadedDataMeta
    const setViewing = contextStateV2?.setViewing

    const [loading, setLoading] = useState()
    const [progress, setProgress] = useState(0); // Progress state

    const [query, setQuery] = useState()
    const [response, setResponse] = useState()

    // Creates a new editor instance.
    const editor = useCreateBlockNote();

    // AI Assistant and threads management
    const [threadId, setThreadId] = useState()
    const [assistantId, setAssistantId] = useState()
    const [usage, setUsage] = useState()
    const [fileId, setFileid] = useState()
    const [analyzedData, setAnalyzedData] = useState()
    const [keepThread, setKeepThread] = useState()
    const [backup, setBackup] = useState()
    const [openSpecial, setOpenSpecial] = useState(true);
    const [openGeneral, setOpenGeneral] = useState(false);
    const [openModify, setOpenModify] = useState(false);
    const [openFinancial, setOpenFinancial] = useState(false);

    const handleSwitchChange = () => {
        setKeepThread(!keepThread);
    };


    //this is actaully technically the assistant cretion step, where teh main data files are added
    const analyzeData = async () => {
        //alert('hello')
        setLoading(true);
        setProgress(0); // Reset progress bar
        if(user){
            if(connectedData){
                try {
                    const timer = setInterval(() => {
                        setProgress((prev) => Math.min(prev + 10, 90)); // Increment progress
                      }, 3000);
    
                    let res = await fetch('/api/ai/analyzeData', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ data: !(keepThread) && connectedData, prompt: query, assistant_id: assistantId && assistantId, thread_id: threadId && keepThread && threadId, user_id: user.userId, data_set_id: loadedDataMeta._id }),
                    });
        
                    if (res.status === 200) {
                        let resData = await res.json();
                        console.log(resData);
                        setResponse(resData.analysis)
                        setFileid(resData.file_id)
                        setAssistantId(resData.assistant_id)
                        setThreadId(resData.thread_id)
                        setUsage(resData.usage)
                        setAnalyzedData(resData.data_set_id)
                        setBackup(resData.backup)
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
        }else{
            alert("Sorry! We need to protect this platform against bots. Please register. You will get a bag of free tokens to play with.")
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
        <main className="grid flex-1 gap-4 p-4 py-20 w-full md:grid-cols-2 lg:grid-cols-5">
            <div className="relative flex-col col-span-2 xl:col-span-1 items-start gap-8 md:flex max-w-96" x-chunk="dashboard-03-chunk-0">
                <form className="grid w-full min-h-screen items-start gap-6">
                    <fieldset className="grid gap-2 rounded-lg border p-4">
                        <legend className="-ml-1 px-1 text-xs">
                        Control Panel
                        </legend>
                        <Select onValueChange={(value) => {
                            if(value==='create'){setViewing('dataStart')}
                            else{
                                const selectedDataSet = savedDataSets.find(dataSet => dataSet._id === value);
                                if (selectedDataSet) {
                                    loadDataSheet(value, selectedDataSet);
                                }
                            }
                            }}>
                                <SelectTrigger
                                    id="model"
                                    className="items-start [&_[data-description]]:hidden"
                                >
                                    <SelectValue placeholder={loadedDataMeta ? loadedDataMeta.data_set_name : "Pick a dataset to work with"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {savedDataSets && savedDataSets.length > 0 
                                        ? savedDataSets.map(
                                            (dataSet) =>
                                                <SelectItem value={dataSet._id} key={dataSet._id}>
                                                    <div className="flex items-start gap-3 text-muted-foreground">
                                                        {dataSet.data_set_name}
                                                    </div>
                                                </SelectItem>
                                            )
                                        : <SelectItem value={'create'} key={99}>
                                                <div className="items-start text-muted-foreground">
                                                    You don't have any data. Click here to fix that
                                                </div>
                                            </SelectItem>
                                    }
                                </SelectContent>
                        </Select>
                        { threadId && <div className="flex items-center space-x-2">
                                        <Switch id="airplane-mode" checked={keepThread} onCheckedChange={handleSwitchChange}/>
                                        <Label htmlFor="airplane-mode">Keep Current Thread?</Label>
                                    </div>
                        }
                        <div className="text-xs pt-2 font-black">Select an action</div>
                        <div className="text-xs text-slate-600 font-[300]">(This is just a taster of what is to come...)</div>
                        <div className="rounded-lg border px-2 py-1">
                            <Collapsible.Root open={openSpecial} onOpenChange={setOpenSpecial} className="">
                                <Collapsible.Trigger asChild>
                                    <div className="py-1 text-xs flex w-full place-items-center cursor-pointer"> <div className="w-full text-xs">Special Actions</div> {openSpecial ? <ChevronUp className="float-right h-5 w-5"/> : <ChevronDown className="h-4 w-4"/>}</div>
                                </Collapsible.Trigger>
                                <Collapsible.Content>
                                    <div className="flex flex-wrap gap-2 pb-2 pt-2">
                                        {
                                            prompts && prompts.uniqueActions.map((p)=>
                                                <Badge onClick={()=>setQuery(p.prompt)} className={`text-[10px] ${query && query === p.prompt ? 'bg-lychee_black': 'cursor-pointer bg-white border border-slate-200 text-black font-[400] hover:bg-lychee_black hover:text-lychee_white'}`}>{p.val}</Badge>
                                            )
                                        }
                                    </div>
                                </Collapsible.Content>
                            </Collapsible.Root>
                        </div>
                        <div className="rounded-lg border px-2 py-1">
                            <Collapsible.Root open={openGeneral} onOpenChange={setOpenGeneral} className="">
                                <Collapsible.Trigger asChild>
                                    <div className="py-1 text-xs flex w-full place-items-center cursor-pointer"> <div className="w-full text-xs">General Data Actions</div> {openGeneral ? <ChevronUp className="float-right h-5 w-5"/> : <ChevronDown className="h-4 w-4"/>}</div>
                                </Collapsible.Trigger>
                                <Collapsible.Content>
                                    <div className="flex flex-wrap gap-2 pb-2 pt-2">
                                        {
                                            prompts && prompts.analyzingDatasets.map((p)=>
                                                <Badge onClick={()=>setQuery(p.prompt)} className={`text-[10px] ${query && query === p.prompt ? 'bg-lychee_black': 'cursor-pointer bg-white border border-slate-200 text-black font-[400] hover:bg-lychee_black hover:text-lychee_white'}`}>{p.val}</Badge>
                                            )
                                        }
                                    </div>
                                </Collapsible.Content>
                            </Collapsible.Root>
                        </div>
                        <div className="rounded-lg border px-2 py-1">
                            <Collapsible.Root open={openModify} onOpenChange={setOpenModify} className="">
                                <Collapsible.Trigger asChild>
                                    <div className="py-1 text-xs flex w-full place-items-center cursor-pointer"> <div className="w-full text-xs">Modify Data</div> {openModify ? <ChevronUp className="float-right h-5 w-5"/> : <ChevronDown className="h-4 w-4"/>}</div>
                                </Collapsible.Trigger>
                                <Collapsible.Content>
                                    <div className="flex flex-wrap gap-2 pb-2 pt-2">
                                        {
                                            prompts && prompts.modifyData.map((p)=>
                                                <Badge onClick={()=>setQuery(p.prompt)} className={`text-[10px] ${query && query === p.prompt ? 'bg-lychee_black': 'cursor-pointer bg-white border border-slate-200 text-black font-[400] hover:bg-lychee_black hover:text-lychee_white'}`}>{p.val}</Badge>
                                            )
                                        }
                                    </div>
                                </Collapsible.Content>
                            </Collapsible.Root>
                        </div>
                        <div className="rounded-lg border px-2 py-1">
                            <Collapsible.Root open={openFinancial} onOpenChange={setOpenFinancial} className="">
                                <Collapsible.Trigger asChild>
                                    <div className="py-1 text-xs flex w-full place-items-center cursor-pointer"> <div className="w-full text-xs">Financial Data Specific Action</div> {openFinancial ? <ChevronUp className="float-right h-5 w-5"/> : <ChevronDown className="h-4 w-4"/>}</div>
                                </Collapsible.Trigger>
                                <Collapsible.Content>
                                    <div className="flex flex-wrap gap-2 pb-2 pt-2">
                                        {
                                            prompts && prompts.analyzingFinancialData.map((p)=>
                                                <Badge onClick={()=>setQuery(p.prompt)} className={`text-[10px] ${query && query === p.prompt ? 'bg-lychee_black': 'cursor-pointer bg-white border border-slate-200 text-black font-[400] hover:bg-lychee_black hover:text-lychee_white'}`}>{p.val}</Badge>
                                            )
                                        }
                                    </div>
                                </Collapsible.Content>
                            </Collapsible.Root>
                        </div>


                        <div className="hidden text-xs py-1">Visualizations</div>
                        <div className="hidden flex flex-wrap gap-2">
                            {
                                prompts && prompts.visualizations.map((p)=>
                                    <Badge onClick={()=>setQuery(p.prompt)} className={`${query && query === p.prompt ? 'bg-lychee_black': 'bg-lychee_green text-black cursor-pointer hover:bg-lychee_black hover:text-lychee_green'}`}>{p.val}</Badge>
                                )
                            }
                        </div>
                        <div onClick={() => analyzeData()} className="bg-lychee_black text-white w-20 text-center rounded-md text-sm py-1 cursor-pointer hover:bg-lychee_blue">Go</div>
                    </fieldset>
                </form>
            </div>
            <div className="relative flex h-full min-h-[50vh] w-full flex-col rounded-xl bg-muted/50 p-4 lg:col-span-3 xl:col-span-4">
                <Badge variant="outline" className="w-16 mb-6">
                Output
                </Badge>
                <div className="flex-1 w-full">
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
  





