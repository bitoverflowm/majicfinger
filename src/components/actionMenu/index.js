"use client"

import { useState, useEffect, useRef } from "react"
import * as XLSX from 'xlsx'

import { MdDataset } from "react-icons/md";
import { AiOutlineAppstoreAdd } from "react-icons/ai";
import { FaChartLine } from "react-icons/fa6";
import { ImMagicWand } from "react-icons/im";
import { GoEyeClosed } from "react-icons/go";
import { CiExport } from "react-icons/ci";


import { useMyState  } from '@/context/stateContext'
import { useUser } from '@/lib/hooks';

import Login from "../login";

import GridView from "../gridView";
import ChartView from "../chartView";
import ChartDataMods from "../chartView/chartDataMods";
import Roadmap from "../roadmap";

import AIMode from "../aiMode";


const ActionMenu = () => {
    const user = useUser()

    /*
     * Context hooks
     */
    const { aiOpen, setAiOpen } = useMyState()
    const{ working, setWorking } = useMyState()

    /*
     * State hooks
     */
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
   
    const [emailVisible, setEmailVisible] = useState(false)
    
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

    const emailHandler = (e) => {
        const email = e.target.value
        console.log(email)
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
        <div className="flex flex-col place-items-center w-screen ">
            { aiOpen &&
                <div className="fixed right-0 top-0 h-dvh w-1/4 bg-lychee-white backgroung-blur-xl flex flex-col place-items-center place-content-center px-6">
                    <div className="cursor-pointer mt-10 p-3 rounded-full hover:text-lychee-red hover:bg-white" onClick={()=>setAiOpen(false)}><GoEyeClosed /></div>
                    <div className="grow flex place-items-center place-content-center">
                        <AIMode data={data} setData={setData} setWorking={setWorking} setDflt={setDflt}/>
                    </div>
                </div>
            }

            <div className="flex flex-col w-screen h-screen place-content-center place-items-center bg-majic-white">
                <div className="flex gap-2 py-10">
                    <div className="border border-lychee-black text-lychee-black rounded-xl hover:bg-lychee-black hover:text-white text-xs py-1 px-3 cursor-pointer"  onClick={()=>setWorking('upload')}>Upload Data</div>
                    <div className="border border-lychee-black text-lychee-black rounded-xl hover:bg-lychee-black hover:text-white text-xs py-1 px-3 cursor-pointer" onClick={()=>setAiOpen(true)}>Generate Data</div>
                    <div className="border border-lychee-black text-lychee-black rounded-xl hover:bg-lychee-black hover:text-white text-xs py-1 px-3 cursor-pointer" onClick={()=>setWorking('grid')}>Table</div>
                    <div className="border border-lychee-black text-lychee-black rounded-xl hover:bg-lychee-black hover:text-white text-xs py-1 px-3 cursor-pointer" onClick={()=>setWorking('chart')}>Chart</div>
                    <div className="border border-lychee-black text-lychee-black rounded-xl hover:bg-lychee-black hover:text-white text-xs py-1 px-3 cursor-pointer" onClick={()=>setWorking('dashboard')}>Dashboard</div>
                    <div className="border border-lychee-black text-lychee-black rounded-xl hover:bg-lychee-black hover:text-white text-xs py-1 px-3 cursor-pointer" onClick={()=>setWorking('integrations')}>Integrations</div>
                    {
                        !(aiOpen) &&
                            <div className="border border-lychee-black rounded-xl hover:bg-lychee-black hover:text-white text-xs py-1 px-3 cursor-pointer flex items-center justify-center gap-2 bg-lychee-red rounded-full text-white z-10" onClick={()=>setAiOpen(true)}>
                                <ImMagicWand /> Activate Lychee AI
                            </div>
                    }
                    <div className="border border-slate-400 text-lychee-black rounded-full hover:bg-lychee-black hover:text-white text-xs py-1 px-3 cursor-pointer" onClick={()=>setWorking('export')}><CiExport /></div>
                    <div className="border border-lychee-black text-lychee-black rounded-xl hover:bg-lychee-black hover:text-white text-xs py-1 px-3 cursor-pointer" onClick={()=>setWorking('roadmap')}>Roadmap</div>
                    <div className="border border-lychee-black text-lychee-black rounded-xl hover:bg-lychee-black hover:text-white text-xs py-1 px-3 cursor-pointer" onClick={()=>setWorking('getLychee')}>Get Lychee Now!</div>
                </div>
                <div className="w-full flex-grow flex place-content-center place-items-center">
                    {
                        working && working === 'upload' &&
                            <div className="flex flex-col place-items-center place-content-center bg-white rounded-md shadow-2xl border-l-4 border-lychee-black py-12 px-10 text-lychee-black w-1/2 h-1/2 bg-lychee-peach rounded-md backdrop-blur-md text-center">
                                {
                                    user 
                                        ?
                                        <>
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
                                        </>
                                        :   
                                        <>
                                        <div className="py-2 font-title text-2xl">
                                                Let's Start With Your Data:
                                            </div>
                                            <div className="text-xs text-red-400 pb-2">*Please register before uploading your data </div>
                                            <div className="block my-6 px-4 py-2 bg-lychee-black text-lychee-white hover:text-lychee-black hover:bg-lychee-peach rounded-full shadow-xl cursor-pointer text-center text-xs font-regular" onClick={()=>setWorking('getLychee')}>
                                                Click Here
                                            </div>
                                            <div className="text-xs text-slate-600 pb-2">If you don't have your own data, 
                                                <span className="underline hover:font-black cursor-pointer px-1" onClick={()=>setWorking('grid')}>click here</span> to use sample data or have Lychee  
                                                <span className="underline hover:font-black cursor-pointer px-1" onClick={()=>setAiOpen(true)}>generate</span> 
                                                a fresh data set 
                                            </div>
                                        </>
                                }
                                
                            </div>
                    }
                    {
                        fmtCols && data && working && working === 'grid' &&
                            <div className="h-5/6 w-full px-20 flex place-content-center">
                                <GridView data={data} fmtCols={fmtCols}/>
                            </div>                        
                    }
                    {
                        fmtCols && data && working && working === 'chart' &&
                            <div className="h-5/6 w-full flex">
                                <div className="w-2/12 shadow-2xl px-5 py-10 rounded mx-10">
                                    <ChartDataMods fmtCols={fmtCols} type={type} setType={setType} xKey={xKey} setXKey={setXKey} yKey={yKey} setYKey={setYKey}/>
                                </div>
                                <div className="h-full w-[1200px] px-10">
                                    <ChartView data={data} fmtCols={fmtCols} xKey={xKey} setXKey={setXKey} yKey={yKey} setYKey={setYKey} type={type} dflt={dflt}/>
                                </div>
                            </div>
                            
                    }
                    {
                        working && working === 'integrations' && 
                            <div className="w-full flex flex-col gap-10 place-content-center place-items-center">
                                <div className="text-8xl font-title">Coming Soon</div>
                                <div className="text-lychee-peach">We are working on it. Stay tuned</div>
                                <div>I am working on a Sneak Preview. If you are a LifeTime member, you can vote on which one you would like to see an example of first</div>
                                <div className="flex gap-10">
                                    <div className="bg-white rounded-md shadow-2xl border-l-4 border-lychee-black py-12 px-10 hover:bg-lychee-black hover:text-lychee-white hover:border-lychee-red cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300"  onClick={() => setEmailVisible(true)}>
                                            <div className="font-title text-3xl font-bold">
                                                Connect to X
                                            </div>
                                            <div className="py-3 text-sm">
                                                Instantly pull your data from X
                                            </div>
                                            <div className="py-3 text-sm">
                                                Populate the data table, for raw analysis
                                            </div>
                                            <div className="py-3 text-sm">
                                                Chart any aspect of your live data
                                            </div>
                                            <div className="py-3 text-sm">
                                                Lychee AI can help you discover things you never dreamed of.
                                            </div>
                                            <div className="py-3 text-sm">
                                                Add live data flow to the Dashboard section and create alerts
                                            </div>
                                            <div className="flex place-content-center">
                                                <div className="bg-lychee-green text-center font-title font-black rounded-full px-3 py-1">Vote for X Integration</div>
                                            </div>
                                            {
                                                emailVisible &&
                                                    <form className="flex flex-col items-center pb-6">
                                                        <input
                                                            type="email"
                                                            placeholder="Enter your email"
                                                            className="mt-4 px-4 py-2 bg-lychee-black text-lychee-white hover:text-lychee-black hover:bg-lychee-peach rounded-full shadow-xl cursor-pointer text-center text-xs font-regular"
                                                            onChange={emailHandler}
                                                        />
                                                    </form>
                                            }
                                    </div>
                                    <div className="bg-white rounded-md shadow-2xl border-l-4 border-lychee-black py-12 px-10 hover:bg-lychee-black hover:text-lychee-white hover:border-lychee-red cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300"  onClick={() => setEmailVisible(true)}>
                                            <div className="font-title text-3xl font-bold">
                                                Connect to Youtube
                                            </div>
                                            <div className="py-3 text-sm">
                                                Instantly pull your data from X
                                            </div>
                                            <div className="py-3 text-sm">
                                                Populate the data table, for raw analysis
                                            </div>
                                            <div className="py-3 text-sm">
                                                Chart any aspect of your live data
                                            </div>
                                            <div className="py-3 text-sm">
                                                Lychee AI can help you discover things you never dreamed of.
                                            </div>
                                            <div className="py-3 text-sm">
                                                Add live data flow to the Dashboard section and create alerts
                                            </div>
                                            <div className="flex place-content-center">
                                                <div className="bg-lychee-green text-center font-title font-black rounded-full px-3 py-1">Vote for YouTube Integration</div>
                                            </div>
                                            {
                                                emailVisible &&
                                                    <form className="flex flex-col items-center pb-6">
                                                        <input
                                                            type="email"
                                                            placeholder="Enter your email"
                                                            className="mt-4 px-4 py-2 bg-lychee-black text-lychee-white hover:text-lychee-black hover:bg-lychee-peach rounded-full shadow-xl cursor-pointer text-center text-xs font-regular"
                                                            onChange={emailHandler}
                                                        />
                                                    </form>
                                            }
                                    </div>
                                    <div className="bg-white rounded-md shadow-2xl border-l-4 border-lychee-black py-12 px-10 hover:bg-lychee-black hover:text-lychee-white hover:border-lychee-red cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300"  onClick={() => setEmailVisible(true)}>
                                            <div className="font-title text-3xl font-bold">
                                                Connect to Instagram
                                            </div>
                                            <div className="py-3 text-sm">
                                                Instantly pull your data from X
                                            </div>
                                            <div className="py-3 text-sm">
                                                Populate the data table, for raw analysis
                                            </div>
                                            <div className="py-3 text-sm">
                                                Chart any aspect of your live data
                                            </div>
                                            <div className="py-3 text-sm">
                                                Lychee AI can help you discover things you never dreamed of.
                                            </div>
                                            <div className="py-3 text-sm">
                                                Add live data flow to the Dashboard section and create alerts
                                            </div>
                                            <div className="flex place-content-center">
                                                <div className="bg-lychee-green text-center font-title font-black rounded-full px-3 py-1">Vote for Instagram Integration</div>
                                            </div>
                                            {
                                                emailVisible &&
                                                    <form className="flex flex-col items-center pb-6">
                                                        <input
                                                            type="email"
                                                            placeholder="Enter your email"
                                                            className="mt-4 px-4 py-2 bg-lychee-black text-lychee-white hover:text-lychee-black hover:bg-lychee-peach rounded-full shadow-xl cursor-pointer text-center text-xs font-regular"
                                                            onChange={emailHandler}
                                                        />
                                                    </form>
                                            }
                                    </div>
                                </div>
                            </div>
                    }
                    {
                        working && working === 'export' && 
                            <div className="w-full flex flex-col gap-10 place-content-center place-items-center">
                                <div className="text-8xl font-title">Coming Soon</div>
                                <div className="text-lychee-peach">We are working on it. Stay tuned</div>
                                <div>If you are a LifeTime member, you can vote on which export source we should make available firts</div>
                                <div className="flex gap-10">
                                    <div className="bg-white rounded-md shadow-2xl border-l-4 border-lychee-black py-12 px-10 hover:bg-lychee-black hover:text-lychee-white hover:border-lychee-red cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300"  onClick={() => setEmailVisible(true)}>
                                            <div className="font-title text-3xl font-bold">
                                                URL Links
                                            </div>
                                            <div className="py-3 text-sm">
                                                Hosted browser link that you can share with anyone
                                            </div>
                                            <div className="flex place-content-center">
                                                <div className="bg-lychee-green text-center font-title font-black rounded-full px-3 py-1">Vote</div>
                                            </div>
                                            {
                                                emailVisible &&
                                                    <form className="flex flex-col items-center pb-6">
                                                        <input
                                                            type="email"
                                                            placeholder="Enter your email"
                                                            className="mt-4 px-4 py-2 bg-lychee-black text-lychee-white hover:text-lychee-black hover:bg-lychee-peach rounded-full shadow-xl cursor-pointer text-center text-xs font-regular"
                                                            onChange={emailHandler}
                                                        />
                                                    </form>
                                            }
                                    </div>
                                    <div className="bg-white rounded-md shadow-2xl border-l-4 border-lychee-black py-12 px-10 hover:bg-lychee-black hover:text-lychee-white hover:border-lychee-red cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300"  onClick={() => setEmailVisible(true)}>
                                            <div className="font-title text-3xl font-bold">
                                                Twitter Share
                                            </div>
                                            <div className="py-3 text-sm">
                                                Sharable post on Twitter
                                            </div>
                                            <div className="flex place-content-center">
                                                <div className="bg-lychee-green text-center font-title font-black rounded-full px-3 py-1">Vote</div>
                                            </div>
                                            {
                                                emailVisible &&
                                                    <form className="flex flex-col items-center pb-6">
                                                        <input
                                                            type="email"
                                                            placeholder="Enter your email"
                                                            className="mt-4 px-4 py-2 bg-lychee-black text-lychee-white hover:text-lychee-black hover:bg-lychee-peach rounded-full shadow-xl cursor-pointer text-center text-xs font-regular"
                                                            onChange={emailHandler}
                                                        />
                                                    </form>
                                            }
                                    </div>
                                    <div className="bg-white rounded-md shadow-2xl border-l-4 border-lychee-black py-12 px-10 hover:bg-lychee-black hover:text-lychee-white hover:border-lychee-red cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300"  onClick={() => setEmailVisible(true)}>
                                            <div className="font-title text-3xl font-bold">
                                                Printible file
                                            </div>
                                            <div className="py-3 text-sm">
                                                A printible file version
                                            </div>
                                            <div className="flex place-content-center">
                                                <div className="bg-lychee-green text-center font-title font-black rounded-full px-3 py-1">Vote</div>
                                            </div>
                                            {
                                                emailVisible &&
                                                    <form className="flex flex-col items-center pb-6">
                                                        <input
                                                            type="email"
                                                            placeholder="Enter your email"
                                                            className="mt-4 px-4 py-2 bg-lychee-black text-lychee-white hover:text-lychee-black hover:bg-lychee-peach rounded-full shadow-xl cursor-pointer text-center text-xs font-regular"
                                                            onChange={emailHandler}
                                                        />
                                                    </form>
                                            }
                                    </div>
                                </div>
                            </div>
                    }
                    {
                        working && working === 'dashboard' && 
                            <div className="w-full flex flex-col gap-10 place-content-center place-items-center">
                                <div className="text-8xl font-title">Coming Soon</div>
                                <div className="text-lychee-peach">We are working on it. Stay tuned</div>
                                <div>Demonstration:</div>
                                <div className="flex gap-10">
                                    <div className="bg-white rounded-md shadow-2xl border-l-4 border-lychee-black py-12 px-10 hover:bg-lychee-black hover:text-lychee-white hover:border-lychee-red cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300"  onClick={() => setEmailVisible(true)}>
                                            <div className="font-title text-3xl font-bold">
                                                URL Links
                                            </div>
                                            <div className="py-3 text-sm">
                                                Hosted browser link that you can share with anyone
                                            </div>
                                            <div className="flex place-content-center">
                                                <div className="bg-lychee-green text-center font-title font-black rounded-full px-3 py-1">Vote</div>
                                            </div>
                                            {
                                                emailVisible &&
                                                    <form className="flex flex-col items-center pb-6">
                                                        <input
                                                            type="email"
                                                            placeholder="Enter your email"
                                                            className="mt-4 px-4 py-2 bg-lychee-black text-lychee-white hover:text-lychee-black hover:bg-lychee-peach rounded-full shadow-xl cursor-pointer text-center text-xs font-regular"
                                                            onChange={emailHandler}
                                                        />
                                                    </form>
                                            }
                                    </div>
                                    <div className="bg-white rounded-md shadow-2xl border-l-4 border-lychee-black py-12 px-10 hover:bg-lychee-black hover:text-lychee-white hover:border-lychee-red cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300"  onClick={() => setEmailVisible(true)}>
                                            <div className="font-title text-3xl font-bold">
                                                Twitter Share
                                            </div>
                                            <div className="py-3 text-sm">
                                                Sharable post on Twitter
                                            </div>
                                            <div className="flex place-content-center">
                                                <div className="bg-lychee-green text-center font-title font-black rounded-full px-3 py-1">Vote</div>
                                            </div>
                                            {
                                                emailVisible &&
                                                    <form className="flex flex-col items-center pb-6">
                                                        <input
                                                            type="email"
                                                            placeholder="Enter your email"
                                                            className="mt-4 px-4 py-2 bg-lychee-black text-lychee-white hover:text-lychee-black hover:bg-lychee-peach rounded-full shadow-xl cursor-pointer text-center text-xs font-regular"
                                                            onChange={emailHandler}
                                                        />
                                                    </form>
                                            }
                                    </div>
                                    <div className="bg-white rounded-md shadow-2xl border-l-4 border-lychee-black py-12 px-10 hover:bg-lychee-black hover:text-lychee-white hover:border-lychee-red cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300"  onClick={() => setEmailVisible(true)}>
                                            <div className="font-title text-3xl font-bold">
                                                Printible file
                                            </div>
                                            <div className="py-3 text-sm">
                                                A printible file version
                                            </div>
                                            <div className="flex place-content-center">
                                                <div className="bg-lychee-green text-center font-title font-black rounded-full px-3 py-1">Vote</div>
                                            </div>
                                            {
                                                emailVisible &&
                                                    <form className="flex flex-col items-center pb-6">
                                                        <input
                                                            type="email"
                                                            placeholder="Enter your email"
                                                            className="mt-4 px-4 py-2 bg-lychee-black text-lychee-white hover:text-lychee-black hover:bg-lychee-peach rounded-full shadow-xl cursor-pointer text-center text-xs font-regular"
                                                            onChange={emailHandler}
                                                        />
                                                    </form>
                                            }
                                    </div>
                                </div>
                            </div>
                    }
                    {
                        working && working === 'getLychee' &&
                            <div className="w-full flex flex-col gap-10 place-content-center place-items-center">
                                <div className="text-8xl font-title">You Have <span className="text-lychee-peach">2 Options.</span></div>
                                <div className="flex w-full place-content-center gap-10 place-items-center">
                                    <div className="w-1/4">
                                        <div className="px-10 py-6 flex flex-col gap-3">
                                            <div><span className="font-title text-4xl">1.</span> If you're interested and want this, but don't want to pay now, that's cool too.</div>
                                            <div>You can still use free trial.</div>
                                            <div>Keep in mind that you will have to pay a monthly subscription if you wait until then and pay extra for custom features too. </div>
                                            <div>(Planned Sub price $69.99/month)</div>
                                        </div>
                                        <div className="bg-white rounded-md shadow-2xl border-l-4 border-lychee-black py-12 px-10 hover:bg-lychee-black hover:text-lychee-white hover:border-lychee-red cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300"  onClick={() => setEmailVisible(true)}>
                                            <div className="font-title text-3xl font-bold">
                                                Free until subscription kicks in
                                            </div>
                                            <div className="py-3 text-sm">
                                                1 file upload at a time
                                            </div>
                                            <div className="py-3 text-sm">
                                                Up to 512 MB data upload.
                                            </div>
                                            <div className="py-3 text-sm">
                                                1 AI requests/ month include
                                            </div>
                                            <div className="py-3 text-sm">
                                                $0.00
                                            </div>
                                            <div className="bg-lychee-green w-9 text-center font-title font-black rounded-full">
                                                Go
                                            </div>
                                            {
                                                emailVisible &&
                                                    <Login />
                                            }
                                        </div>
                                    </div>
                                    <div>
                                        Or
                                    </div>
                                    <div className="w-1/4">
                                        <div className="px-10 py-6 flex flex-col gap-3">
                                            <div><span className="font-title text-4xl">2.</span> You can get instant access to everything above and more bonus updates rolling in the future, <span className="text-lychee-peach">at not a single penny more than what you pay today.</span></div>
                                            <div className="text-lychee-peach">Be added to our legacy customer list and know our secrets and what we got in store WAAAYYY before everyone else.</div>
                                        </div>
                                        <div className="bg-white rounded-md shadow-2xl border-l-4 border-lychee-black py-12 px-10 hover:bg-lychee-black hover:text-lychee-white hover:border-lychee-red cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300"  onClick={() => window.location.href = 'https://buy.stripe.com/3cscP66Oq7CS6Eo28f'}>
                                            <div className="font-title text-3xl font-bold">
                                                Get Lifetime Access
                                            </div>
                                            <div className="py-3 text-sm">
                                                Includes all future updates.
                                            </div>
                                            <div className="py-3 text-sm">
                                                Get up to 512 MB data upload. get access to more storage when availabe.
                                            </div>
                                            <div className="py-3 text-sm">
                                                Help Lychee grow, expand in early stages of buildout.
                                            </div>
                                            <div className="py-3 text-sm">
                                                200 AI requests/ month include
                                            </div>
                                            <div className="py-3 text-sm">
                                                $29.99
                                            </div>
                                            <div className="bg-lychee-green w-9 text-center font-title font-black rounded-full">
                                                Go
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                    }
                    {
                        working && working === 'roadmap' && <Roadmap />
                    }
                </div>
            </div>                        
            <div className="flex gap-12 hidden">
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
        </div>
    )
}

export default ActionMenu