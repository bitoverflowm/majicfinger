"use client";

import React, { useEffect, useState } from 'react';
import { IoWarningOutline  } from "react-icons/io5";
import BrowserFrame from "react-browser-frame";
import * as XLSX from 'xlsx'

import { useMyState  } from '@/context/stateContext'

import { ModeToggle } from "@/components/ui/modeToggle";

import GridView from "@/components/gridView";
import BentoView from "@/components/bentoView";
import { BentoDemo } from "@/components/bentoView/bentoBase";
import { StickyHeader } from "@/components/magicui/header";
import { Meteors } from "@/components/magicui/meteors";

import IconSelector from '@/components/icons/iconSelector';
import KatsuColors from './katsu_colors';
import Backgrounds from './backgrounds';
/* Shadcn imports
 * 
 */
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
  } from "@/components/ui/drawer"
  import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/sonner"


import Saves from '@/components/saves'


const Katsu = () => {
    const contextState = useMyState()

    const data = contextState?.data
    const setDflt = contextState?.setDflt
    const setData = contextState?.setData
    const dflt = contextState?.dflt

    const [loading, setLoading] = useState(false)
    const [progress, setProgress] = React.useState(0)

    /*useEffect(() => {
        if(!user){
            router.push('/login')
        }
    }, [user])*/
    const handleFileUpload = (e) => {
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
                console.log(data)
                const json = XLSX.utils.sheet_to_json(XLSX.read(data, { type: 'binary' }).Sheets.Sheet1);
                console.log(json)
                setData(json); // Set your state with the JSON data
            } else if (fileType === 'xlsx') {
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);
                console.log(json)
                //const csv = XLSX.utils.sheet_to_csv(worksheet);
                setData(json); // Now you have your JSON data
            }
            //setCSV(csv)
            setDflt(false)
        };

        // Decide how to read the file based on its type
        if (fileType === 'csv') {
            reader.readAsText(file); // Use readAsArrayBuffer for both CSV and XLSX,
                                            // but process CSV data differently
        } else if (fileType === 'xlsx') {
            reader.readAsArrayBuffer(file); // Use readAsArrayBuffer for XLSX
        }        
    }

    useEffect(() => {
        if(dflt){
            setLoading(true)
            setData([{
                "Icon": 'RocketIcon',
                "heading": "17",
                "description": "startups",
                "href": "/",
                "cta": "Learn more",
                "className": "col-span-3 lg:col-span-1",
                "background":"",
                "background_color": "",
            },
            {
                "Icon": 'TwitterLogoIcon',
                "heading": "56,000",
                "description": "Followers on X",
                "href": "/",
                "cta": "Learn more",
                "className": "col-span-3 lg:col-span-2",
                "background": "globe",
                "background_color": "",
            },
            {
                "Icon": 'SketchLogoIcon',
                "heading": "$65,000",
                "description": "Monthly Revenue",
                "href": "/",
                "cta": "Learn more",
                "className": "col-span-3 lg:col-span-2",
                "background": "",
                "background_color": "",
            },
            {
                "Icon": 'CalendarIcon',
                "heading": "7,000",
                "description": "Newsletter Readers.",
                "className": "col-span-3 lg:col-span-1",
                "href": "/",
                "cta": "Learn more",
                "background": "",
                "background_color": "",
            }])
            setDflt(false)
            setProgress(100)
            setLoading(false)

        }        
    }, [])

    useEffect(() => {
        if(data){
            setProgress(100)
            setLoading(false)

        }else{
            setLoading(true)
        }
    }, [data])

    React.useEffect(() => {
        const timer = setTimeout(() => setProgress(99), 500)
        return () => clearTimeout(timer)
      }, [])

    return (
        <div>
            <Toaster />
           <div className="fixed bottom-10 right-10">
                <ModeToggle />
            </div>
            <StickyHeader />
            <div className="relative h-full w-full items-center justify-center overflow-hidden">
                <Meteors number={30} />
                <div className="px-60 pt-36 pb-10 text-center ">
                    
                    <h1 className="text-8xl font-bold">Welcome to Katsu</h1>
                    <p className="py-6">Created by MisterrPink. Powered by Lychee.</p>
                    <div className=''>Ever dreamed of being able to create bento boxes as beautiful as this</div> 
                </div>
                <div className='max-w-screen px-60'>
                    <BrowserFrame url="http://www.yourname.lych3e.com">
                        <div className='p-5'>
                            {
                                loading ? <Progress value={progress} className="w-[60%]" /> : <BentoDemo data={data}/>

                            }
                            
                        </div>
                    </BrowserFrame>
                </div>
            </div>
            <div className='grid pl-64 w-full p-20'>
                <div>It's pretty hard to do</div>
                <div>But I did the work for you</div>
                <div>Built on top of Lychee's ground breaking tech, you now can!</div>
                <div>Not a single line of code needs to be written</div>
            </div>

            <div className='min-h-screen w-full flex justify-items-center'>
                <Tabs defaultValue="grid" className="w-full flex flex-col place-items-center place-content-center">
                    <div className='flex gap-2'>
                        <TabsList>
                            <TabsTrigger value="grid">Edit Content</TabsTrigger>
                            <TabsTrigger value="bento">View Bento</TabsTrigger>
                            <TabsTrigger value="deploy">Deploy</TabsTrigger>
                            <TabsTrigger value="save">Save</TabsTrigger>
                            <TabsTrigger value="getlychee">Get Lychee</TabsTrigger>
                        </TabsList>
                        <div className='flex'>   
                            <Drawer>
                                <DrawerTrigger asChild>
                                    <Button variant="outline">View Icons</Button>
                                </DrawerTrigger>
                                <DrawerContent>
                                    <div className="mx-auto w-full">
                                        <DrawerHeader>
                                            <DrawerTitle>Here are the icons</DrawerTitle>
                                            <DrawerDescription>Click on the icon to save to your clipboard. Then paste it into Icon column in the Grid</DrawerDescription>
                                            <IconSelector />
                                        </DrawerHeader>                            
                                    </div>
                                    <DrawerFooter>
                                        <DrawerClose asChild>
                                            <Button variant="outline">Close</Button>
                                        </DrawerClose>
                                    </DrawerFooter>
                                </DrawerContent>
                            </Drawer>
                            <Drawer>
                                <DrawerTrigger asChild>
                                    <Button variant="outline">View Colors</Button>
                                </DrawerTrigger>
                                <DrawerContent>
                                    <div className="mx-auto w-full">
                                        <DrawerHeader>
                                            <DrawerTitle>Here are the colors</DrawerTitle>
                                            <DrawerDescription>Click to copy the color and paste it into background_color column to set the background color of that specific bento card</DrawerDescription>
                                            <KatsuColors />
                                        </DrawerHeader>                            
                                    </div>
                                    <DrawerFooter>
                                        <DrawerClose asChild>
                                            <Button variant="outline">Close</Button>
                                        </DrawerClose>
                                    </DrawerFooter>
                                </DrawerContent>
                            </Drawer>
                            <Drawer>
                                <DrawerTrigger asChild>
                                    <Button variant="outline">Seggify</Button>
                                </DrawerTrigger>
                                <DrawerContent>
                                    <div className="mx-auto w-full">
                                        <DrawerHeader>
                                            <DrawerTitle>These are elements that add a little more "je ne sais quoi" to your bento</DrawerTitle>
                                            <DrawerDescription>Click to copy the keyword and paste it into background column to set the background color of that specific bento card</DrawerDescription>
                                            <Backgrounds />
                                        </DrawerHeader>                            
                                    </div>
                                    <DrawerFooter>
                                        <DrawerClose asChild>
                                            <Button variant="outline">Close</Button>
                                        </DrawerClose>
                                    </DrawerFooter>
                                </DrawerContent>
                            </Drawer>
                        </div>
                    </div>
                    
                    <TabsContent value="grid" className="w-full place-items-center place-content-center">
                        <div className='text-center py-4'>Just click and edit the grid below to update the bento</div>
                        <form className="flex flex-col items-center pb-6">
                            <label className="block mt-2 px-4 py-2 bg-lychee-black text-lychee-white hover:text-lychee-black hover:bg-lychee-peach rounded-full shadow-xl cursor-pointer text-center text-xs font-regular" htmlFor="file-upload">
                                Click to Upload
                            </label>
                            <input id="file-upload" type="file" accept=".xlsx, .csv" onChange={handleFileUpload} className="hidden" />
                        </form>
                        <div className="h-[900px] flex place-content-center">
                            <GridView />
                        </div>
                    </TabsContent>
                    <TabsContent value="bento" className="px-5 overflow-hidden py-6 place-items-center place-content-center h-5/6 w-5/6">
                        {data ? <BentoDemo data={data}/> : <Progress value={progress} className="w-[60%]" />}
                    </TabsContent>
                    <TabsContent value="save" className="px-5 overflow-hidden py-6 place-items-center place-content-center h-5/6 w-5/6">
                        <Saves />
                    </TabsContent>
                </Tabs>
            </div>
            
            <div>
                <div className="text-xs text-red-400 pb-2 flex"><IoWarningOutline /> Warning: this action will replace the current data stored this session </div>
                    
                </div>
            <div>Click the cells to edit the data </div>
            
            <div>Instant Bento created:</div>
            
        </div>
    );
};

export default Katsu;