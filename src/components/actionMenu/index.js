"use client"

import { useState, useEffect, useRef } from "react"
import * as XLSX from 'xlsx'

import { MdDataset } from "react-icons/md";
import { AiOutlineAppstoreAdd } from "react-icons/ai";
import { FaChartLine } from "react-icons/fa6";
import { ImMagicWand } from "react-icons/im";
import { GoEyeClosed } from "react-icons/go";
import { CiExport } from "react-icons/ci";
import { IoCheckmarkSharp } from "react-icons/io5";

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

    useEffect(()=>{
        if(working){
            scrollToSection()
        }
    }, [working])

    const scrollToSection = (sectionId = 'dashboard-section') => {
        const yOffset = -60; // Adjust this value based on your fixed header size or desired spacing
        const element = document.getElementById(sectionId);
        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      
        window.scrollTo({top: y, behavior: 'smooth'});
    }

    

    return(
        <div className="flex flex-col place-items-center w-screen">
            { aiOpen &&
                <div className="fixed right-0 top-0 h-dvh w-full z-30 sm:w-1/4 bg-lychee-white backgroung-blur-xl flex flex-col place-items-center place-content-center px-6">
                    <div className="cursor-pointer mt-10 p-3 rounded-full hover:text-lychee-red hover:bg-white" onClick={()=>setAiOpen(false)}><GoEyeClosed /></div>
                    <div className="grow flex place-items-center place-content-center">
                        <AIMode data={data} setData={setData} setWorking={setWorking} setDflt={setDflt}/>
                    </div>
                </div>
            }

            <div className="flex flex-col min-h-[100vh] w-screen max-w-screen sm:w-screen min-h-screen place-content-center place-items-center bg-majic-white" id="dashboard-section">
                <div className="h-1/6 flex flex-wrap place-items-center place-content-center gap-2 py-10 px-4">
                    <div className={`border border-lychee-black rounded-xl  text-xs py-1 px-3 ${working === 'upload' ? 'bg-lychee-black text-white': 'text-lychee-black cursor-pointer hover:bg-lychee-black hover:text-white'} `}  onClick={()=>setWorking('upload')}>Upload Data</div>
                    <div className={`border border-lychee-black rounded-xl  text-xs py-1 px-3 ${aiOpen ? 'bg-lychee-red text-white': 'text-lychee-black cursor-pointer hover:bg-lychee-black hover:text-white'} `} onClick={()=>setAiOpen(true)}>Generate Data</div>                    
                    <div className={`border border-lychee-black rounded-xl  text-xs py-1 px-3 ${working === 'grid' ? 'bg-lychee-black text-white': 'text-lychee-black cursor-pointer hover:bg-lychee-black hover:text-white'} `}  onClick={()=>setWorking('grid')}>Table</div>
                    <div className={`border border-lychee-black rounded-xl  text-xs py-1 px-3 ${working === 'chart' ? 'bg-lychee-black text-white': 'text-lychee-black cursor-pointer hover:bg-lychee-black hover:text-white'} `}  onClick={()=>setWorking('chart')}>Chart</div>
                    <div className={`border border-lychee-black rounded-xl  text-xs py-1 px-3 ${working === 'dashboard' ? 'bg-lychee-black text-white': 'text-lychee-black cursor-pointer hover:bg-lychee-black hover:text-white'} `}  onClick={()=>setWorking('dashboard')}>Dashboard</div>
                    <div className={`border border-lychee-black rounded-xl  text-xs py-1 px-3 ${working === 'integrations' ? 'bg-lychee-black text-white': 'text-lychee-black cursor-pointer hover:bg-lychee-black hover:text-white'} `}   onClick={()=>setWorking('integrations')}>Integrations</div>
                    <div className={`flex  gap-2 border border-lychee-black rounded-xl  text-xs py-1 px-3 text-white ${aiOpen ? 'text-lychee-black bg-lychee-black': ' bg-lychee-red cursor-pointer hover:bg-lychee-black hover:text-white'} `} onClick={()=>setAiOpen(true)}><ImMagicWand /> Lychee AI</div>
                    <div className="border border-slate-400 text-lychee-black rounded-full hover:bg-lychee-black hover:text-white text-xs py-1 px-3 cursor-pointer" onClick={()=>setWorking('export')}><CiExport /></div>
                    <div className={`border border-lychee-black rounded-xl  text-xs py-1 px-3 ${working === 'roadmap' ? 'bg-lychee-black text-white': 'text-lychee-black cursor-pointer hover:bg-lychee-black hover:text-white'} `}   onClick={()=>setWorking('roadmap')}>Roadmap</div>
                    <div className={`border border-lychee-black rounded-xl  text-xs py-1 px-3 ${working === 'getLychee' ? 'bg-lychee-black text-white': 'font-bold bg-green-300 text-lychee-black cursor-pointer hover:bg-lychee-black hover:text-white'} `}   onClick={()=>setWorking('getLychee')}>Get Lychee Now!</div>
                </div>
                <div className="w-full h-5/6 sm:flex-grow flex place-content-center place-items-center">
                    {
                        working && working === 'upload' &&
                            <div className="flex flex-col place-items-center place-content-center bg-white rounded-md shadow-2xl border-l-4 border-lychee-black py-12 px-10 text-lychee-black w-5/6 sm:w-1/2 h-1/2 bg-lychee-peach rounded-md backdrop-blur-md text-center">
                                {
                                    user ?
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
                            <div className="h-screen sm:h-screen w-96 sm:w-full sm:px-20 flex place-content-center">
                                <GridView data={data} fmtCols={fmtCols}/>
                            </div>                        
                    }
                    {
                        fmtCols && data && ((working && working === 'chart') || !working) &&
                            <div className="h-5/6 w-full flex flex-col xl:flex-row">
                                <div className="hidden xl:block w-2/12 shadow-2xl px-5 py-10 rounded mx-10">
                                    <ChartDataMods fmtCols={fmtCols} type={type} setType={setType} xKey={xKey} setXKey={setXKey} yKey={yKey} setYKey={setYKey}/>
                                </div>
                                <div className="h-auto w-[450px] xl:h-[750px] sm:w-[1200px] px-1 xl:px-10">
                                    <ChartView data={data} fmtCols={fmtCols} xKey={xKey} setXKey={setXKey} yKey={yKey} setYKey={setYKey} type={type} dflt={dflt}/>
                                </div>
                                <div className="xl:hidden shadow-2xl px-5 py-10 rounded mx-10">
                                    <ChartDataMods fmtCols={fmtCols} type={type} setType={setType} xKey={xKey} setXKey={setXKey} yKey={yKey} setYKey={setYKey}/>
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
                            <div className="w-96 sm:w-full flex flex-col gap-10 place-content-center place-items-center text-lychee-black">
                                <div className="pt-6 sm:pt-2 text-6xl sm:text-8xl font-title text-center">You Have <span className="text-lychee-peach">2 Options.</span></div>
                                <div className="flex flex-col w-96 sm:flex-row sm:w-full place-content-center gap-10">
                                    <div className="text-center sm:text-left sm:w-1/4">
                                        <div className="px-10 py-6 flex flex-col gap-3">
                                            <div className="font-title text-4xl text-center">1.</div>
                                            <div> If you're interested and want this, but don't want to pay now, that's cool too.</div>
                                            <div>You can still use free trial.</div>
                                            <div>Keep in mind that you will have to pay a monthly subscription if you wait until then and pay extra for custom features too. </div>
                                            <div>(Planned Sub price $69.99/month)</div>
                                            <div className="underline">*No credit card required</div>
                                        </div>
                                        <div className="bg-white rounded-md shadow-2xl border-l-4 border-lychee-black py-12 px-10 hover:bg-lychee-black hover:text-lychee-white hover:border-lychee-red cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300"  onClick={() => setEmailVisible(true)}>
                                            <div className="font-title text-3xl font-bold">
                                                Free until subscription tiers kick in 
                                            </div>
                                            <div className="text-left place-items-left place-content-left">
                                                <div className="flex gap-2 pt-4 place-items-left place-content-left"><IoCheckmarkSharp className="text-green-400" />Upload Data</div>
                                                <div className="flex gap-2 place-items-left place-content-left"><IoCheckmarkSharp className="text-green-400" />Generate Data</div>
                                                <div className="flex gap-2 place-items-left place-content-left"><IoCheckmarkSharp className="text-green-400" />Powerful Table </div>
                                                <div className="flex gap-2 place-items-left place-content-left"><IoCheckmarkSharp className="text-green-400" />Instant Charts</div>
                                                <div className="flex gap-2 place-items-left place-content-left"><IoCheckmarkSharp className="text-green-400" />1 file upload at a time (Up to 512 MB) </div>
                                                <div className="flex gap-2 place-items-left place-content-left"><IoCheckmarkSharp className="text-green-400" />1 integration (limited based on availability)</div>
                                                <div className="flex gap-2 place-items-left place-content-left"><IoCheckmarkSharp className="text-green-400 h-12 w-12" /> $10 in of AI requests credits/ month included /month for being early user, until subscriptions kick in  </div>
                                            </div>
                                            <div className="py-6 text-6xl text-center">
                                                $0.00
                                            </div>
                                            {   !(emailVisible) &&
                                                <div className="bg-lychee-green w-12 pt-1  mb-4 text-center font-black rounded-full mx-auto text-white">
                                                    Go
                                                </div>
                                            }
                                            {
                                                emailVisible &&
                                                    <Login />
                                            }
                                            <div>(Planned Sub price $69.99/month) + Data usage rates</div>
                                        </div>
                                    </div>
                                    <div className="pt-10 text-center sm:pt-32">
                                        Or
                                    </div>
                                    <div className="sm:w-1/4">
                                        <div className="text-center sm:text-left px-10 py-6 flex flex-col gap-3">
                                            <div className="font-title text-4xl text-center">2.</div>
                                            <div> You can get instant access to everything and more bonus updates (being released every week), <span className="text-lychee-peach">at not a single penny more than what you pay today.</span></div>
                                            <div className="text-lychee-peach">Be added to our legacy customer list and know our secrets and what we got in store WAAAYYY before everyone else.</div>
                                        </div>
                                        <div className="bg-white rounded-md shadow-2xl border-l-4 border-lychee-black py-12 px-10 hover:bg-lychee-black hover:text-lychee-white hover:border-lychee-red cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300"  onClick={() => window.location.href = 'https://buy.stripe.com/3cscP66Oq7CS6Eo28f'}>
                                            <div className="font-title text-3xl font-bold">
                                                Get Lifetime Access
                                            </div>
                                            <div className="flex gap-2 pt-4"><IoCheckmarkSharp className="text-green-400" />Includes all future updates. </div>
                                            <div className="flex gap-2"><IoCheckmarkSharp className="text-green-400" />Includes all Features in Free tier </div>
                                            <div className="flex gap-2"><IoCheckmarkSharp className="text-green-400" />Vote to prioritize feature buildouts based on your needs </div>
                                            <div className="flex gap-2"><IoCheckmarkSharp className="text-green-400" />Create Personalized Dashboard</div>
                                            <div className="flex gap-2"><IoCheckmarkSharp className="text-green-400" />3 Integrations out of the box (subject to usage limits) </div>
                                            <div className="flex gap-2"><IoCheckmarkSharp className="text-green-400" />Insider/ Early bird on all future prices, topups, etc </div>
                                            <div className="flex gap-2"><IoCheckmarkSharp className="text-green-400" />Multiple file uploads (each file up to 512 MB).</div>
                                            <div className="flex gap-2"><IoCheckmarkSharp className="text-green-400" />access to more storage when availabe. </div>
                                            <div className="flex gap-2"><IoCheckmarkSharp className="text-green-400" /> $100 in of AI requests credits/ month included for LIFE </div>
                                            <div className="flex gap-2"><IoCheckmarkSharp className="text-green-400" />Help Lychee grow, expand in early stages of buildout. </div>
                                            <div className="py-6 text-6xl text-center">
                                                $29.99
                                            </div>
                                            <div className="bg-lychee-green w-12 py-1 text-center font-black rounded-full mx-auto text-white">
                                                Go
                                            </div>
                                            <div className="text-xs flex gap-2 flex-wrap pt-10">
                                                <div className="text-black">SOLD OUT: </div>
                                                <div className="line-through">500 Seats @ 2.99</div>
                                                <div className="line-through">500 Seats @ 9.99</div>
                                                <div className="line-through">500 Seats @ 14.99</div>
                                                <div className="line-through">500 Seats @ 19.99</div>
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
            <div className="h-96 py-56">
                <img src={"./fruit.png"}/>
            </div>
        </div>
    )
}

export default ActionMenu