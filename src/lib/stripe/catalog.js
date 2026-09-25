import { landingPageV2Config } from "@/lib/landingPageV2Config";
import { getStripe, isStripeTestKey } from "@/lib/stripe/client";
import { notifyCheckoutAlert } from "@/lib/telegram/checkoutAlert";

const pricing = landingPageV2Config.pricing;

function planHref(name, cycle) {
  const plan = pricing.find((item) => item.name.toLowerCase() === name);
  if (!plan) return "";
  if (cycle === "weekly") return plan.hrefWeekly;
  if (cycle === "annual") return plan.hrefYearly;
  return plan.hrefMonthly;
}

/**
 * Amounts match PLAN_MAP in the Stripe webhook. Live charges use the existing
 * Payment Link price when the secret key can see it. Test keys create a
 * matching test price so 4242… works without live Payment Links.
 */
export const CHECKOUT_PLANS = [
  { key: "basic_weekly", tier: "basic", cycle: "weekly", mode: "subscription", amount: 499, interval: "week", label: "Basic weekly", href: planHref("basic", "weekly"), priceId: "price_1TKZCwILjX7EMe6xchbsFVX4" },
  { key: "basic_monthly", tier: "basic", cycle: "monthly", mode: "subscription", amount: 1999, interval: "month", label: "Basic monthly", href: planHref("basic", "monthly"), priceId: "price_1TKZOTILjX7EMe6xzf0YXusA" },
  { key: "basic_annual", tier: "basic", cycle: "annual", mode: "subscription", amount: 19999, interval: "year", label: "Basic annual", href: planHref("basic", "annual"), priceId: "price_1TKZSNILjX7EMe6xls8YOG7H" },
  { key: "pro_weekly", tier: "pro", cycle: "weekly", mode: "subscription", amount: 999, interval: "week", label: "Pro weekly", href: planHref("pro", "weekly"), priceId: "price_1TKZIgILjX7EMe6xkBmtDZc4" },
  { key: "pro_monthly", tier: "pro", cycle: "monthly", mode: "subscription", amount: 3999, interval: "month", label: "Pro monthly", href: planHref("pro", "monthly"), priceId: "price_1TKZPNILjX7EMe6xRWpxeCbn" },
  { key: "pro_annual", tier: "pro", cycle: "annual", mode: "subscription", amount: 39999, interval: "year", label: "Pro annual", href: planHref("pro", "annual"), priceId: "price_1TKZQfILjX7EMe6xV8ozoQam" },
  { key: "elite_weekly", tier: "elite", cycle: "weekly", mode: "subscription", amount: 1999, interval: "week", label: "Elite weekly", href: planHref("elite", "weekly"), priceId: "price_1TKZLxILjX7EMe6xW9cV0TKs" },
  { key: "elite_monthly", tier: "elite", cycle: "monthly", mode: "subscription", amount: 7999, interval: "month", label: "Elite monthly", href: planHref("elite", "monthly"), priceId: "price_1TKZNEILjX7EMe6xmMqNWFQZ" },
  { key: "elite_annual", tier: "elite", cycle: "annual", mode: "subscription", amount: 79999, interval: "year", label: "Elite annual", href: planHref("elite", "annual"), priceId: "price_1TKZTGILjX7EMe6xMaDZA8SE" },
  {
    key: "lifetime",
    tier: "elite",
    cycle: "lifetime",
    mode: "payment",
    amount: 19999,
    interval: null,
    label: "Lifetime access",
    href: landingPageV2Config.lifetimeAccess?.href || "",
    priceId: "price_1T68YMILjX7EMe6x0N5glBuL",
  },
];

export function planFromQuery(plan, cycle) {
  const name = String(plan || "").trim().toLowerCase();
  if (name === "lifetime") return CHECKOUT_PLANS.find((item) => item.key === "lifetime") || null;
  const rawCycle = String(cycle || "").trim().toLowerCase();
  const normalizedCycle = rawCycle === "yearly" || rawCycle === "year" ? "annual" : rawCycle;
  return CHECKOUT_PLANS.find((item) => item.tier === name && item.cycle === normalizedCycle) || null;
}

function envPriceId(planKey) {
  const specific = process.env[`STRIPE_PRICE_${planKey.toUpperCase()}`];
  if (specific) return String(specific).trim();
  if (!process.env.STRIPE_PRICE_IDS) return "";
  try {
    const map = JSON.parse(process.env.STRIPE_PRICE_IDS);
    return map?.[planKey] ? String(map[planKey]).trim() : "";
  } catch (err) {
    console.error("[checkout] STRIPE_PRICE_IDS is not valid JSON:", err?.message || err);
    return "";
  }
}

function normalizeStripeUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`.replace(/\/$/, "");
  } catch {
    return String(url || "").split("?")[0].replace(/\/$/, "");
  }
}

function linkCache() {
  if (!global.__lycheePaymentLinkPrices) global.__lycheePaymentLinkPrices = new Map();
  return global.__lycheePaymentLinkPrices;
}

function sessionExtrasFromLink(link) {
  const extras = {};
  if (link?.allow_promotion_codes) extras.allow_promotion_codes = true;
  if (link?.billing_address_collection && link.billing_address_collection !== "auto") {
    extras.billing_address_collection = link.billing_address_collection;
  }
  if (link?.automatic_tax?.enabled) extras.automatic_tax = { enabled: true };
  if (link?.phone_number_collection?.enabled) extras.phone_number_collection = { enabled: true };
  return extras;
}

async function priceFromPaymentLink(stripe, href) {
  const cache = linkCache();
  const cacheKey = normalizeStripeUrl(href);
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  let startingAfter;
  for (let page = 0; page < 10; page += 1) {
    const res = await stripe.paymentLinks.list({
      limit: 100,
      active: true,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    for (const link of res.data || []) {
      if (normalizeStripeUrl(link.url) !== cacheKey) continue;
      const items = await stripe.paymentLinks.listLineItems(link.id, { limit: 1 });
      const priceId = items.data?.[0]?.price?.id;
      if (!priceId) return null;
      const resolved = { priceId, extras: sessionExtrasFromLink(link) };
      cache.set(cacheKey, resolved);
      return resolved;
    }
    if (!res.has_more || !res.data?.length) break;
    startingAfter = res.data[res.data.length - 1].id;
  }
  return null;
}

async function ensureTestPrice(stripe, plan) {
  const lookupKey = `lychee_${plan.key}`;
  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
  if (existing.data?.[0]?.id) return existing.data[0].id;

  const product = await stripe.products.create({
    name: `Lychee ${plan.label} (test)`,
    metadata: { lychee_plan: plan.key },
  });
  const price = await stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: plan.amount,
    lookup_key: lookupKey,
    ...(plan.mode === "subscription" ? { recurring: { interval: plan.interval } } : {}),
  });
  return price.id;
}

/**
 * @returns {Promise<{ priceId: string, extras: Record<string, unknown>, fallbackUrl: string } | null>}
 */
export async function resolveCheckoutPrice(plan) {
  const fallbackUrl = plan.href || "";
  const fromEnv = envPriceId(plan.key);
  if (fromEnv) {
    return {
      priceId: fromEnv,
      extras: { allow_promotion_codes: true },
      fallbackUrl,
    };
  }

  const stripe = getStripe();
  try {
    if (isStripeTestKey()) {
      const priceId = await ensureTestPrice(stripe, plan);
      return { priceId, extras: { allow_promotion_codes: true }, fallbackUrl };
    }
    // Live prices are the same ones already sold by the Payment Links.
    // Resolving them here avoids a Payment Link list call on every checkout.
    if (plan.priceId) {
      return { priceId: plan.priceId, extras: {}, fallbackUrl };
    }
    if (plan.href) {
      const fromLink = await priceFromPaymentLink(stripe, plan.href);
      if (fromLink?.priceId) {
        return { priceId: fromLink.priceId, extras: fromLink.extras || {}, fallbackUrl };
      }
    }
  } catch (err) {
    await notifyCheckoutAlert({
      title: "Could not resolve Stripe price",
      fields: {
        Plan: plan.key,
        Error: err?.message || String(err),
        Fallback: fallbackUrl ? "payment link" : "none",
      },
    });
    return null;
  }

  await notifyCheckoutAlert({
    title: "No Stripe price for plan",
    fields: {
      Plan: plan.key,
      Fallback: fallbackUrl ? "payment link" : "none",
    },
  });
  return null;
}

export function requestOrigin(req) {
  if (process.env.NODE_ENV !== "production") {
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const proto = req.headers["x-forwarded-proto"] || "http";
    if (host) return `${proto}://${host}`;
  }
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return String(configured).replace(/\/$/, "");
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${host}`;
}

export function cleanReferral(value) {
  const text = String(value || "").trim().slice(0, 200);
  if (!text || /[\r\n<>]/.test(text)) return "";
  return text;
}
