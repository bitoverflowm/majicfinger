import crypto from "crypto";
import { waitUntil } from "@vercel/functions";
import dbConnect from "@/lib/dbConnect";
import CheckoutAttempt from "@/models/CheckoutAttempt";
import {
  getCheckoutStripe,
  isStripeTestKey,
  stripeKeysMismatch,
  stripePublishableKey,
  stripeSecretKey,
} from "@/lib/stripe/client";
import { extractClientMeta } from "@/lib/analytics/requestClientMeta";
import {
  planFromQuery,
  resolveCheckoutPrice,
  requestOrigin,
  cleanReferral,
  checkoutPlanSummary,
} from "@/lib/stripe/catalog";
import { attemptCookieHeader } from "@/lib/stripe/checkoutCookies";
import { buildCheckoutVisitorContext } from "@/lib/analytics/checkoutVisitorContext";
import { notifyCheckoutAlert } from "@/lib/telegram/checkoutAlert";
import { publishCheckoutTelegram } from "@/lib/telegram/checkoutJourney";
import { loadSessionMember } from "@/lib/requirePaidMember";
import { BLACK_FRIDAY, blackFridayAppliesTo, blackFridayCents } from "@/lib/promo/blackFriday";

/** A second Checkout would start a second subscription; these members change plans in billing. */
const ALREADY_BILLED_REASONS = new Set(["active", "legacy", "lifetime"]);

/** Groups these sessions in the Stripe Dashboard. */
const INTEGRATION_IDENTIFIER = "lychee-inapp-checkout-qmzrtkwe";

function checkoutSource(req) {
  const meta = extractClientMeta(req);
  return {
    from: String(req.body?.from || "").slice(0, 160) || undefined,
    country: meta.country || undefined,
    region: meta.region || undefined,
    city: meta.city || undefined,
    userAgent: meta.user_agent ? meta.user_agent.slice(0, 300) : undefined,
    language: meta.accept_language || undefined,
  };
}

/** Runs after the response so the buyer isn't waiting on Mongo or Telegram. */
async function recordAttempt({ attempt, visitorSessionId, plan, sessionId }) {
  try {
    await dbConnect();
    const visitorContext = visitorSessionId
      ? buildCheckoutVisitorContext(visitorSessionId).catch(() => null)
      : Promise.resolve(null);
    await CheckoutAttempt.create(attempt);
    const context = await visitorContext;
    if (context) await CheckoutAttempt.updateOne({ attemptId: attempt.attemptId }, { $set: { visitorContext: context } });
    // Open the live Telegram immediately so expire/abandon alerts aren't a blank slate.
    await publishCheckoutTelegram(attempt.attemptId);
  } catch (err) {
    await notifyCheckoutAlert({
      title: "Checkout session created but was not saved",
      fields: {
        Plan: plan.key,
        "Stripe session": sessionId,
        Error: err?.message || String(err),
      },
    });
  }
}

