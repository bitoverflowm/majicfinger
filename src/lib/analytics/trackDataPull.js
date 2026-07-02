import {
  getAuthSessionId,
  getOrCreateAuthSessionId,
} from "@/lib/analytics/authSessionStorage";
import { trackAuthEvent, trackAuthError } from "@/lib/analytics/authJourneyClient";
import {
  buildDataPullContext,
  setDataPullSurfaceContext,
  clearDataPullSurfaceContext,
} from "@/lib/analytics/dataPullContext";

const JOURNEY_ENDPOINT = "/api/analytics/journey";

export { setDataPullSurfaceContext, clearDataPullSurfaceContext };

/** @type {{ email?: string; userId?: string }} */
let notifyIdentity = {};

/** @param {{ email?: string; userId?: string }} identity */
export function setDataPullNotifyIdentity(identity = {}) {
  notifyIdentity = {
    email: identity.email || notifyIdentity.email,
    userId: identity.userId || notifyIdentity.userId,
  };
}

/** @param {Record<string, unknown>} meta */
function resolveDataPullRowCount(meta) {
  if (meta.rowCount != null) return Number(meta.rowCount);
  if (meta.loadedRowCount != null) return Number(meta.loadedRowCount);
  return null;
}

/** @param {Record<string, unknown>} meta */
function isZeroRowDataPull(meta) {
  if (meta.liveStream) return false;
  const count = resolveDataPullRowCount(meta);
  return count != null && count === 0;
}

function enrichDataPullMeta(meta = {}) {
  return {
    ...buildDataPullContext(),
    ...meta,
    email: meta.email || notifyIdentity.email,
    userId: meta.userId || notifyIdentity.userId,
  };
}

function postDataPullNotify(phase, meta) {
  if (typeof window === "undefined") return;

  const sessionId = getAuthSessionId() || getOrCreateAuthSessionId();
  if (!sessionId) return;

  const enriched = enrichDataPullMeta(meta);

  const payload = {
    sessionKind: "auth",
    action: "data_pull_notify",
    sessionId,
    meta: {
      phase,
      ...enriched,
    },
  };

  fetch(JOURNEY_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: phase === "completed" || phase === "zero_rows" || phase === "error",
  }).catch(() => {});
}

/**
 * Fire-and-forget: journey event + immediate Telegram when a data pull starts.
 * @param {Record<string, unknown>} meta
 */
export function trackDataPullStart(meta) {
  const enriched = enrichDataPullMeta(meta);
  trackAuthEvent("query_submit", { meta: { ...enriched, status: "started" } });
  postDataPullNotify("started", enriched);
}

/**
 * Fire-and-forget: journey event + immediate Telegram when rows are returned.
 * Sends a distinct 📡 alert when the query succeeds but returns 0 rows (non-live pulls).
 * @param {Record<string, unknown>} meta
 */
export function trackDataPullComplete(meta) {
  const enriched = enrichDataPullMeta(meta);
  const rowCount = resolveDataPullRowCount(enriched);
  const zeroRows = isZeroRowDataPull(enriched);
  const status = zeroRows ? "zero_rows" : "success";
  const phase = zeroRows ? "zero_rows" : "completed";
  const withRows = rowCount != null ? { ...enriched, rowCount } : enriched;

  trackAuthEvent("query_submit", { meta: { ...withRows, status } });
  postDataPullNotify(phase, { ...withRows, status });
}

/**
 * @param {{ message: string; integration?: string; source?: string; meta?: Record<string, unknown> }} err
 */
export function trackDataPullError(err) {
  const meta = enrichDataPullMeta({
    ...(err.meta || {}),
    message: err.message,
    integration: err.integration,
  });
  trackAuthEvent("query_error", { label: err.message, meta });
  postDataPullNotify("error", meta);
  trackAuthError({
    message: err.message,
    source: err.source || "data_pull",
    integration: err.integration,
    meta: err.meta,
  });
}
