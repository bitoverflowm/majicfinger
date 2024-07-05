"use client";

import React from 'react';
import Link from 'next/link';
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
        <div className="w-full px-10 py-16">
            <blockquote className="mb-2 border-l-2 pl-6 italic text-xs w-1/2">
                <span className='font-bold'>Lychee V2.0.0 is coming!</span> <br/>
                Get Instant Access For Life 29.99 (85% off). No monthly subs <br/>
                (3 seats remaining) <br/>
                <Link rel="noopener noreferrer" target="_blank" className="underline bg-lychee_green/30" href="https://buy.stripe.com/aEUaGYfkW9L04wgbJ3"> Get deal now! </Link>
            </blockquote> 
            <BentoBase data={dashData} dashView={true} bentoContainer={bentoContainer} setDashData={setDashData} setBentoContainer={setBentoContainer} viewing={viewing} setViewing={setViewing}/>
        </div>       
    );
};

export default KatsuView;