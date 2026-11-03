/**
 * Black Friday Special: 50% off the first year of every annual plan,
 * applied automatically at checkout (no code to enter).
 */
export const BLACK_FRIDAY = {
  id: "black_friday_2026",
  name: "Black Friday Special",
  /** Exists in both live and test Stripe with the same id. */
  couponId: "lychee_black_friday_2026",
  percentOff: 50,
  /** 11:59:59 PM ET, Nov 28 2026. Must equal the coupon's `redeem_by` (1795928399) in Stripe. */
  endsAt: Date.parse("2026-11-29T04:59:59Z"),
};

export function blackFridayActive(now = Date.now()) {
  return now < BLACK_FRIDAY.endsAt;
}

/** True for any annual subscription plan while the offer runs, legacy annual plans included. */
export function blackFridayAppliesTo(plan, now = Date.now()) {
  return blackFridayActive(now) && plan?.mode === "subscription" && plan?.interval === "year";
}

/** Sale price in cents, rounded the way Stripe rounds a percent-off coupon. */
export function blackFridayCents(cents) {
  return cents - Math.round((cents * BLACK_FRIDAY.percentOff) / 100);
}
