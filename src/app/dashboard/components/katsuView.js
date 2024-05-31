"use client";

import React, { useEffect, useState } from 'react';
import { motion} from "framer-motion";
import { useMyStateV2  } from '@/context/stateContextV2'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"


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

    return (
        <div className="w-full h-full flex flex-col place-items-center place-content-center px-10">
            <Alert className="text-xs bg-lychee_white/50 text-lychee_black border-none w-2/5 mx-auto flex place-items-center gap-6">
                <Link rel="noopener noreferrer" target="_blank" href={'https://twitter.com/misterrpink1'}>
                    <Avatar>
                        <AvatarImage src="/avatar1.png" />
                        <AvatarFallback>MP</AvatarFallback>
                    </Avatar> Mr. Pink  
                </Link>
                <div>
                    <AlertTitle> 🚧 Heads up! Lychee V2.0 is coming!</AlertTitle>
                    <AlertDescription >
                            I am moving some things around. Platform is functional, but things might break.
                    </AlertDescription>
                </div>
            </Alert>
            <BentoBase data={dashData} dashView={true} bentoContainer={bentoContainer} setDashData={setDashData} setBentoContainer={setBentoContainer} viewing={viewing} setViewing={setViewing}/>            
        </div>       
    );
};

export default KatsuView;