"use client";

import Link from "next/link";
import { ChartShow } from "./showcase/chart1";
import { cn } from "@/lib/utils";
import Marquee from "@/components/magicui/marquee";
import Image from "next/image";
import LycheeFeatureGrid from "@/components/easyLychee/usage/lychee_feature_grid";
import { PricingSection } from "@/components/sections/pricing-section";
import { ArrowRightIcon } from "@radix-ui/react-icons";

export const Highlight = ({ children, className }) => {
  return (
    <span
      className={cn(
        "rounded-sm bg-accent px-1 py-0.5 font-semibold text-foreground",
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
        It&apos;s like{" "}
        <Highlight>the chart editor i wish i had for the last 10 years</Highlight>. Love
        it...
      </p>
    ),
    img: "https://media.theresanaiforthat.com/u/bearnard.png?width=52",
    src: "https://theresanaiforthat.com/ai/lychee?comment_id=10781",
  },
  {
    name: "Amal Khan",
    username: "Product Hunt",
    body: (
      <p>
        I really can&apos;t express in words how much I needed this.
        <Highlight>
          Changed my whole working game. My peers looked at this thing jaws dropped
          haha.
        </Highlight>
        Looking forward to the future of Lychee!
      </p>
    ),
    img: "https://ph-avatars.imgix.net/6832524/original.png?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=40&h=40&fit=crop&dpr=1",
    src: "https://www.producthunt.com/products/lychee-3/reviews?review=744208",
  },
  {
    name: "Charles Teh",
    username: "Product Hunt",
    body: (
      <p>
        Data scientists, marketers & managers would love this {":)"}
        <Highlight>Instant hands-free graph generation!</Highlight>
        Congrats on the launch!
      </p>
    ),
    img: "https://ph-avatars.imgix.net/6514580/7e558077-c3ef-4d78-8f48-c3e02e01ffe5.webp?auto=compress&codec=mozjpeg&cs=strip&fm=webp&w=36&h=36&fit=max&frame=1&dpr=2",
    src: "https://www.producthunt.com/products/lychee-3?comment=3321659#lychee-3",
  },
  {
    name: "Mar",
    username: "Product Hunt",
    body: (
      <p>
        OMG finally a reasonable tool
        <Highlight>to get my charting done fast! </Highlight> Do you think you will
        add more capabilities like Numpy Pandas library integrations @misterrpink
      </p>
    ),
    img: "https://ph-avatars.imgix.net/6852998/e7fbb0c4-97a3-4ad5-9919-cd7b20e164d4.png?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=36&h=36&fit=crop&dpr=1",
    src: "https://www.producthunt.com/products/lychee-3?comment=3320264#lychee-3",
  },
  {
    name: "Henry Habib",
    username: "Product Hunt",
    body: (
      <p>
        Nice!
        <Highlight>Visualizing data made simple.</Highlight> Great help for anyone
        in the data landscape. Good luck!
      </p>
    ),
    img: "https://ph-avatars.imgix.net/6203476/947f99ac-c697-4e66-8200-7b3cf40a3979.png?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=36&h=36&fit=crop&dpr=1",
    src: "https://www.producthunt.com/products/lychee-3?comment=3320062#lychee-3",
  },
  {
    name: "Yu",
    username: "Product Hunt",
    body: (
      <p>
        love this project.
        <Highlight> I&apos;ll actually use this every day </Highlight>
        god I hate excel also why am I downloading a new software every few months?
        Microsoft is unhinged at this point{" "}
      </p>
    ),
    img: "https://ph-avatars.imgix.net/6835962/224dc544-7618-43f7-8a0d-bfacd75315f7.png?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=36&h=36&fit=crop&dpr=1",
    src: "https://www.producthunt.com/products/lychee-3?comment=3320062#lychee-3",
  },
  {
    name: "Nikita",
    username: "Product Hunt",
    body: (
      <p>
        The design of this thing is
        <Highlight> out of this world. </Highlight>I can imagine this totally
        blowing up on places like Instagram and X.
      </p>
    ),
    img: "https://ph-avatars.imgix.net/4884364/90068181-d49d-4f6e-9d4e-69c4043fa07b.jpeg?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=36&h=36&fit=crop&dpr=1",
    src: "https://www.producthunt.com/posts/katsu?comment=3446689",
  },
  {
    name: "Nico",
    username: "Product Hunt",
    body: (
      <p>
        Congrats on the launch!
        <Highlight> Looks sick for product updates! </Highlight>
      </p>
    ),
    img: "https://ph-avatars.imgix.net/4654354/d1f41fbe-051a-4dfd-a9f5-700040e61c59.png?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=36&h=36&fit=crop&dpr=1",
    src: "https://www.producthunt.com/posts/katsu?comment=3446565",
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
    src: "https://www.producthunt.com/posts/katsu?comment=3448801",
  },
];

const companies = ["jpm", "goldman", "meta", "google", "apple", "mit"];

const firstRow = reviews.slice(0, reviews.length / 2);
const secondRow = reviews.slice(reviews.length / 2);

const sectionHeading =
  "text-3xl font-medium tracking-tighter text-primary md:text-4xl text-balance";
const sectionBody =
  "mt-4 text-base font-medium leading-relaxed text-muted-foreground text-pretty md:text-lg";

const ReviewCard = ({ img, name, username, body, src }) => {
  return (
    <figure
      className={cn(
        "relative w-56 cursor-pointer overflow-hidden rounded-xl border border-border bg-card/60 p-4 shadow-sm backdrop-blur-sm transition-colors hover:bg-accent/40",
      )}
    >
      <Link href={src} rel="noopener noreferrer" target="_blank">
        <div className="flex flex-row items-center gap-2">
          <img src={img} alt="" className="h-8 w-8 rounded-full" />
          <div className="flex flex-col">
            <figcaption className="text-xs font-medium text-foreground">
              {name}
            </figcaption>
            <p className="text-xs font-medium text-muted-foreground">{username}</p>
          </div>
        </div>
        <blockquote className="mt-2 text-xs text-muted-foreground">{body}</blockquote>
      </Link>
    </figure>
  );
};

const EasyCharts = () => {
  return (
    <>
      <section className="relative w-full overflow-hidden">
        <div
          aria-hidden
          className="hero-aura-gradient pointer-events-none absolute inset-x-0 top-0 z-0 mx-auto h-[36rem] w-full max-w-[min(100%,84rem)] rounded-b-2xl sm:h-[40rem]"
        />
        <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-6 pb-12 pt-[6.8rem] text-center md:pt-[8rem]">
          <p className="inline-flex h-8 max-w-full items-center gap-2 rounded-full border border-border bg-accent px-3 text-sm text-foreground">
            We&apos;ll save you from all the complex yabba-dabba-doos out there
          </p>
          <h1 className="text-balance text-[clamp(2rem,4vw+0.5rem,3.25rem)] font-medium leading-[1.1] tracking-tighter text-primary">
            Instant Charts
            <br />
            Zero Hassle
          </h1>
          <p className="max-w-xl text-balance text-base font-medium leading-relaxed tracking-tight text-muted-foreground md:text-lg">
            Create animated, sharable, data visualizations from all your existing
            spreadsheet tools — no coding needed.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <Link
              href="#demo"
              className="flex h-9 w-32 items-center justify-center rounded-full border border-white/[0.12] bg-secondary px-4 text-sm font-normal tracking-wide text-primary-foreground shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] transition-all ease-out hover:bg-secondary/80 active:scale-95 dark:text-secondary-foreground"
            >
              Try it
            </Link>
            <Link
              href="#getIt"
              className="flex h-10 items-center justify-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-5 text-sm font-normal tracking-wide text-primary transition-all ease-out hover:bg-white/80 active:scale-95 dark:border-[#27272A] dark:bg-background dark:hover:bg-background/80"
            >
              View pricing
              <ArrowRightIcon className="size-3.5 text-muted-foreground" aria-hidden />
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">*no card or registration</p>
        </div>
      </section>

      <section className="w-full px-4 pb-16 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4">
          <div className="w-full overflow-hidden rounded-2xl border border-border bg-card/40 p-2 sm:p-4" id="demo">
            <ChartShow demo={true} />
          </div>
        </div>
      </section>

      <section className="w-full border-y border-border bg-muted/20 px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <p className="text-center text-sm font-medium text-muted-foreground">
            Trusted and actively beta tested by friends at
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {companies.map((logo) => (
              <img
                key={logo}
                src={`/${logo}.svg`}
                className="h-6 w-16 brightness-0 opacity-70 sm:h-8 sm:w-20 dark:brightness-0 dark:invert"
                alt={logo}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="w-full px-6 py-16 md:py-24">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 sm:grid-cols-2 lg:gap-14">
          {[
            {
              title: "Maximal Data Protection",
              body: "You can actually make a whole chart without saving any data into our db! Which means we never touch your data. However of course if you want to save your work, we will need to save your work. Nevertheless, we promise to never backdoor data broker, use, sell, trade your data.",
            },
            {
              title: '"Blink Of An Eye" Level Instant',
              body: 'See it for yourself in the demo above! We "graphify" your spreadsheets before you open your eyes so that you never waste a single second waiting again.',
            },
            {
              title: "Engage your audience",
              body: "Professional-quality data graphics and animated stories that bring your data to life.",
            },
            {
              title: "No Mumbo Jumbo.",
              body: "Sit back and enjoy a user-friendly platform that requires no coding skills or hi-fi language.",
            },
            {
              title: "Cost-Effective.",
              body: "No BS features you don't even need. When we built this — we had you in mind.",
            },
            {
              title: "Variety Of Chart Options.",
              body: "Choose from a variety of chart types, including pie, histogram, line, bar charts. Your data is your style.",
            },
            {
              title: "Your Favorite Sources",
              body: "Excel, Notion, Google Sheets, any .csv or .xlsx file will do. json coming soon. We even went as far as to allow you to source data directly from: Twitter, CoinGecko, Instagram, Meta, Reddit, you name it, we got it.",
            },
            {
              title: "Share, publish, present, embed, download",
              body: "Seamlessly share your presentation with your team and audience. Publish as a standalone website, collate into a collection of pages, publish as a grid, download as jpg, share directly to social media.",
            },
            {
              title: "World's most beautiful charts",
              body: "Combined with the world's most beautiful color palate makes a magical combo.",
            },
          ].map((item) => (
            <div key={item.title} className="space-y-2">
              <h2 className={sectionHeading}>{item.title}</h2>
              <p className={sectionBody}>{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="w-full border-t border-border bg-muted/20 px-6 py-16 md:py-20">
        <div className="mx-auto max-w-5xl space-y-6">
          <h2 className={cn(sectionHeading, "text-center")}>Look how easy it is</h2>
          <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
            <iframe
              className="aspect-video w-full"
              src="https://www.youtube.com/embed/5qrVmJaE4_o?si=4ke8h_wnUD7sIiuZ"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Embedded YouTube Video"
            />
          </div>
        </div>
      </section>

      <section className="w-full px-6 py-16 md:py-24">
        <div className="mx-auto max-w-3xl space-y-10">
          <h2 className={sectionHeading}>3 Simple Steps</h2>
          <div className="space-y-4">
            <p className={sectionBody}>
              Step 1: Easily import your data. However you collect your data, Easy
              Charts can chart it. Build charts from spreadsheet, databases, type it
              directly or connect to a live data source, like Twitter, Instagram,
              Youtube, CoinGecko, Yahoo Finance, etc.
            </p>
            <Image
              src="/uploadMockup.png"
              width={800}
              height={700}
              alt="Upload data mockup"
              className="rounded-xl border border-border"
            />
          </div>
          <div className="space-y-4">
            <p className={sectionBody}>
              Step 2: Customize and control absolutely every aspect of your chart.
            </p>
            <Image
              src="/chartGenerated.png"
              width={800}
              height={800}
              alt="Generated chart mockup"
              className="rounded-xl border border-border"
            />
          </div>
          <div className="space-y-4">
            <p className={sectionBody}>
              Step 3: Share your insights however you like.
            </p>
            <Image
              src="/customize.png"
              width={800}
              height={800}
              alt="Customize and share mockup"
              className="rounded-xl border border-border"
            />
          </div>
        </div>
      </section>

      <section className="w-full border-t border-border bg-muted/20 px-6 py-16 md:py-24" id="testimonials">
        <div className="mx-auto max-w-6xl">
          <h2 className={cn(sectionHeading, "text-center")}>
            What Our Legendary Users Have To Say
          </h2>
          <p className={cn(sectionBody, "mx-auto max-w-2xl text-center")}>
            People really like it — all reviews are clickable.
          </p>
          <div className="relative mt-10 flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-border bg-background py-8">
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
            <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-background" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-background" />
          </div>
        </div>
      </section>

      <div id="getIt" className="w-full py-10">
        <PricingSection />
      </div>

      <section className="w-full border-t border-border px-6 py-16 md:py-24" id="learnLychee">
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className={sectionHeading}>Let&apos;s talk about Lychee</h2>
            <p className={sectionBody}>
              Lychee is Easy Charts&apos; parent (also created by @misterrpink).
              <br />
              On a mission to make the whole data pipeline as seamless as possible.
              <br />
              Every paid plan includes the full suite of Lychee tools:
            </p>
          </div>
          <LycheeFeatureGrid />
        </div>
      </section>
    </>
  );
};

export default EasyCharts;
