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
        <div className="w-full px-10 py-16 relative">
            <BentoBase data={dashData} dashView={true} bentoContainer={bentoContainer} setDashData={setDashData} setBentoContainer={setBentoContainer} viewing={viewing} setViewing={setViewing}/>
            <Link
                href="https://buy.stripe.com/bIY7uM4Gi7CS7IsaF4"
                rel="noopener noreferrer"
                target="_blank"
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-border shadow-lg hover:shadow-xl transition-shadow text-sm font-medium"
            >
                Deal for you
            </Link>
        </div>       
    );
};

export default KatsuView;