"use client";

import { SectionHeader } from "@/components/section-header";
import { interceptOnCompactScreen } from "@/lib/desktopOnly";
import { requestLandingDemoActivateAfterScroll } from "@/lib/landingDemoSession";
import { scrollToDemoSection } from "@/lib/scrollToDemo";
import { siteConfig } from "@/lib/config";
import { cn } from "@/lib/utils";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  AtSign,
  Bell,
  Check,
  Coins,
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
  Sparkles,
  UserSearch,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { BlackFridayPricingCard } from "@/components/promo/BlackFridayPricingCard";
import { BLACK_FRIDAY_ANCHOR, SEE_BLACK_FRIDAY_EVENT, useBlackFridayActive } from "@/components/promo/useBlackFriday";
import { getOrCreateVisitorSessionId } from "@/lib/analytics/visitorSession";
import { prefetchCheckoutSession, warmCheckoutApi } from "@/lib/checkout/sessionClient";
import { checkoutEntryPage } from "@/lib/checkout/trackCheckoutStep";
import { BLACK_FRIDAY, blackFridayCents } from "@/lib/promo/blackFriday";
import { VenueMark, type Venue } from "./venue-mark";

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
  priceWeekly?: number;
  priceMonthly?: number;
  priceAnnual?: number;
  note?: string;
  buttonText: string;
  href?: string;
  isPopular?: boolean;
  badgeLabel?: string;
  includesLabel?: string;
  venuesLabel?: string;
  features: readonly PlanFeature[];
  jarvis?: { label: string; features: readonly PlanFeature[] };
};

type EnterprisePlan = { name: string; description: string; buttonText: string; href: string };

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
  tokens: Coins,
  jarvis: Sparkles,
  pulse: Activity,
  trader: UserSearch,
  mention: AtSign,
};

