import User from "@/models/Users";
import { CHECKOUT_PLANS } from "@/lib/stripe/catalog";
import { normalizeMembershipCycle, normalizeMembershipTier } from "@/lib/membershipAccess";

export const STRIPE_PORTAL_LOGIN_URL = "https://billing.stripe.com/p/login/14k6sm3PU1cTd44fYY";

const SUBSCRIPTION_RANK = { active: 5, trialing: 4, past_due: 3, unpaid: 2, incomplete: 1 };

function intervalToCycle(interval) {
  if (interval === "week") return "weekly";
  if (interval === "month") return "monthly";
  if (interval === "year") return "annual";
  return "";
}

/** Map a Stripe price back to a catalog plan (by id, then by amount + interval). */
export function planForStripePrice(price) {
  if (!price) return null;
  const byId = CHECKOUT_PLANS.find((plan) => plan.priceId && plan.priceId === price.id);
  if (byId) return byId;
  const interval = price.recurring?.interval || null;
  return (
    CHECKOUT_PLANS.find(
      (plan) =>
        plan.mode === "subscription" &&
        plan.amount === price.unit_amount &&
        plan.interval === interval,
    ) || null
  );
}

export function subscriptionItem(sub) {
  return sub?.items?.data?.[0] || null;
}

export function summarizeSubscription(sub) {
  if (!sub) return null;
  const item = subscriptionItem(sub);
  const price = item?.price || null;
  const plan = planForStripePrice(price);
  return {
    id: sub.id,
    status: sub.status,
    customerId: typeof sub.customer === "string" ? sub.customer : sub.customer?.id || null,
    cancelAtPeriodEnd: !!sub.cancel_at_period_end,
    currentPeriodEnd: sub.current_period_end ? sub.current_period_end * 1000 : null,
    pendingUpdate: !!sub.pending_update,
    priceId: price?.id || null,
    amount: price?.unit_amount ?? null,
    currency: price?.currency || "usd",
    tier: plan?.tier || null,
    cycle: plan?.cycle || intervalToCycle(price?.recurring?.interval) || null,
    planKey: plan?.key || null,
  };
}

function better(a, b) {
  if (!b) return a;
  if (!a) return b;
  const ra = SUBSCRIPTION_RANK[a.status] || 0;
  const rb = SUBSCRIPTION_RANK[b.status] || 0;
  if (ra !== rb) return ra > rb ? a : b;
  return (a.created || 0) >= (b.created || 0) ? a : b;
}

async function customerIdsForUser(stripe, dbUser, { lookupByEmail }) {
  const ids = new Set();
  if (dbUser?.stripeCustomerId) ids.add(String(dbUser.stripeCustomerId));
  if (!ids.size && lookupByEmail) {
    const emails = [...new Set([dbUser?.email, dbUser?.billing_email].map((e) => String(e || "").trim().toLowerCase()).filter(Boolean))];
    for (const email of emails) {
      const found = await stripe.customers.list({ email, limit: 10 });
      for (const customer of found.data || []) ids.add(customer.id);
    }
  }
  return [...ids];
}

/**
 * Best subscription Stripe knows about for this user: the stored subscription,
 * plus anything live on their customer(s). Email lookup is opt-in.
 */
export async function findMemberSubscription(stripe, dbUser, { lookupByEmail = false } = {}) {
  let best = null;
  if (dbUser?.stripeSubscriptionId) {
    try {
      best = await stripe.subscriptions.retrieve(String(dbUser.stripeSubscriptionId));
    } catch (err) {
      if (err?.code !== "resource_missing") throw err;
    }
  }
  if (best && SUBSCRIPTION_RANK[best.status] >= SUBSCRIPTION_RANK.trialing) return best;

  const customerIds = await customerIdsForUser(stripe, dbUser, { lookupByEmail });
  for (const customer of customerIds) {
    const list = await stripe.subscriptions.list({ customer, status: "all", limit: 20 });
    for (const sub of list.data || []) best = better(sub, best);
  }
  return best;
}

function storedStatus(stripeStatus) {
  return stripeStatus === "canceled" ? "cancelled" : stripeStatus;
}

/**
 * Bring the Mongo entitlement in line with Stripe. Lifetime access is never
 * touched by subscription state.
 * @returns {Promise<object>} the (possibly updated) lean user
 */
export async function syncUserFromSubscription(dbUser, sub) {
  if (!dbUser?._id || !sub) return dbUser;
  const summary = summarizeSubscription(sub);
  const $set = {};
  const status = storedStatus(summary.status);
  if (!dbUser.lifetimeMember && status && dbUser.subscriptionStatus !== status) $set.subscriptionStatus = status;
  if (summary.tier && normalizeMembershipTier(dbUser.subscriptionTier) !== summary.tier) $set.subscriptionTier = summary.tier;
  if (summary.cycle && normalizeMembershipCycle(dbUser.billingCycle) !== summary.cycle) $set.billingCycle = summary.cycle;
  if (summary.tier && summary.cycle) {
    const type = `${summary.tier}_${summary.cycle}`;
    if (dbUser.subscriptionType !== type) $set.subscriptionType = type;
  }
  if (dbUser.stripeSubscriptionId !== sub.id) $set.stripeSubscriptionId = sub.id;
  if (summary.customerId && dbUser.stripeCustomerId !== summary.customerId) $set.stripeCustomerId = summary.customerId;
  if (summary.priceId && dbUser.stripePriceId !== summary.priceId) $set.stripePriceId = summary.priceId;
  if (summary.currentPeriodEnd) {
    const next = new Date(summary.currentPeriodEnd);
    if (!dbUser.nextPaymentDate || new Date(dbUser.nextPaymentDate).getTime() !== next.getTime()) $set.nextPaymentDate = next;
  }
  if ((status === "active" || status === "trialing") && !dbUser.subscribedAt) $set.subscribedAt = new Date();
  if (!Object.keys($set).length) return dbUser;
  await User.updateOne({ _id: dbUser._id }, { $set });
  return { ...dbUser, ...$set };
}