/**
 * `hosted: true` opens Stripe's hosted page instead of the in-app form. The
 * checkout page offers it when the in-app form is slow or fails to load.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const startedAt = Date.now();
  const hosted = req.body?.hosted === true;

  const plan = planFromQuery(req.body?.plan, req.body?.cycle);
  if (!plan) {
    await notifyCheckoutAlert({
      title: "Checkout started for an unknown plan",
      fields: { Plan: req.body?.plan, Cycle: req.body?.cycle },
    });
    return res.status(400).json({ error: "Unknown plan" });
  }

  let loginEmail = "";
  try {
    const { session: login, user, state } = await loadSessionMember(req);
    const renewalFailing = ["past_due", "unpaid"].includes(String(user?.subscriptionStatus || "").toLowerCase());
    if (login && (ALREADY_BILLED_REASONS.has(state.reason) || renewalFailing)) {
      return res.status(409).json({
        code: "ALREADY_MEMBER",
        reason: state.reason,
        redirect: "/dashboard?view=billing",
      });
    }
    loginEmail = String(login?.email || user?.email || "").trim().toLowerCase();
  } catch {
    // Account lookup is best-effort here; logged-out checkout must keep working.
  }

  if (!stripeSecretKey() || !stripePublishableKey()) {
    await notifyCheckoutAlert({
      title: "Checkout is missing Stripe keys",
      fields: { Plan: plan.key, "Secret key": "missing" },
    });
    return res.status(500).json({ error: "Checkout is not configured" });
  }

  const keyProblem = stripeKeysMismatch();
  if (keyProblem && !global.__stripeKeyMismatchAlerted) {
    global.__stripeKeyMismatchAlerted = true;
    await notifyCheckoutAlert({
      title: "Stripe keys don't match: the payment form will fail to load",
      fields: {
        Problem: keyProblem,
        Fix: "Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to the same account as STRIPE_SECRET_KEY, then redeploy",
      },
    });
  }

  try {
    const resolved = await resolveCheckoutPrice(plan);
    if (!resolved?.priceId) {
      return res.status(500).json({ error: "Could not start checkout" });
    }

    const attemptId = crypto.randomBytes(16).toString("hex");
    const referral = cleanReferral(req.body?.referral);
    const origin = requestOrigin(req);
    const stripe = getCheckoutStripe();
    let promo = blackFridayAppliesTo(plan) ? BLACK_FRIDAY : null;
    const metadata = {
      checkoutAttemptId: attemptId,
      planKey: plan.key,
      ...(referral ? { referral } : {}),
    };
    const returnUrl = `${origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`;
    const createSession = () =>
      stripe.checkout.sessions.create({
        ...(hosted
          ? {
              success_url: returnUrl,
              cancel_url: `${origin}/#pricing`,
              ...(loginEmail ? { customer_email: loginEmail } : {}),
            }
          : { ui_mode: "elements", integration_identifier: INTEGRATION_IDENTIFIER, return_url: returnUrl }),
        mode: plan.mode,
        line_items: [{ price: resolved.priceId, quantity: 1 }],
        client_reference_id: referral || attemptId,
        metadata: promo ? { ...metadata, promo: promo.id } : metadata,
        ...(plan.mode === "subscription"
          ? { subscription_data: { metadata: { planKey: plan.key, checkoutAttemptId: attemptId } } }
          : { customer_creation: "always" }),
        // Stripe rejects `discounts` together with `allow_promotion_codes`.
        ...(promo
          ? { discounts: [{ coupon: promo.couponId }] }
          : resolved.extras?.allow_promotion_codes
            ? { allow_promotion_codes: true }
            : {}),
      });
    let session;
    try {
      session = await createSession();
    } catch (err) {
      if (!promo) throw err;
      await notifyCheckoutAlert({
        title: `${promo.name} coupon was rejected; checkout continued at full price`,
        fields: { Plan: plan.key, Coupon: promo.couponId, Error: err?.message || String(err) },
      });
      promo = null;
      session = await createSession();
    }
    if (promo && session?.total_details?.amount_discount === 0) {
      await notifyCheckoutAlert({
        title: `${promo.name} coupon attached but Stripe shows no discount`,
        fields: { Plan: plan.key, Coupon: promo.couponId, "Stripe session": session.id, Total: `$${(session.amount_total / 100).toFixed(2)}` },
      });
    }

    if (hosted ? !session?.url : !session?.client_secret) {
      throw new Error(`Stripe did not return a ${hosted ? "checkout URL" : "client secret"}`);
    }

    const visitorSessionId = String(req.body?.visitorSessionId || "").trim().slice(0, 80) || undefined;
    waitUntil(
      recordAttempt({
        plan,
        sessionId: session.id,
        visitorSessionId,
        attempt: {
          attemptId,
          stripeSessionId: session.id,
          planKey: plan.key,
          priceId: resolved.priceId,
          mode: plan.mode,
          referral: referral || undefined,
          status: "open",
          granted: false,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          planLabel: promo ? `${plan.label} (${promo.name})` : plan.label,
          amount: promo ? blackFridayCents(plan.amount) : plan.amount,
          interval: plan.mode === "subscription" ? plan.interval : undefined,
          testMode: isStripeTestKey(),
          prefillEmail: loginEmail || undefined,
          source: checkoutSource(req),
          visitorSessionId,
          steps: [
            {
              step: "opened",
              at: new Date(),
              data: {
                from: String(req.body?.from || "").slice(0, 160) || undefined,
                hosted: hosted || undefined,
                serverMs: Date.now() - startedAt,
              },
            },
          ],
        },
      }),
    );

    res.setHeader("Set-Cookie", attemptCookieHeader(attemptId));
    if (hosted) return res.status(200).json({ url: session.url });
    return res.status(200).json({
      clientSecret: session.client_secret,
      publishableKey: stripePublishableKey(),
      plan: {
        ...checkoutPlanSummary(plan),
        ...(promo
          ? { promo: { name: promo.name, percentOff: promo.percentOff, amount: blackFridayCents(plan.amount) } }
          : {}),
      },
      email: loginEmail || null,
      promoCodes: !promo && !!resolved.extras?.allow_promotion_codes,
    });
  } catch (err) {
    await notifyCheckoutAlert({
      title: "Could not create checkout session",
      fields: {
        Plan: plan.key,
        Promo: blackFridayAppliesTo(plan) ? BLACK_FRIDAY.name : undefined,
        Error: err?.message || String(err),
      },
    });
    return res.status(500).json({ error: "Could not start checkout" });
  }
}
