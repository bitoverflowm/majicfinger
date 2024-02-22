'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';

import { GoEyeClosed } from "react-icons/go";

import { useMyState  } from '@/context/stateContext'
import { useUser } from '@/lib/hooks';

const QuickNav = () => {
    const { working, setWorking } = useMyState()
    const { aiOpen, setAiOpen } = useMyState()
    const user = useUser()

    const [open, setOpen ] = useState(true)

    useEffect(() => {
        if(aiOpen) setOpen(false)
    }, [aiOpen])

    return (
        <div className='hidden lg:block fixed top-10 right-10 z-20 bg-white/30 rounded-xl px-8 py-5 text-lychee-black shadow-2xl flex flex-col gap-2 text-xs backdrop-blur-2xl place-items-center'>
            {
                user ? 
                    <div className='flex flex-col gap-4 place-content-center place-items-center'>
                        <div className='rounded-full bg-lychee-peach text-white p-2 px-4 capitalize'>
                            {user.name ? user.name : user.email.split('@')[0]}
                        </div>
                        <Link href="/api/logout" className='cursor-pointer hover:text-slate-300'>Logout</Link>
                    </div>
                    :
                    <>
                        {
                            open ?
                                <div className='flex flex-col place-items-center'>
                                    <div className='text-md pb-3 text-center flex flex-col place-items-center place-content-center'> <GoEyeClosed onClick={()=>setOpen(false)} className='cursor-pointer'/>  Enough Talk...</div>        
                                    <div className='flex flex-col gap-2'>
                                        <div className='p-2 px-3 cursor-pointer bg-white rounded-xl hover:bg-black hover:text-white shadow-inner' onClick={()=>setWorking('upload')}>Upload Data</div>        
                                        <div className='p-2 px-3 cursor-pointer bg-white rounded-xl hover:bg-black hover:text-white shadow-inner' onClick={()=>setAiOpen(true)}>AI Generate Data</div>
                                        <div className='p-2 px-3 cursor-pointer bg-white rounded-xl hover:bg-black hover:text-white shadow-inner'  onClick={()=>setWorking('grid')}>View Data</div>
                                        <div className='p-2 px-3 cursor-pointer bg-white rounded-xl hover:bg-black hover:text-white shadow-inner'  onClick={()=>setWorking('chart')}>Customize Chart</div>
                                        <div className='p-2 px-3 cursor-pointer bg-white rounded-xl hover:bg-black hover:text-white shadow-inner'  onClick={()=>setWorking('integrations')}>Integration</div>
                                        <div className='p-2 px-3 cursor-pointer bg-white rounded-xl hover:bg-black hover:text-white shadow-inner' onClick={()=>setWorking('roadmap')}>Roadmap</div>
                                        <div className='p-2 px-3 cursor-pointer bg-white rounded-xl hover:bg-black hover:text-white shadow-inner' onClick={()=>setWorking('getLychee')}>Get Lychee Now!</div>
                                    </div>
                                    <div className="w-16 p-4">
                                        <img src={"./fruit.png"}/>
                                    </div>
                                </div>
                                    :
                                <div className='bg-lychee-red text-white cursor-pointer rounded-full py-3 px-2'>
                                    <div onClick={()=>setOpen(true)}>Open</div>
                                </div>
                        }
                    </>
            }
            

        </div>
    );
};

export default QuickNav;
