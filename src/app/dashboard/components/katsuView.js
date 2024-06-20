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
        <div className="w-full h-full flex flex-col place-items-center place-content-center px-10">
            <ComingSoon />
            <div className='sm:w-1/2 pt-4'>
                <blockquote className="mt-6 border-l-2 pl-6 italic text-xs">This is your dashboard. Soon you will be able to customize this view with any data, visualization or link. PS: Check out the beautiful color pallates. Customize this view, share with your friends, audience or team. Take your presentations to the next level.</blockquote> 
            </div>
            <BentoBase data={dashData} dashView={true} bentoContainer={bentoContainer} setDashData={setDashData} setBentoContainer={setBentoContainer} viewing={viewing} setViewing={setViewing}/>            
        </div>       
    );
};

export default KatsuView;