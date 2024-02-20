'use client';
import React, { useState } from 'react';

import { GoEyeClosed } from "react-icons/go";

import { useMyState  } from '@/context/stateContext'

const QuickNav = () => {
    const { working, setWorking } = useMyState()
    const { aiOpen, setAiOpen } = useMyState()

    const [open, setOpen ] = useState(true)

    return (
        <div className='fixed top-10 right-10 z-20 bg-white/30 rounded-xl px-8 py-5 text-lychee-black shadow-2xl flex flex-col gap-2 text-xs backdrop-blur-2xl place-items-center'>
            {
                open ?
                    <div className='flex flex-col place-items-center'>
                        <div className='text-lg pb-1 text-center'> <GoEyeClosed onClick={()=>setOpen(false)} />  Enough Talk...</div>        
                        <div className='flex flex-col gap-2'>
                            <div className='p-2 px-3 cursor-pointer bg-white rounded-xl hover:bg-black hover:text-white shadow-inner' onClick={()=>setWorking('upload')}>Upload Data</div>        
                            <div className='p-2 px-3 cursor-pointer bg-white rounded-xl hover:bg-black hover:text-white shadow-inner' onClick={()=>setAiOpen(true)}>AI Generate Data</div>
                            <div className='p-2 px-3 cursor-pointer bg-white rounded-xl hover:bg-black hover:text-white shadow-inner'  onClick={()=>setWorking('grid')}>View Data</div>
                            <div className='p-2 px-3 cursor-pointer bg-white rounded-xl hover:bg-black hover:text-white shadow-inner'  onClick={()=>setWorking('chart')}>Customize Chart</div>
                            <div className='p-2 px-3 cursor-pointer bg-white rounded-xl hover:bg-black hover:text-white shadow-inner'  onClick={()=>setWorking('integrations')}>Integration</div>
                            <div className='p-2 px-3 cursor-pointer bg-white rounded-xl hover:bg-black hover:text-white shadow-inner'>Roadmap</div>
                            <div className='p-2 px-3 cursor-pointer bg-white rounded-xl hover:bg-black hover:text-white shadow-inner' onClick={()=>setWorking('getLychee')}>Get Lychee Now!</div>
                        </div>
                        <div className="w-16 p-4">
                            <img src={"./fruit.png"}/>
                        </div>
                    </div>
                        :
                    <div className='bg-lychee-red text-white cursor:pointer rounded-full py-3 px-2'>
                        <div onClick={()=>setOpen(true)}>Open</div>
                    </div>
            }

        </div>
    );
};

export default QuickNav;
