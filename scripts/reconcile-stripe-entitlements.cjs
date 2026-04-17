/* eslint-disable no-console */

/**
 * Reconcile Stripe "paid access" into MongoDB user documents.
 *
 * - Intended to be run manually when webhooks were misconfigured.
 * - Uses STRIPE "truth" (active/trialing subscriptions + completed checkout sessions)
 *   to backfill subscription fields on the User doc.
 *
 * ENV:
 * - STRIPE_SECRET_KEY      (required) Stripe secret key (LIVE for prod reconciliation)
 * - MONGODB_URI            (required) Production MongoDB URI (yes, even when running locally)
 * - DRY_RUN=true|false     (optional) If true, prints changes without writing (default: true)
 * - SINCE_DAYS=30          (optional) How far back to look for one-time checkout payments (default: 365)
 *
 * Usage examples:
 *   DRY_RUN=true  SINCE_DAYS=365 node scripts/reconcile-stripe-entitlements.cjs
 *   DRY_RUN=false SINCE_DAYS=365 node scripts/reconcile-stripe-entitlements.cjs
 */

const mongoose = require("mongoose");
const Stripe = require("stripe");

// Ensure local `.env` values are available when running this script directly via `node`.
require("dotenv").config();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const MONGODB_URI = process.env.MONGODB_URI;

const DRY_RUN = String(process.env.DRY_RUN || "true").toLowerCase() === "true";
const SINCE_DAYS = Number(process.env.SINCE_DAYS || "365");
const PRINT_ACTIVE_SUBSCRIPTIONS = String(process.env.PRINT_ACTIVE_SUBSCRIPTIONS || "false").toLowerCase() === "true";

if (!STRIPE_SECRET_KEY) throw new Error("Missing STRIPE_SECRET_KEY");
if (!MONGODB_URI) throw new Error("Missing MONGODB_URI (production DB URI)");
if (!Number.isFinite(SINCE_DAYS) || SINCE_DAYS <= 0) throw new Error("Invalid SINCE_DAYS");

// Keep this mapping aligned with src/pages/api/stripeWebHook/success.js
const PLAN_MAP = {
  // Current plans
  "499:week": { tier: "basic", cycle: "weekly" },
  "1999:month": { tier: "basic", cycle: "monthly" },
  "19999:year": { tier: "basic", cycle: "annual" },

  "999:week": { tier: "pro", cycle: "weekly" },
  "3999:month": { tier: "pro", cycle: "monthly" },
  "39999:year": { tier: "pro", cycle: "annual" },

  "1999:week": { tier: "elite", cycle: "weekly" },
  "7999:month": { tier: "elite", cycle: "monthly" },
  "79999:year": { tier: "elite", cycle: "annual" },

  // Existing / legacy recurring
  "1599:month": { tier: "basic", cycle: "monthly" },
  "19188:year": { tier: "basic", cycle: "annual" },
  "19190:year": { tier: "basic", cycle: "annual" },
  "3199:month": { tier: "premium", cycle: "monthly" },
  "38388:year": { tier: "premium", cycle: "annual" },
  "38390:year": { tier: "premium", cycle: "annual" },

  // Existing / legacy one-time lifetime
  "19999:one-time": { tier: "lifetime", cycle: "one-time" },
};

function resolvePlan({ amount, interval, mode }) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return null;
  const key = `${amount}:${mode === "payment" ? "one-time" : interval || "unknown"}`;
  return PLAN_MAP[key] || null;
}

// Minimal schema for updates; keep strict off so schema drift never blocks reconciliation.
const UserSchema = new mongoose.Schema({}, { strict: false, timestamps: false });
const User = mongoose.models.User || mongoose.model("User", UserSchema, "users");

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2020-08-27" });

async function listAll(fn, pageSize = 100) {
  const out = [];
  let starting_after = undefined;
  while (true) {
    const page = await fn({ limit: pageSize, starting_after });
    out.push(...(page.data || []));
    if (!page.has_more) break;
    starting_after = page.data?.[page.data.length - 1]?.id;
  }
  return out;
}

async function getCustomerEmail(customerId) {
  if (!customerId) return null;
  try {
    const customer = await stripe.customers.retrieve(customerId);
    return customer?.email || null;
  } catch (err) {
    console.error("[reconcile] Could not fetch customer email:", customerId, err?.message || err);
    return null;
  }
}

