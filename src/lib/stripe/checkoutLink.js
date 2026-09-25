import dbConnect from "@/lib/dbConnect";
import User from "@/models/Users";
import CheckoutAttempt from "@/models/CheckoutAttempt";
import { getStripe } from "@/lib/stripe/client";
import { readAttemptId } from "@/lib/stripe/checkoutCookies";
import { notifyCheckoutAlert } from "@/lib/telegram/checkoutAlert";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sameId(a, b) {
  return a && b && String(a._id) === String(b._id);
}

async function findByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  return User.findOne({
    email: { $regex: new RegExp(`^${escapeRegex(normalized)}$`, "i") },
  });
}

function sessionPaid(session) {
  return session?.payment_status === "paid" || session?.payment_status === "no_payment_required";
}

function billingEmailFromSession(session) {
  return normalizeEmail(session?.customer_details?.email || session?.customer_email);
}

function customerIdFromSession(session) {
  if (!session?.customer) return "";
  return typeof session.customer === "string" ? session.customer : session.customer.id || "";
}

async function findHolder({ stripeCustomerId, billingEmail }) {
  if (stripeCustomerId) {
    const byCustomer = await User.findOne({ stripeCustomerId: String(stripeCustomerId) });
    if (byCustomer) return byCustomer;
  }
  if (billingEmail) {
    const byEmail = await findByEmail(billingEmail);
    if (byEmail) return byEmail;
    const byBilling = await User.findOne({
      billing_email: { $regex: new RegExp(`^${escapeRegex(billingEmail)}$`, "i") },
    });
    if (byBilling) return byBilling;
  }
  return null;
}

/**
 * Move a paid Stripe customer onto the Magic Link email when they differ.
 * Safe to call more than once.
 */
export async function reconcileCheckoutIdentity(attemptId, loginEmail) {
  await dbConnect();
  const attempt = await CheckoutAttempt.findOne({ attemptId });
  if (!attempt) return null;

  const login = normalizeEmail(loginEmail || attempt.loginEmail);
  if (!login) return null;
  const billing = normalizeEmail(attempt.billingEmail);
  const holder = await findHolder({
    stripeCustomerId: attempt.stripeCustomerId,
    billingEmail: billing,
  });
  const loginUser = await findByEmail(login);

  if (attempt.granted && !holder && !attempt.matchAlerted) {
    attempt.matchAlerted = true;
    await attempt.save();
    await notifyCheckoutAlert({
      title: "Paid checkout could not be matched to a user",
      fields: {
        Attempt: attemptId,
        "Billing email": billing,
        "Login email": login,
        "Stripe customer": attempt.stripeCustomerId,
        "Stripe session": attempt.stripeSessionId,
      },
    });
  }

  if (holder && (!loginUser || sameId(holder, loginUser))) {
    const emailChanged = normalizeEmail(holder.email) !== login;
    if (emailChanged) holder.email = login;
    if (billing && billing !== login && normalizeEmail(holder.billing_email) !== billing) {
      holder.billing_email = billing;
    }
    if (holder.isModified()) await holder.save();
    attempt.status = "linked";
    attempt.loginEmail = login;
    attempt.userId = holder._id;
    if (emailChanged && billing && billing !== login && !attempt.linkAlerted) {
      attempt.linkAlerted = true;
      await notifyCheckoutAlert({
        severity: "notice",
        title: "Stripe checkout linked to Magic Link email",
        fields: {
          "Billing email": billing,
          "Login email": login,
          Plan: attempt.planKey,
          "User id": String(holder._id),
          "Stripe customer": attempt.stripeCustomerId,
        },
      });
    }
    await attempt.save();
    return holder;
  }

  if (holder && loginUser && !sameId(holder, loginUser)) {
    if (holder.subscriptionStatus === "merged" && !holder.stripeCustomerId) {
      attempt.status = "linked";
      attempt.loginEmail = login;
      attempt.userId = loginUser._id;
      await attempt.save();
      return loginUser;
    }
    const patch = {
      billing_email: billing || normalizeEmail(holder.email),
      lifetimeMember: !!(loginUser.lifetimeMember || holder.lifetimeMember),
      netPay: Number(loginUser.netPay || 0) + Number(holder.netPay || 0),
    };
    for (const field of [
      "subscriptionTier",
      "billingCycle",
      "subscriptionStatus",
      "subscriptionType",
      "subscribedAt",
      "nextPaymentDate",
      "stripeCustomerId",
      "stripeSubscriptionId",
      "stripePriceId",
      "token",
    ]) {
      if (holder[field] != null && holder[field] !== "") patch[field] = holder[field];
    }
    await User.findByIdAndUpdate(loginUser._id, { $set: patch });
    await User.findByIdAndUpdate(holder._id, {
      $set: {
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripePriceId: null,
        subscriptionStatus: "merged",
        lifetimeMember: false,
        netPay: 0,
        "metadata.mergedInto": String(loginUser._id),
      },
    });
    attempt.status = "linked";
    attempt.loginEmail = login;
    attempt.userId = loginUser._id;
    if (!attempt.linkAlerted) {
      attempt.linkAlerted = true;
      await notifyCheckoutAlert({
        severity: "notice",
        title: "Stripe checkout merged onto existing account",
        fields: {
          "Billing email": billing || normalizeEmail(holder.email),
          "Login email": login,
          Plan: attempt.planKey,
          "Login user": String(loginUser._id),
          "Billing user": String(holder._id),
          "Stripe customer": patch.stripeCustomerId,
        },
      });
    }
    await attempt.save();
    return User.findById(loginUser._id);
  }

  if (!holder && loginUser) {
    attempt.loginEmail = login;
    attempt.userId = loginUser._id;
    await attempt.save();
  }
  return null;
}

