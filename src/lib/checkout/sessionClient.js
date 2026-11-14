"use client";

/**
 * Shared Checkout Session fetch for the pricing CTA and /checkout page.
 * Prefetch on hover/click survives a soft Next.js navigation via the in-memory
 * map, and a hard navigation via sessionStorage (same tab).
 */

const sessionRequests = new Map();
const STORAGE_PREFIX = "lychee:checkoutSession:v1:";
/** Reuse a prefetched Elements session briefly across a hard navigation. */
const STORAGE_TTL_MS = 90_000;

function sessionKey(body) {
  return `${body.plan || ""}:${body.cycle || ""}:${body.hosted ? "hosted" : "elements"}`;
}

function storageKey(body) {
  return `${STORAGE_PREFIX}${sessionKey(body)}`;
}

function readStored(body) {
  if (typeof window === "undefined" || body.hosted) return null;
  try {
    const raw = sessionStorage.getItem(storageKey(body));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > STORAGE_TTL_MS) {
      sessionStorage.removeItem(storageKey(body));
      return null;
    }
    if (!parsed?.data?.clientSecret) return null;
    return {
      ok: true,
      status: 200,
      data: parsed.data,
      ms: typeof parsed.ms === "number" ? parsed.ms : 0,
      fromCache: true,
    };
  } catch {
    return null;
  }
}

function writeStored(body, result) {
  if (typeof window === "undefined" || body.hosted) return;
  if (!result?.ok || !result?.data?.clientSecret) return;
  try {
    sessionStorage.setItem(
      storageKey(body),
      JSON.stringify({
        savedAt: Date.now(),
        ms: result.ms,
        data: {
          clientSecret: result.data.clientSecret,
          publishableKey: result.data.publishableKey,
          plan: result.data.plan,
          email: result.data.email,
          promoCodes: result.data.promoCodes,
        },
      }),
    );
  } catch {
    // Private mode / quota — in-memory cache still helps soft navigations.
  }
}

function postCheckoutSession(body) {
  return fetch("/api/checkout/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(async (res) => ({ ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) }));
}

/**
 * One Elements session per plan for the life of the tab (avoids duplicate Stripe
 * sessions on remount). Hosted fallback may retry.
 */
export function requestCheckoutSession(body) {
  const key = sessionKey(body);
  if (!sessionRequests.has(key)) {
    const cached = readStored(body);
    if (cached) {
      sessionRequests.set(key, Promise.resolve(cached));
      return sessionRequests.get(key);
    }
    const started = performance.now();
    const request = postCheckoutSession(body).then((result) => {
      const withMs = { ...result, ms: Math.round(performance.now() - started) };
      writeStored(body, withMs);
      return withMs;
    });
    sessionRequests.set(key, request);
    if (body.hosted) {
      request.finally(() => setTimeout(() => sessionRequests.delete(key), 1500));
    }
  }
  return sessionRequests.get(key);
}

/** Fire-and-forget warm from pricing hover/focus so /checkout often finds a ready session. */
export function prefetchCheckoutSession(body) {
  if (typeof window === "undefined") return;
  if (!body?.plan) return;
  void requestCheckoutSession(body);
}

/** Keep the checkout serverless function warm; ignores errors. */
export function warmCheckoutApi() {
  if (typeof window === "undefined") return;
  void fetch("/api/checkout/warm", { method: "GET", keepalive: true }).catch(() => {});
}
