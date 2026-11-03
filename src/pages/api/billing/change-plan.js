import { loadSessionMember } from "@/lib/requirePaidMember";
import { getStripe, stripeSecretKey } from "@/lib/stripe/client";
import { planFromQuery, resolveCheckoutPrice } from "@/lib/stripe/catalog";
import {
  findMemberSubscription,
  subscriptionItem,
  summarizeSubscription,
  syncUserFromSubscription,
} from "@/lib/stripe/membership";
import { notifyCheckoutAlert } from "@/lib/telegram/checkoutAlert";
import { BLACK_FRIDAY, blackFridayAppliesTo } from "@/lib/promo/blackFriday";

function usd(cents) {
  return typeof cents === "number" ? `$${(cents / 100).toFixed(2)}` : undefined;
}

/**
 * POST /api/billing/change-plan  { plan, cycle, preview?, prorationDate? }
 * Moves an existing subscription to another tier or cycle. The prorated
 * difference is invoiced immediately; if that charge fails, Stripe keeps the
 * old plan (pending_if_incomplete) so nobody gets an upgrade they didn't pay for.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false });
  }
  if (!stripeSecretKey()) {
    return res.status(503).json({ success: false, message: "Billing is not configured." });
  }

  let member;
  try {
    member = await loadSessionMember(req);
  } catch {
    return res.status(503).json({ success: false, message: "Account lookup is unavailable." });
  }
  if (!member.session) return res.status(401).json({ success: false, message: "Unauthorized" });
  if (!member.dbUser) {
    return res.status(400).json({ success: false, message: "No billing account is linked to this login." });
  }
  if (member.dbUser.lifetimeMember) {
    return res.status(400).json({ success: false, message: "You already have lifetime access." });
  }

  const target = planFromQuery(req.body?.plan, req.body?.cycle);
  if (!target || target.mode !== "subscription") {
    return res.status(400).json({ success: false, message: "Unknown plan." });
  }

  const stripe = getStripe();
  let sub;
  try {
    sub = await findMemberSubscription(stripe, member.dbUser);
  } catch (err) {
    return res.status(502).json({ success: false, message: "Stripe could not be reached. Try again." });
  }
  if (!sub || !["active", "trialing"].includes(sub.status)) {
    return res.status(409).json({
      success: false,
      code: "NO_ACTIVE_SUBSCRIPTION",
      message: "There's no active subscription to change. Choose a plan to subscribe.",
    });
  }
  if (sub.cancel_at_period_end) {
    return res.status(409).json({
      success: false,
      code: "CANCEL_SCHEDULED",
      message: "Your plan is set to cancel. Resume it in Manage billing before switching plans.",
    });
  }
  if (sub.pending_update) {
    return res.status(409).json({
      success: false,
      code: "PENDING_UPDATE",
      message: "A plan change is waiting on payment. Finish it in Manage billing first.",
    });
  }

  const item = subscriptionItem(sub);
  if (!item?.id) {
    return res.status(409).json({ success: false, message: "This subscription can't be changed here." });
  }
  const current = summarizeSubscription(sub);
  if (current.planKey === target.key) {
    return res.status(400).json({ success: false, message: "You're already on this plan." });
  }

  const resolved = await resolveCheckoutPrice(target);
  if (!resolved?.priceId) {
    return res.status(502).json({ success: false, message: "That plan isn't available right now." });
  }
  if (resolved.priceId === current.priceId) {
    return res.status(400).json({ success: false, message: "You're already on this plan." });
  }

  const discounts = blackFridayAppliesTo(target) ? [{ coupon: BLACK_FRIDAY.couponId }] : undefined;
  const alertFields = {
    User: String(member.dbUser._id),
    Email: member.dbUser.email,
    From: current.planKey || current.priceId,
    To: target.key,
    Promo: discounts ? `${BLACK_FRIDAY.name} (${BLACK_FRIDAY.couponId})` : undefined,
  };

  const requestedDate = Number(req.body?.prorationDate);
  const now = Math.floor(Date.now() / 1000);
  const prorationDate =
    Number.isFinite(requestedDate) && requestedDate <= now && now - requestedDate < 15 * 60
      ? Math.floor(requestedDate)
      : now;

  if (req.body?.preview) {
    try {
      const upcoming = await stripe.invoices.retrieveUpcoming({
        customer: current.customerId,
        subscription: sub.id,
        subscription_items: [{ id: item.id, price: resolved.priceId }],
        subscription_proration_behavior: "always_invoice",
        subscription_proration_date: prorationDate,
        ...(discounts ? { discounts } : {}),
      });
      return res.status(200).json({
        success: true,
        preview: {
          dueNow: upcoming.amount_due,
          total: upcoming.total,
          currency: upcoming.currency,
          prorationDate,
          newAmount: target.amount,
          newCycle: target.cycle,
        },
      });
    } catch (err) {
      await notifyCheckoutAlert({
        title: "Plan change preview failed",
        fields: { ...alertFields, Error: err?.raw?.message || err?.message || String(err) },
      });
      return res.status(200).json({
        success: true,
        preview: { dueNow: null, total: null, currency: "usd", prorationDate, newAmount: target.amount, newCycle: target.cycle },
      });
    }
  }

  try {
    const updated = await stripe.subscriptions.update(
      sub.id,
      {
        items: [{ id: item.id, price: resolved.priceId }],
        proration_behavior: "always_invoice",
        proration_date: prorationDate,
        payment_behavior: "pending_if_incomplete",
        expand: ["latest_invoice"],
        ...(discounts ? { discounts } : {}),
      },
      { idempotencyKey: `plan-change:${sub.id}:${resolved.priceId}:${prorationDate}${discounts ? ":bf" : ""}` },
    );

    const invoice = typeof updated.latest_invoice === "object" ? updated.latest_invoice : null;
    if (updated.pending_update) {
      await notifyCheckoutAlert({
        severity: "notice",
        title: "Plan change payment failed; member kept their current plan",
        fields: { ...alertFields, "Amount due": usd(invoice?.amount_due), Invoice: invoice?.hosted_invoice_url },
      });
      return res.status(402).json({
        success: false,
        code: "PAYMENT_REQUIRED",
        message: "Your card couldn't be charged for the new plan. You're still on your current plan.",
        invoiceUrl: invoice?.hosted_invoice_url || null,
      });
    }

    const discounted = (invoice?.total_discount_amounts || []).reduce((sum, d) => sum + (d?.amount || 0), 0);
    if (discounts && invoice && invoice.subtotal > 0 && discounted === 0) {
      await notifyCheckoutAlert({
        title: `${BLACK_FRIDAY.name}: plan change charged without the 50% discount`,
        fields: {
          ...alertFields,
          Paid: usd(invoice.amount_paid),
          Invoice: invoice.id,
          Fix: "Refund the difference in Stripe",
        },
      });
    }

    await syncUserFromSubscription(member.dbUser, updated);
    return res.status(200).json({ success: true, subscription: summarizeSubscription(updated) });
  } catch (err) {
    const message = err?.raw?.message || err?.message || String(err);
    await notifyCheckoutAlert({
      title: "Plan change failed",
      fields: { ...alertFields, Error: message },
    });
    const cardError = err?.type === "StripeCardError";
    return res.status(cardError ? 402 : 502).json({
      success: false,
      code: cardError ? "PAYMENT_REQUIRED" : "STRIPE_ERROR",
      message: cardError
        ? "Your card couldn't be charged for the new plan. You're still on your current plan."
        : "We couldn't change your plan. Nothing was charged. Try again in a moment.",
    });
  }
}
