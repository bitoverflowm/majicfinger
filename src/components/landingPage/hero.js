"use client";

import Link from "next/link";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { motion, useInView } from "framer-motion";
import { BarChart3, ChevronDown } from "lucide-react";
import { useRef, useEffect, useState } from "react";

import { Flow } from "./flow";
import { Separator } from "../ui/separator";
import VideoView from "./videoView";
import WavyText from "../magicui/wavy-text";
import Meteors from "../magicui/meteors";

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

    return (
        <section id="hero">
            <div className="relative h-full pt-10">
                <Meteors />
                <div className="container ml-20 px-0 z-10 flex flex-col">
                    <motion.h1
                        ref={fadeInRef}
                        className="text-balance bg-gradient-to-br from-lychee_blue from-0% to-lychee_red/70 bg-clip-text font-black leading-none tracking-tighter text-transparent sm:text-6xl sm:pt-16 sm:pb-5 md:text-7xl lg:text-[200px]"
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
                        Lychee<span className="text-lychee_red hover:rounded-full pl-4" style={{ textShadow: '10px 10px 100px rgba(169, 29, 58, 1)'}}>.</span>
                    </motion.h1>
                    <motion.div
                            className="text-lychee_blue font-[200] text-lg pl-2 "
                            animate={fadeInInView ? "animate" : "initial"}
                            variants={fadeUpVariants}
                            initial="initial"
                            transition={{
                                duration: 0.6,
                                delay: 0.2,
                                ease: [0.21, 0.47, 0.32, 0.98],
                                type: "spring",
                            }}
                        >
                            We'll save you from all the complex yabba-dabba-doos out there.
                    </motion.div>

                    <div className="grid grid-cols-10 gap-4 w-full">
                        <div className="col-span-5">                            
                            <motion.div
                                animate={fadeInInView ? "animate" : "initial"}
                                variants={fadeUpVariants}
                                className="flex gap-4 lg:flex-row pt-8"
                                initial="initial"
                                transition={{
                                    duration: 0.6,
                                    delay: 0.3,
                                    ease: [0.21, 0.47, 0.32, 0.98],
                                    type: "spring",
                                }}
                            >
                                <div className="">
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
                                    <div className="text-xs pt-4 text-lychee_white">
                                        * No card or registration required <br/> Hope you ❤️ it enough to stay
                                    </div>
                                </div>
                            </motion.div>
                            <div className="pt-64">
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
                                    <WavyText
                                        word="Scrape ANY URL"
                                        className="text-2xl font-bold text-white py-1"
                                    />
                                    <WavyText
                                        word="Generate Highly Realistic Sample Data"
                                        className="text-2xl font-bold text-white py-1"
                                    />
                                    <WavyText
                                        word="Extract Structured Data from PDF"
                                        className="text-2xl font-bold text-white py-1"
                                    />
                                    <WavyText
                                        word="Generate Unprecedented Insights With AI"
                                        className="text-2xl font-bold text-white py-1"
                                    />
                                    <WavyText
                                        word="All The Data You Could Possibly Want"
                                        className="text-2xl font-bold text-white py-1"
                                    />
                                    <WavyText
                                        word="Twitter, Reddit, Instagram, Strava, Youtube, Meta, NASDAQ, US Treasuries, SEC Edgar Data, OpenWeather API, Product Hunt, HackerNews, 4chan, The World Bank, weather data, earthquake data, NASA Data, Medium, NBAStats, Census.gov..."
                                        className="pl-2 text-lg font-bold text-lychee_blue"
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
                                        word="Visualization in 0.32 seconds"
                                        className="text-2xl font-bold text-white pb-1"
                                    />
                                    <WavyText
                                        word="Generate stunning presentations"
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
                                    
                                </motion.h1>
                                <div className="pt-20 text-8xl text-lychee_green font-black">BRING YOUR DATA TO LIFE</div>
                                <div className="text-xs text-white font-thin text-xl pt-6">Every single thing DATA<br/> 0 Hassle <br /> And I'm only just getting started
                                <div className="pt-2 text-xs">Thank you for visiting</div>
                                <Link href="https://x.com/misterrpink1" className="text-xs">@misterrpink </Link>
                                <div className="text-xs"> Inventor of Lychee</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-span-5 pl-32 ml-10 mt-16 pt-96">
                            <div><VideoView /></div>                                    
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
