"use client";

import BackgroundVideo from 'next-video/background-video';
import presenting_charts from '/videos/presenting_charts.mp4?thumbnailTime=100';

import { useRef, useEffect, useState } from "react"

import Link from "next/link";
import Image from "next/image";

import { Twitter, Instagram, Youtube, Activity, Facebook, BarChart2, DollarSign, FileText, Cloud, ShoppingCart, Zap, Globe, Thermometer, AlertTriangle, Star, BarChart, Globe as Globe2 } from 'react-feather';

import BlurIn from "../magicui/blur-in";
import Particles from "../magicui/particles";
import { BorderBeam } from "../magicui/border-beam";

import VideoView from "./videoView";
import { MoveRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedList } from "@/components/magicui/animated-list";
import { FaCircle } from 'react-icons/fa';


const companies = [
    "jpm",
    "goldman",
    "meta",
    "google",
    "apple",
    "mit",
  ];

   
let notifications = [
    {
        name: "Turn my dataset into an article.",
        icon: "📰",
        color: "#00C9A7",
    },
    {
        name: "Create a presentation for me.",
        icon: "📈",
        color: "#FFB800",
    },
    {
        name: "Describe my data.",
        icon: "💬",
        color: "#FF3D71",
    },
    {
        name: "Explain this dataset in one paragraph",
        icon: "📄",
        color: "#1E86FF",
    },
    {
        name: "Identify the main takeaways.",
        icon: "📌",
        color: "#00C9A7",
    },
    {
        name: "Top 10 points.",
        icon: "🧵",
        color: "#FFB800",
    },
    {
        name: "Clean the data.",
        icon: "🧹",
        color: "#FF3D71",
    },
    {
        name: "Calculate the percentage change.",
        icon: "🧮",
        color: "#1E86FF",
    },
];

notifications = Array.from({ length: 10 }, () => notifications).flat();

const Notification = ({ name, description, icon, color, time }) => {
    return (
      <figure
        className={cn(
          "relative mx-auto min-h-fit w-full max-w-[400px] transform cursor-pointer overflow-hidden rounded-2xl p-4",
          // animation styles
          "transition-all duration-200 ease-in-out hover:scale-[103%] transform-gpu bg-transparent backdrop-blur-md [border:1px_solid_rgba(255,255,255,.1)] [box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]",
        )}
      >
        <div className="flex flex-row items-center gap-2">
          <div
            className="flex p-1 items-center justify-center rounded-full"
            style={{
              backgroundColor: color,
            }}
          >
            <span className="text-sm">{icon}</span>
          </div>
          <div className="flex flex-col overflow-hidden">
            <figcaption className="flex flex-wrap items-center whitespace-pre text-white text-xs">
              {name}
            </figcaption>
          </div>
        </div>
      </figure>
    );
  };

