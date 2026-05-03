import { isOwnerFullAccessUser } from "@/lib/ownerFullAccess";

/**
 * Dashboard / paid data-lake access: used client-side (query size) and mirrored server-side (enforcement).
 */
export function userHasExpandedAthenaAccess(userLike) {
  if (!userLike || typeof userLike !== "object") return false;
  if (isOwnerFullAccessUser(userLike)) return true;
  if (userLike.lifetimeMember) return true;
  const s = String(userLike.subscriptionStatus || "").toLowerCase();
  return s === "active" || s === "trialing";
}
