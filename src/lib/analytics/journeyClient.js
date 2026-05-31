import {
  getOrCreateVisitorSessionId,
  getVisitorSessionId,
  hasVisitorSessionEnded,
  hasVisitorSessionStarted,
  markVisitorSessionEnded,
  markVisitorSessionStarted,
} from "@/lib/analytics/visitorSession";

const FLUSH_INTERVAL_MS = 8000;
const MAX_QUEUE_SIZE = 80;
const JOURNEY_ENDPOINT = "/api/analytics/journey";

/** @type {Array<{ type: string; path?: string; label?: string; meta?: Record<string, unknown>; ts: number }>} */
let queue = [];
let flushTimer = null;
let ending = false;

function scheduleFlush() {
  if (flushTimer || typeof window === "undefined") return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    flushJourneyQueue(false);
  }, FLUSH_INTERVAL_MS);
}

function postJourney(body, { keepalive = false } = {}) {
  if (typeof window === "undefined") return;

  const payload = JSON.stringify({ sessionKind: "visitor", ...body });
  try {
    if (keepalive && typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(JOURNEY_ENDPOINT, blob);
      return;
    }
  } catch {
    /* fall through */
  }

  fetch(JOURNEY_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive,
  }).catch(() => {});
}

/**
 * @param {string} type
 * @param {{ path?: string; label?: string; meta?: Record<string, unknown> }} [payload]
 */
export function trackJourneyEvent(type, payload = {}) {
  if (typeof window === "undefined") return;

  const sessionId = getOrCreateVisitorSessionId();
  if (!sessionId) return;

  queue.push({
    type,
    path: payload.path || window.location.pathname,
    label: payload.label,
    meta: payload.meta || {},
    ts: Date.now(),
  });

  if (queue.length > MAX_QUEUE_SIZE) {
    queue = queue.slice(-MAX_QUEUE_SIZE);
  }

  scheduleFlush();
}

/** @param {{ isLoggedIn?: boolean; email?: string; userId?: string }} [identity] */
export function flushJourneyQueue(endSession = false, identity = {}) {
  if (typeof window === "undefined") return;

  const sessionId = getVisitorSessionId() || getOrCreateVisitorSessionId();
  if (!sessionId) return;

  const events = queue.splice(0, queue.length);
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (events.length > 0 || (endSession && !ending && !hasVisitorSessionEnded())) {
    if (endSession && !ending && !hasVisitorSessionEnded()) {
      ending = true;
      markVisitorSessionEnded();
      postJourney(
        {
          action: "session_end",
          sessionId,
          events,
          meta: {
            path: window.location.pathname,
            isLoggedIn: !!identity.isLoggedIn,
            email: identity.email,
            userId: identity.userId,
          },
        },
        { keepalive: true },
      );
      return;
    }

    if (events.length > 0) {
      postJourney({ action: "batch", sessionId, events }, { keepalive: endSession });
    }
  }
}

export function startVisitorSessionIfNeeded(identity = {}) {
  if (typeof window === "undefined") return;
  if (hasVisitorSessionStarted()) return;

  const sessionId = getOrCreateVisitorSessionId();
  markVisitorSessionStarted();

  postJourney({
    action: "session_start",
    sessionId,
    meta: {
      entryPath: window.location.pathname || "/",
      referrer: document.referrer || "",
      isLoggedIn: !!identity.isLoggedIn,
      email: identity.email,
      userId: identity.userId,
    },
  });
}

/** @param {{ email?: string; userId?: string; isLoggedIn?: boolean }} identity */
export function linkVisitorIdentity(identity) {
  if (typeof window === "undefined") return;

  const sessionId = getVisitorSessionId();
  if (!sessionId) return;

  trackJourneyEvent("identity_linked", {
    meta: {
      email: identity.email,
      userId: identity.userId,
      isLoggedIn: identity.isLoggedIn,
    },
  });

  postJourney({
    action: "identity",
    sessionId,
    meta: identity,
  });
}

export function endVisitorSession(identity = {}) {
  flushJourneyQueue(true, identity);
}

/**
 * Call after successful /api/login to stitch identity and record new signups in the journey.
 * @param {Record<string, unknown>} data - parsed login response body
 * @param {{ email?: string; name?: string; signupSource?: string; method?: string }} ctx
 */
export function handleLoginJourney(data, ctx = {}) {
  const user = data?.newUser || data?.user;
  const email = user?.email || ctx.email;
  const userId = user?._id ? String(user._id) : user?.userId ? String(user.userId) : undefined;

  if (email || userId) {
    linkVisitorIdentity({ email, userId, isLoggedIn: true });
  }

  if (data?.newUser) {
    trackJourneyEvent("signup", {
      meta: {
        email,
        name: user?.name || ctx.name,
        source: ctx.signupSource || "magic link",
        method: ctx.method || "magic link",
      },
    });
  }

  if (userId || email) {
    void import("@/lib/analytics/authJourneyClient").then(({ startAuthenticatedSession }) => {
      startAuthenticatedSession({
        email,
        userId,
        entryPath: typeof window !== "undefined" ? window.location.pathname : "/dashboard",
      });
    });
  }
}
