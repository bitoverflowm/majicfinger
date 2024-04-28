"use client"

import { useState, useEffect, useRef } from "react"
import * as XLSX from 'xlsx'
import Link from 'next/link'

import { GoEyeClosed } from "react-icons/go";
import { CiExport } from "react-icons/ci";
import { IoCheckmarkSharp, IoWarningOutline  } from "react-icons/io5";
import { ImMagicWand } from "react-icons/im";
import { LuMoveLeft } from "react-icons/lu";
import { FaCircle } from "react-icons/fa6";
import { MdArrowRightAlt } from "react-icons/md";

/*MagicUI and Shdcn imports */

/*internal imports */
import { useMyState  } from '@/context/stateContext'
import { useUser } from '@/lib/hooks';

import Login from "../login";

import GridView from "../gridView";
import ChartView from "../chartView";
import ChartDataMods from "../chartView/chartDataMods";
import Roadmap from "../roadmap";

import Integrations from "../integrations";

import AIMode from "../aiMode";
import { LycheePricing } from "./lycheePricing";



const ActionMenu = () => {
    const user = useUser()
    /*
     * Context hooks
     */
    const contextState = useMyState()
    // Safely access context values with optional chaining
    const aiOpen = contextState?.aiOpen;
    const setAiOpen = contextState?.setAiOpen;
    const working = contextState?.working;
    const setWorking = contextState?.setWorking;
    const data  = contextState?.data;
    const setData = contextState?.setData;

    const fmtCols = contextState?.fmtCols
    const setFmtCols = contextState?.setFmtCols
    const dflt = contextState?.dflt
    const setDflt = contextState?.setDflt
    
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
        setWorking('grid')        

    }


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

    useEffect(() => {
        // Ensure the code runs only if jQuery is available
        if (typeof window !== "undefined" && window.$) {
          const modifyUrls = () => {
            $('a[href^="https://buy.stripe.com/"]').each(function(){
              const oldBuyUrl = $(this).attr("href");
              const referralId = window.promotekit_referral;
              if (!oldBuyUrl.includes("client_reference_id")) {
                  const newBuyUrl = oldBuyUrl + "?client_reference_id=" + referralId;
                  $(this).attr("href", newBuyUrl);
              }
            });
            $('[pricing-table-id]').each(function(){
              $(this).attr("client-reference-id", window.promotekit_referral);
            });
          };
    
          // Using setTimeout to delay the execution, ensuring scripts have loaded
          setTimeout(modifyUrls, 2000);
        }
      }, []);

    const toHumanPrice = (price, decimals = 2) => {
        return Number(price / 100).toFixed(decimals);
    };


    return(
        <div className="bg-white">
            { aiOpen &&
                <div className="fixed right-0 top-0 h-dvh w-full z-30 sm:w-1/4 bg-lychee-white backgroung-blur-xl flex flex-col place-items-center place-content-center px-6">
                    <div className="cursor-pointer mt-10 p-3 rounded-full hover:text-lychee-red hover:bg-white" onClick={()=>setAiOpen(false)}><GoEyeClosed /></div>
                    <div className="grow flex place-items-center place-content-center">
                        <AIMode data={data} setData={setData} setWorking={setWorking} setDflt={setDflt}/>
                    </div>
                </div>
            }

            <div className="min-h-screen" id="dashboard-section">
                <div className="h-1/6 flex place-items-center place-content-center py-2 text-xs">
                    {
                        !(user) && <div className="flex">Check it out right here <MdArrowRightAlt /> </div>
                    }
                    <div className="flex flex-wrap py-2 px-4">
                        <div className={`rounded-l-full py-3 px-4 ${working === 'upload' ? 'bg-lychee-black text-white': 'shadow-2xl text-black bg-white cursor-pointer hover:shadow-none hover:bg-slate-50/40'} `}  onClick={()=>setWorking('upload')}>Upload</div>
                        <div className={`py-3 px-4 ${working === 'grid' ? 'bg-lychee-black text-white': 'shadow-2xl text-black bg-white cursor-pointer hover:shadow-none hover:bg-slate-50/40'} `}  onClick={()=>setWorking('grid')}>Table</div>
                        <div className={`py-3 px-4 ${working === 'chart' ? 'bg-lychee-black text-white': 'shadow-2xl text-black bg-white cursor-pointer hover:shadow-none hover:bg-slate-50/40'} `}  onClick={()=>setWorking('chart')}>Chart</div>
                        <div className={`py-3 px-4 ${working === 'dashboard' ? 'bg-lychee-black text-white': 'shadow-2xl text-black bg-white cursor-pointer hover:shadow-none hover:bg-slate-50/40'} `}  onClick={()=>setWorking('dashboard')}>Dashboard</div>
                        <div className={`py-3 px-4 ${working === 'integrations' ? 'bg-lychee-black text-white': 'shadow-2xl text-black bg-white cursor-pointer hover:shadow-none hover:bg-slate-50/40'} `}  onClick={()=>setWorking('integrations')}>Integrations</div>
                        <div className={`py-3 px-4 ${aiOpen ? 'bg-lychee-black text-white': 'shadow-2xl text-black bg-white cursor-pointer hover:shadow-none hover:bg-slate-50/40'} `}  onClick={()=>setAiOpen(true)}>Lychee AI</div>
                        <div className={`py-3 px-4 ${working === 'export' ? 'bg-lychee-black text-white': 'shadow-2xl text-black bg-white cursor-pointer hover:shadow-none hover:bg-slate-50/40'} `}  onClick={()=>setWorking('export')}><CiExport /></div>
                        <div className={`py-3 px-4 ${working === 'roadmap' ? 'bg-lychee-black text-white': 'shadow-2xl text-black bg-white cursor-pointer hover:shadow-none hover:bg-slate-50/40'} `}  onClick={()=>setWorking('roadmap')}>Roadmap</div>
                        <div className={`rounded-r-full py-3 px-4 ${working === 'getLychee' ? 'bg-lychee-black text-white': 'text-black font-black shadow-2xl text-black bg-lychee-go/60 cursor-pointer hover:shadow-none hover:bg-slate-50/40'} `}  onClick={()=>setWorking('getLychee')}>Get Lychee</div>
                    </div>
                </div>
                <div className="w-full h-full flex place-content-center">
                    {
                        working && working === 'upload' &&
                            <div className="flex flex-col place-items-center place-content-center bg-white rounded-md shadow-lg py-12 px-10 text-lychee-black w-5/6 sm:w-1/2 h-1/2 rounded-md backdrop-blur-md text-center mt-10 bg-gradient-to-r from-lychee-white/10 to-lychee-white/20 ">
                                {
                                    user ?
                                        <>
                                            <div className="py-2 font-title text-2xl">
                                                Let's Start With Your Data:
                                            </div>
                                            <div className="text-sm text-slate-600 pb-2">*Must be .csv or Excel File (.xlsx) </div>
                                            <div className="bg-white/40 rounded-xl p-8 text-left">
                                                <div className="text-sm font-bold text-slate-600 pb-2">Note: Some feature limitations: </div>
                                                <div className="text-sm text-slate-600 pb-2">Please clean your data and upload only the columns you want to chart along with the data, any headers and footers will interfere with upload read  </div>
                                                <div className="text-sm text-slate-600 pb-2">Data uploader currently only handles 1 sheet at a time </div>
                                                <div className="text-sm text-slate-600 pb-2">Keep your data columns names standard (i.e. ".", "quotes", other random punctuation marks will probably break the upload code) </div>
                                                <div className="text-sm text-slate-600 pb-2">Underscore "_" and hypens "-" are acceptable  </div>
                                                <div className="text-xs text-slate-600 pb-2">Please be patient, I am working as fast as possible to accommodate all requests and requirements ❤️ </div>
                                            </div>
                                            
                                            <div className="text-xs text-red-400 pb-2 flex"><IoWarningOutline /> Warning: this action will replace <span className="px-1 underline hover:text-black cursor-pointer" onClick={()=>setWorking('grid')}>the current data</span> stored this session </div>
                                            <form className="flex flex-col items-center pb-6">
                                                <label className="block mt-2 px-4 py-2 bg-lychee-black text-lychee-white hover:text-lychee-black hover:bg-lychee-peach rounded-full shadow-xl cursor-pointer text-center text-xs font-regular" htmlFor="file-upload">
                                                    Click to Upload
                                                </label>
                                                <input id="file-upload" type="file" accept=".xlsx, .csv" onChange={handleFileUpload} className="hidden" />
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
                            <div className="h-screen sm:h-screen w-96 sm:w-full sm:px-5 flex flex-col place-items-center">
                                <div className="bg-white shadow-lg rounded-xl text-xxs px-3 py-2">
                                    <div className="font-bold">Coming Soon:</div>
                                    <div>✨Execute custom operations like Sum, Math operations, write your own functions on your data</div>
                                    <div>* Become a lifetime member to vote on which features to accelerate</div>
                                </div>
                                <div className="pt-4 text-xs font-bold">
                                    There are many secret features hidden in this grid.
                                    <div className="pt-1"/>
                                    See if you can find them - with ❤️ <Link href="https://twitter.com/misterrpink1">misterrpink</Link>
                                </div>
                                <GridView />
                            </div>              
                    }
                    {
                        fmtCols && data && ((working && working === 'chart') || !working) &&
                            <div className="min-h-screen flex flex-col xl:flex-row">
                                <div className="py-5 h-fit xl:block sm:w-2/12 shadow-xl rounded-sm mx-5">
                                    <ChartDataMods/>
                                </div>
                                <div className="w-[450px] h-[450px] sm:w-[1200px] 2xl:w-[1700px] 2xl:h-[1000px]">
                                    <ChartView/>
                                </div>
                            </div>
                            
                    }
                    { working && working === 'integrations' && <Integrations/>}
                    {
                        working && working === 'export' && 
                            <div className="w-full flex flex-col gap-10 place-content-center place-items-center">
                                <div className="text-8xl font-title">Coming Soon</div>
                                <div className="text-lychee-peach">We are working on it. Stay tuned</div>
                                <div>Export and present your charts, data, and summaries however you want. Even have Lychee AI write a report for you.</div>
                            </div>
                    }
                    {
                        working && working === 'dashboard' && 
                            <div className="w-full flex flex-col gap-10 place-content-center place-items-center px-10">
                                <div className="font-title text-4xl font-black">Dashboard</div>
                                <div>Personalize your dashboard however you want 🥳</div>
                                <div className="bg-white shadow-lg rounded-xl text-xxs px-3 py-2 w-96 mx-auto">
                                    <div className="font-bold">Coming Soon:</div>
                                    <div>✨Setup your dashboard however you want.</div>
                                    <div>✨export to mobile view so you have your data at your fingertips.</div>
                                    <div>* Become a lifetime member to vote on which features to accelerate</div>
                                </div>
                                <div className="flex flex-wrap gap-4">
                                    <div className="bg-white rounded-md shadow-2xl border-l-4 border-lychee-black py-12 px-10 hover:bg-lychee-black hover:text-lychee-white hover:border-lychee-red cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300" >
                                            <div className="font-regular text-sm">
                                                Select which Data Streams you want on your dashboard
                                            </div>
                                            <div>📡</div>
                                    </div>
                                    <div className="bg-white rounded-md shadow-2xl border-l-4 border-lychee-black py-12 px-10 hover:bg-lychee-black hover:text-lychee-white hover:border-lychee-red cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300" >
                                            <div className="font-regular text-sm">
                                                Define programmatic rules to occur based on your data
                                            </div>
                                            <div>👩‍💻</div>
                                    </div>
                                    <div className="bg-white rounded-md shadow-2xl border-l-4 border-lychee-black py-12 px-10 hover:bg-lychee-black hover:text-lychee-white hover:border-lychee-red cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300">
                                            <div className="font-regular text-sm">
                                                Connect the dots however you want
                                            </div>
                                            <div>🚀</div>
                                    </div>
                                    <div className="bg-white rounded-md shadow-2xl border-l-4 border-lychee-black py-12 px-10 hover:bg-lychee-black hover:text-lychee-white hover:border-lychee-red cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300" >
                                            <div className="font-regular text-sm">
                                                Share your dashboard view with your team or audience
                                            </div>
                                            <div>👀</div>
                                    </div>
                                    <div className="bg-white rounded-md shadow-2xl border-l-4 border-lychee-black py-12 px-10 hover:bg-lychee-black hover:text-lychee-white hover:border-lychee-red cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300">
                                            <div className="font-regular text-sm">
                                                Export your dashboard to yout apple watch or any mobile device or URL link
                                            </div>
                                            <div>😎</div>
                                    </div>
                                </div>
                            </div>
                    }
                    {
                        working && working === 'getLychee' &&
                            <div className="w-screen sm:w-full text-lychee-black">
                                <div className="sm:flex sm:px-20 pt-10">
                                    <div className="px-20 basis-1/2 grid gap-2 text-lg">
                                        <div className="font-black text-xl text-center pb-8">Already helping 10,000+ Lychee users win back their time. </div>
                                        <div className="capitalize">Hi <Link href={"https://twitter.com/misterrpink1"} className="underline">misterrpink</Link> here,</div>
                                        <div>I'm the solo dev, builder, founder of Lychee.</div>
                                        <div>Even as an AI specialist, epigenetic researcher, overall data nut, who actually enjoys coding...</div>
                                        <div className="text-2xl py-4 sm:px-10 text-lychee-red">99% of the time we do not need the overhead of current spreadsheet tools.... <br /> Why do we keep need to write Python sripts for charts?</div><div>And why is everything so ugly</div>
                                        <div className="pt-6 text-lychee-go font-black">Lychee is my answer to all those questions. </div>
                                        <div>All we gotta do now is focus on <span className="font-black text-lychee-red">the results.</span></div>
                                    </div>
                                    <div className="sr-only sm:not-sr-only w-1/2 flex place-items-center place-content-center">
                                        <div className="p-10 rounded-xl w-1/2 border border-1 border-lychee-green">
                                            <div className="font-black text-center pb-4"> Our Pledge </div>
                                            <div className="p-1">
                                                10% of all profits will be donated to charity.
                                            </div>
                                            <div className="font-black p-1">Every quarter</div>
                                            <div className="font-black p-1">YOU the community can vote on</div>
                                            <div className="p-1">
                                                A different charity, program, research initiative, donation, Kick Starter project, community investment, scholarship ...
                                            </div>
                                            <div className="text-center pt-8">❤️ <Link href={"https://twitter.com/misterrpink1"}>Misterrpink </Link></div>
                                        </div>
                                    </div>
                                </div>
                                <LycheePricing />
                            </div>
                    }
                    {
                        working && working === 'roadmap' && <Roadmap />
                    }
                </div>
            </div>
            <div className="py-4 max-w-8 mx-auto">
                <div><img src={"./fruit.png"} /></div>                
            </div>
        </div>
    )
}

export default ActionMenu