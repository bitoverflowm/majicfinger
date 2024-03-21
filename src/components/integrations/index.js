import React, { useEffect, useState } from 'react';
import { fetchEarthquakeData } from './earthquake_helper';
import { Transition } from '@headlessui/react';
import { BiLogoInstagramAlt, BiLogoGmail } from "react-icons/bi";
import { FaCcStripe, FaLinkedin } from "react-icons/fa";
import { FaMeta, FaXTwitter } from "react-icons/fa6";
import { CgAppleWatch } from "react-icons/cg";
import { ImYoutube2 } from "react-icons/im";
import { WiEarthquake } from "react-icons/wi";
import { AiOutlineLoading3Quarters } from "react-icons/ai";


import { useMyState  } from '@/context/stateContext'
import GridView from '../gridView';
import TwitterIntegration from './twitter';

const Integrations = () => {
    const contextState = useMyState()

    const data  = contextState?.data;
    const setData = contextState?.setData;
    const setDflt = contextState?.setDflt;

    const [connectData, setConnectData] = useState();
    const [loading, setLoading] = useState(false);
    const [connected, setConnected] = useState(false);

    const fetchEarthQuakesHandler = async (lat, long) => {
        setLoading(true);
        let quakes = await fetchEarthquakeData(lat, long);
        console.log(quakes)
        let data = quakes.features.map(feature => feature.properties);
        console.log(data)
        setData(data);
        setConnected(true);
        setDflt(false)
        setLoading(false);
    }

    return (
        <div className='place-self-start'>
            <div className="relative bg-white shadow-lg rounded-xl text-xxs px-3 py-2 w-96 mx-auto">
                <div className="font-bold">Coming Soon:</div>
                <div>✨Pull live raw data streams from your favorite providers </div>
                <div>✨Get unprecedented insights on your data with the help of Lychee AI</div>
                <div>✨Chart any aspect of your data stream</div>
                <div>✨Add any of this to your dashboard</div>
                <div>* Become a lifetime member to vote on which integrations to build first</div>
            </div>

            <div className='text-xxs py-10 flex flex-col gap-4'>
                <div className='py-4'>
                    <div>Try it here! </div>
                    <div>Click to pull live data:</div>
                </div>
                
                <div className='px-10 flex gap-4'>
                    <div className="bg-white rounded-md shadow-2xl border-l-4 border-lychee-black py-4 px-4 hover:bg-lychee-black hover:text-lychee-white hover:border-lychee-red cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300 font-title text-3xl font-bold sm:w-1/4 flex flex-col place-items-center"  onClick={()=>setConnectData('earthquake')}>
                        <div className='text-lg font-title font-bold'>Earthquakes</div>
                        <WiEarthquake />
                    </div>
                    <div className="bg-white rounded-md shadow-2xl border-l-4 border-lychee-black py-4 px-4 hover:bg-lychee-black hover:text-lychee-white hover:border-lychee-red cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300 font-title text-3xl font-bold sm:w-1/4 flex flex-col place-items-center"  onClick={()=>setConnectData('twitter')}>
                        <div className='text-lg font-title font-bold'>X (Twitter)</div>
                        <FaXTwitter />
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
                <Transition 
                    show={connectData === 'twitter'}
                    enter="transition-opacity duration-1000"
                    enterFrom="opacity-0 h-0"
                    enterTo="opacity-100 h-auto"
                    leave="transition-opacity duration-150"
                    leaveFrom="opacity-100 h-auto"
                    leaveTo="opacity-0">
                        <div className='text-xs font-body font-thin w-full'>
                            <div className=''>Pull data from Twitter directly. Analyze, chart and use AI to gain unprecedented insights.</div>
                            <div className='text-xxs'>*As we all know, Twitter API is no longer free. So if you feel that direct Twitter integration will be valuable, please join Lifetime membership. </div>
                            <div className='text-xxs'>If enough LifeTime members request Twitter, we can subscribe to the enterprise plan, which will give us access to: </div>
                            <div className='text-xxs'>- Rate-limited access to suite of v2 endpoints, including search and  filtered stream</div>
                            <div className='text-xxs'>- More than 1,000,000 Posts per month - GET at the app level</div>
                            <div className='text-xxs'>- More than 300,000 Posts per month - posting limit at the app level</div>
                            <div className='text-xxs'>- Complete streams: replay, engagement metrics, backfill, and more features</div>
                            <div className='text-xxs text-lychee-red'>Must be Lifetime member to use Twitter integration</div>

                            {
                                <TwitterIntegration data={data} setData={setData} setDflt={setDflt}/>
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
                </div>
            </div>
        
        </div>
    );
};

export default Integrations;