function FeatureList({ features }: { features: readonly PlanFeature[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {features.map((feature) => {
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
  );
}

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

function PlanPrice({
  plan,
  isFree,
  cycle,
  amount,
  savings,
  promoAnnual,
}: {
  plan: Plan;
  isFree: boolean;
  cycle: BillingCycle;
  /** Headline price: per week on weekly, per month otherwise. */
  amount: number;
  savings: Savings | null;
  /** First-year annual price while the Black Friday Special runs. */
  promoAnnual: number | null;
}) {
  const pill = "ml-1 self-center rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400";

  if (promoAnnual !== null && typeof plan.priceAnnual === "number") {
    return (
      <>
        <div className="mt-5 flex flex-wrap items-baseline gap-x-1.5">
          <AnimatedPrice value={formatUsd(promoAnnual)} />
          <span className="text-lg text-muted-foreground line-through decoration-1">{formatUsd(plan.priceAnnual)}</span>
          <span className="text-sm text-muted-foreground">/ first year</span>
          <span className={pill}>{BLACK_FRIDAY.percentOff}% off</span>
        </div>
        <div className="mt-2 flex min-h-6 items-center text-sm text-muted-foreground">
          <span>
            {formatUsd(promoAnnual / 12)}/mo for your first year · then {formatUsd(plan.priceAnnual)}/year
          </span>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mt-5 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
        <AnimatedPrice value={formatUsd(amount)} />
        {!isFree ? <span className="text-sm text-muted-foreground">/ {cycle === "weekly" ? "week" : "month"}</span> : null}
        {savings ? <span className={pill}>{savingsLabel(savings)}</span> : null}
      </div>

      <div className="mt-2 flex min-h-6 items-center text-sm text-muted-foreground">
        {isFree ? (
          <span>{plan.note}</span>
        ) : cycle === "annual" && typeof plan.priceAnnual === "number" ? (
          <span>Billed annually · You&apos;ll be charged {formatUsd(plan.priceAnnual)} per year</span>
        ) : cycle === "weekly" ? (
          <span>Billed weekly{plan.note ? ` · ${plan.note}` : ""}</span>
        ) : (
          <span>Billed monthly{plan.note ? ` · ${plan.note}` : ""}</span>
        )}
      </div>
    </>
  );
}

const WEEKS_PER_YEAR = 52;

type Savings = { monthsFree: number; percentOff: number };

function hasBothCycles(plan: Plan) {
  return typeof plan.priceMonthly === "number" && typeof plan.priceAnnual === "number";
}

function offersCycle(plan: Plan, cycle: BillingCycle) {
  if (cycle === "weekly") return typeof plan.priceWeekly === "number";
  if (cycle === "monthly") return typeof plan.priceMonthly === "number";
  return typeof plan.priceAnnual === "number";
}

function yearlyCost(plan: Plan, cycle: BillingCycle): number | null {
  if (!offersCycle(plan, cycle)) return null;
  if (cycle === "weekly") return (plan.priceWeekly as number) * WEEKS_PER_YEAR;
  if (cycle === "monthly") return (plan.priceMonthly as number) * 12;
  return plan.priceAnnual as number;
}

/**
 * A year on this cycle against a year of weekly billing, falling back to
 * monthly when there's no weekly price. $49/mo against $19/wk ($988/yr) is
 * 5 months free, 40% off.
 */
function savingsFor(plan: Plan, cycle: BillingCycle): Savings | null {
  if (cycle === "weekly") return null;
  const base = yearlyCost(plan, "weekly") ?? (cycle === "annual" ? yearlyCost(plan, "monthly") : null);
  const cost = yearlyCost(plan, cycle);
  if (!base || cost === null || cost >= base) return null;
  const share = 1 - cost / base;
  return { monthsFree: Math.round(share * 12), percentOff: Math.round(share * 100) };
}

function savingsLabel({ monthsFree, percentOff }: Savings) {
  return `${monthsFree} ${monthsFree === 1 ? "month" : "months"} free · ${percentOff}% off`;
}

function salePrice(dollars: number) {
  return blackFridayCents(Math.round(dollars * 100)) / 100;
}

const CYCLE_LABELS: Record<BillingCycle, string> = { weekly: "Weekly", monthly: "Monthly", annual: "Annual" };

function CycleToggle({
  cycles,
  cycle,
  onChange,
  percentOff,
  promo,
}: {
  cycles: readonly BillingCycle[];
  cycle: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
  /** Smallest saving across the plans for each cycle, so the toggle never overstates it. */
  percentOff: Partial<Record<BillingCycle, number>>;
  promo: boolean;
}) {
  const options = cycles.map((value) => ({ value, label: CYCLE_LABELS[value] }));
  return (
    <div
      role="radiogroup"
      aria-label="Billing period"
      className="mx-auto inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 p-1"
    >
      {options.map((option) => {
        const active = cycle === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative flex h-8 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active ? (
              <motion.span
                layoutId="pricing-cycle-pill"
                className="absolute inset-0 rounded-full bg-background shadow-sm ring-1 ring-border"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            ) : null}
            <span className="relative">{option.label}</span>
            {option.value === "annual" && promo ? (
              <span className="relative rounded-full bg-gradient-to-r from-secondary to-violet-500 px-1.5 py-0.5 text-[11px] font-medium text-white">
                {BLACK_FRIDAY.percentOff}% off
              </span>
            ) : percentOff[option.value] ? (
              <span className="relative rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                Save {percentOff[option.value]}%
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** On the homepage, scroll to the demo and start it (same as the hero's Try For Free); elsewhere follow the link. */
function startHomepageDemo(event: MouseEvent<HTMLAnchorElement>) {
  if (interceptOnCompactScreen(event)) return;
  if (!document.getElementById("demo")) return;
  event.preventDefault();
  requestLandingDemoActivateAfterScroll();
  scrollToDemoSection();
}

function warmStripeJs() {
  const key =
    (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_STRIPE_DEV_PUBLISHABLE_KEY) ||
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key || typeof window === "undefined") return;
  void import("@stripe/stripe-js").then(({ loadStripe }) => loadStripe(key));
}

function checkoutPrefetchBody(href: string) {
  try {
    const url = new URL(href, typeof window !== "undefined" ? window.location.origin : "https://lycheedata.com");
    if (url.pathname !== "/checkout") return null;
    const plan = url.searchParams.get("plan") || "";
    if (!plan) return null;
    return {
      plan,
      cycle: url.searchParams.get("cycle") || "",
      from: typeof window !== "undefined" ? checkoutEntryPage() || window.location.pathname : undefined,
      visitorSessionId: typeof window !== "undefined" ? getOrCreateVisitorSessionId() || undefined : undefined,
      referral:
        typeof window !== "undefined" && (window as Window & { promotekit_referral?: string }).promotekit_referral
          ? String((window as Window & { promotekit_referral?: string }).promotekit_referral)
          : url.searchParams.get("ref") || url.searchParams.get("client_reference_id") || undefined,
    };
  } catch {
    return null;
  }
}

/** Stripe.js + Checkout Session create overlap the hover/click before /checkout mounts. */
function warmCheckout(href: string) {
  warmStripeJs();
  const body = checkoutPrefetchBody(href);
  if (body) prefetchCheckoutSession(body);
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
  const warmsCheckout = typeof href === "string" && href.startsWith("/checkout");
  const warm = warmsCheckout ? () => warmCheckout(href) : undefined;

  if (!action) {
    return isCurrent ? (
      <button type="button" disabled className={className}>
        {content}
      </button>
    ) : warmsCheckout ? (
      <Link
        href={href}
        prefetch
        onClick={onClick}
        onPointerEnter={warm}
        onFocus={warm}
        onPointerDown={warm}
        className={className}
      >
        {content}
      </Link>
    ) : (
      <a href={href} onClick={onClick} className={className}>
        {content}
      </a>
    );
  }
  if (action.href && !action.disabled) {
    const actionWarms = action.href.startsWith("/checkout");
    const actionWarm = actionWarms ? () => warmCheckout(action.href!) : undefined;
    return actionWarms ? (
      <Link
        href={action.href}
        prefetch
        onPointerEnter={actionWarm}
        onFocus={actionWarm}
        onPointerDown={actionWarm}
        className={className}
      >
        {content}
      </Link>
    ) : (
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
  defaultCycle,
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
  /** Starting position of the weekly / monthly / annual toggle. Monthly unless the buyer came from the Black Friday offer. */
  defaultCycle?: BillingCycle;
  /** Highlights the member's tier; `cycle` marks the exact plan as current. */
  currentPlan?: { tier?: string | null; cycle?: string | null } | null;
  /** Replaces the default checkout link for each paid tier. */
  getAction?: (args: PricingTierActionArgs) => PricingTierAction | null;
  className?: string;
} = {}) {
  const [toggleCycle, setToggleCycle] = useState<BillingCycle>(defaultCycle ?? "monthly");
  const promoActive = useBlackFridayActive();

  // Keep the checkout serverless function + Stripe price cache warm while pricing is on screen.
  useEffect(() => {
    warmCheckoutApi();
  }, []);

  // The Black Friday banner links to the offer; arriving that way opens the annual plans it applies to.
  useEffect(() => {
    if (!promoActive) return undefined;
    const showAnnual = () => setToggleCycle("annual");
    const onHash = () => {
      if (window.location.hash === `#${BLACK_FRIDAY_ANCHOR}`) showAnnual();
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    window.addEventListener(SEE_BLACK_FRIDAY_EVENT, showAnnual);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener(SEE_BLACK_FRIDAY_EVENT, showAnnual);
    };
  }, [promoActive]);
  const plansRef = useRef<HTMLDivElement>(null);
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
  const showCycleToggle = plans.some(hasBothCycles);
  const toggledPlans = plans.filter(hasBothCycles);
  const toggleCycles = (["weekly", "monthly", "annual"] as const).filter((value) =>
    toggledPlans.some((plan) => offersCycle(plan, value)),
  );
  const togglePercentOff: Partial<Record<BillingCycle, number>> = {};
  for (const value of toggleCycles) {
    const offs = toggledPlans.map((plan) => savingsFor(plan, value)?.percentOff ?? 0);
    const smallest = offs.length ? Math.min(...offs) : 0;
    if (smallest > 0) togglePercentOff[value] = smallest;
  }
  const showPromo = promoActive && plans.some((plan) => typeof plan.priceAnnual === "number");

  const seePromoPlans = () => {
    setToggleCycle("annual");
    plansRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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

        <div
          className={cn(
            "mx-auto flex w-full flex-col gap-4",
            plans.length > 3 ? "max-w-7xl" : plans.length > 2 ? "max-w-6xl" : "max-w-4xl",
          )}
        >
          {showPromo ? <BlackFridayPricingCard onSeePlans={seePromoPlans} /> : null}
          {showCycleToggle ? (
            <div className={cn("mb-2 flex justify-center", showPromo && "mt-2")}>
              <CycleToggle
                cycles={toggleCycles}
                cycle={toggleCycle}
                onChange={setToggleCycle}
                percentOff={togglePercentOff}
                promo={showPromo}
              />
            </div>
          ) : null}
          <div
            ref={plansRef}
            className={cn(
              "grid scroll-mt-28 gap-4",
              plans.length > 3 ? "md:grid-cols-2 xl:grid-cols-4" : plans.length > 2 ? "md:grid-cols-3" : "md:grid-cols-2",
            )}
          >
            {plans.map((plan) => {
              const isFree = plan.tier === "free";
              const hasToggle = hasBothCycles(plan);
              const cycle: BillingCycle =
                hasToggle && offersCycle(plan, toggleCycle)
                  ? toggleCycle
                  : hasToggle
                    ? "monthly"
                    : typeof plan.priceAnnual === "number"
                      ? "annual"
                      : "monthly";
              const href = isFree
                ? plan.href || "/#demo"
                : `/checkout?plan=${encodeURIComponent(plan.tier)}&cycle=${cycle}`;
              const isCurrentTier = !!currentTier && currentTier === plan.tier;
              const isCurrent = isCurrentTier && currentCycle === cycle;
              const action = !isFree && getAction ? getAction({ tier: plan.tier, cycle, href, isCurrentTier, isCurrent }) : null;

              const amount = isFree
                ? plan.price ?? 0
                : cycle === "weekly"
                  ? plan.priceWeekly ?? 0
                  : cycle === "annual" && typeof plan.priceAnnual === "number"
                    ? plan.priceAnnual / 12
                    : plan.priceMonthly ?? 0;
              const savings = isFree ? null : savingsFor(plan, cycle);
              const promoAnnual =
                promoActive && !isFree && cycle === "annual" && typeof plan.priceAnnual === "number"
                  ? salePrice(plan.priceAnnual)
                  : null;

              return (
                <div
                  key={plan.tier}
                  className={cn(
                    "relative flex flex-col rounded-2xl border p-6",
                    plan.isPopular
                      ? "dark border-secondary/50 bg-[#0e1736] text-foreground shadow-[0_18px_40px_-18px_rgba(30,58,160,0.65)]"
                      : "border-border bg-background",
                    isCurrentTier && "ring-2 ring-[#0d99ff]",
                  )}
                >
                  {promoAnnual !== null ? (
                    <motion.span
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="absolute -top-2.5 right-5 inline-flex items-center rounded-full bg-gradient-to-r from-secondary to-violet-500 px-2.5 py-1 font-mono text-[10px] font-medium uppercase leading-none tracking-[0.14em] text-white shadow-[0_6px_14px_-6px_rgba(47,111,237,0.7)]"
                    >
                      Limited time
                    </motion.span>
                  ) : null}
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold tracking-tight text-foreground">{plan.name}</h3>
                    {isCurrentTier ? (
                      <span className="inline-flex h-5 items-center rounded-full bg-[#0d99ff] px-2 text-[11px] font-medium text-white">
                        Your plan
                      </span>
                    ) : plan.badgeLabel ? (
                      <span className="inline-flex h-5 items-center rounded-full border border-secondary/25 bg-secondary/10 px-2 text-[11px] font-medium text-secondary dark:border-secondary/40 dark:bg-secondary/20 dark:text-blue-200">
                        {plan.badgeLabel}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-sm leading-5 text-muted-foreground md:min-h-[3.75rem]">{plan.description}</p>

                  <PlanPrice
                    plan={plan}
                    isFree={isFree}
                    cycle={cycle}
                    amount={amount}
                    savings={savings}
                    promoAnnual={promoAnnual}
                  />

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
                    <FeatureList features={plan.features} />
                    {plan.jarvis ? (
                      <div className="mt-2 flex flex-col gap-3 border-t border-border pt-5">
                        <p className="text-sm text-muted-foreground">{plan.jarvis.label}</p>
                        <FeatureList features={plan.jarvis.features} />
                      </div>
                    ) : null}
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
