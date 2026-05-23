import { isOwnerFullAccessUser } from "@/lib/ownerFullAccess";

/**
 * @param {object | null | undefined} dbUser
 * @returns {boolean}
 */
export function dbUserHasPaidAccess(dbUser) {
  if (!dbUser) return false;
  if (isOwnerFullAccessUser(dbUser)) return true;
  if (dbUser.lifetimeMember) return true;
  const status = String(dbUser.subscriptionStatus || "").toLowerCase();
  if (status === "active" || status === "trialing") return true;
  if (dbUser.subscriptionTier && !status) return true;
  return false;
}
