"use client";

import Link from "next/link";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { CheckIcon } from "@radix-ui/react-icons";
import { motion } from "framer-motion";
import { useState } from "react";

import { landingPageV2Config } from "@/lib/landingPageV2Config";

export function Pricing() {
  const [applyDiscount, setApplyDiscount] = useState(false);

  const plans = landingPageV2Config.pricing;

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
            Choose a plan that&apos;s <strong>packed</strong> with
            the best features for doing everything you could possibly want to do with data.
          </p>
        </div>

        <div className="flex w-full items-center justify-center space-x-2">
          <Switch
            id="interval"
            checked={applyDiscount}
            onCheckedChange={setApplyDiscount}
          />
          <span>{applyDiscount ? "Remove Discount" : "Apply Discount"}</span>
        </div>

        <div className="mx-auto grid w-full justify-center gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, idx) => {
            const isOneTime = plan.period === "one-time";
            const href = isOneTime
              ? plan.href
              : applyDiscount ? plan.hrefYearly : plan.hrefMonthly;

            return (
              <div
                key={plan.name}
                className={cn(
                  "relative flex w-full max-w-[400px] flex-col gap-4 overflow-hidden rounded-2xl border p-4 text-black dark:text-white",
                  {
                    "border-2 border-neutral-700 shadow-lg shadow-neutral-500 dark:border-neutral-400 dark:shadow-neutral-600":
                      plan.isPopular,
                  }
                )}
              >
                {plan.isPopular && plan.badgeLabel && (
                  <div className="absolute top-0 right-0 bg-green-500 py-0.5 px-2 rounded-bl-xl rounded-tr-xl">
                    <span className="text-white font-sans font-semibold text-sm">
                      {plan.badgeLabel}
                    </span>
                  </div>
                )}
                <div className="flex items-center">
                  <div className="ml-4">
                    <h2 className="text-base font-semibold leading-7">
                      {plan.name}
                    </h2>
                    <p className="h-16 text-sm leading-5 text-black/70 dark:text-white">
                      {plan.description}
                    </p>
                  </div>
                </div>

                <motion.div
                  key={`${plan.name}-${applyDiscount}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.4,
                    delay: 0.1 + idx * 0.05,
                    ease: [0.21, 0.47, 0.32, 0.98],
                  }}
                  className="flex flex-row gap-1"
                >
                  <span className="text-4xl font-bold text-black dark:text-white text-center w-full">
                    {isOneTime ? plan.price : (applyDiscount ? plan.yearlyPrice : plan.price)}
                    <span className="text-xs font-normal">
                      {isOneTime ? " one-time" : ` /${applyDiscount && plan.yearlyPeriod ? plan.yearlyPeriod : plan.period}`}
                      {applyDiscount && plan.yearlyNote && !isOneTime && " (charged annually)"}
                    </span>
                  </span>
                </motion.div>

                <Link
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "cursor-pointer text-center rounded-sm w-3/4 mx-auto py-2 font-semibold",
                    plan.isPopular
                      ? "bg-green-500 hover:bg-green-600 text-black"
                      : "bg-green-400 hover:bg-black hover:text-white text-black"
                  )}
                >
                  {plan.buttonText}
                </Link>

                <hr className="m-0 h-px w-full border-none bg-gradient-to-r from-neutral-200/0 via-neutral-500/30 to-neutral-200/0" />
                {plan.features && plan.features.length > 0 && (
                  <ul className="flex flex-col gap-2 font-normal">
                    {plan.features.map((feature, fidx) => (
                      <li
                        key={fidx}
                        className="flex items-start gap-3 text-xs font-medium text-black dark:text-white"
                      >
                        <CheckIcon className="h-5 w-5 shrink-0 rounded-full bg-green-400 p-[2px] text-black dark:text-white mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
