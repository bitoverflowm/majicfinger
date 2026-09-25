import Stripe from "stripe";

/** Embedded Checkout needs a Checkout Session API that supports ui_mode. */
const EMBEDDED_CHECKOUT_API_VERSION = "2024-11-20.acacia";

let stripeClient;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key, { apiVersion: EMBEDDED_CHECKOUT_API_VERSION });
  }
  return stripeClient;
}

export function isStripeTestKey(key = process.env.STRIPE_SECRET_KEY) {
  return /^[sr]k_test_/.test(String(key || ""));
}
