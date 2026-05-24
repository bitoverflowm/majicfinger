import { isDevLoginBypassUser } from "@/lib/devLoginBypass";
import { isOwnerFullAccessUser } from "@/lib/ownerFullAccess";

/**
 * @param {object | null | undefined} user Session user from useUser / api/user
 * @returns {boolean}
 */
export function userHasPaidAccess(user) {
  if (!user) return false;
  if (isDevLoginBypassUser(user) || isOwnerFullAccessUser(user)) return true;
  if (user.lifetimeMember) return true;
  const status = String(user.subscriptionStatus || "").toLowerCase();
  if (status === "active" || status === "trialing") return true;
  if (user.subscriptionTier && !status) return true;
  return false;
}

/**
 * @param {object | null | undefined} user
 * @returns {boolean}
 */
export function userRunYourselfQuotaExceeded(user) {
  if (!user) return false;
  if (userHasPaidAccess(user)) return false;
  return !!user.run_yourself_used_at;
}

/**
 * Free-tier user still in their one interactive fork session (full dashboard access).
 * @param {object | null | undefined} user
 * @returns {boolean}
 */
export function userRunYourselfInteractiveUnlocked(user) {
  if (!user || userHasPaidAccess(user)) return false;
  if (!user.run_yourself_fork_data_set_id || !user.run_yourself_used_at) return false;
  return !user.run_yourself_interactive_consumed_at;
}
