import { loadSessionMember } from "@/lib/requirePaidMember";
import { getStripe, stripeSecretKey } from "@/lib/stripe/client";
import { requestOrigin } from "@/lib/stripe/catalog";
import { STRIPE_PORTAL_LOGIN_URL, findMemberSubscription, summarizeSubscription } from "@/lib/stripe/membership";

/** POST /api/billing/portal -> { url } for the Stripe customer portal (card, invoices, cancel). */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false });
  }

  let member;
  try {
    member = await loadSessionMember(req);
  } catch {
    return res.status(503).json({ success: false, message: "Account lookup is unavailable." });
  }
  if (!member.session) return res.status(401).json({ success: false, message: "Unauthorized" });

  if (!stripeSecretKey() || !member.dbUser) {
    return res.status(200).json({ success: true, url: STRIPE_PORTAL_LOGIN_URL });
  }

  try {
    const stripe = getStripe();
    let customer = member.dbUser.stripeCustomerId ? String(member.dbUser.stripeCustomerId) : "";
    if (!customer) {
      const sub = await findMemberSubscription(stripe, member.dbUser, { lookupByEmail: true });
      customer = summarizeSubscription(sub)?.customerId || "";
    }
    if (!customer) return res.status(200).json({ success: true, url: STRIPE_PORTAL_LOGIN_URL });

    const configuration = String(process.env.STRIPE_PORTAL_CONFIGURATION || "").trim();
    const portal = await stripe.billingPortal.sessions.create({
      customer,
      return_url: `${requestOrigin(req)}/dashboard?view=billing`,
      ...(configuration ? { configuration } : {}),
    });
    return res.status(200).json({ success: true, url: portal.url });
  } catch (err) {
    console.error("[billing/portal] Could not create portal session:", err?.message || err);
    return res.status(200).json({ success: true, url: STRIPE_PORTAL_LOGIN_URL });
  }
}
