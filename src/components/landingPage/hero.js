"use client";

import BackgroundVideo from 'next-video/background-video';
import presenting_charts from '/videos/charts2.mp4?thumbnailTime=100';

import { useRef, useEffect, useState } from "react"

import Link from "next/link";
import Image from "next/image";

import { Twitter, Instagram, Youtube, Activity, Facebook, BarChart2, DollarSign, FileText, Cloud, ShoppingCart, Zap, Globe, Thermometer, AlertTriangle, Star, BarChart, Globe as Globe2 } from 'react-feather';

import BlurIn from "../magicui/blur-in";
import { BorderBeam } from "../magicui/border-beam";

import VideoView from "./videoView";
import { CircleCheckBig, MoveRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedList } from "@/components/magicui/animated-list";
import { FaCircle } from 'react-icons/fa';
import Marquee from "@/components/magicui/marquee";
import LycheeFeatureGrid from '../easyLychee/usage/lychee_feature_grid';

export const Highlight = ({
    children,
    className,
}) => {
    return (
        <span
        className={cn(
            "p-1 py-0.5 font-bold bg-cyan-600/20 text-cyan-600",
            className,
        )}
        >
        {children}
        </span>
    );
};

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


  const reviews = [
    {
      name: "Bernard",
      username: "There's An AI For That",
      body: (
        <p>
          It's like <Highlight> the chart editor i wish i had for the last 10 years</Highlight>{" "} . Love it...
        </p>
      ),
      img: "https://media.theresanaiforthat.com/u/bearnard.png?width=52",
      src: "https://theresanaiforthat.com/ai/lychee?comment_id=10781"
    },
    {
      name: "Amal Khan",
      username: "Product Hunt",
      body: (
        <p>
          I really can't express in words how much I needed this.
          <Highlight>Changed my whole working game. My peers looked at this thing jaws dropped haha.</Highlight> 
          Looking forward to the future of Lychee!
        </p>
      ),
      img: "https://ph-avatars.imgix.net/6832524/original.png?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=40&h=40&fit=crop&dpr=1",
      src: "https://www.producthunt.com/products/lychee-3/reviews?review=744208"
    },
    {
      name: "Charles Teh",
      username: "Product Hunt",
      body: (
        <p>
          Data scientists, marketers & managers would love this {':)'}
          <Highlight>Instant hands-free graph generation!</Highlight>
          Congrats on the launch!
        </p>
      ),
      img: "https://ph-avatars.imgix.net/6514580/7e558077-c3ef-4d78-8f48-c3e02e01ffe5.webp?auto=compress&codec=mozjpeg&cs=strip&fm=webp&w=36&h=36&fit=max&frame=1&dpr=2",
      src: "https://www.producthunt.com/products/lychee-3?comment=3321659#lychee-3"
    },
    {
      name: "Mar",
      username: "Product Hunt",
      body: (
        <p>
          OMG finally a reasonable tool
          <Highlight>to get my charting done fast! </Highlight> Do you think you will add more capabilities like Numpy Pandas library integrations @misterrpink
        </p>
      ),
      img: "https://ph-avatars.imgix.net/6852998/e7fbb0c4-97a3-4ad5-9919-cd7b20e164d4.png?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=36&h=36&fit=crop&dpr=1",
      src: "https://www.producthunt.com/products/lychee-3?comment=3320264#lychee-3"
    },
    {
      name: "Henry Habib",
      username: "Product Hunt",
      body: (
        <p>
          Nice! 
          <Highlight>
          Visualizing data made simple.
          </Highlight>{" "}
          Great help for anyone in the data landscape. Good luck!
        </p>
      ),
      img: "https://ph-avatars.imgix.net/6203476/947f99ac-c697-4e66-8200-7b3cf40a3979.png?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=36&h=36&fit=crop&dpr=1",
      src: "https://www.producthunt.com/products/lychee-3?comment=3320062#lychee-3"
    },
    {
      name: "Yu",
      username: "Product Hunt",
      body: (
        <p>
          love this project. 
          <Highlight> I'll actually use this every day </Highlight> 
          god I hate excel also why am I downloading a new software every few months?
          Microsoft is unhinged at this point {" "}
        </p>
      ),
      img: "https://ph-avatars.imgix.net/6835962/224dc544-7618-43f7-8a0d-bfacd75315f7.png?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=36&h=36&fit=crop&dpr=1",
      src: "https://www.producthunt.com/products/lychee-3?comment=3320062#lychee-3"
    },
    {
      name: "Nikita",
      username: "Product Hunt",
      body: (
        <p>
          The design of this thing is
          <Highlight> out of this world. </Highlight> 
          I can imagine this totally blowing up on places like Instagram and X.
        </p>
      ),
      img: "https://ph-avatars.imgix.net/4884364/90068181-d49d-4f6e-9d4e-69c4043fa07b.jpeg?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=36&h=36&fit=crop&dpr=1",
      src: "https://www.producthunt.com/posts/katsu?comment=3446689"
    },
    {
      name: "Nico",
      username: "Product Hunt",
      body: (
        <p>
          Congrats on the launch! 
          <Highlight> Looks sick for product updates! </Highlight> 
          {" "}
        </p>
      ),
      img: "https://ph-avatars.imgix.net/4654354/d1f41fbe-051a-4dfd-a9f5-700040e61c59.png?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=36&h=36&fit=crop&dpr=1",
      src: "https://www.producthunt.com/posts/katsu?comment=3446565"
    },
    {
      name: "Jean-Pierre",
      username: "Product Hunt",
      body: (
        <p>
          Very nice project @misterrpink 👍
          <Highlight> love the concept. </Highlight> 
          Btw, love the launch video👌
        </p>
      ),
      img: "https://ph-avatars.imgix.net/6441220/82124fa0-ef46-4289-8a39-5bacbea90f44.png?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=36&h=36&fit=crop&dpr=1",
      src: "https://www.producthunt.com/posts/katsu?comment=3448801"
    },
  ];
  

