"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { loadStripe } from "@stripe/stripe-js";
import {
  CheckoutElementsProvider,
  ContactDetailsElement,
  PaymentElement,
  useCheckoutElements,
} from "@stripe/react-stripe-js/checkout";
import { ArrowLeft, ArrowUpRight, Check, Loader2, Lock, Tag, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { landingPageV2Config } from "@/lib/landingPageV2Config";
import { flushJourneyQueue } from "@/lib/analytics/journeyClient";
import { getOrCreateVisitorSessionId } from "@/lib/analytics/visitorSession";
import { checkoutEntryPage, msSinceCheckoutClick, trackCheckoutStep } from "@/lib/checkout/trackCheckoutStep";
import { isKnownCheckoutQuery } from "@/lib/stripe/checkoutPlanQuery";

const stripePromises = new Map();
/** Match server `stripePublishableKey()`: prefer the dev publishable key outside production builds. */
const ENV_PUBLISHABLE_KEY =
  (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_STRIPE_DEV_PUBLISHABLE_KEY) ||
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  "";

function stripeFor(publishableKey) {
  if (!publishableKey) return null;
  if (!stripePromises.has(publishableKey)) stripePromises.set(publishableKey, loadStripe(publishableKey));
  return stripePromises.get(publishableKey);
}

// Start Stripe.js as soon as this chunk loads, not after the session API returns.
if (typeof window !== "undefined" && ENV_PUBLISHABLE_KEY) {
  stripeFor(ENV_PUBLISHABLE_KEY);
}

/** Past this, the buyer is offered Stripe's hosted checkout page instead. */
const SLOW_FORM_MS = 5000;

function postCheckoutSession(body) {
  return fetch("/api/checkout/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(async (res) => ({ ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) }));
}

/** One Elements session per plan for the life of the tab (avoids duplicate Stripe sessions on remount). */
const sessionRequests = new Map();

function requestCheckoutSession(body) {
  const key = `${body.plan}:${body.cycle}:${body.hosted ? "hosted" : "elements"}`;
  if (!sessionRequests.has(key)) {
    const started = performance.now();
    const request = postCheckoutSession(body).then((result) => ({
      ...result,
      ms: Math.round(performance.now() - started),
    }));
    sessionRequests.set(key, request);
    // Hosted fallback should be allowed to retry; Elements stays cached for this tab.
    if (body.hosted) {
      request.finally(() => setTimeout(() => sessionRequests.delete(key), 1500));
    }
  }
  return sessionRequests.get(key);
}

const STRIPE_FONTS = [{ cssSrc: "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap" }];

const THEME_COLORS = {
  light: {
    colorPrimary: "#155dfc",
    colorBackground: "#ffffff",
    colorText: "#0a0a0a",
    colorTextSecondary: "#737373",
    colorTextPlaceholder: "#a3a3a3",
    colorDanger: "#e7000b",
    border: "#e5e5e5",
    tabSelected: "#f5f8ff",
  },
  dark: {
    colorPrimary: "#4d8bff",
    colorBackground: "#0a0a0a",
    colorText: "#fafafa",
    colorTextSecondary: "#a1a1a1",
    colorTextPlaceholder: "#6b6b6b",
    colorDanger: "#ff6467",
    border: "#262626",
    tabSelected: "#111a2e",
  },
};

function appearanceFor(theme) {
  const c = THEME_COLORS[theme === "dark" ? "dark" : "light"];
  return {
    theme: theme === "dark" ? "night" : "stripe",
    variables: {
      colorPrimary: c.colorPrimary,
      colorBackground: c.colorBackground,
      colorText: c.colorText,
      colorTextSecondary: c.colorTextSecondary,
      colorTextPlaceholder: c.colorTextPlaceholder,
      colorDanger: c.colorDanger,
      fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, sans-serif",
      fontSizeBase: "14px",
      borderRadius: "10px",
      spacingUnit: "4px",
      focusBoxShadow: `0 0 0 3px ${c.colorPrimary}33`,
    },
    rules: {
      ".Input": { border: `1px solid ${c.border}`, boxShadow: "none", padding: "10px 12px" },
      ".Input:focus": { borderColor: c.colorPrimary },
      ".Tab": { border: `1px solid ${c.border}`, boxShadow: "none" },
      ".Tab--selected": { borderColor: c.colorPrimary, backgroundColor: c.tabSelected, color: c.colorText },
      ".TabLabel--selected": { color: c.colorText },
      ".TabIcon--selected": { fill: c.colorPrimary },
      ".Label": { fontWeight: "500", color: c.colorText },
      ".AccordionItem": { border: `1px solid ${c.border}`, boxShadow: "none" },
    },
  };
}

function referralFromWindow(initialReferral) {
  if (initialReferral) return initialReferral;
  try {
    if (typeof window !== "undefined" && window.promotekit_referral) {
      return String(window.promotekit_referral);
    }
    const current = new URLSearchParams(window.location.search);
    const own = current.get("ref") || current.get("client_reference_id");
    if (own) return own;
    if (document.referrer) {
      const from = new URL(document.referrer);
      return from.searchParams.get("ref") || from.searchParams.get("client_reference_id") || "";
    }
  } catch {
    return "";
  }
  return "";
}

function formatCents(cents) {
  const value = Number(cents || 0) / 100;
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
  });
}

