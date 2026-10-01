import { isOwnerFullAccessUser } from "@/lib/ownerFullAccess";
import {
  ATHENA_BASIC_QUERY_ROW_LIMIT,
  ATHENA_DEMO_ROW_LIMIT,
  ATHENA_SAMPLE_ROW_LIMIT,
  ATHENA_SUBSCRIBER_QUERY_ROW_LIMIT,
} from "@/config/dataLakeParquetSamples";

function subscriptionStatusAllowsPaidFeatures(statusRaw) {
  const s = String(statusRaw || "").toLowerCase();
  return s === "active" || s === "trialing" || s === "past_due";
}

/**
 * @param {object | null | undefined} userLike
 * @returns {string}
 */
export function normalizedSubscriptionTier(userLike) {
  return String(userLike?.subscriptionTier || "").toLowerCase();
}

/**
 * @param {object | null | undefined} userLike
 * @returns {boolean}
 */
export function userHasPaidSubscription(userLike) {
  if (!userLike || typeof userLike !== "object") return false;
  if (isOwnerFullAccessUser(userLike)) return true;
  if (userLike.lifetimeMember) return true;
  const tier = normalizedSubscriptionTier(userLike);
  if (!tier) return false;
  if (subscriptionStatusAllowsPaidFeatures(userLike.subscriptionStatus)) return true;
  return !!tier && !userLike.subscriptionStatus;
}

/**
 * Pro / Elite / lifetime: full historical row budgets (not Basic 12.5k, not free sample).
 */
export function userHasExpandedAthenaAccess(userLike) {
  if (!userLike || typeof userLike !== "object") return false;
  if (isOwnerFullAccessUser(userLike)) return true;
  if (userLike.lifetimeMember) return true;
  const tier = normalizedSubscriptionTier(userLike);
  const paid = userHasPaidSubscription(userLike);
  if (!paid) return false;
  if (tier === "pro" || tier === "elite" || tier === "premium") return true;
  return false;
}

/**
 * Basic (paid): historical access with per-pull row cap.
 */
export function userHasBasicHistoricalAccess(userLike) {
  if (!userLike || typeof userLike !== "object") return false;
  if (!userHasPaidSubscription(userLike)) return false;
  if (userHasExpandedAthenaAccess(userLike)) return false;
  return normalizedSubscriptionTier(userLike) === "basic";
}

/**
 * How many markets may each get their own trades sheet in one pull.
 * Basic is 5, Pro is 10, Elite is 50. More than 50 is an enterprise pull.
 */
export function getJoinMarketCap(userLike) {
  if (!userLike || typeof userLike !== "object") return 5;
  if (String(userLike.userId || "") === "dev-bypass-no-db") return 50;
  if (isOwnerFullAccessUser(userLike) || userLike.lifetimeMember) return 50;
  const tier = normalizedSubscriptionTier(userLike);
  if (tier === "elite" || tier === "premium") return 50;
  if (tier === "pro") return 10;
  return 5;
}

export function joinTierLabel(userLike) {
  if (!userLike || typeof userLike !== "object") return "Basic";
  if (String(userLike.userId || "") === "dev-bypass-no-db") return "Elite";
  if (isOwnerFullAccessUser(userLike) || userLike.lifetimeMember) return "Elite";
  const tier = normalizedSubscriptionTier(userLike);
  if (tier === "elite" || tier === "premium") return "Elite";
  if (tier === "pro") return "Pro";
  return "Basic";
}

/**
 * Client + UI: per-request row cap for historical Kalshi / Polymarket pulls.
 * @param {object | null | undefined} userLike
 * @param {{ isDemo?: boolean }} [opts]
 */
export function getHistoricalPullRowLimit(userLike, opts = {}) {
  if (opts.isDemo) return ATHENA_DEMO_ROW_LIMIT;
  if (String(userLike?.userId || "") === "dev-bypass-no-db") return ATHENA_SUBSCRIBER_QUERY_ROW_LIMIT;
  if (userHasExpandedAthenaAccess(userLike)) return ATHENA_SUBSCRIBER_QUERY_ROW_LIMIT;
  if (userHasBasicHistoricalAccess(userLike)) return ATHENA_BASIC_QUERY_ROW_LIMIT;
  if (userHasPaidSubscription(userLike)) {
    return ATHENA_BASIC_QUERY_ROW_LIMIT;
  }
  return ATHENA_SAMPLE_ROW_LIMIT;
}
