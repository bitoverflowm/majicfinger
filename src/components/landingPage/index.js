"use client"

import Link from 'next/link'
import React, {useRef, useState, useEffect} from 'react';

import { useUser  } from '@/lib/hooks';
import { useMyState  } from '@/context/stateContext'

import { FaPlay  } from "react-icons/fa";
import { MdArrowRight, MdOutlineSmartDisplay  } from "react-icons/md";



 
const LandingPage = () => {
    const { working, setWorking } = useMyState()
    const { aiOpen, setAiOpen } = useMyState()
    const user = useUser()
    const [view, setView] = useState()
    const [isHovered, setIsHovered] = useState(false);

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
                        <div className='min-h-screen'>
                            <div className='w-11/12 max-w-[1500px] py-5 mx-auto rounded-xl shadow-xl shadow-slate-200 bg-white/80'>
                                <div className='text-md xl:text-md text-black pt-10 pb-6'>
                                    We'll save you from all the complex yabba-dabba-doos out there.
                                </div>
                                <div className='text-7xl font-title font-black'>
                                    <span className='text-lychee-green'>Instant</span> Graphs.
                                </div>
                                <div className='text-7xl font-title font-black'>
                                    Zero Hassle.
                                </div>
                                <div className='flex place-content-center py-3'>
                                    <div className='flex place-items-center gap-2 py-1 px-2 bg-lychee-white/30 rounded-2xl text-black'>
                                        <div className='text-xxs'> +5K happy unique users WorldWide</div> 
                                    </div>
                                </div>
                                <div className='flex flex-wrap gap-4 px-8 py-8'>
                                    <div className='grid col-span-2 place-items-center gap-2'>
                                        <div className='py-2 text-xs'>
                                            
                                        </div>
                                        <div className='relative flex justify-center items-center place-items-center place-content-center'>
                                            <iframe width="480" height="335" src="https://www.youtube.com/embed/mwm-0sAPvWI?si=CYWpVwnnop8JMSXm" title="Lychee promo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" className='rounded-xl shadow-xl' allowFullScreen></iframe>
                                            {!isHovered && 
                                            <div className="text-lychee-black cursor-pointer absolute top-0 left-0 w-full h-full bg-lychee-blue flex flex-col gap-4 justify-center items-center rounded-xl text-4xl" onMouseEnter={() => setIsHovered(true)}>
                                                <div className='py-2 text-xs'>
                                                    We prepared a quick explainer video for you
                                                </div>
                                                <FaPlay />
                                            </div>
                                            }
                                        </div>                                    
                                    </div>
                                    <div className='grow basis-1/4 grid place-items-center gap-2'>
                                        <div className='py-2 text-xs text-black rounded-full '>
                                            ✨ New!
                                        </div>
                                        <div className='pl-8 py-8 text-left rounded-xl bg-lychee-green h-fit w-full shadow-xl cursor-pointer transition ease-in-out delay-10 bg-gradient-to-r hover:scale-110 hover:from-lychee-green hover:to-lychee-blue duration-500' onClick={()=>setWorking('integrations')}>
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
                                            <div className='text-xxs text-white pt-2'>
                                                * vote on which integrations you want me to priotitize
                                            </div>
                                        </div>                                    
                                    </div>
                                    <div className='grow basis-1/4 flex flex-col place-items-center gap-2'>
                                        <div className='py-2 text-xs text-black rounded-full '>
                                            🦄 New: Repeat after me ... "Data is beautiful"
                                        </div>
                                        <div className='grow pl-8 p-4 pt-8 text-left rounded-xl border-lychee-black border-4 shadow-xl w-full'>
                                            <div className='text-2xl text-black'>Curated collection of beautiful colors and pallates updated daily</div>
                                        </div>
                                        <div className='grow pl-8 p-4 pt-8 text-left rounded-xl bg-lychee-white w-full shadow-xl'>
                                            <div className='text-4xl text-black'>Gallery</div>  
                                            <div className='text-xs text-black pt-2'>
                                                Browse over 100 charts, graphs, tools, you name it...
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div className='text-md xl:text-lg pb-4'>
                                        <div>
                                            Seriously.
                                        </div>
                                        <div>
                                            Stop paying for features you don't even need.
                                        </div>
                                        <div>
                                            Let our AI do the heavy lifting for you.
                                        </div>
                                    </div>
                                </div>
                                <div className='flex place-content-center pb-4'>
                                    <div className='font-bold border-2 border-lychee-black text-lychee-black hover:bg-lychee-white hover:text-lychee-black cursor-pointer px-3 xl:px-5 py-2 xl:py-4 rounded-full text-xs' onClick={()=>setView('first')}>
                                        Cool... tell me more?
                                    </div>
                                </div>
                            </div>
                            <div className="w-96 sm:w-10/12 xl:w-3/5 justify-center bg-slate-300/70 rounded-2xl mx-auto mt-10 py-5">
                                <div className='text-xs font-bold text-slate-500'>
                                    Used, trusted and beta tested by people at:                        
                                </div>
                                <div className='flex gap-8 px-6 md:gap-20 py-2 place-content-center place-items-center grayscale'>
                                    <div className="flex-shrink">
                                        <img src="./jpm.svg"  alt="jpm" className='h-6'/>   
                                    </div>
                                    <div className="flex-shrink hidden sm:block">
                                        <img src="./goldman.svg"  alt="goldman" className='h-8'/>   
                                    </div>
                                    <div className="flex-shrink">
                                        <img src="./meta.svg"  alt="meta" className='h-8'/>   
                                    </div>
                                    <div className="flex-shrink">
                                        <img src="./google.svg"  alt="meta" className='h-8'/>   
                                    </div>
                                    <div className="flex-shrink">
                                        <img src="./apple.svg"  alt="apple" className='h-12'/>   
                                    </div>
                                    <div className="flex-shrink">
                                        <img src="./mit.svg"  alt="mit" className='h-6'/>   
                                    </div>
                                </div>
                            </div>
                        </div>       
                        <div className=' xl:px-10 xl:pt-20 pb-10 bg-lychee-white mt-10'>
                            <div ref={firstRef} className='bg-white w-full py-20 rounded-2xl'>
                                <div className='text-8xl font-title px-96'>What Our <span className='text-lychee-blue'>Legendary Users Have To Say</span></div>
                                <div className='flex flex-wrap place-items-center place-content-center gap-4 px-20 py-20'>
                                    <Link href="https://theresanaiforthat.com/ai/lychee?comment_id=10781">
                                        <div className='bg-black text-white rounded-xl px-10 py-10 max-w-96 hover:bg-lychee-go hover:text-lychee-black cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300'>
                                                <div>It's like the chart editor i wish i had for the last 10 years. Love it.</div>
                                                <div>- Bernard</div>
                                                <div className='text-xl float-right'><MdArrowRight /> </div>
                                        </div>
                                    </Link>
                                    <Link href="https://www.producthunt.com/products/lychee-3/reviews?review=744208 ">
                                        <div className='bg-black text-white rounded-xl px-10 py-10 max-w-96 hover:bg-lychee-go hover:text-lychee-black  cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300'>
                                                <div>I really can't express in words how much I needed this.</div>
                                                <div>Changed my whole working game. My peers looked at this thing jaws dropped haha.</div>
                                                <div>Looking forward to the future of Lychee!</div>
                                                <div>- Amal Khan</div>
                                                <div className='text-xl float-right'><MdArrowRight /> </div>
                                        </div>
                                    </Link>
                                    <Link href="https://www.producthunt.com/products/lychee-3?comment=3321659#lychee-3">
                                        <div className='bg-black text-white rounded-xl px-10 py-10 max-w-96 hover:bg-lychee-go hover:text-lychee-black   cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300'>
                                                <div>Data scientists, marketers & managers would love this {':)'} Instant hands-free graph generation! Congrats on the launch!</div>
                                                <div>- Charles Teh</div>
                                                <div className='text-xl float-right'><MdArrowRight /> </div>
                                        </div>
                                    </Link>
                                    <Link href="https://www.producthunt.com/products/lychee-3?comment=3320264#lychee-3">
                                        <div className='bg-black text-white rounded-xl px-10 py-10 max-w-96 hover:bg-lychee-go hover:text-lychee-black  cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300'>
                                                <div>OMG finally a reasonable tool to get my charting done fast!
                                                    Do you think you will add more capabilities like Numpy Pandas library integrations @misterrpink </div>
                                                <div>- Mar</div>
                                                <div className='text-xl float-right'><MdArrowRight /> </div>
                                        </div>
                                    </Link>
                                    <Link href="https://www.producthunt.com/products/lychee-3?comment=3320062#lychee-3">
                                        <div className='bg-black text-white rounded-xl px-10 py-10 max-w-96 hover:bg-lychee-go hover:text-lychee-black  cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300'>
                                                <div>Nice! Visualizing data made simple. Great help for anyone in the data landscape. Good luck!</div>
                                                <div>- Henry Habib</div>
                                                <div className='text-xl float-right'><MdArrowRight /> </div>
                                        </div>
                                    </Link>
                                    <Link href="https://www.producthunt.com/products/lychee-3?comment=3320062#lychee-3">
                                        <div className='bg-black text-white rounded-xl px-10 py-10 max-w-96 hover:bg-lychee-go hover:text-lychee-black  cursor-pointer hover:-translate-y-6 transition ease-in-out delay-150 hover:scale-110 duration-300'>
                                                <div>Didn't I just see you launch a project a few days ago?
                                                    bro you are on fire!</div>
                                                    <div>love this project.</div>
                                                    <div>I'll actually use this every day</div>
                                                    <div>god I hate excel
                                                    also why am I downloading a new software every few months?
                                                    Microsoft is unhinged at this point</div>
                                                <div>- Youu</div>
                                                <div className='text-xl float-right'><MdArrowRight /> </div>
                                        </div>
                                    </Link>
                                </div>
                                
                                <div className='bg-lychee-go w-32 mx-auto rounded-full py-1 cursor-pointer hover:bg-lychee-black hover:text-white' onClick={()=>setView('features')}>
                                    Keep Going
                                </div>
                            </div>
                        
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
                            <div className='flex place-content-center'>
                                <div className='bg-white text-lychee-black font-bold hover:bg-lychee-black hover:text-lychee-white cursor-pointer px-5 py-4 rounded-full text-xs shadow-xl' onClick={()=>setView('second')}>
                                    Need a Success Story?
                                </div>
                            </div>                
                        </div>
                        <div ref={secondRef} className='sm:px-10 py-20'>
                            <div className='text-6xl sm:text-8xl font-title'>Susan's <span className='text-lychee-peach'>Instant Win</span></div>
                            <div className='py-10 sm:py-20 text-center flex flex-col gap-2'>
                                <div className='text-2xl font-black text-lychee-peach'>
                                    The clock struck 11:43 pm.
                                </div>
                                <div>
                                    Susan realized she had only 17 minutes to submit her data analysis paper.
                                </div>
                                <div>
                                    She was tensed because all she had left was to turn her spreadsheets into charts.
                                </div>
                                <div>
                                    What did she do?
                                </div>
                                <div className='text-2xl font-black pt-2 text-lychee-peach'>
                                    That's right. She Googled.
                                </div>
                                <div>
                                    She came across some tools, but most of them were complex, and needed coding skills.
                                </div>
                                <div>
                                    Sure, there were some AI tools, but the thing is, when she inputted some prompts, the results were this.
                                </div>
                                <div className='text-2xl font-black pt-2 text-lychee-peach'>
                                    "We cannot process your query."
                                </div>
                                <div>
                                    Our Dear Susan continued searching.
                                </div>
                                <div>
                                    Until she checked Product Hunt and saw us.
                                </div>
                                <div>
                                    "Lychee? Guess...I'll try this for the last time."
                                </div>
                                <div>
                                    With just a sliver of hope, she uploaded her spreadsheet into the box.
                                </div>
                                <div>
                                    Boom.
                                </div>
                                <div>
                                    Done.
                                </div>
                                <div className='text-2xl font-black pt-2 text-lychee-peach'>
                                    She finished and exported ALL 9 graphs of her spreadsheets in under 3 minutes.
                                </div>
                                <div>
                                    Paper submitted 4 minutes before the deadline.
                                </div>
                                <div>
                                    As a university student, she was THRILLED that she got this tool at a steal.
                                </div>
                                <div>
                                    What's even more exciting?
                                </div>
                                <div>
                                    She doesn't even have to pay monthly.
                                </div>
                                <div className='text-2xl font-black pt-2 text-lychee-peach'>
                                    She has it FOREVER.
                                </div>
                            </div>
                            <div className='flex place-content-center mb-56'>
                                <div className='bg-lychee-green text-lychee-black hover:bg-lychee-white hover:text-lychee-black cursor-pointer px-5 py-4 rounded-full text-xs' onClick={()=>setWorking('getLychee')}>
                                    Try It Now
                                </div>
                            </div>
                            
                        </div>
                    </>                    
            }
        </div>
    );
};

export default LandingPage;
 
