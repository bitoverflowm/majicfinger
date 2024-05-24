"use client";

import React, { useEffect, useState } from 'react';
import { motion} from "framer-motion";
import { useMyStateV2  } from '@/context/stateContextV2'

import Link from "next/link";

import {
    Alert,
    AlertDescription,
    AlertTitle,
  } from "@/components/ui/alert"

/* Shadcn imports
 * 
 */
import { BentoBase } from './bentoBase';

const bentoVariants = {
    open: { height: "100vh", width: "100vw" },
    closed: { height: "75vh", width: "60vw" },
  }

const KatsuView = () => {
    const contextStateV2 = useMyStateV2()
    
    const dashData = contextStateV2?.dashData
    const setDashData = contextStateV2?.setDashData
    const bentoContainer = contextStateV2?.bentoContainer
    const setBentoContainer = contextStateV2?.setBentoContainer
    const viewing = contextStateV2?.viewing
    const setViewing = contextStateV2?.setViewing

    const [loading, setLoading] = useState()


    useEffect(() => {
        if(dashData){
            setLoading(false)

        }else{
            setLoading(true)
        }
    }, [dashData])



    return (
        <div className="w-full h-full flex place-items-center place-content-center">
            <motion.div
                animate={true}
                viewport={{once: true}}
                variants={bentoVariants}
                className='w-5/6'
            >
                <Alert className="text-xs bg-lychee_white text-lychee_black border-none w-1/3 mx-auto">
                    <AlertTitle> 🚧 Heads up!</AlertTitle>
                    <AlertDescription >
                        Lychee V2.0 is coming! I am moving some things around. <br/> You can still use the platform, but things might break. - <Link href={'https://twitter.com/misterrpink1'}>@misterrpink</Link>
                    </AlertDescription>
                </Alert>
                <BentoBase data={dashData} dashView={true} bentoContainer={bentoContainer} setDashData={setDashData} setBentoContainer={setBentoContainer} viewing={viewing} setViewing={setViewing}/>
            </motion.div>
        </div>       
    );
};

export default KatsuView;