"use client";

import Link from "next/link";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { CheckIcon, Cross1Icon } from "@radix-ui/react-icons";
import { motion } from "framer-motion";
import { useState } from "react";

import { useMyStateV2 } from "@/context/stateContextV2";


export const toHumanPrice = (price, decimals = 2) => {
  return Number(price / 100).toFixed(decimals);
};
const lycheePrices = [
  {
    id: "price_0",
    name: "Free",
    description: "What is included with free?",
    features: [
      "Upload and Save up to 5 Datasets",
      "Powerful Table",
      "Free Tier Integrations",
      "1,000+ Charts (new charts added daily)",
      "796,000+ curated colors and pallates",
      "3 AI Analysis requests",
      "1 Scrape requests",
      "5 Data Set generations",
    ],
    missing: [
        "Subscription prices might rise as new features are added and platform matures"
    ],
    monthRef: '',
    yearRef: '',
    monthlyPrice: 0,
    yearlyPrice: 0,
    isMostPopular: false,
  },
  {
    id: "price_1",
    name: "Pro",
    description: "Everything in Free Tier But More.",
    features: [
      "Access to everything",
      "Upload 0.85GB worth of Datasets",
      "100 Tokens/month (top ups available)",
      "Generate data",
      "Create personalized dashboards with your custom data",
      "Host your presentations to share with your team or audience",
      "Create presentations with Katsu",
      "Unlimited Integrations (based on rate limits)",
      "Scrape URLs"
    ],
    missing: [
        "Subscription prices might rise as new features are added and platform matures"
    ],
    monthRef: 'https://buy.stripe.com/bIY16o5Km8GW4wgeV6',
    yearRef: 'https://buy.stripe.com/9AQbL2b4GaP47Is8wP',
    monthlyPrice: 999,
    yearlyPrice: 8999,
    isMostPopular: false,
  },
  {
    id: "price_2",
    name: "LifeTime (85% off, original $199.99)",
    description: "A single payment, own everything for life.",
    features: [
      "Includes everything in all plans",
      "2GB worth of Datasets",
      "Includes all future features",
      "Includes 100 tokens/ month (free) for life (top-ups available)",
      "Not a single penny more than what you pay today.",
      "Be added to our legacy customer list and know our secrets and what we got in store WAAAYYY before everyone else",
    ],
    monthRef: 'https://buy.stripe.com/aEUaGYfkW9L04wgbJ3',
    yearRef: 'https://buy.stripe.com/aEUaGYfkW9L04wgbJ3',
    monthlyPrice: 2999,
    yearlyPrice: 2999,
    singlePay: true,
    isMostPopular: true,
  },
];

