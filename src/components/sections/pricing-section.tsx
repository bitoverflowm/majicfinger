"use client";

import { SectionHeader } from "@/components/section-header";
import { siteConfig } from "@/lib/config";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";

type BillingCycle = "weekly" | "monthly" | "annual";

interface TabsProps {
  activeTab: BillingCycle;
  setActiveTab: (tab: BillingCycle) => void;
  className?: string;
}

function PricingTabs({ activeTab, setActiveTab, className }: TabsProps) {
  const tabs: BillingCycle[] = ["weekly", "monthly", "annual"];
  const discounts: Partial<Record<BillingCycle, string>> = {
    monthly: "-10%",
    annual: "-25%",
  };

  return (
    <div
      className={cn(
        "relative flex w-fit items-center rounded-full border p-0.5 backdrop-blur-sm cursor-pointer h-9 flex-row bg-muted",
        className,
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => setActiveTab(tab)}
          className={cn(
            "relative z-[1] px-2 h-8 flex items-center justify-center cursor-pointer",
            { "z-0": activeTab === tab },
          )}
        >
          {activeTab === tab && (
            <motion.div
              layoutId="active-tab"
              className="absolute inset-0 rounded-full bg-white dark:bg-[#3F3F46] shadow-md border border-border"
              transition={{
                duration: 0.2,
                type: "spring",
                stiffness: 300,
                damping: 25,
                velocity: 2,
              }}
            />
          )}
          <span
            className={cn(
              "relative block text-sm font-medium duration-200 shrink-0",
              activeTab === tab ? "text-primary" : "text-muted-foreground",
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {discounts[tab] && (
              <span className="ml-2 text-xs font-semibold text-secondary bg-secondary/40 py-0.5 w-[calc(100%+1rem)] px-1 rounded-full">
                {discounts[tab]}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}

type LifetimeAccess = {
  href: string;
  title: string;
  badge: string;
  price: string;
  priceNote: string;
  headline: string;
  description: string;
  buttonText: string;
  features: string[];
};

export function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("weekly");
  const { title, description, pricingItems } = siteConfig.pricingSection;
  const lifetimeAccess = (siteConfig.pricingSection as { lifetimeAccess?: LifetimeAccess }).lifetimeAccess;

  const computedTiers = useMemo(() => {
    return pricingItems.map((tier) => {
      if (tier.period === "one-time") {
        return {
          ...tier,
          display: {
            price: tier.priceMonthly ?? "",
            suffix: "one-time",
            note: null as string | null,
            href: tier.hrefMonthly,
          },
        };
      }

      const display =
        billingCycle === "weekly"
          ? {
              price: tier.priceWeekly ?? tier.priceMonthly ?? "",
              suffix: "week",
              note: null,
              href: tier.hrefWeekly,
            }
          : billingCycle === "monthly"
            ? {
                price: tier.priceMonthly ?? "",
                suffix: "month",
                note: "billed monthly",
                href: tier.hrefMonthly,
              }
            : {
                price: tier.priceAnnual ?? "",
                suffix: "year",
                note: tier.yearlyNote ?? "billed annually",
                href: tier.hrefAnnual,
              };

      return { ...tier, display };
    });
  }, [billingCycle, pricingItems]);

  const PriceDisplay = ({ price }: { price: string }) => {
    return (
      <motion.span
        key={`${billingCycle}:${price}`}
        className="text-4xl font-semibold"
        initial={{
          opacity: 0,
          x: billingCycle === "annual" ? -10 : 10,
          filter: "blur(5px)",
        }}
        animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      >
        {price}
      </motion.span>
    );
  };

  return (
    <section
      id="pricing"
      className="flex flex-col items-center justify-center gap-10 pb-10 w-full relative"
    >
      <SectionHeader>
        <h2 className="text-3xl md:text-4xl font-medium tracking-tighter text-center text-balance">
          {title}
        </h2>
        <p className="text-muted-foreground text-center text-balance font-medium">
          {description}
        </p>
      </SectionHeader>

      <div className="relative w-full h-full">
        <div className="absolute -top-14 left-1/2 -translate-x-1/2">
          <PricingTabs
            activeTab={billingCycle}
            setActiveTab={setBillingCycle}
            className="mx-auto"
          />
        </div>

        <div className="grid min-[650px]:grid-cols-2 min-[900px]:grid-cols-3 gap-4 w-full max-w-6xl mx-auto px-6">
          {computedTiers.map((tier) => (
            <div
              key={tier.name}
              className={cn(
                "rounded-xl grid grid-rows-[180px_auto_1fr] relative h-fit min-[650px]:h-full min-[900px]:h-fit",
                tier.isPopular
                  ? "md:shadow-[0px_61px_24px_-10px_rgba(0,0,0,0.01),0px_34px_20px_-8px_rgba(0,0,0,0.05),0px_15px_15px_-6px_rgba(0,0,0,0.09),0px_4px_8px_-2px_rgba(0,0,0,0.10),0px_0px_0px_1px_rgba(0,0,0,0.08)] bg-accent"
                  : "bg-[#F3F4F6] dark:bg-[#F9FAFB]/[0.02] border border-border",
              )}
            >
              <div className="flex flex-col gap-4 p-4">
                <p className="text-sm">
                  {tier.name}
                  {tier.isPopular && (
                    <span className="bg-gradient-to-b from-secondary/50 from-[1.92%] to-secondary to-[100%] text-white h-6 inline-flex w-fit items-center justify-center px-2 rounded-full text-sm ml-2 shadow-[0px_6px_6px_-3px_rgba(0,0,0,0.08),0px_3px_3px_-1.5px_rgba(0,0,0,0.08),0px_1px_1px_-0.5px_rgba(0,0,0,0.08),0px_0px_0px_1px_rgba(255,255,255,0.12)_inset,0px_1px_0px_0px_rgba(255,255,255,0.12)_inset]">
                      {tier.badgeLabel ?? "Popular"}
                    </span>
                  )}
                </p>

                <div className="flex items-baseline mt-2">
                  <PriceDisplay price={tier.display.price} />
                  <span className="ml-2">/{tier.display.suffix}</span>
                </div>

                {tier.display.note && (
                  <p className="text-xs text-muted-foreground">{tier.display.note}</p>
                )}

                <p className="text-sm mt-2">{tier.description}</p>
              </div>

              <div className="flex flex-col gap-2 p-4">
                <a
                  href={tier.display.href}
                  className={cn(
                    "h-10 w-full flex items-center justify-center text-sm font-normal tracking-wide rounded-full px-4 cursor-pointer transition-all ease-out active:scale-95",
                    tier.isPopular
                      ? "bg-secondary text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)]"
                      : "bg-primary text-primary-foreground shadow-[0px_1px_2px_0px_rgba(255,255,255,0.16)_inset,0px_3px_3px_-1.5px_rgba(16,24,40,0.24),0px_1px_1px_-0.5px_rgba(16,24,40,0.20)]",
                  )}
                >
                  {tier.buttonText}
                </a>
              </div>

              <hr className="border-border dark:border-white/20" />

              <div className="p-4">
                <ul className="space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <div
                        className={cn(
                          "size-5 rounded-full border border-primary/20 flex items-center justify-center",
                          tier.isPopular && "bg-muted-foreground/40 border-border",
                        )}
                      >
                        <div className="size-3 flex items-center justify-center">
                          <svg
                            width="8"
                            height="7"
                            viewBox="0 0 8 7"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="block dark:hidden"
                          >
                            <path
                              d="M1.5 3.48828L3.375 5.36328L6.5 0.988281"
                              stroke="#101828"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>

                          <svg
                            width="8"
                            height="7"
                            viewBox="0 0 8 7"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="hidden dark:block"
                          >
                            <path
                              d="M1.5 3.48828L3.375 5.36328L6.5 0.988281"
                              stroke="#FAFAFA"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      </div>
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {lifetimeAccess && (
          <div className="mt-14 w-full border-y border-border bg-gradient-to-br from-accent via-accent/80 to-muted/30 dark:from-accent/30 dark:via-background dark:to-muted/20 py-10 md:py-12 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 lg:flex-row lg:items-stretch lg:justify-between lg:gap-12">
              <div className="flex min-w-0 flex-1 flex-col gap-3 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {lifetimeAccess.badge}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">{lifetimeAccess.title}</span>
                </div>
                <h3 className="text-balance text-2xl font-medium tracking-tighter text-foreground md:text-3xl">
                  {lifetimeAccess.headline}
                </h3>
                <p className="max-w-2xl text-sm font-medium leading-relaxed text-muted-foreground md:text-base">
                  {lifetimeAccess.description}
                </p>
                <ul className="mt-2 space-y-2">
                  {lifetimeAccess.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-foreground/90">
                      <span
                        className="mt-1.5 size-1.5 shrink-0 rounded-full bg-secondary"
                        aria-hidden
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex w-full shrink-0 flex-col justify-center gap-4 rounded-xl border border-border bg-background/90 p-6 shadow-sm backdrop-blur-sm dark:bg-background/60 lg:max-w-sm">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">One-time</p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-4xl font-semibold tracking-tight">{lifetimeAccess.price}</span>
                    <span className="text-sm text-muted-foreground">/{lifetimeAccess.priceNote}</span>
                  </div>
                </div>
                <a
                  href={lifetimeAccess.href}
                  className="flex h-11 w-full items-center justify-center rounded-full bg-secondary px-4 text-sm font-medium tracking-wide text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.24)] transition-all ease-out hover:opacity-95 active:scale-[0.98]"
                >
                  {lifetimeAccess.buttonText}
                </a>
                <p className="text-center text-xs text-muted-foreground">
                  Elite-level product access for life. Large or dedicated datasets may be quoted separately.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

