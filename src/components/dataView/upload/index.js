
import Link from "next/link"
import { useState } from "react"

import * as XLSX from 'xlsx'

import { useMyStateV2  } from '@/context/stateContextV2'

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

import { Carrot, Citrus, Ghost, Hexagon, Pickaxe, Sprout } from "lucide-react"

import { Alert } from '@/components/ui/alert'
import { Progress } from "@/components/ui/progress"


const Upload = ({user}) => {
    const contextStateV2 = useMyStateV2()

    const connectedData = contextStateV2?.connectedData
    const setConnectedData = contextStateV2?.setConnectedData
    const setViewing = contextStateV2?.setViewing
    const tempData = contextStateV2?.tempData
    const setTempData = contextStateV2?.setTempData
    const dataConnected = contextStateV2?.dataConnected
    const setDataConnected = contextStateV2?.setDataConnected

    const multiSheetFlag = contextStateV2?.multiSheetFlag
    const setMultiSheetFlag = contextStateV2?.setMultiSheetFlag
    const multiSheetData = contextStateV2?.multiSheetData
    const setMultiSheetData = contextStateV2?.setMultiSheetData
    const dataTypes = contextStateV2?.dataTypes
    const setDataTypes = contextStateV2?.setDataTypes
    const setSheetNames = contextStateV2?.setSheetNames


    const [loading, setLoading] = useState()
    const [progress, setProgress] = useState(0); // Progress state

    const handleFileUpload = (e) => {
        setLoading(true)
        setProgress(0); // Reset progress bar
        const timer = setInterval(() => {
            setProgress((prev) => Math.min(prev + 10, 90)); // Increment progress
        }, 3000);


        const file = e.target.files[0]
        
        if (!file) {
            return; // Exit if no file is selected
        }

        const fileType = file.name.split('.').pop().toLowerCase();

        const reader = new FileReader();

        reader.onload = (e) => {
            let data = e.target.result;
            
            const parseSheet = (worksheet) => {
                const rows = XLSX.utils.sheet_to_json(worksheet, { raw: true });
                const firstRow = rows[0];
                const dataTypes = {};
    
                for (let key in firstRow) {
                    dataTypes[key] = typeof firstRow[key];
                }
    
                return { rows, dataTypes };
            };
            
            if (fileType === 'csv') {
                // If the file is a CSV, use this block to process it
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const { rows, dataTypes } = parseSheet(sheet);
                console.log('rows', rows)
                console.log('datatypes', dataTypes)
                setMultiSheetFlag(false);
                setMultiSheetData(null); // No multi-sheet data
                setConnectedData(rows);
                setDataTypes(dataTypes);
                setDataConnected(true);
            } else if (fileType === 'xlsx') {
                const workbook = XLSX.read(data, { type: 'binary' });
                const allSheetsData = {};
                const allSheetsDataTypes = {};

                workbook.SheetNames.forEach(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    const { rows, dataTypes } = parseSheet(worksheet);
                    allSheetsData[sheetName] = rows;
                    allSheetsDataTypes[sheetName] = dataTypes;
                });

                const sheetNames = workbook.SheetNames;
                setSheetNames(sheetNames)

                if (sheetNames.length > 1) {
                    console.log("we do have multiple sheets")
                    setMultiSheetFlag(true);
                    setMultiSheetData(allSheetsData);
                    setConnectedData(allSheetsData[sheetNames[0]]);
                    setDataTypes(allSheetsDataTypes[sheetNames[0]]);
                } else {
                    setMultiSheetFlag(false);
                    setMultiSheetData(null);
                    setConnectedData(allSheetsData[sheetNames[0]]);
                    setDataTypes(allSheetsDataTypes[sheetNames[0]]);
                }
                setDataConnected(true);
            }
        };
        // Decide how to read the file based on its type
        if (fileType === 'csv') {
            reader.readAsText(file); // Use readAsArrayBuffer for both CSV and XLSX,
                                            // but process CSV data differently
        } else if (fileType === 'xlsx') {
            reader.readAsArrayBuffer(file); // Use readAsArrayBuffer for XLSX
        }
        clearInterval(timer);
        setProgress(100); // Complete progress
        setLoading(false);
    }

    return(
        <div className='pr-10 pl-4 pb-10 sm:w-full'>
            <Card className="my-10 sm:mx-auto max-w-[700px]">
                <CardHeader>
                    <CardTitle>Upload Your Data</CardTitle>
                    <CardDescription>
                        *must be csv or excel
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Input className=""
                                id="file-upload" type="file" accept=".xlsx, .csv" onChange={handleFileUpload}
                            />
                    {
                        loading && <Progress value={progress} className="w-[60%]" />
                    }
                    {
                        dataConnected && <div className="py-10">
                                            <h4 className="scroll-m-20 text-xl font-semibold tracking-tight bg-lychee_green pl-1">Data Successfully Uploaded.</h4>
                                            <p className="leading-7 [&:not(:first-child)]:mt-2">What's next? </p>
                                            <p className="text-sm text-muted-foreground">Click one of the options below:</p>
                                            <ul className="my-6 ml-6 list-disc [&>li]:mt-2 text-xs">
                                                <li><div className='underline text-muted-foreground cursor-pointer hover:bg-lychee_green' onClick={()=>setViewing('dataStart')}>View and work with your data using Data Sheet</div></li>
                                                <li><div className='underline text-muted-foreground cursor-pointer hover:bg-lychee_green' onClick={()=>setViewing('charts')}>Start Charting right away</div></li>
                                                <li><div className='underline text-muted-foreground cursor-pointer hover:bg-lychee_green' onClick={()=>setViewing('presentation')}>Present your work</div></li>
                                                <li><div className='underline text-muted-foreground cursor-pointer hover:bg-lychee_green' onClick={()=>setViewing('ai')}>See what you can learn with Lyehee's AI Athena</div></li>
                                            </ul>
                                        </div>
                    }
                </CardContent>
            </Card>
            <div className="sm:mx-auto max-w-[700px] text-center">
                <small className="text-sm font-medium leading-none">Things to note:</small>
            </div> 
            <Alert className="mt-4 sm:mx-auto max-w-[700px]">
                <div className="flex gap-2 place-items-center"><Carrot className="w-8 h-8"/><div className="">
                    <p className="text-xs"> Garbage In Garbage Out</p>
                    <p className="text-xs text-muted-foreground">The cleaner the data you provide, the better the results.</p>
                </div>
                </div>
            </Alert>
            <Alert className="mt-1 sm:mx-auto max-w-[700px]">
                <div className="flex gap-2 place-items-center"><Citrus className="w-8 h-8 text-lychee_red"/><div className="">
                    <p className="text-xs"> Multi-Sheets</p>
                    <p className="text-xs text-muted-foreground">We now handle multi-sheets! So go ahead, and upload all the sheets you want</p>
                </div>
                </div>
            </Alert> 
            <Alert className="mt-1 sm:mx-auto max-w-[700px]">
                <div className="flex gap-2 place-items-center"><Ghost className="w-8 h-8"/>
                    <div className="">
                        <p className="text-xs"> Tips: </p>
                        <p className="text-xs text-muted-foreground">Keep columns names clean (".", "quotes", etc will not work)</p>
                        <p className="text-xs text-muted-foreground">Underscore "_" and hypens "-" are acceptable</p>
                    </div>
                </div>
            </Alert>
            <div className="sm:mx-auto max-w-[700px] text-center pt-6 pb-4">
                <small className="text-sm font-medium leading-none">Need some Data to play with?</small>
                <p className="text-sm text-muted-foreground">You don't have to go anywhere... <br/> Pick any of the following options</p>
            </div> 
            <Alert className="mt-1 sm:mx-auto max-w-[700px] hover:bg-lychee_green/40 cursor-pointer" onClick={()=>setViewing('integrations')}>
                <div className="flex gap-2 place-items-center">
                    <div className="">
                        <p className="text-xs">Integrations: </p>
                        <p className="text-xs text-muted-foreground">Connect directly to your favorite data sources</p>
                        <div className="flex flex-wrap gap-1">
                            <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                                twitter
                            </code> <code className="relative rounded bg-yellow-200/40 px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                                coingecko
                            </code><code className="relative rounded bg-orange-400/60 px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                                reddit
                            </code>
                            <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                                twitter
                            </code> <code className="relative rounded bg-yellow-200/40 px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                                coingecko
                            </code><code className="relative rounded bg-orange-400/60 px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                                reddit
                            </code><code className="relative rounded bg-blue-200/40 px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                                sec edgar data
                            </code><code className="relative rounded bg-gray-500/40 px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                                wallstreet Bets
                            </code><code className="relative rounded bg-blue-400/60 px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                                Iceland Data
                            </code><code className="relative rounded bg-purple-500/40 px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                                NBA Stats
                            </code><code className="relative rounded bg-pink-400/40 px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                                Product Hunt
                            </code><code className="relative rounded bg-gradient-to-r from-yellow-400 via-pink-500 to-red-500 px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                                Instagram
                            </code><code className="relative rounded bg-gray-800/60 px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                                HackerNews
                            </code><code className="relative rounded bg-blue-500/40 px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                                USGS Water Services
                            </code><code className="relative rounded bg-red-500/60 px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                                USGS Earthquake Hazard Data
                            </code><code className="relative rounded bg-green-400/40 px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                                Nutritioniz
                            </code><code className="relative rounded bg-indigo-500/40 px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                                Census.gov
                            </code><code className="relative rounded bg-blue-300/40 px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                                OpenWeather API
                            </code><code className="relative rounded bg-blue-700/40 px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                                LinkedIn
                            </code>
                        </div>

                    </div>
                </div>
            </Alert> 
            <Alert className="mt-1 sm:mx-auto max-w-[700px] hover:bg-lychee_green/40 cursor-pointer" onClick={()=>setViewing('newSheet')}>
                <div className="flex gap-2 place-items-center"><Hexagon className="w-8 h-8"/>
                    <div className="">
                        <p className="text-xs">Clean Sheet: </p>
                        <p className="text-xs text-muted-foreground">Start with a blank sheet</p>                        
                    </div>
                </div>
            </Alert> 
            <Alert className="mt-1 sm:mx-auto max-w-[700px] hover:bg-lychee_green/40 cursor-pointer" onClick={()=>setViewing('scrape')}>
                <div className="flex gap-2 place-items-center"><Pickaxe className="w-8 h-8"/>
                    <div className="">
                        <p className="text-xs">Scrape: </p>
                        <p className="text-xs text-muted-foreground">Scrape any website at all</p>
                    </div>
                </div>
            </Alert> 
            <Alert className="mt-1 sm:mx-auto max-w-[700px] hover:bg-lychee_green/40 cursor-pointer" onClick={()=>setViewing('generate')}>
                <div className="flex gap-2 place-items-center"><Sprout className="w-8 h-8"/>
                    <div className="">
                        <p className="text-xs">Generate Some Data: </p>
                        <p className="text-xs text-muted-foreground">Generate some insanely realistic data. The best in the biz</p>
                    </div>
                </div>
            </Alert> 
        </div>
    )

}

export default Upload