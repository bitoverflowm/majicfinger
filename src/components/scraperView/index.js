import { useState, useEffect  } from "react"
import { useUser } from '@/lib/hooks';

  
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"


import { toast } from "sonner"
import { Progress } from "@/components/ui/progress"


import { useMyStateV2  } from '@/context/stateContextV2'

import PreviewGrid from "../gridView/previewGrid"

  
const ScraperView = ({playView, setPlayView}) => {
    const user = useUser()

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

    // AI Assistant and threads management
    const [threadId, setThreadId] = useState()
    const [assistantId, setAssistantId] = useState()
    const [usage, setUsage] = useState()
    const [fileId, setFileid] = useState()
    const [analyzedData, setAnalyzedData] = useState()
    const [keepThread, setKeepThread] = useState(true)
    const [backup, setBackup] = useState()

    const [step, setStep] = useState()
    const [columns, setColumns] = useState([])
    const [scrapedData, setScrapedData] = useState()

    const handleSwitchChange = () => {
        setKeepThread(!keepThread);
    };

    const handleTextareaChange = (e) => {
        const inputText = e.target.value;
        const wordsArray = inputText.split(',').map(word => word.trim()).filter(word => word !== '');
        setColumns(wordsArray);
    };


    //this is actaully technically the assistant cretion step, where teh main data files are added
    const scrapePage = async () => {
        setLoading(true);
        setProgress(0); // Reset progress bar
        if(user){
            try {
                const timer = setInterval(() => {
                    setProgress((prev) => Math.min(prev + 10, 90)); // Increment progress
                }, 3000);

                let res = await fetch('/api/ai/scrapeImage', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ imageUrl: response.data.screenshot.url, columns: columns, user_id: user.userId }),
                });

                if (res.status === 200) {
                    let resData = await res.json();
                    console.log("successful parsing");
                    console.log("extracting data: ", resData.response.content);

                    // Extract and convert JSON string from response content
                    const jsonString = resData.response.content.replace("```json\n", "").replace("\n```", "");
                    console.log("the json string: ", jsonString);

                    const data = JSON.parse(jsonString);
                    console.log(data);
                    setConnectedData(data);
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
        }else{
            alert("Sorry! We need to protect this platform against bots. Please register. You will get a bag of free tokens to play with.")
        }
    }

    const scrapeUrl = async (url) => {
        setLoading(true);
        setProgress(0); // Reset progress bar
        if(user){
            try {
                const timer = setInterval(() => {
                    setProgress((prev) => Math.min(prev + 10, 90)); // Increment progress
                }, 3000);

                let res = await fetch(`/api/scraper/fromUrl?target=${encodeURIComponent(url)}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (res.status === 200) {
                    let resData = await res.json();
                    console.log(resData);
                    setResponse(resData);
                    setStep(1)
                } else {
                    console.error("Error scraping URL");
                }
                clearInterval(timer);
                setProgress(100); // Complete progress
            } catch (error) {
                console.error("Fetch error:", error);
            } finally {
                setLoading(false);
            }
        }else{
            alert("Sorry! We need to protect this platform against bots. Please register. You will get a bag of free tokens to play with.")
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        scrapeUrl(query);
    };


    return (
        <main className="grid flex-1 gap-4 p-4 py-20 w-full md:grid-cols-2 lg:grid-cols-3">
            <div className="relative hidden flex-col items-start gap-8 md:flex" x-chunk="dashboard-03-chunk-0">
                <form className="grid w-full items-start gap-6" onSubmit={handleSubmit}>
                    <fieldset className="grid gap-6 rounded-lg border p-4">
                        <legend className="-ml-1 px-1 text-sm font-medium">
                            Control Panel
                        </legend>
                        <div>Enter any url</div>
                        <div className="flex items-center space-x-2">
                            <div className="grid flex-1 gap-2">
                                <Label htmlFor="link" className="sr-only">
                                Link
                                </Label>
                                <Input
                                    id="link"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                />
                            </div>
                            <Button type="submit" size="sm" className="px-3">
                                Scrape
                            </Button>
                        </div>
                        {step === 1 && <div className="">Does the screenshot to the right look correct? <Button onClick={()=>setStep(2)}>Yes</Button> </div>}
                        {step === 2 && <div>
                            <div>
                                What speficically do you want to scrape? Use a list of words, eg [bitcoinPrice, ethereumPrice, tradingVolume, colors, etc]. These will be your columns if you were to use a flat spreadsheet. 
                            </div>
                            <div>
                                <div className="grid gap-3">
                                    <Label htmlFor="content">Content</Label>
                                    <Textarea id="content" placeholder="You are a..." onChange={handleTextareaChange} />
                                </div>
                            </div>
                            <div>Target Column Names: {JSON.stringify(columns)}</div>

                            <div onClick={()=>scrapePage()} className="bg-black py-1 px-1 hover:bg-slate-800 cursor-pointer text-white">Harvest</div>
                            </div>}
                        
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
                    scrapedData && scrapedData
                }
                {response && response.data && response.data.screenshot && (
                        <div>
                            <img src={response.data.screenshot.url} alt="Screenshot" />
                        </div>
                    )}

                </div>
            </div>
        </main>
        )
    }

export default ScraperView
  





