import {
  clearAuthSessionStorage,
  getAuthSessionId,
  getOrCreateAuthSessionId,
  hasAuthSessionEnded,
  hasAuthSessionStarted,
  markAuthSessionEnded,
  markAuthSessionStarted,
  resetAuthSessionStorage,
} from "@/lib/analytics/authSessionStorage";
import { endVisitorSession } from "@/lib/analytics/journeyClient";

const FLUSH_INTERVAL_MS = 8000;
const MAX_QUEUE_SIZE = 120;
const JOURNEY_ENDPOINT = "/api/analytics/journey";
const SESSION_KIND = "auth";

/** @type {Array<{ type: string; path?: string; label?: string; meta?: Record<string, unknown>; ts: number }>} */
let queue = [];
let flushTimer = null;
let ending = false;
let chainTimer = null;
let identityRef = { email: undefined, userId: undefined };

function postJourney(body, { keepalive = false } = {}) {
  if (typeof window === "undefined") return;

  const payload = JSON.stringify({ sessionKind: SESSION_KIND, ...body });
  try {
    if (keepalive && typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(JOURNEY_ENDPOINT, new Blob([payload], { type: "application/json" }));
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

function scheduleFlush() {
  if (flushTimer || typeof window === "undefined") return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    flushAuthJourneyQueue(false);
  }, FLUSH_INTERVAL_MS);
}

/**
 * @param {string} type
 * @param {{ path?: string; label?: string; meta?: Record<string, unknown> }} [payload]
 */
export function trackAuthEvent(type, payload = {}) {
  if (typeof window === "undefined") return;
  if (!hasAuthSessionStarted() || hasAuthSessionEnded()) return;

  const sessionId = getAuthSessionId();
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

/**
 * Immediate error alert (also stored in journey).
 * @param {{ message: string; source?: string; integration?: string; stack?: string; meta?: Record<string, unknown> }} err
 */
export function trackAuthError(err) {
  if (typeof window === "undefined") return;
  if (!hasAuthSessionStarted() || hasAuthSessionEnded()) return;

  const sessionId = getAuthSessionId();
  if (!sessionId) return;

  trackAuthEvent("error", {
    label: err.message,
    meta: {
      message: err.message,
      source: err.source,
      integration: err.integration,
      stack: err.stack ? String(err.stack).slice(0, 500) : undefined,
      ...(err.meta || {}),
    },
  });

  flushAuthJourneyQueue(false);
  postJourney({
    action: "session_error",
    sessionId,
    meta: {
      ...identityRef,
      message: err.message,
      source: err.source,
      integration: err.integration,
      stack: err.stack ? String(err.stack).slice(0, 500) : undefined,
      path: window.location.pathname,
    },
  });
}

export function flushAuthJourneyQueue(endSession = false) {
  if (typeof window === "undefined") return;

  const sessionId = getAuthSessionId();
  if (!sessionId) return;

  const events = queue.splice(0, queue.length);
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (endSession && !ending && hasAuthSessionStarted() && !hasAuthSessionEnded()) {
    ending = true;
    markAuthSessionEnded();
    stopAuthSessionChainTimer();
    postJourney(
      {
        action: "session_end",
        sessionId,
        events,
        meta: {
          path: window.location.pathname,
          email: identityRef.email,
          userId: identityRef.userId,
          isLoggedIn: true,
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

export function sendAuthSessionChainUpdate() {
  if (typeof window === "undefined") return;
  if (!hasAuthSessionStarted() || hasAuthSessionEnded()) return;

  const sessionId = getAuthSessionId();
  if (!sessionId) return;

  flushAuthJourneyQueue(false);
  postJourney({
    action: "session_chain",
    sessionId,
    meta: {
      path: window.location.pathname,
      email: identityRef.email,
      userId: identityRef.userId,
    },
  });
}

const CHAIN_INTERVAL_MS = 5 * 60 * 1000;

export function startAuthSessionChainTimer() {
  if (typeof window === "undefined") return;
  stopAuthSessionChainTimer();
  chainTimer = window.setInterval(() => {
    sendAuthSessionChainUpdate();
  }, CHAIN_INTERVAL_MS);
}

export function stopAuthSessionChainTimer() {
  if (chainTimer) {
    clearInterval(chainTimer);
    chainTimer = null;
  }
}

/**
 * Start a fresh authenticated session (ends anonymous visitor session first).
 * @param {{ email?: string; userId?: string; entryPath?: string }} identity
 */
export function startAuthenticatedSession(identity = {}) {
  if (typeof window === "undefined") return;
  if (hasAuthSessionStarted() && !hasAuthSessionEnded()) return;

  identityRef = { email: identity.email, userId: identity.userId };

  endVisitorSession({
    isLoggedIn: true,
    email: identity.email,
    userId: identity.userId,
  });

  ending = false;
  queue = [];
  const sessionId = resetAuthSessionStorage();
  markAuthSessionStarted();

  postJourney({
    action: "session_start",
    sessionId,
    meta: {
      entryPath: identity.entryPath || window.location.pathname || "/dashboard",
      email: identity.email,
      userId: identity.userId,
      isLoggedIn: true,
    },
  });

  startAuthSessionChainTimer();
}

export function endAuthenticatedSession(identity = {}) {
  if (typeof window === "undefined") return;
  if (!hasAuthSessionStarted() || hasAuthSessionEnded()) return;

  identityRef = {
    email: identity.email || identityRef.email,
    userId: identity.userId || identityRef.userId,
  };
  flushAuthJourneyQueue(true);
  stopAuthSessionChainTimer();
}

/** @param {{ email?: string; userId?: string }} identity */
export function updateAuthSessionIdentity(identity) {
  identityRef = {
    email: identity.email || identityRef.email,
    userId: identity.userId || identityRef.userId,
  };
}

export function ensureAuthenticatedSession(identity = {}) {
  if (typeof window === "undefined") return;
  updateAuthSessionIdentity(identity);
  if (!identity.userId && !identity.email) return;

  if (hasAuthSessionEnded()) {
    clearAuthSessionForRelogin();
  }

  if (!hasAuthSessionStarted()) {
    getOrCreateAuthSessionId();
    markAuthSessionStarted();
    const sessionId = getAuthSessionId();
    postJourney({
      action: "session_start",
      sessionId,
      meta: {
        entryPath: window.location.pathname || "/dashboard",
        email: identity.email,
        userId: identity.userId,
        isLoggedIn: true,
      },
    });
    startAuthSessionChainTimer();
    return;
  }

  if (!chainTimer) {
    startAuthSessionChainTimer();
  }
}

function clearAuthSessionForRelogin() {
  stopAuthSessionChainTimer();
  queue = [];
  ending = false;
  clearAuthSessionStorage();
  getOrCreateAuthSessionId();
}
