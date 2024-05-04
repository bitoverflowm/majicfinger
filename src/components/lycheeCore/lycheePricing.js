"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { CheckIcon, Cross1Icon } from "@radix-ui/react-icons";
import { motion } from "framer-motion";
import { Loader } from "lucide-react";
import { useState } from "react";


export const toHumanPrice = (price, decimals = 2) => {
  return Number(price / 100).toFixed(decimals);
};
const lycheePrices = [
  {
    id: "price_1",
    name: "Basic",
    description: "A basic plan for startups and individual users",
    features: [
      "Upload Data",
      "Generate Data",
      "Powerful Table",
      "Personalized Dashboard",
      "Create presentations with Katsu",
      "1,000+ Charts (new charts added daily)",
      "796,000+ curated colors and pallates",
      "512 MB file upload space *",
      "3 integrations *",
      "$100 in Lychee Tokens/ month *",
    ],
    missing: [
        "Subscription prices might rise as new features are added and platform matures"
    ],
    monthRef: 'https://buy.stripe.com/bIY16o5Km8GW4wgeV6',
    yearRef: 'https://buy.stripe.com/6oEdTa2ya5uK1k47sF',
    monthlyPrice: 999,
    yearlyPrice: 9999,
    isMostPopular: false,
  },
  {
    id: "price_2",
    name: "LifeTime",
    description: "A single payment, own everything for life.",
    features: [
      "Includes everything in basic plan",
      "Includes all future features",
      "Not a single penny more than what you pay today.",
      "Be added to our legacy customer list and know our secrets and what we got in store WAAAYYY before everyone else",
    ],
    monthRef: 'https://buy.stripe.com/cN2bL2gp03mC5AkfZ9',
    yearRef: 'https://buy.stripe.com/cN2bL2gp03mC5AkfZ9',
    monthlyPrice: 6999,
    yearlyPrice: 6999,
    singlePay: true,
    isMostPopular: true,
  },
  {
    id: "price_3",
    name: "Enterprise",
    description:
      "Are you an organization? Do you want your team on Lychee?",
    features: [
      "Custom trained AI for your business",
      "Dedicated AI solutions",
      "Partitioned database",
      "24/7 dedicated support",
      "Team access",
      "Enterprise grade security",
      "$5K deposit to schedule meeting, fully refunded if Lychee cannot provide you a solution (this way we don't waste time)",
    ],
    monthRef: 'https://book.stripe.com/14kg1i6Oq0aqd2M14m',
    yearRef: 'https://book.stripe.com/14kg1i6Oq0aqd2M14m',
    monthlyPrice: 500000,
    yearlyPrice: 500000,
    singlePay: true,
    isMostPopular: false,
  },
];

export function LycheePricing() {
  const [interval, setInterval] = useState("month");

  return (
    <section id="pricing">
      <div className="mx-auto flex max-w-screen-xl flex-col gap-8 px-4 py-14 md:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <h4 className="text-xl font-bold tracking-tight text-black dark:text-white">
            Pricing
          </h4>

          <h2 className="text-5xl font-bold tracking-tight text-black dark:text-white sm:text-6xl">
            Simple and Sustainable Pricing For Everyone.
          </h2>

          <p className="mt-6 text-xl leading-8 text-black/80 dark:text-white">
            Choose an <strong>affordable plan</strong> that&apos;s packed with
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
          <span>Annual</span>
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
                        <span className="text-xs"> / {interval} (7 day trial)</span>
                        </span>
                    </motion.div>
              }

              {
                price.singlePay ?
                    <Link href={price && price.monthRef} className="hover:bg-black hover:text-white cursor-pointer text-center bg-green-400 rounded-sm w-3/4 mx-auto">
                        Go
                    </Link>
                    :<Link href={price && interval === "year" ? price.yearRef : price.monthRef} className="hover:bg-black hover:text-white cursor-pointer text-center bg-green-400 rounded-sm rounded-sm w-3/4 mx-auto">
                        Go
                    </Link>
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
      </div>
    </section>
  );
}
