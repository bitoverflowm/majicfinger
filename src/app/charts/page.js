"use client"

import Script from 'next/script'

import Link from 'next/link'
import { GoogleAnalytics } from '@next/third-parties/google'
import { Chart1, ChartShow } from './showcase/chart1'
import { LineChart, MagnetIcon, Recycle } from 'lucide-react'
import { Gift, Video } from 'react-feather'
import { ChatBubbleIcon, MagicWandIcon } from '@radix-ui/react-icons'
import BlurFade from './effects/blurFade'
import { cn } from "@/lib/utils";
import { Badge } from '@/components/ui/badge'

import Marquee from '@/components/magicui/marquee'
import Image from 'next/image'
import LycheeFeatureGrid from '@/components/easyLychee/usage/lychee_feature_grid'
import Head from 'next/head'

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

const charts = () => {  
    const clairtyCode = `
        (function (c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "l5zqf94lap"); `

    const images = Array.from({ length: 4 }, (_, i) => {
            return `/chart${i}.png`;
        });

    return (
      <div>
          <div className='bg-[#0064E6] text-white'>
              <Script
                  id = "ms-clarity"
                  strategy="afterInteractive"
              >{clairtyCode}</Script>
              <Script async src="https://cdn.promotekit.com/promotekit.js" data-promotekit="03b8c588-8350-4a0c-97f0-0a839509e8e0" strategy="afterInteractive"/>
              <Script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js" strategy="afterInteractive"/>
              <GoogleAnalytics gaId="G-G8X2NEPTEG" />
              <header className='bg-black/10 px-2 py-1 sm:p-6 sm:h-20 flex w-full fixed top-0 sm:gap-10 place-items-center'>
                  <div className='flex w-full sm:w-56 text-xs place-items-center gap-2'><Image src="/easyChartsLogo.png" width="40" height="40" ></Image><Link href={"www.lych3e.com"}>Lychee</Link> / Easy Charts</div>
                  <div className='text-right text-xs float-right'><Link href="#testimonials">Testimonials</Link></div>
              </header>
              <main className=''>
                  <div className='px-4 sm:px-20 py-20 sm:py-32 md:w-4/6'>
                      <div className='mx-auto sm:fixed sm:top-10 sm:right-10 sm:w-64 text-black pb-2 rounded-md'>
                          <div className='p-3 flex border-b bg-white place-items-center rounded-t-lg'><div className='text-sm font-semibold w-1/2'>Lychee</div>
                              <div className='w-1/2 text-right'> <div className='text-sm font-semibold'>$39.99/once</div> <div className='line-through text-xs'>$199.99/once</div></div>
                          </div>
                          <div className='px-5 py-4 bg-blue-100'>
                              <h4 className="scroll-m-20 text-xl font-semibold tracking-tight text-xs">What's included?</h4>
                              <div className='flex gap-2 pt-3 pb-1 place-items-center'><LineChart className='h-4 w-4'/><small className="text-xs font-medium leading-none">Unlimited Charts</small></div>
                              <div className='flex gap-2 py-1 place-items-center'><Video className='h-4 w-4'/><small className="text-xs font-medium leading-none">Easy to start {`(1 minute video)`}</small></div>
                              <div className='flex gap-2 py-1 place-items-center'><LineChart className='h-4 w-4'/><small className="text-xs font-medium leading-none">Instant Downloads, jpg, svg, png</small></div>
                              <div className='flex gap-2 py-1 place-items-center'><Gift className='h-4 w-4'/><small className="text-xs font-medium leading-none">Free updates</small></div>
                              <div className='flex gap-2 py-1 place-items-center'><ChatBubbleIcon className='h-4 w-4'/><small className="text-xs font-medium leading-none">Bare bones support included</small></div>
                              <div className='flex gap-2 py-1 place-items-center'><MagicWandIcon className='h-4 w-4'/><small className="text-xs font-medium leading-none">Lychee Features (AI, Integrations, Spreadsheet, website builder etc)</small></div>
                              <div className='pt-4 pb-1'>
                                  <h4 className="scroll-m-20 text-xl font-semibold tracking-tight text-xs">What's included?</h4>
                                  <p className="text-xs">After you purchase, you'll be able to log in with your email, instant unlimited access. Everything you need.</p>
                              </div>                        
                          </div>
                          <div className='px-2 bg-blue-100 pb-2 rounded-b-md w-full'>
                              <Link rel="noopener noreferrer" target="_blank" href="https://buy.stripe.com/bIY7uM4Gi7CS7IsaF4"> <div className='bg-[#01A823] hover:bg-[#01A823]/80 py-2 rounded-lg text-center text-white font-bold w-full'>Checkout</div> </Link>
                          </div>
                      </div>
                      <div className='flex pt-10 sm:pt-0'>
                          <h1 className="font-serif scroll-m-20 text-4xl sm:text-6xl font-extrabold tracking-tight py-6">
                              Easy Charts 
                          </h1>
                          <div className='mt-3 h-4 sm:h-5 text-[4px] sm:text-[8px] font-thin font-mono rounded-xl border-white border px-1 sm:px-2 py-1'>0.7.7</div>
                      </div>                    
                      <h2 className="font-serif scroll-m-20 text-xl sm:text-3xl font-[500] tracking-tight first:mt-0 text-white">
                          Super simple charts, without a <br/> subscription.
                      </h2>
                      <p className="font-serif text-sky-200 text-lg mt-4">If you've used Excel or Sheets, you will feel right at home... If you know how to press a button, you already know how to use Easy Charts. Pay once, no downloads necessary, own it for life. It's yours. You also get the rest of Lychee too.</p>
                  </div>
                  <div className='px-2 lg:px-20 pb-20 lg:w-9/12'>
                      <div className='flex place-items-center place-content-center py-4'> <Badge variant="outline border-white">no-code: /shdcn/charts</Badge> </div>
                      <ChartShow/>
                  </div>
                  <div className='px-4 md:px-20 md:w-4/6'>
                      <h1 className="text-white scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">What is it?</h1>
                      <p className="font-serif text-sky-200 text-lg mt-4">
                          Easy Charts, lets you make charts and data visualizations. <br/> No downloads needed, unlimited charts, export as jpg, png, svg. Easy and beautiful. The basics done right. You can customize your chart however you like. Plus, you own the assets and your data.
                      </p>
                  </div>
                  <div className="px-10 py-10 md:columns-3 gap-4  ">
                      {images.slice(0, 3).map((imageUrl, idx) => (
                          <BlurFade key={imageUrl} delay={0.25 + idx * 0.05} inView>
                              <img
                                  className="mb-4 size-full rounded-lg object-contain"
                                  src={imageUrl}
                                  alt={`Random stock image ${idx + 1}`}
                              />
                          </BlurFade>
                      ))}
                  </div>
                  <div className='px-8 md:px-20 md:w-4/6'>
                      <h1 className="text-white scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">But we already have Excel, Google Sheets, etc</h1>
                      <p className="font-serif text-sky-200 text-lg mt-4">
                          Yes, but those products come with the worst features ever: recurring charges that never end. It shouldn’t cost tens, hundreds or thousands of dollars a month forever to make beautiful visualizations. That's obscene. Besides, Excel and Google Sheets have become unnecessarily complicated.  
                      </p>
                      <p className="font-serif text-sky-200 text-lg mt-4">
                          People have already made the switch to from Excel, Google Sheets, and other chat services to Lychee - <Link className="cursor-pointer underline hover:text-blue-100" href="#testimonials"> here's what they're saying. </Link>
                      </p>
                  </div>
                  <div className='px-4 md:px-20 md:w-4/6 py-10'>
                      <h1 className="text-white scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">Besides, look how easy it is</h1>
                      <p className="font-serif text-sky-200 text-lg mt-4">
                          and how handsome the creator is... @misterrpink
                      </p>
                      <div className="md:px-4 py-4 flex flex-wrap justify-center gap-4">
                          <iframe
                              className="w-full"
                              height="315"
                              src={`https://www.youtube.com/embed/Mhgk122WuFg?si=hRH4UxT8UbPv55MC`}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              title="Embedded YouTube Video"
                          ></iframe>
                      </div>              
                  </div>
                  <div className='md:px-20 w-full'>
                      <h1 className="px-4 md:px-0 text-white scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">Take an even closer look</h1>
                      <p className="px-4 md:px-0 font-serif text-sky-200 text-lg mt-4">
                        Step 1: Super simple data upload (or check out Lychee's other options)
                      </p>
                      <div className="md:px-10 ">
                          <Image src={'/uploadMockup.png'} width={800} height={700}/>
                      </div>
                      <p className="px-4 md:px-0 font-serif text-sky-200 text-lg mt-8">
                        Step 2: Chart is autogenerated. Customization is up to you.
                      </p>
                      <div className="md:px-10 py-10">
                          <Image src={'/chartGenerated.png'} width={800} height={800}/>
                      </div>
                      <p className="px-4 md:px-0 font-serif text-sky-200 text-lg mt-4">
                        Step 3: Customize anything and everything, always beautiful.
                      </p>
                      <div className="md:px-10 py-10">
                          <Image src={'/customize.png'} width={800} height={800}/>
                      </div>
                      <p className="px-4 md:px-0 font-serif text-sky-200 text-lg mt-0">
                        Step 4: Download, png, jpg, svg or share to socials, up to you
                      </p>
                  </div>
                  <div className='py-10 px-4 md:px-20 md:w-4/6'>
                      <h1 className="text-white scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">Let's talk about Lychee</h1>
                      <p className="font-serif text-sky-200 text-lg mt-4 pb-10">
                          Lychee is the Easy Chart's parent (also created by @misterrpink). <br/>
                          On a mission to make the whole data pipeline as seamless as possible. <br />
                          When you get lifetime access to Easy Charts, you also get access to the full suite of tools that is Lychee:
                      </p>
                      <LycheeFeatureGrid from="charts"/>
                  </div>
                  <div className='px-20 py-56 w-full' id="testimonials">
                      <h1 className="text-white scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">Lychee Testimonials</h1>
                      <p className="font-serif text-sky-200 text-lg mt-4 pb-10">People really like Lychee - here's what they're saying. <br/> All reviews are clickable.                        
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
                  <div className='px-20 py-56 w-full text-center flex flex-col place-items-center place-content-center' id="getIt">
                      <h1 className="text-white scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">Only One Thing Left To Do</h1>
                      <p className="font-serif text-sky-200 text-lg mt-4 pb-10">Get it.                      
                      </p>
                      <Link href="https://buy.stripe.com/bIY7uM4Gi7CS7IsaF4"> <div className='w-32 text-[#0064E6] bg-white hover:bg-white/80 py-2 rounded-lg text-center font-bold'>Checkout</div> </Link>
                  </div>
              </main>
          </div>
        </div>
    )
}

export default charts