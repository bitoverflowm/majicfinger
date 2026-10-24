import {
  getOrCreateVisitorSessionId,
  getVisitorSessionId,
  hasVisitorSessionEnded,
  hasVisitorSessionStarted,
  markVisitorSessionEnded,
  markVisitorSessionStarted,
} from "@/lib/analytics/visitorSession";
import { buildSessionStartMeta } from "@/lib/analytics/sessionStartMeta";
import { isProdAnalyticsEnabled } from "@/lib/analytics/isProdAnalyticsEnabled";
import {
  clearJourneyIdleTimer,
  getJourneyExitSnapshot,
  noteJourneyActivity,
  setJourneyIdleEndHandler,
} from "@/lib/analytics/journeyActivity";

const FLUSH_INTERVAL_MS = 8000;
const MAX_QUEUE_SIZE = 80;
const JOURNEY_ENDPOINT = "/api/analytics/journey";

/** @type {Array<{ type: string; path?: string; label?: string; meta?: Record<string, unknown>; ts: number }>} */
let queue = [];
let flushTimer = null;
let ending = false;
let idleWatchArmed = false;

function scheduleFlush() {
  if (flushTimer || typeof window === "undefined") return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    flushJourneyQueue(false);
  }, FLUSH_INTERVAL_MS);
}

function postJourney(body, { keepalive = false, preferBeacon = false } = {}) {
  if (typeof window === "undefined") return Promise.resolve();
  if (!isProdAnalyticsEnabled()) return Promise.resolve();

  const payload = JSON.stringify({ sessionKind: "visitor", ...body });
  const useKeepalive = keepalive || preferBeacon;

  // Prefer fetch+keepalive over sendBeacon: Next.js API routes parse JSON fetch
  // bodies reliably; beacon deliveries were a common cause of missing journey summaries.
  if (typeof fetch !== "undefined") {
    return fetch(JOURNEY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: useKeepalive,
    }).catch(() => {
      try {
        if (typeof navigator !== "undefined" && navigator.sendBeacon) {
          navigator.sendBeacon(JOURNEY_ENDPOINT, new Blob([payload], { type: "application/json" }));
        }
      } catch {
        /* ignore */
      }
    });
  }

  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(JOURNEY_ENDPOINT, new Blob([payload], { type: "application/json" }));
    }
  } catch {
    /* ignore */
  }
  return Promise.resolve();
}

/**
 * @param {string} type
 * @param {{ path?: string; label?: string; meta?: Record<string, unknown> }} [payload]
 */
export function trackJourneyEvent(type, payload = {}) {
  if (typeof window === "undefined") return;
  if (!isProdAnalyticsEnabled()) return;

  const sessionId = getOrCreateVisitorSessionId();
  if (!sessionId) return;

  const path = payload.path || window.location.pathname;
  const meta = payload.meta || {};
  noteJourneyActivity({
    path,
    label: payload.label || meta.label || meta.pageName || "",
    contentType: meta.contentType,
    contentName: meta.name || meta.displayName,
  });

  queue.push({
    type,
    path,
    label: payload.label,
    meta,
    ts: Date.now(),
  });

  if (queue.length > MAX_QUEUE_SIZE) {
    queue = queue.slice(-MAX_QUEUE_SIZE);
  }

  scheduleFlush();
}

/**
 * Flush queued journey events to the server.
 * @param {boolean} [endSession]
 * @param {{ isLoggedIn?: boolean; email?: string; userId?: string; exitReason?: string }} [identity]
 * @returns {Promise<void>}
 */
export function flushJourneyQueue(endSession = false, identity = {}) {
  if (typeof window === "undefined") return Promise.resolve();

  const sessionId = getVisitorSessionId() || getOrCreateVisitorSessionId();
  if (!sessionId) return Promise.resolve();

  const events = queue.splice(0, queue.length);
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (events.length > 0 || (endSession && !ending && !hasVisitorSessionEnded())) {
    if (endSession && !ending && !hasVisitorSessionEnded()) {
      ending = true;
      markVisitorSessionEnded();
      clearJourneyIdleTimer();
      const exit = getJourneyExitSnapshot(identity.exitReason || "pagehide");
      if (exit.exitReason === "idle") {
        events.push({
          type: "idle_leave",
          path: exit.lastPath,
          label: exit.lastLabel || exit.lastContentName || exit.lastPath,
          meta: {
            label: exit.lastLabel || exit.lastContentName || exit.lastPath,
            name: exit.lastContentName,
            contentType: exit.lastContentType,
            idleSeconds: exit.idleSeconds,
          },
          ts: Date.now(),
        });
      }
      return postJourney(
        {
          action: "session_end",
          sessionId,
          events,
          meta: {
            path: window.location.pathname,
            isLoggedIn: !!identity.isLoggedIn,
            email: identity.email,
            userId: identity.userId,
            ...exit,
          },
        },
        { keepalive: true },
      );
    }

    if (events.length > 0) {
      return postJourney({ action: "batch", sessionId, events }, { keepalive: endSession });
    }
  }
  return Promise.resolve();
}

function armIdleWatch(identity = {}) {
  if (idleWatchArmed || typeof window === "undefined") return;
  idleWatchArmed = true;
  setJourneyIdleEndHandler(() => {
    endVisitorSession({ ...identity, exitReason: "idle" });
  });
  noteJourneyActivity({ path: window.location.pathname });
}

export function startVisitorSessionIfNeeded(identity = {}) {
  if (typeof window === "undefined") return;
  if (!isProdAnalyticsEnabled()) return;
  if (hasVisitorSessionStarted()) return;

  const sessionId = getOrCreateVisitorSessionId();
  markVisitorSessionStarted();
  armIdleWatch(identity);

  const meta = buildSessionStartMeta(identity);
  const body = {
    action: "session_start",
    sessionId,
    meta,
  };

  // sendBeacon so the request survives tab close / fast navigation
  postJourney(body, { preferBeacon: true });

  // Server-side idempotent retry if the first delivery was lost or Telegram failed
  window.setTimeout(() => {
    postJourney({ ...body, meta: { ...meta, retry: true } }, { preferBeacon: true });
  }, 3000);
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

/** @param {{ isLoggedIn?: boolean; email?: string; userId?: string; exitReason?: string }} [identity] */
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