function normalizeEmail(email) {
  if (!email) return null;
  const e = String(email).trim().toLowerCase();
  return e.includes("@") ? e : null;
}

async function upsertEntitlementByEmail(email, patch, { netPayOnInsertCents } = {}) {
  const normalized = normalizeEmail(email);
  if (!normalized) return { ok: false, reason: "missing_email" };

  if (DRY_RUN) {
    // Avoid printing PII (emails) in console output.
    console.log("[DRY_RUN] would update entitlement", {
      ...patch,
      ...(Number.isFinite(netPayOnInsertCents) ? { netPayOnInsertCents } : null),
    });
    return { ok: true, dryRun: true };
  }

  await User.updateOne(
    { email: normalized },
    {
      $set: {
        ...patch,
        email: normalized,
      },
      $setOnInsert: {
        token: 100,
        lifetimeMember: false,
        ...(Number.isFinite(netPayOnInsertCents)
          ? { netPay: Math.round(netPayOnInsertCents) }
          : null),
      },
    },
    { upsert: true },
  );
  return { ok: true };
}

async function reconcileSubscriptions() {
  const activeSubs = await listAll((args) => stripe.subscriptions.list({ status: "active", ...args }));
  const trialingSubs = await listAll((args) => stripe.subscriptions.list({ status: "trialing", ...args }));
  const subs = [...(activeSubs || []), ...(trialingSubs || [])];

  let updated = 0;
  let skippedNoEmail = 0;

  for (const sub of subs) {
    if (!["active", "trialing"].includes(sub.status)) continue;

    const amount =
      sub.items?.data?.[0]?.price?.unit_amount ??
      sub.items?.data?.[0]?.plan?.amount ??
      null;

    const interval =
      sub.items?.data?.[0]?.plan?.interval ??
      sub.items?.data?.[0]?.price?.recurring?.interval ??
      null;

    const email =
      normalizeEmail(sub.customer_email) ||
      normalizeEmail(await getCustomerEmail(sub.customer));

    if (!email) {
      skippedNoEmail++;
      console.warn("[subs] Missing customer email", { subId: sub.id, customer: sub.customer });
      continue;
    }

    const mapping = resolvePlan({ amount, interval, mode: "subscription" });

    const status = sub.status === "trialing" ? "trialing" : "active";
    const patch = {
      subscriptionStatus: status,
      subscribedAt: sub.start_date ? new Date(sub.start_date * 1000) : new Date(),
      nextPaymentDate: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
      stripeCustomerId: sub.customer || null,
      stripeSubscriptionId: sub.id || null,
      stripePriceId: sub.items?.data?.[0]?.price?.id || null,
    };

    // Tier/cycle are optional. Your access gating should not depend on mapping being exact.
    if (mapping) {
      patch.subscriptionTier = mapping.tier;
      patch.billingCycle = mapping.cycle;
      patch.subscriptionType = `${mapping.tier}_${mapping.cycle}`;
      if (mapping.tier === "lifetime") patch.lifetimeMember = true;
    } else {
      console.warn("[subs] Unrecognized plan mapping (still granting access)", {
        subId: sub.id,
        amount,
        interval,
        priceId: sub.items?.data?.[0]?.price?.id || null,
      });
    }

    const res = await upsertEntitlementByEmail(email, patch, {
      netPayOnInsertCents: typeof amount === "number" && Number.isFinite(amount) ? amount : null,
    });
    if (res.ok) updated++;
  }

  return { updated, skippedNoEmail, total: subs.length };
}

async function listActiveSubscriptionsForSanityCheck() {
  const activeSubs = await listAll((args) => stripe.subscriptions.list({ status: "active", ...args }));
  const trialingSubs = await listAll((args) => stripe.subscriptions.list({ status: "trialing", ...args }));
  const subs = [...(activeSubs || []), ...(trialingSubs || [])];

  console.log("[reconcile] active/trialing subscriptions (sanity check):", subs.length);

  // Deduplicate by subscription id (just in case)
  const seen = new Set();
  const rows = [];

  for (const sub of subs) {
    if (!sub?.id || seen.has(sub.id)) continue;
    seen.add(sub.id);

    const priceId = sub.items?.data?.[0]?.price?.id || null;
    const interval = sub.items?.data?.[0]?.plan?.interval || sub.items?.data?.[0]?.price?.recurring?.interval || null;
    const amount =
      sub.items?.data?.[0]?.price?.unit_amount ?? sub.items?.data?.[0]?.plan?.amount ?? null;

    let email =
      normalizeEmail(sub.customer_email) ||
      normalizeEmail(sub.customer_details?.email) ||
      null;

    if (!email) {
      email = normalizeEmail(await getCustomerEmail(sub.customer));
    }

    rows.push({
      subId: sub.id,
      status: sub.status,
      email: email || null,
      priceId,
      amount,
      interval,
    });
  }

  // Print compactly
  rows.slice(0, 200).forEach((r) => {
    console.log(
      "[reconcile][sub]",
      JSON.stringify({
        subId: r.subId,
        status: r.status,
        email: r.email,
        priceId: r.priceId,
      }),
    );
  });

  if (rows.length > 200) {
    console.log("[reconcile] (output truncated; showing first 200)");
  }
}

