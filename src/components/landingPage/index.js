"use client"

import React from 'react';

import { useMyState  } from '@/context/stateContext'


import { Hero } from './hero';
import { SocialProofTestimonials } from './testimonials';

import { UploadDataCard } from './uploadDataCard'
import { ChartCard } from './chartCard';
import { FeatureIntegrations } from './featureIntegrations';
import { FeatureAICard } from './featureAICard';

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

    const readAbout = () => {
        const yOffset = -60; // Adjust this value based on your fixed header size or desired spacing
        const element = document.getElementById('about');
        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      
        window.scrollTo({top: y, behavior: 'smooth'});
    }

    return (
        <div className='font-body sm:pt-5 text-black' >
            <Hero readAbout={readAbout}/>                        
            <section id="about">
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
                        <div className='text-6xl sm:text-8xl font-title pt-10 pb-20'>
                            <span className='font-black'>How</span> It Works:
                        </div>                        
                        
                        <div className='grid grid-cols-1 lg:grid-cols-2 gap-2 px-56'>
                            <div><UploadDataCard /> </div>
                            <div></div>
                            <div></div>
                            <div><ChartCard /></div>
                            <div><FeatureIntegrations /></div>
                            <div></div>
                            <div></div>
                            <div><FeatureAICard /></div>
                            

                        </div>
                        
                        <div className='pb-10 mt-10'>
                            <div className='bg-gradient-to-r from-soft to-softer pb-20'>
                                <div className='pt-48 text-6xl xl:text-8xl font-title'>
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
                        <div className='flex flex-col place-items-center text-left'>
                            <div className='py-10'>
                                <div className='text-2xl'>
                                    Upload your csv, excel, google sheet, notion doc
                                </div>
                                <div className='text-2xl'>
                                    Or pull <span className='underline text-blue-500'>directly</span> from your favorite data sources   
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
                                <div className='text-2xl'>
                                    All from within Lychee <span className='underline text-purple-500'>not a single line of code</span>
                                </div>
                            </div>
                        </div>
                        <div className='w-96 mx-auto sm:w-screen sm:px-10 sm:py-20'>
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
                                <div className='bg-lychee-green text-lychee-black hover:bg-lychee-white hover:text-lychee-black cursor-pointer px-5 py-4 rounded-full text-xs'>
                                    Need More?
                                </div>
                            </div>
                        </div>
                        <div className=' w-96 mx-auto sm:w-screen py-10 sm:py-20'>
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
                                <div className='bg-lychee-green text-lychee-black hover:bg-lychee-white hover:text-lychee-black cursor-pointer px-5 py-4 rounded-full text-xs'>
                                    I want it
                                </div>
                        </div>
                        <div className='px-10 py-20'>
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

        </div>
    );
};

export default LandingPage;
 
