import { waitUntil } from "@vercel/functions";
import { warmCheckoutPriceCache } from "@/lib/stripe/catalog";
import { stripeSecretKey, stripePublishableKey } from "@/lib/stripe/client";

/**
 * Lightweight ping so pricing / marketing pages can keep the checkout function
 * warm and prime the in-memory Stripe price cache before a buyer clicks.
 * Never creates a Checkout Session.
 */
export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") return res.status(405).end();
  if (!stripeSecretKey() || !stripePublishableKey()) {
    return res.status(204).end();
  }
  if (!global.__lycheePriceWarmStarted) {
    global.__lycheePriceWarmStarted = true;
    waitUntil(warmCheckoutPriceCache());
  }
  res.setHeader("Cache-Control", "no-store");
  return res.status(204).end();
}
