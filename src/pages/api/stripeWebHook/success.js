import dbConnect from "@/lib/dbConnect";
import User from "@/models/Users";
import { buffer } from "micro";

export const config = {
  api: {
    bodyParser: false,
  },
};

// Stripe amounts in cents - must match Stripe product prices exactly
// Lychee Basic - $19.99/month | Lychee Basic Annual - $191.90/year
// Lychee Premium Monthly - $39.99/month | Lychee Premium Annual - $383.90/year
// Lychee Lifetime v2 - $199.99
const AMOUNT_MAP = {
  1999: { tier: "basic", cycle: "monthly" },
  19190: { tier: "basic", cycle: "annual" },
  3999: { tier: "premium", cycle: "monthly" },
  38390: { tier: "premium", cycle: "annual" },
  19999: { tier: "lifetime", cycle: "one-time" },
};

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
    const mapping = AMOUNT_MAP[amount];
    if (!mapping) {
      console.warn(`Unrecognized payment amount: ${amount} cents`);
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
    });
  } else if (session.mode === "subscription" && session.subscription) {
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    const sub = await stripe.subscriptions.retrieve(session.subscription);
    const email = session.customer_details?.email;
    const isActive = sub.status === "active" || sub.status === "trialing";
    if (email && isActive) {
      const mapping = mapSubscriptionToTier(sub);
      const amount = sub.items?.data?.[0]?.plan?.amount ?? sub.items?.data?.[0]?.price?.unit_amount ?? 0;
      await updateUserPayment(email, session.customer_details?.name, amount, {
        tier: mapping.tier,
        cycle: mapping.cycle,
        status: "active",
        lifetimeMember: false,
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
    const { tier, cycle } = mapSubscriptionToTier(subscription);
    await updateUserSubscriptionStatus(customerEmail, {
      status: status === "canceled" ? "cancelled" : status,
      tier,
      cycle,
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
  const interval = subscription.items?.data?.[0]?.plan?.interval;
  const mapping = AMOUNT_MAP[amount];
  if (mapping) {
    return { tier: mapping.tier, cycle: mapping.cycle };
  }
  return {
    tier: interval === "year" ? "basic" : "basic",
    cycle: interval === "year" ? "annual" : "monthly",
  };
}

async function updateUserPayment(email, name, amount, opts) {
  await dbConnect();
  const { tier, cycle, status, lifetimeMember } = opts;

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
    confirmedAt: new Date(),
  };

  if (!user) {
    await User.create({ email, ...update });
  } else {
    await User.findByIdAndUpdate(user._id, update);
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
  if (opts.status === "cancelled" || opts.status === "payment_failed") {
    update.lifetimeMember = false;
  }
  await User.findByIdAndUpdate(user._id, { $set: update });
}
