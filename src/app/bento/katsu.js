"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence} from "framer-motion";


import BrowserFrame from "react-browser-frame";
import * as XLSX from 'xlsx'

import { useMyState  } from '@/context/stateContext'

import { ModeToggle } from "@/components/ui/modeToggle";


import { BentoBase } from "@/components/bentoView/bentoBase";

/* Shadcn imports
 * 
 */
import { Progress } from "@/components/ui/progress"

import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/sonner"

import KatsuPanel from './katsu_panel';

const bentoVariants = {
    open: { height: "100vh", width: "100vw" },
    closed: { height: "75vh", width: "60vw" },
  }

const Katsu = () => {
    const contextState = useMyState()

    const [started, setStarted] = useState(false)

    const data = contextState?.data
    const setDflt = contextState?.setDflt
    const setData = contextState?.setData
    const dflt = contextState?.dflt

    const [loading, setLoading] = useState(false)
    const [progress, setProgress] = React.useState(0)

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
        <div className='h-lvh'>
           <Toaster />
           <div className="fixed bottom-10 right-10">
                <ModeToggle />
            </div>
            <AnimatePresence>
                { !started &&
                    <motion.div
                        initial={{ height: '40vh', opacity: 1}}
                        animate={{ height: '50vh', opacity: 1}}
                        exit={{ height: '0px', opacity: 0}}
                        transition={{ ease: "easeOut", duration: 0.2 }}
                        className='flex bg-black py-42 text-white place-items-center place-content-center overflow-hidden'
                    >                        
                        <div className="w-1/2 text-center">
                            <h1 className="text-8xl font-bold py-4">Bentos That Stand Out</h1>
                            <p className='pb-8'>Soooo tasty, it'll make your friends jealous</p>
                            <Button className="shadow-2xl bg-purple-500 text-fuchsia-50" onClick={()=>setStarted(true)}>
                                Create One Now
                            </Button>
                        </div>
                    </motion.div>
                }
            </AnimatePresence>
            <div className="flex place-items-center place-content-center">
                <motion.div
                    animate={started ? "open" : "closed"}
                    viewport={{once: true}}
                    variants={bentoVariants}
                    className='flex place-items-center place-content-center'
                >
                    {!started ? 
                        <BrowserFrame url="http://www.yourname.lych3e.com">                
                            <div className='flex justify-items-center'>
                                <div className="px-5 overflow-hidden py-6 place-items-center place-content-center">
                                    {data ? <BentoBase data={data}/> : <Progress value={progress} className="w-[60%]" />}
                                </div>
                            </div>
                        </BrowserFrame>
                        : <div className='grid w-full justify-items-center'>
                            <KatsuPanel data={data}/>
                        </div>
                        }
                </motion.div>
            </div>       
        </div>
    );
};

export default Katsu;