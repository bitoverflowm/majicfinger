"use client";

import Link from "next/link";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { motion, useInView } from "framer-motion";
import { BarChart3, ChevronDown } from "lucide-react";
import { useRef } from "react";

import { Flow } from "./flow";
import { Separator } from "../ui/separator";
import VideoView from "./videoView";

export function Hero() {
    const fadeInRef = useRef(null);
    const fadeInInView = useInView(fadeInRef, {
        once: true,
    });

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
                <div className="container z-10 flex flex-col">
                    <motion.h1
                        ref={fadeInRef}
                        className="text-balance bg-gradient-to-br from-lychee_blue from-0% to-lychee_red/70 bg-clip-text font-black leading-none tracking-tighter text-transparent sm:text-6xl sm:pt-16 sm:pb-40 md:text-7xl lg:text-[300px]"
                        animate={fadeInInView ? "animate" : "initial"}
                        variants={fadeUpVariants}
                        initial={false}
                        transition={{
                        duration: 0.6,
                        delay: 0.1,
                        ease: [0.21, 0.47, 0.32, 0.98],
                        type: "spring",
                        }}
                    >
                        Lychee<span className="text-lychee_red hover:rounded-full pl-4" style={{ textShadow: '6px 6px 100px rgba(169, 29, 58, 1)'}}>.</span>
                    </motion.h1>
                    <div className="grid grid-cols-10 gap-12 w-full">
                        <div className="col-span-4">
                            <motion.p
                                className="text-lychee_white/30 text-4xl"
                                animate={fadeInInView ? "animate" : "initial"}
                                variants={fadeUpVariants}
                                initial={false}
                                transition={{
                                    duration: 0.6,
                                    delay: 0.2,
                                    ease: [0.21, 0.47, 0.32, 0.98],
                                    type: "spring",
                                }}
                            >
                                <Separator className="mb-8"/>
                                <Image src="./headerText.svg"  width={1000} height={600}/>
                            </motion.p>
                            <motion.p
                                className="text-lychee_white text-md font-extralight pt-2"
                                animate={fadeInInView ? "animate" : "initial"}
                                variants={fadeUpVariants}
                                initial={false}
                                transition={{
                                duration: 0.6,
                                delay: 0.2,
                                ease: [0.21, 0.47, 0.32, 0.98],
                                type: "spring",
                                }}
                            >
                                We'll save you from all the complex yabba-dabba-doos out there.
                            </motion.p>

                            <motion.div
                                animate={fadeInInView ? "animate" : "initial"}
                                variants={fadeUpVariants}
                                className="flex gap-4 lg:flex-row pt-8"
                                initial={false}
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
                                        "bg-lychee_go cursor-pointer hover:bg-black/90 hover:text-white hover:shadow-white hover:shadow-2xl",

                                        // layout
                                        "group relative inline-flex h-9 w-full items-center justify-center gap-2 overflow-hidden whitespace-pre rounded-md px-4 py-2 text-base font-semibold tracking-tighter focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 md:flex",

                                        // animation
                                        "transform-gpu ring-offset-current transition-all duration-300 ease-out hover:ring-2 hover:ring-primary hover:ring-offset-2",
                                    )}
                                    >
                                        Try for Free
                                    </Link>
                                    <div className="text-xs pt-4 text-lychee_white">
                                        * No card or registration required <br/> We hope you ❤️ it enough to stay
                                    </div>
                                </div>
                            </motion.div>
                            <div className="pt-72">
                                <div className="pt-20 text-8xl text-lychee_green font-black">BRING YOUR DATA TO LIFE</div>
                                <div className="text-lychee_green font-thin text-xl pt-6">Use our AI to gain unprecedented insights.<br/> Or use our suite of tools to start your analysis</div>
                            </div>
                        </div>
                        <div className="col-span-6 pl-32 ml-10 w-">
                            <div><VideoView /></div>                                    
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
