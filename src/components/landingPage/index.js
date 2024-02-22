"use client"

import React, {useRef, useState, useEffect} from 'react';

import { useUser  } from '@/lib/hooks';
import { useMyState  } from '@/context/stateContext'
 
const LandingPage = () => {
    const { working, setWorking } = useMyState()
    const { aiOpen, setAiOpen } = useMyState()
    const user = useUser()
    const [view, setView] = useState()

    const firstRef = useRef(null)
    const secondRef = useRef(null)
    const thirdRef = useRef(null)
    const fourthRef = useRef(null)
    const fifthRef = useRef(null)

    useEffect(()=>{
        view === 'first' && firstRef.current.scrollIntoView({behavior: 'smooth'})
        view === 'second' && secondRef.current.scrollIntoView({behavior: 'smooth'})
        view === 'third' && thirdRef.current.scrollIntoView({behavior: 'smooth'})
        view === 'fourth' && fourthRef.current.scrollIntoView({behavior: 'smooth'})
        view === 'fifth' && fifthRef.current.scrollIntoView({behavior: 'smooth'})
    }, [view])

    return (
        <div className='font-body sm:pt-5 text-black'>
            {
                !(user) &&
                    <>
                        <div className='py-10 h-screen overflow-hidden'>
                            <div className='overflow-hidden absolute top-0 left-0 xl:px-24 xl:py-8 -z-10 blur-md'>
                                <video autoPlay loop muted playsInline className="xl:h-dvh xl:w-screen xl:max-w-screen xl:rounded-br-3xl rounded-tl-3xl hidden xl:block">
                                    <source src="./bg4.mp4" type="video/mp4" />
                                    Your browser does not support the video tag.
                                </video>
                                <video autoPlay loop muted playsInline className="xl:hidden w-full h-screen object-cover">
                                    <source src="./bg4.mp4" type="video/mp4" />
                                    Your browser does not support the video tag.
                                </video>
                            </div>
                            <div className='w-96 py-5 mx-auto sm:w-10/12 xl:w-3/5 bg-white xl:py-20 xl:px-32 rounded-xl shadow-2xl '>
                                <div className='text-sm xl:text-md font-black text-lychee-peach p-10'>
                                    We'll save you from all the complex yabba-dabba-doos out there.
                                </div>
                                <div className='text-6xl xl:text-8xl font-title'>
                                    <span className='font-black text-lychee-peach'>Instant</span> Graphs.
                                </div>
                                <div className='text-6xl xl:text-8xl font-title'>
                                <span className='font-black text-lychee-peach'>Zero</span> Hassle.
                                </div>
                                <div className='flex place-content-center py-10'>
                                    <div className='font-black bg-lychee-green text-lychee-black hover:bg-lychee-white hover:text-lychee-black cursor-pointer px-3 xl:px-5 py-2 xl:py-4 rounded-full text-sm' onClick={()=>setView('first')}>
                                        Cool... tell me more?
                                    </div>
                                </div>
                                <div className='text-md xl:text-lg'>
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
                            <div className="w-96 sm:w-10/12 xl:w-3/5 justify-center bg-slate-200/30 rounded-2xl mx-auto mt-10 py-5">
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
                        <div ref={firstRef} className='xl:px-10 xl:pt-20'>
                            <div className='text-6xl xl:text-8xl font-title'>
                                Our <span className='font-black text-lychee-peach'>Features:</span>
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
                                <div className='bg-lychee-green text-lychee-black hover:bg-lychee-white hover:text-lychee-black cursor-pointer px-5 py-4 rounded-full text-xs' onClick={()=>setView('second')}>
                                    But how?
                                </div>
                            </div>                
                        </div>
                        <div ref={secondRef} className='sm:px-10 py-20'>
                            <div className='text-6xl sm:text-8xl font-title'>
                                <span className='font-black text-lychee-peach'>How</span> It Works:
                            </div>
                            <div className='flex flex-col lg:flex-row gap-10 sm:py-20 place-items-center place-content-center'>
                                <div className='p-10 shadow-xl rounded-xl w-96 sm:w-1/4 lg:h-72'>
                                    <div className='font-title text-2xl'>
                                    <span className='text-lychee-red font-title font-black text-4xl'>1.</span>  Drop Your Spreadsheet.
                                    </div>
                                    <div className='text-sm lg:text-md py-5 mx-auto'>
                                        <div className='pb-6'>
                                            Drag that Excel sheet into our beautiful upload box for us to <span className='text-lychee-peach'>instant graph-ify it.</span> 
                                        </div>
                                        <div>
                                        If you don't have one, you can make it here too. <span className='text-lychee-peach'>We made it simple.</span> 
                                        </div>
                                    </div>               
                                </div>
                                <div className='p-10 shadow-xl rounded-xl w-96 sm:w-1/4 lg:h-72'>
                                    <div className='font-title text-2xl'>
                                    <span className='text-lychee-red font-title font-black text-4xl'>2.</span>  Watch The Magic.
                                    </div>
                                    <div className='text-sm lg:text-md py-5 mx-auto'>
                                        <div className='pb-6'>
                                        When we say instant, we mean it. Your chart will be ready <span className='text-lychee-peach'>the moment you hit</span> the "generate" button.
                                        </div>                            
                                    </div>               
                                </div>
                                <div className='p-10 shadow-xl rounded-xl w-96 sm:w-1/4 lg:h-72'>
                                    <div className='font-title text-2xl'>
                                        <span className='text-lychee-red font-title font-black text-4xl'>3.</span> Any Chart You Want.
                                    </div>
                                    <div className='text-md py-5 mx-auto'>
                                        <div className='pb-6'>
                                        Take control. Choose from a palette of dynamic chart options. <span className='text-lychee-peach'>Your data, your style.</span> 
                                        </div>
                                    </div>               
                                </div>
                            </div>
                            <div className='flex place-content-center py-10'>
                                <div className='bg-lychee-green text-black hover:bg-lychee-white hover:text-lychee-black cursor-pointer px-5 py-4 rounded-full text-xs' onClick={()=>setView('third')}>
                                    Need A Success Story?
                                </div>
                            </div>
                        </div>
                        <div ref={thirdRef} className='w-96 mx-auto sm:w-screen sm:px-10 sm:py-20'>
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
                            <div className='flex place-content-center py-10'>
                                <div className='bg-lychee-green text-lychee-black hover:bg-lychee-white hover:text-lychee-black cursor-pointer px-5 py-4 rounded-full text-xs' onClick={()=>setView('fourth')}>
                                    Need More?
                                </div>
                            </div>
                        </div>
                        <div ref={fourthRef} className=' w-96 mx-auto sm:w-screen py-10 sm:py-20'>
                            <div className='text-6xl lg:text-8xl font-title xl:px-64'>What Our <span className='text-lychee-peach'>Legendary Beta Testers Have To Say:</span></div>
                            <div className='py-20 text-center flex flex-col lg:flex-row sm:flex-wrap gap-2 place-items-center place-content-center gap-6'>
                                <div className='text-center w-5/6 lg:w-1/4 shadow-xl p-10 flex flex-col gap-4 place-items-center place-content-center'>
                                    <div>
                                        "I am a data researcher from Florida and I have to say...this is unlike anything I've ever seen.
                                    </div>
                                    <div>
                                        In a world that thinks everyone wants more and more features, <span className='font-bold text-lychee-peach'>this is the only software that actually listened to the few of us that wants to keep things simple.</span>
                                    </div>
                                    <div>
                                        - Sarah L. Data Researcher
                                    </div>
                                </div>
                                <div className='text-center w-5/6 lg:w-1/4 shadow-xl p-10 flex flex-col gap-4 place-items-center place-content-center'>
                                    <div>
                                        The thing I love most about Lychee is that it fits into my student budget AND provides me every single thing I need.
                                    </div>
                                    <div>
                                        <span className='font-bold text-lychee-peach'>And it's not all those complex hi-fi things that need pro knowledge.</span>
                                    </div>
                                    <div>
                                        Realistically, I just need a tool to turn my spreadsheets into graphs, selection of different types of graphs, and export.
                                    </div>
                                    <div>
                                        That's it.
                                    </div>
                                    <div className='font-black'>
                                        I'm so glad I came across this tool, it's priceless.
                                    </div>
                                    <div className='font-black'>
                                        - Jessica L. Business University Student
                                    </div>
                                </div>
                                <div className='text-center w-5/6 lg:w-1/4 shadow-xl p-10 flex flex-col gap-4 place-items-center place-content-center'>
                                    <div>
                                        Running a marketing agency almost solo is hard as it is. And when you don't have coding knowledge and there are all these complex tools in the market, you find yourself in need of help.
                                    </div>
                                    <div>
                                        Lychee made this possible for us to provide instant solutions to our clients, without burning a hole in the treasury.
                                    </div>
                                    <div>
                                        - Michael Shapran, Founder Of Richify Agency
                                    </div>
                                </div>                            
                            </div>            
                        </div>
                        <div className='flex place-content-center'>
                                <div className='bg-lychee-green text-lychee-black hover:bg-lychee-white hover:text-lychee-black cursor-pointer px-5 py-4 rounded-full text-xs' onClick={()=>setView('fifth')}>
                                    I want it
                                </div>
                        </div>
                        <div ref={fifthRef} className='px-10 py-20'>
                            <div className='text-4xl sm:text-8xl font-title'><span className='text-lychee-peach'>Opportunity </span> For Life.</div>
                            <div className='text-4xl sm:text-8xl font-title'><span className='text-lychee-peach'>Instant </span> Access for Life.</div>
                            <div className='py-10 sm:py-20 text-center flex flex-col gap-2'>
                                <div className='text-2xl font-black text-lychee-peach'>
                                    Before we roll this out public-public.
                                </div>
                                <div>
                                    We're going to give you a special offer.
                                </div>
                                <div>
                                    If you get this now...
                                </div>
                                <div>
                                    You have it for your lifetime.
                                </div>
                                <div className='text-2xl font-black pt-2 text-lychee-peach'>
                                    No paying for monthly subscriptions.
                                </div>
                                <div>
                                    We'll move to monthly pricing soon.
                                </div>
                                <div>
                                    Don't wait.
                                </div>
                            </div>
                            <div className='flex place-content-center mb-56'>
                                <div className='bg-lychee-green text-lychee-black hover:bg-lychee-white hover:text-lychee-black cursor-pointer px-5 py-4 rounded-full text-xs' onClick={()=>setWorking('getLychee')}>
                                    Get It
                                </div>
                            </div>
                        </div>
                    </>                    
            }
        </div>
    );
};

export default LandingPage;
 