const INTERVAL_WORD = { day: "day", week: "week", month: "month", year: "year" };
const CYCLE_COPY = {
  annual: "Billed yearly",
  monthly: "Billed monthly",
  weekly: "Billed weekly",
  lifetime: "One-time payment",
  prereg: "One-time founding payment",
};

function addInterval(date, interval, count = 1) {
  const next = new Date(date);
  if (interval === "year") next.setFullYear(next.getFullYear() + count);
  else if (interval === "month") next.setMonth(next.getMonth() + count);
  else if (interval === "week") next.setDate(next.getDate() + 7 * count);
  else if (interval === "day") next.setDate(next.getDate() + count);
  return next;
}

function formatDate(date) {
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function planDisplay(summary) {
  if (!summary) return null;
  if (summary.cycle === "lifetime") {
    const lifetime = landingPageV2Config.lifetimeAccess || {};
    return { name: "Lifetime access", features: lifetime.features || [], legacy: false };
  }
  if (summary.key === "mcp_prereg" || summary.tier === "mcp" || summary.cycle === "prereg") {
    const mcp = landingPageV2Config.mcpPrereg || {};
    return {
      name: mcp.title || "MCP + Jarvis prereg",
      description: mcp.description || "",
      features: mcp.features || [],
      legacy: false,
    };
  }
  const current = (landingPageV2Config.plans || []).find((plan) => plan.tier === summary.tier);
  if (current) {
    return {
      name: current.name,
      description: current.description,
      includesLabel: current.includesLabel && current.includesLabel !== "All features in Free +" ? current.includesLabel : "",
      features: (current.features || []).map((feature) => feature.text),
      legacy: false,
    };
  }
  const legacy = (landingPageV2Config.pricing || []).find((plan) => plan.name.toLowerCase() === summary.tier);
  return {
    name: legacy?.name || summary.label,
    features: legacy?.features || [],
    legacy: true,
  };
}

function RichText({ text }) {
  const parts = String(text || "").split("**");
  return parts.map((part, index) =>
    index % 2 ? (
      <span key={index} className="font-medium text-foreground">
        {part}
      </span>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

function CheckoutDeadEnd({ message }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 text-sm">
      <p className="font-medium text-foreground">{message}</p>
      <p className="mt-1 text-muted-foreground">
        Nothing was charged. Go back to{" "}
        <Link href="/#pricing" prefetch={false} className="underline underline-offset-4 hover:text-foreground">
          pricing
        </Link>{" "}
        or email{" "}
        <a href="mailto:kash@lycheedata.com" className="underline underline-offset-4 hover:text-foreground">
          kash@lycheedata.com
        </a>
        .
      </p>
    </div>
  );
}

export default function CheckoutClient({ plan, cycle, referral }) {
  const { resolvedTheme } = useTheme();
  const known = isKnownCheckoutQuery(plan, cycle);
  const [meta, setMeta] = useState({
    summary: null,
    email: "",
    promoCodes: false,
    sessionMs: null,
    sessionId: "",
    publishableKey: "",
  });
  /** `plan` = bad URL; `session` = Elements session API failed (hosted fallback still offered). */
  const [fatal, setFatal] = useState(known ? null : "plan");
  const [formReady, setFormReady] = useState(false);
  const [slow, setSlow] = useState(false);
  const mountedAt = useRef(typeof performance !== "undefined" ? performance.now() : 0);
  const flushedJourney = useRef(false);

  // Open the session as soon as the page hydrates. Stripe mounts on this Promise so
  // js.stripe.com download + iframe skeleton overlap the API round trip instead of waiting on it.
  const sessionRequest = useMemo(() => {
    if (!known || typeof window === "undefined") return null;
    if (!flushedJourney.current) {
      flushedJourney.current = true;
      // Server reads the marketing journey after it replies; flush before the request lands.
      flushJourneyQueue(false).catch(() => {});
    }
    return requestCheckoutSession({
      plan,
      cycle,
      referral: referralFromWindow(referral),
      from: checkoutEntryPage(),
      visitorSessionId: getOrCreateVisitorSessionId() || undefined,
    });
  }, [known, plan, cycle, referral]);

  const clientSecret = useMemo(() => {
    if (!sessionRequest || fatal === "plan") return null;
    return sessionRequest.then((res) => {
      const data = res.data || {};
      if (data.code === "ALREADY_MEMBER" && data.redirect) {
        window.location.assign(data.redirect);
        // Hang while navigating — never reject into CheckoutElementsProvider.
        return new Promise(() => {});
      }
      if (!res.ok || !data.clientSecret) {
        // Hang until `fatal` unmounts the provider; rejecting would flash a Stripe error.
        return new Promise(() => {});
      }
      return data.clientSecret;
    });
  }, [sessionRequest, fatal]);

  useEffect(() => {
    if (formReady || fatal) return undefined;
    const id = window.setTimeout(() => setSlow(true), Math.max(0, SLOW_FORM_MS - msSinceCheckoutClick(mountedAt.current)));
    return () => window.clearTimeout(id);
  }, [formReady, fatal]);

  useEffect(() => {
    if (!sessionRequest) return undefined;
    let cancelled = false;
    sessionRequest
      .then((res) => {
        if (cancelled) return;
        const data = res.data || {};
        if (data.code === "ALREADY_MEMBER" && data.redirect) {
          window.location.assign(data.redirect);
          return;
        }
        if (!res.ok || !data.clientSecret) {
          setFatal(res.status === 400 ? "plan" : "session");
          return;
        }
        setMeta({
          summary: data.plan || null,
          email: data.email || "",
          promoCodes: !!data.promoCodes,
          sessionMs: res.ms ?? null,
          sessionId: sessionIdFromSecret(data.clientSecret),
          publishableKey: data.publishableKey || "",
        });
      })
      .catch(() => {
        if (!cancelled) setFatal("session");
      });
    return () => {
      cancelled = true;
    };
  }, [sessionRequest]);

  const theme = resolvedTheme === "dark" ? "dark" : "light";
  // Prefer the key the server used to create the session once we have it (avoids test/live mismatch).
  const publishableKey = meta.publishableKey || ENV_PUBLISHABLE_KEY;
  const stripePromise = stripeFor(publishableKey);
  const options = useMemo(
    () =>
      !fatal && clientSecret && publishableKey
        ? {
            clientSecret,
            elementsOptions: {
              appearance: appearanceFor(theme),
              fonts: STRIPE_FONTS,
              // Keep Stripe's skeleton visible while the session Promise and iframe finish.
              loader: "always",
            },
            ...(meta.email ? { defaultValues: { email: meta.email } } : {}),
          }
        : null,
    // Stripe reads appearance/email once at mount; theme flips go through changeAppearance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clientSecret, publishableKey, fatal],
  );

  const showSlow = slow && !formReady && !fatal;
  const hostedFallback = { plan, cycle, referral };

  if (fatal === "plan" || (options && !stripePromise && !fatal)) {
    return (
      <CheckoutLayout summary={meta.summary}>
        <CheckoutDeadEnd message={fatal === "plan" ? "That plan isn't available." : "Checkout is not configured."} />
      </CheckoutLayout>
    );
  }

  if (fatal === "session") {
    return (
      <CheckoutLayout summary={meta.summary}>
        <HostedCheckoutNotice
          {...hostedFallback}
          title="We couldn't open the in-app payment form."
          body="Nothing was charged. Continue on Stripe's secure checkout page, or go back to pricing and try again."
        />
        <p className="text-sm text-muted-foreground">
          Prefer to start over?{" "}
          <Link href="/#pricing" prefetch={false} className="underline underline-offset-4 hover:text-foreground">
            Back to pricing
          </Link>
        </p>
      </CheckoutLayout>
    );
  }

  if (!options || !stripePromise) {
    return (
      <CheckoutLayout summary={meta.summary}>
        {showSlow ? <HostedCheckoutNotice {...hostedFallback} /> : null}
        <PaymentSkeleton />
      </CheckoutLayout>
    );
  }

  return (
    <CheckoutElementsProvider stripe={stripePromise} options={options}>
      <ConnectedCheckout
        summary={meta.summary}
        promoCodes={meta.promoCodes}
        theme={theme}
        sessionId={meta.sessionId}
        sessionMs={meta.sessionMs}
        email={meta.email}
        mountedAt={mountedAt.current}
        slow={showSlow}
        hostedFallback={hostedFallback}
        onFormReady={() => setFormReady(true)}
      />
    </CheckoutElementsProvider>
  );
}

/** Stripe's own checkout page, for when the in-app payment form is slow or blocked. */
function HostedCheckoutNotice({ plan, cycle, referral, title = "Taking longer than usual", body, onOpen }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const open = async () => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    onOpen?.();
    try {
      const res = await postCheckoutSession({
        plan,
        cycle,
        hosted: true,
        referral: referralFromWindow(referral),
        from: checkoutEntryPage(),
        visitorSessionId: getOrCreateVisitorSessionId() || undefined,
      });
      const data = res.data || {};
      if (data.code === "ALREADY_MEMBER" && data.redirect) {
        window.location.assign(data.redirect);
        return;
      }
      if (res.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
    } catch {
      // Falls through to the retry message.
    }
    setBusy(false);
    setFailed(true);
  };

  return (
    <div role="status" aria-live="polite" className="mb-6 rounded-xl border border-border bg-card p-4 text-sm">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1 text-muted-foreground">
        {body || "The payment form is still loading. You can keep waiting, or pay on Stripe's secure checkout page instead."}
      </p>
      <button
        type="button"
        onClick={open}
        disabled={busy}
        className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted disabled:opacity-70"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
        {busy ? "Opening Stripe checkout…" : "Continue on Stripe checkout"}
        {busy ? null : <ArrowUpRight className="h-3.5 w-3.5" />}
      </button>
      {failed ? (
        <p className="mt-2 text-xs text-destructive">
          That didn&apos;t open. Refresh the page, or email kash@lycheedata.com and we&apos;ll send you a payment link.
        </p>
      ) : null}
    </div>
  );
}

function sessionIdFromSecret(clientSecret) {
  return String(clientSecret || "").split("_secret_")[0];
}

function ConnectedCheckout({
  summary,
  promoCodes,
  theme,
  sessionId,
  sessionMs,
  email,
  mountedAt,
  slow,
  hostedFallback,
  onFormReady,
}) {
  const result = useCheckoutElements();
  const checkout = result.type === "success" ? result.checkout : null;
  const journey = useRef({ submitted: false, paid: false, left: false, method: "", email: "" });
  if (checkout?.status?.type === "complete") journey.current.paid = true;
  if (email && !journey.current.email) journey.current.email = email;

  const track = useCallback(
    (step, data, opts) => {
      if (!sessionId) return;
      trackCheckoutStep(sessionId, step, { method: journey.current.method || undefined, ...data }, opts);
    },
    [sessionId],
  );

  const leave = useCallback(
    (via, pageUnloading = false) => {
      const j = journey.current;
      if (j.paid || j.left) return;
      j.left = true;
      track("left_page", { via, afterSubmit: pageUnloading && j.submitted }, { keepalive: true });
    },
    [track],
  );

  useEffect(() => {
    const onHide = () => leave("closed, reloaded, or navigated the tab away", true);
    const onShow = (event) => {
      if (event.persisted) journey.current.left = false;
    };
    window.addEventListener("pagehide", onHide);
    window.addEventListener("pageshow", onShow);
    return () => {
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("pageshow", onShow);
    };
  }, [leave]);

  useEffect(() => {
    if (result.type === "error") track("form_load_failed", { message: result.error?.message }, { once: true });
  }, [result.type, result.error?.message, track]);

  useEffect(() => {
    checkout?.changeAppearance?.(appearanceFor(theme));
    // Only re-theme when the site theme flips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, Boolean(checkout)]);

  // Prefill from the session response when Stripe mounted before it arrived.
  useEffect(() => {
    if (!checkout || !email || typeof checkout.updateEmail !== "function") return;
    Promise.resolve(checkout.updateEmail(email)).catch(() => {});
  }, [checkout, email]);

  useEffect(() => {
    if (slow) track("form_slow", { ms: msSinceCheckoutClick(mountedAt), sessionMs: sessionMs ?? undefined }, { once: true });
  }, [slow, track, mountedAt, sessionMs]);

  const formReady = useCallback(() => {
    track("form_ready", { ms: msSinceCheckoutClick(mountedAt), sessionMs: sessionMs ?? undefined }, { once: true });
    onFormReady?.();
  }, [track, mountedAt, sessionMs, onFormReady]);

  const openHosted = useCallback(() => {
    // The buyer is moving to another session, so this one shouldn't report them as gone.
    journey.current.left = true;
    track("hosted_fallback", { ms: msSinceCheckoutClick(mountedAt), sessionMs: sessionMs ?? undefined }, { keepalive: true });
  }, [track, mountedAt, sessionMs]);

  return (
    <CheckoutLayout summary={summary} checkout={checkout} onLeave={leave}>
      {result.type === "error" ? (
        <HostedCheckoutNotice
          {...hostedFallback}
          title="We couldn't load the payment form."
          body={`${String(result.error?.message || "Refresh the page to try again").replace(/\.?$/, ".")} You can also pay on Stripe's secure checkout page.`}
          onOpen={openHosted}
        />
      ) : (
        <>
          {slow ? <HostedCheckoutNotice {...hostedFallback} onOpen={openHosted} /> : null}
          {checkout ? (
            <PaymentForm
              checkout={checkout}
              summary={summary}
              promoCodes={promoCodes}
              journey={journey}
              track={track}
              onReady={formReady}
            />
          ) : (
            <PaymentSkeleton />
          )}
        </>
      )}
    </CheckoutLayout>
  );
}

function CheckoutLayout({ summary, checkout = null, onLeave, children }) {
  return (
    <div className="min-h-dvh w-full bg-background">
      <div className="mx-auto grid min-h-dvh w-full max-w-6xl lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <aside className="border-b border-border bg-muted/30 px-5 py-6 sm:px-10 lg:border-b-0 lg:border-r lg:py-12">
          <div className="mx-auto w-full max-w-md lg:ml-auto lg:mr-0">
            <div className="flex items-center justify-between">
              <Link
                href="/#pricing"
                prefetch={false}
                onClick={() => onLeave?.("clicked back to Pricing")}
                className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                Pricing
              </Link>
              <Link
                href="/"
                prefetch={false}
                onClick={() => onLeave?.("clicked the Lychee logo")}
                className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground"
              >
                <img src="/fruit.png" alt="" className="h-6 w-[18px] dark:brightness-0 dark:invert" />
                Lychee
              </Link>
            </div>
            <OrderSummary summary={summary} checkout={checkout} />
          </div>
        </aside>
        <main className="px-5 py-8 sm:px-10 lg:py-12">
          <div className="mx-auto w-full max-w-md lg:mr-auto lg:ml-0">{children}</div>
        </main>
      </div>
    </div>
  );
}

function OrderSummary({ summary, checkout }) {
  const display = planDisplay(summary);
  if (!summary || !display) {
    return (
      <div className="mt-10 space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  }

  const isSubscription = summary.mode === "subscription";
  const interval = INTERVAL_WORD[summary.interval] || summary.interval;
  const total = checkout?.total;
  const discount = total?.discount?.minorUnitsAmount > 0 ? total.discount : null;
  const tax = total?.taxExclusive?.minorUnitsAmount > 0 ? total.taxExclusive : null;
  const dueToday = total?.total?.amount || formatCents(summary.amount);
  const recurring = checkout?.recurring;
  const renewsAmount = recurring?.dueNext?.total?.amount || formatCents(summary.amount);
  const renewsOn = isSubscription
    ? recurring?.dueNext?.billingCycleAnchor
      ? new Date(recurring.dueNext.billingCycleAnchor * 1000)
      : addInterval(new Date(), summary.interval, recurring?.intervalCount || 1)
    : null;
  const promo = summary.promo;
  const firstAmount = promo ? promo.amount : summary.amount;
  const perMonth = summary.interval === "year" ? formatCents(Math.round(firstAmount / 12)) : "";

  return (
    <div className="mt-8 lg:mt-14">
      <p className="text-sm font-medium text-muted-foreground">
        {isSubscription ? "Subscribe to" : "Buy"} Lychee {display.name}
      </p>
      {promo ? (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-secondary/30 bg-secondary/10 px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-secondary">
          <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
          {promo.name} · {promo.percentOff}% off applied
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-4xl font-semibold tracking-tight text-foreground">{formatCents(firstAmount)}</span>
        {promo ? (
          <span className="text-lg text-muted-foreground line-through decoration-1">{formatCents(summary.amount)}</span>
        ) : null}
        {isSubscription ? (
          <span className="text-sm text-muted-foreground">{promo ? `for your first ${interval}` : `per ${interval}`}</span>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {CYCLE_COPY[summary.cycle] || ""}
        {perMonth ? ` · ${perMonth}/month equivalent` : ""}
      </p>

      {display.includesLabel ? <p className="mt-8 hidden text-sm text-muted-foreground sm:block">{display.includesLabel}</p> : null}
      {display.features.length ? (
        <ul className={`${display.includesLabel ? "mt-3" : "mt-8"} hidden space-y-2.5 text-sm text-muted-foreground sm:block`}>
          {display.features.slice(0, 6).map((feature) => (
            <li key={feature} className="flex gap-2.5">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
              <span>
                <RichText text={feature} />
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <dl className="mt-8 space-y-3 border-t border-border pt-6 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">
            Lychee {display.name}
            {summary.cycle !== "lifetime" && summary.cycle !== "prereg" ? `, ${summary.cycle}` : ""}
          </dt>
          <dd className="tabular-nums text-foreground">{total?.subtotal?.amount || formatCents(summary.amount)}</dd>
        </div>
        {discount ? (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{promo ? `${promo.name} (${promo.percentOff}% off)` : "Discount"}</dt>
            <dd className="tabular-nums text-emerald-600 dark:text-emerald-400">−{discount.amount}</dd>
          </div>
        ) : null}
        {tax ? (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Tax</dt>
            <dd className="tabular-nums text-foreground">{tax.amount}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4 border-t border-border pt-3 text-base font-medium">
          <dt className="text-foreground">Due today</dt>
          <dd className="tabular-nums text-foreground">{dueToday}</dd>
        </div>
      </dl>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        {isSubscription && renewsOn
          ? `Renews automatically at ${renewsAmount} per ${interval} on ${formatDate(renewsOn)}. Cancel anytime from Billing in your dashboard.`
          : "One-time payment. Nothing renews."}
      </p>
    </div>
  );
}

function PaymentSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading payment form">
      <Skeleton className="h-6 w-32" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}

function PromoCode({ checkout, track }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const applied = (checkout.discountAmounts || []).find((item) => item.promotionCode);

  if (applied) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
        <span className="inline-flex items-center gap-2 text-foreground">
          <Tag className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="font-medium">{applied.promotionCode}</span>
          <span className="text-muted-foreground">{applied.displayName}</span>
        </span>
        <button
          type="button"
          className="rounded p-1 text-muted-foreground hover:text-foreground"
          aria-label="Remove promo code"
          onClick={async () => {
            setBusy(true);
            await checkout.removePromotionCode();
            setBusy(false);
          }}
          disabled={busy}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Add promo code
      </button>
    );
  }

  const apply = async () => {
    const value = code.trim();
    if (!value) return;
    setBusy(true);
    setError("");
    const result = await checkout.applyPromotionCode(value);
    setBusy(false);
    if (result.type === "error") {
      setError(result.error?.message || "That code didn't work.");
      track("promo_failed", { promo: value, message: result.error?.message });
    } else {
      setCode("");
      track("promo_applied", { promo: value });
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              apply();
            }
          }}
          placeholder="Promo code"
          aria-label="Promo code"
          className="h-10"
          autoFocus
        />
        <button
          type="button"
          onClick={apply}
          disabled={busy || !code.trim()}
          className="h-10 shrink-0 rounded-md border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
        </button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function PaymentForm({ checkout, summary, promoCodes, journey, track, onReady }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paid, setPaid] = useState(false);
  const [ready, setReady] = useState(false);

  const isSubscription = summary?.mode === "subscription";
  const dueToday = checkout.total?.total?.amount || formatCents(summary?.amount);
  const interval = INTERVAL_WORD[summary?.interval] || summary?.interval;

  const returnUrl = `/checkout/return?session_id=${encodeURIComponent(checkout.id)}`;
  const goToAccount = () => router.push(returnUrl);
  const complete = checkout.status?.type === "complete";

  // Waits for the payment form so the prefetch doesn't compete with Stripe's iframe.
  useEffect(() => {
    if (ready) router.prefetch(returnUrl);
  }, [ready, router, returnUrl]);

  useEffect(() => {
    if (complete) router.push(returnUrl);
  }, [complete, router, returnUrl]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting || paid) return;
    setError("");
    setSubmitting(true);
    journey.current.submitted = true;
    track("submit", { email: journey.current.email || undefined });
    const started = Date.now();
    try {
      const result = await checkout.confirm({ redirect: "if_required" });
      if (result.type === "error") {
        const message = result.error?.message || "Your payment didn't go through. Try another method.";
        setError(message);
        journey.current.submitted = false;
        track("payment_failed", {
          kind: result.error?.code === "paymentFailed" ? "declined" : "error",
          message,
          declineCode: result.error?.paymentFailed?.declineCode || undefined,
        });
        return;
      }
      journey.current.paid = true;
      track("payment_confirmed", {
        ms: Date.now() - started,
        paymentStatus: result.session?.status?.paymentStatus,
      });
      setPaid(true);
      goToAccount();
    } catch (err) {
      setError(err?.message || "Your payment didn't go through. Try again.");
      journey.current.submitted = false;
      track("payment_failed", { kind: "error", message: err?.message || "confirm threw" });
    } finally {
      setSubmitting(false);
    }
  };

  if (complete) {
    const settled = checkout.status.paymentStatus !== "unpaid";
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm" role="status" aria-live="polite">
        <div className="flex items-center gap-3">
          {settled ? (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </span>
          ) : (
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-muted-foreground" />
          )}
          <div>
            <p className="font-medium text-foreground">{settled ? "Payment confirmed" : "Payment submitted"}</p>
            <p className="mt-0.5 text-muted-foreground">
              {settled
                ? "Opening account setup…"
                : "Your bank is processing it. Opening account setup…"}
            </p>
          </div>
        </div>
        <button type="button" onClick={goToAccount} className="mt-4 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          Not moving? Continue
        </button>
      </div>
    );
  }
  if (checkout.status?.type === "expired") {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm">
        <p className="font-medium text-foreground">This checkout expired.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-3 text-secondary underline-offset-4 hover:underline"
        >
          Start again
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Payment details</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          No account needed yet. You&apos;ll verify this email right after paying.
        </p>
      </div>

      <ContactDetailsElement
        onFocus={() => track("contact_started", {}, { once: true })}
        onChange={(event) => {
          journey.current.email = event?.value?.email || "";
        }}
      />

      <div className="space-y-2">
        <Label>Payment method</Label>
        <PaymentElement
          options={{ layout: { type: "tabs" }, terms: { card: "never" } }}
          onReady={() => {
            setReady(true);
            onReady();
          }}
          onLoadError={(event) => track("form_load_failed", { message: event?.error?.message }, { once: true })}
          onFocus={() => track("payment_started", {}, { once: true })}
          onChange={(event) => {
            const type = event?.value?.type || "";
            const previous = journey.current.method;
            journey.current.method = type || previous;
            if (type && previous && type !== previous) track("method_changed", { method: type });
            if (event?.complete) track("details_complete", {}, { once: true });
          }}
        />
      </div>

      {promoCodes ? <PromoCode checkout={checkout} track={track} /> : null}

      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting || paid}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-secondary to-violet-500 px-4 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-95 disabled:opacity-70"
      >
        {submitting || paid ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
        {paid ? "Payment confirmed" : submitting ? "Processing…" : isSubscription ? `Subscribe · ${dueToday} today` : `Pay ${dueToday}`}
      </button>

      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        {isSubscription
          ? `By subscribing, you allow Lychee to charge your payment method ${checkout.recurring?.dueNext?.total?.amount || formatCents(summary?.amount)} every ${interval} until you cancel. `
          : ""}
        Payments are processed securely by Stripe. See our{" "}
        <Link href="/terms" prefetch={false} className="underline underline-offset-4 hover:text-foreground">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" prefetch={false} className="underline underline-offset-4 hover:text-foreground">
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  );
}
