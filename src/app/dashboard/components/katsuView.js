"use client";

import React, { useEffect, useState } from 'react';
import { motion} from "framer-motion";
import { useMyStateV2  } from '@/context/stateContextV2'

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
                <BentoBase data={dashData} basic={true} bentoContainer={bentoContainer} setDashData={setDashData} setBentoContainer={setBentoContainer}/>
            </motion.div>
        </div>       
    );
};

export default KatsuView;