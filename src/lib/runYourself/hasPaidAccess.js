import { userHasDashboardAccess, userInFreeRunWindow } from "@/lib/membershipAccess";

/**
 * @param {object | null | undefined} user Session user from useUser / api/user
 * @returns {boolean}
 */
export function userHasPaidAccess(user) {
  return userHasDashboardAccess(user);
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
  return userInFreeRunWindow(user);
}
