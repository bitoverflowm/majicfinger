"use client";

import Section from "./Section";
import { buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { landingPageV2Config } from "@/lib/landingPageV2Config";
import useWindowSize from "@/lib/hooks/use-window-size";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FaStar } from "react-icons/fa";

export default function Pricing() {
  const [applyDiscount, setApplyDiscount] = useState(false);
  const { isDesktop } = useWindowSize();

  const handleToggle = () => {
    setApplyDiscount(!applyDiscount);
  };

  return (
    <Section id="pricing" title="Pricing" subtitle="Choose the plan that's right for you">
      <div className="flex justify-center mb-10 items-center gap-3">
        <span className="font-semibold">Apply discount</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <Label>
            <Switch
              checked={applyDiscount}
              onCheckedChange={handleToggle}
              className={cn(
                "data-[state=checked]:bg-green-500 data-[state=checked]:dark:bg-green-600"
              )}
            />
          </Label>
        </label>
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
              <div className="absolute top-0 right-0 bg-primary py-0.5 px-2 rounded-bl-xl rounded-tr-xl flex items-center">
                {plan.badgeLabel ? (
                  <span className="text-white font-sans font-semibold text-sm">
                    {plan.badgeLabel}
                  </span>
                ) : (
                  <>
                    <FaStar className="text-white" />
                    <span className="text-white ml-1 font-sans font-semibold">
                      Popular
                    </span>
                  </>
                )}
              </div>
            )}
            <div>
              <p className="text-base font-semibold text-muted-foreground">
                {plan.name}
              </p>
              {plan.period === "one-time" ? (
                <>
                  <p className="mt-6 flex items-center justify-center gap-x-2 flex-wrap">
                    <span className="text-5xl font-bold tracking-tight text-foreground">
                      {plan.price}
                    </span>
                  </p>
                  <p className="text-xs leading-5 text-muted-foreground text-center">
                    Never pay again
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-6 flex flex-col items-center justify-center gap-1">
                    {plan.trial && (
                      <span className="text-sm text-muted-foreground">{plan.trial}</span>
                    )}
                    <span className="flex items-center justify-center gap-x-2 flex-wrap">
                      <span className="text-5xl font-bold tracking-tight text-foreground">
                        {applyDiscount ? plan.yearlyPrice : plan.price}
                      </span>
                      <span className="text-sm font-semibold leading-6 tracking-wide text-muted-foreground">
                        / {applyDiscount && plan.yearlyPeriod ? plan.yearlyPeriod : plan.period}
                      </span>
                    </span>
                    {applyDiscount && plan.yearlyNote && (
                      <span className="text-xs text-muted-foreground">
                        ({plan.yearlyNote})
                      </span>
                    )}
                  </p>
                  <p className="text-xs leading-5 text-muted-foreground text-center">
                    {applyDiscount ? "billed annually" : "billed monthly"}
                  </p>
                </>
              )}
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
                href={plan.period === "one-time" ? plan.href : (applyDiscount ? plan.hrefYearly : plan.hrefMonthly)}
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
