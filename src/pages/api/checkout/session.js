import crypto from "crypto";
import dbConnect from "@/lib/dbConnect";
import CheckoutAttempt from "@/models/CheckoutAttempt";
import { getStripe } from "@/lib/stripe/client";
import {
  planFromQuery,
  resolveCheckoutPrice,
  requestOrigin,
  cleanReferral,
} from "@/lib/stripe/catalog";
import { attemptCookieHeader } from "@/lib/stripe/checkoutCookies";
import { notifyCheckoutAlert } from "@/lib/telegram/checkoutAlert";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const plan = planFromQuery(req.body?.plan, req.body?.cycle);
  if (!plan) {
    await notifyCheckoutAlert({
      title: "Checkout started for an unknown plan",
      fields: { Plan: req.body?.plan, Cycle: req.body?.cycle },
    });
    return res.status(400).json({ error: "Unknown plan" });
  }

  const fallbackUrl = plan.href || "";
  if (!process.env.STRIPE_SECRET_KEY || !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    await notifyCheckoutAlert({
      title: "Embedded checkout is missing Stripe keys",
      fields: {
        Plan: plan.key,
        "Secret key": process.env.STRIPE_SECRET_KEY ? "set" : "missing",
        "Publishable key": process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? "set" : "missing",
        Fallback: fallbackUrl ? "payment link" : "none",
      },
    });
    if (fallbackUrl) return res.status(200).json({ fallbackUrl });
    return res.status(500).json({ error: "Checkout is not configured" });
  }

  try {
    const resolved = await resolveCheckoutPrice(plan);
    if (!resolved?.priceId) {
      if (fallbackUrl) return res.status(200).json({ fallbackUrl });
      return res.status(500).json({ error: "Could not start checkout" });
    }

    const attemptId = crypto.randomBytes(16).toString("hex");
    const referral = cleanReferral(req.body?.referral);
    const origin = requestOrigin(req);
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      mode: plan.mode,
      line_items: [{ price: resolved.priceId, quantity: 1 }],
      return_url: `${origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
      redirect_on_completion: "always",
      client_reference_id: referral || attemptId,
      metadata: {
        checkoutAttemptId: attemptId,
        planKey: plan.key,
        ...(referral ? { referral } : {}),
      },
      ...(plan.mode === "payment" ? { customer_creation: "always" } : {}),
      ...resolved.extras,
    });

    if (!session?.client_secret) {
      throw new Error("Stripe did not return a client secret");
    }

    await dbConnect();
    await CheckoutAttempt.create({
      attemptId,
      stripeSessionId: session.id,
      planKey: plan.key,
      priceId: resolved.priceId,
      mode: plan.mode,
      referral: referral || undefined,
      status: "open",
      granted: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    res.setHeader("Set-Cookie", attemptCookieHeader(attemptId));
    return res.status(200).json({ clientSecret: session.client_secret });
  } catch (err) {
    await notifyCheckoutAlert({
      title: "Could not create embedded checkout",
      fields: {
        Plan: plan.key,
        Error: err?.message || String(err),
        Fallback: fallbackUrl ? "payment link" : "none",
      },
    });
    if (fallbackUrl) return res.status(200).json({ fallbackUrl });
    return res.status(500).json({ error: "Could not start checkout" });
  }
}
