"use client";

import React, { useEffect, useState } from 'react';
import { motion} from "framer-motion";
import { useMyStateV2  } from '@/context/stateContextV2'


/* Shadcn imports
 * 
 */
import { BentoBase } from './bentoBase';
import ComingSoon from './comingSoon';

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

    return (
        <div className="w-full h-full flex flex-col place-items-center place-content-center px-10">
            <ComingSoon />
            <BentoBase data={dashData} dashView={true} bentoContainer={bentoContainer} setDashData={setDashData} setBentoContainer={setBentoContainer} viewing={viewing} setViewing={setViewing}/>            
        </div>       
    );
};

export default KatsuView;