const firstRow = reviews.slice(0, reviews.length / 2);
const secondRow = reviews.slice(reviews.length / 2);



const ReviewCard = ({
  img,
  name,
  username,
  body,
  src,
}) => {
  return (
    <figure
      className={cn(
        "relative w-56 cursor-pointer overflow-hidden rounded-xl border p-4",
        // dark styles
        "border-gray-50/[.1] bg-gray-50/[.10] hover:bg-gray-50/[.15]",
      )}
    >
      <Link href={src} rel="noopener noreferrer" target="_blank">  
        <div className="flex flex-row items-center gap-2">
            <img
                src={img}
                className="h-8 w-8 rounded-full"
            />
            <div className="flex flex-col">
                <figcaption className="text-xs font-medium text-white">
                    {name}
                </figcaption>
                <p className="text-xs font-medium text-white/40">{username}</p>
            </div>
        </div>
        <blockquote className="mt-2 text-xs text-white">{body}</blockquote>
      </Link>
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
        <section id="hero" className="flex place-content-center w-full mx-auto overflow-hidden">            
            <div className="relative h-full w-full container">
                <div className="text-balance bg-gradient-to-br from-lychee_blue from-0% to-lychee_red/70 bg-clip-text font-black leading-none tracking-tighter text-transparent pt-10 pb-3 sm:py-10 text-7xl sm:text-[150px] xl:text-[250px] text-center">
                    Lychee<span className="text-lychee_red pl-1 sm:pl-4" style={{ textShadow: '0px 0px 50px rgba(169, 29, 58, 1)'}}>.</span>
                </div>
                <h3 className="text-slate-200 text-center scroll-m-20 text-2xl font-semibold tracking-tight">
                    You deserve a break from spreadsheets...
                </h3>
                <div className='flex gap-2 place-content-center py-4'>
                    <Link href="#about">
                        <div className='shadow-2xl shadow-lychee_red bg-black rounded-md text-slate-200 p-2 text-[10px]'>Tell Me More</div>
                    </Link>
                    <Link href="#getIt">
                        <div className='shadow-2xl shadow-lychee_red bg-green-400 rounded-md text-slate-800 p-2 text-[10px]'>I want it.</div>
                    </Link>
                </div>
                <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-lychee_black py-20 md:shadow-xl">
                    <p className="text-sm text-muted-foreground pb-2"> All testimonials are clickable.</p>
                    <Marquee pauseOnHover className="[--duration:20s]">
                        {firstRow.map((review) => (
                        <ReviewCard key={review.username} {...review} />
                        ))}
                    </Marquee>
                    <Marquee reverse pauseOnHover className="[--duration:20s]">
                        {secondRow.map((review) => (
                        <ReviewCard key={review.username} {...review} />
                        ))}
                    </Marquee>
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-black from-lychee_black"></div>
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-black from-lychee_black"></div>
                </div>
                <div className='pt-10 text-white' id="about">
                    <h1 className="text-center scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
                        Did you ever dream <br/> of becoming... <br/><br/> THE Michael Jordan of Excel?
                    </h1>
                </div>
                <div className='py-2'>
                    <p className="text-center text-xl text-slate-400">
                        Lychee takes care of the grunt work
                    </p>
                    <p className="text-center text-xl text-slate-400">
                        So you can focus on your actual passion
                    </p>
                </div>                
                <div className='text-slate-200 text-xs flex place-content-center'>
                    <div className='sm:w-1/2'>
                        <div className='flex place-items-center gap-2'><CircleCheckBig className='w-4 h-4 text-green-400'/><p className="leading-7"> Charts in {'<'} 0.27 secs </p></div>
                        <div className='flex place-items-center gap-2'><CircleCheckBig className='w-4 h-4 text-green-400'/><p className="leading-7"> Conduct complex analysis with AI</p></div>
                        <div className='flex place-items-center gap-2'><CircleCheckBig className='w-4 h-4 text-green-400'/><p className="leading-7"> Scrape any website </p></div>
                        <div className='flex place-items-center gap-2'>
                            <CircleCheckBig className='w-10 h-10 text-green-400' />
                            <p className="leading-7 flex-shrink-0 pr-2"> No-Code connect to </p>
                            <div className='flex-grow flex flex-wrap gap-1'>
                                <code className="text-center relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm xl:text-lg font-semibold text-white bg-purple-400/20 shadow-2xl shadow-purple-200">Twitter</code>
                                <code className="text-center relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm xl:text-lg font-semibold text-white bg-purple-400/20 shadow-2xl shadow-purple-200">Coingecko</code>
                                <code className="text-center relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm xl:text-lg font-semibold text-white bg-purple-400/20 shadow-2xl shadow-purple-200">Reddit</code>
                                <code className="text-center relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm xl:text-lg font-semibold text-white bg-purple-400/20 shadow-2xl shadow-purple-200">Product Hunt</code>
                                <code className="text-center relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm xl:text-lg font-semibold text-white bg-purple-400/20 shadow-2xl shadow-purple-200">Wall St Bets</code>
                                <code className="text-center relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm xl:text-lg font-semibold text-white bg-purple-400/20 shadow-2xl shadow-purple-200">SEC Edgar</code>
                                <code className="text-center relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm xl:text-lg font-semibold text-white bg-purple-400/20 shadow-2xl shadow-purple-200">US Census Data</code>
                                <code className="text-center relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm xl:text-lg font-semibold text-white bg-purple-400/20 shadow-2xl shadow-purple-200">...</code>
                            </div>
                        </div>
                        <div className='flex place-items-center gap-2'><CircleCheckBig className='w-4 h-4 text-green-400'/><p className="leading-7"> Upload your own data</p></div>                        
                        <div className='flex place-items-center gap-2'><CircleCheckBig className='w-4 h-4 text-green-400'/><p className="leading-7"> Aggregations, Stats, Functions and Operations.</p></div>
                        <div className='flex place-items-center gap-2'><CircleCheckBig className='w-4 h-4 text-green-400'/><p className="leading-7"> Create an entire website using your spreadsheet.</p></div>
                        <div className='flex place-items-center gap-2'><CircleCheckBig className='w-4 h-4 text-green-400'/><p className="leading-7"> Share to your socials. Or build and monitize your audience from right here</p></div>
                        <div className='flex place-items-center gap-2'><CircleCheckBig className='w-4 h-4 text-green-400'/><p className="leading-7"> Pro members will be eligible for monitization</p></div>
                    </div>
                </div>
                <div className='flex gap-2 place-content-center py-4'>
                    <Link href="#charts">
                        <div className='shadow-2xl shadow-lychee_red bg-black rounded-md text-slate-200 p-2 text-[10px]'>Tell Me More</div>
                    </Link>
                    <Link href="#getIt">
                        <div className='shadow-2xl shadow-lychee_red bg-green-400 rounded-md text-slate-800 p-2 text-[10px]'>I want it.</div>
                    </Link>
                </div>
                <div className="text-lychee_black font-black leading-none tracking-tighter pt-4 pb-6 text-8xl text-center" style={{ textShadow: '10px 10px 80px rgba(169, 29, 58, 1)'}}>
                    Lychee<span className="text-lychee_red pl-1 sm:pl-4" >.</span>
                </div>
                <div className="z-10 sm:p-20" id="charts">
                    <div className='pb-10'>
                        <div className="relative max-w-4xl mx-auto rounded-xl">
                            <div className="w-full h-11 rounded-t-lg bg-gray-600/10 flex justify-start items-center space-x-1.5 px-3">
                                <span className="w-3 h-3 rounded-full bg-red-400"></span>
                                <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
                                <span className="w-3 h-3 rounded-full bg-green-400"></span>
                            </div>
                            <div className=" bg-black border-t-0 w-full"><div className='px-3'><BackgroundVideo autoPlay loop muted playsInline src={presenting_charts} /></div>
                            </div>                                
                            <BorderBeam />                                
                        </div>
                        <div className='py-10'>
                            <Link rel="noopener noreferrer" target="_blank" href={"https://misterrpink.beehiiv.com/p/how-to-create-crarts-on-lychee"}>
                                <h1 className="text-xl sm:text-4xl text-lychee_green font-extrabold tracking-tight  place-items-center text-center  hover:underline cursor-pointer ">
                                    <span><span className="text-purple-400">Instant</span> Graphs <br/> <span className="text-purple-400">Zero</span> Hassle </span>
                                </h1>
                                <div className="text-xs text-slate-400 flex place-items-center place-content-center gap-2 py-2">How it works <MoveRight /></div> 
                            </Link>
                            <div className='flex gap-2 place-content-center py-4'>
                                <Link href="#presenting_ai">
                                    <div className='shadow-2xl shadow-lychee_red bg-black rounded-md text-slate-200 p-2 text-[10px]'>More.</div>
                                </Link>
                                <Link href="#getIt">
                                    <div className='shadow-2xl shadow-lychee_red bg-green-400 rounded-md text-slate-800 p-2 text-[10px]'>I want it.</div>
                                </Link>
                            </div>
                        </div>
                    </div>                    

                    <div className='grid sm:grid-cols-2 place-items-center py-20' id="presenting_ai">
                        <div className="relative mx-auto h-[520px] w-[350px] border-4 border-black rounded-2xl shadow-custom-shadow">
                            <div className='flex justify-center'>
                                <span className="border border-black bg-black w-16 h-4 mt-2 rounded-full"></span>
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
                        <div>
                            <Link rel="noopener noreferrer" target="_blank" href={"https://misterrpink.beehiiv.com/p/how-to-analyze-data-with-lychee-ai"}>
                                <h1 className="scroll-m-20 text-xl sm:text-4xl text-lychee_green font-extrabold tracking-tight place-items-center hover:underline cursor-pointer text-center"  href={"/dashboard"}>
                                    <span>Analyze <span className="text-purple-400">Anything.</span> <br/>Let our <span className="text-purple-400">AI</span> do the heavy lifting for you.</span>
                                </h1>
                                <div className="text-xs text-slate-400 flex place-items-center place-content-center gap-2 py-2">
                                    How it works <MoveRight />
                                </div>
                            </Link>
                            <div className='flex gap-2 place-content-center py-4'>
                                <Link href="#presenting_integrations">
                                    <div className='shadow-2xl shadow-lychee_red bg-black rounded-md text-slate-200 p-2 text-[10px]'>More.</div>
                                </Link>
                                <Link href="#getIt">
                                    <div className='shadow-2xl shadow-lychee_red bg-green-400 rounded-md text-slate-800 p-2 text-[10px]'>I want it.</div>
                                </Link>
                            </div>
                        </div>
                    </div>                                  
                    <div className='text-center py-10'>
                        <BlurIn
                            word="BRING YOUR DATA TO LIFE"
                            className=" text-2xl sm:text-8xl text-lychee_green font-black py-10 pb-5"
                        />
                    </div>
                    
                    <div className='sm:col-span-2 lg:col-span-2' id="presenting_integrations">
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
                    <div className='flex gap-2 place-content-center pt-10'>
                        <Link href="#the_rest">
                            <div className='shadow-2xl shadow-lychee_red bg-black rounded-md text-slate-200 p-2 text-[10px]'>More.</div>
                        </Link>
                        <Link href="#getIt">
                            <div className='shadow-2xl shadow-lychee_red bg-green-400 rounded-md text-slate-800 p-2 text-[10px]'>I want it.</div>
                        </Link>
                    </div>
                </div>
                <div className="w-full flex place-content-center pb-20">
                    <div className="container mx-auto px-4 md:px-8 ">
                        <h3 className="py-4 text-center text-[10px] font-semibold text-slate-400">
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
                <div className='p-20' id="the_rest">
                    <LycheeFeatureGrid />         
                </div>
                <div className='' id='getIt'>
                    <div><h1 className="scroll-m-20 text-6xl text-white font-extrabold tracking-tight lg:text-8xl text-center">
                        Two Options
                    </h1></div>
                </div>
                <div className='-mt-8 z-20 text-center py-32 px-10 bg-black/80 rounded-tl-3xl rounded-tr-md rounded-br-3xl rounded-bl-md text-lychee_black grid grid-cols-2 gap-10' >
                    <div className='bg-lychee_black/90 rounded-lg text-white py-10 px-10 shadow-lychee_black shadow-2xl'>
                        <h1 className="text-center text-2xl font-extrabold tracking-tight py-1">Join the Waitlist</h1>
                        <div className="text-lg font-semibold py-10">
                            Get Instant access to  <code className="mx-2 relative rounded bg-lychee_green px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold text-black">
                            Some </code> Experimental Features
                            
                        </div>
                        <div className="text-lg font-semibold pt-4">
                            Vote/ Request New Features to
                        </div>
                        <p className="text-xs text-slate-400 pb-4">
                            make Lychee perfect platform for you 
                        </p>
                        <div className="text-lg font-semibold">
                            Get <code className="mx-2 relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold text-black">
                            10% off
                            </code>
                            12 months
                        </div>
                        <p className="text-xs text-slate-400 pt-2">
                            Price On V2.0.1 Launch will be approximately $69/month
                        </p>
                        <div className='pt-20'>
                        <Link href={'/login'}><div className='bg-white w-32 mx-auto text-black py-2 rounded-md'>Free</div></Link>
                        </div>
                    </div>
                    <div className='p-4 bg-purple-400 rounded-md'>
                    <div className='p-8 bg-gray-100/10 bg-blend-lighten rounded-md shadow-2xl'>
                        <h1 className="text-center text-2xl font-extrabold tracking-tight py-1">Count Down to v2.0.1 Promo</h1>
                            <code className="mx-2 relative rounded bg-lychee_green px-[0.3rem] py-[0.2rem] font-mono text-xl font-semibold text-black">
                                LifeTime Access $29.99</code>
                            <div className="text-lg font-semibold pt-10">
                                Get Instant access to  <code className="mx-2 relative rounded bg-lychee_green px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold text-black">
                                All </code> Experimental Features                                
                            </div>
                            <p className="text-xs text-slate-100 pb-4">
                                Access all bonus updates rolling in the future
                            </p>
                            <div className="text-lg font-semibold pt-4">
                                Not a single penny more than what you pay today
                            </div>
                            <div className="text-lg font-semibold pt-1">
                                Vote/ Request New Features to
                            </div>
                            <p className="text-xs text-slate-100 pb-4">
                                make Lychee perfect platform for you 
                            </p>
                            <div className='pt-16'>
                            <Link href="https://buy.stripe.com/aEUaGYfkW9L04wgbJ3"><div className='bg-green-400 w-32 mx-auto text-black py-2 rounded-md'>$29.99</div></Link>
                            <h1 className='text-sm pt-2'>(3 seats remaining) <br/>One Time Payment. Life Time Access</h1>
                        </div>
                    </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
