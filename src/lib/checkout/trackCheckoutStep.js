"use client";

let queue = Promise.resolve();
const sentOnce = new Set();

/**
 * Report a checkout step for the live Telegram checkout message. Never throws.
 * Steps are sent in order; `keepalive` skips the queue so it survives the tab closing.
 * @param {string} sessionId Stripe Checkout Session id
 * @param {string} step
 * @param {Record<string, unknown>} [data]
 * @param {{ once?: boolean; keepalive?: boolean }} [opts]
 */
export function trackCheckoutStep(sessionId, step, data = {}, opts = {}) {
  if (!sessionId || typeof window === "undefined") return;
  if (opts.once) {
    const key = `${sessionId}:${step}`;
    if (sentOnce.has(key)) return;
    sentOnce.add(key);
  }
  const createdAt = Date.now();
  const send = (keepalive) =>
    fetch("/api/checkout/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, step, data, delayMs: Date.now() - createdAt }),
      keepalive,
    }).catch(() => {});

  if (opts.keepalive) {
    send(true);
    return;
  }
  queue = queue.then(() => send(false));
}

/** Page the buyer clicked a plan from, e.g. "/" or "/dashboard". Other sites are reduced to their host. */
export function checkoutEntryPage() {
  try {
    if (!document.referrer) return "direct";
    const from = new URL(document.referrer);
    if (from.host !== window.location.host) return from.host;
    return `${from.pathname}${from.search}`.slice(0, 160);
  } catch {
    return "";
  }
}

/** Ms since the buyer clicked through to checkout (full page load), else since `fallbackStart`. */
export function msSinceCheckoutClick(fallbackStart) {
  try {
    const nav = performance.getEntriesByType("navigation")[0];
    const landedOnCheckout = nav && new URL(nav.name).pathname === "/checkout";
    return Math.round(landedOnCheckout ? performance.now() : performance.now() - fallbackStart);
  } catch {
    return Math.round(performance.now() - fallbackStart);
  }
}
