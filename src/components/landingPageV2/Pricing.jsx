"use client";

import Section from "./Section";
import { buttonVariants } from "@/components/ui/button";
import { landingPageV2Config } from "@/lib/landingPageV2Config";
import useWindowSize from "@/lib/hooks/use-window-size";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FaStar } from "react-icons/fa";

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState("weekly"); // weekly | monthly | annual
  const { isDesktop } = useWindowSize();

  return (
    <Section id="pricing" title="Pricing" subtitle="Choose the plan that's right for you">
      <div className="flex justify-center mb-10 items-center gap-2 flex-wrap">
        {[
          { id: "weekly", label: "Weekly" },
          { id: "monthly", label: "Monthly", badge: "-10%" },
          { id: "annual", label: "Annual", badge: "-25%" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setBillingCycle(t.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
              billingCycle === t.id ? "bg-primary text-white border-primary" : "bg-background text-foreground"
            )}
          >
            <span>{t.label}</span>
            {t.badge && (
              <span className="ml-2 text-xs font-semibold text-secondary bg-secondary/40 py-0.5 w-[calc(100%+1rem)] px-1 rounded-full">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 sm:grid-cols-2 gap-4">
        {landingPageV2Config.pricing.map((plan, index) => (
          <motion.div
            key={index}
            initial={{ y: 50, opacity: 1 }}
            whileInView={
              isDesktop
                ? {
                    y: 0,
                    opacity: 1,
                    x:
                      index === landingPageV2Config.pricing.length - 1
                        ? -30
                        : index === 0
                        ? 30
                        : 0,
                    scale:
                      index === 0 || index === landingPageV2Config.pricing.length - 1
                        ? 0.94
                        : 1.0,
                  }
                : {}
            }
            viewport={{ once: true }}
            transition={{
              duration: 1.6,
              type: "spring",
              stiffness: 100,
              damping: 30,
              delay: 0.4,
              opacity: { duration: 0.5 },
            }}
            className={cn(
              "rounded-2xl border-[1px] p-6 bg-background text-center lg:flex lg:flex-col lg:justify-center relative",
              plan.isPopular ? "border-primary border-[2px]" : "border-border",
              index === 0 || index === landingPageV2Config.pricing.length - 1
                ? "z-0 transform translate-x-0 translate-y-0 -translate-z-[50px] rotate-y-[10deg]"
                : "z-10",
              index === 0 && "origin-right",
              index === landingPageV2Config.pricing.length - 1 && "origin-left"
            )}
          >
            {plan.isPopular && (
              <div className="absolute top-3 right-3 flex items-center">
                <span className="bg-gradient-to-b from-secondary/50 from-[1.92%] to-secondary to-[100%] text-white h-6 inline-flex w-fit items-center justify-center px-2 rounded-full text-sm ml-2 shadow-[0px_6px_6px_-3px_rgba(0,0,0,0.08),0px_3px_3px_-1.5px_rgba(0,0,0,0.08),0px_1px_1px_-0.5px_rgba(0,0,0,0.08),0px_0px_0px_1px_rgba(255,255,255,0.12)_inset,0px_1px_0px_0px_rgba(255,255,255,0.12)_inset]">
                  {plan.badgeLabel ? (
                    <span className="inline-flex items-center gap-1 font-sans font-semibold text-sm">
                      {plan.badgeLabel}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-sans font-semibold text-sm">
                      <FaStar className="text-white" />
                      Popular
                    </span>
                  )}
                </span>
              </div>
            )}
            <div>
              <p className="text-base font-semibold text-muted-foreground">
                {plan.name}
              </p>
              <p className="mt-6 flex flex-col items-center justify-center gap-1">
                <span className="flex items-center justify-center gap-x-2 flex-wrap">
                  <span className="text-5xl font-bold tracking-tight text-foreground">
                    {billingCycle === "weekly"
                      ? plan.priceWeekly
                      : billingCycle === "monthly"
                        ? plan.priceMonthly
                        : plan.priceAnnual}
                  </span>
                  <span className="text-sm font-semibold leading-6 tracking-wide text-muted-foreground">
                    / {billingCycle === "weekly" ? "week" : billingCycle === "monthly" ? "month" : "year"}
                  </span>
                </span>
                <p className="text-xs leading-5 text-muted-foreground text-center">
                  {billingCycle === "weekly" ? "billed weekly" : billingCycle === "monthly" ? "billed monthly" : "billed annually"}
                </p>
              </p>
              <ul className="mt-5 gap-2 flex flex-col items-start">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-left">
                    <Check className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <hr className="w-full my-4" />
              <Link
                href={billingCycle === "weekly" ? plan.hrefWeekly : billingCycle === "monthly" ? plan.hrefMonthly : plan.hrefYearly}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "group relative w-full gap-2 overflow-hidden text-lg font-semibold tracking-tighter",
                  "transform-gpu ring-offset-current transition-all duration-300 ease-out hover:ring-2 hover:ring-primary hover:ring-offset-1 hover:bg-primary hover:text-white",
                  plan.isPopular
                    ? "bg-primary text-white"
                    : "bg-white text-black dark:bg-background dark:text-foreground"
                )}
              >
                {plan.buttonText}
              </Link>
              <p className="mt-6 text-xs leading-5 text-muted-foreground">
                {plan.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}
