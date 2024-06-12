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

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
  } from "@/components/ui/accordion"

import PreviewGrid from '@/components/gridView/previewGrid'
import PreviewChart from '@/components/chartView/previewChart'

import Link from "next/link"
import { ArrowUpRight, BadgePlus, Cable, Shovel } from "lucide-react"

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

    const multiSheetFlag = contextStateV2?.multiSheetFlag
    const setMultiSheetFlag = contextStateV2?.setMultiSheetFlag
    const multiSheetData = contextStateV2?.multiSheetData
    const setMultiSheetData = contextStateV2?.setMultiSheetData
    const dataTypes = contextStateV2?.dataTypes
    const setDataTypes = contextStateV2?.setDataTypes

    const handleFileUpload = (e) => {
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

                if (sheetNames.length > 1) {
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
    }

    return(
        <div className='h-full w-full px-6'>
            <h1 className='text-4xl font-extrabold'>
                Upload Your Data
            </h1>
            <div className="grid gap-10 xl:grid-cols-3 h-full place-content-center">
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
                            </div>
                            <Accordion type="single" collapsible >
                                <AccordionItem value="item-1">
                                    <AccordionTrigger>Note: Some feature limitations</AccordionTrigger>
                                    <AccordionContent>
                                        <div className="text-slate-600">Keep your data columns names standard (i.e. ".", "quotes", other random punctuation marks will probably break the upload code) </div>
                                        <div className="text-slate-600">Underscore "_" and hypens "-" are acceptable  </div>
                                        <div className="text-slate-600">Please be patient, I am working as fast as possible to accommodate all requests and requirements ❤️ </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </CardContent>
                    </Card>
                </div>
                <div className='col-span-2 flex flex-col h-screen pt-6 pb-20'>
                    <div className='px-20'>
                        <div className='text-xl font-bold'>Data Preview</div>
                        <div className='py-2 flex'>
                            <div className='w-3/5'>Here is a preview of your your data. Head over to data sheet to view all of your data. You will also be able to sort, filter, execute operations, and more.</div>
                            <div className='w-2/5 flex place-items-center place-content-center'>
                                {
                                    dataConnected &&
                                        <div className="flex px-3 py-2 bg-black text-white hover:bg-slate-200 hover:text-black cursor-pointer gap-1" onClick={()=>setViewing('dataStart')}>
                                            Data Sheet
                                            <ArrowUpRight className="h-4 w-4" />
                                        </div>
                                }
                            </div>
                        </div>
                        <div className='flex place-items-center place-content-center pt-5'>
                            {
                                dataConnected ? 
                                    <CardContent>
                                        <PreviewGrid />
                                    </CardContent>
                                    : <div className="text-sm py-20 bg-slate-100 w-full text-center my-10">Waiting for data</div>
                            }
                        </div>
                        <div className='py-2 flex'>
                            <div className='w-3/5'>Here is a preview of your your chart. Head over to Charts to modify and beautify. Or checkout Gallery, to see a showcase of what's possible with Lychee</div>
                            <div className='w-2/5 flex place-items-center place-content-center'>
                                {
                                    dataConnected &&
                                        <div className='flex gap-2'>
                                            <div className="flex px-3 py-2 bg-black text-white hover:bg-slate-200 hover:text-black cursor-pointer gap-1" onClick={()=>setViewing('charts')}>
                                                Charts
                                                <ArrowUpRight className="h-4 w-4" />
                                            </div>
                                            <div className="flex px-3 py-2 bg-black text-white hover:bg-slate-200 hover:text-black cursor-pointer gap-1" onClick={()=>setViewing('gallery')}>
                                                Gallery
                                                <ArrowUpRight className="h-4 w-4" />
                                            </div>
                                        </div>
                                }
                            </div>
                        </div>
                        <div className='flex place-items-center place-content-center pt-5'>
                            {
                                dataConnected ? 
                                    <CardContent>
                                        <PreviewChart />
                                    </CardContent>
                                    : <div className="text-sm py-20 bg-slate-100 w-full text-center">Nothing to chart yet</div>
                            }
                        </div>
                    </div>

                    
                </div>
            </div>
        </div>
    )

}

export default Upload