"use client";

import BackgroundVideo from 'next-video/background-video';
import charts from '/videos/charts.mp4';

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
        name: "Payment received",
        description: "Magic UI",
        time: "15m ago",

        icon: "💸",
        color: "#00C9A7",
    },
    {
        name: "User signed up",
        description: "Magic UI",
        time: "10m ago",
        icon: "👤",
        color: "#FFB800",
    },
    {
        name: "New message",
        description: "Magic UI",
        time: "5m ago",
        icon: "💬",
        color: "#FF3D71",
    },
    {
        name: "New event",
        description: "Magic UI",
        time: "2m ago",
        icon: "🗞️",
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
          "transition-all duration-200 ease-in-out hover:scale-[103%]",
          // dark styles
          "transform-gpu bg-transparent backdrop-blur-md [border:1px_solid_rgba(255,255,255,.1)] [box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]",
        )}
      >
        <div className="flex flex-row items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-2xl"
            style={{
              backgroundColor: color,
            }}
          >
            <span className="text-lg">{icon}</span>
          </div>
          <div className="flex flex-col overflow-hidden">
            <figcaption className="flex flex-row items-center whitespace-pre text-lg font-medium dark:text-white ">
              <span className="text-sm sm:text-lg">{name}</span>
              <span className="mx-1">·</span>
              <span className="text-xs text-gray-500">{time}</span>
            </figcaption>
            <p className="text-sm font-normal dark:text-white/60">
              {description}
            </p>
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
                <h1 className="text-center scroll-m-20 text-xl sm:text-4xl font-extrabold tracking-tight lg:text-5xl text-white py-1 sm:pl-1 xl:pl-6">Discover Something Great</h1>
                <div className="pt-2 sm:pl-1 xl:pl-6 text-center">
                    <code className="text-center relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm xl:text-lg font-semibold  text-white bg-purple-400/20 shadow-2xl shadow-purple-200">
                        We'll save you from all the <span className="text-lychee_green italic font-black ">complex yabba-dabba-doos</span> out there.
                    </code>
                </div>
                <div className="pt-4 sm:pl-1 xl:pl-6 flex place-content-center">
                    <Link className='w-32 z-10 text-center text-black font-bold bg-green-400 p-1 sm:p-2 mt-1 sm:mt-3 rounded-md hover:bg-purple-400' href={"/dashboard"}>
                        Go
                    </Link>
                </div>
                <div className="pt-10 sm:pt-20 sm:pr-20 z-10 grid sm:grid-cols-2 gap-20">
                    <div>
                        <h1 className="scroll-m-20 text-xl sm:text-2xl text-lychee_green font-extrabold tracking-tight lg:text-2xl place-items-center text-center">
                            <span><span className="text-purple-400">Instant</span> Graphs <br/> <span className="text-purple-400">Zero</span> Hassle </span>
                        </h1>
                        <Link rel="noopener noreferrer" target="_blank" href={"https://misterrpink.beehiiv.com/p/how-to-create-crarts-on-lychee"}><div className="text-xs text-slate-400 flex place-items-center place-content-center gap-2 py-2">How it works <MoveRight /></div> </Link>
                        
                        <div
                            className="relative mx-auto rounded-xl shadow-2xl w-5/6"
                        >
                            <BackgroundVideo  src={charts} />
                            <BorderBeam />
                        </div>
                    </div>
                    <Link rel="noopener noreferrer" target="_blank" href={"https://misterrpink.beehiiv.com/p/how-to-analyze-data-with-lychee-ai"}>
                        <h1 className="scroll-m-20 text-xl sm:text-2xl text-lychee_green font-extrabold tracking-tight lg:text-2xl place-items-center hover:underline cursor-pointer text-center"  href={"/dashboard"}>
                            <span><span className="text-purple-400">Automagically</span> Analyze Anything. <br/>Let our <span className="text-purple-400">AI</span> do the heavy lifting for you.</span>
                        </h1>
                        <div className="text-xs text-slate-400 flex place-items-center place-content-center gap-2 py-2">How it works <MoveRight /></div>
                        <div
                            className="relative mx-auto rounded-xl shadow-2xl w-5/6"
                        >
                            <div className="relative flex max-h-[400px] min-h-[400px] w-full max-w-[32rem] flex-col overflow-hidden rounded-lg border bg-background p-6 shadow-lg">
                                <AnimatedList>
                                    {notifications.map((item, idx) => (
                                    <Notification {...item} key={idx} />
                                    ))}
                                </AnimatedList>
                            </div>
                            <BorderBeam />
                        </div>
                    </Link>
                    <Link rel="noopener noreferrer" target="_blank" href={"https://misterrpink.beehiiv.com/p/how-to-use-lychee-integrations-coingecko"}>
                        <h1 className="scroll-m-20 text-xl sm:text-2xl text-lychee_green font-extrabold tracking-tight lg:text-2xl place-items-center hover:underline cursor-pointer text-center"  href={"/dashboard"}>
                            <span>Connect<span className="text-purple-400"> Directly</span> to ALL <br/>The Data Sources  of Your  <span className="text-purple-400">Dreams</span> </span>
                        </h1>
                        <div className="pt-4 text-center text-lychee_white text-sm sm:text-md">Not A Single Line of Code Required on Your End</div>
                        <div className="text-xs text-slate-400 flex place-items-center place-content-center gap-2 py-2">How it works <MoveRight /></div>
                        <div
                            className="relative mx-auto rounded-xl shadow-2xl w-5/6"
                        >
                            <Image
                                src="/dashboard.jpg"
                                width={550}
                                height={450}
                                alt="Avatar"
                                className="relative rounded-xl block"
                            />
                            <BorderBeam />
                        </div>
                    </Link>

                    <div className="text-center text-lychee_white text-sm sm:text-4xl">Targeting 100,000 + Integrations by end of 2025</div>
                    
                    <div className="pt-4 pb-8 text-center text-lychee_white text-sm sm:text-4xl">Data Cleaner Than a Nun's Browser History</div>
                    <div className="grid grid-cols-6">
                        <div className="text-[10px] sm:text-xs font-[300] sm:font-bold text-slate-200 sm:text-white py-1">
                            <Twitter className="inline-block mr-1" /> Twitter (X)
                        </div>
                        <div className="text-[10px] sm:text-xs font-[300] sm:font-bold text-slate-200 sm:text-white py-1">
                            <Zap className="inline-block mr-1" /> CoinGecko
                        </div>
                        <div className="text-[10px] sm:text-xs font-[300] sm:font-bold text-slate-200 sm:text-white py-1">
                            <Activity className="inline-block mr-1" /> WallStreetBets (sentiment analysis - Reddit)
                        </div>
                        <div className="text-[10px] sm:text-xs font-[300] sm:font-bold text-slate-200 sm:text-white py-1">
                            <AlertTriangle className="inline-block mr-1" /> ShortSqueezes (Reddit)
                        </div>
                        <div className="text-[10px] sm:text-xs font-[300] sm:font-bold text-slate-200 sm:text-white py-1">
                            <Globe className="inline-block mr-1" /> Reddit 
                            <br /><span className="text-slate-400">(launching in July 24)</span>
                        </div>
                        <div className="text-[10px] sm:text-xs font-[300] sm:font-bold text-slate-200 sm:text-white py-1">
                            <Instagram className="inline-block mr-1" /> Instagram 
                            <br /><span className="text-slate-400">(launching in July 24)</span>
                        </div>
                        <div className="text-[10px] sm:text-xs font-[300] sm:font-bold text-slate-200 sm:text-white py-1">
                            <Activity className="inline-block mr-1" /> Strava 
                            <br /><span className="text-slate-400">(launching in July 24)</span>
                        </div>
                        <div className="text-[10px] sm:text-xs font-[300] sm:font-bold text-slate-200 sm:text-white py-1">
                            <Youtube className="inline-block mr-1" /> Youtube 
                            <br /><span className="text-slate-400">(launching in July 24)</span>
                        </div>
                        <div className="text-[10px] sm:text-xs font-[300] sm:font-bold text-slate-200 sm:text-white py-1">
                            <Facebook className="inline-block mr-1" /> Meta 
                            <br /><span className="text-slate-400">(launching in July 24)</span>
                        </div>
                        <div className="text-[10px] sm:text-xs font-[300] sm:font-bold text-slate-200 sm:text-white py-1">
                            <BarChart2 className="inline-block mr-1" /> NASDAQ 
                            <br /><span className="text-slate-400">(launching in July 24)</span>
                        </div>
                        <div className="text-[10px] sm:text-xs font-[300] sm:font-bold text-slate-200 sm:text-white py-1">
                            <DollarSign className="inline-block mr-1" /> US Treasuries 
                            <br /><span className="text-slate-400">(launching in July 24)</span>
                        </div>
                        <div className="text-[10px] sm:text-xs font-[300] sm:font-bold text-slate-200 sm:text-white py-1">
                            <FileText className="inline-block mr-1" /> SEC Edgar Data 
                            <br /><span className="text-slate-400">(launching in July 24)</span>
                        </div>
                        <div className="text-[10px] sm:text-xs font-[300] sm:font-bold text-slate-200 sm:text-white py-1">
                            <Cloud className="inline-block mr-1" /> OpenWeather API 
                            <br /><span className="text-slate-400">(launching in July 24)</span>
                        </div>
                        <div className="text-[10px] sm:text-xs font-[300] sm:font-bold text-slate-200 sm:text-white py-1">
                            <ShoppingCart className="inline-block mr-1" /> Product Hunt 
                            <br /><span className="text-slate-400">(launching in July 24)</span>
                        </div>
                        <div className="text-[10px] sm:text-xs font-[300] sm:font-bold text-slate-200 sm:text-white py-1">
                            <Zap className="inline-block mr-1" /> HackerNews 
                            <br /><span className="text-slate-400">(launching in July 24)</span>
                        </div>
                        <div className="text-[10px] sm:text-xs font-[300] sm:font-bold text-slate-200 sm:text-white py-1">
                            <Globe className="inline-block mr-1" /> 4chan 
                            <br /><span className="text-slate-400">(launching in July 24)</span>
                        </div>
                        <div className="text-[10px] sm:text-xs font-[300] sm:font-bold text-slate-200 sm:text-white py-1">
                            <Globe2 className="inline-block mr-1" /> The World Bank 
                            <br /><span className="text-slate-400">(launching in July 24)</span>
                        </div>
                        <div className="text-[10px] sm:text-xs font-[300] sm:font-bold text-slate-200 sm:text-white py-1">
                            <Thermometer className="inline-block mr-1" /> weather data 
                            <br /><span className="text-slate-400">(launching in July 24)</span>
                        </div>
                        <div className="text-[10px] sm:text-xs font-[300] sm:font-bold text-slate-200 sm:text-white py-1">
                            <AlertTriangle className="inline-block mr-1" /> earthquake data 
                            <br /><span className="text-slate-400">(launching in July 24)</span>
                        </div>
                        <div className="text-[10px] sm:text-xs font-[300] sm:font-bold text-slate-200 sm:text-white py-1">
                            <Star className="inline-block mr-1" /> NASA Data 
                            <br /><span className="text-slate-400">(launching in July 24)</span>
                        </div>
                        <div className="text-[10px] sm:text-xs font-[300] sm:font-bold text-slate-200 sm:text-white py-1">
                            <FileText className="inline-block mr-1" /> Medium 
                            <br /><span className="text-slate-400">(launching in July 24)</span>
                        </div>
                        <div className="text-[10px] sm:text-xs font-[300] sm:font-bold text-slate-200 sm:text-white py-1">
                            <BarChart className="inline-block mr-1" /> NBAStats 
                            <br /><span className="text-slate-400">(launching in July 24)</span>
                        </div>
                        <div className="text-[10px] sm:text-xs font-[300] sm:font-bold text-slate-200 sm:text-white py-1">
                            <Globe2 className="inline-block mr-1" /> Census.gov 
                            <br /><span className="text-slate-400">(launching in July 24)</span>
                        </div>
                    </div>

                    <div className="sm:text-4xl text-lychee_green pt-10 pb-4">Scrape ANY URL</div>

                    <div className="sm:text-4xl text-lychee_green pb-4">Extract Structured Data from PDF</div>

                    <div className="sm:text-4xl text-lychee_green">Generate INSANE amounts of fake (realistic) Data</div>
                    <div className="text-[10px] sm:text-xs font-[300] sm:font-bold text-slate-200 sm:text-white py-1">for analysis and testing</div>
                </div>
                <div className="sm:grid sm:grid-cols-10 gap-4 w-full sm:pt-20">
                    <div className="pt-10 sm:pt-0 sm:col-span-5">
                            <BlurIn
                                word="BRING YOUR DATA TO LIFE With"
                                className="text-2xl sm:text-8xl text-lychee_green font-black py-10 pb-5"
                            />
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
                    <div className="hidden sm:block col-span-5 pl-32 ml-10 ">
                        <div><VideoView /></div>                               
                    </div>
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
