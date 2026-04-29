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

  // Lifetime Payment Link ($199.99 one-time): Elite-tier entitlements + lifetimeMember in DB
  "19999:one-time": { tier: "elite", cycle: "lifetime", lifetimeMember: true },
};

function resolvePlan({ amount, interval, mode }) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return null;
  const key = `${amount}:${mode === "payment" ? "one-time" : interval || "unknown"}`;
  return PLAN_MAP[key] || null;
}

function mappingGrantsLifetime(mapping) {
  if (!mapping) return false;
  if (mapping.lifetimeMember === true) return true;
  return mapping.tier === "lifetime";
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function userEntitlementScore(user) {
  if (!user) return 0;
  const status = String(user.subscriptionStatus || "").toLowerCase();
  let score = 0;
  if (user.lifetimeMember) score += 100;
  if (status === "active") score += 50;
  if (status === "trialing") score += 25;
  if (user.subscriptionTier) score += 10;
  if (user.stripeSubscriptionId) score += 5;
  if (user.stripeCustomerId) score += 3;
  return score;
}

async function findUserForWebhook({ email, stripeCustomerId, stripeSubscriptionId }) {
  await dbConnect();

  if (stripeSubscriptionId) {
    const bySub = await User.findOne({ stripeSubscriptionId: String(stripeSubscriptionId) });
    if (bySub) return bySub;
  }
  if (stripeCustomerId) {
    const byCustomer = await User.findOne({ stripeCustomerId: String(stripeCustomerId) });
    if (byCustomer) return byCustomer;
  }

  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const candidates = await User.find({
    email: { $regex: new RegExp(`^${escapeRegex(normalized)}$`, "i") },
  });
  if (!candidates?.length) return null;
  candidates.sort((a, b) => userEntitlementScore(b) - userEntitlementScore(a));
  return candidates[0];
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
      case "checkout.session.async_payment_failed":
        await handleCheckoutPaymentFailed(data);
        break;
      case "checkout.session.expired":
        await handleCheckoutExpired(data);
        break;

      // Customer lifecycle events (mainly to ensure user record exists)
      case "customer.created":
        await handleCustomerCreated(data);
        break;
      case "customer.updated":
        await handleCustomerUpdated(data);
        break;
      case "customer.deleted":
        await handleCustomerDeleted(data);
        break;

      case "customer.subscription.deleted":
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.paused":
      case "customer.subscription.resumed":
      case "customer.subscription.pending_update_applied":
      case "customer.subscription.pending_update_expired":
        await handleSubscriptionChange(data, event.type);
        break;

      // Invoice payment outcomes
      case "invoice.payment_failed":
        await handlePaymentFailed(data);
        break;
      case "invoice.payment_succeeded":
      case "invoice.paid":
      case "invoice_payment.paid":
        await handleInvoicePaymentSucceeded(data);
        break;
      case "invoice.payment_action_required":
        await handleInvoicePaymentNeedsAction(data, "payment_action_required");
        break;
      case "invoice.payment_attempt_required":
        await handleInvoicePaymentNeedsAction(data, "payment_attempt_required");
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
      lifetimeMember: mappingGrantsLifetime(mapping),
      stripeCustomerId: session.customer || null,
      stripeSubscriptionId: null,
      stripePriceId: null,
      nextPaymentDate: null,
      subscriptionStartedAt: new Date(),
    });
  } else if (session.mode === "subscription" && session.subscription) {
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    const sub = await resolveSubscriptionFromCheckoutSession(session, stripe);
    const email = session.customer_details?.email;
    if (!sub) {
      if (email) {
        await updateUserSubscriptionStatus(email, {
          status: "active",
          stripeCustomerId: session.customer || null,
          stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : session.subscription?.id || null,
          nextPaymentDate: null,
        });
      }
      return;
    }
    const isActive = sub.status === "active" || sub.status === "trialing";
    if (email && isActive) {
      const mapping = mapSubscriptionToTier(sub);
      const amount = sub.items?.data?.[0]?.plan?.amount ?? sub.items?.data?.[0]?.price?.unit_amount ?? 0;
      const status = sub.status === "trialing" ? "trialing" : "active";
      await updateUserPayment(email, session.customer_details?.name, amount, {
        tier: mapping?.tier,
        cycle: mapping?.cycle,
        status,
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
      : subscription.status;

  let customerEmail = subscription.customer_email;
  if (!customerEmail && subscription.customer) {
    try {
      const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
      const customer = await stripe.customers.retrieve(subscription.customer);
      customerEmail = customer.email;
    } catch (err) {
      console.error("[Stripe Webhook] Failed to retrieve customer for subscription change:", err?.message || err);
    }
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
  const customerEmail = await getEmailFromStripeObject(invoice);
  if (!customerEmail) return;

  await updateUserSubscriptionStatus(customerEmail, {
    status: "payment_failed",
  });
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

function buildSubscriptionFromInvoice(invoice) {
  if (!invoice) return null;
  const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
  if (!subscriptionId) return null;

  const lineItems = invoice?.lines?.data || [];
  const subscriptionLine =
    lineItems.find((line) => line?.type === "subscription") ||
    lineItems.find((line) => line?.price?.recurring) ||
    lineItems[0];
  if (!subscriptionLine) return null;

  const price = subscriptionLine?.price || {};
  const plan = subscriptionLine?.plan || {};
  return {
    id: subscriptionId,
    customer: typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id,
    customer_email: invoice.customer_email || invoice?.customer_details?.email || null,
    status: invoice.paid ? "active" : "incomplete",
    current_period_end: subscriptionLine?.period?.end || null,
    start_date: subscriptionLine?.period?.start || null,
    items: {
      data: [{
        price: {
          id: price.id || null,
          unit_amount: price.unit_amount ?? plan.amount ?? null,
          recurring: price.recurring || (plan.interval ? { interval: plan.interval } : null),
        },
        plan: {
          amount: plan.amount ?? price.unit_amount ?? null,
          interval: plan.interval ?? price?.recurring?.interval ?? null,
        },
      }],
    },
  };
}

async function resolveSubscriptionFromCheckoutSession(session, stripe) {
  const subscriptionId = typeof session?.subscription === "string" ? session.subscription : session?.subscription?.id;
  if (!subscriptionId) return null;

  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (err) {
    console.error(`[Stripe Webhook] subscriptions.retrieve failed for ${subscriptionId}:`, err?.message || err);
  }

  const invoiceId = typeof session?.invoice === "string" ? session.invoice : session?.invoice?.id;
  if (invoiceId) {
    try {
      const invoice = await stripe.invoices.retrieve(invoiceId);
      const synthetic = buildSubscriptionFromInvoice(invoice);
      if (synthetic) return synthetic;
    } catch (err) {
      console.error(`[Stripe Webhook] invoices.retrieve fallback failed for ${invoiceId}:`, err?.message || err);
    }
  }

  if (session?.id) {
    try {
      const expanded = await stripe.checkout.sessions.retrieve(session.id, { expand: ["subscription"] });
      if (expanded?.subscription && typeof expanded.subscription === "object") {
        return expanded.subscription;
      }
    } catch (err) {
      console.error(`[Stripe Webhook] checkout.sessions.retrieve fallback failed for ${session.id}:`, err?.message || err);
    }
  }

  return null;
}

async function handleCheckoutPaymentFailed(session) {
  // Payment links may use delayed payment methods; this is the explicit failure signal.
  const email = session?.customer_details?.email;
  if (!email) return;

  // Best-effort tier/cycle mapping; we do not grant access on failure.
  try {
    if (session.mode === "subscription" && session.subscription) {
      const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
      const sub = await stripe.subscriptions.retrieve(session.subscription);
      const mapping = mapSubscriptionToTier(sub);
      await updateUserSubscriptionStatus(email, {
        status: "payment_failed",
        tier: mapping?.tier,
        cycle: mapping?.cycle,
        stripeCustomerId: sub.customer || session.customer || null,
        stripeSubscriptionId: sub.id || null,
        stripePriceId: sub.items?.data?.[0]?.price?.id || null,
        nextPaymentDate: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
      });
      return;
    }

    if (session.mode === "payment") {
      const amount = session.amount_total;
      if (typeof amount === "number" && Number.isFinite(amount)) {
        const mapping = resolvePlan({ amount, mode: "payment" });
        await updateUserSubscriptionStatus(email, {
          status: "payment_failed",
          tier: mapping?.tier,
          cycle: mapping?.cycle,
          stripeCustomerId: session.customer || null,
          stripeSubscriptionId: null,
          stripePriceId: null,
          nextPaymentDate: null,
        });
      } else {
        await updateUserSubscriptionStatus(email, { status: "payment_failed" });
      }
      return;
    }
  } catch (err) {
    console.error("[Stripe Webhook] Failed to process async_payment_failed mapping:", err);
  }

  await updateUserSubscriptionStatus(email, { status: "payment_failed" });
}

async function handleCheckoutExpired(session) {
  const email = session?.customer_details?.email;
  if (!email) return;
  await updateUserSubscriptionStatus(email, { status: "expired" });
}

async function handleInvoicePaymentNeedsAction(invoice, statusValue) {
  const customerEmail = await getEmailFromStripeObject(invoice);
  if (!customerEmail) return;
  await updateUserSubscriptionStatus(customerEmail, { status: statusValue });
}

async function handleInvoicePaymentSucceeded(invoice) {
  if (invoice?.subscription) {
    const syntheticSub = buildSubscriptionFromInvoice(invoice);
    if (syntheticSub) {
      await handleSubscriptionChange(syntheticSub, "customer.subscription.updated");
      return;
    }

    // Rare fallback when invoice payload lacks enough line item details.
    try {
      const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
      const sub = await stripe.subscriptions.retrieve(invoice.subscription);
      await handleSubscriptionChange(sub, "customer.subscription.updated");
      return;
    } catch (err) {
      console.error("[Stripe Webhook] Failed to retrieve subscription for invoice payment success:", err?.message || err);
    }
  }

  // Fallback: treat as one-time payment if we can map by amount.
  const customerEmail = await getEmailFromStripeObject(invoice);
  if (!customerEmail) return;

  const amount = invoice?.amount_paid ?? invoice?.amount_total;
  if (typeof amount !== "number" || !Number.isFinite(amount)) return;

  const mapping = resolvePlan({ amount, mode: "payment" });
  if (!mapping) {
    // Don't hard-fail: still mark active so user can access if we cannot map the tier.
    await updateUserSubscriptionStatus(customerEmail, { status: "active" });
    return;
  }

  const name =
    invoice?.customer_name ||
    invoice?.customer_details?.name ||
    customerEmail.split("@")[0] ||
    "Customer";

  await updateUserPayment(customerEmail, name, amount, {
    tier: mapping.tier,
    cycle: mapping.cycle,
    status: "active",
    lifetimeMember: mappingGrantsLifetime(mapping),
    stripeCustomerId: invoice?.customer || null,
    stripeSubscriptionId: null,
    stripePriceId: invoice?.lines?.data?.[0]?.price?.id || null,
    nextPaymentDate: null,
    subscriptionStartedAt: new Date(),
  });
}

async function handleCustomerCreated(customer) {
  const email = customer?.email;
  if (!email) return;
  const name = customer?.name || email.split("@")[0] || "Customer";
  await upsertUserByEmail(email, {
    name,
    stripeCustomerId: customer?.id || null,
  });
}

async function handleCustomerUpdated(customer) {
  const email = customer?.email;
  if (!email) return;
  await upsertUserByEmail(email, {
    name: customer?.name || undefined,
    stripeCustomerId: customer?.id || undefined,
  });
}

async function handleCustomerDeleted(customer) {
  // Mark entitlements as cancelled if we can associate by email.
  const email = customer?.email;
  if (!email) return;
  await updateUserSubscriptionStatus(email, { status: "cancelled" });
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

  const normalizedEmail = normalizeEmail(email);
  let user = await findUserForWebhook({
    email: normalizedEmail,
    stripeCustomerId,
    stripeSubscriptionId,
  });
  const update = {
    name: name || user?.name,
    ...(tier ? { subscriptionTier: tier } : {}),
    ...(cycle ? { billingCycle: cycle } : {}),
    subscriptionStatus: status,
    lifetimeMember: !!lifetimeMember,
    ...(tier && cycle ? { subscriptionType: `${tier}_${cycle}` } : {}),
    netPay: user?.netPay ? Number(user.netPay) + Number(amount) : amount,
    token: 100,
    subscribedAt: subscriptionStartedAt || user?.subscribedAt || new Date(),
    nextPaymentDate: nextPaymentDate || null,
    stripeCustomerId: stripeCustomerId || user?.stripeCustomerId || null,
    stripeSubscriptionId: stripeSubscriptionId || user?.stripeSubscriptionId || null,
    stripePriceId: stripePriceId || user?.stripePriceId || null,
  };

  if (!user) {
    await User.create({ email: normalizedEmail, ...update });
  } else {
    await User.findByIdAndUpdate(user._id, { $set: { ...update, email: normalizeEmail(user.email || normalizedEmail) } });
  }
}

async function updateUserSubscriptionStatus(email, opts) {
  await dbConnect();
  const normalizedEmail = normalizeEmail(email);
  const user = await findUserForWebhook({
    email: normalizedEmail,
    stripeCustomerId: opts?.stripeCustomerId,
    stripeSubscriptionId: opts?.stripeSubscriptionId,
  });
  const tier = opts?.tier;
  const cycle = opts?.cycle;

  // If we subscribed to customer.* events, we may already have a user document.
  // Otherwise, create one so subscription/invoice events can still update access reliably.
  if (!user) {
    const now = new Date();
    await User.create({
      email: normalizedEmail,
      lifetimeMember: false,
      subscriptionTier: tier || undefined,
      billingCycle: cycle || undefined,
      subscriptionStatus: opts?.status || undefined,
      subscriptionType: tier && cycle ? `${tier}_${cycle}` : undefined,
      subscribedAt: opts?.status === "active" || opts?.status === "trialing" ? now : undefined,
      nextPaymentDate: "nextPaymentDate" in opts ? opts.nextPaymentDate : undefined,
      stripeCustomerId: opts?.stripeCustomerId || undefined,
      stripeSubscriptionId: opts?.stripeSubscriptionId || undefined,
      stripePriceId: opts?.stripePriceId || undefined,
      token: 100,
    });
    return;
  }

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

async function upsertUserByEmail(email, { name, stripeCustomerId }) {
  await dbConnect();
  const normalizedEmail = normalizeEmail(email);
  const existing = await findUserForWebhook({ email: normalizedEmail, stripeCustomerId, stripeSubscriptionId: null });
  if (!existing) {
    await User.create({
      email: normalizedEmail,
      name: name || normalizedEmail.split("@")[0] || "Customer",
      stripeCustomerId: stripeCustomerId || null,
      token: 100,
    });
    return;
  }

  const patch = {};
  if (typeof name === "string" && name.trim()) patch.name = name.trim();
  if (stripeCustomerId) patch.stripeCustomerId = stripeCustomerId;
  if (Object.keys(patch).length) {
    await User.findByIdAndUpdate(existing._id, { $set: patch });
  }
}

async function getEmailFromStripeObject(obj) {
  if (!obj) return null;
  // Common fields across invoice/payment objects
  const email =
    obj.customer_email ||
    obj?.customer_details?.email ||
    obj?.billing_details?.email ||
    obj?.customer_details?.customer_email ||
    null;
  if (email) return email;

  // Fallback: if we only have a stripe customer id, fetch it.
  if (obj.customer) {
    try {
      const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
      const customer = await stripe.customers.retrieve(obj.customer);
      return customer?.email || null;
    } catch (err) {
      console.error("[Stripe Webhook] Failed to resolve customer email:", err?.message || err);
    }
  }
  return null;
}
