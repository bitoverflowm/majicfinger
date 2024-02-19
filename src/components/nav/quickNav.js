'use client';
import React from 'react';

import { useMyState  } from '@/context/stateContext'

const QuickNav = () => {
    const { working, setWorking } = useMyState();
    const { aiOpen, setAiOpen } = useMyState();

    return (
        <div className='fixed top-10 right-10 z-20 bg-white/30 rounded-xl px-8 py-5 text-lychee-black shadow-2xl flex flex-col gap-2 text-xs backdrop-blur-2xl place-items-center'>
            <div className='text-lg pb-1'>Enough Talk...</div>        
            <div className='flex flex-col gap-2'>
                <div className='p-2 px-3 cursor-pointer bg-white rounded-xl hover:bg-black hover:text-white shadow-inner' onClick={()=>setWorking('upload')}>Upload Data</div>        
                <div className='p-2 px-3 cursor-pointer bg-white rounded-xl hover:bg-black hover:text-white shadow-inner' onClick={()=>setAiOpen(true)}>AI Generate Data</div>
                <div className='p-2 px-3 cursor-pointer bg-white rounded-xl hover:bg-black hover:text-white shadow-inner'>View Table</div>
                <div className='p-2 px-3 cursor-pointer bg-white rounded-xl hover:bg-black hover:text-white shadow-inner'>Customize Chart</div>
                <div className='p-2 px-3 cursor-pointer bg-white rounded-xl hover:bg-black hover:text-white shadow-inner'>Integration</div>
                <div className='p-2 px-3 cursor-pointer bg-white rounded-xl hover:bg-black hover:text-white shadow-inner'>Roadmap</div>
                <div className='p-2 px-3 cursor-pointer bg-white rounded-xl hover:bg-black hover:text-white shadow-inner'>Get Lychee Now!</div>
            </div>
            <div className="w-16 p-4">
            <img src={"./fruit.png"}/>
            </div>
        </div>
    );
};

export default QuickNav;
