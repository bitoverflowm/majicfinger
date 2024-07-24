"use client"

import Link from 'next/link'
import { Chart1, ChartShow } from './showcase/chart1'
import { LineChart, MagnetIcon, Recycle } from 'lucide-react'
import { CheckCircle, Circle, Gift, Video } from 'react-feather'
import { ChatBubbleIcon, MagicWandIcon } from '@radix-ui/react-icons'
import BlurFade from './effects/blurFade'
import { cn } from "@/lib/utils";
import { Badge } from '@/components/ui/badge'

import Marquee from '@/components/magicui/marquee'
import Image from 'next/image'
import LycheeFeatureGrid from '@/components/easyLychee/usage/lychee_feature_grid'
import Head from 'next/head'
import { BiDownArrow } from 'react-icons/bi'
import { PiCircleFill } from 'react-icons/pi'


export const Highlight = ({
    children,
    className,
}) => {
    return (
        <span
        className={cn(
            "p-1 py-0.5 font-bold bg-white text-cyan-600",
            className,
        )}
        >
        {children}
        </span>
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



const companies = [
    "jpm",
    "goldman",
    "meta",
    "google",
    "apple",
    "mit",
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

const EasyCharts = () => {
    const images = Array.from({ length: 4 }, (_, i) => {
        return `/chart${i}.png`;
    });


    return (
        <>
            <header className='bg-black/10 px-2 py-1 sm:p-6 sm:h-20 flex w-full fixed top-0 gap-4 sm:gap-10 place-items-center'>
                  <div className='flex w-full sm:w-56 text-xs place-items-center gap-2'><Image src="/easyChartsLogo.png" width="40" height="40" ></Image><Link href={"www.lych3e.com"}>Lychee</Link> / Easy Charts</div>
                  <div className='text-right text-xs ml-auto'><Link href="#testimonials">Testimonials</Link></div>
                  <div className='text-right text-xs'><Link href="#demo">Demo</Link></div>
                  <Link href="#getIt"><div className='text-center text-xs bg-[#01A823] px-2 py-3 rounded-md w-32 lg:w-28 cursor-pointer'>Get It</div></Link>
              </header>
              <main className=''>
                  <div className='px-4 sm:px-20 py-20 sm:pt-48 md:w-5/6 mx-auto text-center'>
                      <div className='flex place-content-center'>
                        <div className='text-[10px] font-thin font-mono rounded-xl border-white border px-3 py-1'>We'll save you from all the complex yabba-dabba-doos out there</div>
                      </div>                      
                      <h1 className="font-serif scroll-m-20 text-4xl sm:text-6xl font-extrabold tracking-tight py-6">
                          Instant Charts <br/> Zero Hassle
                      </h1>
                      <p className="font-serif text-sky-200 text-lg mt-4 xl:w-1/3 mx-auto">Create animated, sharable, data visualizations from all your existing spreadsheet tools -- no coding needed.</p>
                      <div className='w-32 font-[400] mx-auto rounded-md mt-4 py-1 text-sm cursor-pointer bg-[#01A823] hover:bg-[#01A823]/80'><Link href="#demo">Try it </Link></div>
                      <div className='text-[10px] pt-2'>*no card or registration</div>
                  </div>
                  <div className='px-2 pb-20'>
                      <div className='flex place-items-center place-content-center py-4 text-md gap-2 cursor-pointer'><Link href="#demo">Interactive demo for you to play with below </Link><BiDownArrow className='animate-bounce'/></div>
                      <div className='flex place-items-center px-8 xl:px-24' id="demo">
                        <ChartShow demo={true}/>
                      </div>
                  </div>
                  <div className="py-10">
                      <div className="container mx-auto px-4">
                          <h3 className="py-4 text-center text-[10px] font-semibold text-slate-400">
                              ACTIVELY BETA TESTED BY FRIENDS AT
                          </h3>
                          <div className="sm:mt-6">
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
                  <div className='grid grid-cols-2 gap-10 py-10 px-8 lg:px-36 xl:px-56'>
                    <div>
                      <h1 className="text-white scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">Maximal Data Protection</h1>
                      <p className="font-serif text-sky-200 text-lg mt-4">
                        You can actually make a whole chart without saving any data into our db! Which means we never touch your data. However ofcourse if you want to save your work, we will need to save your work. Nevertheless, we peomise to never backdoor data broker, use, sell, trade your data. 
                      </p>
                    </div>
                    <div>
                      <h1 className="text-white scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">"Blink Of An Eye" Level Instant</h1>
                      <p className="font-serif text-sky-200 text-lg mt-4">
                        See it for yourself in the demo above! We "graphify" your spreadsheets before you open your eyes so that you never waste a single second waiting again.
                      </p>
                    </div>
                    <div>
                      <h1 className="text-white scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">Engage your audience</h1>
                      <p className="font-serif text-sky-200 text-lg mt-4">
                        Professional-quality data graphics and animated stories that bring your data to life.
                      </p>
                    </div>
                    <div>
                      <h1 className="text-white scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">No Mumbo Jumbo.</h1>
                      <p className="font-serif text-sky-200 text-lg mt-4">
                        Sit back and enjoy a user-friendly platform that requires no coding skills or hi-fi language.
                      </p>
                    </div>
                    <div>
                      <h1 className="text-white scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">Cost-Effective.</h1>
                      <p className="font-serif text-sky-200 text-lg mt-4">
                        No BS features you don't even need.
                        When we built this - we had you in mind.
                      </p>
                    </div>
                    <div>
                      <h1 className="text-white scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">Variety Of Chart Options.</h1>
                      <p className="font-serif text-sky-200 text-lg mt-4">
                        Choose from a variety of chart types, including pie, histogram, line, bar charts. Your data is your style.
                      </p>
                    </div>
                    <div>
                      <h1 className="text-white scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">Your Favorite Sources</h1>
                      <p className="font-serif text-sky-200 text-lg mt-4">
                        Excel, Notion, Google Sheets, any .csv or .xlsx file will do. json coming soon. We even went as far as to allow you to source data directly from: Twitter, CoinGecko, Instagram, Meta, Reddit, you name it, we got it.
                      </p>
                    </div>
                    <div>
                      <h1 className="text-white scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">Share, publish, present, embed, download</h1>
                      <p className="font-serif text-sky-200 text-lg mt-4">
                        Seamlessly share your presentation with your team and audience. Publish as a standalone website, collate into a collectino of pages, publish as a grid, download as jpg, share directly to social media.
                      </p>
                    </div>
                    <div>
                      <h1 className="text-white scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">World's most beaufitul charts</h1>
                      <p className="font-serif text-sky-200 text-lg mt-4">
                        Combined with the world's most beautiful color palate makes a magical combo.
                      </p>
                    </div>
                  </div>                      
                  <div className='px-4 md:px-20 py-10'>
                      <h1 className="text-white scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">Look how easy it is</h1>
                      <div className="md:px-4 py-4 flex flex-wrap justify-center gap-4">
                          <iframe
                              className="w-full"
                              height="450"
                              src={`https://www.youtube.com/embed/5qrVmJaE4_o?si=4ke8h_wnUD7sIiuZ`}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              title="Embedded YouTube Video"
                          ></iframe>
                      </div>              
                  </div>
                  <div className='md:px-20 lg:px-96 w-full'>
                      <h1 className="px-4 md:px-0 text-white scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">3 Simple Steps</h1>
                      <p className="px-4 md:px-0 font-serif text-sky-200 text-lg mt-4">
                        Step 1: Easily import your data. However you collect your data, Easy Charts can chart it. Build charts from spreadsheet, databases, type it directly or connect to a live data source, like Twitter, Instagram, Youtube, CoinGecko, Yahoo Finance, etc.
                      </p>
                      <div className="md:px-10 ">
                          <Image src={'/uploadMockup.png'} width={800} height={700}/>
                      </div>
                      <p className="px-4 md:px-0 font-serif text-sky-200 text-lg mt-8">
                        Step2: Customize and controle absolutely every aspect of your chart.
                      </p>
                      <div className="md:px-10 py-10">
                          <Image src={'/chartGenerated.png'} width={800} height={800}/>
                      </div>
                      <p className="px-4 md:px-0 font-serif text-sky-200 text-lg mt-4">
                        Step 3: Share your insights however you like.
                      </p>
                      <div className="md:px-10 py-10">
                          <Image src={'/customize.png'} width={800} height={800}/>
                      </div>
                  </div>                  
                  <div className='px-20 py-36 lg:px-32 w-full' id="testimonials">
                      <h1 className="text-white scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">What Our Legendary Users Have To Say:</h1>
                      <p className="font-serif text-sky-200 text-lg mt-4 pb-10">People really like is - <br/> All reviews are clickable.                        
                      </p>
                      <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#0064E6] py-20">
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
                          <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-[#0064E6] from-[#0064E6]"></div>
                          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-[#0064E6] from-[#0064E6]"></div>
                      </div>
                  </div>
                  <div className='py-56 px-2 lg:px-10 xl:px-42 w-full text-center grid sm:grid-cols-3 gap-2 place-content-center' id="getIt">
                    <div className='border border-1 border-white rounded-lg py-10 px-6'>
                      <h1 className="text-white scroll-m-20 text-xl font-extrabold tracking-tight lg:text-5xl">Trial</h1>
                      <p className="font-serif text-sky-200 text-lg mt-4">48 hrs free</p>
                      <p className="font-serif text-sky-200 text-sm">then $6.99/month</p>
                      <div className='text-left py-4'>
                        <div className='flex gap-2 place-items-center'><CheckCircle className='text-green-400 h-3 w-3'/><p className="text-sky-200 text-sm">Instant Graphs</p></div>
                        <div className='flex gap-2 place-items-center'><CheckCircle className='text-green-400 h-3 w-3'/><p className="text-sky-200 text-sm">Wide Variety of Graphs</p></div>
                        <div className='flex gap-2 place-items-center'><CheckCircle className='text-green-400 h-3 w-3'/><p className="text-sky-200 text-sm">Simplified User Interface</p></div>
                        <div className='flex gap-2 place-items-center'><CheckCircle className='text-green-400 h-3 w-3'/><p className="text-sky-200 text-sm">Unlimited Exports</p></div>
                      </div>                      
                      <Link href="https://buy.stripe.com/4gw5mE4Gie1g5Ak14v"> <div className='mx-auto my-4 w-32 text-[#0064E6] bg-white hover:bg-white/80 py-2 rounded-lg text-center font-bold'>Try</div> </Link>
                    </div>
                    <div className='border border-1 border-white rounded-lg py-10 px-6'>
                      <h1 className="text-white scroll-m-20 text-xl font-extrabold tracking-tight lg:text-5xl">Easy Charts LifeTime</h1>
                      <p className="font-serif text-sky-200 text-lg mt-4">$13.99/once</p>
                      <p className="font-serif text-sky-200 text-sm">Limited Time Promo <span className='line-through'>69.99</span></p>
                      <div className='text-left py-4'>
                        <div className='flex gap-2 place-items-center'><CheckCircle className='text-green-400 h-3 w-3'/><p className="text-sky-200 text-sm"> Includes everything in Trial</p></div>
                        <div className='flex gap-2 place-items-center'><CheckCircle className='text-green-400 h-3 w-3'/><p className="text-sky-200 text-sm">No paying for monthly subscriptions.</p></div>
                        <div className='flex gap-2 place-items-center'><CheckCircle className='text-green-400 h-3 w-3'/><p className="text-sky-200 text-sm">All Future Updates</p></div>
                        <div className='flex gap-2 place-items-center'><PiCircleFill className='animate-ping text-green-400 h-3 w-3'/><p className="text-sky-200 text-sm">11 seats left at this price</p></div>
                      </div>                      
                      <Link href="https://buy.stripe.com/3cscP62ya7CS1k414w"> <div className='mx-auto my-4 w-32 text-[#0064E6] bg-white hover:bg-white/80 py-2 rounded-lg text-center font-bold'>Checkout</div> </Link>
                    </div>
                    <div className='border border-1 border-white rounded-lg py-10 px-6'>
                      <Badge className='bg-purple-400'>Most Popular</Badge>
                      <h1 className="text-white scroll-m-20 text-xl font-extrabold tracking-tight lg:text-5xl">Lychee LifeTime</h1>
                      <p className="font-serif text-sky-200 text-lg mt-4">$69.99/once</p>
                      <p className="font-serif text-sky-200 text-sm">Limited Time Promo <span className='line-through pl'>$199.99</span></p>
                      <div className='text-left py-4'>
                        <div className='flex gap-2 place-items-center'><CheckCircle className='text-green-400 h-3 w-3'/><p className="text-sky-200 text-sm"> Includes everything in Easy Charts LifeTime</p></div>
                        <div className='flex gap-2 place-items-center'><CheckCircle className='text-green-400 h-3 w-3'/><p className="text-sky-200 text-sm">Includes all current and future Lychee features.</p></div>
                        <Link href="#learnLychee"><p className="underline text-sky-200 text-sm py-4">Click to Learn about lychee</p></Link>
                        <div className='flex gap-2 place-items-center'><CheckCircle className='text-green-400 h-3 w-3'/><p className="text-sky-200 text-sm">Lychee Scrape any website</p></div>
                        <div className='flex gap-2 place-items-center'><CheckCircle className='text-green-400 h-3 w-3'/><p className="text-sky-200 text-sm">Connect to Twitter, Instagran, Yelp, etc</p></div>
                        <div className='flex gap-2 place-items-center'><CheckCircle className='text-green-400 h-3 w-3'/><p className="text-sky-200 text-sm">Easy Lychee: convert spreadsheet to website in 0.46 secs</p></div>
                        <div className='flex gap-2 place-items-center'><PiCircleFill className='animate-ping text-green-400 h-3 w-3'/><p className="text-sky-200 text-sm">77 seats left at this price</p></div>
                      </div>                      
                      <Link href="https://buy.stripe.com/6oE16o3Ce4qG2o828B"> <div className='mx-auto my-4 w-32 text-[#0064E6] bg-white hover:bg-white/80 py-2 rounded-lg text-center font-bold'>Checkout</div> </Link>
                    </div>
                  </div>
                  <div className='py-10 px-4 md:px-20 lg:px-64 2xl:px-96' id="learnLychee">
                      <h1 className="text-white scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">Let's talk about Lychee</h1>
                      <p className="font-serif text-sky-200 text-lg mt-4 pb-10">
                          Lychee is the Easy Chart's parent (also created by @misterrpink). <br/>
                          On a mission to make the whole data pipeline as seamless as possible. <br />
                          When you get lifetime access to Easy Charts, you also get access to the full suite of tools that is Lychee:
                      </p>
                      <LycheeFeatureGrid/>                     
                  </div>
              </main>
            </>
    )
}

export default EasyCharts