"use client";

import { motion } from "framer-motion"
import { useRef, useEffect, useState } from "react"

import Link from "next/link";

import { VelocityScroll } from "../ui/scroll-based-velocity";

import WavyText from "../magicui/wavy-text";
import Meteors from "../magicui/meteors";
import WordPullUp from "../magicui/word-pull-up";
import BlurIn from "../magicui/blur-in";


import VideoView from "./videoView";


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
            <div className="relative h-full container z-10 flex flex-col overflow-hidden">
                <Meteors />
                <div className="text-balance bg-gradient-to-br from-lychee_blue from-0% to-lychee_red/70 bg-clip-text font-black leading-none tracking-tighter text-transparent pt-10 pb-3 sm:py-10 text-7xl sm:text-8xl xl:text-[250px] text-center sm:text-left">
                    Lychee<span className="text-lychee_red pl-1 sm:pl-4" style={{ textShadow: '0px 0px 50px rgba(169, 29, 58, 1)'}}>.</span>
                </div>
                <div className="text-center sm:text-left sm:pl-1 xl:pl-6 text-xl sm:text-2xl xl:text-6xl text-white">Easy <span className="text-lychee_green italic font-black ">Peasy</span> Data...</div>
                <div className="text-center sm:text-left sm:pl-1 xl:pl-6 text-xl sm:text-2xl xl:text-6xl text-white">Discover Something Great</div>
                <Link className='mx-auto sm:ml-8 text-center w-32 bg-green-600 p-1 sm:p-2 mt-1 sm:mt-3 rounded-md hover:border hover:border-white' href={"/dashboard"}>
                    <div className="text-white text-xs"> Start </div>
                </Link>
                <div className="text-center sm:text-left sm:ml-8 text-[10px] pt-1 text-lychee_white">
                        No card or registration required
                    </div>
                <div className="pt-10 sm:pt-20 sm:pr-20">
                    <div className="sm:text-4xl text-lychee_green">Automagically Analyze Anything With AI and Get Unprecedented Insights</div>
                    <div className="text-[10px] sm:text-xs font-[300] sm:font-bold text-slate-200 sm:text-white py-1">Examine multiple datasets at once (500MB per dataset) (and growing)</div>
                    <div className="text-[10px] sm:text-xs font-[300] sm:font-bold text-slate-200 sm:text-white py-1">I am targeting 1GB/ dataset and 100 datasets at once by end of 2024</div>
                    <div className="sm:text-center text-lychee_white sm:text-8xl sm:font-black pt-10">
                        Connect <span className="font-black text-lychee_red">Directly</span> to <span className="underline">ALL</span> The Data Sources of <span className="text-lychee_green">Your Dreams</span>
                    </div>
                    <div className="py-2 sm:py-10">
                        <VelocityScroll
                            text="Twitter, Reddit, Instagram, Strava, Youtube, Meta, NASDAQ, US Treasuries, SEC Edgar Data, OpenWeather API,"
                            default_velocity={0.3}
                            className="text-lychee_blue font-display text-center text-4xl font-bold tracking-[-0.02em] drop-shadow-sm md:text-7xl md:leading-[5rem]"
                            />
                        <VelocityScroll
                            text="Product Hunt, HackerNews, 4chan, The World Bank, weather data, earthquake data, NASA Data, Medium, NBAStats, Census.gov"
                            default_velocity={0.3}
                            className="text-lychee_blue font-display text-center text-4xl font-bold tracking-[-0.02em] drop-shadow-sm md:text-7xl md:leading-[5rem]"
                            />
                    </div>
                    <div className="pt-4 text-center text-lychee_white text-sm sm:text-4xl">Not A Single Line of Code Required on Your End</div>
                    <div className="pt-4 text-center text-lychee_white text-sm sm:text-4xl">Data Cleaner Than a Nun's Browser History</div>

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
                            <div className="pt-4 sm:pt-6 xl:text-center text-lychee_white text-xl sm:text-4xl">MindBendingly Beautiful Visualizations and Charts </div>
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
