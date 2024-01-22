"use client"

import { useState } from "react"
import * as XLSX from 'xlsx'
import ReactTable from 'react-table'
import { CsvToHtmlTable } from 'react-csv-to-table';
//import "react-table/react-table.css";


const ActionMenu = () => {
    
    const [working, setWorking] = useState()
    const [data, setData] = useState()
    const [csv, setCSV] = useState()
    
    const handleFileUpload = (e) => {
        const file = e.target.files[0]
        
        if (!file) {
            return; // Exit if no file is selected
        }    

        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet);
            const csv = XLSX.utils.sheet_to_csv(worksheet);
            setData(json); // Now you have your JSON data
            setCSV(csv)
            console.log(csv)
            console.log(json)
        };

        reader.readAsBinaryString(file);
    }

    return(
        <div className="flex flex-col place-items-center w-screen absolute left-0 px-48 pt-20 -mt-16">
            <div className="flex gap-16">
                <div className="w-1/4 bg-white rounded-md shadow-2xl border-l-4 border-lychee-black py-12 px-10 hover:bg-lychee-black hover:text-lychee-white hover:border-lychee-red cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300">
                <div className="font-title text-3xl font-bold">
                    Generate a Data Set
                </div>
                <div className="py-3 text-sm">
                    Create completely random data, or request specific data
                </div>
                <div className="bg-lychee-green w-9 text-center font-title font-black rounded-full">
                    Go
                </div>
                </div>
                <div className="w-1/4 bg-white rounded-md shadow-2xl border-l-4 border-lychee-black py-12 px-10 hover:bg-lychee-black hover:text-lychee-white hover:border-lychee-red cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300" onClick={()=>setWorking('upload')}>
                <div className="font-title text-3xl font-bold">
                    Upload your Spreadsheet
                </div>
                <div className="py-3 text-sm">
                    Import CSV or Excel Files. <div></div> Pro user can get up to 512MB.
                </div>
                <div className="bg-lychee-green w-9 text-center font-title font-black rounded-full">
                    Go
                </div>
                </div>
                <div className="w-1/4 bg-white rounded-md shadow-2xl border-l-4 border-lychee-black py-12 px-10 hover:bg-lychee-black hover:text-lychee-white hover:border-lychee-red cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300">
                <div className="font-title text-3xl font-bold">
                    Enter Data Manually
                </div>
                <div className="py-3 text-sm">
                    Start with an empty sheet <div></div> Do whatever you want
                </div>
                <div className="bg-lychee-green w-9 text-center font-title font-black rounded-full">
                    Go
                </div>
                </div>
                <div className="w-1/4 bg-white rounded-md shadow-2xl border-l-4 border-lychee-black py-12 px-10 hover:bg-lychee-black hover:text-lychee-white hover:border-lychee-red cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300">
                <div className="font-title text-3xl font-bold">
                    Analyze and Chart Live Data
                </div>
                <div className="py-3 text-sm">
                    Pull public data streams.<div></div> Request new api integrations.
                </div>
                <div className="bg-lychee-green w-9 text-center font-title font-black rounded-full">
                    Go
                </div>
                </div>
            </div>
            {
                working && 
                    working === 'upload' &&
                        <div className="text-lychee-black my-20 w-1/2 h-96 bg-lychee-white rounded-md backdrop-blur-md bg-opacity-10">
                            Upload your data below:
                            <form className="">
                                <input type={"file"} accept={".xlsx"} onChange={handleFileUpload}/>
                            </form>
                        </div>
            }
            <div className="w-screen">
                    {csv &&
                        <CsvToHtmlTable data={csv} csvDelimiter="," tableClassName="table-auto" tableRowClassName="border" tableColumnClassName="border w-32"/>
                        }
            </div>
        </div>
    )
}

export default ActionMenu