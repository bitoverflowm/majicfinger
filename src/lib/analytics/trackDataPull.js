import {
  getAuthSessionId,
  hasAuthSessionEnded,
  hasAuthSessionStarted,
} from "@/lib/analytics/authSessionStorage";
import { trackAuthEvent, trackAuthError } from "@/lib/analytics/authJourneyClient";

const JOURNEY_ENDPOINT = "/api/analytics/journey";

function postDataPullNotify(phase, meta) {
  if (typeof window === "undefined") return;
  if (!hasAuthSessionStarted() || hasAuthSessionEnded()) return;

  const sessionId = getAuthSessionId();
  if (!sessionId) return;

  fetch(JOURNEY_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionKind: "auth",
      action: "data_pull_notify",
      sessionId,
      meta: { phase, ...meta },
    }),
  }).catch(() => {});
}

/**
 * Fire-and-forget: journey event + immediate Telegram when a data pull starts.
 * @param {Record<string, unknown>} meta
 */
export function trackDataPullStart(meta) {
  trackAuthEvent("query_submit", { meta: { ...meta, status: "started" } });
  postDataPullNotify("started", meta);
}

/**
 * Fire-and-forget: journey event + immediate Telegram when rows are returned.
 * @param {Record<string, unknown>} meta
 */
export function trackDataPullComplete(meta) {
  trackAuthEvent("query_submit", { meta: { ...meta, status: "success" } });
  postDataPullNotify("completed", meta);
}

/**
 * @param {{ message: string; integration?: string; source?: string; meta?: Record<string, unknown> }} err
 */
export function trackDataPullError(err) {
  const meta = { ...(err.meta || {}), message: err.message, integration: err.integration };
  trackAuthEvent("query_error", { label: err.message, meta });
  postDataPullNotify("error", meta);
  trackAuthError({
    message: err.message,
    source: err.source || "data_pull",
    integration: err.integration,
    meta: err.meta,
  });
}
