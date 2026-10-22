import { isDevLoginBypassUser } from "@/lib/devLoginBypass";
import { isOwnerFullAccessUser } from "@/lib/ownerFullAccess";

/** Paid tiers in upgrade order. Basic / Pro / Elite are legacy plans still billed for existing subscribers. */
export const MEMBERSHIP_TIERS = ["basic", "pro", "researcher", "elite", "quant"];

/** Tiers with full historical row budgets (500k per pull). */
export const EXPANDED_DATA_TIERS = new Set(["pro", "premium", "researcher", "elite", "quant"]);
/** Tiers with large saved-workspace storage (advanced data storage + quota meter). */
export const LARGE_STORAGE_TIERS = new Set(["researcher", "elite", "quant"]);
/** Tiers with the highest per-pull market join cap. */
export const TOP_DATA_TIERS = new Set(["elite", "premium", "quant"]);
export const MEMBERSHIP_CYCLES = ["weekly", "monthly", "annual"];

const ACTIVE_STATUSES = new Set(["active", "trialing"]);
const PAYMENT_ISSUE_STATUSES = new Set([
  "past_due",
  "unpaid",
  "incomplete",
  "payment_failed",
  "requires_action",
  "action_required",
  "payment_action_required",
]);
const ENDED_STATUSES = new Set(["cancelled", "canceled", "expired", "incomplete_expired", "paused"]);

function lower(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function normalizeMembershipTier(tier) {
  const t = lower(tier);
  if (t === "premium") return "pro";
  return MEMBERSHIP_TIERS.includes(t) ? t : "";
}

export function normalizeMembershipCycle(cycle) {
  const c = lower(cycle);
  if (c === "yearly" || c === "year") return "annual";
  if (c === "week") return "weekly";
  if (c === "month") return "monthly";
  return MEMBERSHIP_CYCLES.includes(c) || c === "lifetime" ? c : "";
}

export function isDevNoDbUser(user) {
  if (process.env.NODE_ENV === "production") return false;
  return String(user?.userId || user?._id || "") === "dev-bypass-no-db";
}

/**
 * Single rule for who may use the dashboard. Shared by the client gate and
 * server routes so the two can never disagree.
 *
 * reason: owner | dev | lifetime | active | legacy | payment_issue | ended | none | signed_out
 */
export function membershipState(user) {
  if (!user || typeof user !== "object") return { hasAccess: false, reason: "signed_out" };
  if (isOwnerFullAccessUser(user)) return { hasAccess: true, reason: "owner" };
  if (isDevLoginBypassUser(user) || isDevNoDbUser(user)) return { hasAccess: true, reason: "dev" };
  if (user.lifetimeMember) return { hasAccess: true, reason: "lifetime" };

  const status = lower(user.subscriptionStatus);
  const tier = lower(user.subscriptionTier);
  if (ACTIVE_STATUSES.has(status)) return { hasAccess: true, reason: "active" };
  // Some early subscribers have a tier on file but no status.
  if (tier && !status) return { hasAccess: true, reason: "legacy" };
  if (PAYMENT_ISSUE_STATUSES.has(status)) return { hasAccess: false, reason: "payment_issue" };
  if (ENDED_STATUSES.has(status)) return { hasAccess: false, reason: "ended" };
  return { hasAccess: false, reason: "none" };
}

export function userHasDashboardAccess(user) {
  return membershipState(user).hasAccess;
}

/** Free user inside their one forked "run it yourself" session (server-tracked). */
export function userInFreeRunWindow(user) {
  if (!user || userHasDashboardAccess(user)) return false;
  if (!user.run_yourself_fork_data_set_id || !user.run_yourself_used_at) return false;
  return !user.run_yourself_interactive_consumed_at;
}

export const MEMBERSHIP_REQUIRED_CODE = "MEMBERSHIP_REQUIRED";
