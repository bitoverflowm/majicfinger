import { loadSessionMember } from "@/lib/requirePaidMember";
import { membershipState, normalizeMembershipCycle, normalizeMembershipTier } from "@/lib/membershipAccess";
import { getStripe, stripeSecretKey } from "@/lib/stripe/client";
import { findMemberSubscription, summarizeSubscription, syncUserFromSubscription } from "@/lib/stripe/membership";

const CHANGEABLE_STATUSES = new Set(["active", "trialing"]);

/**
 * GET /api/billing/status
 * Membership for the billing screen. Re-reads Stripe so a missed webhook
 * (paid but locked, or cancelled but still unlocked) corrects itself here.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ success: false });
  }
  res.setHeader("Cache-Control", "no-store");

  let member;
  try {
    member = await loadSessionMember(req);
  } catch {
    return res.status(503).json({ success: false, message: "Account lookup is unavailable." });
  }
  if (!member.session) return res.status(401).json({ success: false, message: "Unauthorized" });

  let user = member.user;
  let dbUser = member.dbUser || null;
  let subscription = null;
  let stripeError = null;

  if (dbUser && stripeSecretKey()) {
    try {
      const stripe = getStripe();
      const sub = await findMemberSubscription(stripe, dbUser, {
        lookupByEmail: !member.state.hasAccess,
      });
      if (sub) {
        dbUser = await syncUserFromSubscription(dbUser, sub);
        subscription = summarizeSubscription(sub);
        user = { ...user, ...dbUser, email: user.email, issuer: user.issuer, userId: user.userId };
      }
    } catch (err) {
      stripeError = err?.message || String(err);
      console.error("[billing/status] Stripe lookup failed:", stripeError);
    }
  }

  const state = membershipState(user);
  const lifetime = !!user?.lifetimeMember;
  const tier = normalizeMembershipTier(subscription?.tier || user?.subscriptionTier) || null;
  const cycle = lifetime ? "lifetime" : normalizeMembershipCycle(subscription?.cycle || user?.billingCycle) || null;

  return res.status(200).json({
    success: true,
    membership: {
      hasAccess: state.hasAccess,
      reason: state.reason,
      lifetime,
      tier,
      cycle,
      status: subscription?.status || user?.subscriptionStatus || null,
    },
    subscription,
    canChangePlan: !!subscription && CHANGEABLE_STATUSES.has(subscription.status) && !subscription.cancelAtPeriodEnd && !subscription.pendingUpdate,
    canManageBilling: !!(subscription?.customerId || dbUser?.stripeCustomerId),
    stripeError: stripeError ? "Stripe could not be reached." : null,
  });
}
