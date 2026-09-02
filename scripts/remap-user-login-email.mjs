/**
 * Remap a user's login email while keeping Stripe billing on the original email.
 * Also ensures only the intended Stripe subscription remains active.
 *
 * Usage (inspect only):
 *   node --import ./scripts/register-alias.mjs scripts/remap-user-login-email.mjs \
 *     --from samir@epoch.blue --to samirmghosh@gmail.com --keep-tier pro --prod-db
 *
 * Apply:
 *   ...same... --apply
 *   ...same... --apply --cancel-other-subs
 */
import mongoose from "mongoose";
import Stripe from "stripe";
import { loadRepoEnvForAws } from "./loadRepoEnvForAws.js";
import { mongoDatabaseTarget, resolveAppMongoUri } from "@/lib/resolveMongoUri";

loadRepoEnvForAws();

const args = process.argv.slice(2);
if (args.includes("--prod-db")) process.env.USE_PRODUCTION_DB = "1";

function parseArg(flag) {
  const idx = args.indexOf(flag);
  if (idx === -1 || !args[idx + 1]) return "";
  return String(args[idx + 1]).trim();
}

const FROM_EMAIL = parseArg("--from").toLowerCase();
const TO_EMAIL = parseArg("--to").toLowerCase();
const KEEP_TIER = (parseArg("--keep-tier") || "pro").toLowerCase();
const APPLY = args.includes("--apply");
const CANCEL_OTHER_SUBS = args.includes("--cancel-other-subs");

if (!FROM_EMAIL || !TO_EMAIL) {
  console.error(
    "Usage: ... --from billing@email --to login@email [--keep-tier pro] [--prod-db] [--apply] [--cancel-other-subs]",
  );
  process.exit(1);
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function emailRegex(email) {
  return new RegExp(`^${escapeRegex(email)}$`, "i");
}

function summarizeUser(user) {
  if (!user) return null;
  return {
    _id: String(user._id),
    email: user.email,
    billing_email: user.billing_email || null,
    name: user.name || null,
    subscriptionTier: user.subscriptionTier || null,
    subscriptionStatus: user.subscriptionStatus || null,
    billingCycle: user.billingCycle || null,
    lifetimeMember: !!user.lifetimeMember,
    stripeCustomerId: user.stripeCustomerId || null,
    stripeSubscriptionId: user.stripeSubscriptionId || null,
    stripePriceId: user.stripePriceId || null,
    subscribedAt: user.subscribedAt || null,
    nextPaymentDate: user.nextPaymentDate || null,
  };
}

function planLabel(sub) {
  const item = sub?.items?.data?.[0]?.price;
  const nickname = item?.nickname || item?.product?.name || item?.id || "unknown";
  const amount = item?.unit_amount;
  const interval = item?.recurring?.interval;
  return {
    id: sub.id,
    status: sub.status,
    nickname,
    amountCents: amount,
    interval,
    customer: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
    cancel_at_period_end: !!sub.cancel_at_period_end,
  };
}

function looksLikeTier(sub, tier) {
  const item = sub?.items?.data?.[0]?.price;
  const text = [
    item?.nickname,
    item?.lookup_key,
    item?.id,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (tier === "pro") {
    if (/\bpro\b/.test(text)) return true;
    // Current Pro monthly/weekly/annual amounts from PLAN_MAP
    const amount = item?.unit_amount;
    return amount === 999 || amount === 3999 || amount === 39999;
  }
  if (tier === "elite") {
    if (/\belite\b/.test(text)) return true;
    const amount = item?.unit_amount;
    return amount === 1999 || amount === 7999 || amount === 79999;
  }
  if (tier === "basic") {
    if (/\bbasic\b/.test(text)) return true;
    const amount = item?.unit_amount;
    return amount === 499 || amount === 1999 || amount === 19999 || amount === 1599;
  }
  return text.includes(tier);
}

async function findStripeCustomersByEmail(stripe, email) {
  const res = await stripe.customers.list({ email, limit: 20 });
  return res.data || [];
}

async function listCustomerSubscriptions(stripe, customerId) {
  const res = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 50,
    expand: ["data.items.data.price"],
  });
  return res.data || [];
}

