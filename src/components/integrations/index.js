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
        <div className='w-full bg-white grid place-items-center py-10'>
            <Transition 
                    show={!connecting}
                    enter="transition-opacity duration-1000"
                    enterFrom="opacity-0"
                    enterTo="opacity-100 h-auto"
                    leave="transition-opacity duration-150"
                    leaveFrom="opacity-100 h-auto"
                    leaveTo="opacity-0">
                    <div className='text-4xl font-body font-black w-1/3 text-center'>
                        Connect directly to your favorite data sources
                    </div>
                    <div className='text-sm py-4'>Powerful, RAW, no download necessary</div>
                    <div className='text-xxs'>* Become a lifetime member to vote on which integrations will be most useful to you.</div>
                            <div className='font-bold text-xl pt-10 text-slate-500'>Ready for you to cook...</div>
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
            </Transition>
            <Transition 
                    show={connecting === 'twitter'}
                    enter="transition-opacity duration-1000"
                    enterFrom="opacity-0 h-0"
                    enterTo="opacity-100 h-auto"
                    leave="transition-opacity duration-150"
                    leaveFrom="opacity-100 h-auto"
                    leaveTo="opacity-0">
                        <div className='w-full h-full'>
                            <div className='text-sm flex place-items-center cursor-pointer hover:text-lychee-red' onClick={()=>setConneting()}><MdOutlineArrowBackIosNew /> <div className='text-xxs'>Back </div></div>
                            <div className=''>
                                <div className='text-xxs text-lychee-peach underline cursor-pointer' onClick={()=>setWorking('getLychee')}>Subscribe to use the full extent of this feature</div>
                                <div className='text-xxs'>If enough LifeTime members vote for Twitter, we can subscribe to the enterprise plan, which will give us access to: </div>
                                <div className='text-xxs'>- Rate-limited access to suite of v2 endpoints, including search and  filtered stream</div>
                                <div className='text-xxs'>- More than 1,000,000 requests per month</div>
                                <div className='text-xxs'>- Complete streams: replay, engagement metrics, backfill, and more features</div>
                            </div>
                            <TwitterIntegration data={data} setData={setData} setDflt={setDflt}/>
                        </div>
            </Transition>
            
            <div className='text-xxs py-10 flex flex-col gap-4 hidden'>                
                <div className='px-10 flex gap-4'>
                    <div className="bg-white rounded-md shadow-2xl border-l-4 border-lychee-black py-4 px-4 hover:bg-lychee-black hover:text-lychee-white hover:border-lychee-red cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300 font-title text-3xl font-bold sm:w-1/4 flex flex-col place-items-center"  onClick={()=>setConnectData('earthquake')}>
                        <div className='text-lg font-title font-bold'>Earthquakes</div>
                        
                    </div>
                    <div className="bg-white rounded-md shadow-2xl border-l-4 border-lychee-black py-4 px-4 hover:bg-lychee-black hover:text-lychee-white hover:border-lychee-red cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300 font-title text-3xl font-bold sm:w-1/4 flex flex-col place-items-center"  onClick={()=>setConnectData('twitter')}>
                        <div className='text-lg font-title font-bold'>X (Twitter)</div>                        
                    </div>
                </div>
                <Transition 
                    show={connectData === 'earthquake'}
                    enter="transition-opacity duration-1000"
                    enterFrom="opacity-0 h-0"
                    enterTo="opacity-100 h-auto"
                    leave="transition-opacity duration-150"
                    leaveFrom="opacity-100 h-auto"
                    leaveTo="opacity-0">
                        <div className='text-xs font-body font-thin w-full flex flex-col place-items-center'>
                            <div className=''>Pick a location</div>
                            <div className='text-xxs'>*Lifetime members can request new locations and criteria</div>
                            <div className='flex flex-wrap gap-2'>
                                <div className="bg-white shadow-xl px-3 py-2 my-2 text-xs rounded-lg hover:bg-black hover:text-white cursor-pointer" onClick={()=>fetchEarthQuakesHandler(32.715736, -117.161087)}>San Diego</div>
                                <div className="bg-white shadow-xl px-3 py-2 my-2 text-xs rounded-lg hover:bg-black hover:text-white cursor-pointer" onClick={()=>fetchEarthQuakesHandler(40.730610, -73.935242)}>New York</div>
                                <div className="bg-white shadow-xl px-3 py-2 my-2 text-xs rounded-lg hover:bg-black hover:text-white cursor-pointer" onClick={()=>fetchEarthQuakesHandler(27.700001, 85.333336)}>Kathmandu</div>
                                <div className="bg-white shadow-xl px-3 py-2 my-2 text-xs rounded-lg hover:bg-black hover:text-white cursor-pointer" onClick={()=>fetchEarthQuakesHandler(35.652832,139.839478)}>Tokyo</div>
                            </div>
                            {   loading &&
                                    <div className='flex place-items-center animate-pulse gap-2'>
                                        <AiOutlineLoading3Quarters className='animate-spin'/>
                                            Loading...
                                    </div>
                            }
                            {
                                connected && <div>
                                                <div>{connectData} has been connected. </div>
                                                <div>Go to Table or Chart to view the full data set</div>
                                                <div>The data below is just a preview</div>
                                            </div>
                            }
                            {
                                connected && <div className='h-96 w-full'>
                                                <GridView sample={true}/>
                                            </div>
                            }
                        </div>
                </Transition>



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
            </div>
        
        </div>
    );
};

export default Integrations;