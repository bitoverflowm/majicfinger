import { MEMBERSHIP_TIERS } from "@/lib/membershipAccess";

export function membershipTierLabel({ planKey, subscriptionTier } = {}) {
  const key = String(planKey || "").trim().toLowerCase();
  if (key === "lifetime") return "Lifetime";
  const fromKey = key.split("_")[0];
  const raw = MEMBERSHIP_TIERS.includes(fromKey)
    ? fromKey
    : String(subscriptionTier || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw === "lifetime") return "Lifetime";
  if (!MEMBERSHIP_TIERS.includes(raw)) return "";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}
