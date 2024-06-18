"use client";

import { useRef, useEffect, useState } from "react"

import Link from "next/link";

import { VelocityScroll } from "../ui/scroll-based-velocity";

import BlurIn from "../magicui/blur-in";
import Particles from "../magicui/particles";

import VideoView from "./videoView";
import { Card } from "../ui/card";
import { MoveRight } from "lucide-react";

const companies = [
    "jpm",
    "goldman",
    "meta",
    "google",
    "apple",
    "mit",
    "openai",
  ];

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
                <div className="pt-10 sm:pt-20 sm:pr-20 z-10">
                    <Link rel="noopener noreferrer" target="_blank" href={"https://misterrpink.beehiiv.com/p/how-to-create-crarts-on-lychee"}>
                        <h1 className="py-10 scroll-m-20 text-xl sm:text-4xl text-lychee_green font-extrabold tracking-tight lg:text-5xl flex flex-wrap gap-2 place-items-center hover:underline cursor-pointer"  href={"/dashboard"}>
                            <span>Create Mind-Bendingly Beautiful</span>
                            <span>Visualizations and </span>
                            <span>Charts</span>
                            <span className="pt-6"><MoveRight /></span>
                        </h1>
                    </Link>
                    <div className="sm:text-4xl text-lychee_green">Automagically Analyze Anything With AI and Get Unprecedented Insights</div>
                    <div className="text-[10px] sm:text-xs font-[300] sm:font-bold text-slate-200 sm:text-white py-1">Examine multiple datasets at once (500MB per dataset) (and growing)</div>
                    <div className="text-[10px] sm:text-xs font-[300] sm:font-bold text-slate-200 sm:text-white py-1">I am targeting 1GB/ dataset and 100 datasets at once by end of 2024</div>
                    <div className="sm:text-4xl text-lychee_green pt-10">
                        Connect <span className="font-black text-lychee_red">Directly</span> to <span className="underline">ALL</span> The Data Sources of <span className="text-lychee_green">Your Dreams</span>
                    </div>
                    <div className="p-10 flex flex-wrap gap-4 text-xs place-items-center place-content-center">
                        <Card className="w-48 py-10 text-center">
                            Twitter
                        </Card>
                        <Card className="w-48 py-10 text-center">
                            CoinGecko
                        </Card>
                        <Card className="w-48 py-10 text-center">
                            Reddit - WallStreetBets
                        </Card>
                        <Card className="w-48 py-10 text-center">
                            Reddit - ShortSqueezes
                        </Card>
                        <Card className="w-48 py-10 text-center">
                            Reddit, Instagram, Strava, Youtube, Meta, NASDAQ, US Treasuries, SEC Edgar Data, OpenWeather API, Product Hunt, HackerNews, 4chan, The World Bank, weather data, earthquake data, NASA Data, Medium, NBAStats, Census.gov
                        </Card>
                    </div>
                    <div className="pt-4 text-center text-lychee_white text-sm sm:text-4xl">Not A Single Line of Code Required on Your End</div>
                    <div className="pt-4 text-center text-lychee_white text-sm sm:text-4xl">Data Cleaner Than a Nun's Browser History</div>

                    <div className="sm:text-4xl text-lychee_green pt-10 pb-4">Scrape ANY URL</div>

                    <div className="sm:text-4xl text-lychee_green pb-4">Extract Structured Data from PDF</div>

                    <div className="sm:text-4xl text-lychee_green">Generate INSANE amounts of fake (realistic) Data</div>
                    <div className="text-[10px] sm:text-xs font-[300] sm:font-bold text-slate-200 sm:text-white py-1">for analysis and testing</div>
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
            </div>
        </section>
    );
}
