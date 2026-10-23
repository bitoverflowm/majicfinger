import Stripe from "stripe";

/** Billing, portal and plan-change routes read Subscription and Invoice fields in this version's shape. */
const EMBEDDED_CHECKOUT_API_VERSION = "2024-11-20.acacia";

/**
 * In-app checkout (`ui_mode: "elements"`) must match the Stripe.js release
 * train in package.json (`@stripe/stripe-js` is on dahlia). Only Checkout
 * Session creation uses it, so legacy billing code keeps its own version.
 */
export const CHECKOUT_ELEMENTS_API_VERSION = "2026-08-26.dahlia";

let stripeClient;
let checkoutClient;

/**
 * Local dev uses the test keys so nothing charges real cards. Set
 * STRIPE_LIVE_IN_DEV=true to point a local server at live Stripe.
 */
function useTestKeys() {
  return process.env.NODE_ENV !== "production" && process.env.STRIPE_LIVE_IN_DEV !== "true";
}

export function stripeSecretKey() {
  if (useTestKeys() && process.env.STRIPE_SECRET_DEV_KEY) return process.env.STRIPE_SECRET_DEV_KEY;
  return process.env.STRIPE_SECRET_KEY || "";
}

/** Always the same mode as stripeSecretKey(), so Stripe.js can open the sessions it creates. */
export function stripePublishableKey() {
  if (useTestKeys() && process.env.STRIPE_SECRET_DEV_KEY && process.env.NEXT_PUBLIC_STRIPE_DEV_PUBLISHABLE_KEY) {
    return process.env.NEXT_PUBLIC_STRIPE_DEV_PUBLISHABLE_KEY;
  }
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
}

function secretKey() {
  const key = stripeSecretKey();
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  return key;
}

export function getStripe() {
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey(), { apiVersion: EMBEDDED_CHECKOUT_API_VERSION });
  }
  return stripeClient;
}

export function getCheckoutStripe() {
  if (!checkoutClient) {
    checkoutClient = new Stripe(secretKey(), { apiVersion: CHECKOUT_ELEMENTS_API_VERSION });
  }
  return checkoutClient;
}

export function isStripeTestKey(key = stripeSecretKey()) {
  return /^[sr]k_test_/.test(String(key || ""));
}

function keyAccount(key) {
  return String(key || "").replace(/^(sk|rk|pk)_(live|test)_/, "").slice(0, 16);
}

/**
 * Stripe keys embed their account after the prefix. When the secret and
 * publishable keys come from different accounts, Stripe.js can't find the
 * sessions the server creates ("No such checkout.session").
 */
export function stripeKeysMismatch() {
  const secret = stripeSecretKey();
  const publishable = stripePublishableKey();
  if (!secret || !publishable) return null;
  const secretMode = isStripeTestKey(secret) ? "test" : "live";
  const publishableMode = /^pk_test_/.test(publishable) ? "test" : "live";
  if (secretMode !== publishableMode) return `secret key is ${secretMode}, publishable key is ${publishableMode}`;
  if (keyAccount(secret) !== keyAccount(publishable)) return "secret and publishable keys are from different Stripe accounts";
  return null;
}