export function Hero() {
    const fadeInRef = useRef(null);
    const [fadeInInView, setFadeInInView] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setFadeInInView(true);
                    observer.disconnect();
                }
            },
            {
                threshold: 0.1,
            }
        );

        if (fadeInRef.current) {
            observer.observe(fadeInRef.current);
        }

        return () => {
            if (fadeInRef.current) {
                observer.unobserve(fadeInRef.current);
            }
        };
    }, []);

    const fadeUpVariants = {
        initial: {
            opacity: 0,
            y: 24,
        },
        animate: {
            opacity: 1,
            y: 0,
        },
    };


    return (
        <section id="hero" className="flex place-content-center w-11/12 mx-auto overflow-hidden">            
            <div className="relative h-full container flex flex-col overflow-hidden">
                <Particles
                    className="absolute inset-0"
                    quantity={100}
                    ease={80}
                    color={'#ffffff'}
                    refresh
                />         
                <div className="text-balance bg-gradient-to-br from-lychee_blue from-0% to-lychee_red/70 bg-clip-text font-black leading-none tracking-tighter text-transparent pt-10 pb-3 sm:py-10 text-7xl sm:text-[150px] xl:text-[250px] text-center">
                    Lychee<span className="text-lychee_red pl-1 sm:pl-4" style={{ textShadow: '0px 0px 50px rgba(169, 29, 58, 1)'}}>.</span>
                </div>
                <Link rel="noopener noreferrer" target="_blank" href="https://buy.stripe.com/aEUaGYfkW9L04wgbJ3" className='z-20'>
                    <h1 className="text-center scroll-m-20 text-4xl font-extrabold tracking-tight text-white py-1 sm:pl-1 xl:pl-6 hover:underline cursor-pointer">Countdown to V2.0.0 Promo Has Begun </h1>
                    <h1 className="text-center scroll-m-20 text-sm font-extrabold tracking-tight text-white py-1 sm:pl-1 xl:pl-6 hover:underline cursor-pointer">Get 85% off LifeTime Access <br/> (11 seats remaining)</h1>
                    <div className="pt-4 sm:pl-1 xl:pl-6 flex place-content-center">
                        <div className='w-32 z-10 text-center text-black font-bold bg-green-400 p-1 sm:p-2 mt-1 sm:mt-3 rounded-md hover:bg-purple-400'>
                            Go
                        </div>
                    </div>
                </Link>
                <div className="pt-2 sm:pl-1 xl:pl-6 text-center">
                    <code className="text-center relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm xl:text-lg font-semibold  text-white bg-purple-400/20 shadow-2xl shadow-purple-200">
                        We'll save you from all the <span className="text-lychee_green italic font-black ">complex yabba-dabba-doos</span> out there.
                    </code>
                </div>
                <div className="z-10 grid sm:grid-cols-2 gap-10 p-20 pt-36">
                    <div>
                        <Link rel="noopener noreferrer" target="_blank" href={"https://misterrpink.beehiiv.com/p/how-to-create-crarts-on-lychee"}>
                        <h1 className="scroll-m-20 text-xl sm:text-2xl text-lychee_green font-extrabold tracking-tight lg:text-2xl place-items-center text-center  hover:underline cursor-pointer ">
                            <span><span className="text-purple-400">Instant</span> Graphs <br/> <span className="text-purple-400">Zero</span> Hassle </span>
                        </h1>
                        <div className="text-xs text-slate-400 flex place-items-center place-content-center gap-2 py-2">How it works <MoveRight /></div> </Link>
                        <div class="relative max-w-2xl mx-auto mt-8 rounded-xl">
                            <div class="w-full h-11 rounded-t-lg bg-gray-600/10 flex justify-start items-center space-x-1.5 px-3">
                                <span class="w-3 h-3 rounded-full bg-red-400"></span>
                                <span class="w-3 h-3 rounded-full bg-yellow-400"></span>
                                <span class="w-3 h-3 rounded-full bg-green-400"></span>
                            </div>
                            <div class=" bg-black border-t-0 w-full"><div className='px-3'><BackgroundVideo  src={presenting_charts} /></div>
                            </div>                                
                            <BorderBeam />                                
                        </div>
                    </div>
                    <div>
                        <Link rel="noopener noreferrer" target="_blank" href={"https://misterrpink.beehiiv.com/p/how-to-analyze-data-with-lychee-ai"}>
                            <h1 className="scroll-m-20 text-xl sm:text-2xl text-lychee_green font-extrabold tracking-tight lg:text-2xl place-items-center hover:underline cursor-pointer text-center"  href={"/dashboard"}>
                                <span><span className="text-purple-400">Automagically</span> Analyze Anything. <br/>Let our <span className="text-purple-400">AI</span> do the heavy lifting for you.</span>
                            </h1>
                            <div className="text-xs text-slate-400 flex place-items-center place-content-center gap-2 py-2">
                                How it works <MoveRight />
                            </div>
                        </Link>
                        <div className="relative mx-auto h-[520px] w-[250px] border-4 border-black rounded-2xl shadow-custom-shadow">
                            {/* Dynamic Island notch */}
                            <div className='flex justify-center'>
                                <span className="border border-black bg-black w-16 h-4 mt-2 rounded-full"></span>

                                {/* right buttons */}
                                <span className="absolute -right-1.5 top-20 border-2 border-black h-10 rounded-md"></span>

                                {/* left buttons */}
                                <span className="absolute -left-1.5 top-16 border-2 border-black h-6 rounded-md"></span>
                                <span className="absolute -left-1.5 top-32 border-2 border-black h-12 rounded-md"></span>
                                <span className="absolute -left-1.5 top-48 border-2 border-black h-12 rounded-md"></span>
                            </div>
                            <div className="relative flex max-h-[480px] h-full w-full max-w-[32rem] flex-col overflow-hidden rounded-lg border-0 bg-lychee_black p-6 shadow-lg text-white">
                                <AnimatedList>
                                    {notifications.map((item, idx) => (
                                    <Notification {...item} key={idx} />
                                    ))}
                                </AnimatedList>
                            </div>
                        </div>
                    </div>
                    <div className='sm:col-span-2 lg:col-span-2 flex place-content-center'>
                        <blockquote className="mb-2 border-l-2 pl-6 italic text-xs text-white w-1/2">
                            <span className='font-bold'>Lychee V2.0.0 is coming!</span> <br/>
                            Get Instant Access For Life $29.99 (85% off). No monthly subs. All Future Updates Included<br/>
                            <div className='flex py-1 gap-1 place-items-center'><FaCircle className="text-green-400 animate-pulse" />  11 seats remaining</div>
                            <Link rel="noopener noreferrer" target="_blank" className="underline bg-lychee_green/30" href="https://buy.stripe.com/aEUaGYfkW9L04wgbJ3"> Get deal now! </Link>
                        </blockquote> 
                    </div>                                    
                    <div className='text-center sm:col-span-2 lg:col-span-2'>
                        <BlurIn
                            word="BRING YOUR DATA TO LIFE"
                            className=" text-2xl sm:text-8xl text-lychee_green font-black py-10 pb-5"
                        />
                    </div>
                    
                    <div className='sm:col-span-2 lg:col-span-2'>
                        <h1 className="scroll-m-20 text-xl sm:text-2xl text-lychee_green font-extrabold tracking-tight lg:text-2xl place-items-center hover:underline cursor-pointer text-center"  href={"/dashboard"}>
                            <span>Connect<span className="text-purple-400"> Directly</span> to ALL <br/>The Data Sources  of Your  <span className="text-purple-400">Dreams</span> </span>
                        </h1>
                        <Link rel="noopener noreferrer" target="_blank" href={"https://misterrpink.beehiiv.com/p/how-to-use-lychee-integrations-coingecko"}><div className="text-xs text-slate-400 flex place-items-center place-content-center gap-2 py-2">How it works <MoveRight /></div> </Link>
                        
                        <div className="pt-4 text-center text-lychee_white text-sm sm:text-md">Not A Single Line of Code Required on Your End</div>
                        <div className="relative max-w-2xl mx-auto mt-8 rounded-xl">
                            <div className="w-full h-11 rounded-t-lg bg-gray-600/10 flex justify-start items-center space-x-1.5 px-3">
                                <span className="w-3 h-3 rounded-full bg-red-400"></span>
                                <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
                                <span className="w-3 h-3 rounded-full bg-green-400"></span>
                            </div>
                            <div className=" bg-black border-t-0 w-full"><div className=''><Image className="rounded-b-xl" src={'/integrationsPresent.png'} height={1000} width={750} /></div>
                            </div>                                
                            <BorderBeam />                                
                        </div>                       
                    </div>
                </div>
                <div className='text-center'>
                    <div className="sm:text-4xl text-lychee_green pt-10 pb-4">Scrape ANY URL</div>

                    <div className="sm:text-4xl text-lychee_green pb-4">Extract Structured Data from PDF</div>

                    <div className="sm:text-4xl text-lychee_green">Generate INSANE amounts of fake (realistic) Data</div>
                    <div className="text-[10px] sm:text-xs font-[300] sm:font-bold text-slate-200 sm:text-white py-1">for analysis and testing</div>
                    <div className="pt-4 xl:text-center text-lychee_white text-xl sm:text-4xl">A Powerful Spreadsheet</div>
                            <div className="pt-4 sm:pt-6 xl:text-center text-lychee_white text-xl sm:text-4xl"> </div>
                            <div className="pt-4 sm:pt-6 xl:text-center text-lychee_white text-xl sm:text-4xl">A Rich Text Editor </div>
                            <div className="pt-4 sm:pt-6 xl:text-center text-lychee_white text-xl sm:text-4xl">Generate Stunning presentations </div>
                            <div className="pt-4 sm:pt-6 xl:text-center text-lychee_white text-xl sm:text-4xl">Deploy an entire website right here </div>
                            <div className="pt-4 sm:pt-6 xl:text-center text-lychee_white text-xl sm:text-4xl">Publish Your Findings</div>
                            <div className="pt-4 sm:pt-6 xl:text-center text-lychee_white text-xl sm:text-4xl">Share Your Discoveries on Social Media</div>
                            <div className="pt-4 sm:pt-6 xl:text-center text-lychee_white text-xl sm:text-4xl">Invite Your Team</div>
                            <div className="pt-4 sm:pt-6 xl:text-center text-lychee_white text-xl sm:text-4xl">Build an Audience Right Here</div>                                  
                </div>
                <div className="w-full flex place-content-center">
                    <div className="container mx-auto px-4 md:px-8 ">
                        <h3 className="py-4 pt-36 text-center text-[10px] font-semibold text-slate-400">
                            ACTIVELY BETA TESTED BY FRIENDS AT
                        </h3>
                        <div className="sm:mt-6 sm:px-10">
                            <div className="flex flex-wrap gap-4 sm:gap-8 place-items-center place-content-center">
                                {companies.map((logo, idx) => (
                                    <img
                                        key={idx}
                                        src={`./${logo}.svg`}
                                        className="h-6 w-16 sm:h-8 sm:w-20 brightness-0 invert"
                                        alt={logo}
                                    />
                                ))}
                            </div>
                            <div className="pointer-events-none inset-y-0 left-0 w-1/6 bg-gradient-to-r from-lychee_black"></div>
                            <div className="pointer-events-none inset-y-0 right-0 w-1/6 bg-gradient-to-l from-lychee_black"></div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
