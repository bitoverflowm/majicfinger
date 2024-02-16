"use client"

import { useState, useEffect, useRef } from "react"
import * as XLSX from 'xlsx'
import ReactTable from 'react-table'
//import { CsvToHtmlTable } from 'react-csv-to-table';


//import "react-table/react-table.css";
import { AgChartsReact } from 'ag-charts-react';


import GridView from "../gridView";
import ChartView from "../chartView";
import ChartDataMods from "../chartView/chartDataMods";

import { MdDataset } from "react-icons/md";
import { AiOutlineAppstoreAdd } from "react-icons/ai";
import { FaChartLine } from "react-icons/fa6";
import { ImMagicWand } from "react-icons/im";
import AIMode from "../aiMode";


const ActionMenu = () => {
    
    const [working, setWorking] = useState()
    const [data, setData] = useState()
    const [csv, setCSV] = useState()
    const [fmtData, setFmtData] = useState()
    const [fmtCols, setFmtCols] = useState()
    const [chartActive, setChartActive] = useState()

    const [xKey, setXKey] = useState('mission')
    const [yKey, setYKey] = useState('price')
    const [type, setType] = useState('bar')
    const [dflt, setDflt] = useState(true)

    const uploadRef = useRef(null)
    const gridRef = useRef(null)
    const chartRef = useRef(null)

    const [ aiOpen, setAiOpen ] = useState(true)
    
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
            setDflt(false)
        };

        reader.readAsBinaryString(file);
        setWorking('grid')
        
    }

    useEffect(()=> {
        if(data && data.length > 0){
            const keys = Object.keys(data[0])
            const columnsLabels = keys.map(key => {
                // Handle any price headings
                /*if (key === 'price') {
                    return { field: key, valueFormatter: params => '$' + params.value.toLocaleString() }
                }*/
                return { field: key }
            })
            
            setFmtCols(columnsLabels)           
        }
    }, [data])

    const generateChartHandler = () =>{
        setChartActive(true)
    }

    useEffect(()=>{
        working === 'upload' && uploadRef.current.scrollIntoView({behavior: 'smooth'})
        working === 'grid' && gridRef.current.scrollIntoView({behavior:'smooth'})
        working === 'chart' && chartRef.current.scrollIntoView({behavior: 'smooth'})
    }, [working])

    useEffect(()=>{
        if(!data){
            fetch('https://www.ag-grid.com/example-assets/space-mission-data.json') // Fetch data from server
            .then(result => result.json()) // Convert to JSON
            .then(rowData => setData(rowData)); // Update state of `rowData`

            setFmtCols([
                { field: "mission" },
                { field: "company" },
                { field: "location" },
                { field: "date" },
                { field: "price" },
                { field: "successful" },
                { field: "rocket" }
              ])
        }
    }, [])

    

    return(
        <div className="flex flex-col place-items-center w-screen absolute left-0 px-48 pt-20 -mt-16">
            { aiOpen &&
                <div className="fixed right-0 top-0 h-dvh w-1/4 bg-lychee-white backgroung-blur-xl flex place-items-center place-content-center px-6">
                    <AIMode setData={setData} setWorking={setWorking}/>
                </div>
            }
            <div className="fixed bottom-10 right-10 flex items-center justify-center px-3 py-2 text-xs gap-2 bg-lychee-red rounded-full text-white z-10 cursor-pointer hover:bg-white hover:text-black" onClick={()=>setAiOpen(true)}>
                <ImMagicWand /> Activate Lychee AI
            </div>
            <div className="flex gap-12">
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
                <div className="w-1/4 bg-white rounded-md shadow-2xl border-l-4 border-lychee-black py-12 px-10 hover:bg-lychee-black hover:text-lychee-white hover:border-lychee-red cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300" onClick={()=>setWorking('chart')}>
                    <div className="font-title text-3xl font-bold">
                        Visualize your Data
                    </div>
                    <div className="py-3 text-sm">
                        Analyze, Chart, Customize  <div></div> With beautiful charts and graph.
                    </div>
                    <div className="bg-lychee-green w-9 text-center font-title font-black rounded-full">
                        Go
                    </div>
                </div>
                <div className="w-1/4 bg-white rounded-md shadow-2xl border-l-4 border-lychee-black py-12 px-10 hover:bg-lychee-black hover:text-lychee-white hover:border-lychee-red cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300" onClick={()=>setWorking('')}>
                    <div className="font-title text-3xl font-bold">
                        Live Data
                    </div>
                    <div className="py-3 text-sm">
                        Pull public data, or APIs, private data sources<div></div> Pro users can request and vote on new api integrations.
                    </div>
                    <div className="bg-lychee-green w-9 text-center font-title font-black rounded-full">
                        Go
                    </div>
                </div>
            </div>
            <div className="h-96 py-56">
                <img src={"./fruit.png"}/>
            </div>
            {
                working && working === 'upload' &&
                    <div className="h-dvh flex flex-col place-items-center place-content-center bg-white rounded-md shadow-2xl border-l-4 border-lychee-black py-12 px-10 text-lychee-black my-20 w-1/2 bg-lychee-peach rounded-md backdrop-blur-md text-center" ref={uploadRef}>
                        <div className="py-2 font-title text-2xl">
                            Let's Start With Your Data:
                        </div>
                        <div className="text-xs text-slate-600 pb-2">*Must be .csv or Excel File (.xlsx) </div>
                        <div className="text-xs text-red-400 pb-2">*Warning: this action will replace <span className="px-1 underline hover:text-black cursor-pointer" onClick={()=>setWorking('grid')}>the current data</span> stored this session </div>
                        <form className="flex flex-col items-center pb-6">
                            <label className="block mt-2 px-4 py-2 bg-lychee-black text-lychee-white hover:text-lychee-black hover:bg-lychee-peach rounded-full shadow-xl cursor-pointer text-center text-xs font-regular" htmlFor="file-upload">
                                Click to Upload
                            </label>
                            <input id="file-upload" type="file" accept=".xlsx" onChange={handleFileUpload} className="hidden" />
                        </form>
                        <div className="text-xs text-slate-600 pb-2">If you don't have your own data, 
                            <span className="underline hover:font-black cursor-pointer px-1" onClick={()=>setWorking('grid')}>click here</span> to use sample data or have Lychee  
                            <span className="underline hover:font-black cursor-pointer px-1">generate</span> 
                            a fresh data set 
                        </div>
                    </div>
            }            
            <div className="w-screen">
                    {
                        fmtCols && data &&
                            <div className="mt-32 h-screen w-screen flex place-content-center place-items-center" ref={gridRef}>
                                <div className="w-2/12 shadow-2xl h-screen">
                                    <div className="flex gap-1 px-2 py-2 border border-white rounded-lg w-1/2 place-items-center ml-8 shadow-xl hover:bg-black hover:text-white text-sm cursor-pointer" onClick={()=>setWorking('upload')}><AiOutlineAppstoreAdd className="text-xl"/> Uplod New Data</div>
                                    <div className="flex gap-1 px-2 py-2 border border-white rounded-lg w-1/2 place-items-center ml-8 shadow-xl hover:bg-black hover:text-white text-sm cursor-pointer mt-3" onClick={()=>setWorking('grid')}><MdDataset />Review Data</div>
                                    <div className="flex gap-1 px-2 py-2 border border-white rounded-lg w-1/2 place-items-center ml-8 shadow-xl bg-black text-white hover:bg-white hover:text-black text-sm cursor-pointer mt-3" onClick={()=>setWorking('chart')}><FaChartLine /> Generate Chart</div>
                                </div>
                                <div className="h-5/6 w-8/12 px-20">
                                    <GridView data={data} fmtCols={fmtCols}/>
                                </div>
                                <div className="w-2/12">
                                    
                                </div>
                            </div>                            
                    }
                    {
                        fmtCols && data &&
                            <div className="mt-32 h-screen w-screen flex place-content-center place-items-center" ref={chartRef}>
                                <div className="w-2/12 shadow-2xl h-screen pt-10">
                                    <div className="flex gap-1 px-2 py-2 border border-white rounded-lg w-1/2 place-items-center ml-8 shadow-xl hover:bg-black hover:text-white text-sm cursor-pointer" onClick={()=>setWorking('upload')}><AiOutlineAppstoreAdd className="text-xl"/> Uplod New Data</div>
                                    <div className="flex gap-1 px-2 py-2 border border-white rounded-lg w-1/2 place-items-center ml-8 shadow-xl hover:bg-black hover:text-white text-sm cursor-pointer mt-3" onClick={()=>setWorking('grid')}><MdDataset />Review Data</div>
                                    <div className="mt-3 ml-8">
                                        <ChartDataMods fmtCols={fmtCols} type={type} setType={setType} xKey={xKey} setXKey={setXKey} yKey={yKey} setYKey={setYKey}/>
                                    </div>
                                </div>
                                <div className="h-5/6 w-8/12 px-20">
                                    <ChartView data={data} fmtCols={fmtCols} xKey={xKey} setXKey={setXKey} yKey={yKey} setYKey={setYKey} type={type} dflt={dflt}/>
                                </div>
                                <div className="w-2/12">
                                    
                                </div>
                            </div>
                            
                    }
            </div>
        </div>
    )
}

export default ActionMenu