import React, { useEffect, useState } from 'react';
import { fetchEarthquakeData } from './earthquake_helper';
import { Transition } from '@headlessui/react';
import { BiLogoInstagramAlt, BiLogoGmail, BiDownArrow } from "react-icons/bi";
import { FaCcStripe, FaLinkedin, FaStrava } from "react-icons/fa";
import { FaMeta, FaXTwitter } from "react-icons/fa6";
import { CgAppleWatch } from "react-icons/cg";
import { ImYoutube2 } from "react-icons/im";
import { WiEarthquake } from "react-icons/wi";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { SiQuickbooks } from "react-icons/si";
import { MdOutlineArrowBackIosNew } from "react-icons/md";
import { IoHelp } from "react-icons/io5";
import { IoMdClose, IoMdAdd  } from "react-icons/io";
import { FaSquareXTwitter } from "react-icons/fa6";

import { definitions } from './twitter/definitions';


import { useMyState  } from '@/context/stateContext'
import GridView from '../gridView';
import TwitterIntegration from './twitter';

const Integrations = () => {
    const contextState = useMyState()

    const data  = contextState?.data;
    const setData = contextState?.setData;
    const setDflt = contextState?.setDflt;
    const setWorking = contextState?.setWorking;

    const [activeAPI, setActiveAPI] = useState('twitter')

    const [loading, setLoading] = useState(false);
    const [connected, setConnected] = useState(false);
    const [helperOpen, setHelperOpen] = useState(false);

    const [stepName, setStepName] = useState('');

    const fetchEarthQuakesHandler = async (lat, long) => {
        setLoading(true);
        let quakes = await fetchEarthquakeData(lat, long);
        let data = quakes.features.map(feature => feature.properties)
        setData(data);
        setConnected(true);
        setDflt(false)
        setLoading(false);
    }


    return (
        <div className='w-full min-h-screen flex px-5'>
            {/* helper section*/}
            <div className={`${helperOpen && 'hidden'} fixed -right-8 top-60 -rotate-90 flex gap-2 cursor-pointer text-sm place-items-center bg-lychee-black text-white pt-4 pb-8 pl-4 pr-6 rounded-t-xl transition duration-150 hover:-translate-x-2.5 hover:bg-gradient-to-r hover:from-lychee-black hover:to-lychee-red `} onClick={()=>setHelperOpen(true)}><IoHelp /> Helper</div>
            <Transition
                    show={helperOpen}
                    enter="transition ease-in-out duration-300 transform"
                    enterFrom="translate-x-full"
                    enterTo="0"
                    leave="transition ease-in-out duration-300 transform"
                    leaveFrom="0"
                    leaveTo="translate-x-full"
                    className="fixed top-0 right-0 w-2/5 bg-slate-100/40 backdrop-blur-2xl h-dvh shadow-xl px-10 pt-10 z-20"
                >
                    <div className='font-black cursor-pointer' onClick={()=>setHelperOpen(false)}><IoMdClose /></div>
                    {
                        stepName && 
                            <div className='mt-4 pt-4 px-10 bg-white/30'>
                                <div className='text-xl text-slate-500'>Hi there,  </div>
                                <div className='pt-1 text-xl text-slate-500'>With each "action" you are querying the entire integration platform.  </div>
                                <div className='pt-1 text-xl text-slate-500'>That's billions upon billions of data points</div>
                                <div className='pt-1 text-xl text-slate-500'>If you think Twitter is a lot of data, think about Twitter + Instagram + linkedin + quickbooks ... </div>
                                <div className='pt-1 text-xl text-slate-500'>With Lychee you have the world's data at your fingertips</div>
                                <div className='pt-4 text-2xl'>Options</div>
                                <div className='pt-1'>Each option in a given action has a specific meaning and function listed below: </div>
                                
                                {
                                    definitions && Object.entries(definitions).map(([key, value], i) => (
                                        <div key={i} className='py-1 text-xs flex gap-4 hover:bg-slate-100'>
                                            <div className='font-bold text-slate-400 basis-1/5'>{key}: </div>
                                            <div className='basis-4/5'>{value}</div>
                                        </div>
                                    ))
                                }
                                
                            </div>
                    }
            </Transition>
            {/* end of helper section*/}
            <div className='bg-lychee-green rounded-3xl py-7'>                                        
                <div className={`text-5xl py-2 text-center flex flex-col place-items-center ${activeAPI !== 'twitter' ? 'text-white hover:bg-white hover:text-black cursor-pointer': 'bg-white text-black'}  px-6`} onClick={()=>setActiveAPI('twitter')}><FaSquareXTwitter /><div className='text-xxs text-center pt-2'>Twitter</div></div>
                <div className={`text-5xl py-2 text-center flex flex-col place-items-center ${activeAPI !== 'earthquake' ? 'text-white hover:bg-white hover:text-black cursor-pointer': 'bg-white text-black'}  px-6`} onClick={()=>setActiveAPI('earthquake')}><WiEarthquake /><div className='text-xxs text-center pt-2'>Earthquakes</div></div>
                <div className={`text-5xl py-2 text-center flex flex-col place-items-center ${activeAPI !== 'instagram' ? 'text-white hover:bg-white hover:text-black cursor-pointer': 'bg-white text-black'}  px-6`} onClick={()=>setActiveAPI('instagram')}><BiLogoInstagramAlt /><div className='text-xxs text-center pt-2'>Instagram</div></div>
                <div className={`text-5xl py-2 text-center flex flex-col place-items-center ${activeAPI !== 'stripe' ? 'text-white hover:bg-white hover:text-black cursor-pointer': 'bg-white text-black'}  px-6`} onClick={()=>setActiveAPI('stripe')}><FaCcStripe /><div className='text-xxs text-center pt-2'>Stripe</div></div>
                <div className={`text-5xl py-2 text-center flex flex-col place-items-center ${activeAPI !== 'linkedIn' ? 'text-white hover:bg-white hover:text-black cursor-pointer': 'bg-white text-black'}  px-6`} onClick={()=>setActiveAPI('linkedIn')}><FaLinkedin /><div className='text-xxs text-center pt-2'>LinkedIn</div></div>
                <div className={`text-5xl py-2 text-center flex flex-col place-items-center ${activeAPI !== 'meta' ? 'text-white hover:bg-white hover:text-black cursor-pointer': 'bg-white text-black'}  px-6`} onClick={()=>setActiveAPI('meta')}><FaMeta /><div className='text-xxs text-center pt-2'>Meta</div></div>
                <div className={`text-5xl py-2 text-center flex flex-col place-items-center ${activeAPI !== 'appleWatch' ? 'text-white hover:bg-white hover:text-black cursor-pointer': 'bg-white text-black'}  px-6`} onClick={()=>setActiveAPI('appleWatch')}><CgAppleWatch /><div className='text-xxs text-center pt-2'>Apple Watch</div></div>
                <div className={`text-5xl py-2 text-center flex flex-col place-items-center ${activeAPI !== 'youtube' ? 'text-white hover:bg-white hover:text-black cursor-pointer': 'bg-white text-black'}  px-6`} onClick={()=>setActiveAPI('youtube')}><ImYoutube2 /><div className='text-xxs text-center pt-2'>Youtube</div></div>
                <div className={`text-5xl py-2 text-center flex flex-col place-items-center ${activeAPI !== 'strava' ? 'text-white hover:bg-white hover:text-black cursor-pointer': 'bg-white text-black'}  px-6`} onClick={()=>setActiveAPI('strava')}><FaStrava  /><div className='text-xxs text-center pt-2'>Strava</div></div>
                <div className={`text-5xl py-2 text-center flex flex-col place-items-center ${activeAPI !== 'quickBooks' ? 'text-white hover:bg-white hover:text-black cursor-pointer': 'bg-white text-black'}  px-6`} onClick={()=>setActiveAPI('quickBooks')}><SiQuickbooks /><div className='text-xxs text-center pt-3'>QuickBooks</div></div>
                <div className={`text-5xl py-2 text-center flex flex-col place-items-center ${activeAPI !== 'more' ? 'text-white hover:bg-white hover:text-black cursor-pointer': 'bg-white text-black'}  px-6`} onClick={()=>setActiveAPI('more')}><IoMdAdd  /><div className='text-xxs text-center pt-2'>More</div></div>
            </div>
            <div className='w-full h-full'>
                { activeAPI === 'twitter' &&
                    <TwitterIntegration setData={setData} setDflt={setDflt} stepName={stepName} setStepName={setStepName} setHelperOpen={setHelperOpen} setWorking={setWorking}/>
                }
                <Transition 
                        show={activeAPI !== 'twitter'}
                        enter="transition-opacity duration-1000"
                        enterFrom="opacity-0"
                        enterTo="opacity-100 h-auto"
                        leave="transition-opacity duration-150"
                        leaveFrom="opacity-100 h-auto"
                        leaveTo="opacity-0"
                        className={" py-56 w-full grid place-content-center"}>
                        <div className='text-6xl font-body font-black w-1/2 mx-auto text-center'>
                            Connect directly to your favorite data sources
                        </div>
                        <div className='font-title mx-auto text-xl py-4'>Powerful, No Download Necessary, Visualize Instantly</div>
                        <div className='text-xs mx-auto'>Join now to vote on which integrations will be most useful to you.</div>
                        <div className='bg-lychee-go w-fit mx-auto mt-10 py-2 px-3 rounded-xl hover:bg-lychee-black hover:text-white cursor-pointer' onClick={()=>setWorking('getLychee')}>
                            Get Lychee Now
                        </div>
                </Transition>
            </div>
        </div>
    );
};

export default Integrations;