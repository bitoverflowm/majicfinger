"use client";

import { useRef, useEffect, useState } from "react"

import Link from "next/link";
import Image from "next/image";

import { ChartShow } from '@/app/charts/showcase/chart1';
import { Badge } from '../ui/badge';

import { BorderBeam } from "../magicui/border-beam";

import { MoveRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedList } from "@/components/magicui/animated-list";
import { FaCircle } from 'react-icons/fa';
import Marquee from "@/components/magicui/marquee";
import LycheeFeatureGrid from '../easyLychee/usage/lychee_feature_grid';
import { Card, CardTitle } from '../ui/card';
import { PiCircleFill } from "react-icons/pi";

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
                    Spreadsheets were invented in the 20th century, it's time for a change.
                </h3>
                <div className='py-10' id="about">
                    <p className="text-center text-xl text-slate-300 md:w-1/2 mx-auto">
                        Let's face it. You're doing <span className='font-black'> too many jobs.</span> And its <span className='font-black'> burning us out.</span> 
                    </p>
                    <p className="pt-10 text-center text-xl text-slate-300 md:w-1/2 mx-auto">                        
                        Find data, download it, clean it, format it, analyze, visualize, present. Repeat. Almost none of this is reliably covered by your current spreadshet tool. So, we built Lychee. 
                    </p>
                    <p className="pt-10 text-center text-xl text-slate-300 md:w-1/2 mx-auto">
                        The all-in-one data platform that <span className='font-black'>helps you move faster and make more progress</span> than you ever imagined
                    </p>
                    <p className="pt-10 text-center text-xl text-slate-300 md:w-1/2 mx-auto">
                        Lychee encompasses your entire workflow, from getting data, to analyzing, presenting and sharing your work. Not EVERYTHING under the sun. Just the stuff that MATTERS to get things finished.
                    </p> 
                </div>
                <div className='flex gap-2 place-content-center py-4'>
                    <Link href="#about">
                        <div className='shadow-2xl bg-black hover:bg-white hover:text-black rounded-md text-slate-200 px-4 py-3 text-xs'> Tell Me More </div>
                    </Link>
                    <Link href="#getIt">
                        <div className='shadow-2xl bg-green-500 text-black hover:bg-white hover:text-black rounded-md px-4 py-3 text-xs'>I want it.</div>
                    </Link>
                </div>
                <div className='py-10'>
                    <Link rel="noopener noreferrer" target="_blank" href={"https://misterrpink.beehiiv.com/p/how-to-create-crarts-on-lychee"}>
                        <h1 className="text-xl sm:text-4xl text-lychee_green font-extrabold tracking-tight  place-items-center text-center  hover:underline cursor-pointer ">
                            <span><span className="text-purple-400">Instant</span> Graphs <br/> <span className="text-purple-400">Zero</span> Hassle </span>
                        </h1>
                        <div className="text-xs text-slate-400 flex place-items-center place-content-center gap-2 py-2">How-tos <MoveRight /></div> 
                    </Link>
                    <div className="relative mx-auto rounded-xl z-30">
                        <div className='flex place-items-center place-content-center py-4'> 
                            <Badge variant="outline" className="border-white text-white">Give it a try!</Badge> 
                        </div>
                        <div className='flex place-items-center px-24'>
                            <ChartShow demo={true}/>
                        </div>
                    </div>
                    <div className='flex gap-2 place-content-center py-4'>
                        <Link href="#presenting_ai">
                            <div className='shadow-2xl bg-black hover:bg-white hover:text-black rounded-md text-slate-200 px-4 py-3 text-xs'>More.</div>
                        </Link>
                        <Link href="#getIt">
                            <div className='shadow-2xl shadow-lychee_red bg-green-400 rounded-md text-slate-800 p-2 text-[10px]'>I want it.</div>
                        </Link>
                    </div>
                </div>
                <div className='flex gap-2 place-content-center py-4 hidden'>
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
                <div className="z-10 sm:p-20" id="charts">                
                    <div className='grid xl:grid-cols-2 place-items-center place-content-center py-44' id="presenting_ai">
                        <div>
                            <div className='pb-8'>
                                <h1 className="scroll-m-20 text-xl sm:text-4xl text-lychee_green font-extrabold tracking-tight place-items-center text-center"  href={"/dashboard"}>
                                    <span>Analyze <span className="text-purple-400">Anything.</span> <br/>Let our <span className="text-purple-400">AI</span> do the heavy lifting for you.</span>
                                </h1>
                            </div>
                            <iframe
                                width="480"
                                height="315"
                                src={`https://www.youtube.com/embed/Mhgk122WuFg?si=hRH4UxT8UbPv55MC`}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                title="Embedded YouTube Video"
                            ></iframe>
                            <div className='flex gap-2 place-content-center py-10'>
                                <Link href="#presenting_integrations">
                                    <div className='shadow-2xl shadow-lychee_red bg-black rounded-md text-slate-200 p-2 text-[10px]'>More.</div>
                                </Link>
                                <Link href="#getIt">
                                    <div className='shadow-2xl shadow-lychee_red bg-green-400 rounded-md text-slate-800 p-2 text-[10px]'>I want it.</div>
                                </Link>
                            </div>
                        </div>
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
                    </div>                    
                    <div className='grid xl:grid-cols-2 lg:gap-10 place-items-center py-20' id="presenting_integrations">                    
                        <div>
                            <h1 className="py-10 scroll-m-20 text-xl sm:text-2xl text-lychee_green font-extrabold tracking-tight lg:text-2xl place-items-center text-center">
                                <span>Connect<span className="text-purple-400"> Directly</span> to ALL <br/>The Data Sources  of Your  <span className="text-purple-400">Dreams</span> </span>
                            </h1>                            
                            <iframe
                            width="480"
                            height="315"
                            src={`https://www.youtube.com/embed/JCiZThTjsnw?si=qPMcz8ZKKRsqL2y4`}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title="Embedded YouTube Video"
                            ></iframe>
                            
                            <div className="pt-4 text-center text-lychee_white text-sm sm:text-md">Not A Single Line of Code Required on Your End</div>
                        </div>
                        <div className="relative mx-auto mt-8 rounded-xl">
                            <div className="w-full h-11 rounded-t-lg bg-gray-600/10 flex justify-start items-center space-x-1.5 px-3">
                                <span className="w-3 h-3 rounded-full bg-red-400"></span>
                                <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
                                <span className="w-3 h-3 rounded-full bg-green-400"></span>
                            </div>
                            <div className=" bg-black border-t-0 w-full"><div className=''><Image className="rounded-b-xl" src={'/integrationsPresent.png'} height={500} width={400} /></div>
                            </div>                                
                            <BorderBeam />                                
                        </div>        
                    </div>
                    <div className='flex gap-2 place-content-center pt-10'>
                        <Link href="#easyLychee">
                            <div className='shadow-2xl shadow-lychee_red bg-black rounded-md text-slate-200 p-2 text-[10px]'>More.</div>
                        </Link>
                        <Link href="#getIt">
                            <div className='shadow-2xl shadow-lychee_red bg-green-400 rounded-md text-slate-800 p-2 text-[10px]'>I want it.</div>
                        </Link>
                    </div>
                    <div className='pt-56 xl:px-56 flex flex-col place-items-center gap-10' id="easyLychee">
                        <div>
                            <h1 className="scroll-m-20 text-xl sm:text-4xl text-lychee_green font-extrabold tracking-tight place-items-center text-center"  href={"/dashboard"}>
                                <span>Build an entire <span className="text-purple-400">Website</span> in 0.37 seconds from Google Sheets, Excel or .csv</span>
                            </h1>
                        </div>
                        <iframe
                            className="w-full h-96"
                            src={`https://www.youtube.com/embed/2nyOJJb9pwE?si=mGtlo0SMHzI6Aanh`}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title="Embedded YouTube Video"
                            ></iframe>
                        <div className='flex gap-2 place-content-center py-4'>
                            <Link href="#the_rest">
                                <div className='shadow-2xl shadow-lychee_red bg-black rounded-md text-slate-200 p-2 text-[10px]'>More.</div>
                            </Link>
                            <Link href="#getIt">
                                <div className='shadow-2xl shadow-lychee_red bg-green-400 rounded-md text-slate-800 p-2 text-[10px]'>I want it.</div>
                            </Link>
                        </div>
                    </div>
                </div>
                
                <div className='pt-20' id="the_rest">
                    <LycheeFeatureGrid />   
                </div>
                <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-lychee_black py-20 md:shadow-xl">
                    <h3 className="py-4 text-center text-[10px] font-semibold text-slate-400">
                        Don't just take our word for it. See what our awesome users are saying:
                    </h3>
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
                <div className='pt-10 lg:w-2/3 mx-auto shadow-2xl' id='getIt'>
                    <div className='text-white bg-black p-10'>
                        <h3 className="scroll-m-20 text-xl font-semibold tracking-tight pb-6">
                            Hate Subscriptions?
                        </h3>
                        <p className="text-sm text-slate-100 pb-4">
                            Me too!
                        </p>
                        <p className="text-sm text-slate-100 pb-4">
                            The average household spends approximately <span className='text-purple-400 font-bold'>$196,560 on subscriptions</span> over their lifetime.* So I decided to try this crazy lifetime offer. Pay once and get full access for life! <span className='font-bold text-black bg-purple-400 px-2'> 99% cheaper than subscriptions. </span>
                        </p>
                        <p className="text-sm text-slate-100 pb-4">
                            This also allows me to focus on building the best features fast. And, of course, you get access to all future features.
                        </p>
                        <p className="text-sm text-slate-100 pb-4">
                            If you are interested, but don't want to pay now, that's cool too.
                        </p>
                        <p className="text-sm text-slate-100 pb-4">
                            You can have access to basic features for free... for now. 
                        </p>
                        <p className='text-sm text-slate-100 pb-4'>
                            Subscription pricess will go into effect <span className='font-black text-red-500'>VERY SOON</span>. If you wait until then, you will pay <span className='font-black text-red-500'>$69/month</span> + add-ons + rate charges.
                        </p>
                    </div>
                    <div className='grid md:grid-cols-2 py-10 px-8 place-content-center'>
                        <div className='text-white text-center py-10'>
                            <h1 className="text-center scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-4xl">Free </h1>
                            <div className='text-left py-4 pl-6 text-xs'>
                                <p className="text-slate-200"><code className="text-black relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-xs font-semibold mr-1">2 day Trial</code> then $19.99/month </p>
                            </div>
                            <div className='text-left md:py-10 pl-6 text-xs text-red-500'>
                                <p className="text-slate-100 py-1"><code className="text-black relative rounded bg-lychee_green px-[0.3rem] py-[0.2rem] font-mono text-xs font-semibold mr-1">Instant</code> access to all stable and some experimental features</p>
                                <p className="text-slate-100 py-1"><code className="text-black relative rounded bg-lychee_green px-[0.3rem] py-[0.2rem] font-mono text-xs font-semibold mr-1">Instant</code> access Easy Charts, Scraper, AI, website builder, Integrations (twitter, instagram, coingecko, etc) </p>
                            </div>
                            <Link href={'https://buy.stripe.com/3csbL2c8K2iye6QcNg'}><div className='bg-white w-20 mx-auto text-black text-xs py-2 rounded-md hover:bg-black hover:text-white'>Go</div></Link>
                            <small className="text-center text-white text-xs font-medium leading-none">Managed By Stripe</small>                        
                        </div>
                        <div className='text-black bg-white text-center py-10'>
                            <h1 className="text-center scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-4xl">$39.99</h1>
                            <small className="line-through text-black text-center text-xs font-medium leading-none">normally $199.99 </small> 
                            <div className='text-left py-4 px-6 text-xs'>
                                <p className="text-slate-800 py-1"><code className="text-black relative rounded bg-lychee_green px-[0.3rem] py-[0.2rem] font-mono text-xs font-semibold mr-1">Everything</code> in free tier</p>
                                <p className="text-slate-800 py-1"><code className="text-black relative rounded bg-lychee_green px-[0.3rem] py-[0.2rem] font-mono text-xs font-semibold mr-1">Instant</code> access to all experimental features</p>
                                <p className="text-slate-800 py-1">Access <code className="text-black relative rounded bg-lychee_green px-[0.3rem] py-[0.2rem] font-mono text-xs font-semibold mr-1">All</code> future features</p>
                                <p className="text-slate-800 py-1"><code className="text-black relative rounded bg-lychee_green px-[0.3rem] py-[0.2rem] font-mono text-xs font-semibold mr-1">Unlimited</code> website launches forever</p>
                                <p className="text-slate-800 py-1"><code className="text-black relative rounded bg-lychee_green px-[0.3rem] py-[0.2rem] font-mono text-xs font-semibold mr-1">Unlimited</code> custom domains</p>
                                <p className="text-slate-800 py-1"><code className="text-black relative rounded bg-lychee_green px-[0.3rem] py-[0.2rem] font-mono text-xs font-semibold mr-1">Almost Unlimited</code> API and AI usage limits</p>
                                <p className="text-slate-800 py-1"><code className="text-black relative rounded bg-lychee_green px-[0.3rem] py-[0.2rem] font-mono text-xs font-semibold mr-1">No</code> ad-on fees ever</p>
                            </div>
                            <Link href="https://buy.stripe.com/bIY7uM4Gi7CS7IsaF4"><div className='text-xs bg-green-400 w-24 mx-auto text-black font-black py-2 rounded-md'>$39.99</div></Link>
                            <small className="text-center text-black text-xs font-medium leading-none">One time payment</small>
                            <div className='flex gap-2 place-content-center place-items-center text-xs'><PiCircleFill className='animate-ping text-green-400 h-3 w-3'/><p className="text-black text-xs">11 seats left at this price</p></div>           
                        </div>
                    </div>
                    <div className='px-20'>
                            <p className="py-1 text-sm text-muted-foreground">*Being a creator of a data platform I gotta cite my sources.</p>
                            <p className="py-1 text-sm text-muted-foreground">West Monroe Partners Study (2021): This study highlighted that the average U.S. household spends about $273 per month on subscriptions, including streaming services, subscription boxes, software subscriptions, and other recurring payments.</p>
                            <p className="py-1 text-sm text-muted-foreground">Typical Household Lifespan: The duration of 60 years is an estimated average based on a household's active years from young adulthood through retirement.</p>
                            <p className="py-1 text-sm text-muted-foreground">60 X 12 X $273 = $196,560</p>
                        </div>                
                </div>
            </div>
        </section>
    );
}
