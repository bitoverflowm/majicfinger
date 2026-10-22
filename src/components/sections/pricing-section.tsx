"use client";

import { SectionHeader } from "@/components/section-header";
import { requestLandingDemoActivateAfterScroll } from "@/lib/landingDemoSession";
import { scrollToDemoSection } from "@/lib/scrollToDemo";
import { siteConfig } from "@/lib/config";
import { cn } from "@/lib/utils";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  Download,
  GitFork,
  Globe,
  HardDrive,
  LayoutDashboard,
  LifeBuoy,
  LineChart,
  Mail,
  Package,
  Plug,
  Radio,
  Rows3,
  Sigma,
  type LucideIcon,
} from "lucide-react";
import { useState, type MouseEvent } from "react";

export type BillingCycle = "weekly" | "monthly" | "annual";

export type PricingTierAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  busy?: boolean;
  hint?: string;
};

export type PricingTierActionArgs = {
  tier: string;
  cycle: BillingCycle;
  href: string;
  isCurrentTier: boolean;
  isCurrent: boolean;
};

type PlanFeature = { icon: string; text: string };

type Plan = {
  tier: string;
  name: string;
  description: string;
  price?: number;
  priceMonthly?: number;
  priceAnnual?: number;
  note?: string;
  buttonText: string;
  href?: string;
  isPopular?: boolean;
  includesLabel?: string;
  venuesLabel?: string;
  features: readonly PlanFeature[];
};

type EnterprisePlan = { name: string; description: string; buttonText: string; href: string };
type Venue = {
  name: string;
  src?: string;
  mark?: string;
  tileClass?: string;
  badge?: string;
  description?: string;
  includes?: readonly { name: string; detail: string }[];
  links?: readonly { label: string; href: string }[];
};

function VenueMark({ venue, className }: { venue: Venue; className?: string }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden font-bold leading-none",
        venue.tileClass,
        className,
      )}
    >
      {venue.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={venue.src} alt="" className="size-full object-contain" />
      ) : (
        venue.mark
      )}
    </span>
  );
}

function VenueTile({ venue }: { venue: Venue }) {
  const includes = venue.includes ?? [];
  const links = venue.links ?? [];
  const tile = <VenueMark venue={venue} className="size-[18px] rounded-[5px] text-[10px]" />;
  const triggerClass =
    "block rounded-[5px] transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50";

  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>
        {links[0] ? (
          <a href={links[0].href} aria-label={venue.name} className={triggerClass}>
            {tile}
          </a>
        ) : (
          <button type="button" aria-label={venue.name} className={cn(triggerClass, "cursor-default")}>
            {tile}
          </button>
        )}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          aria-label={[venue.name, venue.badge, venue.description].filter(Boolean).join(". ")}
          side="top"
          sideOffset={10}
          collisionPadding={12}
          className="z-50 w-72 origin-[--radix-tooltip-content-transform-origin] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-[0_18px_40px_-14px_rgba(16,24,40,0.3)] animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1"
        >
          <div className="flex items-start gap-3 p-4 pb-3">
            <VenueMark venue={venue} className="size-8 rounded-lg p-1 text-sm" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{venue.name}</p>
                {venue.badge ? (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {venue.badge}
                  </span>
                ) : null}
              </div>
              {venue.description ? (
                <p className="mt-0.5 text-xs leading-4 text-muted-foreground">{venue.description}</p>
              ) : null}
            </div>
          </div>
          {includes.length ? (
            <div className="px-4 pb-3.5">
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">Includes</p>
              <ul className="flex flex-col gap-1.5">
                {includes.map((item) => (
                  <li key={item.name} className="flex gap-2 text-xs leading-4">
                    <span className="mt-[5px] size-1 shrink-0 rounded-full bg-secondary" aria-hidden />
                    <span>
                      <span className="font-medium text-foreground">{item.name}</span>
                      <span className="text-muted-foreground"> · {item.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {links.length ? (
            <div className="flex flex-col gap-0.5 border-t border-border bg-muted/40 p-1.5">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="group flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-background"
                >
                  {link.label}
                  <ArrowUpRight
                    className="size-3.5 text-muted-foreground transition-colors group-hover:text-secondary"
                    aria-hidden
                  />
                </a>
              ))}
            </div>
          ) : null}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

const FEATURE_ICONS: Record<string, LucideIcon> = {
  rows: Rows3,
  chart: LineChart,
  dashboard: LayoutDashboard,
  plug: Plug,
  download: Download,
  sigma: Sigma,
  fork: GitFork,
  live: Radio,
  alert: Bell,
  storage: HardDrive,
  publish: Globe,
  mail: Mail,
  bulk: Package,
  support: LifeBuoy,
};

function formatUsd(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  return `$${Number.isInteger(rounded) ? rounded.toLocaleString("en-US") : rounded.toFixed(2)}`;
}

/** `**bold**` segments in feature copy. */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/(\*\*[^*]+\*\*)/g)
        .filter(Boolean)
        .map((part, index) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <span key={index} className="font-medium text-foreground">
              {part.slice(2, -2)}
            </span>
          ) : (
            <span key={index}>{part}</span>
          ),
        )}
    </>
  );
}

