import { userHasDashboardAccess } from "@/lib/membershipAccess";

/**
 * @param {object | null | undefined} dbUser
 * @returns {boolean}
 */
export function dbUserHasPaidAccess(dbUser) {
  return userHasDashboardAccess(dbUser);
}
