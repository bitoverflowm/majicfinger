import React, {useEffect} from 'react';
import Link from 'next/link';

import { IoWarningOutline  } from "react-icons/io5";

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"
import {
    Sheet,
    SheetContent,
    SheetTrigger,
} from "@/components/ui/sheet"

import Saves from '@/components/saves'
import GridView from "@/components/gridView";
import { BentoBase } from "@/components/bentoView/bentoBase";

import { toast } from "sonner"

const KatsuPanel = ({data, mobile}) => {
    // Your component logic goes here

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
                const json = XLSX.utils.sheet_to_json(XLSX.read(data, { type: 'binary' }).Sheets.Sheet1);
                setData(json); // Set your state with the JSON data
            } else if (fileType === 'xlsx') {
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);
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

    useEffect(()=>{
        if(mobile){
            toast('Welcome to Katsu 🍛', {
                description: "Looks like you are on mobile device. I have not built mobile editing yet, feel free to look around.",
                closeButton: true,
                duration: 99999999
              });
        } else {
            toast('Welcome to Katsu 🍛', {
                description: "Right Click on any Bento card to edit",
                closeButton: true,
                duration: 99999999
              });  
        }        
    }, [])

    return (
        <div className='h-screen w-screen'>
            <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
                <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
                    <div
                        href="#"
                        className="items-center gap-2 text-4xl font-semibold md:text-base"
                    >
                        <h1 className='text-2xl'>🍱</h1>
                    </div>
                    <div
                        href="#"
                        className="text-foreground transition-colors hover:text-foreground"
                    >
                        Katsu
                    </div>
                </nav>
                <Sheet>
                    <SheetTrigger asChild>
                        <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0 md:hidden"
                        >
                        <h1 className='text-2xl'>🍱</h1>
                        <span className="sr-only">Toggle navigation menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left">
                        <nav className="grid gap-6 text-lg font-medium">
                        <Link
                            href="#"
                            className="flex items-center gap-2 text-lg font-semibold"
                        >
                            <span className="sr-only">Acme Inc</span>
                        </Link>
                        <Link href="#" className="hover:text-foreground">
                            Settings
                        </Link>
                        </nav>
                    </SheetContent>
                </Sheet> 
                <div className="flex place-content-end w-1/2 items-center gap-4 ml-auto md:gap-2 lg:gap-4">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="icon" className="rounded-full">
                                <IoWarningOutline className="h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                        <DropdownMenuLabel>🚧 Under Construction</DropdownMenuLabel>
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Settings</DropdownMenuItem>
                        <DropdownMenuItem>Support</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Logout</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>
            <div className={ mobile ? 'p-2' : 'p-20'}>
                <div className="w-full place-items-center place-content-center hidden">
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
                </div>
                <div className="overflow-hidden w-5/6 mx-auto">
                    {data && <BentoBase data={data} demo={false} mobile={mobile} />}
                </div>
                <div value="save" className="px-5 overflow-hidden py-6 place-items-center place-content-center h-5/6 w-5/6 hidden">
                    <Saves />
                </div>
            </div>
            {
                /* Progress bar unused 
                <Progress value={progress} className="w-[60%]" />
                */
            }           
    </div>
    );
};

export default KatsuPanel;