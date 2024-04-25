"use client";

import Link from 'next/link';
import {BrowserView, MobileView} from 'react-device-detect';

import { cn } from "@/lib/utils";
import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";

import BrowserFrame from "react-browser-frame";
import { Progress } from "@/components/ui/progress";
import { BentoBase } from "@/components/bentoView/bentoBase";

import Meteors from "@/components/magicui/meteors";

export function Hero({data, progress, setStarted, background_color, width }) {
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



  return (
    <section id="hero">
      <div className="relative h-full overflow-hidden py-14">
        <div className="container z-10 flex flex-col">
          <div className="mt-20 grid grid-cols-1">
            <div className="flex flex-col items-center gap-6 text-center">
              <Meteors />
              <motion.h1
                ref={fadeInRef}
                className="text-balance bg-gradient-to-br from-black from-30% to-black/60 bg-clip-text py-6 text-5xl font-medium leading-none tracking-tighter text-transparent dark:from-white dark:to-white/40 sm:text-6xl md:text-7xl lg:text-8xl px-2"
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
                Mouth-Wateringly  <br /> Delicious Bentos <br />
              </motion.h1>

              <motion.p
                className="text-balance text-lg tracking-tight text-gray-400 md:text-xl"
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
                Generate yours in {'<'} 0.32 seconds <br /> Boost <span className="line-through">street cred</span> engagement by {'>'} 500%
              </motion.p>

              <motion.div
                animate={fadeInInView ? "animate" : "initial"}
                variants={fadeUpVariants}
                className="flex flex-col gap-4"
                initial={false}
                transition={{
                  duration: 0.6,
                  delay: 0.3,
                  ease: [0.21, 0.47, 0.32, 0.98],
                  type: "spring",
                }}
              >
                <button
                  onClick={()=> setStarted(true)}
                  className={cn(
                    // colors
                    "bg-black  text-white shadow hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90",

                    // layout
                    "group relative inline-flex h-9 w-full items-center justify-center gap-2 overflow-hidden whitespace-pre rounded-md px-4 py-2 text-base font-semibold tracking-tighter focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 md:flex",

                    // animation
                    "transform-gpu ring-offset-current transition-all duration-300 ease-out hover:ring-2 hover:ring-primary hover:ring-offset-2",
                  )}
                >
                  Get Started
                </button>

                <div className='pt-4'>Upvote Katsu on Product Hut</div>
                <Link href="https://www.producthunt.com/posts/katsu?utm_source=badge-featured&utm_medium=badge&utm_source=badge-katsu">
                  <img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=453874&theme=light" alt="Katsu - Mouth-Wateringly Delicious Bentos | Product Hunt" className='h-20' style={{ width: 250 }} />
                </Link>
              </motion.div>
            </div>
          </div>

          <motion.div
            animate={fadeInInView ? "animate" : "initial"}
            variants={fadeUpVariants}
            initial={false}
            transition={{
              duration: 0.6,
              delay: 0.4,
              ease: [0.21, 0.47, 0.32, 0.98],
              type: "spring",
            }}
            className="relative mx-auto mt-24 h-full w-full rounded-xl border shadow-2xl"
          >
            <div
              className={cn(
                "absolute inset-0 bottom-1/2 h-full w-full transform-gpu [filter:blur(100px)] opacity-10",
              )}
              style={{backgroundColor: background_color}}
            />
                <BrowserView>
                  {width <= 768 
                        ? <div className='flex justify-items-center'>
                              {data ? <BentoBase data={data} demo={true} mobile={true}/> : <Progress value={progress} className="w-[60%]" />}
                          </div>                  
                        : <BrowserFrame url="http://www.yourname.lych3e.com" className="hidden">
                              <div className='flex justify-items-center'>
                                <div className="overflow-hidden w-5/6 mx-auto px-5 overflow-hidden py-6 place-items-center place-content-center">                          
                                    {data ? <BentoBase data={data} demo={true}/> : <Progress value={progress} className="w-[60%]" />}
                                </div>
                            </div>                       
                          </BrowserFrame>
                   }
                </BrowserView>
                <MobileView>
                    <div className='flex justify-items-center'>
                        <div className="overflow-hidden w-5/6 mx-auto px-5 overflow-hidden py-6 place-items-center place-content-center">                          
                            {data ? <BentoBase data={data} demo={true} mobile={true}/> : <Progress value={progress} className="w-[60%]" />}
                        </div>
                    </div>                  
                </MobileView>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
