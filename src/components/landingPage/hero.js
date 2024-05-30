"use client";

import Link from "next/link";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useRef, useEffect, useState } from "react";

import { Separator } from "../ui/separator";
import VideoView from "./videoView";
import WavyText from "../magicui/wavy-text";
import Meteors from "../magicui/meteors";
import { VelocityScroll } from "../ui/scroll-based-velocity";
import WordPullUp from "../magicui/word-pull-up";
import BlurIn from "../magicui/blur-in";
import { Circle } from "lucide-react";
import { FaCircle } from "react-icons/fa";

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

    const revealVariants = {
        initial: { opacity: 0, x: '-100%' },
        animate: { opacity: 1, x: '0%' }
    };

    const companies = [
        "jpm",
        "goldman",
        "meta",
        "google",
        "apple",
        "mit",
        "openai",
      ];

    return (
        <section id="hero" className="flex place-content-center w-11/12 mx-auto overflow-hidden">
                <div className="relative h-full container z-10 flex flex-col overflow-hidden">
                    <Meteors />
                    <div className="text-balance bg-gradient-to-br from-lychee_blue from-0% to-lychee_red/70 bg-clip-text font-black leading-none tracking-tighter text-transparent sm:text-6xl sm:py-20 md:text-7xl lg:text-[250px]">
                        Lychee<span className="text-lychee_red pl-4" style={{ textShadow: '0px 0px 50px rgba(169, 29, 58, 1)'}}>.</span>
                    </div>
                    <div className="pl-6 text-2xl text-white">Bring Your Data To<span className="text-lychee_green font-black pl-2"  style={{ textShadow: '10px 10px 100px rgba(169, 29, 58, 1)'}}>Life</span><br/> <div className="flex gap-2 place-items-center">Effortless Analysis <FaCircle className="text-sm text-black"/> Powerful Results.</div> </div>
                    <div className="text-lychee_white font-[200] text-xl pl-6">
                        <div className="text-lychee_white w-2/5 py-1"><Separator /></div>
                    </div>
                    <div className="w-56 pl-6 pt-4">
                        <Link
                            href={'/dashboard'}
                            className={cn(
                                // colors
                                "bg-lychee_blue text-white cursor-pointer hover:bg-black/90 hover:text-white hover:shadow-white hover:shadow-2xl",

                                // layout
                                "group relative inline-flex h-9 w-full items-center justify-center gap-2 overflow-hidden whitespace-pre rounded-md px-4 py-2 text-base font-semibold tracking-tighter focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 md:flex",

                                // animation
                                "transform-gpu ring-offset-current transition-all duration-300 ease-out hover:ring-2 hover:ring-primary hover:ring-offset-2",
                            )}
                        >
                            Try for Free
                        </Link>
                        <div className="text-left pl-1 text-xs pt-4 text-lychee_white">
                            No card or registration required <br/> Hope you ❤️ it enough to stay
                        </div>
                    </div>

                    <div className="pt-40 pr-20">
                            <WavyText
                                word="Scrape ANY URL"
                                className="text-4xl font-bold text-white py-1"
                            />
                            <WavyText
                                word="Extract Structured Data from PDF"
                                className="text-4xl font-bold text-white py-1"
                            />
                            <div className="py-10">
                                <WavyText
                                    word="*Automagically* Analyze Anything With AI and Get Unprecedented Insights"
                                    className="text-7xl text-lychee_green"
                                />
                                <div className="pl-10 pt-1">
                                <WavyText
                                    word="Examine up to 10 datasets at once (500MB per dataset) (and growing)"
                                    className="text-xs font-bold text-white py-1"
                                />
                                <WavyText
                                    word="I am targeting 1GB/ dataset and 100 datasets at once by end of 2024"
                                    className="text-xs font-bold text-white py-1"
                                />
                                </div>
                            </div>
                            <WavyText
                                word="Generate INSANE amounts of fake (realistic) Data"
                                className="text-4xl font-bold text-white py-1"
                            />
                            <div className="pl-10">
                                <WavyText
                                    word="for analysis and testing"
                                    className="text-xs font-bold text-white py-1"
                                />
                            </div>
                            <div className="text-center text-lychee_white text-8xl font-black pt-24">
                            Connect <span className="text-lychee_red">Directly</span> to <span className="underline">ALL</span> The Data Sources of <span className="text-lychee_green">Your Dreams</span>
                            </div>
                            <div></div>
                            <div className="pt-10">
                            <VelocityScroll
                                text="Twitter, Reddit, Instagram, Strava, Youtube, Meta, NASDAQ, US Treasuries, SEC Edgar Data, OpenWeather API, Product Hunt, HackerNews, 4chan, The World Bank, weather data, earthquake data, NASA Data, Medium, NBAStats, Census.gov,"
                                default_velocity={0.3}
                                className="text-lychee_blue font-display text-center text-4xl font-bold tracking-[-0.02em] drop-shadow-sm md:text-7xl md:leading-[5rem]"
                                />
                            </div>
                            <WordPullUp className="font-bold tracking-[-0.02em] text-black text-white text-4xl leading-[5rem] pt-10"
                                words="Not A Single Line of Code Required on Your End"
                                />
                            <WordPullUp className="font-bold tracking-[-0.02em] text-black text-white text-4xl italize leading-[5rem]"
                                words="Data Cleaner Than a Nun's Browser History"
                                />
                            <section id="about">
                                <div className="w-full flex place-content-center">
                                    <div className="container mx-auto px-4 md:px-8">
                                        <h3 className="pt-40 text-center text-sm font-semibold text-slate-400 py-8">
                                            USED, TRUSTED AND ACTIVELY BETA TESTED BY FRIENDS AT
                                        </h3>
                                        <div className="mt-6">
                                            <div className="grid grid-cols-2 place-items-center place-content-center gap-2 md:grid-cols-4 xl:grid-cols-7 xl:gap-4">
                                                {companies.map((logo, idx) => (
                                                    <img
                                                        key={idx}
                                                        src={`./${logo}.svg`}
                                                        className="h-10 w-28 brightness-0 invert"
                                                        alt={logo}
                                                    />
                                                ))}
                                            </div>
                                            <div className="text-slate-600 text-xs pt-6 text-center">* Lychee have no affiliation or official endorcement from any of these companies. <br/> However, people in these entities actively use, test and suggest improvements on Lychee Beta and how it could serve their needs</div>
                                            <div className="pointer-events-none inset-y-0 left-0 w-1/6 bg-gradient-to-r from-lychee_black"></div>
                                            <div className="pointer-events-none inset-y-0 right-0 w-1/6 bg-gradient-to-l from-lychee_black"></div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                    </div>
                    <div className="grid grid-cols-10 gap-4 w-full pt-48">
                        <div className="col-span-5">
                            <div className=" pt-40">                                
                                    <motion.h1
                                        ref={fadeInRef}
                                        animate={fadeInInView ? "animate" : "initial"}
                                        variants={fadeUpVariants}
                                        initial="initial"
                                        transition={{
                                            duration: 0.6,
                                            delay: 0.1,
                                            ease: [0.21, 0.47, 0.32, 0.98],
                                            type: "spring",
                                        }}
                                    >
                                        <BlurIn
                                            word="BRING YOUR DATA TO LIFE"
                                            className="text-8xl text-lychee_green font-black pb-5"
                                        />
                                        <WavyText
                                            word="A Powerful Spreadsheet"
                                            className="text-2xl font-bold text-white py-1 pt-4"
                                        />
                                        <WavyText
                                            word="A Rich Text Editor"
                                            className="text-2xl font-bold text-white py-1"
                                        />
                                        <WavyText
                                            word="Beautiful Visualizations"
                                            className="text-2xl font-bold text-white pb-1"
                                        />
                                        <WavyText
                                            word="Generate Stunning presentations"
                                            className="text-2xl font-bold text-white pb-1"
                                        />
                                        <WavyText
                                            word="Publish Your Findings"
                                            className="text-2xl font-bold text-white pb-1"
                                        />
                                        <WavyText
                                            word="Share Your Discoveries on Social Media"
                                            className="text-2xl font-bold text-white pb-1"
                                        />
                                        <WavyText
                                            word="Invite Your Team"
                                            className="text-2xl font-bold text-white pb-1"
                                        />
                                        <WavyText
                                            word="Build an Audience Right Here"
                                            className="text-2xl font-bold text-white pb-1"
                                        />                                    
                                    </motion.h1>
                            </div>
                        </div>
                        <div className="col-span-5 pl-32 ml-10 ">
                            <div><VideoView /></div>                                    
                        </div>
                    </div>
                </div>
        </section>
    );
}
