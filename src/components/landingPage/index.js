"use client"

import React, {useRef, useState, useEffect} from 'react';

import { useUser  } from '@/lib/hooks';
import { useMyState  } from '@/context/stateContext'

import CountUp from 'react-countup'

import { Hero } from './hero';
import { SocialProofTestimonials } from './testimonials';
import { Flow } from './flow'


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
                        <div className='flex flex-col place-items-center text-left'>
                            <div className='py-10'>
                                <div className='text-2xl'>
                                    Upload your csv, excel, google sheet, notion doc
                                </div>
                                <div className='text-2xl'>
                                    Or pull <span className='underline text-blue-500'>directly</span> from your favorite data sources   
                                </div>
                                <div className='text-2xl'>
                                    All from within Lychee <span className='underline text-purple-500'>not a single line of code</span>
                                </div>
                                <div className='text-2xl'>
                                    Query, Operate on, Visualize, <span className='underline text-green-500'>Analyze with AI</span>
                                </div>
                                <div className='text-2xl'>
                                    Create your custom Dashboard
                                </div>
                                <div className='text-2xl'>
                                    Present, Share with your team, export
                                </div>
                                <div className='text-2xl'>
                                    Or Host right here eg: <span className="underline text-orange-500">www.yourname.lych3e.com</span> show world can see your work!
                                </div>
                            </div>
                        </div>
                        <div className='py-2 px-5 text-xs text-center flex place-content-center'>
                            <Flow />
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
 