function AnimatedPrice({ value }: { value: string }) {
  return (
    <motion.span
      key={value}
      className="text-3xl font-semibold tracking-tight text-foreground"
      initial={{ opacity: 0, y: 4, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
    >
      {value}
    </motion.span>
  );
}

/** On the homepage, scroll to the demo and start it (same as the hero's Try For Free); elsewhere follow the link. */
function startHomepageDemo(event: MouseEvent<HTMLAnchorElement>) {
  if (!document.getElementById("demo")) return;
  event.preventDefault();
  requestLandingDemoActivateAfterScroll();
  scrollToDemoSection();
}

function PlanButton({
  action,
  href,
  label,
  isCurrent,
  variant,
  onClick,
}: {
  action: PricingTierAction | null;
  href: string;
  label: string;
  isCurrent: boolean;
  variant: "primary" | "subtle";
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const disabled = !!action?.disabled || (!action && isCurrent);
  const className = cn(
    "flex h-10 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-medium tracking-wide transition-all ease-out active:scale-[0.98] disabled:cursor-default disabled:active:scale-100",
    disabled
      ? "border border-border bg-muted text-muted-foreground"
      : variant === "primary"
        ? "bg-gradient-to-r from-secondary to-violet-500 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_4px_10px_-4px_rgba(59,91,219,0.55)] hover:brightness-110"
        : "border border-border bg-muted text-foreground hover:bg-muted/70",
  );
  const text = action?.label ?? (isCurrent ? "Your plan" : label);
  const content = (
    <>
      {isCurrent ? <Check className="size-4" aria-hidden /> : null}
      {action?.busy ? "One moment…" : text}
    </>
  );

  if (!action) {
    return isCurrent ? (
      <button type="button" disabled className={className}>
        {content}
      </button>
    ) : (
      <a href={href} onClick={onClick} className={className}>
        {content}
      </a>
    );
  }
  if (action.href && !action.disabled) {
    return (
      <a href={action.href} className={className}>
        {content}
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={action.onClick}
      disabled={action.disabled || action.busy}
      aria-busy={action.busy || undefined}
      className={className}
    >
      {content}
    </button>
  );
}

export function PricingSection({
  title: titleOverride,
  description: descriptionOverride,
  id = "pricing",
  showHeader = true,
  includeFree = true,
  defaultCycle = "monthly",
  currentPlan = null,
  getAction,
  className,
}: {
  title?: string;
  description?: string;
  id?: string;
  showHeader?: boolean;
  /** The Free column links to the demo; hide it where there's no free plan to pick (billing). */
  includeFree?: boolean;
  /** Starting position of the monthly / yearly toggle. */
  defaultCycle?: BillingCycle;
  /** Highlights the member's tier; `cycle` marks the exact plan as current. */
  currentPlan?: { tier?: string | null; cycle?: string | null } | null;
  /** Replaces the default checkout link for each paid tier. */
  getAction?: (args: PricingTierActionArgs) => PricingTierAction | null;
  className?: string;
} = {}) {
  const [toggleCycle, setToggleCycle] = useState<"monthly" | "annual">(
    defaultCycle === "annual" ? "annual" : "monthly",
  );
  const currentTier = String(currentPlan?.tier || "").toLowerCase();
  const currentCycle = String(currentPlan?.cycle || "").toLowerCase();

  const config = siteConfig.pricingSection as unknown as {
    title: string;
    description: string;
    plans: readonly Plan[];
    enterprise: EnterprisePlan;
    venues: readonly Venue[];
  };
  const title = titleOverride?.trim() || config.title;
  const description = descriptionOverride?.trim() || config.description;
  const plans = config.plans.filter((plan) => includeFree || plan.tier !== "free");
  const { enterprise, venues } = config;

  return (
    <TooltipPrimitive.Provider delayDuration={120} skipDelayDuration={400}>
      <section
        id={id}
        className={cn("relative flex w-full flex-col items-center justify-center gap-10 px-6 pb-10", className)}
      >
        {showHeader && (
          <SectionHeader>
            <h2 className="text-balance text-center text-3xl font-medium tracking-tighter md:text-4xl">{title}</h2>
            <p className="text-balance text-center font-medium text-muted-foreground">{description}</p>
          </SectionHeader>
        )}

        <div className={cn("mx-auto flex w-full flex-col gap-4", plans.length > 2 ? "max-w-6xl" : "max-w-4xl")}>
          <div className={cn("grid gap-4", plans.length > 2 ? "md:grid-cols-3" : "md:grid-cols-2")}>
            {plans.map((plan) => {
              const isFree = plan.tier === "free";
              const hasToggle = typeof plan.priceMonthly === "number" && typeof plan.priceAnnual === "number";
              const cycle: BillingCycle = hasToggle ? toggleCycle : typeof plan.priceAnnual === "number" ? "annual" : "monthly";
              const href = isFree
                ? plan.href || "/#demo"
                : `/checkout?plan=${encodeURIComponent(plan.tier)}&cycle=${cycle}`;
              const isCurrentTier = !!currentTier && currentTier === plan.tier;
              const isCurrent = isCurrentTier && currentCycle === cycle;
              const action = !isFree && getAction ? getAction({ tier: plan.tier, cycle, href, isCurrentTier, isCurrent }) : null;

              const monthly =
                isFree
                  ? plan.price ?? 0
                  : cycle === "annual" && typeof plan.priceAnnual === "number"
                    ? plan.priceAnnual / 12
                    : plan.priceMonthly ?? 0;
              const savings =
                hasToggle && plan.priceMonthly && plan.priceAnnual
                  ? Math.round((1 - plan.priceAnnual / (plan.priceMonthly * 12)) * 100)
                  : 0;

              return (
                <div
                  key={plan.tier}
                  className={cn(
                    "flex flex-col rounded-2xl border p-6",
                    plan.isPopular
                      ? "border-secondary/30 bg-gradient-to-b from-secondary/[0.07] to-secondary/[0.02] shadow-[0_12px_32px_-16px_rgba(59,91,219,0.35)] dark:from-secondary/[0.14] dark:to-secondary/[0.04]"
                      : "border-border bg-background",
                    isCurrentTier && "ring-2 ring-[#0d99ff]",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold tracking-tight text-foreground">{plan.name}</h3>
                    {isCurrentTier ? (
                      <span className="inline-flex h-5 items-center rounded-full bg-[#0d99ff] px-2 text-[11px] font-medium text-white">
                        Your plan
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-sm leading-5 text-muted-foreground md:min-h-[3.75rem]">{plan.description}</p>

                  <div className="mt-5 flex items-baseline gap-1.5">
                    <AnimatedPrice value={formatUsd(monthly)} />
                    {!isFree ? <span className="text-sm text-muted-foreground">/ month</span> : null}
                  </div>

                  <div className="mt-2 flex min-h-6 items-center text-sm text-muted-foreground">
                    {hasToggle ? (
                      <label className="flex cursor-pointer items-center gap-2">
                        <SwitchPrimitives.Root
                          checked={toggleCycle === "annual"}
                          onCheckedChange={(on) => setToggleCycle(on ? "annual" : "monthly")}
                          aria-label="Billed yearly"
                          className="inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 data-[state=checked]:bg-secondary data-[state=unchecked]:bg-muted-foreground/30 dark:data-[state=unchecked]:bg-white/25"
                        >
                          <SwitchPrimitives.Thumb className="pointer-events-none block size-3 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[13px] data-[state=unchecked]:translate-x-px" />
                        </SwitchPrimitives.Root>
                        <span>
                          Billed yearly
                          {toggleCycle === "annual" && plan.priceAnnual ? ` · ${formatUsd(plan.priceAnnual)}/year` : ""}
                        </span>
                        {savings > 0 ? (
                          <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                            Save {savings}%
                          </span>
                        ) : null}
                      </label>
                    ) : isFree ? (
                      <span>{plan.note}</span>
                    ) : (
                      <span>
                        {plan.priceAnnual ? `${formatUsd(plan.priceAnnual)} billed yearly · ` : ""}
                        {plan.note}
                      </span>
                    )}
                  </div>

                  <div className="mt-6 flex flex-col gap-3">
                    {plan.venuesLabel ? (
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm text-muted-foreground">
                        <span>{plan.venuesLabel}</span>
                        <span className="flex items-center gap-1.5">
                          {venues.map((venue) => (
                            <VenueTile key={venue.name} venue={venue} />
                          ))}
                        </span>
                      </div>
                    ) : null}
                    {plan.includesLabel ? <p className="text-sm text-muted-foreground">{plan.includesLabel}</p> : null}
                    <ul className="flex flex-col gap-2.5">
                      {plan.features.map((feature) => {
                        const Icon = FEATURE_ICONS[feature.icon] ?? Check;
                        return (
                          <li key={feature.text} className="flex gap-2.5 text-sm leading-5 text-foreground/80">
                            <Icon className="mt-0.5 size-4 shrink-0 text-secondary" strokeWidth={1.75} aria-hidden />
                            <span>
                              <RichText text={feature.text} />
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div className="mt-auto flex flex-col gap-2 pt-8">
                    <PlanButton
                      action={action}
                      href={href}
                      label={plan.buttonText}
                    isCurrent={isCurrent}
                    variant={isFree ? "subtle" : "primary"}
                    onClick={isFree ? startHomepageDemo : undefined}
                  />
                    {action?.hint ? <p className="text-center text-xs text-muted-foreground">{action.hint}</p> : null}
                  </div>
                </div>
              );
            })}
          </div>

          {enterprise ? (
            <div className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
              <div className="flex flex-col gap-1.5">
                <h3 className="text-lg font-semibold tracking-tight text-foreground">{enterprise.name}</h3>
                <p className="max-w-3xl text-sm leading-5 text-muted-foreground">{enterprise.description}</p>
              </div>
              <a
                href={enterprise.href}
                className="inline-flex h-9 w-fit shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-4 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
              >
                {enterprise.buttonText}
                <ArrowRight className="size-4" aria-hidden />
              </a>
            </div>
          ) : null}
        </div>
      </section>
    </TooltipPrimitive.Provider>
  );
}