async function main() {
  const uri = resolveAppMongoUri();
  if (!uri) throw new Error("Missing MongoDB URI");
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Missing STRIPE_SECRET_KEY");

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2020-08-27",
  });

  console.log(`DB target: ${mongoDatabaseTarget()}`);
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY RUN"}`);
  console.log(`From (billing): ${FROM_EMAIL}`);
  console.log(`To (login):     ${TO_EMAIL}`);
  console.log(`Keep tier:      ${KEEP_TIER}`);
  console.log(`Cancel others:  ${CANCEL_OTHER_SUBS}`);
  console.log("");

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 20000,
    connectTimeoutMS: 20000,
  });

  const User = (await import("@/models/Users")).default;

  const fromUser = await User.findOne({ email: emailRegex(FROM_EMAIL) }).lean();
  const toUser = await User.findOne({ email: emailRegex(TO_EMAIL) }).lean();

  console.log("Mongo — billing email user:", summarizeUser(fromUser) || "(none)");
  console.log("Mongo — login email user:", summarizeUser(toUser) || "(none)");
  console.log("");

  const fromCustomers = await findStripeCustomersByEmail(stripe, FROM_EMAIL);
  const toCustomers = await findStripeCustomersByEmail(stripe, TO_EMAIL);

  console.log(`Stripe customers for ${FROM_EMAIL}: ${fromCustomers.length}`);
  for (const c of fromCustomers) {
    console.log(`  - ${c.id} email=${c.email} name=${c.name || ""}`);
  }
  console.log(`Stripe customers for ${TO_EMAIL}: ${toCustomers.length}`);
  for (const c of toCustomers) {
    console.log(`  - ${c.id} email=${c.email} name=${c.name || ""}`);
  }
  console.log("");

  /** @type {import('stripe').Stripe.Subscription[]} */
  const allSubs = [];
  for (const c of [...fromCustomers, ...toCustomers]) {
    const subs = await listCustomerSubscriptions(stripe, c.id);
    allSubs.push(...subs);
  }

  // Also check subscriptions on customer IDs stored in Mongo.
  const mongoCustomerIds = [
    fromUser?.stripeCustomerId,
    toUser?.stripeCustomerId,
  ].filter(Boolean);
  for (const customerId of mongoCustomerIds) {
    if ([...fromCustomers, ...toCustomers].some((c) => c.id === customerId)) continue;
    const subs = await listCustomerSubscriptions(stripe, customerId);
    allSubs.push(...subs);
  }

  const uniqueSubs = [];
  const seenSubIds = new Set();
  for (const sub of allSubs) {
    if (seenSubIds.has(sub.id)) continue;
    seenSubIds.add(sub.id);
    uniqueSubs.push(sub);
  }

  console.log("Stripe subscriptions found:");
  if (!uniqueSubs.length) console.log("  (none)");
  for (const sub of uniqueSubs) {
    console.log(" ", planLabel(sub));
  }
  console.log("");

  const liveSubs = uniqueSubs.filter((s) =>
    ["active", "trialing", "past_due", "unpaid"].includes(String(s.status)),
  );
  const keepCandidates = liveSubs.filter((s) => looksLikeTier(s, KEEP_TIER));
  const cancelCandidates = liveSubs.filter((s) => !looksLikeTier(s, KEEP_TIER));

  console.log(`Live subs matching keep-tier (${KEEP_TIER}): ${keepCandidates.length}`);
  for (const sub of keepCandidates) console.log("  KEEP", planLabel(sub));
  console.log(`Live subs to cancel (non-${KEEP_TIER}): ${cancelCandidates.length}`);
  for (const sub of cancelCandidates) console.log("  CANCEL", planLabel(sub));
  console.log("");

  if (keepCandidates.length === 0) {
    console.error(`No live ${KEEP_TIER} subscription found. Aborting without changes.`);
    await mongoose.disconnect();
    process.exit(1);
  }
  if (keepCandidates.length > 1) {
    console.warn(
      `Warning: multiple live ${KEEP_TIER} subscriptions found. Will keep the newest one.`,
    );
  }

  keepCandidates.sort((a, b) => (b.created || 0) - (a.created || 0));
  const keepSub = keepCandidates[0];
  const keepCustomerId =
    typeof keepSub.customer === "string" ? keepSub.customer : keepSub.customer?.id;
  const keepPrice = keepSub.items?.data?.[0]?.price;
  const keepInterval = keepPrice?.recurring?.interval || null;
  const billingCycle =
    keepInterval === "week"
      ? "weekly"
      : keepInterval === "year"
        ? "annual"
        : keepInterval === "month"
          ? "monthly"
          : fromUser?.billingCycle || toUser?.billingCycle || "monthly";

  // Decide which Mongo user becomes the canonical login account.
  let canonical = fromUser || toUser;
  if (!canonical) {
    console.error("No Mongo user found for either email. Aborting.");
    await mongoose.disconnect();
    process.exit(1);
  }

  // Prefer the billing/from user as source of truth for Stripe IDs when present.
  if (fromUser && toUser && String(fromUser._id) !== String(toUser._id)) {
    console.log(
      "Both emails have Mongo users. Will move entitlements onto the login-email user and clear the billing-email user.",
    );
    canonical = toUser;
  } else if (fromUser && !toUser) {
    console.log("Only billing email exists in Mongo. Will rename that user email to the login email.");
    canonical = fromUser;
  } else if (!fromUser && toUser) {
    console.log("Only login email exists in Mongo. Will attach Stripe entitlements to that user.");
    canonical = toUser;
  }

  const patch = {
    email: TO_EMAIL,
    billing_email: FROM_EMAIL,
    subscriptionTier: KEEP_TIER,
    subscriptionStatus: keepSub.status === "trialing" ? "trialing" : "active",
    billingCycle,
    stripeCustomerId: keepCustomerId || canonical.stripeCustomerId || null,
    stripeSubscriptionId: keepSub.id,
    stripePriceId: keepPrice?.id || canonical.stripePriceId || null,
    nextPaymentDate: keepSub.current_period_end
      ? new Date(keepSub.current_period_end * 1000)
      : canonical.nextPaymentDate || null,
    subscribedAt: canonical.subscribedAt || new Date((keepSub.created || Date.now() / 1000) * 1000),
  };

  console.log("Planned Mongo patch for canonical user", {
    canonicalId: String(canonical._id),
    currentEmail: canonical.email,
    patch,
  });

  if (fromUser && toUser && String(fromUser._id) !== String(toUser._id)) {
    console.log("Planned: clear entitlements on billing-email user", {
      id: String(fromUser._id),
      email: fromUser.email,
    });
  }

  if (!APPLY) {
    console.log("\nDRY RUN complete. Re-run with --apply to write Mongo changes.");
    if (cancelCandidates.length) {
      console.log(
        `Also pass --cancel-other-subs to cancel ${cancelCandidates.length} non-${KEEP_TIER} Stripe subscription(s).`,
      );
    }
    await mongoose.disconnect();
    return;
  }

  // Apply Stripe cancellations first if requested.
  if (CANCEL_OTHER_SUBS) {
    for (const sub of cancelCandidates) {
      console.log(`Canceling Stripe subscription ${sub.id} (${planLabel(sub).nickname})…`);
      await stripe.subscriptions.cancel(sub.id, {
        invoice_now: false,
        prorate: true,
      });
      console.log(`  canceled ${sub.id}`);
    }
  } else if (cancelCandidates.length) {
    console.log(
      `Skipping Stripe cancellations (${cancelCandidates.length} remaining). Re-run with --cancel-other-subs if desired.`,
    );
  }

  // Ensure Stripe customer keeps billing email as samir@epoch.blue for invoices.
  if (keepCustomerId) {
    try {
      await stripe.customers.update(keepCustomerId, {
        email: FROM_EMAIL,
        metadata: {
          ...(typeof keepSub.metadata === "object" ? {} : {}),
          lychee_login_email: TO_EMAIL,
          lychee_billing_email: FROM_EMAIL,
        },
      });
      console.log(`Stripe customer ${keepCustomerId} billing email kept as ${FROM_EMAIL}`);
    } catch (err) {
      console.warn("Could not update Stripe customer metadata/email:", err?.message || err);
    }
  }

  // Apply Mongo remap.
  if (fromUser && toUser && String(fromUser._id) !== String(toUser._id)) {
    await User.updateOne(
      { _id: toUser._id },
      {
        $set: {
          ...patch,
          name: toUser.name || fromUser.name || undefined,
        },
      },
    );

    await User.updateOne(
      { _id: fromUser._id },
      {
        $set: {
          email: FROM_EMAIL,
          billing_email: FROM_EMAIL,
          subscriptionTier: null,
          subscriptionStatus: "moved",
          billingCycle: null,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          stripePriceId: null,
          nextPaymentDate: null,
          lifetimeMember: false,
        },
      },
    );
    console.log(`Updated login user ${toUser._id} → ${TO_EMAIL}`);
    console.log(`Cleared entitlements on billing user ${fromUser._id} (${FROM_EMAIL})`);
  } else {
    await User.updateOne({ _id: canonical._id }, { $set: patch });
    console.log(`Updated user ${canonical._id}: login=${TO_EMAIL}, billing_email=${FROM_EMAIL}`);
  }

  const verifyLogin = await User.findOne({ email: emailRegex(TO_EMAIL) }).lean();
  const verifyBilling = await User.findOne({ email: emailRegex(FROM_EMAIL) }).lean();
  console.log("\nAfter apply — login user:", summarizeUser(verifyLogin));
  console.log("After apply — billing email user:", summarizeUser(verifyBilling));

  await mongoose.disconnect();
  console.log("\nDone.");
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
