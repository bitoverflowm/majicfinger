import Image from 'next/image'

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
import { Label } from "@/components/ui/label"

import PreviewGrid from '@/components/gridView/previewGrid'
import PreviewChart from '@/components/chartView/previewChart'

import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const Upload = ({user}) => {
    const contextStateV2 = useMyStateV2()

    const connectedData = contextStateV2?.connectedData
    const setConnectedData = contextStateV2?.setConnectedData
    const setViewing = contextStateV2?.setViewing
    const tempData = contextStateV2?.tempData
    const setTempData = contextStateV2?.setTempData
    const dataConnected = contextStateV2?.dataConnected
    const setDataConnected = contextStateV2?.setDataConnected


    const handleFileUpload = (e) => {
        console.log('starting')
        const file = e.target.files[0]
        
        if (!file) {
            return; // Exit if no file is selected
        }

        const fileType = file.name.split('.').pop().toLowerCase();

        const reader = new FileReader();

        reader.onload = (e) => {
            let data = e.target.result;
            //data = data.trim();
            
            if (fileType === 'csv') {
                // If the file is a CSV, use this block to process it
                const json = XLSX.utils.sheet_to_json(XLSX.read(data, { type: 'binary' }).Sheets.Sheet1);
                if(connectedData){
                    setTempData(connectedData)
                    setConnectedData(json); // Now you have your JSON data
                }else {
                    setConnectedData(json)
                }
                setDataConnected(true)
            } else if (fileType === 'xlsx') {
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);
                //const csv = XLSX.utils.sheet_to_csv(worksheet);
                if(connectedData){
                    setTempData(connectedData)
                    setConnectedData(json); // Now you have your JSON data
                }else {
                    setConnectedData(json)
                }
                setDataConnected(true)
            }
        };
        // Decide how to read the file based on its type
        if (fileType === 'csv') {
            reader.readAsText(file); // Use readAsArrayBuffer for both CSV and XLSX,
                                            // but process CSV data differently
        } else if (fileType === 'xlsx') {
            reader.readAsArrayBuffer(file); // Use readAsArrayBuffer for XLSX
        }
    }

    return(
        <div className='h-full w-full px-10'>
            <h1 className='text-4xl font-extrabold'>
                Upload Your Data
            </h1>
            <div className="grid gap-6 grid-cols-3 h-full place-content-center">
                <div className='pt-24'>
                    <Card>
                        <CardHeader>
                        <CardTitle></CardTitle>
                        <CardDescription>
                            <div className='pb-2'>Please clean your data and upload only the columns you want to chart along with the data, any headers and footers will interfere with upload read</div>
                            <div>Data uploader currently only handles 1 sheet at a time </div>
                        </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-2">
                                <div className="grid gap-3">
                                    <Label htmlFor="file-upload">*must be csv or excel</Label>
                                    <Input className=""
                                        id="file-upload" type="file" accept=".xlsx, .csv" onChange={handleFileUpload}
                                    />
                                </div>
                                <div className="text-xs font-bold text-slate-600 pt-2">Note: Some feature limitations: </div>
                                <div className="text-xs text-slate-600">Keep your data columns names standard (i.e. ".", "quotes", other random punctuation marks will probably break the upload code) </div>
                                <div className="text-xs text-slate-600">Underscore "_" and hypens "-" are acceptable  </div>
                                <div className="text-xs text-slate-600">Please be patient, I am working as fast as possible to accommodate all requests and requirements ❤️ </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <div className='col-span-2 flex flex-col gap-2 h-screen pt-24 pb-20'>
                    <Card className="h-1/2">
                        <CardHeader className="flex flex-row items-center">
                            <div className="grid gap-2">
                                <CardTitle>Data Preview</CardTitle>
                                <CardDescription>
                                    Preview of your your data. You can click the button below to view all of your data. In the grid, you can also sort, filter, execute operations, on your data.
                                </CardDescription>
                            </div>
                            {
                                dataConnected &&
                                    <div asChild size="sm" className="ml-auto gap-1" onClick={()=>setViewing('dataStart')}>
                                        View All Data
                                        <ArrowUpRight className="h-4 w-4" />
                                    </div>
                            }
                        </CardHeader>
                        {
                            dataConnected && 
                                <CardContent>
                                    <PreviewGrid />
                                </CardContent>
                        }
                    </Card>
                    <Card className="h-1/2">
                        <CardHeader className="flex flex-row items-center">
                            <div className="grid gap-2">
                                <CardTitle>Chart Preview</CardTitle>
                                <CardDescription>
                                    Go charts to start playing around with your data. Or view gallery to see what's possible.
                                </CardDescription>    
                                {
                                    dataConnected && 
                                        <>
                                            <div asChild size="sm" className="ml-auto gap-1" onClick={()=>setViewing('charts')}>
                                                Charts
                                                <ArrowUpRight className="h-4 w-4" />
                                            </div>
                                            <div asChild size="sm" className="ml-auto gap-1" onClick={()=>setViewing('gallery')}>
                                                Gallery
                                                <ArrowUpRight className="h-4 w-4" />
                                            </div>
                                        </>
                                }
                            </div>
                        </CardHeader>
                        {
                            dataConnected &&
                                <CardContent>
                                    <PreviewChart />
                                </CardContent>
                        }
                    </Card>
                </div>
            </div>
        </div>
    )

}

export default Upload