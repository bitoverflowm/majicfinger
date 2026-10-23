import dbConnect from "@/lib/dbConnect";
import CheckoutAttempt from "@/models/CheckoutAttempt";
import { getStripe } from "@/lib/stripe/client";
import { readAttemptId } from "@/lib/stripe/checkoutCookies";
import { CHECKOUT_PLANS } from "@/lib/stripe/catalog";

/** Read-only: access is granted by the webhook and by login, never here. */
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  res.setHeader("Cache-Control", "no-store");

  const sessionId = String(req.query?.session_id || "");
  const attemptId = readAttemptId(req);
  if (!sessionId.startsWith("cs_") || !attemptId) return res.status(404).json({ found: false });

  try {
    await dbConnect();
    const attempt = await CheckoutAttempt.findOne({ attemptId });
    if (!attempt || attempt.stripeSessionId !== sessionId) return res.status(404).json({ found: false });

    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session?.metadata?.checkoutAttemptId !== attemptId) return res.status(404).json({ found: false });

    const plan = CHECKOUT_PLANS.find((item) => item.key === attempt.planKey);
    return res.status(200).json({
      found: true,
      status: session.status,
      paymentStatus: session.payment_status,
      email: session.customer_details?.email || session.customer_email || null,
      name: session.customer_details?.name || null,
      plan: plan ? { key: plan.key, tier: plan.tier, cycle: plan.cycle, label: plan.label } : null,
    });
  } catch (err) {
    console.error("[checkout] status lookup failed:", err?.message || err);
    return res.status(500).json({ found: false });
  }
}
