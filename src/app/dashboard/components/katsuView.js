"use client";

import React from 'react';
import { useMyStateV2  } from '@/context/stateContextV2'


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
        <div className="w-full px-10 py-16 relative">
            <BentoBase data={dashData} dashView={true} bentoContainer={bentoContainer} setDashData={setDashData} setBentoContainer={setBentoContainer} viewing={viewing} setViewing={setViewing}/>
        </div>       
    );
};

export default KatsuView;