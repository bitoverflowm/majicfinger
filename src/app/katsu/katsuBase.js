"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence} from "framer-motion";
import { useMyState  } from '@/context/stateContext'

/* Shadcn imports
 * 
 */
import { Progress } from "@/components/ui/progress"
import { Toaster } from "@/components/ui/sonner"

import { Hero } from './hero';

import KatsuPanel from './katsu_panel';

const bentoVariants = {
    open: { height: "100vh", width: "100vw" },
    closed: { height: "75vh", width: "60vw" },
  }

const KatsuBase = () => {
    const contextState = useMyState()

    const [started, setStarted] = useState(false)
    const [width, setWidth] = useState(typeof window !== 'undefined' && window.innerWidth);

    const data = contextState?.data
    const setDflt = contextState?.setDflt
    const setData = contextState?.setData
    const dflt = contextState?.dflt
    const bentoContainer = contextState?.bentoContainer

    const [loading, setLoading] = useState(false)
    const [progress, setProgress] = React.useState(0)

    useEffect(() => {
        if(dflt){
            setLoading(true)
            setData([{
                "Icon": 'RocketIcon',
                "icon_style": {
                    'color': '#404040',
                    'height': '48px',
                    'width': '48px'
                },
                "heading": "17",
                "heading_style": {
                    'fontWeight': 900,
                    'fontStyle': 'non-italic',
                    'textAlign': 'left',
                    'fontSize': '96px',
                    'animation': 'countUp',
                },
                "description": "years of startups",
                "description_style": {
                    'fontWeight': 100,
                    'fontStyle': 'non-italic',
                    'textAlign': 'left',
                    'fontSize': '20px',
                },
                "href": "/",
                "cta": "Learn more",
                "className": "col-span-3 lg:col-span-1",
                "background":"",
                "background_color": "",
            },
            {
                "Icon": 'TwitterLogoIcon',
                "icon_style": {
                    'color': '#404040',
                    'height': '48px',
                    'width': '48px'
                },
                "heading": "1,000",
                "heading_style": {
                    'fontWeight': 900,
                    'fontStyle': 'non-italic',
                    'textAlign': 'left',
                    'fontSize': '96px',
                    'animation': 'countUp',
                },
                "description": "Followers on X",
                "description_style": {
                    'fontWeight': 100,
                    'fontStyle': 'non-italic',
                    'textAlign': 'left',
                    'fontSize': '20px',
                },
                "href": "https://twitter.com/misterrpink1",
                "cta": "Learn more",
                "className": "col-span-3 lg:col-span-2",
                "background": "globe",
                "background_color": "",
            },
            {
                "Icon": 'SketchLogoIcon',
                "icon_style": {
                    'color': '#404040',
                    'height': '48px',
                    'width': '48px'
                },
                "heading": "Katsu",
                "heading_style": {
                    'fontWeight': 900,
                    'fontStyle': 'non-italic',
                    'textAlign': 'left',
                    'fontSize': '160px',
                    'animation': '',
                },
                "description": "Launching on Product Hunt",
                "description_style": {
                    'fontWeight': 100,
                    'fontStyle': 'non-italic',
                    'textAlign': 'left',
                    'fontSize': '40px',
                },
                "href": "https://www.producthunt.com/posts/katsu?utm_source=badge-featured&utm_medium=badge&utm_source=badge-katsu",
                "cta": "Learn more",
                "className": "col-span-3 lg:col-span-2",
                "background": "",
                "background_color": "",
            },
            {
                "Icon": 'MagicWandIcon',
                "icon_style": {
                    'color': '#404040',
                    'height': '48px',
                    'width': '48px'
                },
                "heading": "Created By",
                "heading_style": {
                    'fontWeight': 900,
                    'fontStyle': 'non-italic',
                    'textAlign': 'left',
                    'fontSize': '24px',
                    'animation': '',
                },
                "description": "@misterrpink1",
                "description_style": {
                    'fontWeight': 100,
                    'fontStyle': 'non-italic',
                    'textAlign': 'left',
                    'fontSize': '20px',
                },
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

    function handleWindowSizeChange() {
        setWidth(window.innerWidth);
    }
  
    useEffect(() => {
        typeof window !== 'undefined' && window.addEventListener('resize', handleWindowSizeChange);
        return () => {
            window && window.removeEventListener('resize', handleWindowSizeChange);
        }
    }, []);

    return (
        <div>
           <Toaster />
            <AnimatePresence>
                {
                    !(started) &&
                        <motion.div
                            initial={{ height: '40vh', opacity: 1}}
                            animate={{ height: '50vh', opacity: 1}}
                            exit={{ height: '0px', opacity: 0}}
                            transition={{ ease: "easeOut", duration: 0.2 }}
                        >
                            <Hero data={data} progress={progress} setStarted={setStarted} background_color={bentoContainer && bentoContainer.background_color} width={width}/>
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
                    {started &&
                        <KatsuPanel data={data} mobile={width && width <= 768}/>
                    }
                </motion.div>
            </div>       
        </div>
    );
};

export default KatsuBase;