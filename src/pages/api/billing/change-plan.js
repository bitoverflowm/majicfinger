import { loadSessionMember } from "@/lib/requirePaidMember";
import { getStripe } from "@/lib/stripe/client";
import { planFromQuery, resolveCheckoutPrice } from "@/lib/stripe/catalog";
import {
  findMemberSubscription,
  subscriptionItem,
  summarizeSubscription,
  syncUserFromSubscription,
} from "@/lib/stripe/membership";
import { notifyCheckoutAlert } from "@/lib/telegram/checkoutAlert";

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
  if (!process.env.STRIPE_SECRET_KEY) {
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
      },
      { idempotencyKey: `plan-change:${sub.id}:${resolved.priceId}:${prorationDate}` },
    );

    if (updated.pending_update) {
      const invoice = typeof updated.latest_invoice === "object" ? updated.latest_invoice : null;
      return res.status(402).json({
        success: false,
        code: "PAYMENT_REQUIRED",
        message: "Your card couldn't be charged for the new plan. You're still on your current plan.",
        invoiceUrl: invoice?.hosted_invoice_url || null,
      });
    }

    await syncUserFromSubscription(member.dbUser, updated);
    return res.status(200).json({ success: true, subscription: summarizeSubscription(updated) });
  } catch (err) {
    const message = err?.raw?.message || err?.message || String(err);
    await notifyCheckoutAlert({
      title: "Plan change failed",
      fields: {
        User: String(member.dbUser._id),
        From: current.planKey || current.priceId,
        To: target.key,
        Error: message,
      },
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