/**
 * Remember the Magic Link email, grant the Checkout Session once, then
 * attach that payment to this login. Returns the user who should own the session.
 */
export async function attachCheckoutToEmail(req, loginEmail) {
  const attemptId = readAttemptId(req);
  const login = normalizeEmail(loginEmail);
  if (!attemptId || !login) return null;

  try {
    await dbConnect();
    const attempt = await CheckoutAttempt.findOne({ attemptId });
    if (!attempt?.stripeSessionId) return null;
    if (attempt.expiresAt && attempt.expiresAt.getTime() < Date.now()) {
      await notifyCheckoutAlert({
        title: "Checkout attempt expired before login",
        fields: {
          Attempt: attemptId,
          "Login email": login,
          Plan: attempt.planKey,
        },
      });
      return null;
    }

    attempt.loginEmail = login;
    await attempt.save();

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(attempt.stripeSessionId);
    if (session?.metadata?.checkoutAttemptId !== attemptId) {
      await notifyCheckoutAlert({
        title: "Checkout session did not match this browser",
        fields: {
          Attempt: attemptId,
          "Stripe session": attempt.stripeSessionId,
          "Login email": login,
        },
      });
      return null;
    }

    const billing = billingEmailFromSession(session);
    const customerId = customerIdFromSession(session);
    if (billing) attempt.billingEmail = billing;
    if (customerId) attempt.stripeCustomerId = customerId;
    await attempt.save();

    if (!sessionPaid(session)) {
      if (!attempt.pendingAlerted) {
        attempt.pendingAlerted = true;
        await attempt.save();
        await notifyCheckoutAlert({
          severity: "notice",
          title: "Checkout waiting on payment",
          fields: {
            Attempt: attemptId,
            "Payment status": session.payment_status,
            "Billing email": billing,
            "Login email": login,
            Plan: attempt.planKey,
          },
        });
      }
      return null;
    }

    const { grantEmbeddedCheckoutSession } = await import("@/pages/api/stripeWebHook/success");
    await grantEmbeddedCheckoutSession(session);
    const user = await reconcileCheckoutIdentity(attemptId, login);
    const fresh = await CheckoutAttempt.findOne({ attemptId });
    return { user, clearCookie: fresh?.status === "linked" };
  } catch (err) {
    await notifyCheckoutAlert({
      title: "Could not attach checkout to Magic Link login",
      fields: {
        Attempt: attemptId,
        "Login email": login,
        Error: err?.message || String(err),
      },
    });
    return null;
  }
}
