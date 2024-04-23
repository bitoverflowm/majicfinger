"use client"

import React, {useRef, useState, useEffect} from 'react';

import { useUser  } from '@/lib/hooks';
import { useMyState  } from '@/context/stateContext'

import CountUp from 'react-countup'

import { Hero } from './hero';
import { SocialProofTestimonials } from './testimonials';


const companies = [
    "jpm",
    "goldman",
    "meta",
    "google",
    "apple",
    "mit",
  ];
 
const LandingPage = () => {
    const { setWorking } = useMyState()
    const user = useUser()
    const [view] = useState()

    const firstRef = useRef(null)
    const secondRef = useRef(null)
    const thirdRef = useRef(null)
    const fourthRef = useRef(null)
    const fifthRef = useRef(null)
    const featuresRef = useRef(null)

    useEffect(()=>{
        view === 'first' && firstRef.current.scrollIntoView({behavior: 'smooth'})
        view === 'features' && featuresRef.current.scrollIntoView({behavior: 'smooth'})
        view === 'second' && secondRef.current.scrollIntoView({behavior: 'smooth'})
        view === 'third' && thirdRef.current.scrollIntoView({behavior: 'smooth'})
        view === 'fourth' && fourthRef.current.scrollIntoView({behavior: 'smooth'})
        view === 'fifth' && fifthRef.current.scrollIntoView({behavior: 'smooth'})
    }, [view])

    return (
        <div className='font-body sm:pt-5 text-black' >
            {
                !(user) &&
                    <>
                        <Hero/>
                        <section id="companies">
                            <div className="py-14">
                                <div className="container mx-auto px-4 md:px-8">
                                <h3 className="text-center text-sm font-semibold text-gray-500">
                                    USED, TRUSTED and beta tested by people at
                                </h3>
                                <div className="relative mt-6">
                                    <div className="grid grid-cols-2 place-items-center place-content-center gap-2 md:grid-cols-4 xl:grid-cols-6 xl:gap-4">
                                        {companies.map((logo, idx) => (
                                            <img
                                            key={idx}
                                            src={`./${logo}.svg`}
                                            className="h-10 w-28 dark:brightness-0 dark:invert"
                                            alt={logo}
                                            />
                                        ))}
                                    </div>
                                    <div className="pointer-events-none absolute inset-y-0 left-0 h-full w-1/3 bg-gradient-to-r from-white dark:from-black"></div>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 h-full w-1/3 bg-gradient-to-l from-white dark:from-black"></div>
                                </div>
                                </div>
                            </div>
                        </section>
                        <SocialProofTestimonials />
                        <div className=''>
                            <div className='w-screen sm:pt-10 sm:w-1/2 mx-auto px-4' ref={firstRef}>
                                <div className='pt-10 sm:pt-0 py-2 text-xs text-black rounded-full '>
                                    ✨ Just released in Lychee v1.1.1!
                                </div>
                                <div className=' pl-8 py-8 text-left rounded-xl bg-black shadow-xl cursor-pointer transition ease-in-out delay-10 bg-gradient-to-r hover:scale-110 hover:from-lychee-green hover:to-lychee-blue duration-500' onClick={()=>setWorking('integrations')}>
                                    <div className='text-4xl text-white'>Query,</div>  
                                    <div className='text-4xl text-white'>Analyze,</div>
                                    <div className='text-4xl text-white'>Visualize,</div>
                                    <div className='text-4xl text-white'>Live data</div>
                                    <div className='text-xs text-white pt-2'>Without leaving Lychee. Without a single line of code.</div>
                                    <div className='flex flex-wrap pt-4 px-2 gap-1'>
                                        <div className='bg-white rounded-full text-xs py-1 px-2 text-lychee-green'>Twitter</div>
                                        <div className='bg-white rounded-full text-xs py-1 px-2 text-lychee-green'>Earthquake</div>
                                        <div className='bg-white rounded-full text-xs py-1 px-2 text-lychee-green'>Instagram</div>
                                        <div className='bg-white rounded-full text-xs py-1 px-2 text-lychee-green'>Quickbooks</div>
                                        <div className='bg-white rounded-full text-xs py-1 px-2 text-lychee-green'>BTC</div>
                                        <div className='bg-white rounded-full text-xs py-1 px-2 text-lychee-green'>ETH</div>
                                        <div className='bg-white rounded-full text-xs py-1 px-2 text-lychee-green'>Stocks</div>
                                        <div className='bg-white rounded-full text-xs py-1 px-2 text-lychee-green'>YouTube</div>
                                    </div>
                                </div>                                    
                            </div>
                            <div className='w-screen sm:w-1/2 mx-auto  px-4'>
                                <div className='py-2 px-5 text-xs text-center'>
                                    "
                                </div>
                                <div className='flex flex-col gap-2 w-full min-h-[335px] pl-8 p-4 pt-8 text-left rounded-xl border-lychee-black border-4 shadow-xl w-full '>
                                    <div className='text-8xl text-lychee-black text-black pt-2'>
                                        <CountUp end={796000} duration={30} />
                                    </div>
                                    <div className='text-4xl text-lychee-green pt-2'> beautifully curated colors, pallates, charts, graphs, tools updated daily</div>
                                </div>
                            </div>
                        </div>       
                        <div className='pb-10 mt-10'>
                            <div className='bg-gradient-to-r from-soft to-softer pb-20'>
                                <div ref={featuresRef} className='pt-48 text-6xl xl:text-8xl font-title'>
                                    Our <span className='font-black text-lychee-black'>Features:</span>
                                </div>
                                <div className='grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 py-6 sm:px-20 lg:px-56 xl:px-64 place-items-center place-content-center'>
                                    <div className='p-2'>
                                        <div className='text-2xl'>
                                            <span className='font-black'>"Blink Of An Eye"</span> Level Instant
                                        </div>
                                        <div className='text-md py-5 w-64 mx-auto'>
                                            <div>
                                                We "graphify" your spreadsheets <span className='text-lychee-green font-black'>before you open your eyes</span> so that you <span className='text-lychee-green font-black'>never waste a single second waiting again.</span>
                                            </div>
                                        </div>                 
                                    </div>
                                    <div className='p-2'>
                                        <video autoPlay loop muted playsInline className="rounded-full w-96 h-72">
                                            <source src="./graph1.mp4" type="video/mp4" />
                                            Your browser does not support the video tag.
                                        </video>
                                    </div>
                                    <div className='p-10'>
                                        <div className='text-2xl'>
                                            No Mumbo Jumbo.
                                        </div>
                                        <div className='text-md py-5 w-64 mx-auto'>
                                            <div>
                                                Sit back and enjoy a user-friendly platform that <span className='text-lychee-green font-black'>requires no coding skills</span> or hi-fi language.
                                            </div>
                                        </div>                 
                                    </div>
                                    <video autoPlay loop muted playsInline className="rounded-bl-full rounded-tr-full w-96 h-72">
                                        <source src="./graph4.mp4" type="video/mp4" />
                                        Your browser does not support the video tag.
                                    </video>
                                    <div className='p-10'>
                                        <div className='text-2xl'>
                                            Cost-Effective.
                                        </div>
                                        <div className='text-md py-5 w-64 mx-auto'>
                                            <div>
                                                <span className='text-lychee-green font-black'>No BS features</span> you don't even need.
                                            </div>
                                            <div className='pt-2'>
                                                When we built this - we had you in mind.
                                            </div>
                                        </div>                 
                                    </div>
                                    <video autoPlay loop muted playsInline className="rounded-tl-full rounded-tr-full w-96 h-72">
                                        <source src="./graph3.mp4" type="video/mp4" />
                                        Your browser does not support the video tag.
                                    </video>
                                    <div className='p-10'>
                                        <div className='text-2xl'>
                                            Variety Of Chart Options.
                                        </div>
                                        <div className='text-md py-5 w-64 mx-auto'>
                                            <div>
                                                Choose from a variety of chart types, including pie, histogram, and bar charts. <span className='text-lychee-green font-black'>Your data is your style.</span>
                                            </div>
                                        </div>                 
                                    </div>
                                    <video autoPlay loop muted playsInline className="rounded-b-full w-96 h-72">
                                        <source src="./graph2.mp4" type="video/mp4" />
                                        Your browser does not support the video tag.
                                    </video>
                                    <div className='p-10'>
                                        <div className='text-2xl'>
                                            The Excel Killer.
                                        </div>
                                        <div className='text-md py-5 w-64 mx-auto'>
                                            <div>
                                                No spreadsheet? Create your own from scratch. It's easier than you've ever imagined.<div className='pt-2'> That's right.</div> <span className='text-lychee-green font-black'>You don't have to bang your head in frustration using Excel.</span>
                                            </div>
                                        </div>                 
                                    </div>
                                </div>
                                <div className='bg-lychee-green font-black text-white w-40 mx-auto rounded-2xl py-2 px-3 cursor-pointer hover:bg-lychee-black hover:text-white' onClick={()=>setWorking('getLychee')}>
                                    Check it Out
                                </div>
                            </div>
                        </div>
                    </>                    
            }
        </div>
    );
};

export default LandingPage;
 