async function getCheckoutSessionExpanded(sessionId) {
  // Retrieve once to access line_items and price ids for more complete reconciliation.
  // This can be slower; we only call it in the one-time section.
  const expanded = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["line_items.data.price"],
  });
  return expanded;
}

async function reconcileOneTimeCheckoutSessions() {
  const sinceTs = Math.floor(Date.now() / 1000) - SINCE_DAYS * 24 * 60 * 60;
  const sessions = await listAll((args) =>
    stripe.checkout.sessions.list({
      ...args,
      status: "complete",
      created: { gte: sinceTs },
    }),
  );

  let updated = 0;
  let skippedNotPayment = 0;
  let skippedNoEmail = 0;

  for (const session of sessions) {
    if (session.mode !== "payment") {
      skippedNotPayment++;
      continue;
    }

    const amount = session.amount_total;
    const mapping = resolvePlan({ amount, mode: "payment" });

    const email =
      normalizeEmail(session.customer_details?.email) ||
      normalizeEmail(await getCustomerEmail(session.customer));

    if (!email) {
      skippedNoEmail++;
      continue;
    }

    // Fetch line_items so we can store stripePriceId and improve internal data quality.
    // If it fails for any reason, we fall back to the non-expanded data.
    let expanded = null;
    try {
      expanded = await getCheckoutSessionExpanded(session.id);
    } catch (err) {
      console.warn("[reconcile] checkout.sessions.retrieve failed", { sessionId: session.id, err: err?.message || err });
    }

    const stripePriceId =
      expanded?.line_items?.data?.[0]?.price?.id ||
      session?.line_items?.data?.[0]?.price?.id ||
      null;

    const stripeCustomerId =
      expanded?.customer || session?.customer || null;

    const effectiveMapping = mapping || null;
    const patch = {
      // Your access gating should be driven by "paid" status, not by plan mapping.
      subscriptionStatus: "active",
      subscribedAt: new Date(),
      nextPaymentDate: null,
      stripeCustomerId,
      stripeSubscriptionId: null,
      stripePriceId,
    };

    if (effectiveMapping) {
      patch.subscriptionTier = effectiveMapping.tier;
      patch.billingCycle = effectiveMapping.cycle;
      patch.subscriptionType = `${effectiveMapping.tier}_${effectiveMapping.cycle}`;
      if (effectiveMapping.tier === "lifetime") patch.lifetimeMember = true;
    } else {
      // Preserve internal value even when tier mapping doesn't exist.
      patch.subscriptionTier = "unknown";
      patch.billingCycle = "one-time";
      patch.subscriptionType = `one_time_${amount ?? "unknown"}`;
    }

    const res = await upsertEntitlementByEmail(email, patch, {
      // Useful for "paid value" analytics without risking repeated summing.
      netPayOnInsertCents: typeof amount === "number" && Number.isFinite(amount) ? amount : null,
    });
    if (res.ok) updated++;
  }

  return {
    updated,
    skippedNotPayment,
    skippedNoEmail,
    total: sessions.length,
  };
}

async function main() {
  console.log("[reconcile] starting", { DRY_RUN, SINCE_DAYS });
  await mongoose.connect(MONGODB_URI);

  try {
    if (PRINT_ACTIVE_SUBSCRIPTIONS) {
      await listActiveSubscriptionsForSanityCheck();
    }
    const subs = await reconcileSubscriptions();
    const oneTime = await reconcileOneTimeCheckoutSessions();

    console.log("[reconcile] done", { subs, oneTime, DRY_RUN });
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error("[reconcile] fatal", err);
  process.exitCode = 1;
});

