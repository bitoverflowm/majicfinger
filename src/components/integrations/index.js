import React, { useEffect, useState } from 'react';
import { fetchEarthquakeData } from './earthquake_helper';
import { Transition } from '@headlessui/react';
import { BiLogoInstagramAlt, BiLogoGmail, BiDownArrow } from "react-icons/bi";
import { FaCcStripe, FaLinkedin } from "react-icons/fa";
import { FaMeta, FaXTwitter } from "react-icons/fa6";
import { CgAppleWatch } from "react-icons/cg";
import { ImYoutube2 } from "react-icons/im";
import { WiEarthquake } from "react-icons/wi";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { SiQuickbooks } from "react-icons/si";
import { MdOutlineArrowBackIosNew } from "react-icons/md";


import { useMyState  } from '@/context/stateContext'
import GridView from '../gridView';
import TwitterIntegration from './twitter';

const Integrations = () => {
    const contextState = useMyState()

    const data  = contextState?.data;
    const setData = contextState?.setData;
    const setDflt = contextState?.setDflt;
    const setWorking = contextState?.setWorking;

    const [connectData, setConnectData] = useState();
    const [loading, setLoading] = useState(false);
    const [connected, setConnected] = useState(false);

    const [connecting, setConneting] = useState();

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
        <div className='w-full bg-white grid place-items-center py-10 px-20'>
            <Transition 
                    show={!connecting}
                    enter="transition-opacity duration-1000"
                    enterFrom="opacity-0"
                    enterTo="opacity-100 h-auto"
                    leave="transition-opacity duration-150"
                    leaveFrom="opacity-100 h-auto"
                    leaveTo="opacity-0"
                    className={"w-full grid place-content-center"}>
                    <div className='text-6xl font-body font-black w-1/2 mx-auto text-center'>
                        Connect directly to your favorite data sources
                    </div>
                    <div className='font-title mx-auto text-xl py-4'>Powerful, Straight From The Horses Mouth, No Download Necessary</div>
                    <div className='text-xs mx-auto'>* Join now to vote on which integrations will be most useful to you.</div>
                    <div className='font-bold text-xl pt-10 text-slate-500'>Ready for you to try...</div>
                    <div className='flex gap-4 py-10'>
                        <div className='border border-slate-100 rounded-xl h-[260px] w-[350px] pl-10 pt-10 bg-slate-100/20 shadow-lg hover:shadow-xl hover:bg-lychee-red hover:text-white cursor-pointer transition ease-in-out delay-150 hover:scale-110 duration-300' onClick={()=>setConneting('twitter')}>
                            <div className='text-4xl py-2'><FaXTwitter /></div>
                            <div className='text-4xl pt-2 pb-2 font-black'>Twitter/ X</div>
                            <div className='flex font-bold text-sm place-items-end gap-2 pt-10'>Start pulling <div className='hover:animate-bounce'><BiDownArrow /></div></div>
                        </div>
                        <div className='border border-slate-100 rounded-xl h-[260px] w-[350px] pl-10 pt-10 bg-slate-100/20 shadow-lg hover:shadow-xl hover:bg-lychee-red hover:text-white cursor-pointer transition ease-in-out delay-150 hover:scale-110 duration-300' onClick={()=>setConneting('earthquakes')}>
                            <div className='text-4xl py-2'><WiEarthquake /></div>
                            <div className='text-4xl pt-2 pb-2 font-black'>Earthquakes</div>
                            <div className='flex font-bold text-sm place-items-end gap-2 pt-10'>Start pulling <div className='hover:animate-bounce'><BiDownArrow /></div></div>
                        </div>
                    </div>
                    <div>Future Integrations</div>        
                    <div className="flex flex-wrap gap-10">
                        <div className="bg-white rounded-md shadow-2xl border-l-4 border-lychee-black py-4 px-4 hover:bg-lychee-black hover:text-lychee-white hover:border-lychee-red cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300 font-title text-3xl font-bold"  onClick={() => setEmailVisible(true)}>
                            <ImYoutube2 />
                        </div>
                        <div className="bg-white rounded-md shadow-2xl border-l-4 border-lychee-black py-4 px-4 hover:bg-lychee-black hover:text-lychee-white hover:border-lychee-red cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300 font-title text-3xl font-bold"  onClick={() => setEmailVisible(true)}>
                            <BiLogoInstagramAlt />
                        </div>
                        <div className="bg-white rounded-md shadow-2xl border-l-4 border-lychee-black py-4 px-4 hover:bg-lychee-black hover:text-lychee-white hover:border-lychee-red cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300 font-title text-3xl font-bold"  onClick={() => setEmailVisible(true)}>
                            <FaCcStripe />
                        </div>
                        <div className="bg-white rounded-md shadow-2xl border-l-4 border-lychee-black py-4 px-4 hover:bg-lychee-black hover:text-lychee-white hover:border-lychee-red cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300 font-title text-3xl font-bold"  onClick={() => setEmailVisible(true)}>
                            <FaLinkedin />
                        </div>
                        <div className="bg-white rounded-md shadow-2xl border-l-4 border-lychee-black py-4 px-4 hover:bg-lychee-black hover:text-lychee-white hover:border-lychee-red cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300 font-title text-3xl font-bold"  onClick={() => setEmailVisible(true)}>
                            <BiLogoGmail />
                        </div>
                        <div className="bg-white rounded-md shadow-2xl border-l-4 border-lychee-black py-4 px-4 hover:bg-lychee-black hover:text-lychee-white hover:border-lychee-red cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300 font-title text-3xl font-bold"  onClick={() => setEmailVisible(true)}>
                            <FaMeta />
                        </div>
                        <div className="bg-white rounded-md shadow-2xl border-l-4 border-lychee-black py-4 px-4 hover:bg-lychee-black hover:text-lychee-white hover:border-lychee-red cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300 font-title text-3xl font-bold"  onClick={() => setEmailVisible(true)}>
                            <CgAppleWatch />
                        </div>
                        <div className="bg-white rounded-md shadow-2xl border-l-4 border-lychee-black py-4 px-4 hover:bg-lychee-black hover:text-lychee-white hover:border-lychee-red cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300 font-title text-3xl font-bold"  onClick={() => setEmailVisible(true)}>
                            <SiQuickbooks />
                        </div>
                    </div>
            </Transition>
            <Transition 
                    show={connecting === 'twitter'}
                    enter="transition-opacity duration-1000"
                    enterFrom="opacity-0 h-0"
                    enterTo="opacity-100 h-auto"
                    leave="transition-opacity duration-150"
                    leaveFrom="opacity-100 h-auto"
                    leaveTo="opacity-0"
                    className="w-5/6">
                        <div className='pl-10 text-sm flex place-items-center cursor-pointer hover:text-lychee-red' onClick={()=>setConneting()}><MdOutlineArrowBackIosNew /> <div className='text-xxs'>Back </div></div>
                        <div className='grid place-items-center'>                            
                            <TwitterIntegration setData={setData} setDflt={setDflt} connecting={connecting}/>
                        </div>
            </Transition>
        
        </div>
    );
};

export default Integrations;