export function Pricing() {
  const [interval, setInterval] = useState("year");

  const contextStateV2 = useMyStateV2()
  let setViewing = contextStateV2?.setViewing || []


  return (
    <section id="pricing">
      <div className="mx-auto flex max-w-screen-xl flex-col gap-8 px-4 py-14 md:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <h4 className="text-xl font-bold tracking-tight text-black dark:text-white">
            Pricing
          </h4>
          <h2 className="text-5xl font-bold tracking-tight text-black dark:text-white sm:text-6xl">
            Something For Everyone.
          </h2>
          <p className="mt-6 text-xl leading-8 text-black/80 dark:text-white">
            Choose a plan  that&apos;s <strong>packed </strong>with
            the best features for doing everything you could passibly want to do with data.
          </p>
        </div>

        <div className="flex w-full items-center justify-center space-x-2">
          <Switch
            id="interval"
            onCheckedChange={(checked) => {
              setInterval(checked ? "year" : "month");
            }}
          />
          <span>{interval === 'year' ? "Remove Discount" : "Apply Discount"}</span>
        </div>

        <div className="mx-auto grid w-full justify-center gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {lycheePrices.map((price, idx) => (
            <div
              key={price.id}
              className={cn(
                " relative flex w-full max-w-[400px] flex-col gap-4 overflow-hidden rounded-2xl border p-4 text-black dark:text-white",
                {
                  "border-2 border-neutral-700 shadow-lg shadow-neutral-500 dark:border-neutral-400 dark:shadow-neutral-600":
                    price.isMostPopular,
                },
              )}
            >
              <div className="flex items-center">
                <div className="ml-4">
                  <h2 className="text-base font-semibold leading-7">
                    {price.name}
                  </h2>
                  <p className="h-16 text-sm leading-5 text-black/70 dark:text-white">
                    {price.description}
                  </p>
                </div>
              </div>

              {
                price.singlePay ?
                        <motion.div
                            key={`${price.id}`}
                            initial="initial"
                            animate="animate"
                            variants={{
                            initial: {
                                opacity: 0,
                                y: 12,
                            },
                            animate: {
                                opacity: 1,
                                y: 0,
                            },
                            }}
                            transition={{
                            duration: 0.4,
                            delay: 0.1 + idx * 0.05,
                            ease: [0.21, 0.47, 0.32, 0.98],
                            }}
                            className="flex flex-row gap-1"
                        >
                            <span className="text-4xl font-bold text-black dark:text-white text-center w-full">
                                ${toHumanPrice(price.yearlyPrice, 2)}
                            <span className="text-xs"> one payment</span>
                        </span>
                    </motion.div>
                    :
                    <motion.div
                        key={`${price.id}-${interval}`}
                        initial="initial"
                        animate="animate"
                        variants={{
                        initial: {
                            opacity: 0,
                            y: 12,
                        },
                        animate: {
                            opacity: 1,
                            y: 0,
                        },
                        }}
                        transition={{
                        duration: 0.4,
                        delay: 0.1 + idx * 0.05,
                        ease: [0.21, 0.47, 0.32, 0.98],
                        }}
                        className="flex flex-row gap-1"
                    >
                        <span className="text-4xl font-bold text-black text-center w-full">
                            $
                            {interval === "year"
                                ? toHumanPrice(price.yearlyPrice, 2)
                                : toHumanPrice(price.monthlyPrice, 2)}
                        <span className="text-xs"> / {interval} </span>
                        </span>
                    </motion.div>
              }
              {
                price.id === 'price_0' ?
                  <div className="hover:bg-black hover:text-white cursor-pointer text-center bg-green-400 rounded-sm w-3/4 mx-auto" onClick={()=>setViewing('register')}> Register for Free </div>
                  :
                  <>
                    {
                      price.singlePay ?
                          <Link href={price && price.monthRef} className="hover:bg-black hover:text-white cursor-pointer text-center bg-green-400 rounded-sm w-3/4 mx-auto">
                              Go
                          </Link>
                          :<Link href={price && interval === "year" ? price.yearRef : price.monthRef} className="hover:bg-black hover:text-white cursor-pointer text-center bg-green-400 rounded-sm rounded-sm w-3/4 mx-auto">
                              Go
                          </Link>
                    }
                  </>
              }

              

              <hr className="m-0 h-px w-full border-none bg-gradient-to-r from-neutral-200/0 via-neutral-500/30 to-neutral-200/0" />
              {price.features && price.features.length > 0 && (
                <ul className="flex flex-col gap-2 font-normal">
                  {price.features.map((feature, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-3 text-xs font-medium text-black dark:text-white"
                    >
                      <CheckIcon className="h-5 w-5 shrink-0 rounded-full bg-green-400 p-[2px] text-black dark:text-white" />
                      <span className="flex">{feature}</span>
                    </li>
                  ))}
                </ul>
              )}
              {price.missing && price.missing.length > 0 && (
                <ul className="flex flex-col gap-2 font-normal">
                  {price.missing.map((missing, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-3 text-xs font-medium text-black dark:text-white"
                    >
                      <Cross1Icon className="h-5 w-5 shrink-0 rounded-full bg-red-400 p-[2px] text-black dark:text-white" />
                      <span className="flex">{missing}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 text-sm bg-slate-200 p-4 text-justify grid grid-cols-2 gap-10">
            <div className="px-10">
              <div className="font-bold">A note on Tokens:</div>
              <div className="pt-2"> Why 100 Tokens?</div>
              <div className="py-1">Based on my personal usage, unless you are a power user, 100 Tokens should be sufficient. Top ups are available.</div>
              <div className="py-1">It is impossible to assign "n" number of requests for 100 tokens, becuase each request can constitute different data analysis, image, pdf sizes, APIs have different usage limits, and different websites have different amounts of data to scrape.</div> 
              <div>Everything is highly variable</div>
              <div className="py-1">This is our first issuance event for Lychee, so bear with me as I actively monitoring usage, to optimize billing for the community.</div>
            </div>
            <div className="px-10">
              <div className="font-bold">Self-custody</div>
              <div className="py-1">I fully support self-custody of assets. I believe that tokens you buy should be your assets, along with your data. This means eventually I will code tokens up as ERC 20 or some other blockchain based token that you can keep in your own wallets. Or leave it here (up to you, they're yours)</div>
              <div className="py-1">If you are a blockchain based grant issuer please click here if you would like me to build Lychee's native token on your blockchain</div>
            </div>            
          </div>
      </div>
    </section>
  );
}
