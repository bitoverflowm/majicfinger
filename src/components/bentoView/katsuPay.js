"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { CheckIcon, Cross1Icon } from "@radix-ui/react-icons";
import { motion } from "framer-motion";
import { Loader } from "lucide-react";
import { useState } from "react";

export const toHumanPrice = (price, decimals) => {
  return Number(price / 100).toFixed(decimals);
};

const katsuPrices = [
  {
    id: "price_1",
    name: "Video Download",
    description: "Download as .mp4, .mkv, etc",
    features: [
      "1 vote cast towards building Video Downloads",
      "1 license to for 1 seat for life",
      "Unlimited Presentations",
      "If any of the other options wins, you will have access to the winning option once it is built",
      "I will eventually build this even if it does not win 1st",
      "Lifetime access to hosted domain on Lychee at no additional cost"
    ],
    missing: [
        "Does not include access to Lychee"
    ],
    price: 799,
    isMostPopular: false,
    ref: 'https://buy.stripe.com/9AQ8yQ6Oq5uKe6Q9AO'
  },
  {
    id: "price_2",
    name: "Hosted Link",
    description: "<name>.lych3e.com or custom domain. Creates a rich interactive experience.",
    features: [
      "1 vote cast towards building Hosted URL Downloads",
      "1 license to for 1 seat for life",
      "Unlimited Presentations",
      "If any of the other options wins, you will have access to the winning option once it is built",
      "I will eventually build this even if it does not win 1st",
      "Lifetime access to hosted domain on Lychee at no additional cost"
    ],
    missing: [
        "Does not include access to Lychee"
    ],
    price: 800,
    isMostPopular: false,
    ref: 'https://buy.stripe.com/4gw4iA1u69L0aUEcN1'
  },
  {
    id: "price_3",
    name: "Embeds",
    description: "Embed code to place wherever you want.",
    features: [
      "1 vote cast towards building Hosted URL Downloads",
      "1 license to for 1 seat for life",
      "Unlimited Presentations",
      "If any of the other options wins, you will have access to the winning option once it is built",
      "I will eventually build this even if it does not win 1st",      
    ],
    missing: [
        "Does not include access to Lychee"
    ],
    price: 801,
    isMostPopular: false,
    ref: 'https://buy.stripe.com/14kaGY1u66yO8MwaEU'
  },
  {
    id: "price_4",
    name: "All",
    description: "You think all options urgently need to be built.",
    features: [
      "1 vote cast towards building All export functions ASAP",
      "1 license to for 1 seat for life",
      "Unlimited Presentations",
    ],
    missing: [
        "Does not include access to Lychee"
    ],
    price: 1988,
    isMostPopular: false,
    ref: 'https://buy.stripe.com/3cs8yQ8Wyf5k2o85kB'
  },
];

export function KatsuPay() {
  const [interval, setInterval] = useState("month");
  const [isLoading, setIsLoading] = useState(false);
  const [id, setId] = useState(null);

  const onSubscribeClick = async (priceId) => {
    setIsLoading(true);
    setId(priceId);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate a delay
    setIsLoading(false);
  };

  return (
    <section id="pricing">
      <div className="mx-auto flex max-w-screen-xl flex-col gap-8 px-4 py-14 md:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <h4 className="text-xl font-bold tracking-tight text-black dark:text-white">
            What export format is best for you?
          </h4>
          <h2 className="text-5xl font-bold tracking-tight text-black dark:text-white sm:text-6xl">
            Cast Your Vote
          </h2>
          <p className="mt-6 text-xl leading-8 text-black/80 dark:text-white">
            Choose which export format works <strong>best for you</strong> AND get access to Katsu <strong> FOR LIFE </strong> including <strong>ALL</strong> future updates.
          </p>
        </div>

        <div className="flex w-full items-center justify-center space-x-2">
          <span className="inline-block whitespace-nowrap rounded-full bg-black px-2.5 py-1 text-[11px] font-semibold uppercase leading-5 tracking-wide text-white dark:bg-white dark:text-black">
            Pay Once Own For LIFE ✨
          </span>
        </div>

        <div className="mx-auto grid w-full justify-center gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {katsuPrices.map((price, idx) => (
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
                <span className="text-4xl font-bold text-black dark:text-white">
                  $
                  {toHumanPrice(price.price, 2)}
                  <span className="text-xs"> Pay Once</span>
                </span>
              </motion.div>

              <div
                className={cn(
                  "group relative w-full gap-2 overflow-hidden text-lg font-semibold tracking-tighter",
                  "transform-gpu ring-offset-current transition-all duration-300 ease-out hover:ring-2 hover:ring-primary hover:ring-offset-2 bg-green-400 text-center",
                )}
                disabled={isLoading}
                onClick={() => void onSubscribeClick(price.id)}
              >
                <Link href={price.ref}>
                    <span className="absolute right-0 -mt-12 h-32 w-8 translate-x-12 rotate-12 transform-gpu bg-white opacity-10 transition-all duration-1000 ease-out group-hover:-translate-x-96 dark:bg-black" />
                    {(!isLoading || (isLoading && id !== price.id)) && (
                    <p>Vote</p>
                    )}

                    {isLoading && id === price.id && <p>Voting</p>}
                    {isLoading && id === price.id && (
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    )}
                </Link>
              </div>

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
