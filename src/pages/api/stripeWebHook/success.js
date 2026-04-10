import dbConnect from "@/lib/dbConnect";
import User from "@/models/Users";
import { buffer } from "micro";

export const config = {
  api: {
    bodyParser: false,
  },
};

// Mapping by amount + interval avoids collisions (e.g. 1999 can be monthly Basic or weekly Elite).
// Keep legacy plans so existing subscribers are not downgraded.
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

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

  let event;
  try {
    const rawBody = await buffer(req);
    const sig = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(
      rawBody.toString(),
      sig,
      endpointSecret
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const data = event.data.object;

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(data);
        break;
      case "checkout.session.async_payment_succeeded":
        await handleCheckoutCompleted(data);
        break;
      case "customer.subscription.deleted":
      case "customer.subscription.updated":
        await handleSubscriptionChange(data, event.type);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(data);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return res.status(500).json({ error: err.message });
  }

  res.status(200).json({ received: true });
}

async function handleCheckoutCompleted(session) {
  if (session.mode === "payment") {
    const amount = session.amount_total;
    if (amount === 0) {
      console.warn("Skipping payment with amount_total 0 (trial may use subscription mode)");
      return;
    }
    const mapping = resolvePlan({ amount, mode: "payment" });
    if (!mapping) {
      console.error(
        `[Stripe Webhook] Unrecognized one-time payment amount: ${amount} cents. ` +
        `Add to PLAN_MAP or verify Stripe price. User may not get access.`
      );
      return;
    }
    const email = session.customer_details?.email;
    const name = session.customer_details?.name;
    if (!email) {
      console.warn("No email in checkout session");
      return;
    }
    await updateUserPayment(email, name, amount, {
      tier: mapping.tier,
      cycle: mapping.cycle,
      status: "active",
      lifetimeMember: mapping.tier === "lifetime",
      stripeCustomerId: session.customer || null,
      stripeSubscriptionId: null,
      stripePriceId: null,
      nextPaymentDate: null,
      subscriptionStartedAt: new Date(),
    });
  } else if (session.mode === "subscription" && session.subscription) {
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    const sub = await stripe.subscriptions.retrieve(session.subscription);
    const email = session.customer_details?.email;
    const isActive = sub.status === "active" || sub.status === "trialing";
    if (email && isActive) {
      const mapping = mapSubscriptionToTier(sub);
      if (!mapping) return; // Unrecognized - skip update, error already logged
      const amount = sub.items?.data?.[0]?.plan?.amount ?? sub.items?.data?.[0]?.price?.unit_amount ?? 0;
      await updateUserPayment(email, session.customer_details?.name, amount, {
        tier: mapping.tier,
        cycle: mapping.cycle,
        status: "active",
        lifetimeMember: false,
        stripeCustomerId: sub.customer || session.customer || null,
        stripeSubscriptionId: sub.id || null,
        stripePriceId: sub.items?.data?.[0]?.price?.id || null,
        nextPaymentDate: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
        subscriptionStartedAt: sub.start_date ? new Date(sub.start_date * 1000) : new Date(),
      });
    }
  }
}

async function handleSubscriptionChange(subscription, eventType) {
  const status =
    eventType === "customer.subscription.deleted"
      ? "cancelled"
      : subscription.status === "active" || subscription.status === "trialing"
      ? "active"
      : subscription.status;

  let customerEmail = subscription.customer_email;
  if (!customerEmail && subscription.customer) {
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    const customer = await stripe.customers.retrieve(subscription.customer);
    customerEmail = customer.email;
  }

  if (customerEmail) {
    const mapping = mapSubscriptionToTier(subscription);
    await updateUserSubscriptionStatus(customerEmail, {
      status: status === "canceled" ? "cancelled" : status,
      tier: mapping?.tier,
      cycle: mapping?.cycle,
      stripeCustomerId: subscription.customer || null,
      stripeSubscriptionId: subscription.id || null,
      stripePriceId: subscription.items?.data?.[0]?.price?.id || null,
      nextPaymentDate: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : null,
    });
  }
}

async function handlePaymentFailed(invoice) {
  let customerEmail = invoice.customer_email;
  if (!customerEmail && invoice.customer) {
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    const customer = await stripe.customers.retrieve(invoice.customer);
    customerEmail = customer.email;
  }
  if (customerEmail) {
    await updateUserSubscriptionStatus(customerEmail, {
      status: "payment_failed",
    });
  }
}

function mapSubscriptionToTier(subscription) {
  const amount = subscription.items?.data?.[0]?.price?.unit_amount;
  const interval = subscription.items?.data?.[0]?.plan?.interval ?? subscription.items?.data?.[0]?.price?.recurring?.interval;
  const mapping = resolvePlan({ amount, interval, mode: "subscription" });
  if (mapping) {
    return { tier: mapping.tier, cycle: mapping.cycle };
  }
  // Do NOT guess - unrecognized amounts could wrongly downgrade premium users
  console.error(
    `[Stripe Webhook] Unrecognized subscription amount: ${amount} cents, interval: ${interval}. ` +
    `Add to PLAN_MAP or use price ID mapping. User may not get access.`
  );
  return null;
}

async function updateUserPayment(email, name, amount, opts) {
  await dbConnect();
  const {
    tier,
    cycle,
    status,
    lifetimeMember,
    stripeCustomerId,
    stripeSubscriptionId,
    stripePriceId,
    nextPaymentDate,
    subscriptionStartedAt,
  } = opts;

  let user = await User.findOne({ email });
  const update = {
    name: name || user?.name,
    subscriptionTier: tier,
    billingCycle: cycle,
    subscriptionStatus: status,
    lifetimeMember: !!lifetimeMember,
    subscriptionType: `${tier}_${cycle}`,
    netPay: user?.netPay ? Number(user.netPay) + Number(amount) : amount,
    token: 100,
    subscribedAt: subscriptionStartedAt || user?.subscribedAt || new Date(),
    nextPaymentDate: nextPaymentDate || null,
    stripeCustomerId: stripeCustomerId || user?.stripeCustomerId || null,
    stripeSubscriptionId: stripeSubscriptionId || user?.stripeSubscriptionId || null,
    stripePriceId: stripePriceId || user?.stripePriceId || null,
  };

  if (!user) {
    await User.create({ email, ...update });
  } else {
    await User.findByIdAndUpdate(user._id, { $set: update });
  }
}

async function updateUserSubscriptionStatus(email, opts) {
  await dbConnect();
  const user = await User.findOne({ email });
  if (!user) return;

  const update = {};
  if (opts.status) update.subscriptionStatus = opts.status;
  if (opts.tier) update.subscriptionTier = opts.tier;
  if (opts.cycle) update.billingCycle = opts.cycle;
  if (opts.stripeCustomerId) update.stripeCustomerId = opts.stripeCustomerId;
  if (opts.stripeSubscriptionId) update.stripeSubscriptionId = opts.stripeSubscriptionId;
  if (opts.stripePriceId) update.stripePriceId = opts.stripePriceId;
  if ("nextPaymentDate" in opts) update.nextPaymentDate = opts.nextPaymentDate;

  // Never remove lifetime access from webhook churn.
  if (!user.lifetimeMember) {
    if (opts.status === "cancelled" || opts.status === "payment_failed") {
      update.subscriptionStatus = opts.status;
    }
  }

  if ((opts.status === "active" || opts.status === "trialing") && !user.subscribedAt) {
    update.subscribedAt = new Date();
  }
  await User.findByIdAndUpdate(user._id, { $set: update });
}
